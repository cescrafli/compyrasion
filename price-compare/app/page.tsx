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
  Filter,
  Layers,
  ShoppingBag,
  Zap,
} from "lucide-react";

// --- Types ---
interface MarketplaceOffer {
  platform: string;
  price: number;
  link: string;
  url?: string;
  condition: string;
}

interface ProductCluster {
  cluster_id: string;
  canonical_name: string;
  canonical_image: string;
  best_price: number;
  cheapest_platform: string;
  marketplace_offers: MarketplaceOffer[];
  rating: number;
}

interface Intent {
  category: string;
  clean_keyword?: string;
  budget: number | null;
  type: string;
}

interface ComparisonResponse {
  query_intent: Intent;
  market_stats: {
    average_price: number;
    market_range: { lowest: number; highest: number };
    items_excluded_count?: number;
  };
  smart_summary: {
    summary: string;
    buy_recommendation: string;
  };
  product_clusters: ProductCluster[];
  errors?: string;
}

const ALL_PLATFORMS = [
  "Tokopedia", "Shopee", "Lazada", "Blibli", "Zalora",
  "Sociolla", "Orami", "Traveloka", "Tiket.com", "Eraspace", "Bhinneka"
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
  const messages = ["Parsing Intent NLU...", "Clustering Semantic Entities...", "Generating AI Advisor Insights...", "Bypassing WAF via Stealth Engine..."];

  useEffect(() => {
    const timer = setInterval(() => setMsgIndex((p) => (p + 1) % messages.length), 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-700">
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap size={32} className="text-indigo-600 animate-pulse" />
        </div>
      </div>
      <div className="space-y-4 max-w-sm">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">AI-Native Engine v5.0</h3>
        <div className="inline-flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-widest bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
          <RefreshCw size={14} className="animate-spin-slow" />
          {messages[msgIndex]}
        </div>
      </div>
    </div>
  );
}

function IntentHeader({ intent }: { intent: Intent }) {
  if (!intent) return null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 mb-10 relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:scale-125 transition-all duration-700" />
      <div className="relative flex flex-col md:flex-row items-center gap-8 justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white tracking-widest shadow-lg shadow-indigo-200">
            <Layers size={14} /> Intent Parsed Successfully
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">
              Mencari <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8 italic">{intent.clean_keyword || "Produk"}</span>
              {intent.budget && <span className="text-gray-400"> budget {formatRupiah(intent.budget)}</span>}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Query Optimization: {intent.type || "Search"} Priority</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-gray-50 px-6 py-4 rounded-3xl border border-gray-100 flex flex-col gap-1 items-center min-w-[120px]">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence</span>
            <span className="text-xl font-black text-indigo-600">98%</span>
          </div>
          <div className="bg-gray-50 px-6 py-4 rounded-3xl border border-gray-100 flex flex-col gap-1 items-center min-w-[120px]">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NLU Parse</span>
            <span className="text-xl font-black text-gray-900">Success</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductClusterCard({ cluster }: { cluster: ProductCluster }) {
  const [expanded, setExpanded] = useState(false);

  if (!cluster) return null;

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group/card flex flex-col">
      <div className="relative h-64 bg-gray-50 overflow-hidden">
        <img src={cluster.canonical_image || "/placeholder.svg"} alt={cluster.canonical_name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 group-hover/card:border-indigo-600 border-2 border-transparent transition-all">
          <Layers size={16} className="text-indigo-600" />
          <span className="text-[10px] font-black uppercase tracking-tighter">{cluster.marketplace_offers?.length || 0} Platform Comparison</span>
        </div>
      </div>

      <div className="p-8 space-y-6 flex flex-col flex-1">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} className={i < Math.floor(cluster.rating || 5) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"} />
            ))}
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Clean Entity Data</span>
          </div>
          <h3 className="text-lg font-black text-gray-900 tracking-tighter line-clamp-2 leading-tight uppercase italic">{cluster.canonical_name}</h3>
        </div>

        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Zap size={10} /> Market Leader Price</span>
            <span className="text-2xl font-black text-gray-900 tracking-tighter">{formatRupiah(cluster.best_price)}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black text-white shadow-lg ${PLATFORM_COLORS[cluster.cheapest_platform] || "bg-gray-400"}`}>
            {cluster.cheapest_platform}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-gray-400 py-2 border-b border-gray-100 hover:text-indigo-600 transition-colors"
          >
            Compare All {cluster.marketplace_offers?.length || 0} Offers
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <div className={`space-y-2 overflow-hidden transition-all duration-500 ${expanded ? "max-h-96 opacity-100 py-2" : "max-h-0 opacity-0"}`}>
            {cluster.marketplace_offers?.map((offer, i) => (
              <a
                key={i} href={offer.link || offer.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center justify-between p-3.5 rounded-xl border border-gray-50 hover:border-indigo-200 hover:bg-white transition-all group/offer ${i === 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50/50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${PLATFORM_COLORS[offer.platform] || "bg-gray-400"}`} />
                  <span className="text-[11px] font-black uppercase tracking-tighter">{offer.platform}</span>
                  {i === 0 && <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-100 px-1.5 py-0.5 rounded-md">Best Deal</span>}
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-black ${i === 0 ? "text-emerald-700" : "text-gray-900"}`}>{formatRupiah(offer.price)}</span>
                  <ExternalLink size={14} className="text-gray-300 group-hover/offer:text-indigo-600" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="pt-4 mt-auto">
          {cluster.marketplace_offers?.[0] && (
            <a
              href={cluster.marketplace_offers[0].link || cluster.marketplace_offers[0].url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 group/btn"
            >
              <ShoppingBag size={18} className="group-hover/btn:animate-bounce" />
              Ambil Penawaran Terbaik
            </a>
          )}
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

  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setData(null);
    try {
      const res = await fetch(`/api/compare?q=${encodeURIComponent(q)}&t=${Date.now()}`);
      const result = await res.json();
      // Penyesuaian membaca data dari response backend `{ source: 'live', data: {...} }`
      setData(result.data || result);
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

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-gray-100 px-8 lg:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-24">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center shadow-xl group-hover:bg-indigo-600 transition-all duration-500">
              <Zap size={24} className="text-indigo-400 group-hover:text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black italic tracking-tighter leading-none">EntityScope AI</span>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1.5">AI-Native Shopping Platform v5.0</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="hidden lg:flex flex-1 max-w-2xl mx-12 relative group/search">
            <div className="absolute inset-x-0 -bottom-4 h-px bg-indigo-600/10 scale-x-0 group-focus-within/search:scale-x-100 transition-transform origin-left duration-500" />
            <Sparkles size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tell the AI what you need: 'sepatu lari budget 2jt'..."
              className="w-full pl-16 pr-32 py-5 rounded-[1.5rem] bg-gray-50 focus:bg-white text-sm font-black focus:ring-[6px] focus:ring-indigo-100 border-transparent transition-all placeholder:text-gray-300"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-8 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
            >
              Analyze
            </button>
          </form>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NLU Service Live</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Cpu size={18} className="text-indigo-600" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-10">
        {!hasSearched && (
          <div className="text-center py-24 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-3 bg-white border border-gray-100 shadow-2xl px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-gray-900">
              <Zap size={20} className="text-indigo-600" /> Shopping in the Age of AI
            </div>
            <h1 className="text-8xl sm:text-[11rem] font-black text-gray-900 tracking-tighter leading-[0.8] select-none">
              Intent <br />
              <span className="text-indigo-600 outline-text">Driven.</span>
            </h1>
            <p className="text-2xl text-gray-400 max-w-3xl mx-auto font-black leading-relaxed italic opacity-70">
              Ubah cara Anda belanja. Berikan instruksi natural, biarkan AI kami meng-cluster penawaran terbaik dari marketplace utama.
            </p>
            <div className="pt-8 flex flex-wrap justify-center gap-4">
              {["sepatu lari budget 2jt", "laptop gaming bekas", "skincare untuk muka kusam", "iphone 13 garansi resmi"].map(term => (
                <button
                  key={term} onClick={() => fetchProducts(term)}
                  className="px-10 py-5 rounded-[2rem] bg-white border border-gray-100 text-[11px] font-black uppercase tracking-widest text-gray-600 hover:border-indigo-600 hover:text-indigo-600 hover:-translate-y-2 transition-all shadow-2xl shadow-gray-200/40"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <LatencyAwareLoader />}

        {!loading && data && (
          <div ref={resultsRef} className="animate-in fade-in duration-1000 space-y-12">

            {/* Semantic Intent Header */}
            <IntentHeader intent={data.query_intent} />

            {/* AI Advisor Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-[3rem] p-10 text-white shadow-3xl shadow-indigo-200 flex flex-col lg:flex-row items-center gap-10 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:rotate-12 transition-transform duration-1000">
                <Sparkles size={120} />
              </div>
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-3">
                  <span className="px-5 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest">AI Shopping Genius</span>
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-widest">
                    <CheckCircle2 size={16} /> Best Value Verified
                  </div>
                </div>
                <h4 className="text-4xl font-black tracking-tighter italic">"{data.smart_summary?.summary}"</h4>
                <div className="flex items-center gap-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Buy Recommendation</span>
                    <div className="flex items-center gap-2">
                      <Zap size={20} className="text-emerald-400 animate-pulse" />
                      <span className="text-2xl font-black uppercase tracking-tighter">{data.smart_summary?.buy_recommendation}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg. Market Range</span>
                    <span className="block text-2xl font-black">{formatRupiah(data.market_stats?.average_price || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button className="px-12 py-6 bg-white text-indigo-700 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all">
                  Amankan Deal Sekarang
                </button>
              </div>
            </div>

            {/* Entity-Centric Search Results */}
            <div className="space-y-10 pt-10">
              <div className="flex items-end justify-between border-b border-gray-100 pb-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-indigo-600 font-black text-[11px] uppercase tracking-[0.4em]">
                    <Layers size={20} /> Semantic Cluster Results
                  </div>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Entity <span className="text-indigo-600">Clusters</span></h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mengelompokkan hasil pencarian ke dalam {data.product_clusters?.length || 0} entitas unik.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {data.product_clusters?.map((cluster: any, idx: number) => (
                  <ProductClusterCard key={cluster.cluster_id || idx} cluster={cluster} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-24 bg-white border-t border-gray-100 text-center space-y-6">
        <Server size={32} className="mx-auto text-gray-200" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] opacity-40">
          EntityScope AI Platform · Redefining E-Commerce Search
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
          -webkit-text-stroke: 2px #4f46e5;
          color: transparent;
        }
        .shadow-3xl {
          box-shadow: 0 35px 60px -15px rgba(79, 70, 229, 0.3);
        }
      `}</style>
    </div>
  );
}