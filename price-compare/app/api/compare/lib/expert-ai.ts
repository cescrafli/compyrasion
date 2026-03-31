import { ProductCluster } from './ml-engine';

// 1. filterAnomalies (Expert Math System - IQR)
export function filterAnomalies(rawProducts: any[]) {
    if (!rawProducts || rawProducts.length === 0) {
        return { 
           cleanProducts: [], 
           marketAnalytics: { average_price: 0, market_range: { lowest: 0, highest: 0 }, items_excluded_count: 0 } 
        };
    }

    const prices = rawProducts.map(p => typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, ''), 10))
                              .filter(p => !isNaN(p));
    
    if (prices.length === 0) {
        return { 
           cleanProducts: [], 
           marketAnalytics: { average_price: 0, market_range: { lowest: 0, highest: 0 }, items_excluded_count: rawProducts.length } 
        };
    }

    // Sort prices for IQR
    prices.sort((a, b) => a - b);
    
    const q1Index = Math.floor(prices.length * 0.25);
    const q3Index = Math.floor(prices.length * 0.75);
    const q1 = prices[q1Index];
    const q3 = prices[q3Index];
    
    const iqr = q3 - q1;
    const lowerBound = Math.max(0, q1 - 1.5 * iqr);
    const upperBound = q3 + 1.5 * iqr;

    const cleanProducts: any[] = [];
    let excludedCount = 0;
    let sum = 0;

    for (const product of rawProducts) {
        const pPrice = typeof product.price === 'number' ? product.price : parseInt(String(product.price).replace(/[^0-9]/g, ''), 10);
        if (pPrice >= lowerBound && pPrice <= upperBound) {
            cleanProducts.push(product);
            sum += pPrice;
        } else {
            excludedCount++;
        }
    }

    const avgPrice = cleanProducts.length > 0 ? sum / cleanProducts.length : 0;
    
    const validPrices = cleanProducts.map(p => typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, ''), 10));
    const lowest = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const highest = validPrices.length > 0 ? Math.max(...validPrices) : 0;

    return {
        cleanProducts,
        marketAnalytics: {
            average_price: Math.round(avgPrice),
            market_range: { lowest, highest },
            items_excluded_count: excludedCount
        }
    };
}

// 2. generateDecisionTreeSummary
export function generateDecisionTreeSummary(analytics: any, clusters: ProductCluster[]) {
    if (clusters.length === 0) {
        return { summary: "Sistem Pakar: Tidak ada data valid setelah penyaringan outlier IQR.", buy_recommendation: "Wait" };
    }

    // Decision Tree logic
    const topCluster = clusters[0];
    const bestPrice = topCluster.best_price;
    const avgPrice = analytics.average_price;
    const platform = topCluster.cheapest_platform;

    // Node 1: Is the platform significantly cheaper?
    if (avgPrice > 0) {
        const discountRatio = (avgPrice - bestPrice) / avgPrice;
        
        if (discountRatio > 0.10) {
            // Leaf 1: > 10% cheaper
            const percentageRounded = Math.round(discountRatio * 100);
            return {
                summary: `Evaluasi Sistem Pakar: Ditemukan kejanggalan positif di platform ${platform}. Harga barang ini ${percentageRounded}% lebih murah dari nilai pasar sejati (berdasarkan IQR). Secara algoritmik, ini adalah titik beli optimal.`,
                buy_recommendation: "Buy Now"
            };
        } else if (discountRatio > 0) {
             // Leaf 2: < 10% cheaper
             const percentageRounded = Math.round(discountRatio * 100);
             return {
                 summary: `Evaluasi Sistem Pakar: Harga termurah saat ini ada di ${platform} (${percentageRounded}% di bawah rata-rata tren wajar). Anda bisa membelinya sekarang, atau menunggu momentum diskon akhir bulan.`,
                 buy_recommendation: "Stable / Optional buy"
             };
        } else {
             // Leaf 3: Prices are higher/equal to average
             return {
                 summary: `Evaluasi Sistem Pakar: Harga terendah di ${platform} terpantau sejajar atau lebih tinggi dari rata-rata batas wajar pasar lokal. Algoritma menyarankan Anda untuk Hold uang Anda sampai ada fluktuasi penurunan.`,
                 buy_recommendation: "Wait"
             };
        }
    }

    return {
        summary: "Evaluasi Sistem Pakar: Data pasar terlampau sedikit untuk menjalankan pohon keputusan finansial. Harap tunggu atau periksa manual.",
        buy_recommendation: "Wait"
    };
}
