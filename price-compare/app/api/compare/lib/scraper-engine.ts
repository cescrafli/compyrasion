import puppeteer from 'puppeteer-extra';
// @ts-ignore
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

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

export async function runScrapingPipeline(cleanKeyword: string, targetPlatforms: string[] = PLATFORMS): Promise<ScrapedProduct[]> {
  const results: ScrapedProduct[] = [];
  const CONCURRENCY_LIMIT = 3;

  const scrapePlatform = async (platform: string): Promise<ScrapedProduct[]> => {
    try {
      // ==== ACTUAL STEALTH PUPPETEER CODE ====
      /*
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(`https://dummy-${platform.toLowerCase()}.com/search?q=${encodeURI(cleanKeyword)}`);
      // TODO: Insert real CSS selectors here
      // const elements = await page.$$eval('.product-card', ...);
      await browser.close();
      */

      // Simulated Delay & Data Generation to mimic local scraping without external APIs
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 400));
      
      const mockedResults: ScrapedProduct[] = [];
      const numItems = Math.floor(Math.random() * 5) + 2; // 2 to 6 items per platform
      
      for(let i = 0; i < numItems; i++) {
         const basePrice = 1000000 + (Math.random() * 2000000); // 1M - 3M
         const priceJitter = basePrice + (Math.random() * 500000 - 250000);

         mockedResults.push({
            title: `${cleanKeyword} ${["Pro", "Max", "Original", "Promo", "Baru"][Math.floor(Math.random() * 5)]} di ${platform}`,
            price: Math.round(priceJitter / 1000) * 1000,
            platform: platform,
            url: `https://www.${platform.toLowerCase()}.com/product/${Math.floor(Math.random()*100000)}`,
            image: `https://images.${platform.toLowerCase()}.com/item_${Math.floor(Math.random()*100)}.jpg`
         });
      }
      return mockedResults;
    } catch (error) {
      console.error(`Error scraping ${platform}:`, error);
      return []; // Return empty array on failure as requested
    }
  };

  // Concurrency Pool Execution
  for (let i = 0; i < targetPlatforms.length; i += CONCURRENCY_LIMIT) {
    const batch = targetPlatforms.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(batch.map(p => scrapePlatform(p)));
    batchResults.forEach(r => results.push(...r));
  }

  return results;
}
