import { runScrapingPipeline } from './lib/scraper-engine';

(async () => {
    console.log("Testing scraper...");
    const res = await runScrapingPipeline("sepatu lari nike");
    console.log("Results count:", res.length);
    if(res.length > 0) {
        console.log("First item:", res[0]);
    }
    process.exit(0);
})();
