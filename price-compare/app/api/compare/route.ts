import { NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { runScrapingPipeline, ScrapedProduct, AbortState } from './lib/scraper-engine';
import { trainAndPredictIntent, clusterProductsML, ProductCluster } from './lib/ml-engine';
import { filterAnomalies, generateDecisionTreeSummary } from './lib/expert-ai';

// Memory Caching (1 Jam) dengan V8 Exhaustion Guard (Max 200 Indeks)
const cache = new NodeCache({ stdTTL: 3600, maxKeys: 200 });

// Rate Limiting Cache (TTL 60 detik)
const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 60 });

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
  if (q.length > 50) {
      return NextResponse.json({ error: "Query exceeds maximum allowed length of 50 characters. Request Dropped." }, { status: 413 });
  }

  // 🛡️ CACHE POISONING FIX: Normalisasi input agar cache efisien
  const cacheKey = q.toLowerCase().replace(/\s+/g, ' ').trim();
  const cachedResponse = cache.get<ComparisonResponse>(cacheKey);

  if (cachedResponse) {
    return NextResponse.json({ source: 'cache', data: cachedResponse });
  }

  try {
    // 1. Natural Language Intent Routing (Offline Classifier)
    const intent = trainAndPredictIntent(q);

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

    // 3. IQR Mathematics Engine (Filter harga anomali / scam)
    const anomalyFiltered = filterAnomalies(rawProducts);

    // 4. ML Semantic TF-IDF + Cosine Clustering
    const clusters = clusterProductsML(anomalyFiltered.cleanProducts);

    // 5. Intelligent Decision Nodes
    const smartSummary = generateDecisionTreeSummary(anomalyFiltered.marketAnalytics, clusters);

    // 6. Response Payload Assembly
    const responsePayload: ComparisonResponse = {
      query_intent: intent,
      market_stats: anomalyFiltered.marketAnalytics,
      smart_summary: smartSummary,
      product_clusters: clusters,
      ...(pipelineError && { errors: pipelineError })
    };

    // 🛡️ CACHE POLICY: Simpan jika ada data dan tidak ada error fatal
    if (!pipelineError && clusters.length > 0) {
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