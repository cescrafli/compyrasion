import natural from 'natural';

export interface MarketplaceOffer {
  platform: string;
  price: number;
  link: string;
  condition: string;
}

export interface ProductCluster {
  cluster_id: string;
  canonical_name: string;
  canonical_image: string;
  best_price: number;
  cheapest_platform: string;
  marketplace_offers: MarketplaceOffer[];
  rating: number;
}

// ==========================================
// GLOBALS: Instantiating and Training Singleton Classifier
// ==========================================
const classifier = new natural.BayesClassifier();

// Perform Memory-bound Singleton Training
classifier.addDocument("sepatu lari nike adidas puma kets", "Fashion");
classifier.addDocument("baju celana kaos kemeja jaket topi", "Fashion");
classifier.addDocument("laptop gaming asus rog lenovo legion acer", "Computing");
classifier.addDocument("pc rakitan vga rtx nvidia radeon cpu prosesor monitor", "Computing");
classifier.addDocument("iphone 13 pro max samsung galaxy xiaomi redmi oppo", "Mobile Devices");
classifier.addDocument("charger case kabel data powerbank handphone hp tablet", "Mobile Devices");
classifier.addDocument("kulkas mesin cuci tv televisi ac kipas dispenser", "Home Appliances");
classifier.train();

// Helper: Vector Dot Product Cosine Similarity
function calculateCosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term in vecA) {
    if (vecB[term]) {
      dotProduct += vecA[term] * vecB[term];
    }
    magA += vecA[term] ** 2;
  }
  for (const term in vecB) {
    magB += vecB[term] ** 2;
  }

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

// 🛒 Helper: Membersihkan judul dari kata-kata promosi (Noise)
function sanitizeProductTitle(title: string): string {
  return title.toLowerCase()
    .replace(/(promo|garansi resmi|100% ori|termurah|original|terlaris|grosir|murah|diskon|flash sale)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. trainAndPredictIntent
export function trainAndPredictIntent(query: string) {
  const qLower = query.toLowerCase();

  // Predict category synchronously via Global Classifier
  const predictedCategory = classifier.classify(qLower);

  // Extract budget using pure algorithmic RegExp
  let budget = null;
  const budgetMatch = qLower.match(/(di bawah|budget|max|maksimal) (\d+([.,]\d+)?\s*(ribu|juta|jt)?|\d+)/i);
  if (budgetMatch) {
    let numStr = budgetMatch[2].replace(/[.,a-z\s]/gi, ''); // Membersihkan sisa huruf dari angka
    if (budgetMatch[4] === 'ribu' || (numStr.length <= 3 && budgetMatch[4] == null)) numStr += '000';
    if (budgetMatch[4] === 'juta' || budgetMatch[4] === 'jt') numStr += '000000';
    budget = parseInt(numStr, 10);
  }

  // Clean keyword
  const clean_keyword = qLower
    .replace(/(di bawah|budget|max|maksimal)\s*\d+[.,\w\s]*/g, '')
    .replace(/(cari|tolong|carikan|info|harga|termurah|yang)/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  return { category: predictedCategory, clean_keyword, budget, type: 'search' };
}

// 2. clusterProductsML
export function clusterProductsML(products: any[]): ProductCluster[] {
  if (!products || products.length === 0) return [];

  // 🛡️ SCALABILITY CAPPING: Mencegah V8 Event Loop Blocking akibat komputasi O(N^2)
  // Membatasi maksimum 120 dokumen yang akan diproses oleh TF-IDF Singleton
  const cappedProducts = products.length > 120 ? products.slice(0, 120) : products;

  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();

  // Custom Tokenizer explicitly capturing / keeping numbers to fix blindspots
  const tokenizer = new natural.RegexpTokenizer({ pattern: /[a-z0-9]+/i });

  // Clean text and Map Prices globally first to save CPU later
  const cleanedProducts = cappedProducts.map(p => {
    const cleanTitle = sanitizeProductTitle(p.title);

    const parsedPrice = typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, ''), 10);

    const tokens = tokenizer.tokenize(cleanTitle) || [];
    if (tokens.length > 0) {
      tfidf.addDocument(tokens);
    } else {
      tfidf.addDocument([cleanTitle]);
    }

    return { ...p, cleanTitle, parsedPrice: isNaN(parsedPrice) ? 0 : parsedPrice };
  });

  const clusters: ProductCluster[] = [];
  const processedIndices = new Set<number>();

  const COSINE_THRESHOLD = 0.75;

  const documentVectors = cleanedProducts.map((_, idx) => {
    const terms: Record<string, number> = {};
    tfidf.listTerms(idx).forEach(item => { terms[item.term] = item.tfidf; });
    return terms;
  });

  for (let i = 0; i < cleanedProducts.length; i++) {
    if (processedIndices.has(i)) continue;

    const baseProduct = cleanedProducts[i];

    // 🛡️ DATA CONTRACT FIX: Menyesuaikan struktur object 100% dengan UI Frontend
    const currentCluster: ProductCluster = {
      cluster_id: `cls-${Date.now()}-${i}`,
      canonical_name: baseProduct.cleanTitle || baseProduct.title,
      canonical_image: baseProduct.image || "/placeholder.svg", // Gambar dimasukkan
      best_price: baseProduct.parsedPrice,
      cheapest_platform: baseProduct.platform,
      rating: 4.8 + (Math.random() * 0.2), // Mock rating (karena heuristik belum scrape rating)
      marketplace_offers: [{
        platform: baseProduct.platform,
        price: baseProduct.parsedPrice,
        link: baseProduct.url,
        condition: "Baru"
      }]
    };

    processedIndices.add(i);
    const termsI = documentVectors[i];

    for (let j = i + 1; j < cleanedProducts.length; j++) {
      if (processedIndices.has(j)) continue;

      const termsJ = documentVectors[j];
      const similarity = calculateCosineSimilarity(termsI, termsJ);

      if (similarity >= COSINE_THRESHOLD) {
        const jProduct = cleanedProducts[j];

        // 🛡️ DATA CONTRACT FIX: Masukkan dengan format flat yang bisa dibaca page.tsx
        currentCluster.marketplace_offers.push({
          platform: jProduct.platform,
          price: jProduct.parsedPrice,
          link: jProduct.url,
          condition: "Baru"
        });

        if (jProduct.parsedPrice < currentCluster.best_price) {
          currentCluster.best_price = jProduct.parsedPrice;
          currentCluster.cheapest_platform = jProduct.platform;
        }
        processedIndices.add(j);
      }
    }

    clusters.push(currentCluster);
  }

  return clusters;
}