# Deploy ke repo ferdinanflash/tal

File yang berubah untuk fitur ZenRows fallback:
- statetracker.js  (CFG.zenrowsProxyUrl + fallback logic)
- index.html       (cache-bust ?v=24)
- AGENTS.MD        (dokumentasi dua-repo)

Push ke GitHub Pages:
```bash
git add statetracker.js index.html AGENTS.MD
git commit -m "feat(state-tracker): ZenRows fallback via tal-vercel-proxy"
git push origin main
```

Pastikan api/tracker.js sudah di-deploy di repo tal-vercel-proxy + ZENROWS_API_KEY diset di Vercel.
