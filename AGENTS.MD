# AGENTS.md — System Architecture & External Proxy Workflow

## Overview
Aplikasi web ini (`tal.3475.web.id`) adalah dashboard manajemen aliansi & state *Whiteout Survival* yang berjalan secara client-side dengan integrasi Supabase Backend dan Vercel Hosting.

## State Tracker — Dua jalur data

Menu State Tracker (`statetracker.js`) membutuhkan data dari API publik WoS Atlas yang dilindungi Cloudflare WAF + Turnstile.

### Jalur utama (saat ini dipakai)
1. Browser meminta token Cloudflare Turnstile (public site key).
2. Token dikirim ke **Supabase Edge Function** `wosatlas-states` (`index.ts`).
3. Edge Function melakukan `POST /api/v1/session` → mendapatkan cookie `ah_session` (hanya hidup di server).
4. Edge Function memanggil endpoint list/detail dan mengembalikan JSON ke client.

Dokumentasi setup: lihat `WOSATLAS_SESSION_SETUP_ID.md`.

### Jalur cadangan (ZenRows + Vercel Serverless)
Digunakan jika Turnstile site key **ditolak karena hostname** (site key WoS Atlas hanya mengizinkan `wosatlas.com`).

#### Flow Architecture
1. **Frontend (`statetracker.js`)** → memanggil endpoint `/api/tracker?url=...`
2. **Vercel Serverless Proxy (`api/tracker.js`)** → meneruskan request ke ZenRows memakai `ZENROWS_API_KEY`
3. **ZenRows** → headless browser (`js_render=true`, `antibot=true`, `premium_proxy=true`) menyelesaikan challenge dan mengambil data
4. Respon JSON dikembalikan ke browser (tanpa CORS / Turnstile block)

#### Folder structure (komponen proxy)
```text
├── api/
│   └── tracker.js       # Vercel Serverless Proxy Handler
├── statetracker.js      # Frontend Logic State Tracker
├── index.ts             # Supabase Edge Function (jalur utama)
├── AGENTS.md            # Dokumentasi teknis ini
└── index.html           # Main Entry Point
```

---

## Setup Jalur Cadangan (ZenRows + Vercel)

### 1. Environment Variable di Vercel
Di project Vercel (yang deploy domain `tal.3475.web.id` atau project proxy terpisah):

| Key | Value |
|-----|-------|
| `ZENROWS_API_KEY` | API key dari [zenrows.com](https://www.zenrows.com) |

### 2. File `api/tracker.js`
Sudah dibuat di repo. Handler menerima query `?url=` dan hanya mengizinkan host `wosatlas.com` / `api.wosatlas.com`.

### 3. Contoh pemanggilan dari frontend
```js
const PROXY_API_URL = '/api/tracker'; // relative → same origin Vercel

async function fetchViaZenRows(targetUrl) {
  const url = `${PROXY_API_URL}?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

// Contoh: list states
const data = await fetchViaZenRows('https://wosatlas.com/api/v1/servers?limit=50');
```

> **Catatan integrasi:** Saat ini `statetracker.js` masih memakai jalur Supabase Edge Function sebagai default (`preferProxy: true`). ZenRows proxy siap dipakai sebagai fallback manual atau dapat di-wire kemudian jika Turnstile domain restriction tetap menghalangi.

### 4. Deploy
1. Commit & push `api/tracker.js` + `AGENTS.md`.
2. Vercel auto-deploy.
3. Uji endpoint:
   ```
   https://<your-vercel-domain>/api/tracker?url=https%3A%2F%2Fwosatlas.com%2Fapi%2Fv1%2Fservers%3Flimit%3D10
   ```
   Harus mengembalikan JSON (bukan HTML challenge).

---

## Catatan penting

- **Biaya ZenRows**: setiap request memakai kredit (js_render + antibot + premium_proxy relatif mahal). Gunakan hanya sebagai fallback, bukan jalur utama.
- **Host whitelist**: `api/tracker.js` menolak host selain `wosatlas.com` / `api.wosatlas.com` untuk mencegah abuse.
- **Session cookie**: ZenRows menangani challenge di sisi mereka; cookie tidak perlu dikelola manual di client.
- **Supabase tetap jalur utama**: Edge Function + Turnstile browser token lebih murah dan lebih terkontrol selama site key mengizinkan hostname TAL.

## Status implementasi (2026-11-03)
- [x] Dokumentasi arsitektur (file ini)
- [x] `api/tracker.js` (Vercel Serverless + ZenRows)
- [x] Wire opsional di `statetracker.js` sebagai fallback ketiga (setelah direct & Supabase)
- [ ] Set `ZENROWS_API_KEY` di Vercel Environment Variables
- [ ] Uji live endpoint setelah deploy
