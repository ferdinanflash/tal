// ================= FOUNDRY BATTLE ROSTER (IDN) =================
// Roster, peta, dan strategi Foundry Battle untuk alliance IDN.
// Data roster disimpan di kolom foundry_* pada tabel troops_power (lihat supabase_foundry_roster.sql).
const FOUNDRY_ALLIANCE = 'IDN';
const FOUNDRY_LEGIONS = ['Legion 1', 'Legion 2'];
const FOUNDRY_BATTLE_MAX = 30, FOUNDRY_SUB_MAX = 10;

// Koordinat marker diselaraskan dengan map Foundry baru (554x554 px).
const FOUNDRY_MAP = { src: 'foundry-map.webp', w: 554, h: 554 };
const FOUNDRY_B = {
    foundry: { n: 'Imperial Foundry',        ph: 2, f: 9000, m: 1800, x: 278, y: 278, r: 25, c: '#f59e0b', tip: 'Pusat map. Rally terkuat; lawan akan mengincar ini.' },
    proto1:  { n: 'Prototype Site I',        ph: 1, f: 6000, m: 1200, x: 91, y: 247, r: 18, c: '#a78bfa', tip: 'Poin besar sejak menit 0. Tahan sepanjang battle.' },
    proto2:  { n: 'Prototype Site II',       ph: 1, f: 6000, m: 1200, x: 438, y: 337, r: 18, c: '#a78bfa', tip: 'Poin besar sejak menit 0. Tahan sepanjang battle.' },
    rep1:    { n: 'Repair Facility IV',      ph: 1, f: 3000, m: 600,  x: 361, y: 82, r: 15, c: '#38bdf8', tip: 'Sudut kanan atas (bertuliskan Repair IV di peta game). Cukup 2 holder.' },
    rep2:    { n: 'Repair Facility II',      ph: 1, f: 3000, m: 600,  x: 488, y: 254, r: 15, c: '#38bdf8', tip: 'Sisi kanan. Cukup 2 holder.' },
    rep3:    { n: 'Repair Facility III',     ph: 1, f: 3000, m: 600,  x: 180, y: 477, r: 15, c: '#38bdf8', tip: 'Sudut kiri bawah. Cukup 2 holder.' },
    rep4:    { n: 'Repair Facility I',       ph: 1, f: 3000, m: 600,  x: 26, y: 318, r: 15, c: '#38bdf8', tip: 'Sisi kiri (bertuliskan Repair I di peta game). Cukup 2 holder.' },
    boiler:  { n: 'Boiler Room',             ph: 1, f: 1200, m: 240,  x: 187, y: 83, r: 13, c: '#fb7185', tip: 'Waktu kontrol bangunan -50% (±1 menit, bukan 2). Rebut paling awal.' },
    transit: { n: 'Central Transit Station', ph: 1, f: 1200, m: 240,  x: 365, y: 477, r: 13, c: '#4ade80', tip: 'Cooldown teleport -50%. Kunci mobilitas tim.' },
    muni:    { n: 'Munitions Warehouse',     ph: 2, f: 1200, m: 240,  x: 278, y: 400, r: 13, c: '#facc15', tip: '+15% damage pasukan sendiri, -15% damage musuh. Buka menit 15.' },
    merc:    { n: 'Mercenary Camp',          ph: 2, f: 1200, m: 240,  x: 278, y: 174, r: 13, c: '#f97316', tip: 'Kirim hingga 4 tim serang ke bangunan musuh. Buka menit 15.' },
    roam:    { n: 'Roamer / Pengintai',      ph: 1, f: 0, m: 0, x: 38, y: 42, r: 0, c: '#4ade80', tip: 'Tidak di bangunan: bantu reinforce, serang bangunan musuh yang lemah.' },
    workshop:{ n: 'Weapon Workshop',         ph: 3, f: 0, m: 0, x: 516, y: 42, r: 0, c: '#c084fc', tip: 'Muncul di lokasi acak mulai menit 30. Collector memantau minimap dan merebutnya secepat mungkin.' }
};
const FOUNDRY_KEYS = Object.keys(FOUNDRY_B);

const FOUNDRY_VERIFIED = '27 Okt 2026';
const FOUNDRY_PHASE_RANGE = ['0–15', '15–30', '30–60'];
const foundryL = (id, en) => (typeof foundryLanguage !== 'undefined' && foundryLanguage === 'en') ? en : id;

// Template 30 slot (urut dari terkuat). [role, phase1, phase2]. Target Phase 3 diturunkan di foundryTpl().
const FOUNDRY_TEMPLATE = [
    ['Commander', 'transit', 'foundry'],
    ['Rally Leader', 'proto1', 'foundry'], ['Rally Leader', 'proto2', 'foundry'],
    ['Joiner', 'proto1', 'foundry'], ['Joiner', 'proto2', 'foundry'], ['Joiner', 'proto1', 'foundry'], ['Joiner', 'proto2', 'foundry'],
    ['Holder', 'proto1', 'proto1'], ['Holder', 'proto2', 'proto2'],
    ['Mobile', 'roam', 'foundry'], ['Mobile', 'roam', 'merc'], ['Mobile', 'roam', 'muni'], ['Mobile', 'roam', 'foundry'],
    ['Holder', 'rep1', 'rep1'], ['Holder', 'rep1', 'rep1'], ['Holder', 'rep2', 'rep2'], ['Holder', 'rep2', 'rep2'],
    ['Holder', 'rep3', 'rep3'], ['Holder', 'rep3', 'rep3'], ['Holder', 'rep4', 'rep4'], ['Holder', 'rep4', 'rep4'],
    ['Holder', 'boiler', 'boiler'], ['Holder', 'boiler', 'muni'], ['Holder', 'boiler', 'merc'],
    ['Holder', 'transit', 'transit'], ['Holder', 'transit', 'transit'],
    ['Collector', 'roam', 'roam'], ['Collector', 'roam', 'roam'], ['Collector', 'roam', 'roam'], ['Collector', 'roam', 'roam']
];
// Collector: Phase 2 kumpulkan Arsenal Supplies (roam), Phase 3 buru Weapon Workshop.
function foundryTpl(slot) {
    const t = FOUNDRY_TEMPLATE[slot - 1];
    return t ? { role: t[0], p1: t[1], p2: t[2], p3: t[0] === 'Collector' ? 'workshop' : t[2] } : null;
}

// Minimal pemain per bangunan agar roster dianggap aman (dipakai peringatan roster).
const FOUNDRY_MIN = {
    1: { proto1: 2, proto2: 2, rep1: 2, rep2: 2, rep3: 2, rep4: 2, boiler: 1, transit: 1 },
    2: { foundry: 3, proto1: 1, proto2: 1, rep1: 2, rep2: 2, rep3: 2, rep4: 2, muni: 1, merc: 1, transit: 1 },
    3: { foundry: 3, proto1: 1, proto2: 1, rep1: 2, rep2: 2, rep3: 2, rep4: 2, workshop: 1 }
};
// Checklist kesiapan per pemain, disimpan sebagai bitmask di kolom foundry_ready.
const FOUNDRY_CHECKS = [
    ['Furnace Lv 16+', 'Furnace Lv 16+'],
    ['10+ Advanced Teleporter', '10+ Advanced Teleporter'],
    ['Pet buff aktif', 'Pet buffs active'],
    ['Formasi tersimpan', 'Formations saved'],
    ['March ditarik & Infirmary siap', 'Marches recalled & Infirmary ready']
];
const FOUNDRY_ROLES = ['Commander', 'Rally Leader', 'Joiner', 'Holder', 'Mobile', 'Collector'];
const FOUNDRY_ROLE_COLOR = { Commander: '#f59e0b', 'Rally Leader': '#ef4444', Joiner: '#fb923c', Holder: '#38bdf8', Mobile: '#4ade80', Collector: '#c084fc' };
const FOUNDRY_ROLE_ID = { Commander: 'Komandan', 'Rally Leader': 'Pemimpin Rally', Joiner: 'Anggota Rally', Holder: 'Penjaga', Mobile: 'Mobile', Collector: 'Pengumpul' };

let foundryPlayers = [];
let foundryExt = true;         // false bila supabase_foundry_p3.sql belum dijalankan
let foundryTab = 'Legion 1';   // 'Legion 1' | 'Legion 2' | 'map' | 'strategy' | 'checklist'
let foundryMapLegion = 'Legion 1';
let foundryPhase = 1;
let foundrySelected = 'foundry';
let foundryTaskMarksOn = true;
let foundryTaskFilters = new Set(FOUNDRY_ROLES);

function foundryCanEdit() { return typeof canEditAlliance === 'function' && canEditAlliance(FOUNDRY_ALLIANCE); }
function foundryName(key) { return (FOUNDRY_B[key] || {}).n || '-'; }
function foundryPower(p) { return canViewSensitive() ? Number(p.troops_power || 0).toLocaleString('en-US') : MASKED_TEXT; }
function foundrySetPlayers(data) {
    foundryPlayers = data || [];
    foundryExt = !foundryPlayers.length || ('foundry_p3' in foundryPlayers[0]);
}

// Target efektif pemain pada fase tertentu. Bangunan yang belum terbuka pada fase itu dianggap 'roam'.
function foundryTarget(p, phase) {
    let k = phase === 1 ? p.foundry_p1 : phase === 2 ? p.foundry_p2 : (p.foundry_p3 || p.foundry_p2);
    if (k && FOUNDRY_B[k] && FOUNDRY_B[k].ph > phase) k = 'roam';
    return k || null;
}
function foundryPatchFor(legion, status, slot) {
    const t = status === 'Battle' ? foundryTpl(slot) : null;
    const patch = { foundry_legion: legion, foundry_status: status, foundry_slot: slot,
        foundry_role: t ? t.role : 'Substitute', foundry_p1: t ? t.p1 : null, foundry_p2: t ? t.p2 : null };
    if (foundryExt) { patch.foundry_p3 = t ? t.p3 : null; patch.foundry_cover = null; }
    return patch;
}
function foundryNullPatch() {
    const patch = { foundry_legion: null, foundry_status: null, foundry_slot: null, foundry_role: null, foundry_p1: null, foundry_p2: null };
    if (foundryExt) { patch.foundry_p3 = null; patch.foundry_cover = null; }
    return patch;
}

// Urutan prioritas slot template bila pemain kurang dari 30: inti dulu (Commander, Rally Leader,
// penjaga Prototype, Joiner), lalu Boiler/Transit, satu penjaga tiap Repair, Mobile, penjaga kedua,
// dan terakhir Collector.
const FOUNDRY_PRIORITY = [1, 2, 3, 8, 9, 4, 5, 6, 7, 22, 25, 14, 16, 18, 20, 10, 11, 12, 13, 15, 17, 19, 21, 23, 24, 26, 27, 28, 29, 30];
function foundryPlanTasks(n) {
    return FOUNDRY_PRIORITY.slice(0, Math.max(0, Math.min(n, FOUNDRY_BATTLE_MAX))).sort((a, b) => a - b).map(foundryTpl);
}
function foundryShortages(list) {
    const out = [];
    [1, 2, 3].forEach(ph => Object.entries(FOUNDRY_MIN[ph]).forEach(([key, min]) => {
        const n = list.filter(o => foundryTarget(o, ph) === key).length;
        if (n < min) out.push(`P${ph} ${foundryName(key)} ${n}/${min}`);
    }));
    return out;
}
function foundryFmtPower(n) {
    if (!canViewSensitive()) return MASKED_TEXT;
    n = Number(n) || 0;
    return n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n);
}

