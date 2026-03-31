import { NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { runScrapingPipeline, ScrapedProduct, AbortState } from './lib/scraper-engine';
import { trainAndPredictIntent, clusterProductsML, ProductCluster } from './lib/ml-engine';
import { filterAnomalies, generateDecisionTreeSummary } from './lib/expert-ai';

// Memory Caching
const cache = new NodeCache({ stdTTL: 3600 });

// Payload Interface enforcing type safety across the Orchestrator
interface ComparisonResponse {
  query_intent: {
    category: string;
    clean_keyword: string;
    budget: number | null;
    type: string;
  };
  market_stats: {
    average_price: number;
    market_range: { lowest: number; highest: number; };
    items_excluded_count: number;
  };
  smart_summary: {
    summary: string;
    buy_recommendation: string;
  };
  product_clusters: ProductCluster[];
  errors?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: "Missing 'q' parameter." }, { status: 400 });
  }

  // 🛡️ CACHE POISONING FIX: Menghapus spasi ganda dari user input
  const cacheKey = q.toLowerCase().replace(/\s+/g, ' ').trim();
  const cachedResponse = cache.get<ComparisonResponse>(cacheKey);
  if (cachedResponse) {
    return NextResponse.json({ source: 'cache', data: cachedResponse });
  }

  try {
    // 1. Natural Language Intent Routing (Offline NB Classifier)
    const intent = trainAndPredictIntent(q);

    let rawProducts: any[] = [];
    let pipelineError: string | undefined = undefined;

    // 2. CANCELLATION AWARENESS: TIMEOUT PROTECTION OOM QUEUE + ABORT SIGNAL 
    const abortState: AbortState = { aborted: false };

    try {
      // Graceful 25-Second API Timeout Promise
      const TIMEOUT_MS = 25000;
      let timerId: NodeJS.Timeout;
      const timeoutPromise = new Promise<ScrapedProduct[]>((_, reject) => {
        timerId = setTimeout(() => {
          // Signal background threads instantly that the Orchestrator has jumped ship
          abortState.aborted = true;
          reject(new Error("Global Scraper Queue Timeout: Aborted after 25s to save API response."));
        }, TIMEOUT_MS);
      });

      try {
        // 🛡️ Promise.race forces the scraping to yield if the server queue is backed up
        rawProducts = await Promise.race([
          runScrapingPipeline(intent.clean_keyword, [
            "Tokopedia", "Shopee", "Lazada", "BliBli", "Bukalapak",
            "JD.ID", "Bhinneka", "Zalora", "Matahari", "Erafone", "iBox"
          ], abortState),
          timeoutPromise
        ]);
      } finally {
        clearTimeout(timerId!); // Destroy the timeout if the scraper wins the race early
      }
    } catch (scrapeErr: any) {
      console.warn("Orchestrator: Scraper Pipeline Fault -", scrapeErr.message);
      pipelineError = scrapeErr.message || "Partial data fault during platform requests. Pipeline continues.";
    }

    // 3. IQR Mathematics Engine
    const anomalyFiltered = filterAnomalies(rawProducts);

    // 4. ML Semantic TF-IDF + Cosine Clustering
    const clusters = clusterProductsML(anomalyFiltered.cleanProducts);

    // 5. Intelligent Decision Nodes
    const smartSummary = generateDecisionTreeSummary(anomalyFiltered.marketAnalytics, clusters);

    // 6. Safe Payload Construction
    const responsePayload: ComparisonResponse = {
      query_intent: intent,
      market_stats: anomalyFiltered.marketAnalytics,
      smart_summary: smartSummary,
      product_clusters: clusters,
      ...(pipelineError && { errors: pipelineError })
    };

    // 🛡️ CACHE POISONING FIX: Hanya Cache jika tidak ada error DAN data barang (cluster) ada hasilnya
    if (!pipelineError && clusters.length > 0) {
      cache.set(cacheKey, responsePayload);
    }

    return NextResponse.json({ source: 'live', data: responsePayload });
  } catch (fatals: any) {
    console.error("API Kernel Error:", fatals);
    return NextResponse.json({ error: "Fatal Processing Fault", details: fatals.message }, { status: 500 });
  }
}