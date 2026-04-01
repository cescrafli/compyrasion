import { ProductCluster } from './ml-engine';

// 🛡️ HELPER: BIMODAL PRE-FILTRATION (K-Means 1D)
// Tujuan: membuang aksesoris seharga 50rb yang menempel pada pencarian perangkat 10jt
function filterBimodalNoise(parsedData: any[], prices: number[]) {
    if (prices.length < 6) return { cleanData: parsedData, excludedCount: 0, validPrices: prices };

    let c1 = prices[0];
    let c2 = prices[prices.length - 1];
    
    for (let i = 0; i < 5; i++) {
        let sum1 = 0, cnt1 = 0, sum2 = 0, cnt2 = 0;
        for (let p of prices) {
            if (Math.abs(p - c1) < Math.abs(p - c2)) { sum1 += p; cnt1++; }
            else { sum2 += p; cnt2++; }
        }
        if (cnt1) c1 = sum1 / cnt1;
        if (cnt2) c2 = sum2 / cnt2;
    }
    
    // Jika rata-rata kluster bawah < 30% dari kluster atas (C2) -> ini aksesoris!
    if (c1 < c2 * 0.3 && c2 > 0) {
        const boundary = (c1 + c2) / 2;
        const cleanData = parsedData.filter(p => p.parsedPrice >= boundary);
        return {
            cleanData,
            excludedCount: parsedData.length - cleanData.length,
            validPrices: cleanData.map(p => p.parsedPrice).sort((a, b) => a - b)
        };
    }
    
    return { cleanData: parsedData, excludedCount: 0, validPrices: prices };
}

// Helper: Filter IQR per Grup Varian
function filterGroupAnomalies(parsedGroupedData: any[]) {
    const initialPrices = parsedGroupedData.map(p => p.parsedPrice).sort((a, b) => a - b);
    
    // Bimodal Noise Pre-Filtration
    const { cleanData: kmeansFilteredData, excludedCount: bimodalExcluded, validPrices: prices } = filterBimodalNoise(parsedGroupedData, initialPrices);
    
    // EDGE CASE: Jika item terlalu sedikit, tidak bisa IQR
    if (prices.length < 4) {
        return { cleanGroup: parsedGroupedData, excludedGroupCount: 0 };
    }

    const q1Index = Math.floor(prices.length * 0.25);
    const q3Index = Math.floor(prices.length * 0.75);
    const q1 = prices[q1Index];
    const q3 = prices[q3Index];

    const iqr = q3 - q1;
    const lowerBound = Math.max(0, q1 - 1.5 * iqr);
    const upperBound = q3 + 1.5 * iqr;

    const cleanGroup: any[] = [];
    let excludedGroupCount = bimodalExcluded;

    for (const product of kmeansFilteredData) {
        if (product.parsedPrice >= lowerBound && product.parsedPrice <= upperBound) {
            cleanGroup.push(product);
        } else {
            excludedGroupCount++;
        }
    }

    return { cleanGroup, excludedGroupCount };
}

