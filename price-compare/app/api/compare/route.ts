import { NextRequest, NextResponse } from "next/server";

export interface Product {
  id: string;
  platform: "Tokopedia" | "Shopee" | "Lazada";
  title: string;
  price: number;
  condition: "New" | "Used";
  imageUrl: string;
  productUrl: string;
  rating: number;
  sold: number;
}

const PLATFORMS: Product["platform"][] = ["Tokopedia", "Shopee", "Lazada"];

const UNSPLASH_IMAGES: Record<string, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80",
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80",
  ],
  nike: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&q=80",
    "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=400&q=80",
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80",
  ],
  iphone: [
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&q=80",
    "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&q=80",
    "https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=400&q=80",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&q=80",
    "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&q=80",
  ],
  laptop: [
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&q=80",
    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&q=80",
    "https://images.unsplash.com/photo-1588872657578-7efd81f4a689?w=400&q=80",
    "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?w=400&q=80",
  ],
};

function getImages(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes("nike") || q.includes("shoe") || q.includes("sneaker") || q.includes("adidas"))
    return UNSPLASH_IMAGES.nike;
  if (q.includes("iphone") || q.includes("samsung") || q.includes("phone") || q.includes("hp"))
    return UNSPLASH_IMAGES.iphone;
  if (q.includes("laptop") || q.includes("macbook") || q.includes("notebook"))
    return UNSPLASH_IMAGES.laptop;
  return UNSPLASH_IMAGES.default;
}

function generateTitle(query: string, platform: string, index: number): string {
  const variants = [
    `${query} - Original 100% Garansi Resmi ${platform}`,
    `[READY STOCK] ${query} Terbaru Best Seller`,
    `${query} Premium Quality Free Ongkir`,
    `Jual ${query} Murah Berkualitas`,
    `${query} - Official Store Terpercaya`,
    `${query} Ori COD Tersedia`,
    `New ${query} Promo Hari Ini Flash Sale`,
    `${query} Grade A++ Anti Retur`,
  ];
  return variants[index % variants.length];
}

function generatePrice(platform: string, baseIndex: number): number {
  const basePrices = [199000, 349000, 549000, 899000, 1299000, 1799000, 2499000, 3999000, 7999000, 12999000];
  const base = basePrices[baseIndex % basePrices.length];
  const multipliers: Record<string, number> = {
    Tokopedia: 1.0,
    Shopee: 0.95,
    Lazada: 1.05,
  };
  const jitter = Math.floor((Math.random() * 50000 - 25000) / 1000) * 1000;
  return Math.max(9000, base * multipliers[platform] + jitter);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ products: [] });
  }

  // Simulate network delay (300-800ms)
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

  const images = getImages(query);
  const products: Product[] = [];

  let idx = 0;
  for (const platform of PLATFORMS) {
    const count = 4 + Math.floor(Math.random() * 3); // 4-6 items per platform
    for (let i = 0; i < count; i++) {
      const priceBase = idx + i;
      products.push({
        id: `${platform.toLowerCase()}-${idx + i}-${Date.now()}`,
        platform,
        title: generateTitle(query, platform, idx + i),
        price: generatePrice(platform, priceBase),
        condition: Math.random() > 0.25 ? "New" : "Used",
        imageUrl: images[(idx + i) % images.length],
        productUrl: `https://www.${platform.toLowerCase()}.com/search?q=${encodeURIComponent(query)}`,
        rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
        sold: Math.floor(Math.random() * 500) + 10,
      });
      idx++;
    }
  }

  // Shuffle to mix platforms
  products.sort(() => Math.random() - 0.5);

  return NextResponse.json({ products, query });
}
