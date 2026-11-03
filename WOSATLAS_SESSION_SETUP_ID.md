# Setup State Tracker WoS Atlas Session (Eksperimental)

## Perubahan
- State Tracker meminta Cloudflare Turnstile token dari browser.
- Token dikirim ke Supabase Edge Function `wosatlas-states`.
- Edge Function melakukan `POST https://wosatlas.com/api/v1/session`.
- Cookie `ah_session` hanya digunakan di dalam Edge Function dan tidak dikirim kembali ke browser.
- Edge Function membaca `items` dan mengikuti cursor `next` apa adanya sampai `next: null`.
- Jika salah satu halaman gagal, proses gagal seluruhnya; data parsial tidak ditampilkan sebagai daftar lengkap.
- Seluruh hasil dikembalikan dalam satu respons, lalu paging tampilan dilakukan secara lokal.

## Konfigurasi yang masih diperlukan
Buka `statetracker.js`, cari bagian `const CFG`, lalu isi:

```js
turnstileSiteKey: '0x4AAAAAAFW8LSGKEAA0tRT3',
```

Nilai ini adalah public site key (bukan token atau cookie). Site key WoS Atlas yang ditemukan pada `https://wosatlas.com/assets/index-BZmj00uS.js` adalah `0x4AAAAAAFW8LSGKEAA0tRT3`.

**Catatan domain:** Cloudflare Turnstile dapat membatasi site key berdasarkan hostname. Jika site key WoS Atlas hanya mengizinkan `wosatlas.com`, challenge dari domain TAL akan ditolak. Dalam kasus itu, WoS Atlas perlu mengizinkan hostname TAL atau menyediakan mekanisme integrasi server-to-server resmi. Kode akan menampilkan error; tidak akan membuat cursor palsu atau menganggap 20 State sebagai data lengkap.

## Deploy Supabase
Deploy file `index.ts` yang ada di ZIP sebagai Edge Function `wosatlas-states`:

```bash
supabase functions deploy wosatlas-states
```

Tidak perlu menambahkan `ah_session`, cookie, atau token pribadi ke Supabase Secrets.

## Pengujian yang diharapkan
Jika Turnstile site key diizinkan dan session berhasil dibuat:
- `POST /api/v1/session` berhasil.
- `GET /api/v1/servers?limit=200` menghasilkan `items` dan `next`.
- Pagination mengikuti cursor `next` sampai `null`.
- Hasil pengujian sebelumnya adalah 21 halaman dan 4.049 State. Jumlah dapat berubah mengikuti data WoS Atlas.
