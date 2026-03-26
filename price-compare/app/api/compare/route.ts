import { NextRequest, NextResponse } from "next/server";

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

export interface AiInsights {
  category: string;
  specs_to_check: string[];
  trend_prediction: {
    status: "Turun" | "Naik" | "Stabil";
    confidence: number;
    reasoning: string;
  };
  smart_summary: string;
}

// --- Configuration ---
const ALL_PLATFORMS = [
  "Tokopedia", "Shopee", "Lazada", "Blibli", "Zalora", 
  "Sociolla", "Orami", "Traveloka", "Tiket.com", "Eraspace", "Bhinneka"
];

const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600 * 1000;

// --- AI Logic Functions ---

function detectCategoryAndSpecs(keyword: string) {
  const k = keyword.toLowerCase();
  if (["iphone", "laptop", "samsung", "asus", "gaming", "macbook", "phone", "gadget"].some(word => k.includes(word))) {
    return {
      category: "Tech & Gadgets",
      specs_to_check: ["Garansi Resmi/Internasional", "Kapasitas Memori/RAM", "Battery Health/Condition"]
    };
  }
  if (["baju", "sepatu", "nike", "adidas", "tas", "fashion", "kaos", "celana"].some(word => k.includes(word))) {
    return {
      category: "Fashion & Lifestyle",
      specs_to_check: ["Keaslian Produk (Original)", "Size Chart/Ukuran", "Kebijakan Retur"]
    };
  }
  if (["skincare", "serum", "makeup", "beauty", "sociolla"].some(word => k.includes(word))) {
    return {
      category: "Beauty & Health",
      specs_to_check: ["Tanggal Kedaluwarsa (Expired)", "BPOM Registered", "Jenis Kulit Cocok"]
    };
  }
  return {
    category: "General Marketplace",
    specs_to_check: ["Ulasan Pembeli", "Reputasi Seller", "Waktu Pengiriman"]
  };
}

function predictPriceTrend(averagePrice: number, totalValidItems: number, marketRange: { lowest: number; highest: number }) {
  const rangeDiff = marketRange.highest - marketRange.lowest;
  const pricePosition = rangeDiff > 0 ? (averagePrice - marketRange.lowest) / rangeDiff : 0.5;
  
  // Logic: 
  // 1. High stock (>30) + Price in top 30% of range = Will Drop (Competitive pressure)
  // 2. Low stock (<15) = High probability Rise/Stable
  // 3. Medium = Stable
  
  if (totalValidItems > 35 && pricePosition > 0.7) {
    return {
      status: "Turun" as const,
      confidence: 70 + Math.floor(Math.random() * 20),
      reasoning: `Stok melimpah (${totalValidItems} item) dengan rata-rata harga di batas atas rentang pasar, memicu persaingan harga.`
    };
  } else if (totalValidItems < 12) {
    return {
      status: "Naik" as const,
      confidence: 65 + Math.floor(Math.random() * 15),
      reasoning: `Ketersediaan terbatas (${totalValidItems} item valid). Permintaan pasar tinggi dapat mendorong kenaikan harga.`
    };
  }
  return {
    status: "Stabil" as const,
    confidence: 80 + Math.floor(Math.random() * 15),
    reasoning: `Distribusi harga merata dan stok mencukupi (${totalValidItems} item). Tidak ada fluktuasi besar dalam waktu dekat.`
  };
}

function generateSmartSummary(keyword: string, category: string, trend: string, avg: number) {
  const formattedAvg = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(avg);
  if (trend === "Turun") {
    return `Analisis kami untuk "${keyword}" menunjukkan tren harga akan melandai. Sebaiknya tunggu 3-5 hari untuk mendapatkan deal terbaik karena stok ${category} sedang melimpah.`;
  }
  if (trend === "Naik") {
    return `Waspada! Stok "${keyword}" mulai menipis di 11 marketplace. Harga rata-rata ${formattedAvg} diprediksi naik dalam 48 jam ke depan. Amankan sekarang jika mendesak.`;
  }
  return `Harga "${keyword}" saat ini sangat kompetitif di level ${formattedAvg}. Ini adalah waktu yang aman untuk membeli dengan fokus pada pemilihan seller dengan rating tertinggi.`;
}

// --- Utils ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scrapePlatformMock(platform: string, query: string): Promise<Product[]> {
  const shouldSkip = Math.random() < 0.4;
  if (shouldSkip) return [];

  const baseLine = 1000000 + Math.random() * 5000000;
  const count = 3 + Math.floor(Math.random() * 6);
  return Array.from({ length: count }).map((_, i) => ({
    id: `${platform}-${i}-${Date.now()}`,
    platform,
    title: `${query} ${platform} - v${i+1}`,
    price: Math.floor((baseLine * (0.8 + Math.random() * 0.4)) / 1000) * 1000,
    condition: Math.random() > 0.2 ? "New" : "Used",
    imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80`,
    productUrl: `https://www.${platform.toLowerCase().replace(/[^a-z]/g, '')}.com/p/${i}`,
    rating: 4.5 + Math.random() * 0.5,
    sold: Math.floor(Math.random() * 1000) + 1,
  }));
}

function filterIQR(products: Product[]) {
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

  if (query.length < 2) return NextResponse.json({ error: "Query too short" }, { status: 400 });

  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return NextResponse.json(cached.data);

  // Scrape with throttling (Chunks of 3)
  const allRawProducts: Product[] = [];
  for (let i = 0; i < ALL_PLATFORMS.length; i += 3) {
    const chunk = ALL_PLATFORMS.slice(i, i + 3);
    const chunkResults = await Promise.all(chunk.map(p => scrapePlatformMock(p, query)));
    allRawProducts.push(...chunkResults.flat());
    if (i + 3 < ALL_PLATFORMS.length) await sleep(500 + Math.random() * 1000);
  }

  const { valid: cleanProducts, excluded: itemsExcluded } = filterIQR(allRawProducts);
  const validPrices = cleanProducts.map(p => p.price);
  const avgPrice = validPrices.length > 0 ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length) : 0;
  const marketRange = {
    lowest: validPrices.length > 0 ? Math.min(...validPrices) : 0,
    highest: validPrices.length > 0 ? Math.max(...validPrices) : 0
  };

  // --- AI Insights Generation ---
  const catInfo = detectCategoryAndSpecs(query);
  const trendInfo = predictPriceTrend(avgPrice, cleanProducts.length, marketRange);
  const summary = generateSmartSummary(query, catInfo.category, trendInfo.status, avgPrice);

  const aiInsights: AiInsights = {
    category: catInfo.category,
    specs_to_check: catInfo.specs_to_check,
    trend_prediction: trendInfo,
    smart_summary: summary
  };

  const platformSummaries = ALL_PLATFORMS.map(platform => {
    const platformItems = cleanProducts.filter(p => p.platform === platform);
    if (platformItems.length === 0) return { platform, is_found: false };
    const sorted = [...platformItems].sort((a, b) => a.price - b.price);
    return {
      platform,
      is_found: true,
      lowest_price: sorted[0].price,
      highest_price: sorted[sorted.length - 1].price,
      item_count: platformItems.length,
      cheapest_link: sorted[0].productUrl
    };
  });

  const response = {
    keyword: query,
    market_analytics: {
      average_price: avgPrice,
      market_range: marketRange,
      total_valid_items: cleanProducts.length,
      items_excluded_count: itemsExcluded
    },
    ai_insights: aiInsights,
    platform_summaries: platformSummaries,
    products: allRawProducts
  };

  searchCache.set(query, { data: response, timestamp: Date.now() });
  return NextResponse.json(response);
}
