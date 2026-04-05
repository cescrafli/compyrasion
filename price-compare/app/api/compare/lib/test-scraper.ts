/**
 * test-scraper.ts
 * 
 * Test logic scraping Google Shopping secara langsung.
 * Run: npx tsx app/api/compare/lib/test-scraper.ts
 */
import { runScrapingPipeline } from './scraper-engine';

async function test() {
  console.log("🔍 Testing Scraper for 'iphone 15'...");
  try {
    const products = await runScrapingPipeline("iphone 15", [], { aborted: false });
    console.log(`📊 Found ${products.length} products`);
    if (products.length > 0) {
      console.log("First product:", products[0]);
    } else {
      console.log("❌ No products found. Google might be blocking or selectors are outdated.");
    }
  } catch (err) {
    console.error("Scraper Error:", err);
  }
}

test();
