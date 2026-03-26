"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  Star,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Package,
  Zap,
  ChevronDown,
  X,
  PieChart,
  BarChart3,
  Globe,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
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

interface MarketAnalytics {
  average_price: number;
  market_range: { lowest: number; highest: number };
  total_valid_items: number;
}

interface PlatformSummary {
  platform: string;
  is_found: boolean;
  lowest_price?: number;
  highest_price?: number;
  item_count?: number;
  cheapest_link?: string;
}

interface ComparisonResponse {
  keyword: string;
  market_analytics: MarketAnalytics;
  platform_summaries: PlatformSummary[];
  products: Product[];
}

type SortOption = "default" | "price_asc" | "price_desc" | "rating_desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

const PLATFORM_COLORS: Record<string, string> = {
  Tokopedia: "bg-[#03ac0e]",
  Shopee: "bg-[#ee4d2d]",
  Lazada: "bg-[#0f146d]",
  Blibli: "bg-[#0095da]",
  Zalora: "bg-black",
  Sociolla: "bg-[#f26522]",
  Orami: "bg-[#fe8c00]",
  Traveloka: "bg-[#0194f3]",
  "Tiket.com": "bg-[#0055ba]",
  Eraspace: "bg-[#003466]",
  Bhinneka: "bg-[#ed1c24]",
};

const POPULAR_SEARCHES = ["iPhone 15", "Laptop ASUS ROG", "Nike Jordan", "Samsung S24 Ultra", "Skincare Origin", "Mechanical Keyboard"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function MarketSummaryWidget({ analytics }: { analytics: MarketAnalytics }) {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 group overflow-hidden relative">
      <div className="absolute top-0 right-0 -m-8 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-white/10 transition-colors" />
      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium tracking-wide uppercase">
          <PieChart size={16} />
          Price Intelligence Summary
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {formatRupiah(analytics.average_price)}
        </h2>
        <p className="text-indigo-100 opacity-90 text-sm font-medium">
          Rata-rata Harga Pasar (Market Average)
        </p>
      </div>
      <div className="flex flex-col md:items-end gap-1 relative z-10">
        <p className="text-xs text-indigo-100/70 font-bold uppercase tracking-widest">
          Rentang Harga Wajar
        </p>
        <div className="text-xl font-bold flex items-center gap-3">
          <span>{formatRupiah(analytics.market_range.lowest)}</span>
          <ArrowRight size={16} className="text-indigo-300" />
          <span>{formatRupiah(analytics.market_range.highest)}</span>
        </div>
        <p className="text-xs text-indigo-100/60 mt-1 italic">
          Berdasarkan {analytics.total_valid_items} penawaran valid
        </p>
      </div>
    </div>
  );
}

function PlatformPill({ summary }: { summary: PlatformSummary }) {
  const colorClass = PLATFORM_COLORS[summary.platform] || "bg-gray-600";
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          <span className="text-sm font-bold text-gray-800 tracking-tight">{summary.platform}</span>
        </div>
        <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full font-bold">
          {summary.item_count} Item
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-400 font-medium">Rentang Harga</span>
        <span className="text-sm font-bold text-gray-900">
          {formatRupiah(summary.lowest_price!)} - {formatRupiah(summary.highest_price!)}
        </span>
      </div>
      <a 
        href={summary.cheapest_link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold transition-colors group"
      >
        Lihat Termurah
        <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
    </div>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const colorClass = PLATFORM_COLORS[product.platform] || "bg-gray-600";
  return (
    <div
      className="card-enter bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100
                 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="relative h-48 bg-gray-50 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm bg-white text-gray-800`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />
          {product.platform}
        </div>
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm bg-indigo-600 text-white`}>
          {product.condition}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold tracking-wide uppercase">
          <span className="flex items-center gap-1">
            <Star size={10} className="fill-yellow-400 text-yellow-400" />
            {product.rating}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingBag size={10} />
            {product.sold} TERJUAL
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug flex-1">
          {product.title}
        </p>
        <p className="text-lg font-black text-indigo-900 tracking-tight">
          {formatRupiah(product.price)}
        </p>
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl
                     bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all duration-200 active:scale-95"
        >
          Beli Sekarang
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");
  const [onlyNew, setOnlyNew] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const fetchProducts = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/compare?q=${encodeURIComponent(q)}`);
      const result = await res.json();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(query);
  };

  const handlePopular = (term: string) => {
    setQuery(term);
    fetchProducts(term);
  };

  useEffect(() => {
    const close = () => setShowSortDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const displayedProducts = (data?.products ?? [])
    .filter((p) => (onlyNew ? p.condition === "New" : true))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "rating_desc") return b.rating - a.rating;
      return 0;
    });

  const activePlatforms = data?.platform_summaries.filter(s => s.is_found) ?? [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <BarChart3 size={20} className="text-white" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">
                Price<span className="text-indigo-600">Intelligence</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4">
               <Globe size={16} className="text-gray-400" />
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Aggregator v2.0</span>
            </div>
          </div>
          <div className="pb-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative px-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari produk: Laptop, Nike, iPhone..."
                  className="w-full pl-11 pr-24 py-4 rounded-2xl border-0 bg-gray-100/50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasSearched && (
          <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-bold mb-6">
              <Zap size={14} /> Intelligence Platform untuk 11 Marketplaces
            </div>
            <h1 className="text-5xl sm:text-7xl font-black text-gray-900 tracking-tighter mb-6 leading-[0.9]">
              Bandingkan Tanpa <br />
              <span className="text-indigo-600">Batas.</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium mb-12">
              Dapatkan analisis harga terdalam dari seluruh ekosistem belanja Indonesia secara real-time.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {POPULAR_SEARCHES.map(term => (
                <button 
                    key={term} onClick={() => handlePopular(term)}
                    className="px-5 py-2.5 rounded-xl bg-white border border-gray-100 text-xs font-bold text-gray-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <SkeletonDashboard />}

        {!loading && data && (
          <div className="animate-in fade-in duration-500">
            {/* Market Analytics Widget */}
            <MarketSummaryWidget analytics={data.market_analytics} />

            {/* Platform Comparison List */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4 text-gray-500 font-bold text-xs uppercase tracking-widest px-1">
                <Globe size={14} />
                Market Presence ({activePlatforms.length} Platforms Found)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activePlatforms.map(summary => (
                  <PlatformPill key={summary.platform} summary={summary} />
                ))}
              </div>
            </div>

            {/* Grid Header & Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pt-6 border-t border-gray-100">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Detailed <span className="text-indigo-600">Inventory</span>
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setOnlyNew(!onlyNew)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all
                    ${onlyNew ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-100"}`}
                >
                  <SlidersHorizontal size={14} /> Hanya Baru
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-100"
                  >
                    Sort: {sort} <ChevronDown size={14} />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-2xl z-[60] overflow-hidden p-1">
                      {["default", "price_asc", "price_desc", "rating_desc"].map(opt => (
                        <button
                          key={opt}
                          onClick={() => { setSort(opt as SortOption); setShowSortDropdown(false); }}
                          className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 rounded-xl"
                        >
                          {opt.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>

            {displayedProducts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <Package size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No active results for selected filters</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 py-10 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" />
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Price Intelligence Suite</span>
           </div>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Analysis Engine Powered by Scrapy Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
