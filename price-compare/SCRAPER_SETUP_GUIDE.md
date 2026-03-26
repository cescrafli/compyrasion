# Panduan Pengaturan Price Intelligence Scraper

Dokumen ini berisi langkah-langkah teknis untuk mengaktifkan sistem scraping stealth pada dashboard Anda. Karena kita menggunakan arsitektur tanpa API berbayar, Anda perlu melakukan konfigurasi CSS selector secara manual untuk setiap marketplace.

## 1. Instalasi Dependency
Buka terminal di direktori proyek (`price-compare`) dan jalankan perintah berikut:

```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth node-cache
```

## 2. Cara Mencari CSS Selector
Untuk mendapatkan data dari marketplace, Anda perlu memberi tahu Puppeteer element mana yang harus diambil.
1. Buka marketplace (contoh: `tokopedia.com`) di browser Chrome.
2. Cari produk (contoh: "iPhone 15").
3. Klik kanan pada Judul Produk, lalu pilih **Inspect**.
4. Cari class atau atribut unik yang membungkus judul tersebut.
5. Ulangi untuk:
   - **Product Card Container**: Element pembungkus satu kotak produk.
   - **Product Title**: Selector untuk teks nama produk.
   - **Product Price**: Selector untuk teks harga.
   - **Product Image**: Selector untuk tag `<img>` (ambil atribut `src`).
   - **Product Link**: Selector untuk tag `<a>` (ambil atribut `href`).

## 3. Konfigurasi di `route.ts`
Buka file `app/api/compare/route.ts`. Saya telah menyiapkan blok kode `page.evaluate` dengan komentar `// TODO: HUMAN, PASTE...`.

Contoh pengisian (pseudocode):
```typescript
const title = el.querySelector('.name__product-title')?.innerText; 
// Ganti '.name__product-title' dengan selector yang Anda temukan.
```

## 4. Strategi Anti-Ban (Sudah Terpasang)
Sistem ini sudah dilengkapi dengan:
- **Throttling**: Hanya memproses 2-3 platform sekaligus.
- **Random Delay**: Ada jeda acak antar permintaan untuk meniru perilaku manusia.
- **Stealth Plugin**: Menghapus sidik jari (fingerprint) otomatis yang biasanya menandakan bot.
- **Caching**: Hasil pencarian yang sama dalam 1 jam tidak akan men-scrape ulang, melindungi IP Anda.
