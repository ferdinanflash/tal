# AGENTS.md — System Architecture & External Proxy Workflow

## Overview
Aplikasi web ini (`tal.3475.web.id`) adalah dashboard manajemen aliansi & state *Whiteout Survival*.

| Repo | Peran | Hosting |
|------|--------|---------|
| [`ferdinanflash/tal`](https://github.com/ferdinanflash/tal) | Frontend | GitHub Pages → `tal.3475.web.id` |
| [`ferdinanflash/tal-vercel-proxy`](https://github.com/ferdinanflash/tal-vercel-proxy) | API proxy | Vercel → `tal-vercel-proxy.vercel.app` |

**Folder `api/` hanya di repo `tal-vercel-proxy`.** Jangan taruh di repo `tal`.

---

## State Tracker — ZenRows sebagai jalur UTAMA

Urutan pemanggilan data list:

1. **ZenRows (utama)** — `https://tal-vercel-proxy.vercel.app/api/tracker?all=1`
   - Vercel function memanggil ZenRows (`js_render` + `antibot` + `premium_proxy`)
   - Berjalan cursor `next` sampai selesai (max 30 halaman)
   - 1 kredit ZenRows per halaman
2. **Supabase + Turnstile (fallback)** — hanya jika ZenRows gagal

Detail State: zenrows → direct → Supabase.

### Konfigurasi frontend (`statetracker.js`)
```js
zenrowsProxyUrl: 'https://tal-vercel-proxy.vercel.app/api/tracker',
zenrowsEnabled: true,
zenrowsPrimary: true,    // ZenRows dulu
zenrowsAllStates: true,  // ?all=1 full list
```

### File di repo `tal-vercel-proxy`
```text
api/
├── [...path].js   # CORS proxy sederhana (sudah ada)
└── tracker.js     # ZenRows — jalur utama State Tracker
```

Env Vercel:
| Key | Value |
|-----|-------|
| `ZENROWS_API_KEY` | API key dari zenrows.com |

### Endpoint uji
```
# satu halaman
https://tal-vercel-proxy.vercel.app/api/tracker?url=https%3A%2F%2Fwosatlas.com%2Fapi%2Fv1%2Fservers%3Flimit%3D10

# full list (mahal)
https://tal-vercel-proxy.vercel.app/api/tracker?all=1&maxPages=30
```

---

## Catatan biaya
- `all=1` ≈ 20–25 request ZenRows per load penuh (~4000 state).
- Cache frontend 5 menit (`cacheMs`) mengurangi frekuensi.
- Matikan full list: `zenrowsAllStates: false` (hanya 1 halaman).

## Status
- [x] ZenRows sebagai jalur utama
- [x] `api/tracker.js` mendukung `?all=1`
- [x] Frontend `zenrowsPrimary` + `zenrowsAllStates`
- [ ] Push `tracker.js` ke `tal-vercel-proxy` + set `ZENROWS_API_KEY`
- [ ] Push frontend ke `tal`
- [ ] Uji live
