import { runScrapingPipeline } from './app/api/compare/lib/scraper-engine';

async function runWorker(id: number) {
    console.log(`[Worker ${id}] Starting...`);
    const start = Date.now();
    try {
        // We use different slightly different queries to avoid some cache hits if any, 
        // though scraper-engine doesn't cache, route.ts does.
        const results = await runScrapingPipeline(`iphone 13 ${id}`, []);
        const duration = (Date.now() - start) / 1000;
        console.log(`[Worker ${id}] Finished in ${duration}s. Found ${results.length} results.`);
    } catch (err: any) {
        const duration = (Date.now() - start) / 1000;
        console.error(`[Worker ${id}] Failed after ${duration}s: ${err.message}`);
    }
}

async function stressTest() {
    console.log("🚀 Starting Stress Test: 5 Concurrent Puppeteer Tabs...");
    const workers = [1, 2, 3, 4, 5].map(id => runWorker(id));
    await Promise.all(workers);
    console.log("🏁 Stress Test Completed.");
    process.exit();
}

stressTest();
