// ================= SITE I18N (EN / ID / 中文 / Filipino / Italiano / ไทย) =================
// Teks sumber di seluruh situs = bahasa Inggris. Kamus: English -> [Indonesia, 中文] (lihat i18n-dict-*.js).
// - Kalimat dinamis memakai penampung {0} {1} ..., mis. "ID {0} copied to clipboard!".
// - DOM (teks, placeholder, title, aria-label, alt) diterjemahkan otomatis, termasuk konten yang dirender belakangan
//   (MutationObserver), jadi toast, dialog, tabel, dan modal tidak perlu diubah satu per satu.
// - Kode JS yang menggambar ke canvas/SVG atau memakai prompt/confirm memanggil I18N.t('English').
// - Tambahkan data-no-i18n pada elemen yang tidak boleh diterjemahkan (mis. input pengguna).
(function () {
    'use strict';
    const SUPPORTED = ['en', 'id', 'zh', 'tl', 'it', 'th'];
    const KEY = 'site-language';
    const LOCALE = { en: 'en-US', id: 'id-ID', zh: 'zh-CN', tl: 'fil-PH', it: 'it-IT', th: 'th-TH' };
    const HTML_LANG = { en: 'en', id: 'id', zh: 'zh-CN', tl: 'fil', it: 'it', th: 'th' };
    const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE']);

    function detect() {
        try {
            const q = new URLSearchParams(location.search).get('lang');
            if (SUPPORTED.includes(q)) return q;
            const saved = localStorage.getItem(KEY) || localStorage.getItem('foundry-language');
            if (SUPPORTED.includes(saved)) return saved;
        } catch (e) { /* storage blocked */ }
        const nav = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
        return nav.startsWith('id') || nav.startsWith('in') ? 'id' : nav.startsWith('zh') ? 'zh' : nav.startsWith('fil') || nav.startsWith('tl') ? 'tl' : nav.startsWith('it') ? 'it' : nav.startsWith('th') ? 'th' : 'en';
    }

    let lang = detect();
    const exact = new Map();      // English (normalized) -> translations by language
    const patterns = [];          // { re, order[], tr, weight }
    const listeners = [];
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function register(en, id, zh, tl, it, th) {
        const tr = { id: id || null, zh: zh || null, tl: tl || null, it: it || null, th: th || null };
        const key = norm(en);
        if (/\{\d+\}/.test(key)) {
            const parts = key.split(/\{(\d+)\}/);          // [lit, idx, lit, idx, lit...]
            let src = '^', order = [], weight = 0;
            parts.forEach((p, i) => { if (i % 2 === 0) { src += esc(p); weight += p.length; } else { src += '([\\s\\S]+?)'; order.push(Number(p)); } });
            patterns.push({ re: new RegExp(src + '$'), order, tr, weight });
            patterns.sort((a, b) => b.weight - a.weight);
        } else {
            const prev = exact.get(key) || {};
            exact.set(key, Object.fromEntries(['id','zh','tl','it','th'].map(k => [k, tr[k] || prev[k] || null])));
        }
    }
    // Format baris: English || Indonesia || 中文 || Filipino || Italiano || ไทย. Kolom bahasa baru opsional.
    function addText(block) {
        String(block).split('\n').forEach(line => {
            if (!line.trim() || line.trim().startsWith('#')) return;
            const cols = line.split(' || ').map(s => s.trim());
            const [en, id, zh, tl, it, th] = cols;
            if (en) register(en, id, zh, tl, it, th);
        });
    }

    function fillPattern(tpl, caps, order, L) {
        return tpl.replace(/\{(\d+)\}/g, (_, n) => {
            const i = order.indexOf(Number(n));
            const v = i >= 0 ? caps[i] : '';
            return t(v, L);
        });
    }
    function lookup(core, L) {
        const hit = exact.get(core);
        if (hit && hit[L]) return hit[L];
        for (const p of patterns) {
            const tpl = p.tr[L]; if (!tpl) continue;
            const m = core.match(p.re);
            if (m) return fillPattern(tpl, m.slice(1), p.order, L);
        }
        return null;
    }
    // Terjemahkan satu string Inggris. Bila tidak ada padanan, string dikembalikan apa adanya.
    function t(str, L) {
        L = L || lang;
        if (str == null || L === 'en') return str;
        const s = String(str);
        const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
        const core = norm(m[2]);
        if (!core) return s;
        let out = lookup(core, L);
        if (out == null) {
            // Lepas simbol/emoji di awal, mis. "⚡ Auto-fill" atau "+ Add Player".
            const lead = core.match(/^([^\p{L}\p{N}]+)([\s\S]+)$/u);
            if (lead) { const r = lookup(norm(lead[2]), L); if (r != null) out = lead[1] + r; }
        }
        if (out == null) {
            // Titik dua di akhir: "Alliance:" -> "联盟：".
            const colon = core.match(/^([\s\S]+?)\s*:$/);
            if (colon) { const r = lookup(norm(colon[1]), L); if (r != null) out = r + (L === 'zh' ? '：' : ':'); }
        }
        return out == null ? s : m[1] + out + m[3];
    }

    // ---------- DOM ----------
    const TEXT_SRC = new WeakMap();     // Text node -> { src, last }
    const ATTR_SRC = new WeakMap();     // Element -> { attr: { src, last } }
    let writing = false;

    function skipped(el) {
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            if (SKIP_TAGS.has(e.tagName) || e.hasAttribute('data-no-i18n') || e.isContentEditable) return true;
        }
        return false;
    }
    function doText(n) {
        if (!n.parentElement || skipped(n.parentElement)) return;
        const cur = n.nodeValue; let rec = TEXT_SRC.get(n);
        const src = rec && rec.last === cur ? rec.src : cur;
        const out = lang === 'en' ? src : t(src);
        if (out !== cur) n.nodeValue = out;
        TEXT_SRC.set(n, { src, last: out });
    }
    function doAttrs(el) {
        if (el.nodeType !== 1 || skipped(el)) return;
        let rec = ATTR_SRC.get(el);
        ATTRS.forEach(a => {
            const cur = el.getAttribute(a); if (cur == null) return;
            const r = rec && rec[a];
            const src = r && r.last === cur ? r.src : cur;
            const out = lang === 'en' ? src : t(src);
            if (out !== cur) el.setAttribute(a, out);
            if (!rec) { rec = {}; ATTR_SRC.set(el, rec); }
            rec[a] = { src, last: out };
        });
    }
    function apply(root) {
        root = root || document.body; if (!root) return;
        writing = true;
        try {
            if (root.nodeType === 3) doText(root);
            else if (root.nodeType === 1 || root.nodeType === 11) {
                if (root.nodeType === 1) doAttrs(root);
                const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
                    acceptNode: n => n.nodeType === 1 && (SKIP_TAGS.has(n.tagName) || n.hasAttribute('data-no-i18n')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
                });
                while (w.nextNode()) { const n = w.currentNode; if (n.nodeType === 3) doText(n); else doAttrs(n); }
            }
        } finally { writing = false; }
    }
    let docTitleSrc = null, metaSrc = null;
    function applyHead() {
        if (docTitleSrc == null) docTitleSrc = document.title;
        document.title = lang === 'en' ? docTitleSrc : t(docTitleSrc);
        const meta = document.querySelector('meta[name="description"]');
        if (meta) { if (metaSrc == null) metaSrc = meta.getAttribute('content'); meta.setAttribute('content', lang === 'en' ? metaSrc : t(metaSrc)); }
    }

    // Mutasi DOM dikumpulkan lalu diproses sekali per frame.
    let pending = new Set(), scheduled = false;
    function flush() {
        scheduled = false; const nodes = [...pending]; pending.clear();
        nodes.forEach(n => { if (n.isConnected !== false) apply(n); });
    }
    function observe() {
        if (!document.body || observe.done) return; observe.done = true;
        new MutationObserver(muts => {
            if (writing) return;
            muts.forEach(m => {
                if (m.type === 'childList') m.addedNodes.forEach(n => pending.add(n));
                else if (m.type === 'characterData') pending.add(m.target);
                else if (m.type === 'attributes') pending.add(m.target);
            });
            if (pending.size && !scheduled) { scheduled = true; (window.requestAnimationFrame || setTimeout)(flush); }
        }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }

    function syncSwitcher() {
        document.querySelectorAll('[data-lang-btn]').forEach(b => {
            const on = b.getAttribute('data-lang-btn') === lang;
            b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
        });
        const code = document.getElementById('language-current-code');
        const flag = document.getElementById('language-current-flag');
        if (code) code.textContent = ({en:'ENG', id:'ID', zh:'CN', tl:'PH', it:'IT', th:'TH'})[lang] || 'ENG';
        if (flag) flag.textContent = ({en:'🇺🇸', id:'🇮🇩', zh:'🇨🇳', tl:'🇵🇭', it:'🇮🇹', th:'🇹🇭'})[lang] || '🇺🇸';
    }
    function setLang(next, opts) {
        if (!SUPPORTED.includes(next)) return;
        lang = next;
        try { localStorage.setItem(KEY, lang); localStorage.setItem('foundry-language', lang === 'zh' ? 'en' : lang); } catch (e) { /* ignore */ }
        document.documentElement.lang = HTML_LANG[lang];
        applyHead(); apply(document.body); syncSwitcher();
        if (!opts || !opts.silent) listeners.slice().forEach(fn => { try { fn(lang); } catch (e) { console.warn('i18n listener failed', e); } });
    }
    function init() {
        document.documentElement.lang = HTML_LANG[lang];
        document.querySelectorAll('[data-lang-btn]').forEach(b => b.addEventListener('click', () => {
            setLang(b.getAttribute('data-lang-btn'));
            const wrap = document.getElementById('site-language-switcher');
            const trigger = document.getElementById('language-current');
            if (wrap) wrap.classList.remove('open');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }));
        const langWrap = document.getElementById('site-language-switcher');
        const langTrigger = document.getElementById('language-current');
        if (langWrap && langTrigger) {
            langTrigger.addEventListener('click', () => {
                const open = langWrap.classList.toggle('open');
                langTrigger.setAttribute('aria-expanded', String(open));
            });
            document.addEventListener('click', e => {
                if (!langWrap.contains(e.target)) { langWrap.classList.remove('open'); langTrigger.setAttribute('aria-expanded', 'false'); }
            });
            document.addEventListener('keydown', e => { if (e.key === 'Escape') { langWrap.classList.remove('open'); langTrigger.setAttribute('aria-expanded', 'false'); } });
        }
        applyHead(); apply(document.body); observe(); syncSwitcher();
        listeners.slice().forEach(fn => { try { fn(lang); } catch (e) { /* ignore */ } });
    }
    // Skrip defer berjalan sebelum DOMContentLoaded, jadi semua kamus sudah terdaftar saat init dipanggil.
    if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);

    window.I18N = {
        SUPPORTED, LOCALE,
        get lang() { return lang; },
        get locale() { return LOCALE[lang]; },
        add: (map) => Object.entries(map).forEach(([en, v]) => register(en, v[0], v[1])),
        addText, t, apply, setLang,
        onChange: fn => { listeners.push(fn); },
        // Pilih teks sesuai bahasa: pick({ en, id, zh }); zh/id jatuh ke terjemahan kamus dari en.
        pick: o => (o[lang] != null ? o[lang] : t(o.en, lang) || o.en)
    };
    window.T = window.T || ((s) => t(s));
})();
