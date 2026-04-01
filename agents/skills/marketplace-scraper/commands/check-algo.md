---
description: Menjalankan stress test dan tes algoritma perbandingan harga
---

# /check-algo

1. Jalankan perintah: `npx ts-node test_algo.ts`
2. Baca file: `algo_out.txt`
3. Berikan ringkasan:
   - Berapa banyak produk yang berhasil diproses?
   - Apakah ada anomali harga (harga 0 atau terlalu mahal)?
   - Berikan rekomendasi jika ada fungsi di `ml-engine.ts` yang melambat.