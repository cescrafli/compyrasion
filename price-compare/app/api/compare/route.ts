import { NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { runScrapingPipeline } from './lib/scraper-engine';
import { trainAndPredictIntent, clusterProductsML } from './lib/ml-engine';
import { filterAnomalies, generateDecisionTreeSummary } from './lib/expert-ai';

// 1 Hour TTL Cache
const cache = new NodeCache({ stdTTL: 3600 });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: "Missing 'q' parameter." }, { status: 400 });
  }

  // 1. Check node-cache
  const cacheKey = q.toLowerCase().trim();
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    return NextResponse.json({ source: 'cache', data: cachedResponse });
  }

  try {
    // 2. Call mlEngine.trainAndPredictIntent(query) -> gets predicted category & cleaned intent
    const intent = trainAndPredictIntent(q);

    // 3. Call scraperEngine.runScrapingPipeline(intent.clean_keyword) -> gets raw data
    const rawProducts = await runScrapingPipeline(intent.clean_keyword);

    // 4. Call expertAi.filterAnomalies(rawData) -> removes outliers via IQR
    const anomalyFiltered = filterAnomalies(rawProducts);

    // 5. Call mlEngine.clusterProductsML(cleanData) -> groups products via TF-IDF machine learning
    const clusters = clusterProductsML(anomalyFiltered.cleanProducts);

    // 6. Call expertAi.generateDecisionTreeSummary(...) -> generates final AI text logic
    const smartSummary = generateDecisionTreeSummary(anomalyFiltered.marketAnalytics, clusters);

    // 7. Construct ComparisonResponse
    const responsePayload = {
      query_intent: intent,
      market_stats: anomalyFiltered.marketAnalytics,
      smart_summary: smartSummary,
      product_clusters: clusters
    };

    // 8. Cache and return
    cache.set(cacheKey, responsePayload);

    return NextResponse.json({ source: 'live', data: responsePayload });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
