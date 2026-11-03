// ================= STATE TRACKER (navbar button + own modal) =================
// Lists every Whiteout Survival State with live numbers: chiefs, alliances,
// total/median/max power and the top alliance of each State.
//
// Data flow
//   1. The browser calls the JSON endpoints directly.
//   2. If that is blocked (CORS / network), it falls back to a Supabase edge
//      function (index.ts → supabase/functions/wosatlas-states/), which
//      fetches the same endpoints server-side. Deploy it once to enable
//      the fallback; the feature works without it whenever the direct call works.
//
// List: GET /v1/states/summary (50 States per request, sorted by chiefs).
// Detail (per State click): /v1/states/{kid}, /v1/kingdoms/{kid}/power,
//   /v1/alliances/leaderboard?kid={kid} — or proxy action "detail" in one call.
// The modal loads the first summary page when opened and only pulls the rest
// when needed (search, other sort, Show more), a few requests at a time.
(function () {
    'use strict';

    const CFG = {
        directUrl: 'https://wosatlas.com/api/v1/servers',
        apiBase: 'https://wosatlas.com/api/v1',
        proxyFunction: 'wosatlas-states',
        preferProxy: true,     // State list requires WoS Atlas session; use the Edge Function proxy
        // Public Cloudflare Turnstile site key from the WoS Atlas app pack.
        // Public site key extracted from the WoS Atlas app JavaScript.
        turnstileSiteKey: '0x4AAAAAAFW8LSGKEAA0tRT3',
        // ZenRows = jalur UTAMA State Tracker (repo tal-vercel-proxy).
        // https://tal-vercel-proxy.vercel.app/api/tracker
        // all=1 → proxy berjalan cursor sampai selesai (mahal; 1 kredit/page).
        zenrowsProxyUrl: 'https://tal-vercel-proxy.vercel.app/api/tracker',
        zenrowsEnabled: true,
        // false = Supabase+Turnstile dulu (list lengkap ~4000).
        // ZenRows/public API hanya ~20 state (next:null) — tidak cukup untuk search.
        zenrowsPrimary: false,
        zenrowsAllStates: true,
        pageSize: 50,          // size the endpoint is known to accept
        concurrency: 3,        // parallel page requests when loading all States
        cacheMs: 5 * 60 * 1000,
        detailCacheMs: 5 * 60 * 1000,
        myState: 3475,
        firstVisible: 50,
        visibleStep: 50,
        allianceLimit: 15,
        topPlayersLimit: 10
    };

    // ---- Translations (English || Indonesia || 中文 || Filipino || Italiano || ไทย) ----
    if (window.I18N && typeof I18N.addText === 'function') {
        I18N.addText(`
# State Tracker
State Tracker || Pelacak State || 州追踪 || State Tracker || Tracker degli State || ตัวติดตาม State
Compare every State in Whiteout Survival with live data. || Bandingkan setiap State di Whiteout Survival dengan data langsung. || 用实时数据对比《无尽冬日》中的所有州。 || Ihambing ang bawat State sa Whiteout Survival gamit ang live data. || Confronta ogni State di Whiteout Survival con i dati in tempo reale. || เปรียบเทียบทุก State ใน Whiteout Survival ด้วยข้อมูลสด
Search State ID, alliance tag or name || Cari ID State, tag atau nama aliansi || 搜索州编号、联盟标签或名称 || Maghanap ng State ID, tag o pangalan ng alyansa || Cerca ID State, tag o nome alleanza || ค้นหา State ID แท็ก หรือชื่อพันธมิตร
My State || State Saya || 我的州 || Aking State || Il mio State || State ของฉัน
Sort by || Urutkan berdasarkan || 排序方式 || Ayusin ayon sa || Ordina per || เรียงตาม
High to low || Tinggi ke rendah || 从高到低 || Mataas hanggang mababa || Dal più alto al più basso || มากไปน้อย
Low to high || Rendah ke tinggi || 从低到高 || Mababa hanggang mataas || Dal più basso al più alto || น้อยไปมาก
Chiefs || Chief || 首领 || Chiefs || Chief || Chiefs
Alliances || Aliansi || 联盟 || Mga Alyansa || Alleanze || พันธมิตร
Median || Median || 中位数 || Median || Mediana || มัธยฐาน
Max || Maks || 最高 || Max || Max || สูงสุด
Median Power || Median Kekuatan || 战力中位数 || Median Power || Potenza mediana || พลังมัธยฐาน
Max Power || Kekuatan Tertinggi || 最高战力 || Max Power || Potenza massima || พลังสูงสุด
State ID || ID State || 州编号 || State ID || ID State || State ID
State || State || 州 || State || State || State
Top Alliance || Aliansi Teratas || 顶级联盟 || Nangungunang Alyansa || Alleanza top || พันธมิตรอันดับ 1
Loading States... || Memuat State... || 正在加载州数据... || Nilo-load ang mga State... || Caricamento degli State... || กำลังโหลด State...
Showing {0} of {1} States || Menampilkan {0} dari {1} State || 显示 {0} / {1} 个州 || Ipinapakita ang {0} sa {1} State || Mostrati {0} di {1} State || แสดง {0} จาก {1} State
Loading all States... {0} / {1} || Memuat semua State... {0} / {1} || 正在加载全部州... {0} / {1} || Nilo-load ang lahat ng State... {0} / {1} || Caricamento di tutti gli State... {0} / {1} || กำลังโหลด State ทั้งหมด... {0} / {1}
Player ID || Player ID || 玩家 ID || Player ID || ID Giocatore || Player ID
Open player || Buka Player || 打开玩家 || Buksan ang Player || Apri giocatore || เปิดผู้เล่น
Enter a valid Player ID || Masukkan Player ID yang valid || 请输入有效的玩家 ID || Maglagay ng valid na Player ID || Inserisci un ID Giocatore valido || กรุณากรอก Player ID ที่ถูกต้อง
Searching... || Mencari... || 搜索中... || Naghahanap... || Ricerca in corso... || กำลังค้นหา...
Player not found || Player tidak ditemukan || 未找到玩家 || Hindi natagpuan ang player || Giocatore non trovato || ไม่พบผู้เล่น
Search results || Hasil pencarian || 搜索结果 || Resulta ng paghahanap || Risultati della ricerca || ผลการค้นหา
Updated {0} || Diperbarui {0} || 更新于 {0} || Na-update {0} || Aggiornato {0} || อัปเดต {0}
No State matches your search. || Tidak ada State yang cocok dengan pencarian Anda. || 没有符合搜索的州。 || Walang State na tumutugma sa iyong paghahanap. || Nessuno State corrisponde alla ricerca. || ไม่พบ State ที่ตรงกับการค้นหา
Search all States || Cari di semua State || 搜索全部州 || Hanapin sa lahat ng State || Cerca in tutti gli State || ค้นหาในทุก State
Show more || Tampilkan lebih banyak || 显示更多 || Magpakita pa || Mostra altri || แสดงเพิ่มเติม
Could not load State data. Check your connection and try again. || Gagal memuat data State. Periksa koneksi Anda lalu coba lagi. || 无法加载州数据。请检查网络后重试。 || Hindi ma-load ang data ng State. Suriin ang koneksyon at subukan muli. || Impossibile caricare i dati degli State. Controlla la connessione e riprova. || โหลดข้อมูล State ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง
Back to list || Kembali ke daftar || 返回列表 || Bumalik sa listahan || Torna all'elenco || กลับไปที่รายการ
State {0} || State {0} || 第{0}州 || State {0} || State {0} || State {0}
Power per Chief || Kekuatan per Chief || 每位首领战力 || Lakas bawat Chief || Potenza per Chief || พลังต่อ Chief
Shielded || Berperisai || 护盾中 || May Shield || Con scudo || มีโล่
Recruiting Alliances || Aliansi yang Merekrut || 招募中的联盟 || Mga Alyansang Nagre-recruit || Alleanze che reclutano || พันธมิตรที่เปิดรับสมัคร
Members || Anggota || 成员 || Mga Miyembro || Membri || สมาชิก
Open recruitment || Rekrutmen terbuka || 公开招募 || Bukas na recruitment || Reclutamento aperto || เปิดรับสมัคร
Closed recruitment || Rekrutmen tertutup || 非公开招募 || Sarado ang recruitment || Reclutamento chiuso || ปิดรับสมัคร
Min. level || Level min. || 最低等级 || Min. na level || Livello min. || เลเวลขั้นต่ำ
Min. power || Kekuatan min. || 最低战力 || Min. na lakas || Potenza min. || พลังขั้นต่ำ
Compared with State {0} || Dibandingkan dengan State {0} || 与第{0}州对比 || Kumpara sa State {0} || Confronto con lo State {0} || เทียบกับ State {0}
Load all States || Muat semua State || 加载全部州 || I-load ang lahat ng State || Carica tutti gli State || โหลด State ทั้งหมด
Load all States to see rankings and compare with your State. || Muat semua State untuk melihat peringkat dan membandingkan dengan State Anda. || 加载全部州以查看排名并与你的州对比。 || I-load ang lahat ng State para makita ang ranking at maikumpara sa iyong State. || Carica tutti gli State per vedere le classifiche e confrontare con il tuo State. || โหลด State ทั้งหมดเพื่อดูอันดับและเปรียบเทียบกับ State ของคุณ
Click a State for details. || Klik State untuk melihat detail. || 点击州查看详情。 || I-click ang State para sa detalye. || Clicca su uno State per i dettagli. || คลิก State เพื่อดูรายละเอียด
Retry || Coba lagi || 重试 || Subukan muli || Riprova || ลองอีกครั้ง
Rank among States || Peringkat antar State || 州排名 || Ranggo sa mga State || Classifica tra gli State || อันดับใน State
Players || Pemain || 玩家 || Mga Manlalaro || Giocatori || ผู้เล่น
In-game figures || Angka in-game || 游戏内数据 || Mga in-game figure || Dati di gioco || ตัวเลขในเกม
Ranked players || Pemain ter-rank || 上榜玩家 || Mga ranked player || Giocatori in classifica || ผู้เล่นในอันดับ
King || Raja || 国王 || Hari || Re || กษัตริย์
Transfer gate || Gerbang transfer || 迁移门槛 || Transfer gate || Cancello trasferimento || ประตูโยกย้าย
Top Alliances || Aliansi Teratas || 顶级联盟 || Nangungunang Alyansa || Alleanze top || พันธมิตรอันดับต้น
Top Players || Pemain Teratas || 顶级玩家 || Nangungunang Manlalaro || Giocatori top || ผู้เล่นอันดับต้น
Rank || Peringkat || 排名 || Ranggo || Posizione || อันดับ
Alliance || Aliansi || 联盟 || Alyansa || Alleanza || พันธมิตร
Tag || Tag || 标签 || Tag || Tag || แท็ก
Name || Nama || 名称 || Pangalan || Nome || ชื่อ
Power || Kekuatan || 战力 || Power || Potenza || พลัง
Furnace || Furnace || 熔炉 || Furnace || Fornace || เตา
Loading detail... || Memuat detail... || 正在加载详情... || Nilo-load ang detalye... || Caricamento dettaglio... || กำลังโหลดรายละเอียด...
Could not load extra State detail. Showing summary only. || Gagal memuat detail State tambahan. Menampilkan ringkasan saja. || 无法加载额外州详情，仅显示摘要。 || Hindi ma-load ang karagdagang detalye ng State. Buod lang ang ipinapakita. || Impossibile caricare i dettagli extra. Solo riepilogo. || โหลดรายละเอียดเพิ่มเติมไม่ได้ แสดงเฉพาะสรุป
Back to State || Kembali ke State || 返回州 || Bumalik sa State || Torna allo State || กลับไปที่ State
Player || Pemain || 玩家 || Manlalaro || Giocatore || ผู้เล่น
Player ID || ID Pemain || 玩家 ID || Player ID || ID giocatore || รหัสผู้เล่น
Furnace level || Level Furnace || 熔炉等级 || Antas ng Furnace || Livello fornace || เลเวลเตา
Last jump || Jump terakhir || 最近跃迁 || Huling jump || Ultimo salto || จัมพ์ล่าสุด
Observed || Diamati || 观测于 || Naobserbahan || Osservato || สังเกตเมื่อ
Leader || Pemimpin || 领袖 || Pinuno || Leader || ผู้นำ
Alliance level || Level aliansi || 联盟等级 || Antas ng alyansa || Livello alleanza || เลเวลพันธมิตร
Language || Bahasa || 语言 || Wika || Lingua || ภาษา
Honor || Honor || 荣誉 || Honor || Onore || เกียรติยศ
Recruitment || Rekrutmen || 招募 || Recruitment || Reclutamento || การรับสมัคร
Loading alliance... || Memuat aliansi... || 正在加载联盟... || Nilo-load ang alyansa... || Caricamento alleanza... || กำลังโหลดพันธมิตร...
Loading player... || Memuat pemain... || 正在加载玩家... || Nilo-load ang manlalaro... || Caricamento giocatore... || กำลังโหลดผู้เล่น...
Could not load alliance detail. || Gagal memuat detail aliansi. || 无法加载联盟详情。 || Hindi ma-load ang detalye ng alyansa. || Impossibile caricare i dettagli dell'alleanza. || โหลดรายละเอียดพันธมิตรไม่ได้
Could not load player detail. || Gagal memuat detail pemain. || 无法加载玩家详情。 || Hindi ma-load ang detalye ng manlalaro. || Impossibile caricare i dettagli del giocatore. || โหลดรายละเอียดผู้เล่นไม่ได้
Member list unavailable || Daftar anggota tidak tersedia || 成员列表不可用 || Hindi available ang listahan ng miyembro || Elenco membri non disponibile || รายชื่อสมาชิกไม่พร้อม
`);
    }

    const SORT_KEYS = {
        chiefs: { label: 'Chiefs', defaultDesc: true },
        total: { label: 'Total Power', defaultDesc: true },
        median: { label: 'Median Power', defaultDesc: true },
        max: { label: 'Max Power', defaultDesc: true },
        alliances: { label: 'Alliances', defaultDesc: true },
        kid: { label: 'State ID', defaultDesc: false }
    };

    const S = {
        rows: new Map(),        // kid -> normalized row
        loadedOffsets: new Set(),
        total: 0,
        recordedAt: null,
        fetchedAt: 0,
        mode: CFG.preferProxy ? 'proxy' : null,   // 'direct' | 'proxy' once one of them worked
        sort: 'chiefs',
        desc: true,
        query: '',
        visible: CFG.firstVisible,
        token: 0,               // bumped on reset/close so stale responses are ignored
        ctrl: null,
        busy: false,            // any request in flight
        loadingAll: null,
        progress: null,         // { done, total } while loading all
        error: null,
        retry: null,
        view: 'list',           // 'list' | 'detail'
        detailMode: 'state',    // 'state' | 'alliance' | 'player'
        detailKid: null,
        detailAid: null,
        detailUid: null,
        listScroll: 0,
        // kid -> { fetchedAt, state, power, alliances, error, loading }
        detailCache: new Map(),
        // aid -> { fetchedAt, data, error, loading }
        allianceCache: new Map(),
        // uid -> { fetchedAt, data, error, loading }
        playerCache: new Map()
    };

    let trigger = null;
    let els = null;

    const nfCompact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
    const nfFull = new Intl.NumberFormat('en');
    const fmtCompact = (n) => (Number.isFinite(n) ? nfCompact.format(n) : '-');
    const fmtFull = (n) => (Number.isFinite(n) ? nfFull.format(n) : '-');

    function normalize(e) {
        const t = e && e.topAlliance;
        return {
            kid: Number(e.kid),
            chiefs: Number(e.chiefs) || 0,
            alliances: Number(e.alliances) || 0,
            recruiting: Number(e.recruitingAlliances) || 0,
            shielded: Number(e.shielded) || 0,
            gen: e.generation_ceiling == null ? null : Number(e.generation_ceiling),
            at: e.recorded_at || null,
            total: Number(e.total_power) || 0,
            median: Number(e.median_power) || 0,
            max: Number(e.max_power) || 0,
            top: t && t.abbr ? {
                abbr: String(t.abbr),
                name: String(t.name || ''),
                power: Number(t.totalPower) || 0,
                members: Number(t.members) || 0,
                memberMax: Number(t.memberMax) || 0,
                publicRecruit: !!t.publicRecruit,
                minLevel: Number(t.joinMinLevel) || 0,
                minPower: Number(t.joinMinPower) || 0
            } : null
        };
    }

    function validate(json) {
        if (!json || !Array.isArray(json.entries)) throw new Error('bad-response');
        return json;
    }

    // ---- Public wosatlas.com endpoints (called from the browser) ----
    // The site paginates with an opaque cursor: every page has `next` until the
    // last one. Server-side (edge function) requests may get a trimmed list, so
    // the browser asks directly first and the edge function is the fallback.
    const SITE = { list: null, listAt: 0, allStatesPayload: null };

    // WoS Atlas mints its HttpOnly ah_session cookie only after a Turnstile
    // token is submitted to /api/v1/session. The token is passed to Supabase;
    // the cookie itself never leaves the Edge Function.
    let turnstileApiPromise = null;
    async function loadTurnstileApi() {
        if (window.turnstile) return window.turnstile;
        if (!turnstileApiPromise) {
            turnstileApiPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile-script-empty'));
                script.onerror = () => reject(new Error('turnstile-script-blocked'));
                document.head.appendChild(script);
            }).catch((error) => { turnstileApiPromise = null; throw error; });
        }
        return turnstileApiPromise;
    }

    async function getWoSAtlasTurnstileToken() {
        const siteKey = String(CFG.turnstileSiteKey || window.WOSATLAS_TURNSTILE_SITE_KEY || '').trim();
        if (!siteKey) {
            throw new Error('Turnstile site key belum dikonfigurasi. Isi CFG.turnstileSiteKey dengan public site key WoS Atlas terlebih dahulu.');
        }
        const api = await loadTurnstileApi();
        let host = document.getElementById('st-turnstile-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'st-turnstile-host';
            host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483000;padding:12px;background:#fff;border:1px solid #ccc;border-radius:10px;box-shadow:0 4px 24px #0003;';
            document.body.appendChild(host);
        }
        host.replaceChildren();
        const mount = document.createElement('div');
        host.appendChild(mount);
        return await new Promise((resolve, reject) => {
            let settled = false;
            let widgetId;
            const finish = (fn, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try { if (widgetId !== undefined) api.remove(widgetId); } catch (_) {}
                host.remove();
                fn(value);
            };
            const timer = setTimeout(() => finish(reject, new Error('Turnstile verification timed out.')), 120000);
            try {
                widgetId = api.render(mount, {
                    sitekey: siteKey,
                    execution: 'execute',
                    appearance: 'interaction-only',
                    'refresh-expired': 'manual',
                    callback: (token) => finish(resolve, token),
                    'error-callback': (code) => finish(reject, new Error('Turnstile error: ' + (code || 'unknown'))),
                    'timeout-callback': () => finish(reject, new Error('Turnstile challenge timed out.'))
                });
                api.execute(widgetId);
            } catch (error) {
                finish(reject, error);
            }
        });
    }

    async function siteFetchAll(path, idOf, maxItems, signal, maxPages, synthCursor) {
        const sep = path.indexOf('?') >= 0 ? '&' : '?';
        const seen = new Set();
        const out = [];
        let cursor = null;
        for (let page = 0; page < maxPages && out.length < maxItems; page++) {
            const url = CFG.apiBase + path + (cursor ? sep + 'cursor=' + encodeURIComponent(cursor) : '');
            let data;
            try {
                data = await fetchJson(url, signal);
            } catch (err) {
                if (err && err.name === 'AbortError') throw err;
                throw new Error('Pagination stopped at page ' + (page + 1) + '; refusing to use an incomplete State list. ' + (err && err.message || err));
            }
            const items = data && Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
            let added = 0;
            for (const it of items) {
                const id = idOf(it);
                if (!seen.has(id)) { seen.add(id); out.push(it); added++; }
            }
            if (!added || !data) break;
            // Cursors are opaque. Follow only the exact `next` value returned by WoS Atlas.
            const next = typeof data.next === 'string' && data.next ? data.next : null;
            cursor = next;
            if (!cursor) break;
        }
        return out.slice(0, maxItems);
    }

    function numOrNull(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    function mapAllianceRow(a) {
        const held = a.held_members || {};
        return {
            aid: Number(a.alliance_id),
            abbr: a.tag,
            name: a.name,
            members: numOrNull(a.member_count) || 0,
            memberMax: numOrNull(a.max_members) || 0,
            totalPower: numOrNull(a.power) || 0,
            maxPower: numOrNull(held.power_max) || 0,
            publicRecruit: !!a.public_recruit
        };
    }

    function mapMemberRow(m, i) {
        return {
            rank: i + 1,
            uid: m.uid,
            nick_name: m.name,
            power: numOrNull(m.power) || 0,
            stove_lv: m.hq_level,
            lv: m.hq_level,
            x: m.x,
            y: m.y
        };
    }

    function mapPlayerRow(p) {
        const pct = numOrNull(p.last_power_step && p.last_power_step.pct);
        return {
            uid: p.uid,
            nick_name: p.name,
            current_power: numOrNull(p.power) || 0,
            stove_lv: p.hq_level,
            kid: p.current_server_id || p.home_server_id,
            aid: p.alliance_id,
            abbr: p.alliance_tag || '',
            last_jump_pct: pct == null ? null : pct / 100,
            observed_at: p.last_seen_at
        };
    }

    async function loadServerListDirect(signal) {
        if (SITE.list && Date.now() - SITE.listAt < CFG.cacheMs) return SITE.list;
        const items = await siteFetchAll(
            '/servers?limit=200',
            (x) => String(x.server_id),
            100000,
            signal,
            400,
            null
        );
        const rows = items
            .filter((x) => x && x.rollup && Number.isFinite(Number(x.server_id)))
            .map((x) => ({
                kid: Number(x.server_id),
                chiefs: numOrNull(x.rollup.players) || 0,
                alliances: numOrNull(x.rollup.alliances) || 0,
                recruitingAlliances: 0,
                shielded: 0,
                generation_ceiling: x.generation_ceiling,
                recorded_at: x.rollup.refreshed_at || null,
                total_power: numOrNull(x.rollup.player_power) || 0,
                median_power: 0,
                max_power: 0,
                topAlliance: null
            }))
            .sort((a, b) => b.chiefs - a.chiefs);
        if (!rows.length) throw new Error('empty-list');
        SITE.list = rows;
        SITE.listAt = Date.now();
        return rows;
    }

    async function fetchPage(offset, signal) {
        if (SITE.list && Date.now() - SITE.listAt < CFG.cacheMs) {
            return validate({
                entries: SITE.list.slice(offset, offset + CFG.pageSize),
                total: SITE.list.length,
                recorded_at: SITE.list[0] ? SITE.list[0].recorded_at : null,
                partial: !!SITE.allStatesPayload && SITE.allStatesPayload.partial
            });
        }

        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');

        let zenrowsError = null;
        let sessionError = null;

        // ---- PRIMARY: ZenRows via Vercel /api/tracker ----
        if (CFG.zenrowsEnabled && CFG.zenrowsProxyUrl && CFG.zenrowsPrimary !== false) {
            try {
                if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
                let raw;
                if (CFG.zenrowsAllStates) {
                    // Server walks all cursors (1 ZenRows credit per page).
                    const proxy = `${CFG.zenrowsProxyUrl}?all=1&maxPages=30`;
                    const res = await fetch(proxy, {
                        headers: { accept: 'application/json' },
                        signal,
                        credentials: 'omit',
                        mode: 'cors'
                    });
                    if (!res.ok) {
                        let detail = '';
                        try { detail = (await res.json()).error || ''; } catch (_) {}
                        throw new Error(`zenrows-all-http-${res.status}${detail ? ': ' + detail : ''}`);
                    }
                    raw = await res.json();
                    if (raw && raw.error && !raw.entries && !raw.items) {
                        throw new Error(raw.details || raw.error || 'zenrows-all-error');
                    }
                } else {
                    const target = `${CFG.apiBase}/servers?limit=${CFG.pageSize}`;
                    raw = await fetchViaZenRows(target, signal);
                }
                const payload = normalizeZenRowsListPayload(raw);
                if (!payload.entries.length) throw new Error('zenrows-empty-list');
                // When all=1 completed without partial flag, treat as full list.
                if (raw && raw.meta && raw.meta.stoppedBecause === 'done') {
                    payload.partial = false;
                    payload.total = payload.entries.length;
                } else if (raw && Number.isFinite(Number(raw.total))) {
                    payload.total = Number(raw.total);
                    payload.partial = !!raw.partial;
                }
                SITE.list = payload.entries;
                SITE.listAt = Date.now();
                SITE.allStatesPayload = payload;
                S.mode = 'zenrows';
                console.info('[StateTracker] source=zenrows-primary, total=' + payload.total, payload.meta || raw.meta || {});
                return validate({
                    entries: SITE.list.slice(offset, offset + CFG.pageSize),
                    total: SITE.list.length,
                    recorded_at: payload.recorded_at,
                    partial: !!payload.partial,
                    meta: payload.meta
                });
            } catch (err) {
                if (err && err.name === 'AbortError') throw err;
                zenrowsError = err;
                console.warn('[StateTracker] zenrows-primary failed, trying session-proxy:', err && err.message);
            }
        }

        // ---- Fallback: Supabase Edge Function + Turnstile session ----
        try {
            const client = typeof getSupabase === 'function' ? getSupabase() : null;
            if (!client) throw new Error('Supabase client unavailable');
            const turnstileToken = await getWoSAtlasTurnstileToken();
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const { data, error } = await client.functions.invoke(CFG.proxyFunction, {
                body: { action: 'all-states', turnstileToken }
            });
            if (error) throw error;
            if (data && data.error) throw new Error(data.message || data.error);
            const payload = validate(data);
            if (payload.partial || !Number.isFinite(Number(payload.total)) || Number(payload.total) !== payload.entries.length) {
                throw new Error('WoS Atlas returned an incomplete State list; refusing to display partial results.');
            }
            SITE.list = payload.entries;
            SITE.listAt = Date.now();
            SITE.allStatesPayload = payload;
            S.mode = 'proxy';
            console.info('[StateTracker] source=session-proxy-fallback, total=' + payload.total, payload.meta || {});
            return validate({
                entries: SITE.list.slice(offset, offset + CFG.pageSize),
                total: SITE.list.length,
                recorded_at: payload.recorded_at,
                partial: false,
                meta: payload.meta
            });
        } catch (err) {
            if (err && err.name === 'AbortError') throw err;
            sessionError = err;
            console.error('[StateTracker] session-proxy also failed:', err && err.message);
        }

        throw zenrowsError || sessionError || new Error('State list unavailable');
    }

    async function loadPage(offset, token) {
        if (S.loadedOffsets.has(offset)) return;
        const json = await fetchPage(offset, S.ctrl && S.ctrl.signal);
        if (token !== S.token) return;            // reset while waiting
        for (const entry of json.entries) {
            const row = normalize(entry);
            if (Number.isFinite(row.kid)) S.rows.set(row.kid, row);
        }
        if (json.partial) S.partial = true;
        S.loadedOffsets.add(offset);
        if (Number.isFinite(Number(json.total))) S.total = Number(json.total);
        S.recordedAt = json.recorded_at || S.recordedAt;
        S.fetchedAt = S.fetchedAt || Date.now();
    }

    // ---- Detail endpoints (state / power / alliances) ----
    // Direct browser call first; if blocked (CORS / network), fall back to the
    // Supabase edge function (action "detail").
    async function fetchJson(url, signal) {
        const res = await fetch(url, {
            headers: { accept: 'application/json' },
            signal,
            credentials: 'omit',
            mode: 'cors'
        });
        if (!res.ok) throw new Error('http-' + res.status);
        return res.json();
    }

    // ZenRows + Vercel serverless proxy (api/tracker.js). Third-line fallback
    // when Turnstile / Supabase session proxy is blocked (hostname restriction).

    // Fetch one State by ID via Vercel tracker (works even when list is partial ~20).
    async function fetchOneStateByKid(kid, signal) {
        const id = Number(kid);
        if (!Number.isFinite(id)) throw new Error('bad-kid');
        const target = `${CFG.apiBase}/servers/${id}`;
        let raw;
        if (CFG.zenrowsEnabled && CFG.zenrowsProxyUrl) {
            raw = await fetchViaZenRows(target, signal);
        } else {
            raw = await fetchJson(target, signal);
        }
        const server = raw && (raw.server || raw.data || raw);
        if (!server || typeof server !== 'object') throw new Error('state-not-found');
        const rollup = server.rollup || {};
        const sid = Number(server.server_id != null ? server.server_id : id);
        if (!Number.isFinite(sid)) throw new Error('state-not-found');
        return {
            kid: sid,
            chiefs: numOrNull(rollup.players) || 0,
            alliances: numOrNull(rollup.alliances) || 0,
            recruitingAlliances: 0,
            shielded: 0,
            generation_ceiling: server.generation_ceiling,
            recorded_at: rollup.refreshed_at || server.last_seen_at || null,
            total_power: numOrNull(rollup.player_power) || 0,
            median_power: 0,
            max_power: 0,
            topAlliance: null
        };
    }

    // If user searches a numeric State ID missing from the partial list, pull it in.
    async function ensureKidInList(kid) {
        const id = Number(kid);
        if (!Number.isFinite(id)) return null;
        if (S.rows.has(id)) return S.rows.get(id);
        try {
            const row = normalize(await fetchOneStateByKid(id, S.ctrl && S.ctrl.signal));
            if (Number.isFinite(row.kid)) {
                S.rows.set(row.kid, row);
                return row;
            }
        } catch (err) {
            if (err && err.name === 'AbortError') throw err;
            console.warn('[StateTracker] ensureKidInList failed', id, err && err.message);
        }
        return null;
    }

    async function fetchViaZenRows(targetUrl, signal) {
        if (!CFG.zenrowsEnabled || !CFG.zenrowsProxyUrl) {
            throw new Error('zenrows-disabled');
        }
        const proxy = `${CFG.zenrowsProxyUrl}?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxy, {
            headers: { accept: 'application/json' },
            signal,
            credentials: 'omit',
            mode: 'cors'
        });
        if (!res.ok) {
            let detail = '';
            try { detail = (await res.json()).error || ''; } catch (_) { /* ignore */ }
            throw new Error(`zenrows-http-${res.status}${detail ? ': ' + detail : ''}`);
        }
        const data = await res.json();
        if (data && data.error && !data.items && !data.entries) {
            throw new Error(data.details || data.error || 'zenrows-proxy-error');
        }
        return data;
    }

    // Map ZenRows /servers payload into the shape expected by normalize():
    // { kid, chiefs, alliances, total_power, ... }. Upstream uses server_id + rollup.
    function normalizeZenRowsListPayload(data) {
        const items = (data && (data.items || data.entries || data.servers || data.data)) || [];
        const raw = Array.isArray(items) ? items : [];
        const entries = raw
            .map((x) => {
                if (!x || typeof x !== 'object') return null;
                // Already in summary shape (has kid)
                if (x.kid != null || x.chiefs != null) {
                    return {
                        kid: Number(x.kid != null ? x.kid : x.server_id),
                        chiefs: Number(x.chiefs) || 0,
                        alliances: Number(x.alliances) || 0,
                        recruitingAlliances: Number(x.recruitingAlliances) || 0,
                        shielded: Number(x.shielded) || 0,
                        generation_ceiling: x.generation_ceiling,
                        recorded_at: x.recorded_at || null,
                        total_power: Number(x.total_power) || 0,
                        median_power: Number(x.median_power) || 0,
                        max_power: Number(x.max_power) || 0,
                        topAlliance: x.topAlliance || null
                    };
                }
                // Public /servers shape
                const rollup = x.rollup || {};
                const kid = Number(x.server_id);
                if (!Number.isFinite(kid)) return null;
                return {
                    kid: kid,
                    chiefs: numOrNull(rollup.players) || 0,
                    alliances: numOrNull(rollup.alliances) || 0,
                    recruitingAlliances: 0,
                    shielded: 0,
                    generation_ceiling: x.generation_ceiling,
                    recorded_at: rollup.refreshed_at || x.last_seen_at || null,
                    total_power: numOrNull(rollup.player_power) || 0,
                    median_power: 0,
                    max_power: 0,
                    topAlliance: null
                };
            })
            .filter((r) => r && Number.isFinite(r.kid))
            .sort((a, b) => b.chiefs - a.chiefs);

        const partial = data && data.partial != null
            ? !!data.partial
            : !(data && data.meta && data.meta.stoppedBecause === 'done');

        return {
            entries: entries,
            total: entries.length,
            recorded_at: (entries[0] && entries[0].recorded_at) || (data && (data.recorded_at || data.refreshed_at)) || null,
            partial: partial,
            meta: Object.assign(
                { source: 'zenrows' },
                (data && data.meta) || {}
            )
        };
    }

    async function fetchDetailDirect(kid, signal) {
        const results = await Promise.allSettled([
            fetchJson(`${CFG.apiBase}/servers/${kid}`, signal),
            siteFetchAll(`/servers/${kid}/alliances?sort=power`, (a) => String(a.alliance_id), 50, signal, 5)
        ]);
        const server = results[0].status === 'fulfilled' ? results[0].value : null;
        const allianceItems = results[1].status === 'fulfilled' ? results[1].value : null;
        if (!server && !allianceItems) throw new Error('direct-detail-failed');

        // Top players: merge the members of the strongest alliances.
        let top = [];
        if (allianceItems && allianceItems.length) {
            const lists = await Promise.allSettled(allianceItems.slice(0, 8).map((a) =>
                siteFetchAll(`/alliances/${a.alliance_id}/members`, (m) => String(m.uid), 200, signal, 10)));
            const seen = new Set();
            const merged = [];
            for (const l of lists) {
                if (l.status !== 'fulfilled') continue;
                for (const m of l.value) {
                    if (!seen.has(String(m.uid))) { seen.add(String(m.uid)); merged.push(m); }
                }
            }
            merged.sort((a, b) => (Number(b.power) || 0) - (Number(a.power) || 0));
            top = merged.slice(0, CFG.topPlayersLimit).map(mapMemberRow);
        }

        const rollup = (server && server.rollup) || {};
        const king = server && Array.isArray(server.roles) ? server.roles.find((r) => r && r.role === 'king') : null;
        const state = server ? {
            server_id: server.server_id,
            chiefs: numOrNull(rollup.players),
            total_power: numOrNull(rollup.player_power),
            king: king ? { uid: king.uid, nick_name: null } : null
        } : null;
        const power = server ? {
            player_count: numOrNull(rollup.players),
            total_power: numOrNull(rollup.player_power),
            recorded_at: rollup.refreshed_at || null,
            top: top
        } : null;
        const alliances = allianceItems ? { entries: allianceItems.slice(0, CFG.allianceLimit).map(mapAllianceRow) } : null;
        return { state, power, alliances };
    }

    async function fetchDetailProxy(kid, signal) {
        const client = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!client) throw new Error('unavailable');
        // AbortSignal is not passed through functions.invoke; caller still
        // checks S.token / signal.aborted after the await.
        const { data, error } = await client.functions.invoke(CFG.proxyFunction, {
            body: { action: 'detail', kid, allianceLimit: CFG.allianceLimit }
        });
        if (error) throw error;
        if (!data || (typeof data === 'object' && data.error)) {
            throw new Error((data && data.error) || 'proxy-detail-failed');
        }
        return {
            state: data.state || null,
            power: data.power || null,
            alliances: data.alliances || null
        };
    }

    // Detail via ZenRows: fetch the public server endpoint only (no full
    // alliance/player merge). Good enough when session + direct both fail.
    async function fetchDetailZenRows(kid, signal) {
        const raw = await fetchViaZenRows(`${CFG.apiBase}/servers/${kid}`, signal);
        const server = raw && (raw.server || raw.data || raw);
        if (!server || typeof server !== 'object') {
            throw new Error('zenrows-detail-empty');
        }
        const rollup = server.rollup || {};
        const king = Array.isArray(server.roles)
            ? server.roles.find((r) => r && r.role === 'king')
            : null;
        return {
            state: {
                server_id: server.server_id || kid,
                chiefs: numOrNull(rollup.players),
                total_power: numOrNull(rollup.player_power),
                king: king ? { uid: king.uid, nick_name: null } : null
            },
            power: {
                player_count: numOrNull(rollup.players),
                total_power: numOrNull(rollup.player_power),
                recorded_at: rollup.refreshed_at || null,
                top: []
            },
            alliances: null
        };
    }

    function getDetail(kid) {
        return S.detailCache.get(Number(kid)) || null;
    }

    function setDetail(kid, patch) {
        const key = Number(kid);
        const prev = S.detailCache.get(key) || {};
        S.detailCache.set(key, Object.assign({}, prev, patch));
    }

    async function loadDetail(kid) {
        const key = Number(kid);
        if (!Number.isFinite(key)) return;
        const cached = getDetail(key);
        if (cached && cached.loading) return;
        if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CFG.detailCacheMs && !cached.error) {
            return;
        }

        setDetail(key, { loading: true, error: null });
        if (S.view === 'detail' && S.detailKid === key) renderDetail();

        const signal = S.ctrl && S.ctrl.signal;
        let state = null;
        let power = null;
        let alliances = null;
        let errMsg = null;

        try {
            let payload = null;
            // Prefer whatever mode already worked for the summary list.
            // Order: proxy → direct → zenrows (or zenrows first if that is the active mode).
            const tryOrder = (CFG.zenrowsPrimary !== false && CFG.zenrowsEnabled) || S.mode === 'zenrows'
                ? ['zenrows', 'direct', 'proxy']
                : S.mode === 'proxy'
                    ? ['proxy', 'direct', 'zenrows']
                    : ['direct', 'proxy', 'zenrows'];

            let lastErr = null;
            for (const method of tryOrder) {
                try {
                    if (method === 'proxy') payload = await fetchDetailProxy(key, signal);
                    else if (method === 'direct') payload = await fetchDetailDirect(key, signal);
                    else if (method === 'zenrows' && CFG.zenrowsEnabled) payload = await fetchDetailZenRows(key, signal);
                    else continue;
                    if (method === 'proxy' || method === 'direct' || method === 'zenrows') {
                        if (S.mode !== method && method !== 'zenrows') S.mode = method;
                    }
                    lastErr = null;
                    break;
                } catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    lastErr = err;
                    payload = null;
                }
            }
            if (!payload) throw lastErr || new Error('detail-all-methods-failed');

            if (signal && signal.aborted) return;
            state = payload.state;
            power = payload.power;
            alliances = payload.alliances;
            if (!state && !power && !alliances) {
                errMsg = 'Could not load extra State detail. Showing summary only.';
            }
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('State Tracker detail:', err);
            errMsg = 'Could not load extra State detail. Showing summary only.';
        }

        setDetail(key, {
            loading: false,
            fetchedAt: Date.now(),
            state: state,
            power: power,
            alliances: alliances,
            error: errMsg
        });

        if (S.view === 'detail' && S.detailMode === 'state' && S.detailKid === key) renderDetail();
    }

    // ---- Alliance detail ----
    async function fetchAllianceDirect(aid, signal) {
        // alliance_id = <server id><6-digit sequence>, e.g. 3369000011
        const kid = Math.floor(Number(aid) / 1000000);
        const [listRes, memRes] = await Promise.allSettled([
            siteFetchAll(`/servers/${kid}/alliances?sort=power`, (a) => String(a.alliance_id), 400, signal, 25),
            siteFetchAll(`/alliances/${aid}/members`, (m) => String(m.uid), 200, signal, 10)
        ]);
        const list = listRes.status === 'fulfilled' ? listRes.value : [];
        const a = list.find((x) => Number(x.alliance_id) === Number(aid));
        const members = memRes.status === 'fulfilled' ? memRes.value : [];
        if (!a && !members.length) throw new Error('direct-alliance-failed');
        const src = a || {};
        return {
            aid: Number(aid),
            abbr: src.tag || (members[0] && members[0].alliance_tag) || '',
            name: src.name || '',
            memberCount: src.member_count,
            memberMax: src.max_members,
            serverPower: src.power,
            leaderUid: src.leader_uid,
            leaderName: src.leader_name,
            lv: src.alliance_level,
            joinMinLevel: src.join_min_level,
            joinMinPower: src.join_min_power,
            publicRecruit: !!src.public_recruit,
            homeKid: Number(src.home_server_id) || kid,
            honorLevel: src.honor_level,
            members: members.map(mapMemberRow)
        };
    }

    async function fetchAllianceProxy(aid) {
        const client = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!client) throw new Error('unavailable');
        const { data, error } = await client.functions.invoke(CFG.proxyFunction, {
            body: { action: 'alliance', aid }
        });
        if (error) throw error;
        if (!data || (typeof data === 'object' && data.error && !data.aid)) {
            throw new Error((data && data.error) || 'proxy-alliance-failed');
        }
        return data;
    }

    async function loadAlliance(aid) {
        const key = Number(aid);
        if (!Number.isFinite(key)) return;
        const cached = S.allianceCache.get(key);
        if (cached && cached.loading) return;
        if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CFG.detailCacheMs && !cached.error) {
            return;
        }
        S.allianceCache.set(key, Object.assign({}, cached || {}, { loading: true, error: null }));
        if (S.view === 'detail' && S.detailMode === 'alliance' && S.detailAid === key) renderAllianceDetail();

        const signal = S.ctrl && S.ctrl.signal;
        let data = null;
        let errMsg = null;
        try {
            if (S.mode === 'proxy') {
                try { data = await fetchAllianceProxy(key); }
                catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    data = await fetchAllianceDirect(key, signal);
                }
            } else {
                try {
                    data = await fetchAllianceDirect(key, signal);
                    if (S.mode !== 'proxy') S.mode = 'direct';
                } catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    data = await fetchAllianceProxy(key);
                    S.mode = 'proxy';
                }
            }
            if (signal && signal.aborted) return;
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('State Tracker alliance:', err);
            errMsg = 'Could not load alliance detail.';
        }
        S.allianceCache.set(key, {
            loading: false,
            fetchedAt: Date.now(),
            data: data,
            error: errMsg
        });
        if (S.view === 'detail' && S.detailMode === 'alliance' && S.detailAid === key) renderAllianceDetail();
    }

    // ---- Player detail ----
    // Resolve a typed ID through /players/search
    // (query param is named playerName but also matches numeric IDs), then
    // opens the match. /players/{uid} alone does not find every player, so
    // the ID box below goes through search first.
    // /search?q= returns players and alliances: { items: [{ kind, id, name, matched_name,
    // server_id, alliance_id, alliance_tag, ... }] }.
    function mapSearchItem(it) {
        const kind = String(it.kind || '').toLowerCase();
        const name = it.name || it.matched_name || '';
        if (kind === 'player') {
            return {
                kind: 'player',
                uid: it.id,
                nick_name: name,
                kid: it.server_id,
                aid: it.alliance_id,
                abbr: it.alliance_tag || ''
            };
        }
        if (kind === 'alliance') {
            return {
                kind: 'alliance',
                aid: it.id || it.alliance_id,
                name: name,
                abbr: it.tag || it.alliance_tag || it.abbr || '',
                kid: it.server_id || it.home_server_id
            };
        }
        return null;
    }

    async function fetchPlayerSearchDirect(query, signal) {
        const q = String(query).trim();
        const data = await fetchJson(`${CFG.apiBase}/search?q=${encodeURIComponent(q)}`, signal);
        const items = data && Array.isArray(data.items) ? data.items : [];
        const results = items.map(mapSearchItem).filter(Boolean);
        // A numeric ID that search does not list may still be a valid player.
        if (!results.length && /^\d+$/.test(q)) {
            try {
                const p = await fetchJson(`${CFG.apiBase}/players/${q}`, signal);
                if (p) return { players: [mapPlayerRow(p)] };
            } catch (err) {
                if (err && err.name === 'AbortError') throw err;
            }
        }
        return { players: results };
    }

    async function fetchPlayerSearchProxy(query) {
        const client = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!client) throw new Error('unavailable');
        const { data, error } = await client.functions.invoke(CFG.proxyFunction, {
            body: { action: 'player-search', query }
        });
        if (error) throw error;
        if (!data || (typeof data === 'object' && data.error && !Array.isArray(data))) {
            throw new Error((data && data.error) || 'proxy-player-search-failed');
        }
        return data;
    }

    function extractSearchResults(d) {
        if (!d) return [];
        if (Array.isArray(d)) return d;
        const keys = ['results', 'players', 'list', 'items', 'data'];
        for (const k of keys) {
            if (Array.isArray(d[k])) return d[k];
        }
        return [];
    }

    // Resolves a typed ID to a uid via search, preferring an exact uid match;
    // falls back to the plain /players/{uid} lookup if search finds nothing.
    async function resolvePlayerId(query, signal) {
        let results = [];
        try {
            let payload;
            if (S.mode === 'proxy') {
                try { payload = await fetchPlayerSearchProxy(query); }
                catch (err) { if (err && err.name === 'AbortError') throw err; payload = await fetchPlayerSearchDirect(query, signal); }
            } else {
                try { payload = await fetchPlayerSearchDirect(query, signal); }
                catch (err) { if (err && err.name === 'AbortError') throw err; payload = await fetchPlayerSearchProxy(query); }
            }
            results = extractSearchResults(payload);
        } catch (err) {
            if (err && err.name === 'AbortError') throw err;
            results = [];
        }
        if (signal && signal.aborted) return null;
        const exact = results.find((r) => r.kind !== 'alliance' && String(r.uid || r.fid || r.playerUid || '') === String(query));
        if (exact) return Number(exact.uid || exact.fid || exact.playerUid);
        if (results.length === 1 && results[0].kind !== 'alliance') {
            return Number(results[0].uid || results[0].fid || results[0].playerUid) || null;
        }
        if (results.length >= 1) return { multiple: results };
        // Nothing from search: the ID itself may still resolve directly.
        try {
            const direct = await fetchPlayerDirect(query, signal);
            if (direct && Array.isArray(direct.players) && direct.players.length) return Number(query);
        } catch (err) {
            if (err && err.name === 'AbortError') throw err;
        }
        return null;
    }

    async function fetchPlayerDirect(uid, signal) {
        const p = await fetchJson(`${CFG.apiBase}/players/${uid}`, signal);
        return { players: [mapPlayerRow(p)] };
    }

    async function fetchPlayerProxy(uid) {
        const client = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!client) throw new Error('unavailable');
        const { data, error } = await client.functions.invoke(CFG.proxyFunction, {
            body: { action: 'player', uid }
        });
        if (error) throw error;
        if (!data || (typeof data === 'object' && data.error && !data.players)) {
            throw new Error((data && data.error) || 'proxy-player-failed');
        }
        return data;
    }

    // Extra player endpoints: power history, arena standing, change log.
    const PLAYER_EXTRAS = [
        { key: 'power', label: 'Power', path: 'power' },
        { key: 'arena', label: 'Arena', path: 'arena' },
        { key: 'history', label: 'History', path: 'history?limit=200' }
    ];

    async function fetchPlayerExtraProxy(uid, kind) {
        const client = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!client) throw new Error('unavailable');
        const { data, error } = await client.functions.invoke(CFG.proxyFunction, {
            body: { action: 'player-extra', uid, kind }
        });
        if (error) throw error;
        if (!data || (typeof data === 'object' && data.error && !Array.isArray(data))) {
            throw new Error((data && data.error) || 'proxy-player-extra-failed');
        }
        return data;
    }

    async function fetchPlayerExtras(uid, signal) {
        const out = {};
        await Promise.all(PLAYER_EXTRAS.map(async (ex) => {
            let val = null;
            try {
                if (S.mode === 'proxy') {
                    try { val = await fetchPlayerExtraProxy(uid, ex.key); }
                    catch (e) { val = await fetchJson(`${CFG.apiBase}/players/${uid}/${ex.path}`, signal); }
                } else {
                    try { val = await fetchJson(`${CFG.apiBase}/players/${uid}/${ex.path}`, signal); }
                    catch (e) { val = await fetchPlayerExtraProxy(uid, ex.key); }
                }
            } catch (e) {
                if (e && e.name === 'AbortError') throw e;
                val = null;
            }
            out[ex.key] = val;
        }));
        return out;
    }

    async function loadPlayer(uid) {
        const key = Number(uid);
        if (!Number.isFinite(key)) return;
        const cached = S.playerCache.get(key);
        if (cached && cached.loading) return;
        if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CFG.detailCacheMs && !cached.error) {
            return;
        }
        S.playerCache.set(key, Object.assign({}, cached || {}, { loading: true, error: null }));
        if (S.view === 'detail' && S.detailMode === 'player' && S.detailUid === key) renderPlayerDetail();

        const signal = S.ctrl && S.ctrl.signal;
        let data = null;
        let errMsg = null;
        try {
            if (S.mode === 'proxy') {
                try { data = await fetchPlayerProxy(key); }
                catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    data = await fetchPlayerDirect(key, signal);
                }
            } else {
                try {
                    data = await fetchPlayerDirect(key, signal);
                    if (S.mode !== 'proxy') S.mode = 'direct';
                } catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    data = await fetchPlayerProxy(key);
                    S.mode = 'proxy';
                }
            }
            if (signal && signal.aborted) return;
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('State Tracker player:', err);
            errMsg = 'Could not load player detail.';
        }
        let extras = null;
        if (data) {
            // Show the basic card now, then fill in power / arena / history.
            S.playerCache.set(key, { loading: false, extrasLoading: true, fetchedAt: Date.now(), data: data, error: errMsg });
            if (S.view === 'detail' && S.detailMode === 'player' && S.detailUid === key) renderPlayerDetail();
            try { extras = await fetchPlayerExtras(key, signal); }
            catch (err) { if (err && err.name === 'AbortError') return; }
            if (signal && signal.aborted) return;
        }
        S.playerCache.set(key, {
            loading: false,
            extrasLoading: false,
            fetchedAt: Date.now(),
            data: data,
            extras: extras,
            error: errMsg
        });
        if (S.view === 'detail' && S.detailMode === 'player' && S.detailUid === key) renderPlayerDetail();
    }

    function nextMissingOffset() {
        const limit = S.total || CFG.pageSize;
        for (let o = 0; o < limit; o += CFG.pageSize) {
            if (!S.loadedOffsets.has(o)) return o;
        }
        return null;
    }

    // "Everything is loaded" = every page of the listing was fetched. (Counting
    // rows instead would never finish if the API repeats or skips a State.)
    function allLoaded() {
        return S.total > 0 && S.loadedOffsets.size >= Math.ceil(S.total / CFG.pageSize);
    }

    // Runs an async loader with shared busy/error handling.
    async function run(task) {
        const token = S.token;
        S.busy = true;
        S.error = null;
        S.retry = () => run(task);
        render();
        try {
            await task(token);
        } catch (err) {
            if (!(err && err.name === 'AbortError') && token === S.token) {
                console.error('State Tracker:', err);
                S.error = (err && err.message) ? String(err.message) : 'Could not load State data. Check your connection and try again.';
            }
        } finally {
            if (token === S.token) {
                S.busy = false;
                S.progress = null;
                render();
            }
        }
    }

    function loadFirstPage() {
        return run(async (token) => { await loadPage(0, token); });
    }

    function loadNextPage() {
        return run(async (token) => {
            const offset = S.total ? nextMissingOffset() : 0;
            if (offset !== null) await loadPage(offset, token);
        });
    }

    function loadAll() {
        if (S.loadingAll) return S.loadingAll;
        if (allLoaded()) { render(); return Promise.resolve(); }
        S.loadingAll = run(async (token) => {
            if (S.loadedOffsets.size === 0) await loadPage(0, token);
            const offsets = [];
            for (let o = 0; o < S.total; o += CFG.pageSize) {
                if (!S.loadedOffsets.has(o)) offsets.push(o);
            }
            const totalPages = Math.ceil(S.total / CFG.pageSize);
            let index = 0;
            S.progress = { done: S.loadedOffsets.size, total: totalPages };
            render();
            const worker = async () => {
                while (index < offsets.length && token === S.token) {
                    const offset = offsets[index++];
                    await loadPage(offset, token);
                    S.progress = { done: S.loadedOffsets.size, total: totalPages };
                    render();
                }
            };
            await Promise.all(Array.from({ length: CFG.concurrency }, worker));
        }).finally(() => { S.loadingAll = null; });
        return S.loadingAll;
    }

    function resetData() {
        SITE.list = null;
        S.token += 1;
        if (S.ctrl) S.ctrl.abort();
        S.ctrl = new AbortController();
        S.rows = new Map();
        S.loadedOffsets = new Set();
        S.detailCache = new Map();
        S.allianceCache = new Map();
        S.playerCache = new Map();
        S.total = 0;
        S.partial = false;
        S.recordedAt = null;
        S.fetchedAt = 0;
        S.error = null;
        S.busy = false;
        S.progress = null;
        S.loadingAll = null;
        S.visible = CFG.firstVisible;
    }

    // ---- Rendering ----
    function sortedRows() {
        const key = S.sort;
        const dir = S.desc ? -1 : 1;
        return Array.from(S.rows.values()).sort((a, b) => (a[key] - b[key]) * dir || a.kid - b.kid);
    }

    function matches(row, q) {
        if (String(row.kid).includes(q)) return true;
        if (!row.top) return false;
        return row.top.abbr.toLowerCase().includes(q) || row.top.name.toLowerCase().includes(q);
    }

    function rowHtml(row, rank) {
        const mine = row.kid === CFG.myState ? ' is-mine' : '';
        const top = row.top
            ? `<span class="st-tag">${escapeHtml(row.top.abbr)}</span><span class="st-top-name">${escapeHtml(row.top.name)}</span>` +
              `<small>${fmtCompact(row.top.power)} &middot; ${row.top.members}/${row.top.memberMax}</small>`
            : '<span class="st-muted">-</span>';
        return `<tr class="st-row${mine}" data-kid="${row.kid}" tabindex="0" title="${escapeHtml(row.kid)}">` +
            `<td class="st-col-state"><span class="st-rank">${rank}</span><strong>${row.kid}</strong></td>` +
            `<td class="st-num" title="${fmtFull(row.chiefs)}">${fmtFull(row.chiefs)}</td>` +
            `<td class="st-num">${fmtFull(row.alliances)}</td>` +
            `<td class="st-num" title="${fmtFull(row.total)}">${fmtCompact(row.total)}</td>` +
            `<td class="st-num" title="${fmtFull(row.median)}">${fmtCompact(row.median)}</td>` +
            `<td class="st-num" title="${fmtFull(row.max)}">${fmtCompact(row.max)}</td>` +
            `<td class="st-col-top">${top}</td>` +
            `</tr>`;
    }

    function render() {
        if (!els) return;
        els.listView.classList.toggle('hidden', S.view !== 'list');
        els.detailView.classList.toggle('hidden', S.view !== 'detail');
        if (S.view === 'detail') {
            if (S.detailMode === 'alliance') renderAllianceDetail();
            else if (S.detailMode === 'player') renderPlayerDetail();
            else if (S.detailMode === 'search') renderSearchDetail();
            else renderDetail();
            // Back button label
            if (els.back) {
                els.back.textContent = (S.detailMode === 'state')
                    ? '← Back to list'
                    : '← Back to State';
            }
            return;
        }
        els.sort.value = S.sort;
        els.headSort.forEach((th) => {
            th.setAttribute('aria-sort', th.dataset.sort === S.sort ? (S.desc ? 'descending' : 'ascending') : 'none');
        });
        const all = sortedRows();
        const rankOf = new Map(all.map((row, i) => [row.kid, i + 1]));
        const q = S.query.trim().toLowerCase();
        const list = q ? all.filter((row) => matches(row, q)) : all;
        const shown = list.slice(0, S.visible);

        els.body.innerHTML = shown.map((row) => rowHtml(row, rankOf.get(row.kid))).join('');
        els.wrap.classList.toggle('hidden', shown.length === 0);

        // Status line (one text node per message so the i18n patterns match).
        let status = '';
        if (S.error) {
            status = '';
        } else if (S.progress) {
            status = `Loading all States... ${S.progress.done} / ${S.progress.total}`;
        } else if (S.busy && all.length === 0) {
            status = 'Loading States...';
        } else if (all.length > 0) {
            status = `Showing ${fmtFull(shown.length)} of ${fmtFull(q ? list.length : (S.total || all.length))} States`;
            if (S.partial) status += ' (partial: wosatlas blocked the full list)';
        }
        els.status.textContent = status;
        els.updated.textContent = S.recordedAt ? `Updated ${new Date(S.recordedAt).toLocaleString()}` : '';

        els.error.classList.toggle('hidden', !S.error);
        els.retry.classList.toggle('hidden', !S.error);
        els.errorText.textContent = S.error || '';

        const noMatch = !!q && list.length === 0 && !S.busy;
        els.empty.classList.toggle('hidden', !(noMatch && allLoaded()));

        // "Search all States": a partial list may be missing matches.
        els.searchAll.classList.toggle('hidden', !(q && !allLoaded() && !S.busy && !S.error));

        const hasHidden = shown.length < list.length;
        const canFetchMore = !q && S.sort === 'chiefs' && !allLoaded() && S.rows.size > 0;
        els.more.classList.toggle('hidden', !(hasHidden || canFetchMore) || S.busy);

        els.spinner.classList.toggle('hidden', !S.busy);
        els.refresh.disabled = S.busy;
        els.dir.textContent = S.desc ? 'High to low' : 'Low to high';
    }


    // ---- Detail view ----
    function prefixLoaded() {
        let max = -1;
        S.loadedOffsets.forEach((o) => { if (o > max) max = o; });
        for (let o = 0; o <= max; o += CFG.pageSize) if (!S.loadedOffsets.has(o)) return false;
        return max >= 0;
    }

    // Exact rank (1 = highest) or null when the data loaded so far can't tell.
    function rankFor(key, row) {
        if (!allLoaded() && !(key === 'chiefs' && prefixLoaded())) return null;
        let rank = 1;
        S.rows.forEach((other) => { if (other[key] > row[key]) rank += 1; });
        return rank;
    }

    function deltaHtml(value, base, compact) {
        if (base == null) return '';
        const diff = value - base;
        if (diff === 0) return '<small class="st-delta">=</small>';
        const sign = diff > 0 ? '+' : '-';
        const text = compact ? fmtCompact(Math.abs(diff)) : fmtFull(Math.abs(diff));
        return `<small class="st-delta ${diff > 0 ? 'is-up' : 'is-down'}">${sign}${text}</small>`;
    }

    function statCard(label, row, key, opts) {
        const o = opts || {};
        const value = o.value != null ? o.value : row[key];
        const compact = !!o.compact;
        const rank = o.rank === false ? null : rankFor(key, row);
        const base = o.base != null ? o.base : null;
        return `<div class="st-stat">` +
            `<span class="st-stat-label">${label}</span>` +
            `<strong class="st-stat-value" title="${fmtFull(value)}">${compact ? fmtCompact(value) : fmtFull(value)}</strong>` +
            `<span class="st-stat-meta">${rank ? `<span class="st-rankbadge">#${fmtFull(rank)}</span>` : ''}${deltaHtml(value, base, compact)}</span>` +
            `</div>`;
    }

    function renderDetail() {
        const row = S.rows.get(S.detailKid);
        if (!row) { showList(); return; }
        const mineRow = S.rows.get(CFG.myState);
        const cmp = mineRow && mineRow.kid !== row.kid ? mineRow : null;
        const base = (key) => (cmp ? cmp[key] : null);
        const perChief = row.chiefs ? Math.round(row.total / row.chiefs) : 0;
        const perChiefBase = cmp && cmp.chiefs ? Math.round(cmp.total / cmp.chiefs) : null;

        const detail = getDetail(row.kid);
        const power = detail && detail.power;
        const stateFacts = detail && detail.state;
        const allianceLb = detail && detail.alliances;
        const loadingExtra = !!(detail && detail.loading);
        const extraError = detail && detail.error;

        // Prefer kingdom power figures when available.
        const players = power && Number.isFinite(Number(power.player_count)) ? Number(power.player_count) : row.chiefs;
        const totalPower = power && Number.isFinite(Number(power.total_power)) ? Number(power.total_power) : row.total;
        const medianPower = power && Number.isFinite(Number(power.median_power)) ? Number(power.median_power) : row.median;
        const maxPower = power && Number.isFinite(Number(power.max_power)) ? Number(power.max_power) : row.max;
        const powerRank = power && Number.isFinite(Number(power.power_rank)) ? Number(power.power_rank) : rankFor('total', row);
        const rankedStates = power && Number.isFinite(Number(power.ranked_states)) ? Number(power.ranked_states) : (S.total || null);

        const king = stateFacts && stateFacts.king ? stateFacts.king : null;
        const rankedPop = stateFacts && Number.isFinite(Number(stateFacts.rankedPopulation))
            ? Number(stateFacts.rankedPopulation) : null;
        const transferNote = stateFacts && stateFacts.transferPowerTier != null
            ? String(stateFacts.transferPowerTier)
            : (stateFacts && stateFacts.migrantRead === 'UNAVAILABLE' ? 'Not answered by the server' : null);

        const t = row.top;
        // topAlliance from summary may not include aid; leaderboard entries do.
        const topHtml = t ? `
            <div class="st-topcard">
                <div class="st-topcard-head"><span class="st-tag">${escapeHtml(t.abbr)}</span><strong data-no-i18n>${escapeHtml(t.name)}</strong></div>
                <div class="st-topcard-grid">
                    <div><span class="st-stat-label">Total Power</span><strong title="${fmtFull(t.power)}">${fmtCompact(t.power)}</strong></div>
                    <div><span class="st-stat-label">Members</span><strong>${t.members}/${t.memberMax}</strong></div>
                    <div><span class="st-stat-label">Min. level</span><strong>${t.minLevel}</strong></div>
                    <div><span class="st-stat-label">Min. power</span><strong title="${fmtFull(t.minPower)}">${fmtCompact(t.minPower)}</strong></div>
                </div>
                <span class="st-chip-static ${t.publicRecruit ? 'is-open' : 'is-closed'}">${t.publicRecruit ? 'Open recruitment' : 'Closed recruitment'}</span>
            </div>` : '';

        const needAll = !allLoaded();
        const progress = S.progress ? `Loading all States... ${S.progress.done} / ${S.progress.total}` : '';
        let hint = '';
        if (loadingExtra) {
            hint = `<div class="st-detail-hint"><span class="spinner-inline" aria-hidden="true"></span><span>Loading detail...</span></div>`;
        } else if (extraError) {
            hint = `<div class="st-detail-hint st-detail-hint-warn"><span>${escapeHtml(extraError)}</span></div>`;
        } else if (needAll && !S.busy) {
            hint = `<div class="st-detail-hint"><span>Load all States to see rankings and compare with your State.</span><button type="button" class="st-chip" data-action="load-all">Load all States</button></div>`;
        } else if (progress) {
            hint = `<div class="st-detail-hint"><span class="spinner-inline" aria-hidden="true"></span><span>${progress}</span></div>`;
        }

        const rankLabel = powerRank
            ? (rankedStates ? `#${fmtFull(powerRank)} of ${fmtFull(rankedStates)}` : `#${fmtFull(powerRank)}`)
            : '-';

        // Alliance leaderboard table
        let alliancesHtml = '';
        const entries = allianceLb && Array.isArray(allianceLb.entries) ? allianceLb.entries : null;
        if (entries && entries.length) {
            const rows = entries.map((a, i) => {
                const rank = i + 1;
                const aid = Number(a.aid) || 0;
                const abbr = escapeHtml(String(a.abbr || ''));
                const name = escapeHtml(String(a.name || ''));
                const members = Number.isFinite(Number(a.members)) ? Number(a.members) : 0;
                const memberMax = Number.isFinite(Number(a.memberMax)) ? Number(a.memberMax) : 0;
                const tp = Number(a.totalPower) || 0;
                const mp = Number(a.maxPower) || 0;
                const recruit = a.publicRecruit
                    ? '<span class="st-chip-static is-open">Open</span>'
                    : '<span class="st-chip-static is-closed">Closed</span>';
                const click = aid ? ` class="st-click-row" data-action="open-alliance" data-aid="${aid}" tabindex="0" role="button"` : '';
                const nameCell = aid
                    ? `<button type="button" class="st-link" data-action="open-alliance" data-aid="${aid}" data-no-i18n>${name}</button>`
                    : `<span data-no-i18n>${name}</span>`;
                const tagCell = aid
                    ? `<button type="button" class="st-tag st-tag-btn" data-action="open-alliance" data-aid="${aid}">${abbr}</button>`
                    : `<span class="st-tag">${abbr}</span>`;
                return `<tr${click}>
                    <td class="st-num">${rank}</td>
                    <td>${tagCell}</td>
                    <td>${nameCell}</td>
                    <td class="st-num" title="${fmtFull(tp)}">${fmtCompact(tp)}</td>
                    <td class="st-num">${members}${memberMax ? '/' + memberMax : ''}</td>
                    <td class="st-num" title="${fmtFull(mp)}">${fmtCompact(mp)}</td>
                    <td>${recruit}</td>
                </tr>`;
            }).join('');
            alliancesHtml = `
                <h4 class="st-detail-h">Top Alliances</h4>
                <div class="st-mini-table-wrap">
                    <table class="st-mini-table">
                        <thead><tr>
                            <th class="st-num">#</th>
                            <th>Tag</th>
                            <th>Name</th>
                            <th class="st-num">Power</th>
                            <th class="st-num">Members</th>
                            <th class="st-num">Max</th>
                            <th></th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        } else if (t) {
            alliancesHtml = '<h4 class="st-detail-h">Top Alliance</h4>' + topHtml;
        }

        // Top players from kingdom power
        let playersHtml = '';
        const topPlayers = power && Array.isArray(power.top) ? power.top.slice(0, CFG.topPlayersLimit) : null;
        if (topPlayers && topPlayers.length) {
            const prows = topPlayers.map((p) => {
                const rank = Number(p.rank) || 0;
                const uid = Number(p.uid) || 0;
                const nick = escapeHtml(String(p.nick_name || p.uid || ''));
                const pw = Number(p.power) || 0;
                const stove = Number.isFinite(Number(p.stove_lv)) ? Number(p.stove_lv) : '-';
                const jump = Number.isFinite(Number(p.last_jump_pct))
                    ? (Number(p.last_jump_pct) * 100).toFixed(1) + '%'
                    : '-';
                const click = uid ? ` class="st-click-row" data-action="open-player" data-uid="${uid}" tabindex="0" role="button"` : '';
                const nameCell = uid
                    ? `<button type="button" class="st-link" data-action="open-player" data-uid="${uid}" data-no-i18n>${nick}</button>
                       <span class="st-uid-hint" title="Player ID">#${uid}</span>`
                    : `<span data-no-i18n>${nick}</span>`;
                return `<tr${click}>
                    <td class="st-num">${rank}</td>
                    <td>${nameCell}</td>
                    <td class="st-num" title="${fmtFull(pw)}">${fmtCompact(pw)}</td>
                    <td class="st-num">${stove}</td>
                    <td class="st-num">${jump}</td>
                </tr>`;
            }).join('');
            playersHtml = `
                <h4 class="st-detail-h">Top Players</h4>
                <div class="st-mini-table-wrap">
                    <table class="st-mini-table">
                        <thead><tr>
                            <th class="st-num">#</th>
                            <th>Name</th>
                            <th class="st-num">Power</th>
                            <th class="st-num">Furnace</th>
                            <th class="st-num">Jump</th>
                        </tr></thead>
                        <tbody>${prows}</tbody>
                    </table>
                </div>`;
        }

        const kingUid = king && Number(king.uid) ? Number(king.uid) : 0;
        const kingName = king ? escapeHtml(String(king.name || '')) : '';
        const kingHtml = king
            ? `<div class="st-stat">
                <span class="st-stat-label">King</span>
                <strong class="st-stat-value st-stat-value-sm">${
                    kingUid
                        ? `<button type="button" class="st-link st-link-lg" data-action="open-player" data-uid="${kingUid}" data-no-i18n>${kingName}</button>`
                        : `<span data-no-i18n>${kingName}</span>`
                }</strong>
                <span class="st-stat-meta" data-no-i18n>${king.allianceName ? escapeHtml(String(king.allianceName)) : ''}${kingUid ? ` · #${kingUid}` : ''}</span>
               </div>`
            : '';

        const inGameHtml = (rankedPop != null || king || transferNote)
            ? `<h4 class="st-detail-h">In-game figures</h4>
               <div class="st-stat-grid">
                 ${rankedPop != null ? `<div class="st-stat"><span class="st-stat-label">Ranked players</span><strong class="st-stat-value">${fmtFull(rankedPop)}</strong></div>` : ''}
                 ${kingHtml}
                 ${transferNote ? `<div class="st-stat"><span class="st-stat-label">Transfer gate</span><strong class="st-stat-value st-stat-value-sm">${escapeHtml(transferNote)}</strong></div>` : ''}
               </div>`
            : '';

        const updatedAt = (power && power.recorded_at) || (allianceLb && allianceLb.recordedAt) ||
            (stateFacts && stateFacts.factsReadAt) || row.at;

        els.detailBody.innerHTML = `
            <div class="st-detail-title">
                <h3>State ${row.kid}</h3>
                ${row.kid === CFG.myState ? '<span class="st-chip-static is-mine">My State</span>' : ''}
            </div>
            ${cmp ? `<p class="st-detail-sub">Compared with State ${cmp.kid}</p>` : ''}
            ${hint}
            <div class="st-stat-grid">
                <div class="st-stat">
                    <span class="st-stat-label">Rank among States</span>
                    <strong class="st-stat-value">${rankLabel}</strong>
                </div>
                ${statCard('Players', row, 'chiefs', { value: players, base: base('chiefs') })}
                ${statCard('Total Power', row, 'total', { value: totalPower, compact: true, base: base('total'), rank: false })}
                ${statCard('Median Power', row, 'median', { value: medianPower, compact: true, base: base('median'), rank: false })}
                ${statCard('Max Power', row, 'max', { value: maxPower, compact: true, base: base('max'), rank: false })}
                ${statCard('Alliances', row, 'alliances', { base: base('alliances') })}
                ${statCard('Power per Chief', row, 'total', { value: players ? Math.round(totalPower / players) : perChief, compact: true, rank: false, base: perChiefBase })}
                ${statCard('Shielded', row, 'shielded', { rank: false, base: base('shielded') })}
                ${statCard('Recruiting Alliances', row, 'recruiting', { rank: false, base: base('recruiting') })}
            </div>
            ${inGameHtml}
            ${alliancesHtml}
            ${playersHtml}
            ${updatedAt ? `<p class="st-muted st-detail-updated">Updated ${new Date(updatedAt).toLocaleString()}</p>` : ''}`;
    }

    function openDetail(kid) {
        if (!S.rows.has(kid)) return;
        S.listScroll = els.wrap.scrollTop;
        S.view = 'detail';
        S.detailMode = 'state';
        S.detailKid = kid;
        S.detailAid = null;
        S.detailUid = null;
        render();
        els.detailView.scrollTop = 0;
        els.back.focus({ preventScroll: true });
        loadDetail(kid);
    }

    function openAllianceDetail(aid) {
        const id = Number(aid);
        if (!Number.isFinite(id) || id < 1) return;
        S.view = 'detail';
        S.detailMode = 'alliance';
        S.detailAid = id;
        S.detailUid = null;
        render();
        els.detailView.scrollTop = 0;
        els.back.focus({ preventScroll: true });
        loadAlliance(id);
    }

    function openPlayerDetail(uid) {
        const id = Number(uid);
        if (!Number.isFinite(id) || id < 1) return;
        S.view = 'detail';
        S.detailMode = 'player';
        S.detailUid = id;
        S.detailAid = null;
        render();
        els.detailView.scrollTop = 0;
        els.back.focus({ preventScroll: true });
        loadPlayer(id);
    }

    let uidSearchToken = 0;
    async function onUidSubmit(event) {
        event.preventDefault();
        const raw = (els.uidInput.value || '').trim();
        if (raw.length < 2 && !/^\d+$/.test(raw)) {
            els.uidInput.setCustomValidity('Enter a Player ID, player name or alliance');
            els.uidInput.reportValidity();
            return;
        }
        els.uidInput.setCustomValidity('');
        const token = ++uidSearchToken;
        els.uidBtn.disabled = true;
        els.uidBtn.textContent = (window.I18N && I18N.t) ? I18N.t('Searching...') : 'Searching...';
        try {
            const result = await resolvePlayerId(raw, S.ctrl && S.ctrl.signal);
            if (token !== uidSearchToken) return; // a newer search started
            if (result && typeof result === 'object' && result.multiple) {
                // Several matches: show them instead of guessing which one.
                showUidMatches(raw, result.multiple);
                return;
            }
            if (result) {
                if (S.view !== 'detail') S.listScroll = els.wrap.scrollTop;
                openPlayerDetail(result);
                els.uidInput.value = '';
            } else {
                els.uidInput.setCustomValidity('Player not found');
                els.uidInput.reportValidity();
            }
        } finally {
            if (token === uidSearchToken) {
                els.uidBtn.disabled = false;
                els.uidBtn.textContent = (window.I18N && I18N.t) ? I18N.t('Open player') : 'Open player';
            }
        }
    }

    // Several players can share an ID-like search term; let the user pick.
    function showUidMatches(query, results) {
        S.view = 'detail';
        S.detailMode = 'search';
        S.detailKid = null;
        S.detailAid = null;
        S.detailUid = null;
        S.searchResults = results;
        S.searchQuery = query;
        render();
        els.detailView.scrollTop = 0;
        els.back.focus({ preventScroll: true });
    }

    function renderSearchDetail() {
        const results = S.searchResults || [];
        const rows = results.slice(0, 50).map((m) => {
            const kid = Number(m.kid) || null;
            const abbr = escapeHtml(String(m.abbr || ''));
            if (m.kind === 'alliance') {
                const aid = Number(m.aid) || 0;
                const name = escapeHtml(String(m.name || aid || ''));
                return `<tr${aid ? ` class="st-click-row" data-action="open-alliance" data-aid="${aid}" tabindex="0" role="button"` : ''}>
                <td><span data-no-i18n>${name}</span> <span class="st-uid-hint">Alliance</span></td>
                <td class="st-num" data-no-i18n>${kid || '-'}</td>
                <td data-no-i18n>${abbr || '-'}</td>
            </tr>`;
            }
            const uid = Number(m.uid || m.fid || m.playerUid) || 0;
            const nick = escapeHtml(String(m.nick_name || m.nickname || m.nickName || m.name || uid || ''));
            return `<tr${uid ? ` class="st-click-row" data-action="open-player" data-uid="${uid}" tabindex="0" role="button"` : ''}>
                <td><span data-no-i18n>${nick}</span> <span class="st-uid-hint">#${uid}</span></td>
                <td class="st-num" data-no-i18n>${kid || '-'}</td>
                <td data-no-i18n>${abbr || '-'}</td>
            </tr>`;
        }).join('');
        const body = `
            <div class="st-detail-title"><h3>Search results</h3></div>
            <p class="st-detail-sub">"<span data-no-i18n>${escapeHtml(S.searchQuery || '')}</span>"</p>
            ${rows
                ? `<div class="st-mini-table-wrap"><table class="st-mini-table">
                    <thead><tr><th>Name</th><th class="st-num">State</th><th>Alliance</th></tr></thead>
                    <tbody>${rows}</tbody>
                   </table></div>`
                : `<div class="st-detail-hint st-detail-hint-warn"><span>Player not found</span></div>`}`;
        els.detailBody.innerHTML = body;
    }

    function showList() {
        S.view = 'list';
        S.detailMode = 'state';
        S.detailKid = null;
        S.detailAid = null;
        S.detailUid = null;
        render();
        els.wrap.scrollTop = S.listScroll || 0;
    }

    function goBack() {
        if (S.detailMode === 'alliance' || S.detailMode === 'player' || S.detailMode === 'search') {
            S.detailMode = 'state';
            S.detailAid = null;
            S.detailUid = null;
            render();
            els.detailView.scrollTop = 0;
            return;
        }
        showList();
    }

    // The members endpoint may name the list differently or nest it, so look in
    // the usual places instead of only `d.members`.
    function extractMemberList(d) {
        if (!d) return [];
        if (Array.isArray(d)) return d;
        const keys = ['members', 'memberList', 'member_list', 'players', 'roster', 'list', 'items', 'results'];
        const holders = [d, d.data, d.alliance, d.result];
        for (const h of holders) {
            if (!h || typeof h !== 'object') continue;
            for (const k of keys) {
                if (Array.isArray(h[k]) && h[k].length) return h[k];
            }
        }
        // Last resort: any array of objects that look like players.
        for (const h of holders) {
            if (!h || typeof h !== 'object') continue;
            for (const k of Object.keys(h)) {
                const v = h[k];
                if (Array.isArray(v) && v.length && typeof v[0] === 'object' &&
                    ('uid' in v[0] || 'playerUid' in v[0] || 'nick_name' in v[0] || 'nickname' in v[0] || 'name' in v[0])) {
                    return v;
                }
            }
        }
        return [];
    }

    function renderAllianceDetail() {
        const aid = S.detailAid;
        const cached = S.allianceCache.get(aid);
        const loading = !!(cached && cached.loading);
        const err = cached && cached.error;
        const d = cached && cached.data;

        let body = '';

        if (loading && !d) {
            body = `<div class="st-detail-hint"><span class="spinner-inline" aria-hidden="true"></span><span>Loading alliance...</span></div>`;
        } else if (err && !d) {
            body = `<div class="st-detail-hint st-detail-hint-warn"><span>${escapeHtml(err)}</span></div>`;
        } else if (d) {
            const abbr = escapeHtml(String(d.abbr || ''));
            const name = escapeHtml(String(d.name || ''));
            const members = Number(d.memberCount || d.derivedMemberCount) || 0;
            const memberMax = Number(d.memberMax) || 0;
            const power = Number(d.serverPower || d.derivedTotalPower) || 0;
            const powerRank = Number(d.serverPowerRank || d.powerRank) || null;
            const rankedAll = Number(d.rankedAlliances) || null;
            const leaderUid = Number(d.leaderUid) || 0;
            const leaderName = escapeHtml(String(d.leaderName || ''));
            const lv = Number(d.lv) || 0;
            const minLv = Number(d.joinMinLevel) || 0;
            const minPow = Number(d.joinMinPower) || 0;
            const recruit = !!d.publicRecruit;
            const homeKid = Number(d.homeKid) || null;
            const membersList = extractMemberList(d);
            if (!membersList.length) {
                console.warn('State Tracker: no member list in alliance payload. viewerTier:', d.viewerTier, 'Top-level keys:', Object.keys(d));
            }

            const leaderHtml = leaderName
                ? (leaderUid
                    ? `<button type="button" class="st-link st-link-lg" data-action="open-player" data-uid="${leaderUid}" data-no-i18n>${leaderName}</button>
                       <span class="st-uid-hint">#${leaderUid}</span>`
                    : `<span data-no-i18n>${leaderName}</span>`)
                : '-';

            const rankLabel = powerRank
                ? (rankedAll ? `#${fmtFull(powerRank)} of ${fmtFull(rankedAll)}` : `#${fmtFull(powerRank)}`)
                : '-';

            let membersHtml = '';
            if (membersList.length) {
                const mrows = membersList.map((m, i) => {
                    const uid = Number(m.uid || m.playerUid || m.player_uid || m.fid) || 0;
                    const nick = escapeHtml(String(m.nick_name || m.nickname || m.nickName || m.name || uid || ''));
                    const furnace = Number(m.lv || m.stove_lv || m.furnace_lv) || 0;
                    const x = Number.isFinite(Number(m.x)) ? Number(m.x) : null;
                    const y = Number.isFinite(Number(m.y)) ? Number(m.y) : null;
                    const coord = (x != null && y != null) ? `(${x}, ${y})` : '-';
                    const nameCell = uid
                        ? `<button type="button" class="st-link" data-action="open-player" data-uid="${uid}" data-no-i18n>${nick}</button>
                           <span class="st-uid-hint">#${uid}</span>`
                        : `<span data-no-i18n>${nick}</span>`;
                    return `<tr${uid ? ` class="st-click-row" data-action="open-player" data-uid="${uid}" tabindex="0" role="button"` : ''}>
                        <td class="st-num">${i + 1}</td>
                        <td>${nameCell}</td>
                        <td class="st-num">${furnace || '-'}</td>
                        <td class="st-num" data-no-i18n>${coord}</td>
                    </tr>`;
                }).join('');
                membersHtml = `
                    <h4 class="st-detail-h">Members (${fmtFull(membersList.length)})</h4>
                    <div class="st-mini-table-wrap">
                        <table class="st-mini-table">
                            <thead><tr>
                                <th class="st-num">#</th>
                                <th>Name</th>
                                <th class="st-num">Furnace</th>
                                <th class="st-num">Coords</th>
                            </tr></thead>
                            <tbody>${mrows}</tbody>
                        </table>
                    </div>`;
            } else if (members > 0) {
                const tier = String(d.viewerTier || '').toUpperCase();
                const limited = tier && tier !== 'PASS';
                const msg = limited
                    ? `Member list is restricted for this connection (access tier: ${escapeHtml(tier)}).`
                    : 'Member list unavailable';
                membersHtml = `<h4 class="st-detail-h">Members</h4>
                    <div class="st-detail-hint st-detail-hint-warn"><span>${msg}</span></div>`;
            }

            const notice = d.notice ? String(d.notice).trim() : '';
            const manifesto = d.manifesto ? String(d.manifesto).trim() : '';
            const noticeHtml = notice
                ? `<h4 class="st-detail-h">Bulletin</h4><pre class="st-note" data-no-i18n>${escapeHtml(notice)}</pre>`
                : '';
            const manifestoHtml = manifesto
                ? `<h4 class="st-detail-h">Manifesto</h4><pre class="st-note" data-no-i18n>${escapeHtml(manifesto)}</pre>`
                : '';

            body = `
                <div class="st-detail-title">
                    <h3><span class="st-tag">${abbr}</span> <span data-no-i18n>${name}</span></h3>
                </div>
                ${homeKid ? `<p class="st-detail-sub">State ${homeKid}</p>` : ''}
                ${err ? `<div class="st-detail-hint st-detail-hint-warn"><span>${escapeHtml(err)}</span></div>` : ''}
                <div class="st-stat-grid">
                    <div class="st-stat"><span class="st-stat-label">Power</span><strong class="st-stat-value" title="${fmtFull(power)}">${fmtCompact(power)}</strong>
                        <span class="st-stat-meta">${powerRank ? `<span class="st-rankbadge">${rankLabel}</span>` : ''}</span></div>
                    <div class="st-stat"><span class="st-stat-label">Members</span><strong class="st-stat-value">${members}${memberMax ? '/' + memberMax : ''}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Alliance level</span><strong class="st-stat-value">${lv || '-'}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Leader</span><strong class="st-stat-value st-stat-value-sm">${leaderHtml}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Min. level</span><strong class="st-stat-value">${minLv}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Min. power</span><strong class="st-stat-value" title="${fmtFull(minPow)}">${fmtCompact(minPow)}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Recruitment</span><strong class="st-stat-value st-stat-value-sm">
                        <span class="st-chip-static ${recruit ? 'is-open' : 'is-closed'}">${recruit ? 'Open recruitment' : 'Closed recruitment'}</span>
                    </strong></div>
                </div>
                ${noticeHtml}
                ${manifestoHtml}
                ${membersHtml}
                ${d.recordReadAt || d.derivedRecordedAt ? `<p class="st-muted st-detail-updated">Updated ${new Date(d.recordReadAt || d.derivedRecordedAt).toLocaleString()}</p>` : ''}`;
        } else {
            body = `<div class="st-detail-hint st-detail-hint-warn"><span>Could not load alliance detail.</span></div>`;
        }

        els.detailBody.innerHTML = body;
    }

    // ---- Generic "all fields" renderer for player detail ----
    // The player payload has more fields than the summary cards show (history,
    // stats, etc.), and the exact schema can change, so everything not already
    // shown is listed here instead of being dropped.
    function humanizeKey(k) {
        return String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-]+/g, ' ')
            .replace(/^./, (c) => c.toUpperCase());
    }

    function fmtAnyValue(key, v) {
        if (v === null || v === undefined || v === '') return '-';
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        if (typeof v === 'number') {
            if (/pct|ratio|rate$/i.test(key) && Math.abs(v) <= 10) return (v * 100).toFixed(2) + '%';
            return Number.isInteger(v) ? fmtFull(v) : String(Math.round(v * 1000) / 1000);
        }
        if (typeof v === 'string') {
            if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
                const t = new Date(v);
                if (!isNaN(t)) return t.toLocaleString();
            }
            return v;
        }
        return null; // objects / arrays handled by caller
    }

    function renderExtraValue(key, v, depth) {
        const simple = fmtAnyValue(key, v);
        if (simple !== null) return `<span data-no-i18n>${escapeHtml(simple)}</span>`;
        if (Array.isArray(v)) {
            if (!v.length) return '-';
            if (v.every((x) => x === null || typeof x !== 'object')) {
                return `<span data-no-i18n>${escapeHtml(v.map((x) => fmtAnyValue(key, x) ?? '').join(', '))}</span>`;
            }
            const rows = v.slice(0, 100).filter((x) => x && typeof x === 'object');
            const cols = [];
            rows.forEach((r) => Object.keys(r).forEach((c) => { if (!cols.includes(c) && cols.length < 8) cols.push(c); }));
            const head = cols.map((c) => `<th>${escapeHtml(humanizeKey(c))}</th>`).join('');
            const bodyRows = rows.map((r) => `<tr>${cols.map((c) => {
                const cv = r[c];
                const f = fmtAnyValue(c, cv);
                return `<td data-no-i18n>${escapeHtml(f !== null ? f : JSON.stringify(cv))}</td>`;
            }).join('')}</tr>`).join('');
            const more = v.length > rows.length ? `<p class="st-muted">+${v.length - rows.length} more</p>` : '';
            return `<div class="st-mini-table-wrap"><table class="st-mini-table"><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table></div>${more}`;
        }
        if (typeof v === 'object') {
            if (depth >= 2) return `<pre class="st-note" data-no-i18n>${escapeHtml(JSON.stringify(v, null, 1))}</pre>`;
            return renderExtraFields(v, [], depth + 1);
        }
        return '-';
    }

    function renderExtraFields(obj, skip, depth) {
        const skipSet = new Set(skip || []);
        const rows = Object.keys(obj || {}).filter((k) => !skipSet.has(k)).map((k) =>
            `<tr><th scope="row">${escapeHtml(humanizeKey(k))}</th><td>${renderExtraValue(k, obj[k], depth || 0)}</td></tr>`
        ).join('');
        if (!rows) return '';
        return `<div class="st-mini-table-wrap"><table class="st-mini-table st-kv-table"><tbody>${rows}</tbody></table></div>`;
    }

    function renderPlayerDetail() {
        const uid = S.detailUid;
        const cached = S.playerCache.get(uid);
        const loading = !!(cached && cached.loading);
        const err = cached && cached.error;
        const payload = cached && cached.data;
        const players = payload && Array.isArray(payload.players) ? payload.players : [];
        const p = players[0] || null;

        let body = '';

        if (loading && !p) {
            body = `<div class="st-detail-hint"><span class="spinner-inline" aria-hidden="true"></span><span>Loading player...</span></div>`;
        } else if (err && !p) {
            body = `<div class="st-detail-hint st-detail-hint-warn"><span>${escapeHtml(err)}</span></div>`;
        } else if (p) {
            const nick = escapeHtml(String(p.nick_name || uid));
            const power = Number(p.current_power) || 0;
            const stove = Number(p.stove_lv || p.furnace_lv) || 0;
            const kid = Number(p.kid) || null;
            const aid = Number(p.aid) || 0;
            const abbr = escapeHtml(String(p.abbr || ''));
            const jump = Number.isFinite(Number(p.last_jump_pct))
                ? (Number(p.last_jump_pct) * 100).toFixed(2) + '%'
                : '-';
            const observed = p.observed_at ? new Date(p.observed_at).toLocaleString() : null;
            const lv = Number(p.lv) || 0;

            const shown = ['nick_name', 'current_power', 'stove_lv', 'furnace_lv', 'kid', 'aid', 'abbr',
                'last_jump_pct', 'observed_at', 'lv'];
            const extraHtml = renderExtraFields(p, shown, 0);
            let extrasHtml = '';
            if (cached.extrasLoading) {
                extrasHtml = `<div class="st-detail-hint"><span class="spinner-inline" aria-hidden="true"></span><span>Loading power, arena and history...</span></div>`;
            } else if (cached.extras) {
                extrasHtml = PLAYER_EXTRAS.map((ex) => {
                    const v = cached.extras[ex.key];
                    if (v === null || v === undefined) {
                        return `<h4 class="st-detail-h">${ex.label}</h4><div class="st-detail-hint st-detail-hint-warn"><span>${ex.label} data unavailable</span></div>`;
                    }
                    const inner = (v && typeof v === 'object' && !Array.isArray(v))
                        ? renderExtraFields(v, ['viewerTier'], 0)
                        : renderExtraValue(ex.key, v, 0);
                    const t = v && v.viewerTier ? String(v.viewerTier).toUpperCase() : '';
                    const lim = t && t !== 'PASS' ? ` <span class="st-muted">(access tier: ${escapeHtml(t)})</span>` : '';
                    return `<h4 class="st-detail-h">${ex.label}${lim}</h4>${inner || '<div class="st-muted">-</div>'}`;
                }).join('');
                console.info('State Tracker player extras:', cached.extras);
            }
            const tier = String((payload && payload.viewerTier) || p.viewerTier || '').toUpperCase();
            const tierNote = (tier && tier !== 'PASS')
                ? `<div class="st-detail-hint st-detail-hint-warn"><span>Some player data may be restricted for this connection (access tier: ${escapeHtml(tier)}).</span></div>`
                : '';
            console.info('State Tracker player payload keys:', Object.keys(payload || {}), 'player keys:', Object.keys(p));

            const allianceBtn = aid
                ? `<button type="button" class="st-tag st-tag-btn" data-action="open-alliance" data-aid="${aid}">${abbr || aid}</button>`
                : (abbr ? `<span class="st-tag">${abbr}</span>` : '-');

            body = `
                <div class="st-detail-title">
                    <h3 data-no-i18n>${nick}</h3>
                </div>
                <p class="st-detail-sub">Player ID <span data-no-i18n>#${uid}</span>${kid ? ` · State ${kid}` : ''}</p>
                ${err ? `<div class="st-detail-hint st-detail-hint-warn"><span>${escapeHtml(err)}</span></div>` : ''}
                <div class="st-stat-grid">
                    <div class="st-stat"><span class="st-stat-label">Power</span><strong class="st-stat-value" title="${fmtFull(power)}">${fmtCompact(power)}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Furnace level</span><strong class="st-stat-value">${stove || lv || '-'}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Alliance</span><strong class="st-stat-value st-stat-value-sm">${allianceBtn}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Last jump</span><strong class="st-stat-value">${jump}</strong></div>
                    <div class="st-stat"><span class="st-stat-label">Player ID</span><strong class="st-stat-value st-stat-value-sm" data-no-i18n>${uid}</strong></div>
                    ${kid ? `<div class="st-stat"><span class="st-stat-label">State</span><strong class="st-stat-value">${kid}</strong></div>` : ''}
                </div>
                ${tierNote}
                ${extraHtml ? `<h4 class="st-detail-h">Full details</h4>${extraHtml}` : ''}
                ${extrasHtml}
                ${observed ? `<p class="st-muted st-detail-updated">Observed ${observed}</p>` : ''}`;
        } else {
            body = `
                <div class="st-detail-title">
                    <h3>Player <span data-no-i18n>${uid}</span></h3>
                </div>
                <div class="st-detail-hint st-detail-hint-warn"><span>${err ? escapeHtml(err) : 'Could not load player detail.'}</span></div>
                <div class="st-stat-grid">
                    <div class="st-stat"><span class="st-stat-label">Player ID</span><strong class="st-stat-value st-stat-value-sm" data-no-i18n>${uid}</strong></div>
                </div>`;
        }

        els.detailBody.innerHTML = body;
    }

    function applySort(key, forceDesc) {
        if (!(key in SORT_KEYS)) return;
        if (key === S.sort && forceDesc == null) S.desc = !S.desc;
        else { S.sort = key; S.desc = forceDesc != null ? forceDesc : SORT_KEYS[key].defaultDesc; }
        S.visible = CFG.firstVisible;
        // Only "Chiefs, high to low" matches the server order, so any other
        // ordering needs every State before the ranking is correct.
        if (S.sort !== 'chiefs' || !S.desc) loadAll();
        else render();
    }

    function onDetailActivate(event) {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        const el = event.target.closest && event.target.closest('[data-action]');
        if (!el) return;
        const action = el.getAttribute('data-action');
        if (action === 'load-all') {
            event.preventDefault();
            loadAll();
            return;
        }
        if (action === 'open-alliance') {
            event.preventDefault();
            event.stopPropagation();
            openAllianceDetail(el.getAttribute('data-aid'));
            return;
        }
        if (action === 'open-player') {
            event.preventDefault();
            event.stopPropagation();
            openPlayerDetail(el.getAttribute('data-uid'));
        }
    }

    function onRowActivate(event) {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        const tr = event.target.closest && event.target.closest('tr[data-kid]');
        if (!tr) return;
        event.preventDefault();
        openDetail(Number(tr.dataset.kid));
    }

    function onHeaderActivate(event) {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        const th = event.target.closest && event.target.closest('th[data-sort]');
        if (!th) return;
        event.preventDefault();
        applySort(th.dataset.sort);
    }

    function showMore() {
        S.visible += CFG.visibleStep;
        const q = S.query.trim();
        if (!q && S.sort === 'chiefs' && S.visible > S.rows.size && !allLoaded()) {
            loadNextPage();
        } else {
            render();
        }
    }

    function onSortChange() {
        const key = els.sort.value in SORT_KEYS ? els.sort.value : 'chiefs';
        applySort(key, SORT_KEYS[key].defaultDesc);
    }

    function onDirToggle() {
        S.desc = !S.desc;
        S.visible = CFG.firstVisible;
        if (!S.desc || S.sort !== 'chiefs') loadAll();
        else render();
    }

    let searchTimer = null;
    function onSearchInput() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            S.query = els.search.value;
            S.visible = CFG.firstVisible;
            const q = S.query.trim();
            const kid = Number(q);
            if (q && Number.isFinite(kid) && String(kid) === q && !S.rows.has(kid)) {
                ensureKidInList(kid).then(() => render());
            }
            render();
        }, 180);
    }

    function onSearchKey(event) {
        if (event.key !== 'Enter') return;
        clearTimeout(searchTimer);
        S.query = els.search.value;
        S.visible = CFG.firstVisible;
        const q = S.query.trim();
        const kid = Number(q);
        if (q && Number.isFinite(kid) && String(kid) === q) {
            // Numeric State ID: fetch that one even if list is partial (~20).
            S.busy = true;
            render();
            ensureKidInList(kid).finally(() => {
                S.busy = false;
                if (!allLoaded()) loadAll();
                else render();
            });
            return;
        }
        if (q && !allLoaded()) loadAll();
        else render();
    }

    function onMyState() {
        els.search.value = String(CFG.myState);
        S.query = els.search.value;
        S.visible = CFG.firstVisible;
        S.busy = true;
        render();
        ensureKidInList(CFG.myState).finally(() => {
            S.busy = false;
            if (!allLoaded()) loadAll();
            else render();
        });
    }

    // After the first page: a search or sort order that needs every State
    // (kept from before a refresh / cache expiry) pulls the remaining pages.
    function loadRestIfNeeded() {
        if ((S.query.trim() || S.sort !== 'chiefs' || !S.desc) && !S.error) loadAll();
    }

    function onRefresh() {
        resetData();
        render();
        loadFirstPage().then(loadRestIfNeeded);
    }

    // ---- Open / close ----
    function openStateTrackerModal() {
        const modal = document.getElementById('state-tracker-modal');
        if (!modal) return;
        trigger = document.activeElement;
        if (!S.ctrl || S.ctrl.signal.aborted) S.ctrl = new AbortController();
        const stale = S.fetchedAt && Date.now() - S.fetchedAt > CFG.cacheMs;
        if (stale) resetData();
        S.view = 'list';
        S.detailKid = null;
        modal.classList.remove('hidden');
        document.body.classList.add('state-tracker-modal-open');
        render();
        if (S.rows.size === 0) loadFirstPage().then(loadRestIfNeeded);
        if (els && els.search) els.search.focus({ preventScroll: true });
    }

    function closeStateTrackerModal() {
        const modal = document.getElementById('state-tracker-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.classList.remove('state-tracker-modal-open');
        // Stop any in-flight bulk loading; pages already received stay cached.
        S.token += 1;
        if (S.ctrl) S.ctrl.abort();
        S.ctrl = null;
        S.busy = false;
        S.progress = null;
        S.loadingAll = null;
        if (trigger && typeof trigger.focus === 'function') trigger.focus();
        trigger = null;
    }

    function init() {
        const modal = document.getElementById('state-tracker-modal');
        if (!modal) return;
        els = {
            search: document.getElementById('st-search-input'),
            sort: document.getElementById('st-sort-select'),
            dir: document.getElementById('st-dir-btn'),
            mine: document.getElementById('st-mine-btn'),
            refresh: document.getElementById('st-refresh-btn'),
            status: document.getElementById('st-status'),
            updated: document.getElementById('st-updated'),
            spinner: document.getElementById('st-spinner'),
            wrap: document.getElementById('st-table-wrap'),
            body: document.getElementById('st-table-body'),
            empty: document.getElementById('st-empty'),
            error: document.getElementById('st-error'),
            errorText: document.getElementById('st-error-text'),
            retry: document.getElementById('st-retry-btn'),
            uidForm: document.getElementById('st-uid-form'),
            uidInput: document.getElementById('st-uid-input'),
            uidBtn: document.getElementById('st-uid-btn'),
            searchAll: document.getElementById('st-search-all-btn'),
            more: document.getElementById('st-more-btn'),
            listView: document.getElementById('st-list-view'),
            detailView: document.getElementById('st-detail-view'),
            detailBody: document.getElementById('st-detail-body'),
            back: document.getElementById('st-back-btn')
        };
        els.headSort = Array.from(modal.querySelectorAll('th[data-sort]'));
        if (Object.values(els).some((el) => !el) || els.headSort.length === 0) {
            console.warn('State Tracker: markup incomplete, feature disabled.');
            return;
        }

        els.uidForm.addEventListener('submit', onUidSubmit);
        els.search.addEventListener('input', onSearchInput);
        els.search.addEventListener('keydown', onSearchKey);
        els.sort.addEventListener('change', onSortChange);
        els.dir.addEventListener('click', onDirToggle);
        els.mine.addEventListener('click', onMyState);
        els.refresh.addEventListener('click', onRefresh);
        els.retry.addEventListener('click', () => { if (S.retry) S.retry(); });
        els.searchAll.addEventListener('click', loadAll);
        els.more.addEventListener('click', showMore);
        els.back.addEventListener('click', goBack);
        els.body.addEventListener('click', onRowActivate);
        els.body.addEventListener('keydown', onRowActivate);
        els.headSort.forEach((th) => {
            th.addEventListener('click', onHeaderActivate);
            th.addEventListener('keydown', onHeaderActivate);
        });
        els.detailBody.addEventListener('click', onDetailActivate);
        els.detailBody.addEventListener('keydown', onDetailActivate);

        // Backdrop click closes (only when the press also started on the backdrop).
        let pressStartedOnBackdrop = false;
        modal.addEventListener('mousedown', (event) => { pressStartedOnBackdrop = event.target === modal; });
        modal.addEventListener('mouseup', (event) => {
            if (event.target === modal && pressStartedOnBackdrop) closeStateTrackerModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || modal.classList.contains('hidden')) return;
            if (S.view === 'detail') goBack();
            else closeStateTrackerModal();
        });

        // The modal text is re-rendered in another language on switch.
        if (window.I18N && typeof I18N.onChange === 'function') I18N.onChange(() => { if (!modal.classList.contains('hidden')) render(); });
    }

    window.openStateTrackerModal = openStateTrackerModal;
    window.closeStateTrackerModal = closeStateTrackerModal;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
