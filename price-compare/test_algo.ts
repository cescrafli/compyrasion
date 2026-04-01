import { filterAnomalies } from './app/api/compare/lib/expert-ai';

console.log("--- TEST REGEX HARGA ---");
const htmlTests = [
    "Harga awal Rp 10.000,00 termurah",
    "Promo gila idr15.000.50!",
    "Ready stok Rp12.000",
    "iPhone 13 Rp. 10.500.000",
    "Beli sekarang Rp12.500.000,00"
];

const fs = require('fs');
let outString = "--- TEST REGEX HARGA ---\n";
for(const text of htmlTests) {
    const cleanText = text.replace(/\s+/g, '');
    const priceMatch = cleanText.match(/(?:Rp\.?|IDR)([\d.,]+)/i);
    if (!priceMatch) continue;
    let numStr = priceMatch[1].replace(/[,.]\d{1,2}$/, '');
    const price = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
    outString += `Original: "${text}" --> Murni: ${price}\n`;
}

outString += "\n--- TEST FILTER IQR (Variant Based) ---\n";
const mockData = [
    { title: "iPhone 13 128GB Garansi Resmi", price: "Rp10.500.000", platform: "Toko A", url: "" },
    { title: "Apple iPhone 13 128GB", price: "Rp 10.600.000", platform: "Toko B", url: "" },
    { title: "iPhone 13 128GB Promo", price: "Rp 10.200.000", platform: "Toko C", url: "" },
    { title: "Casing Keren iPhone 13 128GB", price: "Rp 50.000", platform: "Toko D", url: "" }, // Anomali Murah
    { title: "iPhone 13 256GB - Baru", price: "IDR 12.500.000", platform: "Toko E", url: "" },
    { title: "iPhone 13 256GB Resmi", price: "IDR 12.800.000,00", platform: "Toko F", url: "" },
    { title: "iPhone 13 512GB", price: "Rp 18.000.000", platform: "Toko G", url: "" }
];

const processedRaw = mockData.map(item => {
    let p = item.price;
    const cleanStr = p.replace(/\s+/g, '');
    const m = cleanStr.match(/(?:Rp\.?|IDR)([\d.,]+)/i);
    if(m) p = parseInt(m[1].replace(/[,.]\d{1,2}$/, '').replace(/[^0-9]/g, ''), 10) as any;
    return { ...item, price: p };
});

const result = filterAnomalies(processedRaw);
outString += `Input Total: ${mockData.length} items\n`;
outString += `Clean output: ${result.cleanProducts.length} items\n`;
outString += `Excluded count: ${result.marketAnalytics.items_excluded_count}\n`;
outString += "Clean Items Details:\n";
result.cleanProducts.forEach(c => outString += `- [${c.parsedPrice}] ${c.title}\n`);

fs.writeFileSync('algo_out.txt', outString);
