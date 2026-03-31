import puppeteer from 'puppeteer-extra';

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PLATFORMS = [
    "Tokopedia", "Shopee", "Lazada", "BliBli", "Bukalapak",
    "JD.ID", "Bhinneka", "Zalora", "Matahari", "Erafone", "iBox"
];

export interface ScrapedProduct {
    title: string;
    price: number;
    platform: string;
    url: string;
    image: string;
}

export interface AbortState {
    aborted: boolean;
}

// =========================================
// 1. GLOBAL BROWSER SINGLETON
// =========================================
let globalBrowserInstance: any = null;
let browserLaunchPromise: Promise<any> | null = null;

const getBrowserInstance = async () => {
    if (!globalBrowserInstance) {
        if (!browserLaunchPromise) {
            browserLaunchPromise = (async () => {
                try {
                    // MENGAKTIFKAN PUPPETEER ASLI (TanPA MOCK LAGI)
                    globalBrowserInstance = await puppeteer.launch({
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--window-size=1920,1080' // Penting agar website merender versi desktop
                        ]
                    });

                    // 🛡️ THE PHANTOM BROWSER FIX
                    if (globalBrowserInstance && typeof globalBrowserInstance.on === 'function') {
                        globalBrowserInstance.on('disconnected', () => {
                            console.warn("⚠️ ALARM: Browser terputus atau dibunuh OS. Mereset Singleton Lock...");
                            globalBrowserInstance = null;
                            browserLaunchPromise = null;
                        });
                    }

                    return globalBrowserInstance;
                } catch (initError) {
                    console.error("CRITICAL: Failed to initialize Global Browser, releasing lock.", initError);
                    globalBrowserInstance = null;
                    browserLaunchPromise = null;
                    throw initError;
                }
            })();
        }
        await browserLaunchPromise;
    }
    return globalBrowserInstance;
};

// =========================================
// 2. GRACEFUL PROCESS SHUTDOWN
// =========================================
const killZombieProcesses = async () => {
    if (globalBrowserInstance) {
        console.log("Runtime stopping. Gracefully killing global Chromium instance...");
        try {
            await globalBrowserInstance.close();
            globalBrowserInstance = null;
        } catch (e) {
            console.error("Failed to securely close global browser. Zombie process possible.", e);
        }
    }
};

process.on('SIGINT', async () => { await killZombieProcesses(); process.exit(); });
process.on('SIGTERM', async () => { await killZombieProcesses(); process.exit(); });
process.on('exit', () => {
    if (globalBrowserInstance) globalBrowserInstance.close().catch(() => { });
});

// =========================================
// 3. GLOBAL CONCURRENCY SEMAPHORE (POOL = 5)
// =========================================
const MAX_CONCURRENT_PAGES = 5;
let activePagesCount = 0;
const concurrencyQueue: (() => void)[] = [];

const acquireConcurrencySlot = async (): Promise<void> => {
    return new Promise((resolve) => {
        if (activePagesCount < MAX_CONCURRENT_PAGES) {
            activePagesCount++;
            resolve();
        } else {
            concurrencyQueue.push(resolve);
        }
    });
};

const releaseConcurrencySlot = () => {
    activePagesCount--;
    if (concurrencyQueue.length > 0) {
        const nextTask = concurrencyQueue.shift();
        if (nextTask) {
            activePagesCount++;
            nextTask();
        }
    }
};