async function openFoundry() {
    document.getElementById('alliance-menu-page').classList.add('hidden');
    document.getElementById('troops-table-page').classList.add('hidden');
    document.getElementById('foundry-page').classList.remove('hidden');
    document.getElementById('foundry-admin-bar').classList.toggle('hidden', !foundryCanEdit());
    await foundryLoad();
}

function closeFoundry() {
    document.getElementById('foundry-page').classList.add('hidden');
    showAllianceMenu();
}

async function foundryLoad() {
    const client = getSupabase();
    if (!client) return;
    const { data, error } = await client.from('troops_power').select('*')
        .eq('alliance', FOUNDRY_ALLIANCE).order('troops_power', { ascending: false });
    if (error) { showToast('Gagal memuat data pemain IDN', 'error'); return; }
    foundrySetPlayers(data);
    foundryRender();
}

function foundryInRoster(p) { return !!p.foundry_legion && !!p.foundry_status; }
function foundryFind(legion, status, slot) {
    return foundryPlayers.find(p => p.foundry_legion === legion && p.foundry_status === status && Number(p.foundry_slot) === slot);
}

function foundrySetTab(tab) { foundryTab = tab; foundryRender(); }

function foundryRender() {
    document.querySelectorAll('.fy-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === foundryTab));
    const body = document.getElementById('foundry-body');
    if (FOUNDRY_LEGIONS.includes(foundryTab)) body.innerHTML = foundryRosterHtml(foundryTab);
    else if (foundryTab === 'map') body.innerHTML = foundryMapHtml();
    else if (foundryTab === 'checklist') body.innerHTML = foundryChecklistHtml();
    else body.innerHTML = foundryStrategyHtml();
    foundryApplyLanguage();
}

// ---------- BILINGUAL UI (English / Bahasa Indonesia) ----------
let foundryLanguage = localStorage.getItem('foundry-language') || 'en';
// Pasangan terjemahan [Indonesia, English]. Satu entri bekerja dua arah, jadi tidak ada lagi
// teks yang salah diterjemahkan ke arah sebaliknya. Teks yang tidak ada di daftar dibiarkan apa adanya.
const FOUNDRY_I18N_PAIRS = [
  ['Kembali ke Menu','Back to Menu'],['Penugasan Massal','Bulk Assign'],['Kosongkan Roster','Clear Roster'],
  ['Pemain','Player'],['Cadangan','Substitute'],['Pemain Cadangan','Substitute Players'],
  ['Peta','Map'],['🗺️ Peta','🗺️ Map'],['Strategi','Strategy'],['📖 Strategi','📖 Strategy'],
  ['Roster Foundry Battle','Foundry Battle Roster'],['Aliansi IDN','IDN Alliance'],
  ['Aliansi IDN · 2 Legion · 30 Petarung + 10 Cadangan per Legion','IDN Alliance · 2 Legion · 30 Battle + 10 Cadangan per Legion'],
  ['⚡ Isi Otomatis (by Power)','⚡ Auto-fill (by Power)'],['⚡ Isi Otomatis (berdasarkan Power)','⚡ Auto-fill (by Power)'],
  ['📋 Salin untuk Discord','📋 Copy for Discord'],['Salin untuk Discord','Copy for Discord'],
  ['— kosong —','— empty —'],['kosong','empty'],['belum ada','none assigned'],
  ['Gambaran event','Event overview'],['Peran dalam roster','Roster roles'],['Peran roster','Roster roles'],
  ['Timeline & rencana per phase','Timeline & phase plan'],['Kesalahan umum','Common mistakes'],
  ['Checklist sebelum battle','Pre-battle checklist'],['Taktik inti','Core tactics'],
  ['Bangunan','Building'],['Buka','Opens'],['Terbuka','Opens'],['Poin perebutan pertama','First capture'],['Poin/menit','Points/min'],
  ['Menit 0','Minute 0'],['Menit 15','Minute 15'],
  ['Mark tugas pemain','Player task markers'],['Pilih semua','Select all'],['Matikan semua','Clear all'],
  ['Mark: ON','Markers: ON'],['Mark: OFF','Markers: OFF'],
  ['Pilih Legion dan Phase','Select Legion and Phase'],['Tugas','Task'],['Simpan','Save'],['Batal','Cancel'],['Nomor slot','Slot number'],
  ['Pemain & tugas yang ditetapkan','Players & assigned tasks'],['Tugas / Peran','Task / Role'],
  ['Belum ada pemain Battle yang ditugaskan pada phase ini.','No battle players assigned for this phase.'],
  ['Angka kecil adalah nomor slot roster.','Small numbers indicate roster slot numbers.'],
  ['Mark angka menunjukkan nomor slot pemain di roster untuk target bangunan pada phase terpilih. Arahkan/ketuk mark untuk melihat nama dan tugas.','Numbered markers show roster slots assigned to each building for the selected phase. Hover/tap a marker to view the player name and task.'],
  ['Angka di lingkaran = jumlah pemain yang ditugaskan pada bangunan untuk phase terpilih. Mark kecil = nomor slot pemain; gunakan filter tugas untuk menampilkan peran tertentu.','Numbers in circles show assigned players for the selected phase. Small markers show player slot numbers; use task filters to show selected roles.'],
  ['Peta Foundry Battle','Foundry Battle Map'],
  ['Perbekalan','Supplies'],['PERBEKALAN','SUPPLIES'],['Pengintai','Scout'],
  ['Hanya baca','Read-only'],['Segarkan','Refresh'],['Buka situs','Open site'],
  ['Gagal memuat data pemain IDN','Failed to load IDN player data'],
  ['Anda tidak punya izin mengubah roster IDN.','You do not have permission to edit the IDN roster.'],
  ['Link Live Share Foundry disalin.','Foundry Live Share link copied.'],
  ['Tidak dapat memuat peta. Periksa koneksi atau izin baca Supabase, lalu refresh.','Unable to load map. Check your connection or Supabase read permissions, then refresh.'],
  ['Memuat data roster Foundry…','Loading Foundry roster…'],
  ['Hanya baca · Data dimuat dari Supabase saat dibuka. Refresh otomatis setiap 30 detik.','Read-only · Data loads from Supabase on open. Auto-refreshes every 30 seconds.'],
  ['Menggantikan slot','Replaces slot'],['Siap','Ready'],['Siap semua','Fully ready'],['Ekspor PNG','Export PNG'],['🖼️ Ekspor PNG','🖼️ Export PNG'],
['Pemain Cadangan','Substitute Players']
];
const FOUNDRY_ID_TO_EN = new Map(), FOUNDRY_EN_TO_ID = new Map();
FOUNDRY_I18N_PAIRS.forEach(([id, en]) => {
  if (id === en) return;
  FOUNDRY_ID_TO_EN.set(id, en);
  if (!FOUNDRY_EN_TO_ID.has(en)) FOUNDRY_EN_TO_ID.set(en, id);
});
function foundryT(text) {
  return (foundryLanguage === 'en' ? FOUNDRY_ID_TO_EN : FOUNDRY_EN_TO_ID).get(text) || text;
}
function foundryApplyLanguage(root = document.getElementById('foundry-page')) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => { const raw = n.nodeValue.trim(); if (!raw) return; const translated = foundryT(raw); if (translated !== raw) n.nodeValue = n.nodeValue.replace(raw, translated); });
  const btn = document.getElementById('foundry-language-toggle');
  if (btn) btn.textContent = foundryLanguage === 'en' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English';
}
function foundryToggleLanguage() {
  foundryLanguage = foundryLanguage === 'en' ? 'id' : 'en';
  localStorage.setItem('foundry-language', foundryLanguage);
  foundryRender(); foundryApplyLanguage();
}

// ---------- PERINGATAN ROSTER ----------
function foundryWarnings(legion, phase) {
    const out = [];
    const battle = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle');
    const subs = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute');
    if (!battle.length) return [{ lvl: 'info', msg: foundryL(`${legion} belum punya pemain Battle.`, `${legion} has no battle players yet.`) }];
    if (battle.length < FOUNDRY_BATTLE_MAX) out.push({ lvl: 'info', msg: foundryL(`Slot Battle baru terisi ${battle.length} dari ${FOUNDRY_BATTLE_MAX}.`, `Only ${battle.length} of ${FOUNDRY_BATTLE_MAX} battle slots are filled.`) });
    if (!battle.some(p => p.foundry_role === 'Commander')) out.push({ lvl: 'warn', msg: foundryL('Belum ada Commander.', 'No Commander assigned.') });
    if (!battle.some(p => p.foundry_role === 'Rally Leader')) out.push({ lvl: 'warn', msg: foundryL('Belum ada Rally Leader untuk menyerang Imperial Foundry.', 'No Rally Leader to attack the Imperial Foundry.') });
    const noTarget = battle.filter(p => !p.foundry_role || !p.foundry_p1 || !p.foundry_p2).length;
    if (noTarget) out.push({ lvl: 'warn', msg: foundryL(`${noTarget} pemain Battle belum punya tugas atau target lengkap.`, `${noTarget} battle players have no complete task or target.`) });
    (phase ? [phase] : [1, 2, 3]).forEach(ph => {
        Object.entries(FOUNDRY_MIN[ph]).forEach(([key, min]) => {
            const n = foundryAssigned(legion, key, ph).length;
            if (n < min) out.push({ lvl: 'warn', msg: foundryL(`Phase ${ph}: ${foundryName(key)} baru ${n} dari minimal ${min} pemain.`, `Phase ${ph}: ${foundryName(key)} has ${n} of at least ${min} players.`) });
        });
    });
    if (subs.length < FOUNDRY_SUB_MAX) out.push({ lvl: 'info', msg: foundryL(`Cadangan baru terisi ${subs.length} dari ${FOUNDRY_SUB_MAX}.`, `Only ${subs.length} of ${FOUNDRY_SUB_MAX} substitutes are filled.`) });
    if (foundryExt) {
        const open = subs.filter(p => !p.foundry_cover).length;
        if (open) out.push({ lvl: 'info', msg: foundryL(`${open} cadangan belum punya slot yang digantikan.`, `${open} substitutes have no slot to replace.`) });
    }
    return out;
}
function foundryWarningsHtml(legion, phase) {
    const w = foundryWarnings(legion, phase);
    if (!w.length) return `<div class="fy-warn-box fy-ok">✅ ${foundryL('Roster ' + legion + ' lengkap, semua bangunan punya pemain yang cukup.', legion + ' roster is complete; every building has enough players.')}</div>`;
    return `<div class="fy-warn-box"><strong>⚠️ ${foundryL('Peringatan roster', 'Roster warnings')} · ${legion}${phase ? ' · Phase ' + phase : ''}</strong><ul>${w.map(x => `<li class="fy-w-${x.lvl}">${escapeHtml(x.msg)}</li>`).join('')}</ul></div>`;
}
function foundryExtNotice() {
    return foundryExt ? '' : `<div class="fy-warn-box"><strong>ℹ️ ${foundryL('Kolom baru belum ada', 'New columns missing')}</strong><p>${foundryL('Jalankan supabase_foundry_p3.sql di Supabase SQL Editor agar target Phase 3, cadangan pengganti, dan checklist aktif.', 'Run supabase_foundry_p3.sql in the Supabase SQL Editor to enable Phase 3 targets, substitute cover and the checklist.')}</p></div>`;
}

