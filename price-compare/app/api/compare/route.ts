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

/**
 * 1. Natural Language Intent Parser (NLU Simulation)
 */
function parseIntent(query: string): Intent {
  const q = query.toLowerCase();
  let budget: number | null = null;
  
  // Regex to find numbers after "budget", "di bawah", "max", "rp"
  const budgetMatch = q.match(/(?:budget|di bawah|max|maks|rp)\s*(\d+(?:\.\d+)*)/);
  if (budgetMatch) {
    // Clean "1.500.000" or "1500000" into number
    budget = parseInt(budgetMatch[1].replace(/\./g, ""));
  }

  // Simple category detection
  let category = "General";
  if (["laptop", "macbook", "pc", "gaming"].some(w => q.includes(w))) category = "Computing";
  else if (["sepatu", "baju", "nike", "adidas", "tas"].some(w => q.includes(w))) category = "Fashion";
  else if (["hp", "iphone", "samsung", "ponsel"].some(w => q.includes(w))) category = "Mobile Devices";

  return {
    category,
    budget,
    type: q.includes("bekas") || q.includes("used") ? "Second-hand" : "Brand New"
  };
}

/**
 * 2. Self-Healing AI DOM Parser Simulation
 * In production, this would call LLM (Gemini) with page text
 */
function extractProductDataViaLLM(platform: string, rawText: string, query: string): any[] {
  // TODO: LLM, PARSE THIS TEXT INTO JSON ARRAY OF {title, price, image, link}
  // For now, we simulate the result of a high-perf LLM extraction
  const basePrice = 5000000 + (Math.random() * 2000000);
  
  return Array.from({ length: 3 }).map((_, i) => ({
    title: `${query} ${platform} - Edition v${i + 1}`,
    price: Math.floor((basePrice * (0.9 + Math.random() * 0.2)) / 1000) * 1000,
    imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80`,
    productUrl: `https://www.${platform.toLowerCase()}.com/p/${i}`,
    platform
  }));
}

/**
 * 3. Semantic Product Clustering (Deduplication)
 */
function clusterSimilarProducts(allProducts: any[]): ProductCluster[] {
  const clusters: Map<string, ProductCluster> = new Map();

  allProducts.forEach(p => {
    // Normalize title to create a "Canonical Identification"
    // e.g. "iPhone 13 128GB Blue" -> "iphone 13 128gb"
    const canonical = p.title
      .toLowerCase()
      .replace(new RegExp(p.platform, "i"), "") // Remove platform name
      .replace(/\s+/g, " ")
      .trim();
    
    const clusterKey = canonical.substring(0, 30); // Simple fuzzy grouping

    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, {
        cluster_id: `cluster-${Math.random().toString(36).substr(2, 9)}`,
        canonical_name: p.title.split("-")[0].trim(), // Clean canonical name
        canonical_image: p.imageUrl,
        best_price: p.price,
        cheapest_platform: p.platform,
        marketplace_offers: [],
        rating: 4.5 + Math.random() * 0.5
      });
    }

    const cluster = clusters.get(clusterKey)!;
    cluster.marketplace_offers.push({
      platform: p.platform,
      price: p.price,
      link: p.productUrl,
      condition: "New"
    });

    // Update best price
    if (p.price < cluster.best_price) {
      cluster.best_price = p.price;
      cluster.cheapest_platform = p.platform;
    }
  });

  // Sort offers within cluster by price
  clusters.forEach(c => {
    c.marketplace_offers.sort((a, b) => a.price - b.price);
  });

  return Array.from(clusters.values());
}

// --- Utils ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- API Handler ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";

  if (query.length < 2) return NextResponse.json({ error: "Query too short" }, { status: 400 });

  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return NextResponse.json(cached.data);

  // 1. Parse Intent
  const intent = parseIntent(query);

  // 2. Fetch Data (Throttled)
  let allRawProducts: any[] = [];
  for (let i = 0; i < ALL_PLATFORMS.length; i += 3) {
    const chunk = ALL_PLATFORMS.slice(i, i + 3);
    const chunkResults = await Promise.all(chunk.map(async p => {
      // Simulate is_found check
      if (Math.random() < 0.3) return [];
      // Simulation of AI-first extraction
      return extractProductDataViaLLM(p, "RAW_DOM_CONTENT_SIMULATED", query);
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
