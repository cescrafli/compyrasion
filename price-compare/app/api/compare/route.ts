import { NextRequest, NextResponse } from "next/server";

// --- Types ---

export interface MarketplaceOffer {
  platform: string;
  price: number;
  link: string;
  condition: string;
}

export interface ProductCluster {
  cluster_id: string;
  canonical_name: string;
  canonical_image: string;
  best_price: number;
  cheapest_platform: string;
  marketplace_offers: MarketplaceOffer[];
  rating: number;
}

export interface Intent {
  category: string;
  budget: number | null;
  type: string;
}

const ALL_PLATFORMS = [
  "Tokopedia", "Shopee", "Lazada", "Blibli", "Zalora", 
  "Sociolla", "Orami", "Traveloka", "Tiket.com", "Eraspace", "Bhinneka"
];

const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600 * 1000;

// --- AI-Native Functions ---

// --- AI Core & Advanced Logic ---

/**
 * 0. AI Abstraction (Gemini 1.5 Flash Simulation)
 * In production: Replace with real 'google-generative-ai' SDK call
 */
async function callAI(prompt: string, systemInstruction: string = "You are a helpful assistant."): Promise<string> {
  // Simulate network latency
  await sleep(800);
  
  // LOGIC SIMULATION for NLU
  const qLower = prompt.toLowerCase();
  if (qLower.includes("dua setengah") || qLower.includes("2.500")) {
    return JSON.stringify({ category: "Mobile Devices", budget: 2500000, type: "Brand New" });
  }
  if (qLower.includes("lima juta") || qLower.includes("5.000")) {
    return JSON.stringify({ category: "Computing", budget: 5000000, type: "Brand New" });
  }
  if (qLower.includes("macbook") || qLower.includes("laptop")) {
    return JSON.stringify({ category: "Computing", budget: 15000000, type: "Brand New" });
  }
  
  // LOGIC SIMULATION for DOM Extraction
  if (prompt.includes("EXTRACT_PRODUCTS")) {
      const q = prompt.toLowerCase();
      if (q.includes("iphone")) {
          return JSON.stringify([
              { title: "iPhone 13 128GB Blue", price: 11500000, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", productUrl: "https://www.tokopedia.com/p/1" },
              { title: "Apple iPhone 13 (128 GB)", price: 11700000, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", productUrl: "https://www.shopee.com/p/1" }
          ]);
      }
      return JSON.stringify([
          { title: `Products for Search Premium Edition`, price: 4500000, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", productUrl: "https://www.tokopedia.com/p/1" },
          { title: `Products for Search Standard V2`, price: 4700000, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", productUrl: "https://www.shopee.com/p/2" }
      ]);
  }

  return "{}";
}

/**
 * 1. Natural Language Intent Parser (LLM-Based)
 */
async function parseIntent(query: string): Promise<Intent> {
  const prompt = `Ubah kalimat '${query}' menjadi JSON { "category": string, "budget": number | null, "type": string }. 
                  Handle textual numbers like 'dua setengah juta' -> 2500000. 
                  Identify if it's 'Used' or 'Brand New'.`;
  
  const system = "You are an Expert NLU Engine for an E-commerce platform.";
  const aiResponse = await callAI(prompt, system);
  
  try {
    return JSON.parse(aiResponse) as Intent;
  } catch {
    return { category: "General", budget: null, type: "Unknown" };
  }
}

/**
 * 2. Dice's Coefficient for String Similarity
 * Handles word reordering and partial matches better than Levenshtein
 */
function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const getBigrams = (str: string) => {
    const s = str.toLowerCase().replace(/\s+/g, "");
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) bigrams.add(s.slice(i, i + 2));
    return bigrams;
  };

  const set1 = getBigrams(s1);
  const set2 = getBigrams(s2);
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  return (2 * intersection.size) / (set1.size + set2.size);
}

/**
 * 3. Self-Healing AI DOM Parser Simulation
 * Captures raw text and lets AI extract information
 */
async function extractProductDataViaAI(platform: string, rawText: string, query: string): Promise<any[]> {
  const prompt = `EXTRACT_PRODUCTS: Dari teks mentah halaman ${platform} ini, ekstrak daftar produk ${query}.
                  Kembalikan array JSON: { title, price, imageUrl, productUrl }.
                  Abaikan iklan dan navigasi. Teks: ${rawText.substring(0, 1000)}...`;
  
  const aiResponse = await callAI(prompt, "You are a specialized Web Scraping AI Agent.");
  
  try {
    const extracted = JSON.parse(aiResponse);
    if (!Array.isArray(extracted)) throw new Error("Not an array");
    return extracted.map((p: any) => ({ ...p, platform }));
  } catch {
    // Fallback to basic simulation if AI fails
    const basePrice = 5000000 + (Math.random() * 2000000);
    return [{
      title: `${query} Original ${platform}`,
      price: Math.floor(basePrice / 1000) * 1000,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
      productUrl: `https://www.${platform.toLowerCase()}.com`,
      platform
    }];
  }
}

/**
 * 4. Advanced Semantic Product Clustering
 */
function clusterSimilarProducts(allProducts: any[]): ProductCluster[] {
  const clusters: ProductCluster[] = [];

  allProducts.forEach(p => {
    // Check if product belongs to an existing cluster based on similarity score
    let joined = false;
    for (const cluster of clusters) {
      // Normalize both for better comparison (Remove brand names as prefix)
      const cleanTitle = p.title.toLowerCase().replace(/^(apple|samsung|sony|nike|adidas)\s+/i, "").trim();
      const cleanCanonical = cluster.canonical_name.toLowerCase().replace(/^(apple|samsung|sony|nike|adidas)\s+/i, "").trim();
      
      const similarity = calculateSimilarity(cleanTitle, cleanCanonical);
      
      // If similarity > 70%, consider it the same product entity
      if (similarity > 0.70) {
        cluster.marketplace_offers.push({
          platform: p.platform,
          price: p.price,
          link: p.productUrl,
          condition: "New"
        });
        
        // Update best price if cheaper
        if (p.price < cluster.best_price) {
          cluster.best_price = p.price;
          cluster.cheapest_platform = p.platform;
        }
        joined = true;
        break;
      }
    }

    if (!joined) {
      clusters.push({
        cluster_id: `cluster-${Math.random().toString(36).substr(2, 9)}`,
        canonical_name: p.title,
        canonical_image: p.imageUrl,
        best_price: p.price,
        cheapest_platform: p.platform,
        marketplace_offers: [{
          platform: p.platform,
          price: p.price,
          link: p.productUrl,
          condition: "New"
        }],
        rating: 4.5 + Math.random() * 0.5
      });
    }
  });

  return clusters;
}

// --- Utils ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- API Handler ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";
  
  console.log(`[BACKEND] Incoming Query: "${query}"`);

  if (query.length < 2) return NextResponse.json({ error: "Query too short" }, { status: 400 });

  // 1. Parse Intent
  const intent = await parseIntent(query);
  console.log(`[BACKEND] Parsed Intent:`, intent);

  // 2. Fetch Data (Throttled)
  let allRawProducts: any[] = [];
  for (let i = 0; i < ALL_PLATFORMS.length; i += 3) {
    const chunk = ALL_PLATFORMS.slice(i, i + 3);
    const chunkResults = await Promise.all(chunk.map(async p => {
      // Simulate is_found check
      if (Math.random() < 0.3) return [];
      
      // REAL WORLD: await page.goto(...)
      // const rawPageText = await page.evaluate(() => document.body.innerText);
      
      // Simulation of AI-first extraction from raw text
      return await extractProductDataViaAI(p, "RAW_DOM_CONTENT_SIMULATED", query);
    }));
    allRawProducts.push(...chunkResults.flat());
    if (i + 3 < ALL_PLATFORMS.length) await sleep(500 + Math.random() * 500);
  }

  // 3. Semantic Clustering & Deduplication
  const productClusters = clusterSimilarProducts(allRawProducts);

  // 4. Final Analytics
  const validPrices = allRawProducts.map(p => p.price);
  const avgPrice = validPrices.length > 0 ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length) : 0;

  const response = {
    original_query: query,
    parsed_intent: intent,
    market_analytics: {
      average_price: avgPrice,
      market_range: {
        lowest: validPrices.length > 0 ? Math.min(...validPrices) : 0,
        highest: validPrices.length > 0 ? Math.max(...validPrices) : 0
      }
    },
    ai_shopping_assistant: {
      summary: `Hasil analisis menunjukkan ${productClusters.length} opsi produk utama yang relevan dengan budget ${intent.budget ? 'Rp ' + intent.budget : 'pasar'}. Rekomendasi utama kami adalah klaster yang dipimpin oleh ${productClusters[0]?.cheapest_platform || 'market'}.`,
      buy_recommendation: productClusters.length > 5 ? "Buy Now" : "Wait"
    },
    product_clusters: productClusters
  };

  searchCache.set(query, { data: response, timestamp: Date.now() });
  return NextResponse.json(response);
}