// ---------- KALKULASI TUGAS ----------
function foundryToolsHtml(legion) {
    if (!foundryCanEdit()) return '';
    return `<div class="fy-controls"><button class="btn-apply" type="button" onclick="foundryRecalcTasks('${legion}')">🧮 ${foundryL('Hitung Tugas Otomatis', 'Auto-calculate tasks')}</button></div>`;
}
function foundrySummaryHtml(legion) {
    const battle = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle');
    if (!battle.length) return '';
    const pw = ps => ps.reduce((t, p) => t + (Number(p.troops_power) || 0), 0);
    const roleBadges = FOUNDRY_ROLES.map(r => {
        const ps = battle.filter(p => p.foundry_role === r);
        return `<span class="fy-badge fy-b-sub" style="border-color:${FOUNDRY_ROLE_COLOR[r]}">${r}: ${ps.length}${ps.length ? ' · ' + foundryL('rata-rata', 'avg') + ' ' + foundryFmtPower(pw(ps) / ps.length) : ''}</span>`;
    }).join('');
    const keys = FOUNDRY_KEYS.filter(k => [1, 2, 3].some(ph => foundryAssigned(legion, k, ph).length || (FOUNDRY_MIN[ph][k])));
    const cell = (k, ph) => {
        const ps = foundryAssigned(legion, k, ph), min = FOUNDRY_MIN[ph][k] || 0;
        if (FOUNDRY_B[k].ph > ph && !ps.length) return '<td class="fy-sum-na">–</td>';
        const cls = min ? (ps.length >= min ? 'fy-sum-ok' : 'fy-sum-bad') : '';
        return `<td class="${cls}">${ps.length}${min ? '/' + min : ''}<small>${ps.length ? foundryFmtPower(pw(ps)) : ''}</small></td>`;
    };
    const rows = keys.map(k => `<tr><td>${escapeHtml(FOUNDRY_B[k].n)}</td>${[1, 2, 3].map(ph => cell(k, ph)).join('')}</tr>`).join('');
    const pot = [1, 2, 3].map(ph => {
        let have = 0, max = 0;
        FOUNDRY_KEYS.forEach(k => { const b = FOUNDRY_B[k]; if (!b.m || b.ph > ph) return; max += b.m;
            if (foundryAssigned(legion, k, ph).length >= (FOUNDRY_MIN[ph][k] || 1)) have += b.m; });
        return `<td><b>${have.toLocaleString('en-US')}</b> / ${max.toLocaleString('en-US')}</td>`;
    }).join('');
    return `<details class="fy-sum" open><summary>🧮 ${foundryL('Ringkasan tugas & kalkulasi', 'Task summary & calculation')} · ${legion}</summary>
        <div class="fy-counter">${roleBadges}</div>
        <div class="table-container"><table class="fy-table fy-sum-table"><thead><tr><th>${foundryL('Bangunan', 'Building')}</th><th>Phase 1</th><th>Phase 2</th><th>Phase 3</th></tr></thead>
        <tbody>${rows}<tr class="fy-sum-total"><td>${foundryL('Potensi poin/menit (bangunan yang terjaga cukup)', 'Potential points/min (buildings with enough players)')}</td>${pot}</tr></tbody></table></div>
        <p class="fy-note">${foundryL('Format sel: jumlah pemain / minimal, lalu total Power pemain di bangunan itu. Merah = kurang dari minimal.', 'Cell format: players / minimum, then total power of players there. Red = below minimum.')}</p></details>`;
}
async function foundryRecalcTasks(legion) {
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); return; }
    const ps = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle')
        .sort((a, b) => (Number(b.troops_power) || 0) - (Number(a.troops_power) || 0) || a.foundry_slot - b.foundry_slot);
    if (!ps.length) { showToast(foundryL(`${legion} belum punya pemain Battle.`, `${legion} has no battle players.`), 'info'); return; }
    const plan = foundryPlanTasks(ps.length);
    const assign = ps.map((p, i) => ({ p, pos: plan[i], slot: i + 1 }));
    const short = foundryShortages(plan.map(t => ({ foundry_p1: t.p1, foundry_p2: t.p2, foundry_p3: t.p3 })));
    const msg = foundryL(
        `Hitung ulang tugas ${legion}? ${ps.length} pemain Battle diurutkan berdasarkan Power; nomor slot, role, dan target Phase 1–3 akan ditimpa (cadangan tidak berubah). ` + (short.length ? `Belum cukup penjaga: ${short.slice(0, 6).join(', ')}${short.length > 6 ? ` +${short.length - 6} lagi` : ''}.` : 'Semua bangunan terisi cukup.'),
        `Recalculate ${legion} tasks? ${ps.length} battle players are ranked by power; slot numbers, roles and Phase 1–3 targets will be overwritten (substitutes unchanged). ` + (short.length ? `Not enough players: ${short.slice(0, 6).join(', ')}${short.length > 6 ? ` +${short.length - 6} more` : ''}.` : 'Every building has enough players.'));
    if (!await showCustomConfirmAsync(msg, '#f59e0b')) return;
    const newSlotOf = new Map(assign.map(a => [Number(a.p.foundry_slot), a.slot]));
    const jobs = assign.map(a => {
        const patch = { foundry_slot: a.slot, foundry_role: a.pos.role, foundry_p1: a.pos.p1, foundry_p2: a.pos.p2 };
        if (foundryExt) patch.foundry_p3 = a.pos.p3;
        return { p: a.p, patch };
    });
    if (foundryExt) foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute' && p.foundry_cover).forEach(p => {
        const nc = newSlotOf.get(Number(p.foundry_cover)) || null;
        if (nc !== p.foundry_cover) jobs.push({ p, patch: { foundry_cover: nc } });
    });
    try {
        const client = getSupabase();
        for (let i = 0; i < jobs.length; i += 20) {
            const res = await Promise.all(jobs.slice(i, i + 20).map(j => client.from('troops_power').update(j.patch).eq('id', j.p.id)));
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        jobs.forEach(j => Object.assign(j.p, j.patch));
        showToast(foundryL(`Tugas ${legion} dihitung ulang untuk ${ps.length} pemain.`, `${legion} tasks recalculated for ${ps.length} players.`), 'success');
    } catch (e) {
        showToast(foundryL('Gagal menghitung tugas. Muat ulang halaman lalu periksa data roster.', 'Could not calculate tasks. Reload the page and check the roster data.'), 'error');
        await foundryLoad(); return;
    }
    foundryRender();
}

// ---------- ROSTER ----------
function foundryRosterHtml(legion) {
    const edit = foundryCanEdit();
    const free = foundryPlayers.filter(p => !foundryInRoster(p));
    const opts = (cur) => '<option value="">— kosong —</option>' +
        (cur ? `<option value="${cur.id}" selected>${escapeHtml(cur.nickname)}</option>` : '') +
        free.map(p => `<option value="${p.id}">${escapeHtml(p.nickname)}</option>`).join('');
    const buildingOptions = (current) => '<option value="">— kosong —</option>' + FOUNDRY_KEYS.map(k => `<option value="${k}" ${current === k ? 'selected' : ''}>${escapeHtml(FOUNDRY_B[k].n)}</option>`).join('');
    const targetCell = (p, field, cur, label) => edit && p
        ? `<select class="fy-manual-task" aria-label="${label} ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','${field}',this.value)">${buildingOptions(cur)}</select>`
        : escapeHtml(foundryName(cur));
    const who = (p, status, slot) => edit
        ? `<select aria-label="Player slot ${slot}" onchange="foundryAssign('${legion}','${status}',${slot},this.value)">${opts(p)}</select>`
        : (p ? escapeHtml(p.nickname) : '<span class="fy-empty">kosong</span>');
    const idCell = p => p && canViewSensitive() ? escapeHtml(p.game_id) : (p ? MASKED_TEXT : '');

    const battleRow = (slot) => {
        const p = foundryFind(legion, 'Battle', slot), tpl = foundryTpl(slot);
        const role = p ? (p.foundry_role || '-') : tpl.role;
        const k1 = p ? p.foundry_p1 : tpl.p1, k2 = p ? p.foundry_p2 : tpl.p2, k3 = p ? (p.foundry_p3 || p.foundry_p2) : tpl.p3;
        const roleCell = edit && p
            ? `<select class="fy-manual-task" aria-label="Task for ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','foundry_role',this.value)">${[...FOUNDRY_ROLES, 'Substitute'].map(r => `<option value="${r}" ${role === r ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}</select>`
            : escapeHtml(role);
        return `<tr class="${p ? '' : 'fy-row-empty'}"><td>${slot}</td><td>${who(p, 'Battle', slot)}</td><td>${idCell(p)}</td><td>${p ? foundryPower(p) : ''}</td><td>${roleCell}</td><td>${targetCell(p, 'foundry_p1', k1, 'Phase 1')}</td><td>${targetCell(p, 'foundry_p2', k2, 'Phase 2')}</td>${foundryExt ? `<td>${targetCell(p, 'foundry_p3', k3, 'Phase 3')}</td>` : ''}</tr>`;
    };
    const subRow = (slot) => {
        const p = foundryFind(legion, 'Substitute', slot);
        let cover = '';
        if (p && foundryExt) {
            const c = Number(p.foundry_cover) || 0;
            if (edit) {
                let o = `<option value="">— ${foundryL('belum ditentukan', 'not set')} —</option>`;
                for (let i = 1; i <= FOUNDRY_BATTLE_MAX; i++) {
                    const b = foundryFind(legion, 'Battle', i);
                    o += `<option value="${i}" ${c === i ? 'selected' : ''}>#${i} ${b ? escapeHtml(b.nickname) + ' (' + escapeHtml(b.foundry_role || '-') + ')' : '(kosong)'}</option>`;
                }
                cover = `<select class="fy-manual-task" aria-label="Cover for ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','foundry_cover',this.value)">${o}</select>`;
            } else {
                const b = c ? foundryFind(legion, 'Battle', c) : null;
                cover = c ? `#${c}${b ? ' ' + escapeHtml(b.nickname) + ' (' + escapeHtml(b.foundry_role || '-') + ')' : ''}` : '-';
            }
        }
        return `<tr class="${p ? '' : 'fy-row-empty'}"><td>${slot}</td><td>${who(p, 'Substitute', slot)}</td><td>${idCell(p)}</td><td>${p ? foundryPower(p) : ''}</td>${foundryExt ? `<td>${cover}</td>` : ''}</tr>`;
    };
    const battleHead = `<thead><tr><th>#</th><th>Pemain</th><th>Game ID</th><th>Power</th><th>Role</th><th>Phase 1</th><th>${foundryExt ? 'Phase 2' : 'Phase 2/3'}</th>${foundryExt ? '<th>Phase 3</th>' : ''}</tr></thead>`;
    const subHead = `<thead><tr><th>#</th><th>Pemain</th><th>Game ID</th><th>Power</th>${foundryExt ? `<th>${foundryL('Menggantikan slot', 'Replaces slot')}</th>` : ''}</tr></thead>`;
    const nb = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle').length;
    const ns = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute').length;
    let battle = '', subs = '';
    for (let i = 1; i <= FOUNDRY_BATTLE_MAX; i++) battle += battleRow(i);
    for (let i = 1; i <= FOUNDRY_SUB_MAX; i++) subs += subRow(i);
    return `${foundryExtNotice()}${foundryWarningsHtml(legion)}${foundryToolsHtml(legion)}${foundrySummaryHtml(legion)}
        <div class="fy-counter"><span class="fy-badge fy-b-battle">Battle ${nb} / ${FOUNDRY_BATTLE_MAX}</span><span class="fy-badge fy-b-sub">Cadangan ${ns} / ${FOUNDRY_SUB_MAX}</span></div>
        <div class="table-container"><table class="fy-table">${battleHead}<tbody>${battle}</tbody></table></div>
        <h3 class="fy-h">Pemain Cadangan</h3>
        <p class="fy-note">${foundryL('Cadangan baru bisa masuk battlefield setelah menit 3. Tentukan slot yang akan digantikan sebelum battle.', 'Substitutes can only enter the battlefield after minute 3. Decide which slot each one replaces before the battle.')}</p>
        <div class="table-container"><table class="fy-table">${subHead}<tbody>${subs}</tbody></table></div>`;
}

