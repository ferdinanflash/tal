// ================= STATE TRACKER (navbar button + own modal) =================
// Lists every Whiteout Survival State with live numbers from WoS Atlas
// (https://wosatlas.com/states/): chiefs, alliances, total/median/max power
// and the top alliance of each State.
//
// Data flow
//   1. The browser calls the WoS Atlas JSON endpoints directly.
//   2. If that is blocked (CORS / network), it falls back to the Supabase edge
//      function `wosatlas-states` (index.ts → supabase/functions/wosatlas-states/),
//      which fetches the same endpoints server-side. Deploy it once to enable
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
        directUrl: 'https://api.wosatlas.com/v1/states/summary',
        apiBase: 'https://api.wosatlas.com/v1',
        proxyFunction: 'wosatlas-states',
        sourceUrl: 'https://wosatlas.com/states/',
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
Compare every State in Whiteout Survival with live data from WoS Atlas. || Bandingkan setiap State di Whiteout Survival dengan data langsung dari WoS Atlas. || 通过 WoS Atlas 的实时数据对比《无尽冬日》中的所有州。 || Ihambing ang bawat State sa Whiteout Survival gamit ang live data mula sa WoS Atlas. || Confronta ogni State di Whiteout Survival con i dati in tempo reale di WoS Atlas. || เปรียบเทียบทุก State ใน Whiteout Survival ด้วยข้อมูลสดจาก WoS Atlas
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
Data from WoS Atlas, an unofficial third-party site. Figures may be incomplete or out of date. || Data dari WoS Atlas, situs pihak ketiga tidak resmi. Angka bisa tidak lengkap atau usang. || 数据来自非官方第三方网站 WoS Atlas，数字可能不完整或已过时。 || Data mula sa WoS Atlas, isang hindi opisyal na third-party na site. Maaaring hindi kumpleto o luma na ang mga numero. || Dati da WoS Atlas, un sito di terze parti non ufficiale. I numeri potrebbero essere incompleti o non aggiornati. || ข้อมูลจาก WoS Atlas ซึ่งเป็นเว็บไซต์บุคคลที่สามที่ไม่เป็นทางการ ตัวเลขอาจไม่ครบถ้วนหรือล้าสมัย
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
Open on WoS Atlas || Buka di WoS Atlas || 在 WoS Atlas 打开 || Buksan sa WoS Atlas || Apri su WoS Atlas || เปิดใน WoS Atlas
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
        mode: null,             // 'direct' | 'proxy' once one of them worked
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
        detailKid: null,
        listScroll: 0,
        // kid -> { fetchedAt, state, power, alliances, error, loading }
        detailCache: new Map()
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

    async function fetchPage(offset, signal) {
        const params = { sort: 'chiefs', desc: true, limit: CFG.pageSize, offset };
        let directError = null;

        if (S.mode !== 'proxy') {
            try {
                const qs = new URLSearchParams({ sort: 'chiefs', desc: 'true', limit: String(CFG.pageSize), offset: String(offset) });
                const res = await fetch(`${CFG.directUrl}?${qs}`, { headers: { accept: 'application/json' }, signal });
                if (!res.ok) throw new Error('http-' + res.status);
                const json = validate(await res.json());
                S.mode = 'direct';
                return json;
            } catch (err) {
                if (err && err.name === 'AbortError') throw err;
                if (S.mode === 'direct') throw err;   // direct worked before: a transient failure, don't switch
                directError = err;
            }
        }

        const client = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!client) throw directError || new Error('unavailable');
        const { data, error } = await client.functions.invoke(CFG.proxyFunction, { body: params });
        if (error) throw directError || error;
        const json = validate(data);
        S.mode = 'proxy';
        return json;
    }

    async function loadPage(offset, token) {
        if (S.loadedOffsets.has(offset)) return;
        const json = await fetchPage(offset, S.ctrl && S.ctrl.signal);
        if (token !== S.token) return;            // reset while waiting
        for (const entry of json.entries) {
            const row = normalize(entry);
            if (Number.isFinite(row.kid)) S.rows.set(row.kid, row);
        }
        S.loadedOffsets.add(offset);
        if (Number.isFinite(Number(json.total))) S.total = Number(json.total);
        S.recordedAt = json.recorded_at || S.recordedAt;
        S.fetchedAt = S.fetchedAt || Date.now();
    }

    // ---- Detail endpoints (state / power / alliances), like wosatlas.com ----
    // Direct browser call first; if blocked (CORS / network), fall back to the
    // Supabase edge function `wosatlas-states` with action "detail".
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

    async function fetchDetailDirect(kid, signal) {
        const base = CFG.apiBase;
        const results = await Promise.allSettled([
            fetchJson(`${base}/states/${kid}`, signal),
            fetchJson(`${base}/kingdoms/${kid}/power`, signal),
            fetchJson(`${base}/alliances/leaderboard?limit=${CFG.allianceLimit}&kid=${kid}`, signal)
        ]);
        const state = results[0].status === 'fulfilled' ? results[0].value : null;
        const power = results[1].status === 'fulfilled' ? results[1].value : null;
        const alliances = results[2].status === 'fulfilled' ? results[2].value : null;
        if (!state && !power && !alliances) throw new Error('direct-detail-failed');
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
            if (S.mode === 'proxy') {
                try {
                    payload = await fetchDetailProxy(key, signal);
                } catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    payload = await fetchDetailDirect(key, signal);
                }
            } else {
                try {
                    payload = await fetchDetailDirect(key, signal);
                    if (S.mode !== 'proxy') S.mode = 'direct';
                } catch (err) {
                    if (err && err.name === 'AbortError') throw err;
                    payload = await fetchDetailProxy(key, signal);
                    S.mode = 'proxy';
                }
            }
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

        if (S.view === 'detail' && S.detailKid === key) renderDetail();
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
                S.error = 'Could not load State data. Check your connection and try again.';
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
        S.token += 1;
        if (S.ctrl) S.ctrl.abort();
        S.ctrl = new AbortController();
        S.rows = new Map();
        S.loadedOffsets = new Set();
        S.detailCache = new Map();
        S.total = 0;
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
        if (S.view === 'detail') { renderDetail(); return; }
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

        // Prefer kingdom power figures when available (matches wosatlas.com State page).
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
                const abbr = escapeHtml(String(a.abbr || ''));
                const name = escapeHtml(String(a.name || ''));
                const members = Number.isFinite(Number(a.members)) ? Number(a.members) : 0;
                const memberMax = Number.isFinite(Number(a.memberMax)) ? Number(a.memberMax) : 0;
                const tp = Number(a.totalPower) || 0;
                const mp = Number(a.maxPower) || 0;
                const recruit = a.publicRecruit
                    ? '<span class="st-chip-static is-open">Open</span>'
                    : '<span class="st-chip-static is-closed">Closed</span>';
                return `<tr>
                    <td class="st-num">${rank}</td>
                    <td><span class="st-tag">${abbr}</span></td>
                    <td data-no-i18n>${name}</td>
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
                const nick = escapeHtml(String(p.nick_name || p.uid || ''));
                const pw = Number(p.power) || 0;
                const stove = Number.isFinite(Number(p.stove_lv)) ? Number(p.stove_lv) : '-';
                const jump = Number.isFinite(Number(p.last_jump_pct))
                    ? (Number(p.last_jump_pct) * 100).toFixed(1) + '%'
                    : '-';
                return `<tr>
                    <td class="st-num">${rank}</td>
                    <td data-no-i18n>${nick}</td>
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

        const kingHtml = king
            ? `<div class="st-stat">
                <span class="st-stat-label">King</span>
                <strong class="st-stat-value st-stat-value-sm" data-no-i18n>${escapeHtml(String(king.name || ''))}</strong>
                <span class="st-stat-meta" data-no-i18n>${king.allianceName ? escapeHtml(String(king.allianceName)) : ''}</span>
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

        const atlasLink = `https://wosatlas.com/states/${row.kid}`;
        const updatedAt = (power && power.recorded_at) || (allianceLb && allianceLb.recordedAt) ||
            (stateFacts && stateFacts.factsReadAt) || row.at;

        els.detailBody.innerHTML = `
            <div class="st-detail-title">
                <h3>State ${row.kid}</h3>
                ${row.kid === CFG.myState ? '<span class="st-chip-static is-mine">My State</span>' : ''}
                <a class="st-chip st-atlas-link" href="${atlasLink}" target="_blank" rel="noopener noreferrer">Open on WoS Atlas</a>
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
        S.detailKid = kid;
        render();
        els.detailView.scrollTop = 0;
        els.back.focus({ preventScroll: true });
        loadDetail(kid);
    }

    function showList() {
        S.view = 'list';
        S.detailKid = null;
        render();
        els.wrap.scrollTop = S.listScroll || 0;
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
            render();
        }, 180);
    }

    function onSearchKey(event) {
        if (event.key !== 'Enter') return;
        clearTimeout(searchTimer);
        S.query = els.search.value;
        S.visible = CFG.firstVisible;
        if (S.query.trim() && !allLoaded()) loadAll();
        else render();
    }

    function onMyState() {
        els.search.value = String(CFG.myState);
        S.query = els.search.value;
        S.visible = CFG.firstVisible;
        if (!allLoaded()) loadAll();
        else render();
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

        els.search.addEventListener('input', onSearchInput);
        els.search.addEventListener('keydown', onSearchKey);
        els.sort.addEventListener('change', onSortChange);
        els.dir.addEventListener('click', onDirToggle);
        els.mine.addEventListener('click', onMyState);
        els.refresh.addEventListener('click', onRefresh);
        els.retry.addEventListener('click', () => { if (S.retry) S.retry(); });
        els.searchAll.addEventListener('click', loadAll);
        els.more.addEventListener('click', showMore);
        els.back.addEventListener('click', showList);
        els.body.addEventListener('click', onRowActivate);
        els.body.addEventListener('keydown', onRowActivate);
        els.headSort.forEach((th) => {
            th.addEventListener('click', onHeaderActivate);
            th.addEventListener('keydown', onHeaderActivate);
        });
        els.detailBody.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="load-all"]')) loadAll();
        });

        // Backdrop click closes (only when the press also started on the backdrop).
        let pressStartedOnBackdrop = false;
        modal.addEventListener('mousedown', (event) => { pressStartedOnBackdrop = event.target === modal; });
        modal.addEventListener('mouseup', (event) => {
            if (event.target === modal && pressStartedOnBackdrop) closeStateTrackerModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || modal.classList.contains('hidden')) return;
            if (S.view === 'detail') showList();
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
