# AGENTS.md — System Architecture & External Proxy Workflow

## Overview
Aplikasi web ini (`tal.3475.web.id`) adalah dashboard manajemen aliansi & state *Whiteout Survival*.

Ada **dua repositori terpisah**:

| Repo | Peran | Hosting |
|------|--------|---------|
| [`ferdinanflash/tal`](https://github.com/ferdinanflash/tal) | Frontend (HTML/JS/CSS) | GitHub Pages → `tal.3475.web.id` |
| [`ferdinanflash/tal-vercel-proxy`](https://github.com/ferdinanflash/tal-vercel-proxy) | API proxy (serverless) | Vercel → `tal-vercel-proxy.vercel.app` |

**Jangan taruh folder `api/` di repo `tal`.** File serverless hanya di repo `tal-vercel-proxy`.

---

## State Tracker — Jalur data

### Jalur utama (Supabase Edge Function)
1. Browser minta token Cloudflare Turnstile.
2. Token dikirim ke Supabase Edge Function `wosatlas-states` (`index.ts` di repo `tal`).
3. Edge Function `POST /api/v1/session` → cookie `ah_session` (hanya di server).
4. Edge Function ambil list/detail lengkap → JSON ke client.

Lihat juga: `WOSATLAS_SESSION_SETUP_ID.md`.

### Jalur cadangan A — CORS proxy sederhana (sudah ada)
File: `tal-vercel-proxy` → `api/[...path].js`

- Meneruskan `GET /api/servers?...` → `https://wosatlas.com/api/v1/servers?...`
- Hanya menambah CORS + cache. **Tidak** menyelesaikan Turnstile/session.
- Contoh: `https://tal-vercel-proxy.vercel.app/api/servers?limit=50`

### Jalur cadangan B — ZenRows (anti-bot)
File: `tal-vercel-proxy` → `api/tracker.js` (**file yang perlu ditambahkan**)

- Dipakai jika Turnstile site key ditolak karena hostname TAL.
- Env: `ZENROWS_API_KEY` di project Vercel `tal-vercel-proxy`.
- Endpoint: `https://tal-vercel-proxy.vercel.app/api/tracker?url=...`
- Frontend (`statetracker.js`) sudah di-wire sebagai fallback ketiga.

---

## Ke mana file ditaruh

### Repo `tal-vercel-proxy` (Vercel)
```text
tal-vercel-proxy/
├── api/
│   ├── [...path].js    # sudah ada (CORS proxy)
│   └── tracker.js      # TAMBAHKAN INI (ZenRows)
├── package.json
└── README.md
```

### Repo `tal` (frontend / GitHub Pages)
```text
tal/
├── statetracker.js     # update CFG.zenrowsProxyUrl + fallback logic
├── index.html          # cache-bust ?v=
├── AGENTS.MD           # dokumentasi ini
├── index.ts            # Supabase Edge Function source
└── ... (file frontend lain)
```

**Tidak ada folder `api/` di repo `tal`.**

---

## Setup ZenRows di Vercel

1. Clone / buka repo `tal-vercel-proxy`.
2. Salin `api/tracker.js` ke folder `api/`.
3. Di Vercel project (yang connect ke `tal-vercel-proxy`):
   - Settings → Environment Variables
   - Key: `ZENROWS_API_KEY`
   - Value: API key dari [zenrows.com](https://www.zenrows.com)
4. Commit & push → Vercel auto-deploy.
5. Uji:
   ```
   https://tal-vercel-proxy.vercel.app/api/tracker?url=https%3A%2F%2Fwosatlas.com%2Fapi%2Fv1%2Fservers%3Flimit%3D10
   ```

## Setup frontend (repo `tal`)

Di `statetracker.js` sudah diset:

```js
zenrowsProxyUrl: 'https://tal-vercel-proxy.vercel.app/api/tracker',
zenrowsEnabled: true,
```

Commit & push repo `tal` agar GitHub Pages ter-update.

---

## Catatan

- ZenRows mahal per request (js_render + antibot + premium_proxy). Hanya fallback.
- List lengkap (~4000 state) tetap butuh jalur Supabase + session.
- Proxy CORS biasa (`[...path].js`) cukup untuk beberapa endpoint publik, tapi tidak untuk full pagination ber-session.

## Status (2026-11-03)
- [x] Dokumentasi dua-repo
- [x] `api/tracker.js` (siap ditaruh di `tal-vercel-proxy`)
- [x] Wire fallback di `statetracker.js` (URL absolut ke Vercel)
- [ ] Push `tracker.js` ke repo `tal-vercel-proxy`
- [ ] Set `ZENROWS_API_KEY` di Vercel
- [ ] Push update frontend ke repo `tal`
- [ ] Uji live `/api/tracker`