async function foundryClear(p) {
    const nulls = foundryNullPatch();
    const { error } = await getSupabase().from('troops_power').update(nulls).eq('id', p.id);
    if (error) throw error;
    Object.assign(p, nulls);
}

async function foundryUpdateTask(playerId, field, value) {
    const allowed = { foundry_role: [...FOUNDRY_ROLES, 'Substitute'], foundry_p1: FOUNDRY_KEYS, foundry_p2: FOUNDRY_KEYS, foundry_p3: FOUNDRY_KEYS };
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); foundryRender(); return; }
    if ((field === 'foundry_p3' || field === 'foundry_cover') && !foundryExt) { showToast('Jalankan supabase_foundry_p3.sql dulu.', 'warning'); foundryRender(); return; }
    let v = value === '' ? null : value;
    if (field === 'foundry_cover') {
        if (v !== null) { v = Number(v); if (!Number.isInteger(v) || v < 1 || v > FOUNDRY_BATTLE_MAX) return; }
    } else {
        if (!Object.prototype.hasOwnProperty.call(allowed, field) || (v && !allowed[field].includes(v))) return;
    }
    const player = foundryPlayers.find(p => String(p.id) === String(playerId));
    if (!player) return;
    const patch = { [field]: v };
    try {
        const { error } = await getSupabase().from('troops_power').update(patch).eq('id', player.id);
        if (error) throw error;
        Object.assign(player, patch);
        showToast(foundryLanguage === 'en' ? 'Player task saved.' : 'Tugas pemain berhasil disimpan.', 'success');
    } catch (e) {
        showToast(foundryLanguage === 'en' ? 'Could not save task. Check Supabase permissions and roster columns.' : 'Tugas gagal disimpan. Periksa izin Supabase dan kolom roster.', 'error');
    }
    foundryRender();
}

async function foundryAssign(legion, status, slot, idValue) {
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); return; }
    try {
        const old = foundryFind(legion, status, slot);
        if (old) await foundryClear(old);
        if (idValue) {
            const p = foundryPlayers.find(x => String(x.id) === String(idValue));
            const patch = foundryPatchFor(legion, status, slot);
            const { error } = await getSupabase().from('troops_power').update(patch).eq('id', p.id);
            if (error) throw error;
            Object.assign(p, patch);
        }
    } catch (e) {
        showToast('Gagal menyimpan. Pastikan supabase_foundry_roster.sql (dan supabase_foundry_p3.sql) sudah dijalankan.', 'error');
    }
    foundryRender();
}

// ---------- BULK ASSIGN ----------
// Pilih banyak pemain (yang belum ada di roster Foundry) lalu isi slot kosong berikutnya
// pada Legion + status terpilih, urut Power tertinggi. Role & target phase mengikuti
// FOUNDRY_TEMPLATE, sama seperti assign satu per satu.
const foundryBulkSel = new Set();

function foundryBulkTarget() {
    return { legion: document.getElementById('fy-bulk-legion').value, status: document.getElementById('fy-bulk-status').value };
}
function foundryBulkMax(status) { return status === 'Battle' ? FOUNDRY_BATTLE_MAX : FOUNDRY_SUB_MAX; }
function foundryBulkFreeSlots(legion, status) {
    const slots = [];
    for (let i = 1; i <= foundryBulkMax(status); i++) if (!foundryFind(legion, status, i)) slots.push(i);
    return slots;
}
function foundryBulkCandidates() { return foundryPlayers.filter(p => !foundryInRoster(p)); }
function foundryBulkShown() {
    const q = document.getElementById('fy-bulk-search').value.trim().toLowerCase();
    return foundryBulkCandidates().filter(p => !q ||
        (p.nickname || '').toLowerCase().includes(q) || String(p.game_id || '').toLowerCase().includes(q));
}

function openFoundryBulkAssign() {
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); return; }
    if (foundryBulkCandidates().length === 0) { showToast('Semua pemain IDN sudah masuk roster Foundry.', 'info'); return; }
    foundryBulkSel.clear();
    const defLegion = FOUNDRY_LEGIONS.includes(foundryTab) ? foundryTab : foundryMapLegion;
    document.getElementById('fy-bulk-legion').innerHTML = FOUNDRY_LEGIONS.map(l =>
        `<option value="${l}" ${l === defLegion ? 'selected' : ''}>${l}</option>`).join('');
    document.getElementById('fy-bulk-search').value = '';
    document.getElementById('fy-bulk-modal').classList.remove('hidden');
    foundryBulkUpdate();
    foundryBulkFilter();
}
function closeFoundryBulkAssign() { document.getElementById('fy-bulk-modal').classList.add('hidden'); }

function foundryBulkFilter() {
    const shown = foundryBulkShown();
    document.getElementById('fy-bulk-list').innerHTML = shown.length === 0
        ? '<div class="bulk-remove-empty">Tidak ada pemain yang cocok.</div>'
        : shown.map(p => {
            const id = String(p.id);
            const gid = canViewSensitive() ? escapeHtml(p.game_id) : MASKED_TEXT;
            return `<label class="bulk-remove-item">
                <input type="checkbox" value="${escapeHtml(id)}" ${foundryBulkSel.has(id) ? 'checked' : ''} onchange="foundryBulkToggle(this)">
                <span class="bulk-remove-name">${escapeHtml(p.nickname)}</span>
                <span class="bulk-remove-meta">${gid} · ${foundryPower(p)}</span>
            </label>`;
        }).join('');
    foundryBulkSummary();
}

function foundryBulkCapacity() {
    const t = foundryBulkTarget();
    return foundryBulkFreeSlots(t.legion, t.status).length;
}

function foundryBulkToggle(cb) {
    if (cb.checked) {
        if (foundryBulkSel.size >= foundryBulkCapacity()) {
            cb.checked = false;
            showToast('Slot kosong sudah penuh. Pilih Legion/Status lain atau kurangi pilihan.', 'warning');
            return;
        }
        foundryBulkSel.add(cb.value);
    } else foundryBulkSel.delete(cb.value);
    foundryBulkSummary();
}

function foundryBulkToggleAll(checked) {
    const shown = foundryBulkShown();
    if (!checked) shown.forEach(p => foundryBulkSel.delete(String(p.id)));
    else {
        const cap = foundryBulkCapacity();
        for (const p of shown) { if (foundryBulkSel.size >= cap) break; foundryBulkSel.add(String(p.id)); }
        if (shown.some(p => !foundryBulkSel.has(String(p.id)))) showToast(`Hanya ${cap} slot kosong, jadi pemilihan dibatasi.`, 'info');
    }
    foundryBulkFilter();
}

// Dipanggil saat Legion/Status berubah: segarkan opsi status (sisa slot) dan ringkasan.
function foundryBulkUpdate() {
    const legion = document.getElementById('fy-bulk-legion').value;
    const stEl = document.getElementById('fy-bulk-status');
    const cur = stEl.value || 'Battle';
    stEl.innerHTML = ['Battle', 'Substitute'].map(st => {
        const free = foundryBulkFreeSlots(legion, st).length;
        const label = st === 'Battle' ? 'Battle' : 'Cadangan';
        return `<option value="${st}" ${st === cur ? 'selected' : ''}>${label} (sisa ${free} / ${foundryBulkMax(st)})</option>`;
    }).join('');
    foundryBulkSummary();
}

function foundryBulkSummary() {
    const t = foundryBulkTarget();
    const cap = foundryBulkCapacity(), n = foundryBulkSel.size;
    document.getElementById('fy-bulk-count').innerText = `${n} dipilih`;
    const over = n > cap;
    document.getElementById('fy-bulk-info').innerText = cap === 0
        ? `${t.legion} ${t.status === 'Battle' ? 'Battle' : 'Cadangan'} sudah penuh.`
        : over ? `Pilihan (${n}) melebihi slot kosong (${cap}). Kurangi pilihan.`
        : `Slot kosong: ${cap}. Pemain mengisi slot kosong terendah lebih dulu.`;
    const btn = document.getElementById('fy-bulk-submit');
    btn.disabled = n === 0 || over;
    btn.innerText = n > 0 ? `Assign Terpilih (${n})` : 'Assign Terpilih';
    const all = document.getElementById('fy-bulk-all'), shown = foundryBulkShown();
    const sel = shown.filter(p => foundryBulkSel.has(String(p.id))).length;
    all.checked = shown.length > 0 && sel === shown.length;
    all.indeterminate = sel > 0 && sel < shown.length;
}

async function foundryBulkSubmit() {
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); return; }
    const { legion, status } = foundryBulkTarget();
    const chosen = foundryBulkCandidates().filter(p => foundryBulkSel.has(String(p.id)))
        .sort((a, b) => Number(b.troops_power || 0) - Number(a.troops_power || 0));
    const slots = foundryBulkFreeSlots(legion, status);
    if (chosen.length === 0) return;
    if (chosen.length > slots.length) { showToast('Slot kosong tidak cukup untuk pilihan ini.', 'warning'); foundryBulkSummary(); return; }
    const btn = document.getElementById('fy-bulk-submit');
    btn.disabled = true;
    const jobs = chosen.map((p, i) => ({ p, patch: foundryPatchFor(legion, status, slots[i]) }));
    let done = 0;
    try {
        const client = getSupabase();
        for (let i = 0; i < jobs.length; i += 20) {
            const batch = jobs.slice(i, i + 20);
            const res = await Promise.all(batch.map(j => client.from('troops_power').update(j.patch).eq('id', j.p.id)));
            res.forEach((r, k) => { if (!r.error) { Object.assign(batch[k].p, batch[k].patch); done++; } });
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        showToast(`${done} pemain di-assign ke ${legion} (${status === 'Battle' ? 'Battle' : 'Cadangan'}).`, 'success');
        closeFoundryBulkAssign();
        foundryTab = legion;
    } catch (e) {
        showToast(`Sebagian gagal (${done}/${jobs.length} tersimpan). Pastikan supabase_foundry_roster.sql dan supabase_foundry_p3.sql sudah dijalankan.`, 'error');
        foundryBulkSel.clear(); foundryBulkFilter(); foundryBulkUpdate();
    }
    foundryRender();
}

