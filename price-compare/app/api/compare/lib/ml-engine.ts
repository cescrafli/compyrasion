import natural from 'natural';
import * as fs from 'fs';
import * as path from 'path';
import trainingData from './dataset.json';

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
  /** Average cosine similarity of items within this cluster (used for weighted scoring) */
  avg_similarity: number;
}

// ==========================================
// GLOBALS: Lazy-Loaded Classifier Singleton
// ==========================================
let classifier: natural.BayesClassifier | null = null;
let classifierLoading: Promise<natural.BayesClassifier> | null = null;

const CLASSIFIER_PATH = path.join(__dirname, 'classifier.json');

/**
 * Loads the pre-trained classifier from classifier.json (fast path).
 * Falls back to in-memory training if the JSON file doesn't exist (dev/first-run).
 */
function getClassifier(): Promise<natural.BayesClassifier> {
  // Already loaded — return immediately
  if (classifier) return Promise.resolve(classifier);

  // Loading in progress (another request triggered it) — return same promise
  if (classifierLoading) return classifierLoading;

  classifierLoading = new Promise<natural.BayesClassifier>((resolve) => {
    // Fast path: load pre-trained JSON
    if (fs.existsSync(CLASSIFIER_PATH)) {
      try {
        const raw = fs.readFileSync(CLASSIFIER_PATH, 'utf-8');
        const restored = natural.BayesClassifier.restore(JSON.parse(raw));
        classifier = restored;
        console.log('⚡ [ML] Classifier loaded from pre-trained JSON (zero cold-start)');
        resolve(classifier);
        return;
      } catch (err) {
        console.warn('⚠️ [ML] Failed to restore classifier.json, falling back to training:', err);
      }
    }

    // Fallback: train in-memory (cold start)
    console.warn('🐢 [ML] classifier.json not found — training in-memory (cold start)...');
    const freshClassifier = new natural.BayesClassifier();
    trainingData.forEach((data: { text: string; category: string }) => {
      freshClassifier.addDocument(data.text, data.category);
    });
    freshClassifier.train();
    classifier = freshClassifier;

    // Attempt to persist for future fast loads
    try {
      fs.writeFileSync(CLASSIFIER_PATH, JSON.stringify(freshClassifier), 'utf-8');
      console.log('💾 [ML] Classifier auto-saved to classifier.json for next startup');
    } catch {
      // Non-fatal: read-only filesystem (e.g. Docker without volume mount)
    }

    resolve(classifier);
  });

  return classifierLoading;
}

// Helper: Vector Dot Product Cosine Similarity
export function calculateCosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
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

// 1. trainAndPredictIntent (now async — loads classifier lazily)
export async function trainAndPredictIntent(query: string) {
  const clf = await getClassifier();
  const qLower = query.toLowerCase();

  // Predict category via loaded classifier
  const predictedCategory = clf.classify(qLower);

  // 🛡️ PERBAIKAN: Extract budget menggunakan Float Parsing
  let budget = null;
  // Regex diperbarui untuk menangkap grup angka (termasuk desimal) dan grup kata satuan secara presisi
  const budgetMatch = qLower.match(/(di bawah|budget|max|maksimal)\s+(\d+(?:[.,]\d+)?)\s*(ribu|juta|jt)?/i);

  if (budgetMatch) {
    // Ganti koma dengan titik agar terbaca sebagai float (misal: "2,5" -> "2.5")
    let baseNumber = parseFloat(budgetMatch[2].replace(',', '.'));
    let multiplier = 1;
    const unit = budgetMatch[3];

    if (unit === 'juta' || unit === 'jt') {
      multiplier = 1000000;
    } else if (unit === 'ribu') {
      multiplier = 1000;
    } else if (baseNumber > 999 && !unit) {
      // 🛡️ FIX: Jika user mengetik angka utuh tanpa satuan (misal "15000000"),
      // asumsikan itu angka Rupiah mentah — multiplier tetap 1
      multiplier = 1;
    } else if (baseNumber <= 999 && !unit) {
      // Asumsi heuristik: Jika orang ketik "budget 500" (tanpa unit), diasumsikan 500 ribu
      multiplier = 1000;
    }

    // Gunakan Math.round untuk menghindari bug angka desimal JavaScript (misal: 2.5 * 1000000 = 2500000.00000001)
    budget = Math.round(baseNumber * multiplier);
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

    // Track similarity scores for weighted scoring
    const similarityScores: number[] = [];

    // 🛡️ DATA CONTRACT FIX: Menyesuaikan struktur object 100% dengan UI Frontend
    const currentCluster: ProductCluster = {
      cluster_id: `cls-${Date.now()}-${i}`,
      canonical_name: baseProduct.cleanTitle || baseProduct.title,
      canonical_image: baseProduct.image || "/placeholder.svg", // Gambar dimasukkan
      best_price: baseProduct.parsedPrice,
      cheapest_platform: baseProduct.platform,
      rating: 4.8 + (Math.random() * 0.2), // Mock rating (karena heuristik belum scrape rating)
      avg_similarity: 1.0, // Base item has perfect self-similarity
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
        similarityScores.push(similarity);

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

    // Compute average similarity for this cluster
    // Base item contributes 1.0 (self-similarity), plus all matched items
    const totalSimilarity = 1.0 + similarityScores.reduce((sum, s) => sum + s, 0);
    currentCluster.avg_similarity = totalSimilarity / currentCluster.marketplace_offers.length;

    clusters.push(currentCluster);
  }

  return clusters;
}