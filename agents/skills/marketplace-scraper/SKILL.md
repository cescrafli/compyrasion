# Skill: Marketplace Scraper Optimization

Skill ini memberikan instruksi mendalam untuk memodifikasi `scraper-engine.ts`.

## Aturan Anti-Bot:
- Gunakan **User-Agent Rotation** pada setiap request.
- Terapkan **Random Delay** (1-4 detik) jika melakukan scraping massal.
- Gunakan library `cheerio` untuk parsing HTML statis demi kecepatan.

## Penanganan Error:
- Jika elemen harga tidak ditemukan, jangan biarkan aplikasi crash. Kembalikan `null` dan berikan log peringatan.
- Jika marketplace mengembalikan halaman CAPTCHA, segera stop proses dan laporkan.