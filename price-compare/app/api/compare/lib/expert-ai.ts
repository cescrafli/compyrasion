import { ProductCluster } from './ml-engine';

// 1. filterAnomalies (Expert Math System - IQR)
export function filterAnomalies(rawProducts: any[]) {
    if (!rawProducts || rawProducts.length === 0) {
        return { 
           cleanProducts: [], 
           marketAnalytics: { average_price: 0, market_range: { lowest: 0, highest: 0 }, items_excluded_count: 0 } 
        };
    }

    // Single pre-parse array to save loops
    const parsedData = rawProducts.map(p => {
        const pPrice = typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, ''), 10);
        return { ...p, parsedPrice: isNaN(pPrice) ? 0 : pPrice };
    }).filter(p => p.parsedPrice > 0);

    const prices = parsedData.map(p => p.parsedPrice).sort((a, b) => a - b);
    let avgPrice = 0;
    
    // EDGE CASE: Arrays < 4 cannot statistically support IQR properly
    if (prices.length < 4) {
        if (prices.length > 0) avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        return {
            cleanProducts: parsedData,
            marketAnalytics: {
               average_price: Math.round(avgPrice),
               market_range: { lowest: prices[0] || 0, highest: prices[prices.length - 1] || 0 },
               items_excluded_count: 0 // Bypassed
            }
        };
    }

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

    for (const product of parsedData) {
        if (product.parsedPrice >= lowerBound && product.parsedPrice <= upperBound) {
            cleanProducts.push(product);
            sum += product.parsedPrice;
        } else {
            excludedCount++;
        }
    }

    avgPrice = cleanProducts.length > 0 ? sum / cleanProducts.length : 0;
    
    const validPrices = cleanProducts.map(p => p.parsedPrice);
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
