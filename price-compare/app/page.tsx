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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
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

type SortOption = "default" | "price_asc" | "price_desc" | "rating_desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

const PLATFORM_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Tokopedia: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  Shopee:    { bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-500" },
  Lazada:    { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-600" },
};

const POPULAR_SEARCHES = [
  "Nike Pegasus 39",
  "iPhone 13",
  "Samsung Galaxy S23",
  "MacBook Air M2",
  "Adidas Ultraboost",
  "Laptop Gaming ASUS",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="skeleton h-52 w-full" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-12 rounded-full" />
        </div>
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-7 w-28 mt-1" />
        <div className="skeleton h-10 w-full rounded-xl mt-2" />
      </div>
    </div>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const ps = PLATFORM_STYLE[product.platform];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="card-enter bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100
                 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative h-52 bg-gray-50 overflow-hidden">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Package size={48} />
          </div>
        )}
        {/* Platform badge overlay */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${ps.bg} ${ps.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
          {product.platform}
        </div>
        {/* Condition badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm
          ${product.condition === "New" ? "bg-white/90 text-indigo-700 border border-indigo-100" : "bg-amber-50/90 text-amber-700 border border-amber-100"}`}>
          {product.condition === "New" ? "✦ Baru" : "◈ Bekas"}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Rating & Sold */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-gray-700">{product.rating}</span>
          </span>
          <span className="flex items-center gap-1">
            <ShoppingBag size={12} />
            {product.sold.toLocaleString("id-ID")} terjual
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug flex-1">
          {product.title}
        </p>

        {/* Price */}
        <p className="text-xl font-bold text-gray-900 tracking-tight">
          {formatRupiah(product.price)}
        </p>

        {/* CTA */}
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     text-white text-sm font-semibold transition-colors duration-200"
        >
          Beli Sekarang
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-5">
        <Search size={36} className="text-indigo-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        Tidak ada hasil untuk &ldquo;{query}&rdquo;
      </h3>
      <p className="text-gray-500 max-w-sm text-sm">
        Coba gunakan kata kunci lain atau periksa ejaan Anda. Kami mencari di
        Tokopedia, Shopee, dan Lazada secara bersamaan.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");
  const [onlyNew, setOnlyNew] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const SORT_LABELS: Record<SortOption, string> = {
    default: "Relevansi",
    price_asc: "Harga: Termurah",
    price_desc: "Harga: Termahal",
    rating_desc: "Rating Tertinggi",
  };

  const fetchProducts = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setSubmittedQuery(q);
    setProducts([]);
    try {
      const res = await fetch(`/api/compare?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
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

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setShowSortDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Filtered & sorted products
  const displayedProducts = [...products]
    .filter((p) => (onlyNew ? p.condition === "New" : true))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "rating_desc") return b.rating - a.rating;
      return 0;
    });

  const skeletonCount = 12;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo row */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Price<span className="text-indigo-600">Scope</span>
              </span>
            </div>
            <span className="hidden sm:block text-xs text-gray-400 font-medium tracking-wide uppercase">
              Bandingkan Harga Terbaik
            </span>
          </div>

          {/* Search row */}
          <div className="pb-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari produk, e.g. Nike Pegasus 39, iPhone 13..."
                  className="w-full pl-11 pr-28 py-3.5 rounded-2xl border border-gray-200 bg-gray-50
                             text-sm text-gray-800 placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                             transition-all duration-200"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl
                             bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                             text-white text-sm font-semibold transition-colors duration-200"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* ── Hero (shown before first search) ──────────────────────────────── */}
      {!hasSearched && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full mb-5">
            <Zap size={12} /> Bandingkan dari Tokopedia · Shopee · Lazada
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Temukan Harga Terbaik,<br />
            <span className="text-indigo-600">Belanja Lebih Cerdas</span>
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto text-base mb-10">
            Bandingkan harga dari berbagai marketplace Indonesia dalam satu klik.
            Hemat waktu, hemat uang.
          </p>

          {/* Platform badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {(["Tokopedia", "Shopee", "Lazada"] as const).map((p) => {
              const ps = PLATFORM_STYLE[p];
              return (
                <span key={p} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${ps.bg} ${ps.text} border-current/10`}>
                  <span className={`w-2 h-2 rounded-full ${ps.dot}`} />
                  {p}
                </span>
              );
            })}
          </div>

          {/* Popular searches */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-semibold">
              Pencarian Populer
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handlePopular(term)}
                  className="px-4 py-2 rounded-full text-sm text-gray-600 bg-white border border-gray-200
                             hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50
                             transition-all duration-200 shadow-sm font-medium"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Results area ──────────────────────────────────────────────────── */}
      {hasSearched && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Toolbar */}
          {!loading && products.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{displayedProducts.length}</span> hasil untuk
                &ldquo;<span className="font-semibold text-indigo-600">{submittedQuery}</span>&rdquo;
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* New-only toggle */}
                <button
                  onClick={() => setOnlyNew(!onlyNew)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200
                    ${onlyNew
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                >
                  <SlidersHorizontal size={14} />
                  Hanya Barang Baru
                </button>

                {/* Sort dropdown */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border
                               bg-white text-gray-700 border-gray-200 hover:border-indigo-300 transition-all duration-200"
                  >
                    {sort === "price_asc" && <TrendingDown size={14} className="text-green-500" />}
                    {sort === "price_desc" && <TrendingUp size={14} className="text-red-500" />}
                    {(sort === "default" || sort === "rating_desc") && <Star size={14} className="text-yellow-400" />}
                    {SORT_LABELS[sort]}
                    <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-xl z-10 overflow-hidden">
                      {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setSort(key); setShowSortDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                            ${sort === key ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skeleton grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Results grid */}
          {!loading && displayedProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && displayedProducts.length === 0 && hasSearched && (
            <EmptyState query={submittedQuery} />
          )}
        </main>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
              <Zap size={10} className="text-white" />
            </div>
            <span><strong className="text-gray-800">PriceScope</strong> — MVP Demo</span>
          </div>
          <p className="text-xs text-gray-400">
            Data harga bersifat simulasi. Harga aktual dapat berbeda di masing-masing marketplace.
          </p>
        </div>
      </footer>
    </div>
  );
}
