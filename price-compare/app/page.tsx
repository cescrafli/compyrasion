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
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  ChevronUp,
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

interface AiInsights {
  category: string;
  specs_to_check: string[];
  trend_prediction: {
    status: "Turun" | "Naik" | "Stabil";
    confidence: number;
    reasoning: string;
  };
  smart_summary: string;
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
  ai_insights: AiInsights;
  platform_summaries: PlatformSummary[];
  products: Product[];
}

type SortOption = "default" | "price_asc" | "price_desc" | "rating_desc";

const SCRAPING_MESSAGES = [
  "Inisialisasi Stealth Browser Engine...",
  "Rotasi User-Agent & Fingerprinting...",
  "Melewati WAF & Proteksi Anti-Bot...",
  "Menghubungkan ke 11 Marketplace...",
  "Menganalisis Anomali Harga (IQR)...",
  "Menghitung Prediksi Tren AI...",
  "Menyusun Laporan Intelijen Pasar...",
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
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={24} className="text-indigo-600 animate-pulse" />
        </div>
      </div>
      <div className="space-y-4 max-w-sm">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">AI Intelligence Engine v4.0</h3>
        <div className="inline-flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-widest bg-indigo-50 px-5 py-2.5 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-100/50">
           <RefreshCw size={14} className="animate-spin-slow" />
           {SCRAPING_MESSAGES[msgIndex]}
        </div>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed px-4">
          Stealth Extraction · IQR Cleaning · Predictive AI Modeling
        </p>
      </div>
    </div>
  );
}