// 1. filterAnomalies (Expert Math System - Grouped IQR)
export function filterAnomalies(rawProducts: any[]) {
    if (!rawProducts || rawProducts.length === 0) {
        return {
            cleanProducts: [],
            marketAnalytics: { average_price: 0, market_range: { lowest: 0, highest: 0 }, items_excluded_count: 0 }
        };
    }

    // Parse harga
    const parsedData = rawProducts.map(p => {
        const pPrice = typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, ''), 10);
        return { ...p, parsedPrice: isNaN(pPrice) ? 0 : pPrice };
    }).filter(p => p.parsedPrice > 0);

    // 🛡️ Grouping Produk Berdasarkan Varian Memori (Misal: 128GB, 256GB, 1TB)
    const groups: Record<string, any[]> = {};
    for (const p of parsedData) {
        const title = (p.title || p.name || "").toString();
        const match = title.match(/\b(\d+\s*(?:gb|tb|mb))\b/i);
        const variantKey = match ? match[1].toUpperCase().replace(/\s+/g, '') : "DEFAULT";
        
        if (!groups[variantKey]) groups[variantKey] = [];
        groups[variantKey].push(p);
    }

    let allCleanProducts: any[] = [];
    let totalExcludedCount = 0;

    // Terapkan deteksi anomali pada tiap grup varian secara terpisah
    for (const variantKey in groups) {
        const { cleanGroup, excludedGroupCount } = filterGroupAnomalies(groups[variantKey]);
        allCleanProducts.push(...cleanGroup);
        totalExcludedCount += excludedGroupCount;
    }

    // Kalkulasi agregat harga pasar gabungan (Global Analytics)
    let sum = 0;
    const validPrices: number[] = [];
    
    for (const p of allCleanProducts) {
        sum += p.parsedPrice;
        validPrices.push(p.parsedPrice);
    }

    const avgPrice = allCleanProducts.length > 0 ? sum / allCleanProducts.length : 0;

    // V8 Spread Operator Fix
    const lowest = validPrices.length > 0 ? validPrices.reduce((min, p) => p < min ? p : min, validPrices[0]) : 0;
    const highest = validPrices.length > 0 ? validPrices.reduce((max, p) => p > max ? p : max, validPrices[0]) : 0;

    return {
        cleanProducts: allCleanProducts,
        marketAnalytics: {
            average_price: Math.round(avgPrice),
            market_range: { lowest, highest },
            items_excluded_count: totalExcludedCount
        }
    };
}

// 2. generateDecisionTreeSummary
export function generateDecisionTreeSummary(analytics: any, clusters: ProductCluster[]) {
    if (clusters.length === 0) {
        return { summary: "Sistem Pakar: Tidak ada data valid yang memenuhi bobot kluster atau anomali IQR.", buy_recommendation: "Wait" };
    }

    // Select the cluster with the MOST MARKETPLACE OFFERS
    const mostPopularCluster = clusters.reduce((prev, current) => {
        return (prev.marketplace_offers.length > current.marketplace_offers.length) ? prev : current;
    });

    const bestPrice = mostPopularCluster.best_price;
    const avgPrice = analytics.average_price;
    const platform = mostPopularCluster.cheapest_platform;

    // Node 1: Evaluation
    if (avgPrice > 0) {
        const discountRatio = (avgPrice - bestPrice) / avgPrice;

        // 🛡️ SCAM DECISION GATE (Diskon Ekstrem)
        if (discountRatio > 0.40) {
            const percentageRounded = Math.round(discountRatio * 100);
            if ((mostPopularCluster.rating || 4.0) < 4.8 || mostPopularCluster.marketplace_offers.length < 3) {
                 return {
                     summary: `WASPADA: Harga di ${platform} terdeteksi sebagai ANOMALI KRITIS (${percentageRounded}% lebih murah dari ekuilibrium pasar). Probabilitas tinggi barang palsu (HDC), aksesoris, atau penipuan.`,
                     buy_recommendation: "Avoid / Scam Risk"
                 };
            }
        }

        if (discountRatio > 0.10) {
            const percentageRounded = Math.round(discountRatio * 100);
            return {
                summary: `Evaluasi Pakar: Temuan kejanggalan positif di ${platform}. Item '${mostPopularCluster.canonical_name}' terukur ${percentageRounded}% lebih murah dari ekuilibrium IQR. Titik beli sangat optimal.`,
                buy_recommendation: "Buy Now"
            };
        } else if (discountRatio > 0) {
            const percentageRounded = Math.round(discountRatio * 100);
            return {
                summary: `Evaluasi Pakar: Temuan harga normal di ${platform} (${percentageRounded}% di bawah paritas wajar). Eksekusi pembelian secara proporsional.`,
                buy_recommendation: "Stable / Optional buy"
            };
        } else {
            return {
                summary: `Evaluasi Pakar: Rentang terendah di ${platform} menembus batas ekuilibrium wajar pasar (Inflasi temporal). Dimohon untuk menahan (Hold) nilai transaksi Anda hingga depresiasi platform terjadi.`,
                buy_recommendation: "Wait"
            };
        }
    }

    return {
        summary: "Evaluasi Pakar: Dataset terlampau mikro untuk menopang pohon prediksi. Verifikasi manual disarankan.",
        buy_recommendation: "Wait"
    };
}