// Isi otomatis: hanya menyusun ulang pemain yang SUDAH ada di tiap Legion. Legion dan status
// (Battle / Cadangan) setiap pemain dipertahankan; tidak ada pemain baru yang ditambahkan.
// Per Legion + status: urut power -> slot 1..n. Role & target phase dihitung ulang mengikuti FOUNDRY_TEMPLATE.
async function foundryAutoFill() {
    if (!foundryCanEdit()) return;
    if (!foundryPlayers.some(foundryInRoster)) { showToast('Belum ada pemain di roster Foundry. Assign pemain ke Legion dulu.', 'info'); return; }
    if (!await showCustomConfirmAsync('Susun ulang & hitung ulang roster berdasarkan Troops Power? Legion dan status Battle/Cadangan tiap pemain tetap; tidak ada pemain baru yang ditambahkan.', '#f59e0b')) return;
    try {
        const jobs = [];
        FOUNDRY_LEGIONS.forEach(l => ['Battle', 'Substitute'].forEach(st => {
            const max = st === 'Battle' ? FOUNDRY_BATTLE_MAX : FOUNDRY_SUB_MAX;
            foundryPlayers.filter(p => p.foundry_legion === l && p.foundry_status === st)
                .sort((a, b) => Number(b.troops_power || 0) - Number(a.troops_power || 0))
                .slice(0, max)
                .forEach((p, idx) => jobs.push({ p, patch: foundryPatchFor(l, st, idx + 1) }));
        }));
        const client = getSupabase();
        for (let i = 0; i < jobs.length; i += 20) {
            const res = await Promise.all(jobs.slice(i, i + 20).map(j => client.from('troops_power').update(j.patch).eq('id', j.p.id)));
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        jobs.forEach(j => Object.assign(j.p, j.patch));
        showToast('Roster Foundry disusun ulang (Legion & status tetap).', 'success');
    } catch (e) {
        showToast('Gagal mengisi otomatis. Pastikan supabase_foundry_roster.sql dan supabase_foundry_p3.sql sudah dijalankan.', 'error');
    }
    foundryRender();
}

async function foundryClearAll() {
    if (!foundryCanEdit()) return;
    if (!await showCustomConfirmAsync('Kosongkan seluruh roster Foundry IDN?')) return;
    try { for (const p of foundryPlayers.filter(foundryInRoster)) await foundryClear(p); }
    catch (e) { showToast('Gagal mengosongkan roster.', 'error'); }
    foundryRender();
}

// Salin roster untuk Discord. Mode: 'all' (per slot, semua fase) atau 1/2/3 (dikelompokkan per bangunan).
async function foundryCopyText() {
    const mode = (document.getElementById('foundry-copy-mode') || {}).value || 'all';
    const which = (document.getElementById('foundry-copy-legion') || {}).value || 'all';
    const legions = which === 'all' ? FOUNDRY_LEGIONS : [which];
    const lines = ['**FOUNDRY BATTLE ROSTER — IDN**' + (mode === 'all' ? '' : ` — Phase ${mode} (${FOUNDRY_PHASE_RANGE[Number(mode) - 1]} mnt)`)];
    legions.forEach(l => {
        lines.push('', `__${l}__`);
        if (mode === 'all') {
            for (let i = 1; i <= FOUNDRY_BATTLE_MAX; i++) {
                const p = foundryFind(l, 'Battle', i);
                if (p) lines.push(`${i}. ${p.nickname} — ${p.foundry_role} | P1: ${foundryName(foundryTarget(p, 1))} | P2: ${foundryName(foundryTarget(p, 2))} | P3: ${foundryName(foundryTarget(p, 3))}`);
            }
        } else {
            const ph = Number(mode);
            FOUNDRY_KEYS.forEach(k => {
                const ps = foundryAssigned(l, k, ph);
                if (ps.length) lines.push(`**${foundryName(k)}** (${ps.length}): ` + ps.map(p => `#${p.foundry_slot} ${p.nickname}`).join(', '));
            });
        }
        const subs = [];
        for (let i = 1; i <= FOUNDRY_SUB_MAX; i++) {
            const p = foundryFind(l, 'Substitute', i);
            if (p) subs.push(p.nickname + (p.foundry_cover ? ` (→#${p.foundry_cover})` : ''));
        }
        if (subs.length) lines.push(`Cadangan (masuk setelah menit 3): ${subs.join(', ')}`);
    });
    const text = lines.join('\n');
    const ok = typeof fdtCopyText === 'function' ? await fdtCopyText(text)
        : (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text).then(() => true, () => false) : false);
    if (!ok) { showToast('Browser tidak mengizinkan salin otomatis.', 'warning'); return; }
    showToast(text.length > 1900
        ? `Roster disalin (${text.length} karakter, lebih dari batas 2000 Discord: kirim per Legion atau per Phase).`
        : 'Roster disalin (siap tempel ke Discord).', text.length > 1900 ? 'warning' : 'success');
}

// ---------- MAP ----------
function foundryAssigned(legion, key, phase) {
    return foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle' && foundryTarget(p, phase) === key)
        .sort((a, b) => a.foundry_slot - b.foundry_slot);
}

function foundryPickBuilding(key) { foundrySelected = key; foundryRender(); }
function foundrySetPhase(n) { foundryPhase = n; foundryRender(); }
function foundrySetMapLegion(l) { foundryMapLegion = l; foundryRender(); }

function foundryToggleTaskMarks() { foundryTaskMarksOn = !foundryTaskMarksOn; foundryRender(); }
function foundryToggleTaskFilter(role, checked) {
    if (checked) foundryTaskFilters.add(role); else foundryTaskFilters.delete(role);
    foundryRender();
}
function foundrySetAllTaskFilters(checked) {
    foundryTaskFilters = checked ? new Set(FOUNDRY_ROLES) : new Set();
    foundryRender();
}

// Isi SVG peta (gambar + lingkaran bangunan + mark slot). Dipakai halaman utama dan Live Share.
// opts: { interactive, filters (Set | null), marks (bool) }
function foundryMapSvgInner(L, ph, opts = {}) {
    const nodes = Object.entries(FOUNDRY_B).filter(([k, b]) => b.x && !['roam', 'workshop'].includes(k)).map(([k, b]) => {
        const n = foundryAssigned(L, k, ph).length;
        const attrs = opts.interactive ? ` onclick="foundryPickBuilding('${k}')" tabindex="0" role="button" aria-label="${escapeHtml(b.n)}"` : '';
        return `<g class="fy-node ${b.ph <= ph ? '' : 'fy-off'} ${opts.interactive && k === foundrySelected ? 'fy-sel' : ''}"${attrs}>
            <circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.c}" fill-opacity=".55" stroke="${b.c}" stroke-width="8"/>
            <text x="${b.x}" y="${b.y + 16}" text-anchor="middle" class="fy-n">${n}</text></g>`;
    }).join('');
    const marks = opts.marks === false ? '' : Object.entries(FOUNDRY_B).filter(([, b]) => b.x).map(([key, b]) => {
        const ps = foundryAssigned(L, key, ph).filter(p => !opts.filters || opts.filters.has(p.foundry_role || ''));
        return ps.map((p, i) => {
            const col = FOUNDRY_ROLE_COLOR[p.foundry_role] || '#e5e7eb';
            const dx = ((i % 4) - 1.5) * 24, dy = 32 + Math.floor(i / 4) * 23;
            const x = Math.max(17, Math.min(FOUNDRY_MAP.w - 17, Math.max(53, Math.min(FOUNDRY_MAP.w - 53, b.x)) + dx));
            const y = Math.max(14, Math.min(FOUNDRY_MAP.h - 14, b.y + dy));
            const label = String(p.foundry_slot);
            return `<g class="fy-task-mark" tabindex="0" role="img" aria-label="Slot ${label}: ${escapeHtml(p.nickname)} — ${escapeHtml(p.foundry_role || 'Task')}" transform="translate(${x},${y})"><title>Slot ${label} · ${escapeHtml(p.nickname)} · ${escapeHtml(p.foundry_role || 'Task')} · ${escapeHtml(b.n)}</title><rect x="-11" y="-10" width="22" height="20" rx="6" fill="${col}" stroke="#111827" stroke-width="2"/><text x="0" y="5" text-anchor="middle" class="fy-task-mark-text">${label}</text></g>`;
        }).join('');
    }).join('');
    return `<image href="${FOUNDRY_MAP.src}" x="0" y="0" width="${FOUNDRY_MAP.w}" height="${FOUNDRY_MAP.h}"/>${nodes}<g class="fy-task-zone-labels"><text x="38" y="22" class="fy-zone-label">ROAM</text><text x="516" y="22" text-anchor="middle" class="fy-zone-label">WORKSHOP</text></g>${marks}`;
}

function foundryMapLegendHtml(forShare) {
    const en = foundryLanguage === 'en';
    return `<div class="fy-map-legend" aria-label="Map marker legend">
        <h3>${en ? 'Map marker guide' : 'Keterangan mark pada peta'}</h3>
        <p><b>${en ? 'Large number in a circle:' : 'Angka besar di lingkaran:'}</b> ${en ? 'number of players assigned to that building in the selected phase.' : 'jumlah pemain yang ditugaskan ke bangunan tersebut pada fase yang dipilih.'}</p>
        <p><b>${en ? 'Small numbered marker:' : 'Mark kecil bernomor:'}</b> ${forShare ? (en ? 'roster slot number; see the table below for player name, role, and target.' : 'nomor slot roster; lihat tabel di bawah untuk nama pemain, tugas, dan target.') : (en ? 'roster slot number. Tap it to see player, role, and target.' : 'nomor slot roster pemain. Ketuk mark untuk melihat nama, tugas, dan target.')}</p>
        <div class="fy-map-legend-items">${FOUNDRY_ROLES.map(r => `<span><i style="background:${FOUNDRY_ROLE_COLOR[r]}"></i>${en ? r : FOUNDRY_ROLE_ID[r]}</span>`).join('')}</div>
    </div>`;
}

