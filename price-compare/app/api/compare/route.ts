import { NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { runScrapingPipeline, ScrapedProduct, AbortState } from './lib/scraper-engine';
import { trainAndPredictIntent, clusterProductsML, ProductCluster } from './lib/ml-engine';
import { filterClusterAnomalies, generateDecisionTreeSummary } from './lib/expert-ai';

// Memory Caching (1 Jam) dengan V8 Exhaustion Guard (Max 200 Indeks)
const cache = new NodeCache({ stdTTL: 3600, maxKeys: 200 });

// Rate Limiting Cache (TTL 60 detik)
const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 60, maxKeys: 5000 });
// Interface Payload untuk konsistensi kontrak data dengan Frontend
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
  // 🛡️ RATE LIMITING (Max 5 request per menit per IP)
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown_ip';
  const currentRequests = rateLimitCache.get<number>(ip) ?? 0;

  if (currentRequests >= 5) {
    return NextResponse.json({
      error: "Rate limit exceeded. Maximum 5 requests per minute per IP."
    }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  rateLimitCache.set(ip, currentRequests + 1);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: "Missing 'q' parameter." }, { status: 400 });
  }

  // 🛡️ DDOS PAYLOAD RESTRICTION (Mencegah serangan bot eksekusi memori)
  if (q.length > 120) {
    return NextResponse.json({ error: "Query exceeds maximum allowed length of 120 characters. Request Dropped." }, { status: 413 });
  }

  // 🛡️ CACHE POISONING FIX: Normalisasi input agar cache efisien
  const cacheKey = q.toLowerCase().replace(/\s+/g, ' ').trim();
  const cachedResponse = cache.get<ComparisonResponse>(cacheKey);

  if (cachedResponse) {
    return NextResponse.json({ source: 'cache', data: cachedResponse });
  }

  try {
    // 1. Natural Language Intent Routing (Offline Classifier — Lazy Loaded)
    const intent = await trainAndPredictIntent(q);

    let rawProducts: ScrapedProduct[] = [];
    let pipelineError: string | undefined = undefined;

    // 2. CANCELLATION AWARENESS: Persiapan Abort Signal
    const abortState: AbortState = { aborted: false };

    try {
      // Graceful 25-Second API Timeout
      const TIMEOUT_MS = 25000;
      let timerId: NodeJS.Timeout;

      const timeoutPromise = new Promise<ScrapedProduct[]>((_, reject) => {
        timerId = setTimeout(() => {
          abortState.aborted = true;
          reject(new Error("Global Aggregator Timeout: Aborted after 25s."));
        }, TIMEOUT_MS);
      });

      try {
        // 🚀 Execute Primary Pipeline: Google Shopping Aggregator
        rawProducts = await (Promise.race([
          runScrapingPipeline(intent.clean_keyword, [], abortState),
          timeoutPromise
        ]) as Promise<ScrapedProduct[]>);
      } finally {
        clearTimeout(timerId!);
      }
    } catch (scrapeErr: any) {
      console.warn("Orchestrator: Aggregator Pipeline Fault -", scrapeErr.message);
      pipelineError = scrapeErr.message;
    }

    // 3. ML Semantic TF-IDF + Cosine Clustering (CLUSTER FIRST)
    const initialClusters = clusterProductsML(rawProducts);

    // 4. Per-Cluster Anomaly Filtering (FILTER SECOND)
    const finalClusters: ProductCluster[] = [];
    let itemsExcludedCount = 0;
    const allValidPrices: number[] = [];

    for (const cluster of initialClusters) {
      // Map MarketplaceOffer back to ScrapedProduct for filtering
      const clusterProducts = cluster.marketplace_offers.map(off => ({
        title: off.title,
        price: off.price,
        platform: off.platform,
        url: off.link,
        image: off.image
      }));

      const { cleanProducts, itemsExcluded } = filterClusterAnomalies(clusterProducts);
      itemsExcludedCount += itemsExcluded;

      if (cleanProducts.length > 0) {
        // Update cluster with cleaned data
        cluster.marketplace_offers = cleanProducts.map(p => ({
          platform: p.platform,
          price: p.parsedPrice,
          link: p.url,
          condition: "Baru",
          title: p.title,
          image: p.image
        }));

        // Recalculate cluster best price and platform
        cluster.best_price = cluster.marketplace_offers.reduce((min, off) => off.price < min ? off.price : min, cluster.marketplace_offers[0].price);
        cluster.cheapest_platform = cluster.marketplace_offers.find(off => off.price === cluster.best_price)?.platform || cluster.cheapest_platform;

        finalClusters.push(cluster);
        allValidPrices.push(...cleanProducts.map(p => p.parsedPrice));
      }
    }

    // 5. Calculate Global Market Stats from remaining clean products
    const avgPrice = allValidPrices.length > 0 ? allValidPrices.reduce((a, b) => a + b, 0) / allValidPrices.length : 0;
    const marketAnalytics = {
      average_price: Math.round(avgPrice),
      market_range: {
        lowest: allValidPrices.length > 0 ? Math.min(...allValidPrices) : 0,
        highest: allValidPrices.length > 0 ? Math.max(...allValidPrices) : 0
      },
      items_excluded_count: itemsExcludedCount
    };

    // 6. Intelligent Decision Nodes
    const smartSummary = generateDecisionTreeSummary(marketAnalytics, finalClusters);

    // 7. Response Payload Assembly
    const responsePayload: ComparisonResponse = {
      query_intent: intent,
      market_stats: marketAnalytics,
      smart_summary: smartSummary,
      product_clusters: finalClusters,
      ...(pipelineError && { errors: pipelineError })
    };

    // 🛡️ CACHE POLICY: Simpan jika ada data dan tidak ada error fatal
    if (!pipelineError && finalClusters.length > 0) {
      cache.set(cacheKey, responsePayload);
    }

    return NextResponse.json({ source: 'live', data: responsePayload });

  } catch (fatals: any) {
    console.error("API Kernel Error:", fatals);
    return NextResponse.json({
      error: "Fatal Processing Fault",
      details: fatals.message
    }, { status: 500 });
  }
}