function AiInsightWidget({ insights }: { insights: AiInsights }) {
  const [showSpecs, setShowSpecs] = useState(false);

  return (
    <div className="relative mb-10 overflow-hidden group animate-in slide-in-from-top-4 duration-700">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl p-8 border-gradient-ai">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 animate-pulse">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">Smart Assistant Advisor</span>
                <span className="text-xs font-bold text-gray-400">{insights.category}</span>
              </div>
            </div>
            
            <p className="text-lg font-semibold text-gray-800 leading-relaxed italic pr-4">
              "{insights.smart_summary}"
            </p>

            <button 
              onClick={() => setShowSpecs(!showSpecs)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 bg-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-all"
            >
              {showSpecs ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Tips Pengecekan Specs
            </button>

            {showSpecs && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 animate-in fade-in slide-in-from-top-2">
                {insights.specs_to_check.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-gray-600 bg-white/50 border border-indigo-50 p-3 rounded-xl">
                    <CheckCircle2 size={14} className="text-emerald-500" /> {spec}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-indigo-950 p-6 rounded-[2rem] text-white w-full lg:w-72 shadow-2xl flex flex-col justify-between group/trend">
            <div className="flex items-center justify-between mb-8">
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Price Prediction</span>
               <div className="bg-white/10 px-2 py-1 rounded-lg text-[9px] font-bold">Conf. {insights.trend_prediction.confidence}%</div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
               {insights.trend_prediction.status === "Turun" && (
                 <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                   <ArrowDownRight size={32} />
                 </div>
               )}
               {insights.trend_prediction.status === "Naik" && (
                 <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                   <ArrowUpRight size={32} />
                 </div>
               )}
               {insights.trend_prediction.status === "Stabil" && (
                 <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                   <Minus size={32} />
                 </div>
               )}
               
               <div className="flex flex-col">
                  <span className="text-3xl font-black tracking-tighter uppercase leading-none">{insights.trend_prediction.status}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Trend Pasar</span>
               </div>
            </div>
            
            <p className="text-[9px] font-medium leading-relaxed opacity-60 italic group-hover/trend:opacity-100 transition-opacity">
               {insights.trend_prediction.reasoning}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .border-gradient-ai {
          border-image: linear-gradient(to right, #4f46e5, #9333ea, #ec4899) 1;
        }
      `}</style>
    </div>
  );
}

function MarketSummaryWidget({ analytics, trend }: { analytics: MarketAnalytics, trend: AiInsights['trend_prediction'] }) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 mb-10 relative overflow-hidden group">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-8 space-y-6">
           <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" /> Data Verified (IQR)
             </div>
             <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-indigo-100">
                <Activity size={14} /> {analytics.items_excluded_count} Anomali Dihapus
             </div>
           </div>
           
           <div className="space-y-1">
               <div className="flex items-center gap-2">
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Rata-rata Harga Pasar</p>
                 {trend.status === "Turun" && <ArrowDownRight size={16} className="text-emerald-500" />}
                 {trend.status === "Naik" && <ArrowUpRight size={16} className="text-rose-500" />}
               </div>
               <h2 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tighter">
                 {formatRupiah(analytics.average_price)}
               </h2>
           </div>
        </div>

        <div className="lg:col-span-4 bg-gray-50 rounded-3xl p-6 space-y-4 border border-gray-100">
             <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <Cpu size={16} className="text-indigo-600" /> Price Range Boundary
             </div>
             <div className="flex items-center justify-between">
                <div>
                    <span className="block text-[10px] text-gray-400 font-bold mb-1">LOWEST</span>
                    <span className="text-sm font-black text-gray-900">{formatRupiah(analytics.market_range.lowest)}</span>
                </div>
                <ArrowRight size={18} className="text-gray-200" />
                <div className="text-right">
                    <span className="block text-[10px] text-gray-400 font-bold mb-1">HIGHEST</span>
                    <span className="text-sm font-black text-gray-900">{formatRupiah(analytics.market_range.highest)}</span>
                </div>
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
      const result = await res.json();
      setData(result);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
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
    <div className="min-h-screen bg-[#fafafa]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-gray-100 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-24">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center shadow-xl group-hover:bg-indigo-600 transition-all duration-500">
              <Server size={22} className="text-indigo-400" />
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-black italic tracking-tighter leading-none">PriceScope AI</span>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1.5">Intelligence Hub v4.0</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="hidden md:flex flex-1 max-w-2xl mx-12 relative">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Analyze market with AI: 'iPhone 15' or 'Nike Shoes'..."
                  className="w-full pl-14 pr-32 py-4.5 rounded-3xl border-transparent bg-gray-50 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-gray-300 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                >
                  Analyze
                </button>
          </form>

          <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Stealth & AI Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {!hasSearched && (
          <div className="text-center py-24 sm:py-32 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-3 bg-white border border-gray-100 shadow-xl px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-gray-900">
               <Sparkles size={16} className="text-indigo-600" /> AI Insights · Stealth Web Scraping
            </div>
            <h1 className="text-7xl sm:text-[9rem] font-black text-gray-900 tracking-tighter leading-[0.8] select-none">
              Intelligence <br />
              <span className="text-indigo-600 outline-text">Aggregator.</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-bold leading-relaxed">
              Arsitektur scraping tanpa biaya proxy dengan pemodelan AI <br /> untuk prediksi tren dan eliminasi anomali harga.
            </p>
            <div className="pt-8 flex flex-wrap justify-center gap-3">
              {["iPhone 15 Pro", "Sony A7 IV", "RTX 4090", "Dyson V15", "Nike Jordan"].map(term => (
                <button 
                    key={term} onClick={() => fetchProducts(term)}
                    className="px-8 py-4 rounded-2xl bg-white border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-500 hover:border-indigo-600 hover:text-indigo-600 hover:-translate-y-1 transition-all shadow-xl shadow-gray-200/20"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <LatencyAwareLoader />}

        {!loading && data && (
          <div ref={resultsRef} className="animate-in fade-in duration-1000">
            {/* AI Smart Assistant Widget */}
            <AiInsightWidget insights={data.ai_insights} />

            {/* Standard Metrics */}
            <MarketSummaryWidget analytics={data.market_analytics} trend={data.ai_insights.trend_prediction} />

            {/* Platform Comparison List */}
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em]">
                    <Globe size={16} className="text-indigo-600" /> Market Presence Sources
                  </div>
                  <div className="h-px flex-1 bg-gray-100" />
                  <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-100">
                    IDENTIFIED: {activePlatforms.length} PLATFORMS
                  </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activePlatforms.map(summary => (
                  <div key={summary.platform} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-indigo-100 hover:-translate-y-1.5 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${PLATFORM_COLORS[summary.platform] || "bg-gray-400"}`} />
                        <span className="text-[11px] font-black text-gray-900 tracking-tight uppercase">{summary.platform}</span>
                      </div>
                      <div className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                         {summary.item_count}
                      </div>
                    </div>
                    <div className="space-y-1 mb-8">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Entry Price</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">
                        {formatRupiah(summary.lowest_price!)}
                      </p>
                    </div>
                    <a 
                      href={summary.cheapest_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-gray-50 group-hover:bg-indigo-600 group-hover:text-white transition-all text-xs font-black uppercase tracking-tighter"
                    >
                      Lihat Termurah <ArrowRight size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Detail */}
            <div className="space-y-10 pb-20 border-t border-gray-100 pt-16">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Detail <span className="text-indigo-600">Inventory</span></h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing real-time dari {activePlatforms.length} marketplace</p>
                </div>
                <div className="relative group">
                    <button className="flex items-center gap-3 px-7 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 hover:border-indigo-600 transition-all">
                        Urutkan: {sort.replace('_', ' ')} <ChevronDown size={14} />
                    </button>
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl border border-gray-100 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[60] p-2 overflow-hidden">
                        {["default", "price_asc", "price_desc", "rating_desc"].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setSort(opt as SortOption)}
                            className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 hover:text-indigo-600 rounded-xl"
                        >
                            {opt.replace('_', ' ')}
                        </button>
                        ))}
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {sortedProducts.map((product, i) => (
                  <div key={product.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-gray-200/20 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col group/card" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="relative h-56 bg-gray-50 overflow-hidden">
                      <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" />
                      <div className={`absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[9px] font-black shadow-lg bg-white box-content`}>
                        <div className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[product.platform] || "bg-gray-400"}`} />
                        {product.platform}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1 gap-4">
                      <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Star size={10} className="fill-indigo-600 text-indigo-600" /> {product.rating} / 5.0</span>
                        <span>{product.sold} Terjual</span>
                      </div>
                      <h4 className="text-sm font-black text-gray-800 line-clamp-2 leading-tight flex-1">{product.title}</h4>
                      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                         <p className="text-xl font-black text-gray-900 tracking-tighter">{formatRupiah(product.price)}</p>
                         <a 
                            href={product.productUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3.5 bg-gray-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200"
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

      <footer className="py-16 bg-white border-t border-gray-50">
        <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] opacity-50">
           Scrapy Price Intelligence Suite · Powered by Stealth AI Engine
        </p>
      </footer>

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .outline-text {
          -webkit-text-stroke: 1.5px #4f46e5;
          color: transparent;
        }
      `}</style>
    </div>
  );
}