function foundryMapHtml() {
    const L = foundryMapLegion, ph = foundryPhase;
    const b = FOUNDRY_B[foundrySelected];
    const list = (phase) => {
        const ps = foundryAssigned(L, foundrySelected, phase);
        return ps.length ? ps.map(p => `<li>#${p.foundry_slot} ${escapeHtml(p.nickname)} <small>(${escapeHtml(p.foundry_role)})</small></li>`).join('') : '<li class="fy-empty">belum ada</li>';
    };
    const pts = b.m ? `<p><b>${b.f.toLocaleString('en-US')}</b> poin first capture + <b>${b.m.toLocaleString('en-US')}</b> poin/menit</p>` : '';
    return `${foundryExtNotice()}<div class="fy-controls">
        <button class="btn-apply" type="button" onclick="shareFoundryMapLink()">🔗 Live Share Map</button>
        <button class="btn-apply" type="button" onclick="foundryExportPng()">🖼️ ${foundryL('Ekspor PNG', 'Export PNG')}</button>
        ${FOUNDRY_LEGIONS.map(l => `<button class="btn-apply ${l === L ? 'fy-on' : ''}" onclick="foundrySetMapLegion('${l}')">${l}</button>`).join('')}
        ${[1, 2, 3].map(n => `<button class="btn-apply ${n === ph ? 'fy-on' : ''}" onclick="foundrySetPhase(${n})">Phase ${n} (${FOUNDRY_PHASE_RANGE[n - 1]} mnt)</button>`).join('')}</div>
        ${foundryWarningsHtml(L, ph)}
        <div class="fy-task-filter"><div class="fy-task-filter-head"><strong>Mark tugas pemain</strong><button class="btn-apply ${foundryTaskMarksOn ? 'fy-on' : ''}" onclick="foundryToggleTaskMarks()">${foundryTaskMarksOn ? 'Mark: ON' : 'Mark: OFF'}</button><button class="btn-apply" onclick="foundrySetAllTaskFilters(true)">Pilih semua</button><button class="btn-apply" onclick="foundrySetAllTaskFilters(false)">Matikan semua</button></div><div class="fy-task-filter-options">${FOUNDRY_ROLES.map(r => `<label><input type="checkbox" ${foundryTaskFilters.has(r) ? 'checked' : ''} onchange="foundryToggleTaskFilter('${r}',this.checked)"><span>${r}</span></label>`).join('')}</div><small>Mark angka menunjukkan nomor slot pemain di roster untuk target bangunan pada phase terpilih. Arahkan/ketuk mark untuk melihat nama dan tugas.</small></div>
        <svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map" role="img" aria-label="Peta Foundry Battle">${foundryMapSvgInner(L, ph, { interactive: true, filters: foundryTaskFilters, marks: foundryTaskMarksOn })}</svg>
        <div class="fy-extra">${['roam', 'workshop'].map(k => `<button class="btn-apply ${k === foundrySelected ? 'fy-on' : ''}" onclick="foundryPickBuilding('${k}')">${escapeHtml(FOUNDRY_B[k].n)}</button>`).join('')}</div>
        <p class="fy-note">Angka di lingkaran = jumlah pemain yang ditugaskan pada bangunan untuk phase terpilih. Mark kecil = nomor slot pemain; gunakan filter tugas untuk menampilkan peran tertentu.</p>
        ${foundryMapLegendHtml(false)}
        <div class="fy-detail"><h3>${escapeHtml(b.n)}</h3>${pts}<p>${escapeHtml(b.tip)}</p>
            <div class="fy-cols"><div><h4>Phase 1</h4><ul>${list(1)}</ul></div><div><h4>Phase 2</h4><ul>${list(2)}</ul></div><div><h4>Phase 3</h4><ul>${list(3)}</ul></div></div></div>`;
}

