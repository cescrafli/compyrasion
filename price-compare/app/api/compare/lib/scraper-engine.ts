import puppeteer from 'puppeteer-extra';

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
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
let globalBrowserInstance: any = null;
let browserLaunchPromise: Promise<any> | null = null;
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
    if (abortState?.aborted) return [];

    let page: any = null;
    let finalResults: ScrapedProduct[] = [];

    try {
        page = await browser.newPage();

        // Identitas Manusia
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        // Target Google Shopping Indonesia
        const targetUrl = `https://www.google.com/search?tbm=shop&q=${encodeURI(cleanKeyword)}&hl=id&gl=id`;

        console.log(`🌐 [Aggregator] Mencari di Google Shopping: "${cleanKeyword}"...`);

        // 🛡️ PERBAIKAN 1: Gunakan domcontentloaded agar lebih responsif terhadap pelacak Google
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // 🛡️ PERBAIKAN 2: Tunggu elemen produk muncul secara spesifik (maksimal 5 detik)
        try {
            await page.waitForSelector('.sh-dgr__content, .sh-dlr__list-result, div[data-docid]', { timeout: 5000 });
        } catch (e) {
            console.warn(`⚠️ [Aggregator] Selector produk lambat atau tidak ditemukan untuk: "${cleanKeyword}".`);
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

            // Mencari container produk Google (Selector ini sangat stabil)
            const cards = Array.from(document.querySelectorAll('.sh-dgr__content, .sh-dlr__list-result, div[data-docid]'));

            for (const card of cards) {
                const text = card.textContent || (card as HTMLElement).innerText || '';

                // Bersihkan whitespace (termasuk non-breaking space & newline yang sering muncul dari DOM bersarang)
                const cleanText = text.replace(/\s+/g, '');

                // Cek kemungkinan ada string harga (Rp, Rp., IDR)
                if (!/(Rp|IDR)/i.test(cleanText)) continue;

                // 1. Ekstrak Harga yang stabil dan tahan banting
                // Karena spasi sudah dibersihkan, formatnya pasti menempel seperti Rp10.000 atau IDR10.000
                const priceMatch = cleanText.match(/(?:Rp\.?|IDR)([\d.,]+)/i);
                if (!priceMatch) continue;

                // Hapus 1-2 digit desimal di akhir string harga (seperti ,00 atau .50) untuk mencegah bug mark-up 100x lipat
                let numStr = priceMatch[1].replace(/[,.]\d{1,2}$/, '');
                
                // Bersihkan semua titik dan koma pemisah ribuan agar parser bisa mengubahnya menjadi Integer murni
                const price = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
                if (isNaN(price) || price === 0) continue;

                // 2. Ekstrak Judul (Mencari Tag H3)
                const h3 = card.querySelector('h3');
                const title = h3 ? h3.textContent?.trim() : '';
                if (!title) continue;

                // 3. Ekstrak & Clean URL (Google biasanya melakukan redirect)
                const a = card.querySelector('a');
                let url = '';
                if (a && a.href) {
                    url = a.href;
                    if (url.includes('/url?url=')) {
                        try {
                            url = decodeURIComponent(url.split('/url?url=')[1].split('&')[0]);
                        } catch (e) { }
                    } else if (url.startsWith('/')) {
                        url = 'https://www.google.com' + url;
                    }
                }
                if (!url || url.includes('javascript:')) continue;

                // 4. Identifikasi Platform Otomatis
                let platform = 'E-Commerce';
                const lowerText = text.toLowerCase();
                if (lowerText.includes('tokopedia')) platform = 'Tokopedia';
                else if (lowerText.includes('shopee')) platform = 'Shopee';
                else if (lowerText.includes('lazada')) platform = 'Lazada';
                else if (lowerText.includes('blibli')) platform = 'BliBli';
                else if (lowerText.includes('bukalapak')) platform = 'Bukalapak';
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