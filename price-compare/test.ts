import { runScrapingPipeline } from './app/api/compare/lib/scraper-engine';
import { filterAnomalies } from './app/api/compare/lib/expert-ai';
import * as fs from 'fs';

(async () => {
    let output: any = {};
    const raw = await runScrapingPipeline('iphone 13', []);
    output.rawLength = raw.length;
    
    // Simpan 2 sample awal untuk melihat format data mentah
    if (raw.length > 0) {
        output.rawSamples = raw.slice(0, 2);
    }

    // Coba filter manual untuk debug
    const { cleanProducts, marketAnalytics } = filterAnomalies(raw);
    output.cleanLength = cleanProducts.length;
    output.marketAnalytics = marketAnalytics;
    
    fs.writeFileSync('out.json', JSON.stringify(output, null, 2));
    process.exit();
})();
