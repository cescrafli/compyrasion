# Price Intelligence Dashboard: Technical Scope & Prompt Guide

Dokumen ini berisi cakupan teknis (scope) untuk tim pengembang Anda dan prompt yang dapat Anda gunakan untuk pengembangan AI lebih lanjut.

## 1. Lingkup Teknis (Scope) untuk Tim
Tim pengembang perlu memahami komponen utama yang baru saja diimplementasikan:

### Backend Architecture (`route.ts`):
- **AI Categorization Engine**: Fungsi `detectCategoryAndSpecs` yang menggunakan pattern matching untuk mengelompokkan produk ke dalam kategori (Tech, Fashion, Beauty, General).
- **Predictive Analytics Model**: Algoritma `predictPriceTrend` yang menganalisis korelasi antara volume stok (`totalValidItems`) dan posisi harga rata-rata dalam rentang pasar untuk memprediksi pergerakan harga.
- **Dynamic Summarization**: Generator teks `generateSmartSummary` yang merangkum data teknis menjadi saran belanja yang mudah dipahami manusia.

### Frontend UI Components (`page.tsx`):
- **AI Assistant Widget**: Card khusus dengan efek Glassmorphism dan Sparkles icon untuk menampilkan insight AI.
- **Trend Visualizers**: Indikator visual (Arrow Up/Down/Minus) yang terintegrasi dengan data real-time.
- **Conditional Spec Checklists**: Komponen toggle yang memberikan panduan pengecekan spesifik berdasarkan kategori produk yang terdeteksi.

---

## 2. Prompt untuk Pengguna (User Prompt)
Gunakan prompt di bawah ini untuk meminta saya (atau AI lain) melakukan penyempurnaan di masa mendatang:

### Prompt A: Menambahkan Kategori Baru
> "Saya ingin memperluas kemampuan deteksi kategori di `route.ts`. Tambahkan kategori 'Home & Living' (keyword: meja, kursi, lampu, dekorasi) dan 'Automotive' (keyword: ban, oli, helm, sparepart). Pastikan setiap kategori memiliki `specs_to_check` yang relevan dan perbarui logika `generateSmartSummary` agar mendukung kategori baru ini."

### Prompt B: Memperdalam Logika Prediksi Harga
> "Tingkatkan akurasi `predictPriceTrend`. Selain stok dan rentang harga, tambahkan variabel baru `average_rating` dari data produk. Jika rating rata-rata rendah (< 4.2) namun harga tinggi, prioritaskan status 'Turun' karena kemungkinan barang tersebut tidak laku. Berikan bobot confidence lebih tinggi jika data berasal dari lebih dari 5 marketplace."

### Prompt C: UI Enhancement untuk AI Card
> "Buat AI Smart Assistant Widget lebih interaktif. Tambahkan animasi 'typing effect' saat menampilkan `smart_summary` dan ubah gradien border agar berubah warna secara dinamis: Hijau jika tren 'Turun', Merah jika tren 'Naik', dan Indigo jika 'Stabil'."
