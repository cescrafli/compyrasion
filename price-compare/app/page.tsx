"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ExternalLink,
  Star,
  Package,
  ShieldCheck,
  Server,
  Activity,
  Cpu,
  RefreshCw,
  Globe,
  ArrowRight,
  ChevronDown,
  Info,
} from "lucide-react";

// --- Types ---
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
  items_excluded_count: number;
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

const SCRAPING_MESSAGES = [
  "Sistem sedang memproses secara aman...",
  "Menginisialisasi Stealth Browser Engine...",
  "Memeriksa 11 marketplace utama...",
  "Melewati proteksi bot dan WAF...",
  "Mengambil data harga secara real-time...",
  "Menganalisis anomali harga dengan metode IQR...",
  "Menyusun laporan intelijen pasar...",
];

// --- Helpers ---
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

// --- Sub-components ---

function LatencyAwareLoader() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % SCRAPING_MESSAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <Activity size={24} className="text-indigo-600 animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-4 max-w-sm">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
          Stealth Extraction v3.5
        </h3>
        <div className="inline-flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-widest bg-indigo-50 px-5 py-2.5 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-100/50">
           <RefreshCw size={14} className="animate-spin-slow" />
           {SCRAPING_MESSAGES[msgIndex]}
        </div>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed px-4">
          Anti-Ban Throttling Aktif · Tanpa Proxy Berbayar · Memproses Aman
        </p>
      </div>
    </div>
  );
}