// ---------- EKSPOR PNG ----------
function foundryRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
async function foundryExportPng(legion = foundryMapLegion, phase = foundryPhase) {
    try {
        const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = FOUNDRY_MAP.src; });
        const S = 2, W = FOUNDRY_MAP.w, MH = FOUNDRY_MAP.h, HEAD = 44, FOOT = 40;
        const rows = FOUNDRY_KEYS.flatMap(k => foundryAssigned(legion, k, phase).map(p => ({ k, p }))).sort((a, b) => a.p.foundry_slot - b.p.foundry_slot);
        const half = Math.ceil(rows.length / 2), LH = 17;
        const listH = rows.length ? half * LH + 16 : 24;
        const H = HEAD + MH + listH + FOOT;
        const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
        const x = c.getContext('2d'); x.scale(S, S);
        const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, H);
        x.textBaseline = 'middle'; x.textAlign = 'left';
        x.fillStyle = '#fcd34d'; x.font = `bold 15px ${font}`;
        x.fillText(`Foundry Battle · IDN · ${legion} · Phase ${phase} (${FOUNDRY_PHASE_RANGE[phase - 1]} ${foundryL('mnt', 'min')})`, 12, HEAD / 2);
        x.drawImage(img, 0, HEAD, W, MH);
        Object.entries(FOUNDRY_B).filter(([k, b]) => b.x && !['roam', 'workshop'].includes(k)).forEach(([k, b]) => {
            const n = foundryAssigned(legion, k, phase).length;
            x.globalAlpha = b.ph <= phase ? 1 : .3;
            x.beginPath(); x.arc(b.x, HEAD + b.y, b.r, 0, Math.PI * 2);
            x.fillStyle = foundryRgba(b.c, .55); x.fill();
            x.lineWidth = 6; x.strokeStyle = b.c; x.stroke();
            x.textAlign = 'center'; x.font = `800 26px ${font}`;
            x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(String(n), b.x, HEAD + b.y);
            x.fillStyle = '#fff'; x.fillText(String(n), b.x, HEAD + b.y);
            x.globalAlpha = 1;
        });
        x.textAlign = 'center'; x.font = `800 12px ${font}`; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.8)'; x.fillStyle = '#fff';
        [['ROAM', 38], ['WORKSHOP', 516]].forEach(([t, px]) => { x.strokeText(t, px, HEAD + 22); x.fillText(t, px, HEAD + 22); });
        Object.entries(FOUNDRY_B).filter(([, b]) => b.x).forEach(([key, b]) => {
            foundryAssigned(legion, key, phase).forEach((p, i) => {
                const mx = Math.max(17, Math.min(W - 17, Math.max(53, Math.min(W - 53, b.x)) + ((i % 4) - 1.5) * 24));
                const my = HEAD + Math.max(14, Math.min(MH - 14, b.y + 32 + Math.floor(i / 4) * 23));
                x.beginPath(); if (x.roundRect) x.roundRect(mx - 11, my - 10, 22, 20, 6); else x.rect(mx - 11, my - 10, 22, 20);
                x.fillStyle = FOUNDRY_ROLE_COLOR[p.foundry_role] || '#e5e7eb'; x.fill();
                x.lineWidth = 2; x.strokeStyle = '#111827'; x.stroke();
                x.fillStyle = '#111827'; x.font = `900 12px ${font}`; x.textAlign = 'center'; x.fillText(String(p.foundry_slot), mx, my + 1);
            });
        });
        // daftar pemain & tugas
        x.textAlign = 'left'; x.font = `11px ${font}`;
        const ly = HEAD + MH + 8, colW = W / 2 - 14;
        if (!rows.length) { x.fillStyle = '#94a3b8'; x.fillText(foundryL('Belum ada pemain Battle yang ditugaskan pada phase ini.', 'No battle players assigned for this phase.'), 12, ly + 10); }
        rows.forEach(({ k, p }, i) => {
            const cx = 12 + (i < half ? 0 : W / 2), cy = ly + (i % half) * LH + 8;
            x.fillStyle = FOUNDRY_ROLE_COLOR[p.foundry_role] || '#e5e7eb'; x.fillRect(cx, cy - 5, 9, 10);
            let t = `#${p.foundry_slot} ${p.nickname || '-'} · ${p.foundry_role || '-'} → ${FOUNDRY_B[k].n}`;
            while (t.length > 4 && x.measureText(t).width > colW - 14) t = t.slice(0, -2) + '…';
            x.fillStyle = '#e2e8f0'; x.fillText(t, cx + 14, cy);
        });
        // legenda + footer
        const fy = H - FOOT / 2 - 6;
        let lx = 12; x.font = `10px ${font}`;
        FOUNDRY_ROLES.forEach(r => {
            x.fillStyle = FOUNDRY_ROLE_COLOR[r]; x.fillRect(lx, fy - 5, 10, 10);
            x.fillStyle = '#cbd5e1'; x.fillText(r, lx + 14, fy); lx += 14 + x.measureText(r).width + 12;
        });
        x.fillStyle = '#64748b'; x.fillText(`${location.host} · ${new Date().toLocaleString()}`, 12, fy + 16);
        const blob = await new Promise(res => c.toBlob(res, 'image/png'));
        if (!blob) throw new Error('toBlob gagal');
        const name = `foundry-${legion.replace(/\s+/g, '').toLowerCase()}-phase${phase}.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], title: name }); return; }
            catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        showToast(foundryL('Gambar peta disimpan.', 'Map image saved.'), 'success');
    } catch (e) {
        console.warn('Foundry PNG export failed', e);
        showToast(foundryL('Gagal membuat gambar peta.', 'Could not create the map image.'), 'error');
    }
}

// ---------- CHECKLIST KESIAPAN ----------
function foundryReadyBits(p) { return Number(p.foundry_ready) || 0; }
async function foundryToggleReady(playerId, bit, checked) {
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); foundryRender(); return; }
    const p = foundryPlayers.find(x => String(x.id) === String(playerId));
    if (!p || !(bit >= 0 && bit < FOUNDRY_CHECKS.length)) return;
    const next = checked ? (foundryReadyBits(p) | (1 << bit)) : (foundryReadyBits(p) & ~(1 << bit));
    const y = window.scrollY;
    try {
        const { error } = await getSupabase().from('troops_power').update({ foundry_ready: next }).eq('id', p.id);
        if (error) throw error;
        p.foundry_ready = next;
    } catch (e) {
        showToast(foundryL('Checklist gagal disimpan. Periksa izin Supabase dan kolom foundry_ready.', 'Could not save the checklist. Check Supabase permissions and the foundry_ready column.'), 'error');
    }
    foundryRender();
    window.scrollTo(0, y);
}
function foundryChecklistHtml() {
    if (!foundryExt) return foundryExtNotice();
    const edit = foundryCanEdit(), N = FOUNDRY_CHECKS.length;
    const head = `<tr><th>#</th><th>Pemain</th><th>Role</th>${FOUNDRY_CHECKS.map(c => `<th>${escapeHtml(foundryL(c[0], c[1]))}</th>`).join('')}<th>${foundryL('Siap', 'Ready')}</th></tr>`;
    const section = (legion) => {
        const ps = foundryPlayers.filter(p => p.foundry_legion === legion && foundryInRoster(p))
            .sort((a, b) => (a.foundry_status === b.foundry_status ? a.foundry_slot - b.foundry_slot : a.foundry_status === 'Battle' ? -1 : 1));
        if (!ps.length) return `<h3 class="fy-h">${legion}</h3><p class="fy-note">${foundryL('Roster masih kosong.', 'Roster is empty.')}</p>`;
        const totals = FOUNDRY_CHECKS.map((_, i) => ps.filter(p => foundryReadyBits(p) & (1 << i)).length);
        const full = ps.filter(p => foundryReadyBits(p) === (1 << N) - 1).length;
        const rows = ps.map(p => {
            const bits = foundryReadyBits(p), cnt = FOUNDRY_CHECKS.filter((_, i) => bits & (1 << i)).length;
            return `<tr class="${cnt === N ? 'fy-ready-all' : ''}"><td>${p.foundry_status === 'Battle' ? '' : 'C'}${p.foundry_slot}</td><td>${escapeHtml(p.nickname)}</td><td>${escapeHtml(p.foundry_status === 'Battle' ? (p.foundry_role || '-') : 'Substitute')}</td>`
                + FOUNDRY_CHECKS.map((c, i) => `<td><input type="checkbox" aria-label="${escapeHtml(c[1])} ${escapeHtml(p.nickname)}" ${bits & (1 << i) ? 'checked' : ''} ${edit ? '' : 'disabled'} onchange="foundryToggleReady('${p.id}',${i},this.checked)"></td>`).join('')
                + `<td>${cnt}/${N}</td></tr>`;
        }).join('');
        return `<h3 class="fy-h">${legion}</h3>
            <div class="fy-counter"><span class="fy-badge fy-b-battle">${foundryL('Siap semua', 'Fully ready')} ${full} / ${ps.length}</span>${FOUNDRY_CHECKS.map((c, i) => `<span class="fy-badge fy-b-sub">${escapeHtml(foundryL(c[0], c[1]))}: ${totals[i]}/${ps.length}</span>`).join('')}</div>
            <div class="table-container"><table class="fy-table fy-check-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
    };
    return `<p class="fy-note">${foundryL('Centang kesiapan tiap pemain sebelum battle. C = cadangan. Data tersimpan di Supabase dan terlihat oleh semua staf.', 'Tick each player’s readiness before the battle. C = substitute. Data is stored in Supabase and visible to all staff.')}</p>${FOUNDRY_LEGIONS.map(section).join('')}`;
}

// ---------- STRATEGY ----------
function foundryStrategyHtml() {
    const rows = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].m).map(k => { const b = FOUNDRY_B[k];
        return `<tr><td>${escapeHtml(b.n)}</td><td>${b.ph === 1 ? 'Menit 0' : 'Menit 15'}</td><td>${b.f.toLocaleString('en-US')}</td><td>${b.m.toLocaleString('en-US')}</td></tr>`; }).join('');
    return `<div class="fy-guide">
<section><h3>1. Gambaran event</h3><ul><li>Foundry Battle: alliance vs alliance, 60 menit, diadakan tiap 2 minggu. Satu legion = 30 petarung + 10 cadangan; satu pemain hanya boleh di satu legion.</li><li>Syarat: Furnace Lv 16+ dan alliance masuk top 20 power. Satu alliance bisa mendaftarkan maksimal 2 legion; hadiah ranking alliance terutama dihitung dari Legion 1.</li><li>Cadangan baru bisa masuk setelah menit 3. Keluar dari battlefield = menunggu 12 menit untuk masuk lagi.</li><li>Pemenang = Alliance Arsenal Points terbanyak. Poin pribadi hanya untuk hadiah individu (PvP: 40 poin per 10 ribu power saat bertahan, 80 saat menyerang).</li><li>Poin bangunan dibatasi kapasitas; kelebihannya menjadi poin sementara yang jatuh sebagai Arsenal Supplies saat bangunan berpindah tangan, dan bisa diambil kedua pihak.</li><li>Pasukan tidak mati permanen; cedera dipulihkan setelah battle.</li></ul></section>
<section><h3>2. Poin bangunan (total peta penuh: 7.560 poin/menit)</h3><div class="table-container"><table class="fy-table"><thead><tr><th>Bangunan</th><th>Buka</th><th>First capture</th><th>Poin/menit</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fy-note">Waktu kontrol ±2 menit per bangunan (±1 menit bila Boiler Room dikuasai). Bangunan baru memberi poin setelah berhasil dikuasai penuh, jadi jangan setengah-setengah.</p></section>
<section><h3>3. Timeline &amp; rencana per phase</h3><ul>
<li><b>Sebelum mulai:</b> semua sudah siap, formasi tersimpan, tidak ada march tersisa. Begitu battle dibuka, teleport ke bangunan masing-masing.</li>
<li><b>Phase 1 (0–15):</b> 2 Prototype Site, 4 Repair Facility, Boiler Room, Transit Station. Rebut Boiler Room dan Transit paling awal (capture lebih cepat dan teleport lebih sering). Prototype dipegang rally terkuat; Repair cukup 2 holder per sudut.</li>
<li><b>Phase 2 (menit 15):</b> Imperial Foundry, Munitions Warehouse, Mercenary Camp terbuka. Rally Leader dan Joiner (target Phase 2 = Imperial Foundry) teleport ke tengah; holder Prototype dan Repair tetap di tempat. Isi kembali garnisun yang ditinggal.</li>
<li><b>Phase 3 (menit 30–60):</b> Weapon Workshop muncul acak. Collector menjaga minimap dan mengambil poinnya segera. Munitions Warehouse (+15% damage / -15% damage musuh) dipakai bila pertarungan seimbang.</li></ul></section>
<section><h3>4. Peran dalam roster</h3><ul><li><b>Commander (1):</b> pantau skor, beri satu perintah singkat: defend, reinforce, rally, collect, rotate.</li><li><b>Rally Leader / Joiner:</b> inti serangan Imperial Foundry dan penjaga Prototype saat Phase 1.</li><li><b>Mobile:</b> teleport antar titik, tekan bangunan musuh bernilai tinggi, bantu reinforce.</li><li><b>Holder:</b> menduduki dan menjaga bangunan sampai akhir; tidak ikut pindah ke tengah.</li><li><b>Collector:</b> kumpulkan Arsenal Supplies yang jatuh saat bangunan berpindah tangan dan rebut Weapon Workshop. (Commander, Mobile, Collector, Roamer adalah pembagian tugas internal tim, bukan peran resmi game.)</li><li><b>Cadangan (10):</b> tetap online; bisa masuk setelah menit 3. Gantikan petarung yang absen sejak awal, jangan menunggu tengah battle.</li></ul></section>
<section><h3>5. Taktik inti</h3><ul>
<li>Jangan kirim semua pemain kuat ke Imperial Foundry. Prototype + Repair + Outpost (Boiler, Transit, Munitions, Mercenary) yang dipegang penuh sering mengalahkan satu rush ke tengah yang gagal.</li>
<li>Waktu tahan sama pentingnya dengan nilai bangunan: Prototype 10 menit = 12.000 poin berkelanjutan.</li>
<li>Perkuat holder sebelum bangunan jatuh, bukan menunggu kalah lalu rebut ulang (cek di game apakah reinforce diizinkan di battlefield; sumber panduan berbeda-beda).</li>
<li>Serang bangunan musuh yang menyimpan banyak poin sementara; saat direbut, poinnya jatuh sebagai Arsenal Supplies, jadi siapkan Collector di dekatnya.</li>
<li>Skor unggul: lindungi bangunan penghasil poin. Skor tertinggal: incar bangunan bernilai/berisi poin dan Weapon Workshop. Skor ketat: rotasi cepat, hindari pertarungan yang tidak mengubah objektif.</li>
<li>Keluar dari battlefield memicu tunggu 12 menit sebelum masuk kembali; jangan keluar menjelang unlock phase atau akhir battle.</li></ul></section>
<section><h3>6. Checklist sebelum battle</h3><ul><li>Pastikan nama dan legion sudah sesuai roster ini; konfirmasi jam battle di panel event.</li><li>Recall semua march, selesaikan scout, sembuhkan Infirmary, batalkan reinforce yang masuk ke Embassy.</li><li>Simpan speedup penyembuhan; pasang Chief Gear/Hero Gear dan buff tempur terkuat.</li><li>Siapkan formasi tersimpan untuk rally, garnisun, dan serangan solo.</li><li>Pastikan tidak ada fitur yang otomatis mengirim march keluar kota.</li><li>Siapkan minimal 10 Advanced Teleporter dan aktifkan pet buff (march capacity, attack, defense, march speed). Status tiap pemain dicatat di tab ✅ Checklist.</li></ul></section>
<section><h3>7. Kesalahan umum</h3><ul><li>Semua orang menumpuk di Imperial Foundry.</li><li>Lupa mengambil Arsenal Supplies yang jatuh setelah bangunan berpindah tangan.</li><li>Menyerang kota musuh yang tidak mengubah skor.</li><li>Terus menyerang posisi yang sudah kalah.</li><li>Tidak memantau skor sampai terlambat.</li></ul></section>
<p class="fy-note">Mekanik dan angka bisa berubah saat game diperbarui. Cek panel Foundry Battle di game sebelum registrasi.<br>Terakhir dicocokkan dengan panduan komunitas: ${FOUNDRY_VERIFIED} (WoS Helper, mone.gg, BuffBuff, BlueStacks, WoS Tools). Angka dan aturan resmi tetap mengikuti panel event di game.</p></div>`;
}



// ---------- LIVE SHARE MAP (public read-only, freshly loaded from Supabase) ----------
function buildFoundryShareUrl(legion = foundryMapLegion, phase = foundryPhase) {
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.searchParams.set('foundry', 'map');
    u.searchParams.set('legion', FOUNDRY_LEGIONS.includes(legion) ? legion : 'Legion 1');
    u.searchParams.set('phase', String([1,2,3].includes(Number(phase)) ? Number(phase) : 1));
    u.searchParams.set('lang', foundryLanguage);
    return u.toString();
}
async function shareFoundryMapLink() {
    const url = buildFoundryShareUrl();
    const title = `Foundry Live Map — ${foundryMapLegion} — Phase ${foundryPhase}`;
    if (navigator.share) {
        try { await navigator.share({ title, text: title, url }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (await fdtCopyText(url)) showToast('Link Live Share Foundry disalin.', 'success');
    else window.prompt('Salin link Live Share Foundry:', url);
}
async function openFoundrySharedMap(legion, phase) {
    const old = document.getElementById('foundry-shared-map'); if (old) old.remove();
    legion = FOUNDRY_LEGIONS.includes(legion) ? legion : 'Legion 1';
    phase = [1,2,3].includes(Number(phase)) ? Number(phase) : 1;
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang === 'en' || urlLang === 'id') foundryLanguage = urlLang;
    const en = () => foundryLanguage === 'en';
    const wrap = document.createElement('div'); wrap.id = 'foundry-shared-map';
    wrap.innerHTML = `<div class="fdt-shared-bar"><strong>🏭 Foundry Live Map · IDN</strong><span class="fdt-shared-actions"><button id="fy-share-lang">${en()?'🇮🇩 Bahasa Indonesia':'🇬🇧 English'}</button>
      <button id="fy-share-l1">Legion 1</button><button id="fy-share-l2">Legion 2</button>
      <button id="fy-share-p1">Phase 1</button><button id="fy-share-p2">Phase 2</button><button id="fy-share-p3">Phase 3</button>
      <button id="fy-share-png">🖼️ PNG</button>
      <button id="fy-share-refresh">⟳ ${en()?'Refresh':'Segarkan'}</button><button id="fy-share-site">${en()?'Open site':'Buka situs'}</button></span></div>
      <div class="fdt-shared-body" id="fy-share-body"><div class="fdt-shared-msg">${en()?'Loading Foundry roster…':'Memuat data roster Foundry…'}</div></div>
      <div class="fy-share-foot">${en()?'Read-only · Data loads from Supabase on open. Auto-refresh every 30 seconds.':'Hanya baca · Data dimuat dari Supabase saat dibuka. Refresh otomatis setiap 30 detik.'}</div>`;
    document.body.appendChild(wrap); document.body.classList.add('fy-shared-open');
    let timer = null;
    const body = wrap.querySelector('#fy-share-body');
    const load = async () => {
      body.innerHTML = `<div class="fdt-shared-msg">${en()?'Loading Foundry roster…':'Memuat data roster Foundry…'}</div>`;
      try {
        const client = getSupabase(); if (!client) throw new Error('Supabase tidak tersedia');
        const { data, error } = await client.from('troops_power').select('*').eq('alliance', FOUNDRY_ALLIANCE).order('troops_power', {ascending:false});
        if (error) throw error;
        foundrySetPlayers(data); foundryMapLegion = legion; foundryPhase = phase;
        const assignedRows = FOUNDRY_KEYS.flatMap(key => foundryAssigned(legion, key, phase).map(p => ({key, building: FOUNDRY_B[key], player:p})))
          .sort((a,b) => Number(a.player.foundry_slot)-Number(b.player.foundry_slot));
        const taskTitle = en() ? 'Players & assigned tasks' : 'Pemain & tugas yang ditetapkan';
        const noPlayers = en() ? 'No battle players assigned for this phase.' : 'Belum ada pemain Battle yang ditugaskan pada phase ini.';
        const taskRows = assignedRows.length ? `<div class="fy-share-roster-wrap"><h3>${taskTitle}</h3><div class="fy-share-roster-scroll"><table class="fy-share-roster"><thead><tr><th>Slot</th><th>${en()?'Player':'Pemain'}</th><th>${en()?'Task / Role':'Tugas / Peran'}</th><th>Target</th></tr></thead><tbody>${assignedRows.map(({building,player:p})=>`<tr><td>#${escapeHtml(p.foundry_slot)}</td><td>${escapeHtml(p.nickname || '-')}</td><td>${escapeHtml(p.foundry_role || (en()?'Unassigned':'Belum ditentukan'))}</td><td>${escapeHtml(building.n)}</td></tr>`).join('')}</tbody></table></div></div>` : `<p class="fy-note">${noPlayers}</p>`;
        const subs = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute').sort((a,b) => a.foundry_slot - b.foundry_slot);
        const subRows = subs.length ? `<div class="fy-share-roster-wrap"><h3>${en()?'Substitutes (enter after minute 3)':'Cadangan (masuk setelah menit 3)'}</h3><div class="fy-share-roster-scroll"><table class="fy-share-roster"><thead><tr><th>#</th><th>${en()?'Player':'Pemain'}</th><th>${en()?'Replaces slot':'Menggantikan slot'}</th></tr></thead><tbody>${subs.map(p => { const c = Number(p.foundry_cover) || 0, b = c ? foundryFind(legion, 'Battle', c) : null; return `<tr><td>C${escapeHtml(p.foundry_slot)}</td><td>${escapeHtml(p.nickname || '-')}</td><td>${c ? '#' + c + (b ? ' ' + escapeHtml(b.nickname) + ' (' + escapeHtml(b.foundry_role || '-') + ')' : '') : '-'}</td></tr>`; }).join('')}</tbody></table></div></div>` : '';
        const strategyGuide = `<details class="fy-share-strategy"><summary>📖 ${foundryLanguage==='en'?'Strategy Guide':'Panduan Strategi'}</summary><div class="fy-share-strategy-content">${foundryLanguage==='en' ? `<section><h4>Battle overview</h4><ul><li>Foundry Battle is a 60-minute alliance-versus-alliance event. Each legion has up to 30 fighters and 10 substitutes.</li><li>The alliance with the most Alliance Arsenal Points wins. Personal points are for individual rewards.</li><li>Troops are not permanently killed; wounded troops recover after the battle.</li><li>Requires Furnace Lv 16+ and a top-20 power alliance; up to 2 legions, alliance ranking rewards mainly follow Legion 1. Substitutes can enter after minute 3; leaving the battlefield means a 12-minute wait to re-enter.</li></ul></section><section><h4>Phase plan</h4><ul><li><b>Before start:</b> confirm assignments, recall marches, prepare formations and be ready to teleport as buildings unlock.</li><li><b>Phase 1 (0–15 min):</b> prioritize Boiler Room and Central Transit Station; secure Prototype Sites and Repair Facilities with dedicated holders.</li><li><b>Phase 2 (15+ min):</b> Imperial Foundry, Munitions Warehouse and Mercenary Camp unlock. Send rally leaders and joiners to high-value objectives while holders defend their posts.</li><li><b>Phase 3 (30–60 min):</b> watch for Weapon Workshop spawns and assign mobile players or collectors to respond quickly.</li></ul></section><section><h4>Roles</h4><ul><li><b>Commander:</b> monitor score and issue concise calls: defend, reinforce, rally, collect or rotate.</li><li><b>Rally Leader / Joiner:</b> coordinate attacks on priority objectives.</li><li><b>Holder:</b> capture and defend assigned buildings; avoid unnecessary rotations.</li><li><b>Mobile:</b> reinforce weak points and rotate to high-value targets.</li><li><b>Collector:</b> collect Arsenal Supplies and respond to Workshop opportunities.</li><li><b>Substitutes:</b> stay available and replace absent fighters early.</li></ul></section><section><h4>Core tactics</h4><ul><li>Keep point-generating buildings secured; a failed attack can cost both time and sustained points.</li><li>Reinforce holders before a building is lost, rather than reacting after defeat.</li><li>When behind, target valuable enemy buildings and prepare collectors for dropped Arsenal Supplies.</li><li>Avoid leaving the battlefield near phase unlocks or the end because re-entry requires a 12-minute wait.</li></ul></section><section><h4>Pre-battle checklist</h4><ul><li>Verify legion, slot, task and phase targets.</li><li>Recall marches, heal troops and prepare saved formations.</li><li>Bring at least 10 Advanced Teleporters and activate pet buffs.</li><li>Confirm battle time and keep communication concise.</li></ul></section>` : `<section><h4>Gambaran Pertempuran</h4><ul><li>Foundry Battle adalah pertempuran antaraliansi selama 60 menit. Setiap legion memiliki hingga 30 petarung dan 10 pemain cadangan.</li><li>Syarat Furnace Lv 16+ dan alliance top 20 power; maksimal 2 legion, hadiah ranking alliance terutama dari Legion 1. Cadangan bisa masuk setelah menit 3; keluar dari battlefield = tunggu 12 menit untuk masuk lagi.</li><li>Aliansi dengan Alliance Arsenal Points terbanyak menang. Poin pribadi digunakan untuk hadiah individu.</li><li>Pasukan tidak mati permanen; pasukan yang terluka pulih setelah pertempuran.</li></ul></section><section><h4>Rencana per fase</h4><ul><li><b>Sebelum mulai:</b> pastikan penugasan, tarik kembali march, siapkan formasi, dan bersiap teleport saat bangunan terbuka.</li><li><b>Phase 1 (menit 0–15):</b> prioritaskan Boiler Room dan Central Transit Station; amankan Prototype Site dan Repair Facility dengan penjaga khusus.</li><li><b>Phase 2 (menit 15+):</b> Imperial Foundry, Munitions Warehouse, dan Mercenary Camp terbuka. Arahkan pemimpin rally dan joiner ke sasaran bernilai tinggi, sementara holder menjaga pos.</li><li><b>Phase 3 (menit 30–60):</b> pantau kemunculan Weapon Workshop dan tugaskan pemain mobile atau collector untuk merespons cepat.</li></ul></section><section><h4>Peran</h4><ul><li><b>Commander:</b> pantau skor dan berikan perintah singkat: bertahan, perkuat, rally, kumpulkan, atau rotasi.</li><li><b>Rally Leader / Joiner:</b> koordinasikan serangan ke sasaran prioritas.</li><li><b>Holder:</b> rebut dan pertahankan bangunan yang ditugaskan; hindari rotasi yang tidak perlu.</li><li><b>Mobile:</b> perkuat titik lemah dan berpindah ke sasaran bernilai tinggi.</li><li><b>Collector:</b> kumpulkan Arsenal Supplies dan manfaatkan peluang di Workshop.</li><li><b>Cadangan:</b> tetap siap dan gantikan petarung yang absen sejak awal.</li></ul></section><section><h4>Taktik utama</h4><ul><li>Pertahankan bangunan penghasil poin; serangan yang gagal dapat membuang waktu dan poin berkelanjutan.</li><li>Perkuat holder sebelum bangunan jatuh, bukan setelah kalah.</li><li>Jika tertinggal, incar bangunan musuh bernilai tinggi dan siapkan collector untuk mengambil Arsenal Supplies yang jatuh.</li><li>Hindari keluar dari battlefield menjelang pembukaan fase atau akhir pertempuran karena masuk kembali harus menunggu 12 menit.</li></ul></section><section><h4>Checklist sebelum pertempuran</h4><ul><li>Periksa legion, slot, tugas, dan target tiap fase.</li><li>Tarik kembali march, pulihkan pasukan, dan siapkan formasi tersimpan.</li><li>Siapkan minimal 10 Advanced Teleporter dan aktifkan pet buff.</li><li>Pastikan waktu pertempuran dan jaga komunikasi tetap singkat.</li></ul></section>`}</div></details>`;
        body.innerHTML = `<svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map" role="img" aria-label="Foundry Live Map">${foundryMapSvgInner(legion, phase, {})}</svg><p class="fy-note">${legion} · Phase ${phase} (${FOUNDRY_PHASE_RANGE[phase-1]} ${en()?'min':'mnt'}) · ${new Date().toLocaleTimeString()} · ${en()?'Small numbers indicate roster slot numbers.':'Angka kecil adalah nomor slot roster.'}</p>${foundryMapLegendHtml(true)}${taskRows}${subRows}${strategyGuide}`;
      } catch(e) { console.warn('Foundry live share failed',e); body.innerHTML=`<div class="fdt-shared-msg">${en()?'Unable to load map. Check your connection or Supabase read permissions, then refresh.':'Tidak dapat memuat peta. Periksa koneksi atau izin baca Supabase, lalu refresh.'}</div>`; }
      ['l1','l2'].forEach((x,i)=>wrap.querySelector('#fy-share-'+x).classList.toggle('fy-share-active',legion===FOUNDRY_LEGIONS[i]));
      [1,2,3].forEach(n=>wrap.querySelector('#fy-share-p'+n).classList.toggle('fy-share-active',phase===n));
    };
    wrap.querySelector('#fy-share-lang').onclick=()=>{foundryLanguage=foundryLanguage==='en'?'id':'en';localStorage.setItem('foundry-language',foundryLanguage);const u=new URL(location.href);u.searchParams.set('lang',foundryLanguage);history.replaceState({},'',u);openFoundrySharedMap(legion,phase);};
    wrap.querySelector('#fy-share-l1').onclick=()=>{legion='Legion 1';load();}; wrap.querySelector('#fy-share-l2').onclick=()=>{legion='Legion 2';load();};
    [1,2,3].forEach(n=>wrap.querySelector('#fy-share-p'+n).onclick=()=>{phase=n;load();});
    wrap.querySelector('#fy-share-refresh').onclick=load;
    wrap.querySelector('#fy-share-png').onclick=()=>foundryExportPng(legion,phase);
    wrap.querySelector('#fy-share-site').onclick=()=>{location.href=location.origin+location.pathname;};
    await load(); timer=setInterval(load,30000);
    window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);},{once:true});
}
document.addEventListener('DOMContentLoaded',()=>{const q=new URLSearchParams(location.search);if(q.get('foundry')==='map')openFoundrySharedMap(q.get('legion')||'Legion 1',Number(q.get('phase')||1));});
