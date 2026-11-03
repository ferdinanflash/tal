# AGENTS.md — System Architecture & External Proxy Workflow

## Overview
Aplikasi web ini (`tal.3475.web.id`) adalah dashboard manajemen aliansi & state *Whiteout Survival* yang berjalan secara client-side dengan integrasi Supabase Backend dan Vercel Hosting.

## State Tracker & Anti-Bot Bypass Architecture
Menu State Tracker (`statetracker.js`) memerlukan data dari API publik target yang dilindungi oleh Cloudflare WAF dan Turnstile Challenge.

### Flow Architecture:
1. **Frontend (`statetracker.js`)** -> Memanggil endpoint internal `/api/tracker`.
2. **Vercel Serverless Proxy (`/api/tracker.js`)** -> Meneruskan request ke API ZenRows menggunakan `ZENROWS_API_KEY` dari Environment Variable.
3. **ZenRows API** -> Menjalankan Headless Browser (`js_render=true`, `antibot=true`), menyelesaikan Turnstile challenge, dan mengambil JSON data lengkap.
4. **Respon Client** -> Respon diteruskan kembali ke browser pengguna tanpa terhalang CORS maupun Cloudflare Block.

## Folder Structure (Proxy Component):
```text
├── api/
│   └── tracker.js       # Vercel Serverless Proxy Handler
├── statetracker.js      # Frontend Logic State Tracker
├── AGENTS.md            # Dokumentasi Teknis Agent
└── index.html           # Main Entry Point
Berikut adalah struktur file AGENTS.md dan panduan lengkap langkah demi langkah untuk menyelesaikan setup proxy ZenRows melalui Vercel Serverless Function.
1. File AGENTS.md
Buat file baru bernama AGENTS.md di root folder proyek kamu (sejajar dengan index.html dan statetracker.js). File ini berfungsi sebagai dokumentasi teknis dan instruksi untuk AI agent/pengembang lain yang mengelola repositori ini.
# AGENTS.md — System Architecture & External Proxy Workflow

## Overview
Aplikasi web ini (`jtal.3475.web.id`) adalah dashboard manajemen aliansi & state *Whiteout Survival* yang berjalan secara client-side dengan integrasi Supabase Backend dan Vercel Hosting.

## State Tracker & Anti-Bot Bypass Architecture
Menu State Tracker (`statetracker.js`) memerlukan data dari API publik target yang dilindungi oleh Cloudflare WAF dan Turnstile Challenge.

### Flow Architecture:
1. **Frontend (`statetracker.js`)** -> Memanggil endpoint internal `/api/tracker`.
2. **Vercel Serverless Proxy (`/api/tracker.js`)** -> Meneruskan request ke API ZenRows menggunakan `ZENROWS_API_KEY` dari Environment Variable.
3. **ZenRows API** -> Menjalankan Headless Browser (`js_render=true`, `antibot=true`), menyelesaikan Turnstile challenge, dan mengambil JSON data lengkap.
4. **Respon Client** -> Respon diteruskan kembali ke browser pengguna tanpa terhalang CORS maupun Cloudflare Block.

## Folder Structure (Proxy Component):
```text
├── api/
│   └── tracker.js       # Vercel Serverless Proxy Handler
├── statetracker.js      # Frontend Logic State Tracker
├── AGENTS.md            # Dokumentasi Teknis Agent
└── index.html           # Main Entry Point

Environment Variables Required
 * ZENROWS_API_KEY: API Key dari ZenRows Dashboard (Dikonfigurasi di Vercel Dashboard).
Active Proxy Endpoint
 * Production Proxy Base: https://tal-vercel-proxy.vercel.app/api/tracker

---

## 2. Panduan Eksekusi (Lanjutan dari Setup Vercel Env)

Karena kamu sudah selesai memasukkan `ZENROWS_API_KEY` di Environment Variables Vercel, berikut langkah penyelesaian hingga menu State Tracker berjalan lancar:

### Langkah A: Buat File Serverless Function (`api/tracker.js`)

Di repositori proyek lokal kamu, buat folder `api` (jika belum ada) dan isi dengan file `tracker.js`:

```javascript
// api/tracker.js
export default async function handler(req, res) {
  // Set Header CORS agar domain jtal.3475.web.id dapat mengaksesnya
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.ZENROWS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ZENROWS_API_KEY belum dikonfigurasi di Environment Variables Vercel.' });
  }

  // Masukkan URL API target State Tracker di sini (atau teruskan via query parameter)
  const targetUrl = req.query.url || 'https://api-target-statetracker.com/states';

  try {
    const zenrowsUrl = new URL('https://api.zenrows.com/v1/');
    zenrowsUrl.searchParams.append('apikey', apiKey);
    zenrowsUrl.searchParams.append('url', targetUrl);
    zenrowsUrl.searchParams.append('js_render', 'true');
    zenrowsUrl.searchParams.append('antibot', 'true');
    zenrowsUrl.searchParams.append('premium_proxy', 'true');

    const response = await fetch(zenrowsUrl.toString());

    if (!response.ok) {
      throw new Error(`ZenRows HTTP Status Error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Gagal mengambil data via ZenRows Proxy', 
      details: error.message 
    });
  }
}

Langkah B: Hubungkan Pemanggilan di statetracker.js
Buka file statetracker.js dan perbarui fungsi pemanggilan API ke proxy Vercel kamu ([https://tal-vercel-proxy.vercel.app/api/tracker](https://tal-vercel-proxy.vercel.app/api/tracker)):
// Di dalam statetracker.js

const PROXY_API_URL = 'https://tal-vercel-proxy.vercel.app/api/tracker';

async function fetchStateTrackerData() {
  try {
    // Panggil proxy Vercel milikmu sendiri
    const response = await fetch(PROXY_API_URL);

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();
    
    // Render data ke UI/Tabel State Tracker
    console.log('Data State berhasil dimuat:', data);
    renderStateTrackerTable(data);

  } catch (err) {
    console.error('Gagal memuat State Tracker:', err);
  }
}

Langkah C: Push ke GitHub & Redeploy Vercel
 * Commit & Push file AGENTS.md, api/tracker.js, dan statetracker.js ke repositori GitHub kamu.
 * Vercel akan secara otomatis melakukan Build & Deploy.
 * Setelah deploy selesai, buka endpoint [https://tal-vercel-proxy.vercel.app/api/tracker](https://tal-vercel-proxy.vercel.app/api/tracker) di browser untuk memastikan JSON data berhasil ditarik melalui ZenRows tanpa error Turnstile.
