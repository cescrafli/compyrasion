# Security Guardrails

Dilarang keras melakukan hal berikut:
1. **No Hardcoded Keys**: Jangan pernah menuliskan API Key Anthropic, OpenAI, atau Google langsung di kode. Gunakan `process.env`.
2. **No .env Exposure**: Jangan pernah membacakan isi file `.env` ke dalam chat atau menyertakannya dalam pesan error.
3. **Secret Masking**: Jika mencetak log, pastikan bagian sensitif (token/auth) disensor dengan `***`.
4. **Scraper Ethics**: Jangan melakukan scraping pada data user pribadi, hanya data publik (nama produk & harga).