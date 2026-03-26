import { NextRequest, NextResponse } from "next/server";

// --- STEALTH SCRAPER IMPORTS (Assume installed: npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth) ---
// import puppeteer from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
// puppeteer.use(StealthPlugin());

// --- Native In-Memory Cache with TTL (Zero Dependency) ---
const CACHE_TTL = 3600 * 1000; // 1 Hour in ms
const searchCache = new Map<string, { data: any; timestamp: number }>();

// --- Types ---
export interface Product {
  id: string;
  platform: string;
  title: string;
  price: number;
  condition: "New" | "Used";
  imageUrl: string;
  productUrl: string;
  rating: number;
  sold: number;
}

export interface PlatformSummary {
  platform: string;
  is_found: boolean;
  lowest_price?: number;
  highest_price?: number;
  item_count?: number;
  cheapest_link?: string;
}

export interface MarketAnalytics {
  average_price: number;
  market_range: { lowest: number; highest: number };
  total_valid_items: number;
  items_excluded_count: number;
}

const ALL_PLATFORMS = [
  "Tokopedia", "Shopee", "Lazada", "Blibli", "Zalora", 
  "Sociolla", "Orami", "Traveloka", "Tiket.com", "Eraspace", "Bhinneka"
];

// --- Utility Functions ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Skeleton for Platform Scraping
 * HUMAN: This is where you will eventually put your page.evaluate logic
 */
async function scrapePlatform(platform: string, query: string): Promise<Product[]> {
  // Simulate is_found: false for 3-6 platforms randomly per query
  const shouldSkip = Math.random() < 0.4;
  if (shouldSkip) return [];

  // --- PUPPETEER SKELETON ---
  /*
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Set a realistic User-Agent
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36");
  
  // Navigate to Marketplace Search
  const searchUrl = `https://www.google.com/search?q=site:${platform.toLowerCase()}.com+${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: "networkidle2" });

  const products = await page.evaluate((platform) => {
    // TODO: HUMAN, PASTE THE PRODUCT CARD SELECTOR HERE
    const items = document.querySelectorAll('.TODO_PRODUCT_CARD'); 
    
    return Array.from(items).slice(0, 5).map((el, i) => {
      // TODO: HUMAN, PASTE THE TITLE CSS SELECTOR HERE
      const title = el.querySelector('.TODO_TITLE_CLASS')?.textContent?.trim() || "";
      
      // TODO: HUMAN, PASTE THE PRICE CSS SELECTOR HERE
      const priceText = el.querySelector('.TODO_PRICE_CLASS')?.textContent?.replace(/[^0-9]/g, "") || "0";
      
      // TODO: HUMAN, PASTE THE IMAGE URL SELECTOR HERE
      const imageUrl = el.querySelector('img')?.src || "";
      
      // TODO: HUMAN, PASTE THE DIRECT PRODUCT LINK SELECTOR HERE
      const productUrl = el.querySelector('a')?.href || "";

      return {
        id: `${platform}-${Date.now()}-${i}`,
        platform,
        title,
        price: parseInt(priceText),
        condition: "New" as const,
        imageUrl,
        productUrl,
        rating: 4.8,
        sold: 100
      };
    });
  }, platform);

  await browser.close();
  return products;
  */

  // --- MOCK DATA GENERATOR (Until you paste real selectors) ---
  const basePrice = 5000000 + (Math.random() * 2000000);
  const items: Product[] = Array.from({ length: 4 }).map((_, i) => ({
    id: `${platform}-${i}-${Date.now()}`,
    platform,
    title: `${query} Original ${platform} Edition - Pro v${i + 1}`,
    price: Math.floor((basePrice * (0.85 + Math.random() * 0.3)) / 1000) * 1000,
    condition: Math.random() > 0.2 ? "New" : "Used",
    imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80`,
    productUrl: `https://www.${platform.toLowerCase()}.com/p/${i}`,
    rating: 4.5 + Math.random() * 0.5,
    sold: Math.floor(Math.random() * 1000) + 1,
  }));

  return items;
}

/**
 * IQR (Interquartile Range) Method for Outlier Detection
 */
function filterOutliers(products: Product[]) {
  if (products.length < 4) return { valid: products, excluded: 0 };

  const prices = [...products].map(p => p.price).sort((a, b) => a - b);
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const valid = products.filter(p => p.price >= lowerBound && p.price <= upperBound);
  return { valid, excluded: products.length - valid.length };
}

// --- API Handler ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  // 1. Cache Check
  const cachedData = searchCache.get(query);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedData.data);
  }

  // 2. Multi-platform Queueing (Anti-Ban Throttling)
  // We process max 3 platforms concurrently
  const allRawProducts: Product[] = [];
  const CONCURRENCY = 3;

  for (let i = 0; i < ALL_PLATFORMS.length; i += CONCURRENCY) {
    const chunk = ALL_PLATFORMS.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(p => scrapePlatform(p, query)));
    allRawProducts.push(...chunkResults.flat());
    
    // Randomized Delay (Sleep) between chunks to mimic human behavior
    if (i + CONCURRENCY < ALL_PLATFORMS.length) {
      await sleep(1000 + Math.random() * 2000); // 1-3 seconds jitter
    }
  }

  // 3. Strict Outlier Detection (IQR Method)
  const { valid: cleanProducts, excluded: itemsExcluded } = filterOutliers(allRawProducts);

  // 4. Analytics Compilation
  const validPrices = cleanProducts.map(p => p.price);
  const avgPrice = validPrices.length > 0 ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length) : 0;
  
  const platformSummaries: PlatformSummary[] = ALL_PLATFORMS.map(platform => {
    const platformItems = cleanProducts.filter(p => p.platform === platform);
    if (platformItems.length === 0) return { platform, is_found: false };
    
    const sortedByPrice = [...platformItems].sort((a, b) => a.price - b.price);
    return {
      platform,
      is_found: true,
      lowest_price: sortedByPrice[0].price,
      highest_price: sortedByPrice[sortedByPrice.length - 1].price,
      item_count: platformItems.length,
      cheapest_link: sortedByPrice[0].productUrl
    };
  });

  const response = {
    keyword: query,
    market_analytics: {
      average_price: avgPrice,
      market_range: {
        lowest: validPrices.length > 0 ? Math.min(...validPrices) : 0,
        highest: validPrices.length > 0 ? Math.max(...validPrices) : 0
      },
      total_valid_items: cleanProducts.length,
      items_excluded_count: itemsExcluded
    },
    platform_summaries: platformSummaries,
    products: allRawProducts // Return all for UI grid, but analytics come from clean data
  };

  // 5. Save to Cache
  searchCache.set(query, { data: response, timestamp: Date.now() });

  return NextResponse.json(response);
}
