import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

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
// =========================================
// 1. GLOBAL BROWSER SINGLETON
// =========================================
let globalBrowserInstance: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;
let browserCreatedAt: number = 0;
const BROWSER_TTL_MS = 60 * 60 * 1000; // 1 Jam batasan maksimal agar vRAM Chrome direfresh

const isBrowserAlive = async (): Promise<boolean> => {
    if (!globalBrowserInstance) return false;

    // 🛡️ 1. TTL Check Validation (Memory Leak Protection)
    if (Date.now() - browserCreatedAt > BROWSER_TTL_MS) {
        console.warn("🔄 [TTL] Browser Instance melewati batas usia 1 Jam. Memaksa Restart...");
        return false;
    }

    // 🛡️ 2. Deadlock Heartbeat Ping
    try {
        const pages = await globalBrowserInstance.pages();
        return Array.isArray(pages);
    } catch {
        console.warn("⚠️ [Deadlock] Socket Chromium tidak merespons (Ping Gagal).");
        return false;
    }
};

const getBrowserInstance = async () => {
    // 🛡️ Phase 1: Pengecekan Deadlock & Usia TTL sebelum mengizinkan antrean
    if (globalBrowserInstance) {
        const alive = await isBrowserAlive();
        if (!alive) {
            try { await globalBrowserInstance.close().catch(() => { }); } catch (e) { }
            try {
                const process = globalBrowserInstance.process();
                if (process) process.kill('SIGKILL');
            } catch (e) { }

            globalBrowserInstance = null;
            browserLaunchPromise = null;
        }
    }

    if (!globalBrowserInstance) {
        if (!browserLaunchPromise) {
            browserLaunchPromise = (async () => {
                try {
                    globalBrowserInstance = await puppeteer.launch({
                        // Gunakan headless: true untuk kecepatan, Google Shopping toleran terhadap ini
                        headless: true,
                        defaultViewport: { width: 1920, height: 1080 },
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--window-size=1920,1080',
                            '--disable-blink-features=AutomationControlled'
                        ]
                    });

                    // Set rentang waktu kelahiran browser
                    browserCreatedAt = Date.now();

                    if (globalBrowserInstance && typeof globalBrowserInstance.on === 'function') {
                        globalBrowserInstance.on('disconnected', () => {
                            globalBrowserInstance = null;
                            browserLaunchPromise = null;
                        });
                    }

                    return globalBrowserInstance;
                } catch (initError) {
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
        try {
            await globalBrowserInstance.close();
            globalBrowserInstance = null;
        } catch (e) { }
    }
};

process.on('SIGINT', async () => { await killZombieProcesses(); process.exit(); });
process.on('SIGTERM', async () => { await killZombieProcesses(); process.exit(); });
process.on('exit', () => {
    if (globalBrowserInstance) globalBrowserInstance.close().catch(() => { });
});

// =========================================
// MAIN PIPELINE: GOOGLE SHOPPING AGGREGATOR
// =========================================
export async function runScrapingPipeline(
    cleanKeyword: string,
    targetPlatforms: string[] = [], // Diabaikan karena Google mencakup semua platform
    abortState?: AbortState
): Promise<ScrapedProduct[]> {
    const browser = await getBrowserInstance();
    if (!browser || abortState?.aborted) return [];

    let page: Page | null = null;
    let finalResults: ScrapedProduct[] = [];

    try {
        page = await browser.newPage();

        // Target Google Shopping Indonesia
        const targetUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(cleanKeyword)}&hl=id&gl=id`;

        console.log(`🌐 [Aggregator] Mencari di Google Shopping: "${cleanKeyword}"...`);

        // 🛡️ Gunakan networkidle2 agar elemen lazy-load sempat muncul
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // 🛡️ Tunggu elemen produk muncul secara spesifik (maksimal 10 detik)
        try {
            await page.waitForSelector('g-inner-card, .sh-dgr__content, .sh-dlr__list-result', { timeout: 10000 });
        } catch (e) {
            console.warn(`⚠️ [Aggregator] Selector produk lambat atau tidak ditemukan untuk: "${cleanKeyword}". Mencoba paksa ekstraksi...`);
        }

        // 🛡️ PERBAIKAN 3: Cegah Ghost Tab! Berhenti jika API route.ts sudah timeout di background
        if (abortState?.aborted) {
            console.warn(`🛑 [Aggregator] Dibatalkan paksa oleh Orchestrator (Timeout 25s) untuk: "${cleanKeyword}". Mencegah memory leak.`);
            await page.close().catch(() => { });
            return []; // Keluar dari fungsi secepat mungkin
        }

        // Scroll untuk memicu lazy load gambar
        await page.evaluate(() => window.scrollBy(0, 1000));

        // 🤖 GOOGLE SHOPPING SMART EXTRACTOR
        const scrapedResults = await page.evaluate(() => {
            const extracted: ScrapedProduct[] = [];

            // Mencari container produk Google (Selector ini lebih modern)
            const cards = Array.from(document.querySelectorAll('g-inner-card, .sh-dgr__content, .sh-dlr__list-result, div[data-docid]'));

            for (const card of cards) {
                // 1. Ekstrak Judul (Mencari Tag H3 atau aria-label di button)
                const h3 = card.querySelector('h3');
                const btn = card.querySelector('div[role="button"]');
                let title = h3 ? h3.textContent?.trim() : '';

                if (!title && btn) {
                    title = btn.getAttribute('aria-label') || '';
                }
                
                if (!title) {
                    // Fallback ke div pertama yang punya text panjang
                    const divs = Array.from(card.querySelectorAll('div'));
                    const titleDiv = divs.find(d => d.textContent && d.textContent.length > 20);
                    title = titleDiv ? titleDiv.textContent?.trim() : '';
                }

                if (!title) continue;

                // 2. Ekstrak Harga
                const priceText = (card as HTMLElement).innerText || '';
                const lowerPriceText = priceText.toLowerCase().replace(/\s+/g, '');
                
                // Cek kemungkinan ada string harga (Rp, Rp., IDR)
                if (!/(rp|idr)/i.test(lowerPriceText)) continue;

                const priceMatch = lowerPriceText.match(/(?:rp\.?|idr)([\d.,]+)(juta|jt|ribu|rb)?/i);
                if (!priceMatch) continue;

                let baseNumber = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
                let multiplier = 1;
                const unit = priceMatch[2];

                if (unit === 'juta' || unit === 'jt') {
                    multiplier = 1000000;
                } else if (unit === 'ribu' || unit === 'rb') {
                    multiplier = 1000;
                }

                const price = Math.round(baseNumber * multiplier);
                if (isNaN(price) || price === 0) continue;

                // 3. Ekstrak & Clean URL
                const a = card.querySelector('a');
                let url = '';
                if (a && a.href) {
                    url = a.href;
                } else if (btn) {
                    // Kadang Google pakai atribut data-purl atau link tersembunyi
                    const hiddenLink = card.querySelector('a[href*="/url?"]');
                    if (hiddenLink) url = (hiddenLink as HTMLAnchorElement).href;
                }

                if (url.includes('/url?url=')) {
                    try {
                        const parts = url.split('/url?url=');
                        if (parts.length > 1) {
                            url = decodeURIComponent(parts[1].split('&')[0]);
                        }
                    } catch (e) { }
                } else if (url.startsWith('/')) {
                    url = 'https://www.google.com' + url;
                }

                if (!url || url.includes('javascript:')) continue;

                // 4. Identifikasi Platform
                let platform = 'E-Commerce';
                const lowerText = (card as HTMLElement).innerText.toLowerCase();
                if (lowerText.includes('tokopedia')) platform = 'Tokopedia';
                else if (lowerText.includes('shopee')) platform = 'Shopee';
                else if (lowerText.includes('lazada')) platform = 'Lazada';
                else if (lowerText.includes('blibli')) platform = 'BliBli';
                else {
                    try {
                        const host = new URL(url).hostname.replace('www.', '').split('.')[0];
                        platform = host.charAt(0).toUpperCase() + host.slice(1);
                    } catch (e) { }
                }

                // 5. Gambar
                const img = card.querySelector('img');
                const image = img ? (img.src || img.getAttribute('data-src') || '') : '';

                extracted.push({ title, price, platform, url, image });
            }
            return extracted;
        });

        // Filter unik dan ambil hingga 30 hasil terbaik
        const uniqueResults = Array.from(new Map<string, ScrapedProduct>(scrapedResults.map((item: ScrapedProduct) => [item.url, item])).values());
        finalResults = uniqueResults.slice(0, 30);

        console.log(`✅ [Aggregator] Berhasil mendapatkan ${finalResults.length} produk dari Google Shopping!`);

    } catch (error) {
        console.error(`❌ [Aggregator] Gagal merayapi Google Shopping:`, error);
    } finally {
        if (page && !page.isClosed()) {
            await page.close().catch(() => { });
        }
    }

    return finalResults;
}