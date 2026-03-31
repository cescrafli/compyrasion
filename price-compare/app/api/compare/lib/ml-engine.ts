import natural from 'natural';

export interface ProductCluster {
  canonical_name: string;
  best_price: number;
  cheapest_platform: string;
  marketplace_offers: any[];
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

// 1. trainAndPredictIntent
export function trainAndPredictIntent(query: string) {
  const qLower = query.toLowerCase();
  
  // Predict category synchronously via Global Classifier
  const predictedCategory = classifier.classify(qLower);

  // Extract budget using pure algorithmic RegExp
  let budget = null;
  const budgetMatch = qLower.match(/(di bawah|budget|max|maksimal) (\d+([.,]\d+)?\s*(ribu|juta)?|\d+)/i);
  if (budgetMatch) {
    let numStr = budgetMatch[2].replace(/[.,]/g, '');
    if (budgetMatch[4] === 'ribu' || (numStr.length <= 3 && budgetMatch[4] == null)) numStr += '000';
    if (budgetMatch[4] === 'juta') numStr += '000000';
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

  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();
  
  // Custom Tokenizer explicitly capturing / keeping numbers to fix blindspots
  const tokenizer = new natural.RegexpTokenizer({ pattern: /[a-z0-9]+/i });
  
  // Clean text and Map Prices globally first to save CPU later
  const cleanedProducts = products.map(p => {
      const cleanTitle = p.title.toLowerCase()
          // Replaced '' with ' ' space to prevent concatenation bugs (e.g. termurahiphone -> iphone)
          .replace(/(promo|garansi resmi|100% ori|termurah|original|terlaris|grosir|murah|diskon|flash sale)/g, ' ')
          // PRESERVE ALPHANUMERIC: ^a-z0-9 explicitly stops mathematical numbers from shedding
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      
      const parsedPrice = typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, ''), 10);
      
      // Explicitly tokenize and insert as Array, bypassing TfIdf's default number-shedding tokenizer
      const tokens = tokenizer.tokenize(cleanTitle) || [];
      if (tokens.length > 0) {
          tfidf.addDocument(tokens);
      } else {
          // Fallback if fully empty to ensure tfidf indexing matches `cleanedProducts` array length
          tfidf.addDocument([cleanTitle]);
      }
      
      return { ...p, cleanTitle, parsedPrice: isNaN(parsedPrice) ? 0 : parsedPrice };
  });

  const clusters: ProductCluster[] = [];
  const processedIndices = new Set<number>();
  
  // 🛡️ Raised stricter Cosine Threshold to match model numbers accurately (e.g. 13 vs 14 needs less noise allowance)
  const COSINE_THRESHOLD = 0.75; 

  // 🛡️ CPU BOTTLENECK FIX: Pre-compute TF-IDF vectors in O(N) to prevent O(N^2) recalculations
  const documentVectors = cleanedProducts.map((_, idx) => {
      const terms: Record<string, number> = {};
      tfidf.listTerms(idx).forEach(item => { terms[item.term] = item.tfidf; });
      return terms;
  });

  for (let i = 0; i < cleanedProducts.length; i++) {
    if (processedIndices.has(i)) continue;

    const baseProduct = cleanedProducts[i];
    
    // Create new cluster centroid
    const currentCluster: ProductCluster = {
      canonical_name: baseProduct.cleanTitle || baseProduct.title,
      best_price: baseProduct.parsedPrice,
      cheapest_platform: baseProduct.platform,
      marketplace_offers: [{ platform: baseProduct.platform, params: baseProduct }]
    };
    
    processedIndices.add(i);

    // Constant lookup O(1) instead of listTerms recalculation
    const termsI = documentVectors[i];

    for (let j = i + 1; j < cleanedProducts.length; j++) {
      if (processedIndices.has(j)) continue;

      // Constant lookup O(1)
      const termsJ = documentVectors[j];

      // Pure Vector Dot-Product (Cosine Similarity)
      const similarity = calculateCosineSimilarity(termsI, termsJ);
      
      if (similarity >= COSINE_THRESHOLD) {
        const jProduct = cleanedProducts[j];

        currentCluster.marketplace_offers.push({ platform: jProduct.platform, params: jProduct });
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
