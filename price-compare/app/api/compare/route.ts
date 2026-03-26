import { NextRequest, NextResponse } from "next/server";

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
}

const ALL_PLATFORMS = [
  "Tokopedia",
  "Shopee",
  "Lazada",
  "Blibli",
  "Zalora",
  "Sociolla",
  "Orami",
  "Traveloka",
  "Tiket.com",
  "Eraspace",
  "Bhinneka",
];

const UNSPLASH_IMAGES: Record<string, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
  ],
  tech: [
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&q=80",
    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80",
  ],
};

function getImages(query: string): string[] {
  const q = query.toLowerCase();
  if (["nike", "shoe", "phone", "iphone", "laptop", "macbook", "samsung", "asus", "gaming"].some(k => q.includes(k))) {
    return UNSPLASH_IMAGES.tech;
  }
  return UNSPLASH_IMAGES.default;
}

function generatePrice(platform: string, basePrice: number): number {
  const pIndex = ALL_PLATFORMS.indexOf(platform);
  const variance = 0.85 + (pIndex % 5) * 0.05; // 0.85 to 1.05
  const jitter = Math.floor((Math.random() * 0.1 - 0.05) * basePrice);
  return Math.floor((basePrice * variance + jitter) / 1000) * 1000;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ 
      keyword: query, 
      products: [], 
      market_analytics: { average_price: 0, market_range: { lowest: 0, highest: 0 }, total_valid_items: 0 },
      platform_summaries: []
    });
  }

  // Simulate delay
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

  const images = getImages(query);
  const skipPlatformsCount = 3 + Math.floor(Math.random() * 4); // 3-6 platforms
  const skipIndices = new Set<number>();
  while (skipIndices.size < skipPlatformsCount) {
    skipIndices.add(Math.floor(Math.random() * ALL_PLATFORMS.length));
  }

  const basePriceMap: Record<string, number> = {
    iphone: 12000000,
    laptop: 8500000,
    nike: 1200000,
    skincare: 250000,
  };
  const matchedKey = Object.keys(basePriceMap).find(k => query.toLowerCase().includes(k));
  const basePrice = matchedKey ? basePriceMap[matchedKey] : 500000;

  const rawProducts: Product[] = [];

  ALL_PLATFORMS.forEach((platform, idx) => {
    if (skipIndices.has(idx)) {
      return;
    }

    const itemCount = 4 + Math.floor(Math.random() * 5); // 4-8 items
    const platformItems: Product[] = [];
    
    for (let i = 0; i < itemCount; i++) {
        // Occasionally inject an outlier (very cheap accessory) to test the filtering
        const isOutlier = Math.random() < 0.15;
        const price = isOutlier ? (15000 + Math.random() * 50000) : generatePrice(platform, basePrice);
        
        const item: Product = {
            id: `${platform}-${idx}-${i}-${Date.now()}`,
            platform,
            title: `${query} Original ${platform} Edition - v${i+1}`,
            price,
            condition: Math.random() > 0.3 ? "New" : "Used",
            imageUrl: images[(idx + i) % images.length],
            productUrl: `https://www.${platform.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/search?q=${encodeURIComponent(query)}`,
            rating: Math.round((4.2 + Math.random() * 0.8) * 10) / 10,
            sold: Math.floor(Math.random() * 500) + 1,
        };
        platformItems.push(item);
        rawProducts.push(item);
    }
  });

  // --- Advanced Analytics with Outlier Filtering ---
  // Simple heuristic: calculate median then filter items < 0.3x or > 3x median
  const sortedPrices = [...rawProducts].map(p => p.price).sort((a, b) => a - b);
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const validProducts = rawProducts.filter(p => p.price > median * 0.3 && p.price < median * 3);
  
  const totalPrice = validProducts.reduce((sum, p) => sum + p.price, 0);
  const avgPrice = validProducts.length > 0 ? Math.round(totalPrice / validProducts.length) : 0;
  
  const validPrices = validProducts.map(p => p.price);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;

  // Re-calculate platform summaries using ONLY valid items for cleaner display
  const platformMarketData = ALL_PLATFORMS.map((platform, idx) => {
    if (skipIndices.has(idx)) return { platform, is_found: false };
    
    const validPlatformItems = validProducts.filter(p => p.platform === platform);
    if (validPlatformItems.length === 0) return { platform, is_found: false };

    const sortedByPrice = [...validPlatformItems].sort((a, b) => a.price - b.price);
    return {
      platform,
      is_found: true,
      lowest_price: sortedByPrice[0].price,
      highest_price: sortedByPrice[sortedByPrice.length - 1].price,
      item_count: validPlatformItems.length,
      cheapest_link: sortedByPrice[0].productUrl,
    };
  });

  return NextResponse.json({
    keyword: query,
    market_analytics: {
      average_price: avgPrice,
      market_range: { lowest: minPrice, highest: maxPrice },
      total_valid_items: validProducts.length,
    },
    platform_summaries: platformMarketData,
    products: rawProducts // Grid shows all items, but analytics are cleaned
  });
}
