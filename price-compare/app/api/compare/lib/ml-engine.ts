import natural from 'natural';

export interface ProductCluster {
  canonical_name: string;
  best_price: number;
  cheapest_platform: string;
  marketplace_offers: any[];
}

// 1. trainAndPredictIntent
export function trainAndPredictIntent(query: string) {
  // Instantiate local in-memory classifier
  const classifier = new natural.BayesClassifier();

  // Train with minimal dummy datasets
  classifier.addDocument("sepatu lari nike adidas puma kets", "Fashion");
  classifier.addDocument("baju celana kaos kemeja jaket topi", "Fashion");
  
  classifier.addDocument("laptop gaming asus rog lenovo legion acer", "Computing");
  classifier.addDocument("pc rakitan vga rtx nvidia radeon cpu prosesor monitor", "Computing");
  
  classifier.addDocument("iphone 13 pro max samsung galaxy xiaomi redmi oppo", "Mobile Devices");
  classifier.addDocument("charger case kabel data powerbank handphone hp tablet", "Mobile Devices");

  classifier.addDocument("kulkas mesin cuci tv televisi ac kipas dispenser", "Home Appliances");

  // Train the model synchronously
  classifier.train();

  const qLower = query.toLowerCase();
  
  // Predict category
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
  
  // Add all products to the TF-IDF corpus
  products.forEach(p => {
    // Basic text cleaner
    const cleanTitle = p.title.toLowerCase()
      .replace(/(promo|garansi resmi|100% ori|termurah|original|terlaris|grosir|murah|diskon|flash sale)/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
      
    tfidf.addDocument(cleanTitle);
  });

  const clusters: ProductCluster[] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < products.length; i++) {
    if (processedIndices.has(i)) continue;

    const baseProduct = products[i];
    const basePrice = typeof baseProduct.price === 'number' ? baseProduct.price : parseInt(String(baseProduct.price).replace(/[^0-9]/g, ''), 10);
    
    // Create new cluster centroid
    const currentCluster: ProductCluster = {
      canonical_name: baseProduct.title,
      best_price: basePrice,
      cheapest_platform: baseProduct.platform,
      marketplace_offers: [{ platform: baseProduct.platform, params: baseProduct }]
    };
    
    processedIndices.add(i);

    // Measure TF-IDF semantic link
    const tokenizer = new natural.WordTokenizer();
    const baseTerms = tokenizer.tokenize(baseProduct.title.toLowerCase()) || [];
    
    for (let j = i + 1; j < products.length; j++) {
      if (processedIndices.has(j)) continue;

      let score = 0;
      // Calculate how mathematically similar Document J is to Document I based on TF-IDF
      tfidf.tfidfs(baseTerms, (docIndex, measure) => {
          if (docIndex === j) {
             score += measure;
          }
      });

      // Tuning for TF-IDF correlation. Very basic heuristic threshold here.
      const SIMILARITY_THRESHOLD = 1.0; 
      
      if (score > SIMILARITY_THRESHOLD) {
        const jProduct = products[j];
        const jPrice = typeof jProduct.price === 'number' ? jProduct.price : parseInt(String(jProduct.price).replace(/[^0-9]/g, ''), 10);

        currentCluster.marketplace_offers.push({ platform: jProduct.platform, params: jProduct });
        if (jPrice < currentCluster.best_price) {
          currentCluster.best_price = jPrice;
          currentCluster.cheapest_platform = jProduct.platform;
        }
        processedIndices.add(j);
      }
    }

    clusters.push(currentCluster);
  }

  return clusters;
}
