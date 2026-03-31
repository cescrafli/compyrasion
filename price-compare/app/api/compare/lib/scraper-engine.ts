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
                    // Uncomment below for actual puppeteer launch
                    /*
                    globalBrowserInstance = await puppeteer.launch({ 
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
                    });
                    */
                    
                    // Dummy mock for algorithmic demonstration
                    globalBrowserInstance = {
                       newPage: async () => ({
                           goto: async () => {},
                           close: async () => {}
                       }),
                       close: async () => {
                           globalBrowserInstance = null;
                           browserLaunchPromise = null;
                       }
                    };
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

// Node.js process hooks
process.on('SIGINT', async () => { await killZombieProcesses(); process.exit(); });
process.on('SIGTERM', async () => { await killZombieProcesses(); process.exit(); });
process.on('exit', () => { 
    if (globalBrowserInstance) globalBrowserInstance.close().catch(() => {});
});

// =========================================
// 3. GLOBAL CONCURRENCY SEMAPHORE (POOL = 5)
// =========================================
const MAX_CONCURRENT_PAGES = 5;
let activePagesCount = 0;
const concurrencyQueue: (() => void)[] = [];

// Lock Queue
const acquireConcurrencySlot = async (): Promise<void> => {
    return new Promise((resolve) => {
        if (activePagesCount < MAX_CONCURRENT_PAGES) {
            activePagesCount++;
            resolve();
        } else {
            // Queue this request, wait until a slot opens
            concurrencyQueue.push(resolve);
        }
    });
};

// Release Queue
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
// MAIN PIPELINE
// =========================================
export async function runScrapingPipeline(
  cleanKeyword: string, 
  targetPlatforms: string[] = PLATFORMS,
  abortState?: AbortState
): Promise<ScrapedProduct[]> {
  const results: ScrapedProduct[] = [];
  
  // Lazily ignite or pull the global Chrome instance
  const browser = await getBrowserInstance();

  const scrapePlatform = async (platform: string): Promise<ScrapedProduct[]> => {
    
    // 🛡️ GHOST PREVENTION: Don't even enter the queue if the orchestrator hung up
    if (abortState?.aborted) return [];

    // 🛡️ OOM PROTECTION: Block execution thread here until a slot opens globally
    await acquireConcurrencySlot();

    // 🛡️ CANCELLATION AWARENESS: Fail immediately if the Orchestrator already gave up
    // This stops background promises from continuing their extraction loops uselessly
    if (abortState?.aborted) {
        console.warn(`[ABORTED] Skipping scrape for ${platform} - Orchestrator closed thread.`);
        releaseConcurrencySlot();
        return [];
    }

    try {
      /*
      // Example real code using the shared instance
      const page = await browser.newPage();
      await page.goto(`https://dummy-${platform.toLowerCase()}.com/search?q=${encodeURI(cleanKeyword)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // TODO: Real CSS Selectors Here
      await page.close(); // Clean up tab
      */

      // Simulated Extraction Delay (Strictly within Orchestrator bounds)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 400));
      
      const mockedResults: ScrapedProduct[] = [];
      const numItems = Math.floor(Math.random() * 5) + 2;
      
      for(let i = 0; i < numItems; i++) {
         const basePrice = 1000000 + (Math.random() * 2000000); 
         const priceJitter = basePrice + (Math.random() * 500000 - 250000);

         mockedResults.push({
            title: `${cleanKeyword} ${["Pro", "Max", "Original", "Promo", "Baru", "13", "128gb", "Ram 8GB"][Math.floor(Math.random() * 8)]} di ${platform}`,
            price: Math.round(priceJitter / 1000) * 1000,
            platform: platform,
            url: `https://www.${platform.toLowerCase()}.com/product/${Math.floor(Math.random()*100000)}`,
            image: `https://images.${platform.toLowerCase()}.com/item_${Math.floor(Math.random()*100)}.jpg`
         });
      }
      return mockedResults;
    } catch (error) {
      console.error(`Error scraping ${platform}:`, error);
      return []; // Fail-safe
    } finally {
      // 🔓 Release lock. Wakes up the next request waiting in `acquireConcurrencySlot`
      releaseConcurrencySlot();
    }
  };

  try {
     // Concurrent mapped execution (bounded by the absolute Semaphore limit under the hood)
     const mappedPromises = targetPlatforms.map(p => scrapePlatform(p));
     const batchResults = await Promise.all(mappedPromises);
     batchResults.forEach(r => results.push(...r));
  } catch (fatals) {
     console.error("Pipeline Engine Critical Exception:", fatals);
  }

  // Notice we DO NOT close the browser here anymore.
  // It stays alive globally for future connections to avoid startup latency!
  return results;
}