function MarketSummaryWidget({ analytics }: { analytics: MarketAnalytics }) {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/40 p-8 mb-12 relative overflow-hidden group">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        <div className="lg:col-span-8 space-y-6">
           <div className="flex flex-wrap items-center gap-3">
             <div className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-400" /> Data Verified
             </div>
             <div className="px-4 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-amber-100">
                <Info size={14} /> IQR Method: {analytics.items_excluded_count} Anomali Dihapus
             </div>
           </div>
           
           <div className="space-y-1">
               <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Rata-rata Harga Pasar</p>
               <h2 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tighter">
                 {formatRupiah(analytics.average_price)}
               </h2>
           </div>
        </div>

        <div className="lg:col-span-4 bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
             <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <Cpu size={16} className="text-indigo-600" /> Rentang Harga Wajar
             </div>
             <div className="flex items-center justify-between">
                <div>
                    <span className="block text-[10px] text-gray-400 font-black uppercase mb-1">LOWEST</span>
                    <span className="text-sm font-black text-gray-900">{formatRupiah(analytics.market_range.lowest)}</span>
                </div>
                <ArrowRight size={18} className="text-gray-300" />
                <div className="text-right">
                    <span className="block text-[10px] text-gray-400 font-black uppercase mb-1">HIGHEST</span>
                    <span className="text-sm font-black text-gray-900">{formatRupiah(analytics.market_range.highest)}</span>
                </div>
             </div>
             <div className="pt-4 border-t border-gray-200/50">
                 <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                    Sistem otomatis mengeliminasi data "Noise" (aksesori murah atau produk salah kategori) menggunakan algoritma Interquartile Range untuk akurasi optimal.
                 </p>
             </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");
  
  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setData(null);
    try {
      const res = await fetch(`/api/compare?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Fetch failed");
      const result = await res.json();
      setData(result);
      
      setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
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

  const activePlatforms = data?.platform_summaries.filter(s => s.is_found) ?? [];
  const sortedProducts = [...(data?.products ?? [])].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating_desc") return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* --- Navigation --- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-gray-100 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-24">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center shadow-2xl shadow-gray-300">
              <Server size={24} className="text-indigo-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter leading-none italic">PriceScope</span>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1.5 opacity-80">Intelligence v3.5 Alpha</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="hidden lg:flex flex-1 max-w-2xl mx-12 relative group">
                <div className="absolute inset-0 bg-indigo-600/5 rounded-[1.25rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Analyze market: iPhone 15 Pro, RTX 4080..."
                  className="w-full pl-14 pr-32 py-4.5 rounded-[1.25rem] border-white bg-white shadow-xl shadow-gray-200/50 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-gray-300 relative z-10"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all z-20 shadow-lg"
                >
                  Analyze
                </button>
          </form>

          <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Stealth Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-12">
        {!hasSearched && (
          <div className="text-center py-28 space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="inline-flex items-center gap-3 bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
               <Globe size={16} className="text-indigo-600" /> 11 Marketplaces · No Proxy · Stealth
            </div>
            <h1 className="text-7xl sm:text-[10rem] font-black text-gray-900 tracking-tighter leading-[0.8] mb-8 select-none">
              Smart <br />
              <span className="text-indigo-600 outline-text">Aggregator.</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-bold leading-relaxed">
              Arsitektur scraping tanpa biaya proxy. Memungkinkan Anda <br /> mendapatkan intelijen harga secara aman tanpa hambatan IP.
            </p>
            <div className="pt-12 flex flex-wrap justify-center gap-4">
              {["MacBook Pro M3", "PS5 Slim", "Sony XM5", "Dyson V15", "GoPro Hero 12"].map(term => (
                <button 
                    key={term} onClick={() => fetchProducts(term)}
                    className="px-8 py-4 rounded-2xl bg-white border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-600 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-xl shadow-gray-200/20 hover:-translate-y-1"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <LatencyAwareLoader />}

        {!loading && data && (
          <div ref={resultsRef} className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <MarketSummaryWidget analytics={data.market_analytics} />

            {/* Platform Comparison */}
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Market Presence Overview</span>
                  <div className="h-px flex-1 bg-gray-100" />
                  <div className="bg-white border border-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-indigo-600 shadow-sm uppercase tracking-widest">
                    Source: {activePlatforms.length} Identified
                  </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activePlatforms.map(summary => (
                  <div key={summary.platform} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-indigo-100/50 hover:-translate-y-2 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${PLATFORM_COLORS[summary.platform] || "bg-gray-400"}`} />
                        <span className="text-xs font-black text-gray-900 tracking-tight uppercase">{summary.platform}</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                         {summary.item_count} Items
                      </div>
                    </div>
                    <div className="space-y-1 mb-8">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Price Entry</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">
                        {formatRupiah(summary.lowest_price!)}
                      </p>
                    </div>
                    <a 
                      href={summary.cheapest_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl bg-gray-50 group-hover:bg-indigo-600 group-hover:text-white transition-all text-[11px] font-black uppercase tracking-tighter"
                    >
                      Lihat Termurah
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Grid Section */}
            <div className="space-y-8 pb-32">
                <div className="flex items-center justify-between border-b border-gray-100 pb-8">
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Detail <span className="text-indigo-600">Produk</span></h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing real-time dari {activePlatforms.length} platform</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <button className="flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 shadow-xl shadow-gray-200/40 hover:border-indigo-600 transition-all">
                                Urutkan: {sort.replace('_', ' ')} <ChevronDown size={16} />
                            </button>
                            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl border border-gray-100 shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[60] p-2 overflow-hidden">
                                {["default", "price_asc", "price_desc", "rating_desc"].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setSort(opt as SortOption)}
                                    className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 hover:text-indigo-600 rounded-xl transition-colors"
                                >
                                    {opt.replace('_', ' ')}
                                </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedProducts.map((product, i) => (
                        <div key={product.id} className="bg-white rounded-[2rem] border border-gray-50 shadow-lg shadow-gray-200/20 overflow-hidden group/card hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 flex flex-col" style={{ animationDelay: `${i * 30}ms` }}>
                            <div className="relative h-56 bg-gray-50 overflow-hidden">
                                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" />
                                <div className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black shadow-lg bg-white box-content border-2 border-transparent group-hover/card:border-indigo-600 transition-all`}>
                                    <div className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[product.platform] || "bg-gray-400"}`} />
                                    {product.platform}
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-1 gap-4">
                                <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Star size={10} className="fill-indigo-600 text-indigo-600" /> {product.rating}</span>
                                    <span>{product.sold} Terjual</span>
                                </div>
                                <h4 className="text-sm font-black text-gray-800 line-clamp-2 leading-tight flex-1">{product.title}</h4>
                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Terbaik</p>
                                        <p className="text-xl font-black text-gray-900 tracking-tighter">{formatRupiah(product.price)}</p>
                                    </div>
                                    <a 
                                        href={product.productUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-3.5 bg-gray-900 text-white rounded-2xl hover:bg-indigo-600 hover:scale-110 transition-all shadow-xl shadow-gray-200"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .outline-text {
          -webkit-text-stroke: 1px #4f46e5;
          color: transparent;
        }
        .card-enter {
          animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