// =========================================
// MAIN PIPELINE (HEURISTIC AUTO-EXTRACTOR)
// =========================================
export async function runScrapingPipeline(
    cleanKeyword: string,
    targetPlatforms: string[] = ["Tokopedia", "Shopee"], // Fokus ke 2 raksasa dulu untuk uji coba
    abortState?: AbortState
): Promise<ScrapedProduct[]> {
    const results: ScrapedProduct[] = [];
    const browser = await getBrowserInstance();

    const scrapePlatform = async (platform: string): Promise<ScrapedProduct[]> => {
        if (abortState?.aborted) return [];
        await acquireConcurrencySlot();
        if (abortState?.aborted) {
            releaseConcurrencySlot();
            return [];
        }

        let page: any = null;

        try {
            page = await browser.newPage();

            // Menyamar sebagai manusia
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // 🛡️ NETWORK INTERCEPTOR: Kecepatan super, blokir gambar & CSS
            if (page && typeof page.setRequestInterception === 'function') {
                await page.setRequestInterception(true);
                page.on('request', (req: any) => {
                    const resourceType = typeof req.resourceType === 'function' ? req.resourceType() : '';
                    if (['image', 'stylesheet', 'font', 'media', 'imageset'].includes(resourceType)) {
                        req.abort();
                    } else if (typeof req.continue === 'function') {
                        req.continue();
                    }
                });
            }

            // Atur URL Target
            let targetUrl = `https://dummy-${platform.toLowerCase()}.com/search?q=${encodeURI(cleanKeyword)}`;
            if (platform === 'Tokopedia') targetUrl = `https://www.tokopedia.com/search?q=${encodeURI(cleanKeyword)}`;
            if (platform === 'Shopee') targetUrl = `https://shopee.co.id/search?keyword=${encodeURI(cleanKeyword)}`;

            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Gulir layar ke bawah sedikit untuk memicu Lazy-Load produk
            await page.evaluate(() => window.scrollBy(0, 800));
            // Beri waktu 1.5 detik agar framework Vue/React merender DOM
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 🤖 AUTO-EXTRACTOR HEURISTIC (TANPA CSS SELECTOR)
            const scrapedResults = await page.evaluate((plat: string) => {
                const extracted: ScrapedProduct[] = [];
                // Cari semua elemen teks
                const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                let currentNode = textNodes.nextNode();
                const priceElements = [];

                // 1. Identifikasi teks Harga (berisi "Rp")
                while (currentNode) {
                    if (currentNode.nodeValue && /Rp\s*[\d.,]+/.test(currentNode.nodeValue)) {
                        priceElements.push(currentNode.parentElement);
                    }
                    currentNode = textNodes.nextNode();
                }

                const processedContainers = new Set();

                // 2. Analisis pembungkusnya (Product Card Container)
                for (const priceEl of priceElements) {
                    if (!priceEl) continue;

                    let container = priceEl.parentElement;
                    for (let i = 0; i < 4; i++) {
                        if (container && container.parentElement && container.tagName !== 'BODY') {
                            container = container.parentElement;
                        }
                    }

                    if (!container || processedContainers.has(container)) continue;
                    processedContainers.add(container);

                    const priceText = priceEl.textContent || '0';
                    const priceNumber = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
                    if (isNaN(priceNumber) || priceNumber === 0) continue;

                    // Cari link
                    const anchor = container.querySelector('a') as HTMLAnchorElement;
                    const url = anchor ? anchor.href : '';
                    if (!url || url.includes('javascript:')) continue;

                    // Cari gambar
                    const img = container.querySelector('img') as HTMLImageElement;
                    const image = img ? (img.src || img.getAttribute('data-src') || '') : '';

                    // Cari judul produk
                    let title = '';
                    const allSpans = container.querySelectorAll('span, div, h2, h3');
                    allSpans.forEach(el => {
                        const text = el.textContent?.trim() || '';
                        if (text.length > 15 && text.length > title.length && !text.includes('Rp')) {
                            title = text;
                        }
                    });

                    if (title && priceNumber > 0) {
                        extracted.push({ title, price: priceNumber, platform: plat, url, image });
                    }
                }
                return extracted;
            }, platform);

            // Filter data kosong dan ambil 10 teratas per platform agar ringan
            return scrapedResults.filter(r => r.title !== '').slice(0, 10);

        } catch (error) {
            console.warn(`[Pipeline] Gagal merayapi ${platform} (Timeout / Proteksi Bot)`);
            return []; // Fail-safe
        } finally {
            if (page && typeof page.isClosed === 'function' && !page.isClosed()) {
                await page.close().catch(() => { });
            }
            releaseConcurrencySlot();
        }
    };

    try {
        const mappedPromises = targetPlatforms.map(p => scrapePlatform(p));
        const batchResults = await Promise.all(mappedPromises);
        batchResults.forEach(r => results.push(...r));
    } catch (fatals) {
        console.error("Pipeline Engine Critical Exception:", fatals);
    }

    return results;
}