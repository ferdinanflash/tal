// ================= STATE TRACKER (navbar button + own modal) =================
// Lists every Whiteout Survival State with live numbers from WoS Atlas
// (https://wosatlas.com/states/): chiefs, alliances, total/median/max power
// and the top alliance of each State.
//
// Data flow
//   1. The browser calls the WoS Atlas JSON endpoint directly.
//   2. If that is blocked (CORS / network), it falls back to the Supabase edge
//      function `wosatlas-states` (supabase/functions/wosatlas-states/index.ts),
//      which fetches the same endpoint server-side. Deploy it once to enable
//      the fallback; the feature works without it whenever the direct call works.
//
// The endpoint returns 50 States per request (sorted by chiefs, descending).
// The modal loads the first page when opened and only pulls the remaining
// pages when the user asks for them (search by ID/alliance, another sort
// order), with a few requests at a time, to stay gentle on the third-party API.
(function () {
    'use strict';

    const CFG = {
        directUrl: 'https://api.wosatlas.com/v1/states/summary',
        proxyFunction: 'wosatlas-states',
        sourceUrl: 'https://wosatlas.com/states/',
        pageSize: 50,          // size the endpoint is known to accept
        concurrency: 3,        // parallel page requests when loading all States
        cacheMs: 5 * 60 * 1000,
        myState: 3475,
        firstVisible: 50,
        visibleStep: 50
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
Retry || Coba lagi || 重试 || Subukan muli || Riprova || ลองอีกครั้ง
Data from WoS Atlas, an unofficial third-party site. Figures may be incomplete or out of date. || Data dari WoS Atlas, situs pihak ketiga tidak resmi. Angka bisa tidak lengkap atau usang. || 数据来自非官方第三方网站 WoS Atlas，数字可能不完整或已过时。 || Data mula sa WoS Atlas, isang hindi opisyal na third-party na site. Maaaring hindi kumpleto o luma na ang mga numero. || Dati da WoS Atlas, un sito di terze parti non ufficiale. I numeri potrebbero essere incompleti o non aggiornati. || ข้อมูลจาก WoS Atlas ซึ่งเป็นเว็บไซต์บุคคลที่สามที่ไม่เป็นทางการ ตัวเลขอาจไม่ครบถ้วนหรือล้าสมัย
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
        retry: null
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
            total: Number(e.total_power) || 0,
            median: Number(e.median_power) || 0,
            max: Number(e.max_power) || 0,
            top: t && t.abbr ? {
                abbr: String(t.abbr),
                name: String(t.name || ''),
                power: Number(t.totalPower) || 0,
                members: Number(t.members) || 0,
                memberMax: Number(t.memberMax) || 0
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

    function nextMissingOffset() {
        const limit = S.total || CFG.pageSize;
        for (let o = 0; o < limit; o += CFG.pageSize) {
            if (!S.loadedOffsets.has(o)) return o;
        }
        return null;
    }

    function allLoaded() {
        return S.total > 0 && S.rows.size >= S.total;
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
        if (allLoaded()) return Promise.resolve();
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
        return `<tr class="st-row${mine}">` +
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
        S.sort = els.sort.value in SORT_KEYS ? els.sort.value : 'chiefs';
        S.desc = SORT_KEYS[S.sort].defaultDesc;
        S.visible = CFG.firstVisible;
        // Only "Chiefs, high to low" matches the server order, so any other
        // ordering needs every State before the ranking is correct.
        if (S.sort !== 'chiefs' || !S.desc) loadAll();
        else render();
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
            more: document.getElementById('st-more-btn')
        };
        if (Object.values(els).some((el) => !el)) {
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

        // Backdrop click closes (only when the press also started on the backdrop).
        let pressStartedOnBackdrop = false;
        modal.addEventListener('mousedown', (event) => { pressStartedOnBackdrop = event.target === modal; });
        modal.addEventListener('mouseup', (event) => {
            if (event.target === modal && pressStartedOnBackdrop) closeStateTrackerModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeStateTrackerModal();
        });

        // The modal text is re-rendered in another language on switch.
        if (window.I18N && typeof I18N.onChange === 'function') I18N.onChange(() => { if (!modal.classList.contains('hidden')) render(); });
    }

    window.openStateTrackerModal = openStateTrackerModal;
    window.closeStateTrackerModal = closeStateTrackerModal;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
