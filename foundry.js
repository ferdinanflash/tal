// ================= FOUNDRY BATTLE PLANNER =================
// Dua mode memakai UI yang sama (roster, peta, fase, role, chart, checklist, live edit):
//   - 'foundry' : Foundry Battle IDN (kolom foundry_*)
//   - 'tundra'  : Tundra Arm League Legion 1/2 (kolom legion + legion_role + tundra_*)
// Lihat supabase_foundry_roster.sql / supabase_tundra_foundry.sql
const FOUNDRY_ALLIANCE = 'IDN';
const FOUNDRY_LEGIONS = ['Legion 1', 'Legion 2'];
const TUNDRA_ALLIANCE_B_LEGIONS = ['Legion 1 - Alliance B', 'Legion 2 - Alliance B'];
function isFoundryLegionName(name) {
    return FOUNDRY_LEGIONS.includes(name) || (foundryMode === 'tundra' && TUNDRA_ALLIANCE_B_LEGIONS.includes(name));
}
function foundryLegionList() {
    if (foundryMode === 'tundra') {
        const extra = (typeof isAllianceBEnabled === 'function' && isAllianceBEnabled()) ? TUNDRA_ALLIANCE_B_LEGIONS : [];
        return foundryLockedLegion ? [foundryLockedLegion] : [...FOUNDRY_LEGIONS, ...extra];
    }
    return FOUNDRY_LEGIONS;
}

// Kapasitas dinamis per mode (Foundry IDN = 30/10, Tundra = 30/20)
function foundryBattleMax() { return 30; }
function foundrySubMax() { return foundryMode === 'tundra' ? 20 : 10; }
// Kompatibilitas: baca sebagai angka sesuai mode aktif
Object.defineProperty(window, 'FOUNDRY_BATTLE_MAX', { get() { return foundryBattleMax(); }, configurable: true });
Object.defineProperty(window, 'FOUNDRY_SUB_MAX', { get() { return foundrySubMax(); }, configurable: true });

/** @type {'foundry'|'tundra'} */
let foundryMode = 'foundry';
// Label singkat di judul chart/export: TAL untuk mode Tundra, IDN untuk mode Foundry
function foundryTag() { return foundryMode === 'tundra' ? 'TAL' : 'IDN'; }

const FOUNDRY_MODE_META = {
    foundry: {
        title: 'Foundry Battle Roster',
        subtitleId: 'Aliansi IDN · 2 Legion · 30 Battle + 10 Substitutes per Legion',
        subtitleEn: 'IDN Alliance · 2 Legion · 30 Battle + 10 Substitutes per Legion',
        menuLabel: '🏭 Foundry Battle Roster (IDN)',
        sharePrefix: 'Foundry',
    },
    tundra: {
        title: 'Tundra Arm League — Battle Plan',
        subtitleId: 'Tundra · Legion 1 & 2 · 30 Battle + 20 Substitute · Peta · Fase · Role',
        subtitleEn: 'Tundra · Legion 1 & 2 · 30 Battle + 20 Substitute · Map · Phases · Roles',
        menuLabel: '❄️ Tundra Battle Plan (Legion 1 & 2)',
        sharePrefix: 'Tundra',
    }
};

// Map in-memory foundry_* shape ↔ DB columns for the active mode.
function foundryDbPatch(patch) {
    if (foundryMode !== 'tundra' || !patch || typeof patch !== 'object') return patch;
    const out = {};
    const map = {
        foundry_legion: 'legion',
        foundry_status: 'legion_role',
        foundry_slot: 'tundra_slot',
        foundry_role: 'tundra_role',
        foundry_p1: 'tundra_p1',
        foundry_p2: 'tundra_p2',
        foundry_p3: 'tundra_p3',
        foundry_cover: 'tundra_cover',
        foundry_ready: 'tundra_ready'
    };
    Object.keys(patch).forEach(k => {
        out[map[k] || k] = patch[k];
    });
    return out;
}
function foundryNormalizePlayer(p) {
    if (!p || foundryMode !== 'tundra') return p;
    // Project Tundra columns onto foundry_* so the rest of the UI stays unchanged.
    return Object.assign({}, p, {
        foundry_legion: p.legion || null,
        foundry_status: p.legion_role || null,
        foundry_slot: p.tundra_slot != null ? p.tundra_slot : null,
        foundry_role: p.tundra_role || null,
        foundry_p1: p.tundra_p1 || null,
        foundry_p2: p.tundra_p2 || null,
        foundry_p3: p.tundra_p3 || null,
        foundry_cover: p.tundra_cover != null ? p.tundra_cover : null,
        foundry_ready: p.tundra_ready != null ? p.tundra_ready : 0
    });
}
/** Saat dibuka dari tombol LEGION 1/2, kunci UI ke legion itu saja (tanpa tab legion lain). */
let foundryLockedLegion = null;

function foundryActiveLegion() {
    if (foundryLockedLegion) return foundryLockedLegion;
    if (FOUNDRY_LEGIONS.includes(foundryTab) || TUNDRA_ALLIANCE_B_LEGIONS.includes(foundryTab)) return foundryTab;
    return foundryMapLegion || 'Legion 1';
}

function foundryApplyModeChrome() {
    const meta = FOUNDRY_MODE_META[foundryMode] || FOUNDRY_MODE_META.foundry;
    const page = document.getElementById('foundry-page');
    if (page) {
        page.dataset.foundryMode = foundryMode;
        page.dataset.lockedLegion = foundryLockedLegion || '';
        page.classList.toggle('fy-locked-legion', !!foundryLockedLegion);
    }
    const title = page && page.querySelector('.page-title');
    const sub = page && page.querySelector('.page-subtitle');
    if (foundryMode === 'tundra' && foundryLockedLegion) {
        if (title) title.textContent = foundryLanguage === 'en'
            ? `${foundryLockedLegion} — Tundra Battle Plan`
            : `${foundryLockedLegion} — Rencana Battle Tundra`;
        if (sub) sub.textContent = foundryLanguage === 'en'
            ? `30 Battle + 20 Substitute · Map · Phases · Roles`
            : `30 Battle + 20 Cadangan · Peta · Fase · Role`;
    } else {
        if (title) title.textContent = meta.title;
        if (sub) sub.textContent = foundryLanguage === 'en' ? meta.subtitleEn : meta.subtitleId;
    }
    // Sembunyikan tab Legion yang bukan legion terkunci
    document.querySelectorAll('.fy-tab').forEach(b => {
        const tab = b.getAttribute('data-tab');
        if (foundryLockedLegion && FOUNDRY_LEGIONS.includes(tab) && tab !== foundryLockedLegion) {
            b.classList.add('hidden');
            b.style.display = 'none';
        } else {
            b.classList.remove('hidden');
            b.style.display = '';
        }
    });
}

// Koordinat marker diselaraskan dengan map Foundry baru (554x554 px).
const FOUNDRY_MAP = { src: 'foundry-map.webp', w: 554, h: 554 };
const FOUNDRY_B = {
    foundry: { n: 'Tanur Imperial',          ph: 2, f: 9000, m: 1800, x: 278, y: 278, r: 25, c: '#f59e0b', tip: 'Pusat peta. Rally terkuat; lawan akan mengincar ini.' },
    proto1:  { n: 'Situs Prototipe I',       ph: 1, f: 6000, m: 1200, x: 91, y: 247, r: 18, c: '#a78bfa', tip: 'Poin besar sejak menit 0. Tahan sepanjang pertempuran.' },
    proto2:  { n: 'Situs Prototipe II',      ph: 1, f: 6000, m: 1200, x: 438, y: 337, r: 18, c: '#a78bfa', tip: 'Poin besar sejak menit 0. Tahan sepanjang pertempuran.' },
    rep1:    { n: 'Fasilitas Perbaikan IV',  ph: 1, f: 3000, m: 600,  x: 361, y: 82, r: 15, c: '#38bdf8', tip: 'Sudut kanan atas (bertuliskan Repair IV di peta game). Cukup 2 holder.' },
    rep2:    { n: 'Fasilitas Perbaikan II',  ph: 1, f: 3000, m: 600,  x: 488, y: 254, r: 15, c: '#38bdf8', tip: 'Sisi kanan. Cukup 2 holder.' },
    rep3:    { n: 'Fasilitas Perbaikan III', ph: 1, f: 3000, m: 600,  x: 180, y: 477, r: 15, c: '#38bdf8', tip: 'Sudut kiri bawah. Cukup 2 holder.' },
    rep4:    { n: 'Fasilitas Perbaikan I',   ph: 1, f: 3000, m: 600,  x: 26, y: 318, r: 15, c: '#38bdf8', tip: 'Sisi kiri (bertuliskan Repair I di peta game). Cukup 2 holder.' },
    boiler:  { n: 'Ruang Ketel',             ph: 1, f: 1200, m: 240,  x: 187, y: 83, r: 13, c: '#fb7185', tip: 'Waktu kontrol bangunan -50% (±1 menit, bukan 2). Rebut paling awal.' },
    transit: { n: 'Pos Transit Pusat',       ph: 1, f: 1200, m: 240,  x: 365, y: 477, r: 13, c: '#4ade80', tip: 'Cooldown teleport -50%. Kunci mobilitas tim.' },
    muni:    { n: 'Gudang Amunisi',          ph: 2, f: 1200, m: 240,  x: 278, y: 400, r: 13, c: '#facc15', tip: '+15% damage pasukan sendiri, -15% damage musuh. Buka menit 15.' },
    merc:    { n: 'Kamp Tentara Bayaran',    ph: 2, f: 1200, m: 240,  x: 278, y: 174, r: 13, c: '#f97316', tip: 'Kirim hingga 4 tim serang ke bangunan musuh. Buka menit 15.' },
    roam:    { n: 'Roamer / Pengintai',      ph: 1, f: 0, m: 0, x: 38, y: 42, r: 0, c: '#4ade80', tip: 'Tidak di bangunan: bantu reinforce, serang bangunan musuh yang lemah.' },
    workshop:{ n: 'Weapon Workshop',         ph: 3, f: 0, m: 0, x: 516, y: 42, r: 0, c: '#c084fc', tip: 'Muncul di lokasi acak mulai menit 30. Collector memantau minimap dan merebutnya secepat mungkin.' }
};
const FOUNDRY_KEYS = Object.keys(FOUNDRY_B);
// Tips bangunan & nama Roamer mengikuti bahasa aktif (foundryLanguage dibaca saat dipanggil).
const FOUNDRY_TIP_EN = {
    foundry: 'Center of the map. Strongest rally target; the enemy will come for it.',
    proto1: 'Big points from minute 0. Hold it for the whole battle.',
    proto2: 'Big points from minute 0. Hold it for the whole battle.',
    rep1: 'Top-right corner (labeled Repair IV on the in-game map). 2 holders are enough.',
    rep2: 'Right side. 2 holders are enough.',
    rep3: 'Bottom-left corner. 2 holders are enough.',
    rep4: 'Left side (labeled Repair I on the in-game map). 2 holders are enough.',
    boiler: 'Building control time -50% (about 1 minute instead of 2). Take it first.',
    transit: 'Teleport cooldown -50%. The key to team mobility.',
    muni: '+15% damage for your troops, -15% damage for the enemy. Opens at minute 15.',
    merc: 'Send up to 4 attack teams at enemy buildings. Opens at minute 15.',
    roam: 'Not on a building: help reinforce and attack weak enemy buildings.',
    workshop: 'Appears at a random location from minute 30. Collectors watch the minimap and capture it as fast as possible.'
};
const FOUNDRY_NAME_EN = {
    foundry: 'Imperial Foundry',
    proto1: 'Prototype Site I',
    proto2: 'Prototype Site II',
    rep1: 'Repair Facility IV',
    rep2: 'Repair Facility II',
    rep3: 'Repair Facility III',
    rep4: 'Repair Facility I',
    boiler: 'Boiler Room',
    transit: 'Central Transit Station',
    muni: 'Munitions Warehouse',
    merc: 'Mercenary Camp',
    roam: 'Roamer / Scout',
    workshop: 'Weapon Workshop'
};
Object.entries(FOUNDRY_B).forEach(([k, b]) => {
    const idTip = b.tip;
    Object.defineProperty(b, 'tip', { enumerable: true, configurable: true,
        get: () => (typeof foundryLanguage !== 'undefined' && foundryLanguage === 'en' && FOUNDRY_TIP_EN[k]) || idTip });
    if (FOUNDRY_NAME_EN[k]) {
        const idName = b.n;
        Object.defineProperty(b, 'n', { enumerable: true, configurable: true,
            get: () => (typeof foundryLanguage !== 'undefined' && foundryLanguage === 'en' && FOUNDRY_NAME_EN[k]) || idName });
    }
});

const FOUNDRY_VERIFIED = '27 Okt 2026';
const FOUNDRY_PHASE_RANGE = ['0–15', '15–30', '30–60'];
const foundryL = (id, en) => {
    const L = (typeof I18N !== 'undefined' && I18N.lang) || foundryLanguage || 'en';
    if (L === 'en') return en;
    if (typeof I18N !== 'undefined') {
        const tr = I18N.t(en, L);
        if (tr && tr !== en) return tr;
    }
    if (L === 'id') return id;
    return en;
};

// Template 30 slot (urut dari terkuat). [role, phase1, phase2, phase3?].
// Strategi inti:
//  P1: rebut Boiler (kontrol -50%) + Transit (teleport -50%), kunci Proto (poin besar), jaga Repair.
//  P2: rally ke Imperial Foundry, buka Muni/Merc, tahan Proto/Repair.
//  P3: tahan Foundry + Proto/Repair, Collector/Mobile buru Weapon Workshop.
const FOUNDRY_TEMPLATE = [
    // 1  Komandan: Transit P1 (mobilitas), Foundry P2-P3
    ['Commander', 'transit', 'foundry', 'foundry'],
    // 2-3  Rally Leader: Proto P1 (satu per sisi), Foundry P2-P3
    ['Rally Leader', 'proto1', 'foundry', 'foundry'],
    ['Rally Leader', 'proto2', 'foundry', 'foundry'],
    // 4-7  Joiner: ikuti sisi Proto di P1, masuk Foundry di P2-P3
    ['Joiner', 'proto1', 'foundry', 'foundry'],
    ['Joiner', 'proto2', 'foundry', 'foundry'],
    ['Joiner', 'proto1', 'foundry', 'foundry'],
    ['Joiner', 'proto2', 'foundry', 'foundry'],
    // 8-9  Holder Proto (tahan sepanjang battle)
    ['Holder', 'proto1', 'proto1', 'proto1'],
    ['Holder', 'proto2', 'proto2', 'proto2'],
    // 10-13 Mobile: roam P1, respon Foundry/Merc/Muni P2, Workshop/Foundry P3
    ['Mobile', 'roam', 'foundry', 'workshop'],
    ['Mobile', 'roam', 'merc', 'foundry'],
    ['Mobile', 'roam', 'muni', 'workshop'],
    ['Mobile', 'roam', 'foundry', 'foundry'],
    // 14-21 Holder Repair (2 per fasilitas)
    ['Holder', 'rep1', 'rep1', 'rep1'],
    ['Holder', 'rep1', 'rep1', 'rep1'],
    ['Holder', 'rep2', 'rep2', 'rep2'],
    ['Holder', 'rep2', 'rep2', 'rep2'],
    ['Holder', 'rep3', 'rep3', 'rep3'],
    ['Holder', 'rep3', 'rep3', 'rep3'],
    ['Holder', 'rep4', 'rep4', 'rep4'],
    ['Holder', 'rep4', 'rep4', 'rep4'],
    // 22-24 Boiler holders → sebagian pindah ke Muni/Merc di P2, sisanya tahan Boiler
    ['Holder', 'boiler', 'boiler', 'boiler'],
    ['Holder', 'boiler', 'muni', 'muni'],
    ['Holder', 'boiler', 'merc', 'merc'],
    // 25-26 Transit holders
    ['Holder', 'transit', 'transit', 'transit'],
    ['Holder', 'transit', 'transit', 'transit'],
    // 27-30 Collector: roam P1-P2 (Arsenal Supplies), Workshop P3
    ['Collector', 'roam', 'roam', 'workshop'],
    ['Collector', 'roam', 'roam', 'workshop'],
    ['Collector', 'roam', 'roam', 'workshop'],
    ['Collector', 'roam', 'roam', 'workshop']
];
function foundryTpl(slot) {
    const t = FOUNDRY_TEMPLATE[slot - 1];
    if (!t) return null;
    return { slot, role: t[0], p1: t[1], p2: t[2], p3: t[3] != null ? t[3] : t[2] };
}

// Minimal pemain per bangunan (peringatan roster + skor planner).
// Mengikuti tab Strategi: Situs Prototipe dan tiap Fasilitas Perbaikan masing-masing minimal 2 penjaga sepanjang battle
// (poin besar, harus ditahan terus); angka ini juga dipakai planner agar roster tipis tetap memprioritaskan bangunan bernilai tinggi.
const FOUNDRY_MIN = {
    1: { proto1: 2, proto2: 2, rep1: 2, rep2: 2, rep3: 2, rep4: 2, boiler: 2, transit: 2 },
    2: { foundry: 4, proto1: 2, proto2: 2, rep1: 2, rep2: 2, rep3: 2, rep4: 2, boiler: 1, muni: 1, merc: 1, transit: 1 },
    3: { foundry: 4, proto1: 2, proto2: 2, rep1: 2, rep2: 2, rep3: 2, rep4: 2, boiler: 1, muni: 1, merc: 1, transit: 1, workshop: 2 }
};
const FOUNDRY_ROLES = ['Commander', 'Rally Leader', 'Joiner', 'Holder', 'Mobile', 'Collector'];
const FOUNDRY_ROLE_COLOR = { Commander: '#f59e0b', 'Rally Leader': '#ef4444', Joiner: '#fb923c', Holder: '#38bdf8', Mobile: '#4ade80', Collector: '#c084fc' };
const FOUNDRY_ROLE_ID = { Commander: 'Komandan', 'Rally Leader': 'Pemimpin Rally', Joiner: 'Anggota Rally', Holder: 'Penjaga', Mobile: 'Mobile', Collector: 'Pengumpul' };

let foundryPlayers = [];
let foundryExt = true;         // false bila supabase_foundry_p3.sql belum dijalankan
let foundryTab = 'Legion 1';   // 'Legion 1' | 'Legion 2' | 'map' | 'chart' | 'strategy'
let foundryMapLegion = 'Legion 1';
let foundryPhase = 1;
let foundrySelected = 'foundry';
let foundryTaskMarksOn = true;
let foundryCountMarksOn = true;  // angka besar di lingkaran bangunan
let foundryTaskFilters = new Set(FOUNDRY_ROLES);
// Live Edit on Map / Chart tabs: staff with IDN edit rights can change role & phase targets in place.
let foundryLiveEdit = false;
let foundryLiveEditPlayerId = null; // open popover player id

function foundryCanEdit() {
    if (foundryMode === 'tundra') {
        // Tundra: any staff who can manage Legion 1 or Legion 2
        return typeof canManageLegion === 'function'
            && (canManageLegion('Legion 1') || canManageLegion('Legion 2'));
    }
    return typeof canEditAlliance === 'function' && canEditAlliance(FOUNDRY_ALLIANCE);
}
function foundryLiveEditAllowed() { return foundryCanEdit(); }
function foundryToggleLiveEdit() {
    if (!foundryLiveEditAllowed()) {
        foundryLiveEdit = false;
        showToast(foundryL('Anda tidak punya izin mengubah roster IDN.', 'You do not have permission to edit the IDN roster.'), 'warning');
        return;
    }
    foundryLiveEdit = !foundryLiveEdit;
    if (!foundryLiveEdit) foundryCloseLiveEditor();
    foundryRender();
}

function foundryLegionSwitchHtml(current, onClickName) {
    const legs = foundryLockedLegion ? [foundryLockedLegion] : FOUNDRY_LEGIONS;
    return legs.map(l => `<button class="btn-apply ${l === current ? 'fy-on' : ''}" onclick="${onClickName}('${l}')">${l}</button>`).join('');
}

function foundryLiveEditBtnHtml() {
    if (!foundryLiveEditAllowed()) return '';
    const on = foundryLiveEdit;
    return `<button type="button" class="btn-apply fy-live-edit-btn ${on ? 'fy-on fy-live-edit-on' : ''}" onclick="foundryToggleLiveEdit()" aria-pressed="${on}">✏️ ${on ? foundryL('Live Edit: ON', 'Live Edit: ON') : foundryL('Live Edit', 'Live Edit')}</button>`;
}
function foundryBuildingOptionsHtml(current) {
    return '<option value="">—</option>' + FOUNDRY_KEYS.map(k =>
        `<option value="${k}" ${current === k ? 'selected' : ''}>${escapeHtml(FOUNDRY_B[k].n)}</option>`
    ).join('');
}
function foundryRoleOptionsHtml(current) {
    return [...FOUNDRY_ROLES, 'Substitute'].map(r =>
        `<option value="${r}" ${current === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
    ).join('');
}
function foundryLiveEditorFieldsHtml(p) {
    if (!p) return '';
    const role = p.foundry_role || '';
    const k1 = p.foundry_p1 || '', k2 = p.foundry_p2 || '', k3 = p.foundry_p3 || p.foundry_p2 || '';
    const nameOf = k => (FOUNDRY_B[k] && FOUNDRY_B[k].n) || '—';
    return `<div class="fy-live-fields">
      <label class="fy-live-field-full">${foundryL('Peran', 'Role')}<select onchange="foundryUpdateTask('${p.id}','foundry_role',this.value)">${foundryRoleOptionsHtml(role)}</select></label>
      <label class="fy-live-field-full">P1 · ${foundryL('Fase 1', 'Phase 1')}<select title="${escapeHtml(nameOf(k1))}" onchange="foundryUpdateTask('${p.id}','foundry_p1',this.value)">${foundryBuildingOptionsHtml(k1)}</select></label>
      <label class="fy-live-field-full">P2 · ${foundryL('Fase 2', 'Phase 2')}<select title="${escapeHtml(nameOf(k2))}" onchange="foundryUpdateTask('${p.id}','foundry_p2',this.value)">${foundryBuildingOptionsHtml(k2)}</select></label>
      ${foundryExt ? `<label class="fy-live-field-full">P3 · ${foundryL('Fase 3', 'Phase 3')}<select title="${escapeHtml(nameOf(k3))}" onchange="foundryUpdateTask('${p.id}','foundry_p3',this.value)">${foundryBuildingOptionsHtml(k3)}</select></label>` : ''}
    </div>`;
}
function foundryOpenLiveEditor(playerId, clientX, clientY) {
    if (!foundryLiveEdit || !foundryLiveEditAllowed()) return;
    const p = foundryPlayers.find(x => String(x.id) === String(playerId));
    if (!p) return;
    foundryLiveEditPlayerId = String(p.id);
    let pop = document.getElementById('fy-live-editor');
    if (!pop) {
        pop = document.createElement('div');
        pop.id = 'fy-live-editor';
        pop.className = 'fy-live-editor';
        pop.addEventListener('click', e => e.stopPropagation());
        document.body.appendChild(pop);
    }
    pop.innerHTML = `<div class="fy-live-editor-head">
      <strong>#${p.foundry_slot || '—'} ${escapeHtml(p.nickname || '')}</strong>
      <button type="button" class="fy-live-editor-close" onclick="foundryCloseLiveEditor()" aria-label="Close">×</button>
    </div>
    <p class="fy-live-editor-meta">${escapeHtml(p.foundry_legion || '')} · ${escapeHtml(p.foundry_status || '')}${canViewSensitive() && p.game_id ? ' · ID ' + escapeHtml(p.game_id) : ''}</p>
    ${foundryLiveEditorFieldsHtml(p)}
    <p class="fy-live-editor-note">${foundryL('Perubahan disimpan langsung.', 'Changes save instantly.')}</p>`;
    pop.classList.add('open');
    // Position near click, keep on-screen
    const pad = 12, w = Math.min(360, window.innerWidth - 24), h = pop.offsetHeight || 280;
    let x = (clientX || window.innerWidth / 2) + 8;
    let y = (clientY || window.innerHeight / 2) + 8;
    if (x + w > window.innerWidth - pad) x = Math.max(pad, (clientX || 0) - w - 8);
    if (y + h > window.innerHeight - pad) y = Math.max(pad, window.innerHeight - h - pad);
    pop.style.left = x + 'px';
    pop.style.top = y + 'px';
}
function foundryCloseLiveEditor() {
    foundryLiveEditPlayerId = null;
    const pop = document.getElementById('fy-live-editor');
    if (pop) { pop.classList.remove('open'); pop.innerHTML = ''; }
}
function foundryOnMapMarkClick(playerId, evt) {
    if (!foundryLiveEdit || !foundryLiveEditAllowed()) return;
    if (evt) { evt.preventDefault(); evt.stopPropagation(); }
    const e = evt || window.event;
    foundryOpenLiveEditor(playerId, e && e.clientX, e && e.clientY);
}
// Close live editor when clicking outside
document.addEventListener('click', e => {
    const pop = document.getElementById('fy-live-editor');
    if (!pop || !pop.classList.contains('open')) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.fy-task-mark')) return;
    foundryCloseLiveEditor();
});
function foundryName(key) { return (FOUNDRY_B[key] || {}).n || '-'; }
function foundryPower(p) { return canViewSensitive() ? Number(p.troops_power || 0).toLocaleString('en-US') : MASKED_TEXT; }
function foundrySetPlayers(data) {
    const list = (data || []).map(foundryNormalizePlayer);
    foundryPlayers = list;
    if (foundryMode === 'tundra') {
        // Tundra uses tundra_p3 (or falls back); treat as extended if column present on any row / after migration
        foundryExt = !list.length || ('tundra_p3' in (data[0] || {})) || list.some(p => 'foundry_p3' in p);
        // Data lama: sudah ada legion + legion_role tapi belum tundra_slot → isi slot otomatis (urut power)
        foundryEnsureTundraSlots();
    } else {
        foundryExt = !list.length || ('foundry_p3' in (data[0] || {}));
    }
}

/** Isi foundry_slot / tundra_slot untuk anggota legion yang belum punya nomor slot. */
function foundryEnsureTundraSlots() {
    if (foundryMode !== 'tundra') return;
    const pending = []; // { p, slot, status, legion }
    const _slotLegions = foundryMode === 'tundra'
        ? [...FOUNDRY_LEGIONS, ...TUNDRA_ALLIANCE_B_LEGIONS]
        : FOUNDRY_LEGIONS;
    for (const legion of _slotLegions) {
        for (const status of ['Battle', 'Substitute']) {
            const max = status === 'Battle' ? foundryBattleMax() : foundrySubMax();
            const group = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === status);
            const used = new Set();
            group.forEach(p => {
                const s = Number(p.foundry_slot);
                if (Number.isInteger(s) && s >= 1 && s <= max) used.add(s);
            });
            const need = group
                .filter(p => {
                    const s = Number(p.foundry_slot);
                    return !(Number.isInteger(s) && s >= 1 && s <= max);
                })
                .sort((a, b) => (Number(b.troops_power) || 0) - (Number(a.troops_power) || 0));
            let next = 1;
            for (const p of need) {
                while (used.has(next) && next <= max) next++;
                if (next > max) break;
                p.foundry_slot = next;
                p.tundra_slot = next;
                // Role default dari template bila belum ada
                if (!p.foundry_role) {
                    const tpl = status === 'Battle' ? foundryTpl(next) : null;
                    p.foundry_role = tpl ? tpl.role : 'Substitute';
                    p.tundra_role = p.foundry_role;
                    if (tpl) {
                        if (!p.foundry_p1) { p.foundry_p1 = tpl.p1; p.tundra_p1 = tpl.p1; }
                        if (!p.foundry_p2) { p.foundry_p2 = tpl.p2; p.tundra_p2 = tpl.p2; }
                        if (!p.foundry_p3 && foundryExt) { p.foundry_p3 = tpl.p3; p.tundra_p3 = tpl.p3; }
                    }
                }
                used.add(next);
                pending.push({ p, slot: next, status, legion });
                next++;
            }
        }
    }
    // Persist slot (dan role default) di background — tidak blokir render
    if (pending.length && typeof getSupabase === 'function') {
        const client = getSupabase();
        if (client) {
            (async () => {
                for (const { p, slot, status, legion } of pending) {
                    const patch = {
                        foundry_slot: slot,
                        foundry_role: p.foundry_role || null,
                        foundry_p1: p.foundry_p1 || null,
                        foundry_p2: p.foundry_p2 || null
                    };
                    if (foundryExt) patch.foundry_p3 = p.foundry_p3 || null;
                    try { await foundryDbUpdate(p.id, patch); } catch (e) { /* ignore per-row */ }
                }
            })();
        }
    }
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

// Urutan prioritas slot bila roster < 30 (pemutus seri + urutan cover cadangan).
// Inti dulu: Commander, Boiler, Transit, RL, Holder Proto, 2x tiap Repair, Holder Boiler ke-2,
// lalu Joiner, Mobile, Holder sisa, Collector.
// Tujuannya: mulai dari ~16 pemain semua bangunan kritis (Proto + 4 Repair + Boiler + Transit)
// selalu punya minimal 2 penjaga stationary, bukan hanya mengandalkan march Joiner.
const FOUNDRY_PRIORITY = [1, 22, 25, 2, 3, 8, 9, 14, 15, 16, 17, 18, 19, 20, 21, 23, 4, 5, 6, 7, 10, 11, 12, 13, 24, 26, 27, 28, 29, 30];
// Slot yang selalu diambil lebih dulu (sebelum greedy skor) — 16 slot minimum untuk menutup min stationary P1:
// 1=Commander (Transit), 22=Boiler utama, 25=Transit ke-2, 2/3=Rally Leader (Proto), 8/9=Holder Proto,
// 14–21=2 Holder tiap Repair, 23=Boiler ke-2.
const FOUNDRY_PLAN_FIRST = [1, 22, 25, 2, 3, 8, 9, 14, 15, 16, 17, 18, 19, 20, 21, 23];
const FOUNDRY_PHASE_MINUTES = [15, 15, 30];   // P1 0-15, P2 15-30, P3 30-60
const FOUNDRY_WORKSHOP_VALUE = 400;           // nilai efektif Workshop (tidak ada m di map; diasumsikan tinggi)
// Multiplier strategis: bangunan yang mengubah tempo battle lebih berharga dari poin mentahnya.
const FOUNDRY_STRAT_MULT = {
    boiler: 1.8,   // kontrol bangunan -50% → harus diambil awal
    transit: 1.5,  // cooldown teleport -50% → mobilitas tim
    foundry: 1.35, // pusat + poin terbesar
    proto1: 1.2, proto2: 1.2,
    muni: 1.15, merc: 1.1,
    workshop: 1.25
};
// Cakupan per fase = pemain di bangunan + march penguatan RL/Joiner (sama dengan tabel Garrison).
// foundryPlanCoverParts memisahkan keduanya: st = pemain yang bertugas di bangunan, add = march penguatan.
function foundryPlanCoverParts(positions) {
    const st = { 1: {}, 2: {}, 3: {} };
    positions.forEach(t => [1, 2, 3].forEach(ph => { const k = t['p' + ph]; if (k) st[ph][k] = (st[ph][k] || 0) + 1; }));
    const members = positions.filter(t => FOUNDRY_REINFORCE_ROLES.includes(t.role))
        .map(t => ({ id: 'plan' + t.slot, foundry_role: t.role, foundry_slot: t.slot, troops_power: 1000 - t.slot, foundry_p1: t.p1, foundry_p2: t.p2, foundry_p3: t.p3 }));
    const jp = foundryJoinerCalc(members, (k, ph) => st[ph][k] || 0);
    const add = { 1: {}, 2: {}, 3: {} };
    [1, 2, 3].forEach(ph => Object.entries(jp.phases[ph].add).forEach(([k, v]) => { add[ph][k] = v; }));
    return { st, add };
}
function foundryPlanCover(positions) {
    const { st, add } = foundryPlanCoverParts(positions);
    const cnt = { 1: {}, 2: {}, 3: {} };
    [1, 2, 3].forEach(ph => { [...Object.keys(st[ph]), ...Object.keys(add[ph])].forEach(k => { cnt[ph][k] = (st[ph][k] || 0) + (add[ph][k] || 0); }); });
    return cnt;
}
// March penguatan hanya bantuan sementara dari pemain yang bertugas di tempat lain, jadi di skor planner nilainya
// separuh pemain yang benar-benar menjaga, dan tiap bangunan penghasil poin tetap wajib punya penjaga sendiri
// (Holder Prototipe/Perbaikan/Ketel/Transit tidak boleh digantikan sepenuhnya oleh march Joiner).
const FOUNDRY_MARCH_WEIGHT = 0.5;
// Skor strategi: poin/menit × menit fase × multiplier strategis × rasio cakupan (diminishing setelah min),
// + bonus first-capture di P1, + penalti bila Proto kiri/kanan timpang, + penalti missing critical.
function foundryPlanScore(positions) {
    const parts = foundryPlanCoverParts(positions);
    const cnt = { 1: {}, 2: {}, 3: {} };
    [1, 2, 3].forEach(ph => [...Object.keys(parts.st[ph]), ...Object.keys(parts.add[ph])].forEach(k => {
        cnt[ph][k] = (parts.st[ph][k] || 0) + FOUNDRY_MARCH_WEIGHT * (parts.add[ph][k] || 0);
    }));
    let total = 0;
    [1, 2, 3].forEach(ph => {
        const mins = FOUNDRY_PHASE_MINUTES[ph - 1];
        Object.entries(FOUNDRY_MIN[ph]).forEach(([k, min]) => {
            const n = cnt[ph][k] || 0;
            const ppm = k === 'workshop' ? FOUNDRY_WORKSHOP_VALUE : (FOUNDRY_B[k].m || 0);
            const mult = FOUNDRY_STRAT_MULT[k] || 1;
            // sampai min: linear; kelebihan: diminishing (max +40% dari nilai min)
            let cover;
            if (n <= 0) cover = 0;
            else if (n <= min) cover = n / min;
            else cover = 1 + 0.4 * (1 - Math.exp(-(n - min) / Math.max(min, 1)));
            total += mins * ppm * mult * cover;
            // First-capture: hanya relevan di fase buka bangunan (ph bangunan)
            if (ph === (FOUNDRY_B[k] && FOUNDRY_B[k].ph) && n > 0) {
                const fc = k === 'workshop' ? FOUNDRY_WORKSHOP_VALUE * 2 : (FOUNDRY_B[k].f || 0);
                total += fc * mult * Math.min(1, n / Math.max(min, 1)) * 0.25;
            }
        });
    });
    // Balance Proto kiri/kanan di P1 (hindari semua stack di satu sisi)
    const p1L = cnt[1].proto1 || 0, p1R = cnt[1].proto2 || 0;
    if (p1L + p1R > 0) {
        const bal = 1 - Math.abs(p1L - p1R) / Math.max(p1L + p1R, 1);
        total += bal * 15 * 1200 * 0.15; // sedikit bonus balance
    }
    // Critical missing hard penalty (mendorong PLAN_FIRST + greedy menutup lubang).
    // P1: semua bangunan min (Proto, 4 Repair, Boiler, Transit) wajib punya penjaga stationary.
    // Penalti dihitung dari jumlah stationary (bukan march), supaya planner tidak mengandalkan Joiner saja.
    const critical = [
        [1, 'boiler'], [1, 'transit'], [1, 'proto1'], [1, 'proto2'],
        [1, 'rep1'], [1, 'rep2'], [1, 'rep3'], [1, 'rep4'],
        [2, 'foundry'], [3, 'foundry']
    ];
    // Bangunan penghasil poin tanpa penjaga sendiri (hanya mengandalkan march) kehilangan separuh nilainya.
    [1, 2, 3].forEach(ph => Object.keys(FOUNDRY_MIN[ph]).forEach(k => {
        if (k === 'workshop' || (parts.st[ph][k] || 0) > 0) return;
        total -= 0.5 * FOUNDRY_PHASE_MINUTES[ph - 1] * (FOUNDRY_B[k].m || 0) * (FOUNDRY_STRAT_MULT[k] || 1);
    }));
    critical.forEach(([ph, k]) => {
        const min = (FOUNDRY_MIN[ph][k] || 1);
        // Untuk bangunan P1 kritis pakai stationary saja; Foundry P2/P3 tetap pakai cover berbobot.
        const n = (ph === 1) ? (parts.st[ph][k] || 0) : (cnt[ph][k] || 0);
        if (n < min) {
            const weight = (ph === 1) ? 1.5 : 1; // penalti lebih keras bila kurang stationary di P1
            total -= weight * FOUNDRY_PHASE_MINUTES[ph - 1] * (FOUNDRY_B[k].m || 600) * (FOUNDRY_STRAT_MULT[k] || 1) * (min - n) / min;
        }
    });
    return total;
}
function foundryPlanTasks(n) {
    n = Math.max(0, Math.min(n, foundryBattleMax()));
    const chosen = [], left = FOUNDRY_PRIORITY.map(foundryTpl);
    while (chosen.length < n) {
        let bi = 0, bs = -Infinity;
        // Ambil slot kunci dulu selama masih ada di sisa kandidat
        if (chosen.length < FOUNDRY_PLAN_FIRST.length) {
            const need = FOUNDRY_PLAN_FIRST[chosen.length];
            const idx = left.findIndex(t => t && t.slot === need);
            if (idx >= 0) bi = idx;
            else left.forEach((t, i) => { const sc = foundryPlanScore(chosen.concat(t)); if (sc > bs) { bs = sc; bi = i; } });
        } else {
            left.forEach((t, i) => { const sc = foundryPlanScore(chosen.concat(t)); if (sc > bs) { bs = sc; bi = i; } });
        }
        chosen.push(left.splice(bi, 1)[0]);
    }
    return chosen.sort((a, b) => a.slot - b.slot);
}
function foundryShortages(positions) {
    const out = [], cnt = foundryPlanCover(positions);
    [1, 2, 3].forEach(ph => Object.entries(FOUNDRY_MIN[ph]).forEach(([key, min]) => {
        const n = cnt[ph][key] || 0;
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
    foundryMode = 'foundry';
    foundryLockedLegion = null;
    return foundryOpenPage();
}
/** Buka battle plan Tundra (sistem Foundry). legion dikunci ke Legion 1 atau 2. */
async function openTundraFoundry(legion) {
    foundryMode = 'tundra';
    if (isFoundryLegionName(legion) || TUNDRA_ALLIANCE_B_LEGIONS.includes(legion) || FOUNDRY_LEGIONS.includes(legion)) {
        foundryLockedLegion = legion;
        foundryTab = legion;
        foundryMapLegion = legion;
        foundryChartLegion = legion;
    } else {
        foundryLockedLegion = null;
    }
    return foundryOpenPage();
}
async function foundryOpenPage() {
    document.getElementById('alliance-menu-page').classList.add('hidden');
    document.getElementById('troops-table-page').classList.add('hidden');
    document.getElementById('foundry-page').classList.remove('hidden');
    foundryApplyModeChrome();
    document.getElementById('foundry-admin-bar').classList.toggle('hidden', !foundryCanEdit());
    await foundryLoad();
}

function closeFoundry() {
    document.getElementById('foundry-page').classList.add('hidden');
    foundryCloseLiveEditor();
    showAllianceMenu();
}

async function foundryLoad() {
    const client = getSupabase();
    if (!client) return;
    // Foundry mode: IDN only. Tundra mode: all players (roster = those with legion 1/2).
    let query = client.from('troops_power').select('*').order('troops_power', { ascending: false });
    if (foundryMode !== 'tundra') query = query.eq('alliance', FOUNDRY_ALLIANCE);
    const { data, error } = await query;
    if (error) {
        showToast(
            foundryMode === 'tundra'
                ? foundryL('Gagal memuat roster Tundra', 'Failed to load Tundra roster')
                : foundryL('Gagal memuat data pemain IDN', 'Failed to load IDN player data'),
            'error'
        );
        return;
    }
    foundrySetPlayers(data);
    foundryApplyModeChrome();
    foundryRender();
}

/** Persist a foundry_* shaped patch; remaps columns when mode is tundra. */
async function foundryDbUpdate(id, patch) {
    const dbPatch = foundryDbPatch(patch);
    const { error } = await getSupabase().from('troops_power').update(dbPatch).eq('id', id);
    return { error, dbPatch };
}

function foundryInRoster(p) { return !!p.foundry_legion && !!p.foundry_status; }
function foundryFind(legion, status, slot) {
    return foundryPlayers.find(p => p.foundry_legion === legion && p.foundry_status === status && Number(p.foundry_slot) === slot);
}

function foundrySetTab(tab) {
    if (tab === 'checklist') tab = 'Legion 1';   // fitur checklist dihapus
    // Jangan izinkan pindah ke legion lain saat UI dikunci (buka dari LEGION 1/2)
    if (foundryLockedLegion && FOUNDRY_LEGIONS.includes(tab) && tab !== foundryLockedLegion) return;
    foundryTab = tab;
    if (FOUNDRY_LEGIONS.includes(tab)) {
        foundryMapLegion = tab;
        foundryChartLegion = tab;
    }
    foundryRender();
}

function foundryRender() {
    if (foundryLockedLegion && FOUNDRY_LEGIONS.includes(foundryTab) && foundryTab !== foundryLockedLegion) {
        foundryTab = foundryLockedLegion;
    }
    document.querySelectorAll('.fy-tab').forEach(b => {
        const tab = b.getAttribute('data-tab');
        b.classList.toggle('active', tab === foundryTab);
        if (foundryLockedLegion && FOUNDRY_LEGIONS.includes(tab) && tab !== foundryLockedLegion) {
            b.classList.add('hidden');
            b.style.display = 'none';
        } else {
            b.classList.remove('hidden');
            b.style.display = '';
        }
    });
    const body = document.getElementById('foundry-body');
    if (FOUNDRY_LEGIONS.includes(foundryTab) || TUNDRA_ALLIANCE_B_LEGIONS.includes(foundryTab)) body.innerHTML = foundryRosterHtml(foundryTab);
    else if (foundryTab === 'map') body.innerHTML = foundryMapHtml();
    else if (foundryTab === 'chart') body.innerHTML = foundryChartHtml();
    else body.innerHTML = foundryStrategyHtml();
    foundryApplyLanguage();
}

// ---------- BILINGUAL UI (English / Bahasa Indonesia) ----------
let foundryLanguage = (typeof I18N !== 'undefined' && I18N.lang) || localStorage.getItem('foundry-language') || localStorage.getItem('site-language') || 'en';
if (typeof I18N !== 'undefined' && typeof I18N.onChange === 'function') {
    I18N.onChange(L => {
        foundryLanguage = L;
        const page = document.getElementById('foundry-page');
        if (page && !page.classList.contains('hidden')) {
            try { foundryApplyModeChrome(); foundryRender(); } catch (e) { /* ignore */ }
        }
    });
}
// Pasangan terjemahan [Indonesia, English]. Satu entri bekerja dua arah, jadi tidak ada lagi
// teks yang salah diterjemahkan ke arah sebaliknya. Teks yang tidak ada di daftar dibiarkan apa adanya.
const FOUNDRY_I18N_PAIRS = [
  ['Kembali ke Menu','Back to Menu'],['Penugasan Massal','Bulk Assign'],['Kosongkan Roster','Clear Roster'],
  ['Pemain','Player'],['Cadangan','Substitute'],['Pemain Cadangan','Substitute Players'],
  ['Peta','Map'],['🗺️ Peta','🗺️ Map'],['Strategi','Strategy'],['📖 Strategi','📖 Strategy'],
  ['Roster Foundry Battle','Foundry Battle Roster'],['Aliansi IDN','IDN Alliance'],
  ['Aliansi IDN · 2 Legion · 30 Petarung + 10 Cadangan per Legion','IDN Alliance · 2 Legion · 30 Battle + 10 Substitutes per Legion'],
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
  ['Nama: ON','Names: ON'],['Nama: OFF','Names: OFF'],
  ['Angka: ON','Counts: ON'],['Angka: OFF','Counts: OFF'],
  ['Tombol Angka mengontrol angka besar di lingkaran.','The Counts button toggles the large numbers in the circles.'],
  ['Pilih Legion dan Phase','Select Legion and Phase'],['Tugas','Task'],['Simpan','Save'],['Batal','Cancel'],['Nomor slot','Slot number'],
  ['Pemain & tugas yang ditetapkan','Players & assigned tasks'],['Tugas / Peran','Task / Role'],
  ['Belum ada pemain Battle yang ditugaskan pada phase ini.','No battle players assigned for this phase.'],
  ['Angka kecil adalah nama pemain.','Small markers show player names.'],
  ['Mark menampilkan nama pemain yang ditugaskan ke bangunan pada phase terpilih. Arahkan/ketuk mark untuk melihat slot, tugas, dan target.','Markers show player names assigned to each building for the selected phase. Hover/tap a marker to view slot, role, and target.'],
  ['Angka di lingkaran = jumlah pemain yang ditugaskan pada bangunan untuk phase terpilih. Mark kecil = nama pemain; gunakan filter tugas untuk menampilkan peran tertentu.','Numbers in circles show assigned players for the selected phase. Small markers show player names; use task filters to show selected roles.'],
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
['Pemain Cadangan','Substitute Players'],
['📊 Grafik','📊 Chart'],['Link Live Share Chart disalin.','Live Share Chart link copied.'],
['< Kembali ke Menu','< Back to Menu'],['➕ Penugasan Massal','➕ Bulk Assign'],
['Semua Legion','All Legions'],['Semua fase (per slot)','All phases (per slot)'],
['Phase 1 (per bangunan)','Phase 1 (per building)'],['Phase 2 (per bangunan)','Phase 2 (per building)'],['Phase 3 (per bangunan)','Phase 3 (per building)'],
['Legion untuk disalin','Legion to copy'],['Fase untuk disalin','Phase to copy'],
['Penugasan Massal Foundry','Bulk Assign Foundry'],
['Pemain yang dipilih mengisi slot kosong berikutnya, urut dari Power tertinggi.','Selected players fill the next free slots, ordered from highest Power.'],
['Cari Game ID / Nickname','Search Game ID / Nickname'],['Ketik game ID atau nickname...','Type game ID or nickname...'],
['Pilih semua yang tampil (sampai slot penuh)','Select all shown (until slots are full)'],
['Assign Terpilih','Assign Selected'],['0 dipilih','0 selected']
];
const FOUNDRY_ID_TO_EN = new Map(), FOUNDRY_EN_TO_ID = new Map();
FOUNDRY_I18N_PAIRS.forEach(([id, en]) => {
  if (id === en) return;
  FOUNDRY_ID_TO_EN.set(id, en);
  if (!FOUNDRY_EN_TO_ID.has(en)) FOUNDRY_EN_TO_ID.set(en, id);
});
function foundryT(text) {
  const L = (typeof I18N !== 'undefined' && I18N.lang) || foundryLanguage || 'en';
  if (L === 'en') {
    // If current DOM text is Indonesian, map back to English for consistency
    return FOUNDRY_ID_TO_EN.get(text) || text;
  }
  // Prefer site dictionary (all 6 languages)
  const en = FOUNDRY_ID_TO_EN.get(text) || text;
  if (typeof I18N !== 'undefined') {
    const tr = I18N.t(en, L);
    if (tr && tr !== en) return tr;
  }
  if (L === 'id') return FOUNDRY_EN_TO_ID.get(en) || FOUNDRY_EN_TO_ID.get(text) || text;
  return text;
}
function foundryApplyLanguage(root = document.getElementById('foundry-page')) {
  if (!root) return;
  // Prefer full site I18N pass when available (covers EN/ID/ZH/TL/IT/TH)
  if (typeof I18N !== 'undefined' && typeof I18N.apply === 'function') {
    try { I18N.apply(root); } catch (e) { /* fall through */ }
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => { const raw = n.nodeValue.trim(); if (!raw) return; const translated = foundryT(raw); if (translated !== raw) n.nodeValue = n.nodeValue.replace(raw, translated); });
  // Atribut yang terlihat/terbaca pengguna (placeholder, aria-label, title).
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => {
    const v = el.getAttribute(a); if (!v) return; const t = foundryT(v); if (t !== v) el.setAttribute(a, t);
  }));
  // Modal Bulk Assign berada di luar #foundry-page, jadi diterjemahkan juga.
  if (root.id === 'foundry-page') { const m = document.getElementById('fy-bulk-modal'); if (m) foundryApplyLanguage(m); }
  const btn = document.getElementById('foundry-language-toggle');
  if (btn) btn.innerHTML = foundryLanguage === 'en' ? '<span class="flag flag-id"></span> Bahasa Indonesia' : (foundryLanguage === 'id' ? '<span class="flag flag-cn"></span> 中文' : '<span class="flag flag-gb"></span> English');
}
function foundryToggleLanguage() {
  foundryLanguage = foundryLanguage === 'en' ? 'id' : (foundryLanguage === 'id' ? 'zh' : 'en');
  localStorage.setItem('foundry-language', foundryLanguage);
  foundryRender(); foundryApplyLanguage();
}

// ---------- PERINGATAN ROSTER ----------
function foundryWarnings(legion, phase) {
    const out = [];
    const battle = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle');
    const subs = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute');
    if (!battle.length) return [{ lvl: 'info', msg: foundryL(`${legion} belum punya pemain Battle.`, `${legion} has no battle players yet.`) }];
    if (battle.length < foundryBattleMax()) out.push({ lvl: 'info', msg: foundryL(`Slot Battle baru terisi ${battle.length} dari ${foundryBattleMax()}.`, `Only ${battle.length} of ${foundryBattleMax()} battle slots are filled.`) });
    if (!battle.some(p => p.foundry_role === 'Commander')) out.push({ lvl: 'warn', msg: foundryL('Belum ada Commander.', 'No Commander assigned.') });
    if (!battle.some(p => p.foundry_role === 'Rally Leader')) out.push({ lvl: 'warn', msg: foundryL('Belum ada Pemimpin Rally untuk menyerang Tanur Imperial.', 'No Rally Leader to attack the Imperial Foundry.') });
    const rally = foundryRallyTeams(legion);
    if (rally.orphans.length) out.push({ lvl: 'warn', msg: foundryL(`${rally.orphans.length} Joiner belum punya Rally Leader untuk bergabung.`, `${rally.orphans.length} Joiner(s) have no Rally Leader to join.`) });
    const noTarget = battle.filter(p => !p.foundry_role || !p.foundry_p1 || !p.foundry_p2).length;
    if (noTarget) out.push({ lvl: 'warn', msg: foundryL(`${noTarget} pemain Battle belum punya tugas atau target lengkap.`, `${noTarget} battle players have no complete task or target.`) });
    const jplan = foundryJoinerPlan(legion);   // march penguatan Rally Leader/Joiner ikut dihitung (sama dengan tabel Garrison)
    (phase ? [phase] : [1, 2, 3]).forEach(ph => {
        const low = [];
        Object.entries(FOUNDRY_MIN[ph]).forEach(([key, min]) => {
            const n = foundryAssigned(legion, key, ph).length + (jplan.phases[ph].add[key] || 0);
            if (n < min) low.push(`${foundryName(key)} ${n}/${min}`);
        });
        // satu baris ringkas per phase, bukan satu baris per bangunan
        if (low.length) out.push({ lvl: 'warn', msg: foundryL(`Phase ${ph}: ${low.length} bangunan di bawah minimum pemain — ${low.join(', ')}.`, `Phase ${ph}: ${low.length} building(s) below minimum players — ${low.join(', ')}.`) });
    });
    if (subs.length < foundrySubMax()) out.push({ lvl: 'info', msg: foundryL(`Cadangan baru terisi ${subs.length} dari ${foundrySubMax()}.`, `Only ${subs.length} of ${foundrySubMax()} substitutes are filled.`) });
    if (foundryExt) {
        const open = subs.filter(p => !p.foundry_cover).length;
        if (open) out.push({ lvl: 'info', msg: foundryL(`${open} cadangan belum punya slot yang digantikan.`, `${open} substitutes have no slot to replace.`) });
    }
    return out;
}
function foundryWarningsHtml(legion, phase) {
    const w = foundryWarnings(legion, phase);
    if (!w.length) return `<div class="fy-warn-box fy-ok">✅ ${foundryL('Roster ' + legion + ' lengkap, semua bangunan punya pemain yang cukup.', legion + ' roster is complete; every building has enough players.')}</div>`;
    const nWarn = w.filter(x => x.lvl === 'warn').length, nInfo = w.length - nWarn;
    const counts = [nWarn ? `${nWarn} ${foundryL('peringatan', 'warning(s)')}` : '', nInfo ? `${nInfo} info` : ''].filter(Boolean).join(' · ');
    return `<details class="fy-warn-box" open><summary><strong>⚠️ ${foundryL('Peringatan roster', 'Roster warnings')} · ${legion}${phase ? ' · Phase ' + phase : ''}</strong> <span class="fy-warn-count">${counts}</span></summary><ul>${w.map(x => `<li class="fy-w-${x.lvl}">${escapeHtml(x.msg)}</li>`).join('')}</ul></details>`;
}
function foundryExtNotice() {
    return foundryExt ? '' : `<div class="fy-warn-box"><strong>ℹ️ ${foundryL('Kolom baru belum ada', 'New columns missing')}</strong><p>${foundryL('Jalankan supabase_foundry_p3.sql di Supabase SQL Editor agar target Phase 3, cadangan pengganti, dan checklist aktif.', 'Run supabase_foundry_p3.sql in the Supabase SQL Editor to enable Phase 3 targets, substitute cover and the checklist.')}</p></div>`;
}

// ---------- KALKULASI JOINER (otomatis) ----------
// Joiner dipasangkan ke Rally Leader secara otomatis dari data roster (tidak disimpan di database, jadi selalu
// ikut berubah bila Power, role, atau target pemain berubah). Aturan:
// 1) Joiner diurutkan dari Power tertinggi. 2) Joiner lebih dulu diarahkan ke Rally Leader dengan target Phase 1
// yang sama (satu lokasi, tidak perlu teleport). 3) Di antara kandidat, pilih tim dengan total Power terendah
// (Power Rally Leader ikut dihitung) agar kekuatan rally seimbang; seri -> jumlah Joiner lebih sedikit -> slot lebih kecil.
function foundryRallyTeams(legion) {
    const battle = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle');
    const pw = p => Number(p.troops_power) || 0;
    const teams = battle.filter(p => p.foundry_role === 'Rally Leader')
        .sort((a, b) => (a.foundry_slot - b.foundry_slot))
        .map(l => ({ leader: l, joiners: [], power: pw(l) }));
    const joiners = battle.filter(p => p.foundry_role === 'Joiner').sort((a, b) => pw(b) - pw(a) || a.foundry_slot - b.foundry_slot);
    if (!teams.length) return { teams, orphans: joiners };
    joiners.forEach(j => {
        const same = teams.filter(t => t.leader.foundry_p1 && t.leader.foundry_p1 === j.foundry_p1);
        const pool = same.length ? same : teams;
        const best = pool.reduce((a, b) => (b.power < a.power || (b.power === a.power && b.joiners.length < a.joiners.length)) ? b : a);
        best.joiners.push(j); best.power += pw(j);
    });
    teams.forEach(t => t.joiners.sort((a, b) => a.foundry_slot - b.foundry_slot));
    return { teams, orphans: [] };
}
function foundryJoinerOf(p, legion) {   // Rally Leader tempat Joiner p bergabung (null bila tidak ada)
    const t = foundryRallyTeams(legion || p.foundry_legion).teams.find(x => x.joiners.some(j => j.id === p.id));
    return t ? t.leader : null;
}
// Joiner = pemain yang mengirim beberapa march (default 5, bisa 6) untuk memperkuat garrison beberapa bangunan sekaligus.
// Rencana march dihitung otomatis per fase (tidak disimpan): (1) isi dulu kekurangan garrison tiap bangunan menurut
// FOUNDRY_MIN, bangunan bernilai poin tertinggi lebih dulu, Joiner dengan sisa march terbanyak lebih dulu;
// (2) sisa march memperkuat bangunan bernilai tinggi lainnya. Satu Joiner maksimal 1 march per bangunan dan tidak
// mengirim march ke bangunan tempat ia sendiri bertugas pada fase itu.
let foundryJoinerMarches = Math.min(6, Math.max(1, Number((() => { try { return localStorage.getItem('foundry-joiner-marches'); } catch (e) { return 5; } })()) || 5));
function foundrySetJoinerMarches(n) {
    foundryJoinerMarches = Math.min(6, Math.max(1, Number(n) || 5));
    try { localStorage.setItem('foundry-joiner-marches', String(foundryJoinerMarches)); } catch (e) {}
    foundryRender();
}
const FOUNDRY_REINFORCE_ROLES = ['Rally Leader', 'Joiner'];   // peran yang mengirim march penguatan ke bangunan lain
// Inti perhitungan march penguatan (dipakai tampilan Garrison DAN planner Isi Otomatis, jadi hasilnya selalu sama).
// members: pemain/posisi Rally Leader & Joiner ({id, foundry_role, foundry_slot, troops_power, foundry_p1/p2/p3});
// assignedCount(k, ph): jumlah pemain yang bertugas langsung di bangunan k pada fase ph.
function foundryJoinerCalc(members, assignedCount) {
    const pw = p => Number(p.troops_power) || 0;
    const joiners = members.slice().sort((a, b) => pw(b) - pw(a) || a.foundry_slot - b.foundry_slot);
    const jr = p => p.foundry_role === 'Joiner' ? 0 : 1;   // seri: Joiner lebih dulu daripada Rally Leader
    const phases = {};
    [1, 2, 3].forEach(ph => {
        const blds = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].m > 0 && FOUNDRY_B[k].ph <= ph).sort((a, b) => FOUNDRY_B[b].m - FOUNDRY_B[a].m);
        const left = new Map(joiners.map(j => [j.id, foundryJoinerMarches])), asg = new Map(joiners.map(j => [j.id, []])), add = {};
        const can = (j, k) => left.get(j.id) > 0 && foundryTarget(j, ph) !== k && !asg.get(j.id).includes(k);
        const send = (j, k) => { asg.get(j.id).push(k); left.set(j.id, left.get(j.id) - 1); add[k] = (add[k] || 0) + 1; };
        blds.forEach(k => {
            let need = (FOUNDRY_MIN[ph][k] || 0) - assignedCount(k, ph);
            while (need > 0) {
                const c = joiners.filter(j => can(j, k)).sort((a, b) => left.get(b.id) - left.get(a.id) || jr(a) - jr(b) || pw(b) - pw(a))[0];
                if (!c) break;
                send(c, k); need--;
            }
        });
        const gar = k => assignedCount(k, ph) + (add[k] || 0);
        for (;;) {   // sisa march: bangunan dengan nilai poin / (garrison + 1) tertinggi lebih dulu, agar menyebar
            const js = joiners.filter(j => left.get(j.id) > 0).sort((a, b) => left.get(b.id) - left.get(a.id) || jr(a) - jr(b) || pw(b) - pw(a));
            let pick = null;
            for (const j of js) {
                const ks = blds.filter(k => can(j, k)).sort((a, b) => FOUNDRY_B[b].m / (gar(b) + 1) - FOUNDRY_B[a].m / (gar(a) + 1));
                if (ks.length) { pick = [j, ks[0]]; break; }
            }
            if (!pick) break;
            send(pick[0], pick[1]);
        }
        phases[ph] = { asg, add, left };
    });
    return { joiners, phases };
}
function foundryJoinerPlan(legion) {
    const members = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle' && FOUNDRY_REINFORCE_ROLES.includes(p.foundry_role));
    return foundryJoinerCalc(members, (k, ph) => foundryAssigned(legion, k, ph).length);
}
function foundryJoinerMarchHtml(legion) {
    const plan = foundryJoinerPlan(legion);
    if (!plan.joiners.length) return '';
    const M = foundryJoinerMarches;
    const opt = [4, 5, 6].map(n => `<option value="${n}" ${n === M ? 'selected' : ''}>${n}</option>`).join('');
    const sel = `<label class="fy-note">${foundryL('March per pemain', 'Marches per player')}: <select onchange="foundrySetJoinerMarches(this.value)">${opt}</select></label>`;
    const rows = plan.joiners.map(j => `<tr><td style="text-align:left">#${j.foundry_slot} ${escapeHtml(j.nickname)}<small>${j.foundry_role} · ${foundryPower(j)}</small></td>${[1, 2, 3].map(ph => {
        const a = plan.phases[ph].asg.get(j.id);
        return `<td>${a.length ? a.map(k => escapeHtml(foundryName(k))).join('<br>') : '–'}<small>${a.length}/${M} march</small></td>`;
    }).join('')}</tr>`).join('');
    return `${sel}<div class="table-container"><table class="fy-table fy-sum-table"><thead><tr><th>${foundryL('Rally Leader & Joiner → bangunan yang diperkuat (1 march per bangunan)', 'Rally Leader & Joiner → reinforced buildings (1 march per building)')}</th><th>Phase 1</th><th>Phase 2</th><th>Phase 3</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function foundryGarrisonHtml(legion) {
    // Garrison per bangunan = pemain yang bertugas di sana + march Joiner yang memperkuat bangunan itu.
    const plan = foundryJoinerPlan(legion);
    const keys = FOUNDRY_KEYS.filter(k => [1, 2, 3].some(ph => plan.phases[ph].add[k] || foundryAssigned(legion, k, ph).some(p => p.foundry_role === 'Joiner' || p.foundry_role === 'Rally Leader')));
    if (!keys.length) return '';
    const pw = ps => ps.reduce((t, p) => t + (Number(p.troops_power) || 0), 0);
    const cell = (k, ph) => {
        const ps = foundryAssigned(legion, k, ph), add = plan.phases[ph].add[k] || 0;
        if (!ps.length && !add) return '<td class="fy-sum-na">–</td>';
        const c = r => ps.filter(p => p.foundry_role === r).length;
        const parts = [['RL', 'Rally Leader'], ['Joiner', 'Joiner'], ['Holder', 'Holder']].map(([a, r]) => c(r) ? `${a} ${c(r)}` : '').filter(Boolean);
        const other = ps.length - c('Rally Leader') - c('Joiner') - c('Holder');
        if (other) parts.push(`+${other}`);
        if (add) parts.push(`+${add} march`);
        const tot = ps.length + add, min = FOUNDRY_MIN[ph][k] || 0;
        return `<td class="${min ? (tot >= min ? 'fy-sum-ok' : 'fy-sum-bad') : ''}">${tot}${min ? '/' + min : ''}<small>${parts.join(' · ')}</small><small>${foundryFmtPower(pw(ps))}</small></td>`;
    };
    const rows = keys.map(k => `<tr><td>${escapeHtml(FOUNDRY_B[k].n)}</td>${[1, 2, 3].map(ph => cell(k, ph)).join('')}</tr>`).join('');
    return `${foundryJoinerMarchHtml(legion)}<div class="table-container"><table class="fy-table fy-sum-table"><thead><tr><th>${foundryL('Garrison per bangunan (termasuk march penguatan)', 'Garrison per building (incl. reinforcement marches)')}</th><th>Phase 1</th><th>Phase 2</th><th>Phase 3</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="fy-note">${foundryL('Rally Leader dan Joiner masing-masing mengirim beberapa march (5–6) ke beberapa bangunan sekaligus, jadi satu pemain bisa punya banyak tugas; tiap march dihitung sebagai 1 penjaga di bangunan itu. Format: total / minimal, rincian, lalu Power pemain yang bertugas di sana.', 'Each Rally Leader and Joiner sends several marches (5–6) to several buildings, so one player can have many tasks; each march counts as 1 garrison player at that building. Format: total / minimum, breakdown, then power of players stationed there.')}</p>`;
}
function foundryRallyHtml(legion) {
    const { teams, orphans } = foundryRallyTeams(legion);
    if (!teams.length && !orphans.length) return '';
    const total = teams.reduce((t, x) => t + x.power, 0) || 1;
    const nm = p => `#${p.foundry_slot} ${escapeHtml(p.nickname)}`;
    const rows = teams.map(t => {
        const js = t.joiners.length ? t.joiners.map(j => `${nm(j)} <small>${foundryPower(j)}</small>`).join('<br>') : '<span class="fy-empty">–</span>';
        return `<tr><td style="text-align:left">${nm(t.leader)}<small>${foundryPower(t.leader)} · P1 ${escapeHtml(foundryName(t.leader.foundry_p1))}</small></td>
            <td style="text-align:left">${js}</td><td>${t.joiners.length}</td><td><b>${foundryFmtPower(t.power)}</b><small>${Math.round(t.power / total * 100)}%</small></td></tr>`;
    }).join('');
    const warn = orphans.length ? `<p class="fy-note fy-w-warn">⚠️ ${foundryL(`${orphans.length} Joiner belum punya Rally Leader: ${orphans.map(p => p.nickname).join(', ')}.`, `${orphans.length} Joiner(s) have no Rally Leader: ${orphans.map(p => p.nickname).join(', ')}.`)}</p>` : '';
    const body = teams.length ? `<div class="table-container"><table class="fy-table fy-sum-table"><thead><tr><th>Rally Leader</th><th>Joiner</th><th>${foundryL('Jumlah', 'Count')}</th><th>${foundryL('Power tim', 'Team power')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : '';
    return `<details class="fy-sum" open><summary>🤝 ${foundryL('Kalkulasi Joiner otomatis (garrison)', 'Automatic Joiner calculation (garrison)')} · ${legion}</summary>${foundryGarrisonHtml(legion)}${body}${warn}
        <p class="fy-note">${foundryL('Joiner diurutkan dari Power tertinggi, dipasangkan ke Rally Leader dengan target Phase 1 yang sama, lalu diseimbangkan menurut total Power tim (Power Rally Leader ikut dihitung). Diperbarui otomatis saat roster atau role berubah.', 'Joiners are ranked by power, matched to Rally Leaders with the same Phase 1 target, then balanced by total team power (the Rally Leader\'s power is included). Updates automatically when the roster or roles change.')}</p></details>`;
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
    if (!foundryCanEdit()) { showToast(foundryL('Anda tidak punya izin mengubah roster IDN.', 'You do not have permission to edit the IDN roster.'), 'warning'); return; }
    const ps = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle')
        .sort((a, b) => (Number(b.troops_power) || 0) - (Number(a.troops_power) || 0) || a.foundry_slot - b.foundry_slot);
    if (!ps.length) { showToast(foundryL(`${legion} belum punya pemain Battle.`, `${legion} has no battle players.`), 'info'); return; }
    const plan = foundryPlanTasks(ps.length);
    const assign = ps.map((p, i) => ({ p, pos: plan[i], slot: i + 1 }));
    const short = foundryShortages(plan);
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
            const res = await Promise.all(jobs.slice(i, i + 20).map(j => client.from('troops_power').update(foundryDbPatch(j.patch)).eq('id', j.p.id)));
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        jobs.forEach(j => { Object.assign(j.p, j.patch); if (foundryMode === 'tundra') Object.assign(j.p, foundryDbPatch(j.patch)); });
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
        let rallyTag = '';
        if (p && role === 'Joiner') { const L = foundryJoinerOf(p, legion); rallyTag = L ? `<small class="fy-rally-tag">→ #${L.foundry_slot} ${escapeHtml(L.nickname)}</small>` : `<small class="fy-rally-tag fy-w-warn">${foundryL('belum ada Rally Leader', 'no Rally Leader')}</small>`; }
        else if (p && role === 'Rally Leader') { const T = foundryRallyTeams(legion).teams.find(x => x.leader.id === p.id); if (T) rallyTag = `<small class="fy-rally-tag">${T.joiners.length} Joiner · ${foundryFmtPower(T.power)}</small>`; }
        if (p && (role === 'Joiner' || role === 'Rally Leader')) { const a = foundryJoinerPlan(legion).phases; const n = [1, 2, 3].map(ph => (a[ph].asg.get(p.id) || []).length); rallyTag += `<small class="fy-rally-tag">${foundryL('Penguatan', 'Reinforce')}: ${n.join('/')} march</small>`; }
        return `<tr class="${p ? '' : 'fy-row-empty'}"><td>${slot}</td><td>${who(p, 'Battle', slot)}</td><td>${idCell(p)}</td><td>${p ? foundryPower(p) : ''}</td><td>${roleCell}${rallyTag}</td><td>${targetCell(p, 'foundry_p1', k1, 'Phase 1')}</td><td>${targetCell(p, 'foundry_p2', k2, 'Phase 2')}</td>${foundryExt ? `<td>${targetCell(p, 'foundry_p3', k3, 'Phase 3')}</td>` : ''}</tr>`;
    };
    const subRow = (slot) => {
        const p = foundryFind(legion, 'Substitute', slot);
        let cover = '';
        if (p && foundryExt) {
            const c = Number(p.foundry_cover) || 0;
            if (edit) {
                let o = `<option value="">— ${foundryL('belum ditentukan', 'not set')} —</option>`;
                for (let i = 1; i <= foundryBattleMax(); i++) {
                    const b = foundryFind(legion, 'Battle', i);
                    o += `<option value="${i}" ${c === i ? 'selected' : ''}>#${i} ${b ? escapeHtml(b.nickname) + ' (' + escapeHtml(b.foundry_role || '-') + ')' : foundryL('(kosong)', '(empty)')}</option>`;
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
    for (let i = 1; i <= foundryBattleMax(); i++) battle += battleRow(i);
    for (let i = 1; i <= foundrySubMax(); i++) subs += subRow(i);
    return `${foundryExtNotice()}${foundryWarningsHtml(legion)}${foundryToolsHtml(legion)}${foundrySummaryHtml(legion)}${foundryRallyHtml(legion)}
        <div class="fy-counter"><span class="fy-badge fy-b-battle">Battle ${nb} / ${foundryBattleMax()}</span><span class="fy-badge fy-b-sub">${foundryL('Cadangan', 'Substitutes')} ${ns} / ${foundrySubMax()}</span></div>
        <div class="table-container"><table class="fy-table">${battleHead}<tbody>${battle}</tbody></table></div>
        <h3 class="fy-h">Pemain Cadangan</h3>
        <p class="fy-note">${foundryL('Cadangan baru bisa masuk battlefield setelah menit 3. Tentukan slot yang akan digantikan sebelum battle.', 'Substitutes can only enter the battlefield after minute 3. Decide which slot each one replaces before the battle.')}</p>
        <div class="table-container"><table class="fy-table">${subHead}<tbody>${subs}</tbody></table></div>`;
}

async function foundryClear(p) {
    const nulls = foundryNullPatch();
    const { error } = await foundryDbUpdate(p.id, nulls);
    if (error) throw error;
    Object.assign(p, nulls);
    if (foundryMode === 'tundra') {
        // Keep in-memory legion fields in sync with null patch
        p.legion = null; p.legion_role = null;
        p.tundra_slot = null; p.tundra_role = null;
        p.tundra_p1 = null; p.tundra_p2 = null; p.tundra_p3 = null;
        p.tundra_cover = null; p.tundra_ready = 0;
    }
}

async function foundryUpdateTask(playerId, field, value) {
    const allowed = { foundry_role: [...FOUNDRY_ROLES, 'Substitute'], foundry_p1: FOUNDRY_KEYS, foundry_p2: FOUNDRY_KEYS, foundry_p3: FOUNDRY_KEYS };
    if (!foundryCanEdit()) { showToast(foundryL('Anda tidak punya izin mengubah roster IDN.', 'You do not have permission to edit the IDN roster.'), 'warning'); foundryRender(); return; }
    if ((field === 'foundry_p3' || field === 'foundry_cover') && !foundryExt) { showToast(foundryL('Jalankan supabase_foundry_p3.sql dulu.', 'Run supabase_foundry_p3.sql first.'), 'warning'); foundryRender(); return; }
    let v = value === '' ? null : value;
    if (field === 'foundry_cover') {
        if (v !== null) { v = Number(v); if (!Number.isInteger(v) || v < 1 || v > foundryBattleMax()) return; }
    } else {
        if (!Object.prototype.hasOwnProperty.call(allowed, field) || (v && !allowed[field].includes(v))) return;
    }
    const player = foundryPlayers.find(p => String(p.id) === String(playerId));
    if (!player) return;
    const patch = { [field]: v };
    try {
        const { error } = await foundryDbUpdate(player.id, patch);
        if (error) throw error;
        Object.assign(player, patch);
        if (foundryMode === 'tundra') Object.assign(player, foundryDbPatch(patch));
        showToast(foundryLanguage === 'en' ? 'Player task saved.' : 'Tugas pemain berhasil disimpan.', 'success');
    } catch (e) {
        showToast(foundryLanguage === 'en' ? 'Could not save task. Check Supabase permissions and roster columns.' : 'Tugas gagal disimpan. Periksa izin Supabase dan kolom roster.', 'error');
    }
    const keepId = foundryLiveEditPlayerId;
    const pop = document.getElementById('fy-live-editor');
    const left = pop && pop.classList.contains('open') ? pop.style.left : null;
    const top = pop && pop.classList.contains('open') ? pop.style.top : null;
    foundryRender();
    // Keep the floating editor open on the same player after a successful save + re-render
    if (keepId && foundryLiveEdit) {
        const p = foundryPlayers.find(x => String(x.id) === String(keepId));
        if (p) {
            foundryOpenLiveEditor(keepId);
            const pop2 = document.getElementById('fy-live-editor');
            if (pop2 && left != null) { pop2.style.left = left; pop2.style.top = top; }
        }
    }
}

async function foundryAssign(legion, status, slot, idValue) {
    if (!foundryCanEdit()) { showToast(foundryL('Anda tidak punya izin mengubah roster IDN.', 'You do not have permission to edit the IDN roster.'), 'warning'); return; }
    try {
        const old = foundryFind(legion, status, slot);
        if (old) await foundryClear(old);
        if (idValue) {
            const p = foundryPlayers.find(x => String(x.id) === String(idValue));
            const patch = foundryPatchFor(legion, status, slot);
            const { error } = await foundryDbUpdate(p.id, patch);
            if (error) throw error;
            Object.assign(p, patch);
            if (foundryMode === 'tundra') Object.assign(p, foundryDbPatch(patch));
        }
    } catch (e) {
        const hint = foundryMode === 'tundra'
            ? foundryL('Gagal menyimpan. Pastikan supabase_tundra_foundry.sql sudah dijalankan.', 'Save failed. Make sure supabase_tundra_foundry.sql has been run.')
            : foundryL('Gagal menyimpan. Pastikan supabase_foundry_roster.sql (dan supabase_foundry_p3.sql) sudah dijalankan.', 'Save failed. Make sure supabase_foundry_roster.sql (and supabase_foundry_p3.sql) have been run.');
        showToast(hint, 'error');
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
function foundryBulkMax(status) { return status === 'Battle' ? foundryBattleMax() : foundrySubMax(); }
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
    if (!foundryCanEdit()) { showToast(foundryL('Anda tidak punya izin mengubah roster IDN.', 'You do not have permission to edit the IDN roster.'), 'warning'); return; }
    if (foundryBulkCandidates().length === 0) { showToast(foundryL('Semua pemain IDN sudah masuk roster Foundry.', 'All IDN players are already in the Foundry roster.'), 'info'); return; }
    foundryBulkSel.clear();
    const defLegion = FOUNDRY_LEGIONS.includes(foundryTab) ? foundryTab : foundryMapLegion;
    const bulkLegs = foundryLockedLegion ? [foundryLockedLegion] : FOUNDRY_LEGIONS;
    document.getElementById('fy-bulk-legion').innerHTML = bulkLegs.map(l =>
        `<option value="${l}" ${l === defLegion ? 'selected' : ''}>${l}</option>`).join('');
    document.getElementById('fy-bulk-search').value = '';
    document.getElementById('fy-bulk-modal').classList.remove('hidden');
    foundryBulkUpdate();
    foundryBulkFilter();
    foundryApplyLanguage(document.getElementById('fy-bulk-modal'));
}
function closeFoundryBulkAssign() { document.getElementById('fy-bulk-modal').classList.add('hidden'); }

function foundryBulkFilter() {
    const shown = foundryBulkShown();
    document.getElementById('fy-bulk-list').innerHTML = shown.length === 0
        ? `<div class="bulk-remove-empty">${foundryL('Tidak ada pemain yang cocok.', 'No matching players.')}</div>`
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
            showToast(foundryL('Slot kosong sudah penuh. Pilih Legion/Status lain atau kurangi pilihan.', 'No free slots left. Pick another Legion/Status or reduce your selection.'), 'warning');
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
        if (shown.some(p => !foundryBulkSel.has(String(p.id)))) showToast(foundryL(`Hanya ${cap} slot kosong, jadi pemilihan dibatasi.`, `Only ${cap} free slots, so the selection is limited.`), 'info');
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
        const label = st === 'Battle' ? 'Battle' : foundryL('Cadangan', 'Substitute');
        return `<option value="${st}" ${st === cur ? 'selected' : ''}>${label} (${foundryL('sisa', 'left')} ${free} / ${foundryBulkMax(st)})</option>`;
    }).join('');
    foundryBulkSummary();
}

function foundryBulkSummary() {
    const t = foundryBulkTarget();
    const cap = foundryBulkCapacity(), n = foundryBulkSel.size;
    document.getElementById('fy-bulk-count').innerText = foundryL(`${n} dipilih`, `${n} selected`);
    const over = n > cap;
    document.getElementById('fy-bulk-info').innerText = cap === 0
        ? foundryL(`${t.legion} ${t.status === 'Battle' ? 'Battle' : 'Cadangan'} sudah penuh.`, `${t.legion} ${t.status === 'Battle' ? 'Battle' : 'Substitute'} is full.`)
        : over ? foundryL(`Pilihan (${n}) melebihi slot kosong (${cap}). Kurangi pilihan.`, `Selection (${n}) exceeds the free slots (${cap}). Reduce your selection.`)
        : foundryL(`Slot kosong: ${cap}. Pemain mengisi slot kosong terendah lebih dulu.`, `Free slots: ${cap}. Players fill the lowest free slots first.`);
    const btn = document.getElementById('fy-bulk-submit');
    btn.disabled = n === 0 || over;
    btn.innerText = n > 0 ? `${foundryL('Assign Terpilih', 'Assign Selected')} (${n})` : foundryL('Assign Terpilih', 'Assign Selected');
    const all = document.getElementById('fy-bulk-all'), shown = foundryBulkShown();
    const sel = shown.filter(p => foundryBulkSel.has(String(p.id))).length;
    all.checked = shown.length > 0 && sel === shown.length;
    all.indeterminate = sel > 0 && sel < shown.length;
}

async function foundryBulkSubmit() {
    if (!foundryCanEdit()) { showToast(foundryL('Anda tidak punya izin mengubah roster IDN.', 'You do not have permission to edit the IDN roster.'), 'warning'); return; }
    const { legion, status } = foundryBulkTarget();
    const chosen = foundryBulkCandidates().filter(p => foundryBulkSel.has(String(p.id)))
        .sort((a, b) => Number(b.troops_power || 0) - Number(a.troops_power || 0));
    const slots = foundryBulkFreeSlots(legion, status);
    if (chosen.length === 0) return;
    if (chosen.length > slots.length) { showToast(foundryL('Slot kosong tidak cukup untuk pilihan ini.', 'Not enough free slots for this selection.'), 'warning'); foundryBulkSummary(); return; }
    const btn = document.getElementById('fy-bulk-submit');
    btn.disabled = true;
    const jobs = chosen.map((p, i) => ({ p, patch: foundryPatchFor(legion, status, slots[i]) }));
    let done = 0;
    try {
        const client = getSupabase();
        for (let i = 0; i < jobs.length; i += 20) {
            const batch = jobs.slice(i, i + 20);
            const res = await Promise.all(batch.map(j => client.from('troops_power').update(foundryDbPatch(j.patch)).eq('id', j.p.id)));
            res.forEach((r, k) => { if (!r.error) { Object.assign(batch[k].p, batch[k].patch); done++; } });
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        showToast(foundryL(`${done} pemain di-assign ke ${legion} (${status === 'Battle' ? 'Battle' : 'Cadangan'}).`, `${done} players assigned to ${legion} (${status === 'Battle' ? 'Battle' : 'Substitute'}).`), 'success');
        closeFoundryBulkAssign();
        foundryTab = legion;
    } catch (e) {
        showToast(foundryL(`Sebagian gagal (${done}/${jobs.length} tersimpan). Pastikan supabase_foundry_roster.sql dan supabase_foundry_p3.sql sudah dijalankan.`, `Partly failed (${done}/${jobs.length} saved). Make sure supabase_foundry_roster.sql and supabase_foundry_p3.sql have been run.`), 'error');
        foundryBulkSel.clear(); foundryBulkFilter(); foundryBulkUpdate();
    }
    foundryRender();
}

// Susun satu Legion. Battle: urut Power -> slot 1..n, role & target Phase 1-3 dari foundryPlanTasks (cakupan
// bangunan per fase). Cadangan: urut Power -> slot 1..n. Cover cadangan ikut pindah ke slot baru pemain yang
// sama; cadangan yang belum punya cover diberi slot Battle paling kritis (urutan FOUNDRY_PRIORITY) yang belum dicover.
function foundryLegionJobs(l) {
    const byPower = (a, b) => (Number(b.troops_power) || 0) - (Number(a.troops_power) || 0) || (Number(a.foundry_slot) || 0) - (Number(b.foundry_slot) || 0);
    const battle = foundryPlayers.filter(p => p.foundry_legion === l && p.foundry_status === 'Battle').sort(byPower).slice(0, foundryBattleMax());
    const subs = foundryPlayers.filter(p => p.foundry_legion === l && p.foundry_status === 'Substitute').sort(byPower).slice(0, foundrySubMax());
    const plan = foundryPlanTasks(battle.length);
    const jobs = [], newSlotOf = new Map();
    battle.forEach((p, i) => {
        newSlotOf.set(Number(p.foundry_slot), i + 1);
        const patch = { foundry_slot: i + 1, foundry_role: plan[i].role, foundry_p1: plan[i].p1, foundry_p2: plan[i].p2 };
        if (foundryExt) { patch.foundry_p3 = plan[i].p3; patch.foundry_cover = null; }
        jobs.push({ p, patch });
    });
    const covers = subs.map(p => foundryExt ? (newSlotOf.get(Number(p.foundry_cover)) || null) : null);
    if (foundryExt) {
        const taken = new Set(covers.filter(Boolean));
        const critical = battle.map((p, i) => ({ slot: i + 1, rank: FOUNDRY_PRIORITY.indexOf(plan[i].slot) }))
            .sort((a, b) => a.rank - b.rank).map(x => x.slot).filter(s => !taken.has(s));
        covers.forEach((c, j) => { if (!c && critical.length) covers[j] = critical.shift(); });
    }
    subs.forEach((p, j) => {
        const patch = { foundry_slot: j + 1 };
        if (foundryExt) patch.foundry_cover = covers[j];
        jobs.push({ p, patch });
    });
    const short = foundryShortages(plan);
    return { jobs: jobs.filter(j => Object.keys(j.patch).some(k => (j.p[k] ?? null) !== (j.patch[k] ?? null))), short, nBattle: battle.length };
}

// Isi otomatis: menyusun ulang pemain yang SUDAH ada di tiap Legion. Legion dan status (Battle / Cadangan)
// setiap pemain dipertahankan; tidak ada pemain baru yang ditambahkan.
async function foundryAutoFill() {
    if (!foundryCanEdit()) return;
    if (!foundryPlayers.some(foundryInRoster)) { showToast(foundryL('Belum ada pemain di roster Foundry. Assign pemain ke Legion dulu.', 'No players in the Foundry roster yet. Assign players to a Legion first.'), 'info'); return; }
    const results = FOUNDRY_LEGIONS.map(l => ({ l, ...foundryLegionJobs(l) }));
    const gaps = results.filter(r => r.short.length).map(r => `${r.l}: ${r.short.slice(0, 4).join(', ')}${r.short.length > 4 ? ` +${r.short.length - 4}` : ''}`);
    const msg = foundryL(
        'Susun ulang & hitung ulang roster berdasarkan Troops Power? Slot, role, dan target Phase 1, 2, 3 dihitung dari kebutuhan tiap fase, termasuk march penguatan Rally Leader & Joiner ke bangunan (sama dengan tabel Garrison); cadangan diurutkan dan dipasangkan ke slot Battle yang paling kritis bila belum punya pasangan. Legion dan status tiap pemain tetap; tidak ada pemain baru yang ditambahkan.' + (gaps.length ? ` Belum cukup penjaga: ${gaps.join(' | ')}.` : ' Semua bangunan terisi cukup.'),
        'Re-arrange and recalculate the roster by Troops Power? Slots, roles and Phase 1, 2, 3 targets are calculated from each phase\'s needs, including the reinforcement marches of Rally Leaders & Joiners (same as the Garrison table); substitutes are ranked and paired with the most critical Battle slots if unpaired. Each player keeps their Legion and status; no new players are added.' + (gaps.length ? ` Not enough players: ${gaps.join(' | ')}.` : ' Every building has enough players.'));
    if (!await showCustomConfirmAsync(msg, '#f59e0b')) return;
    const jobs = results.flatMap(r => r.jobs);
    try {
        const client = getSupabase();
        for (let i = 0; i < jobs.length; i += 20) {
            const res = await Promise.all(jobs.slice(i, i + 20).map(j => client.from('troops_power').update(foundryDbPatch(j.patch)).eq('id', j.p.id)));
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        jobs.forEach(j => { Object.assign(j.p, j.patch); if (foundryMode === 'tundra') Object.assign(j.p, foundryDbPatch(j.patch)); });
        showToast(foundryL(`Roster Foundry dihitung ulang (${jobs.length} pemain diperbarui; Legion & status tetap).`, `Foundry roster recalculated (${jobs.length} players updated; Legion & status unchanged).`), gaps.length ? 'warning' : 'success');
    } catch (e) {
        showToast(foundryL('Gagal mengisi otomatis. Pastikan supabase_foundry_roster.sql dan supabase_foundry_p3.sql sudah dijalankan.', 'Auto-fill failed. Make sure supabase_foundry_roster.sql and supabase_foundry_p3.sql have been run.'), 'error');
        await foundryLoad(); return;
    }
    foundryRender();
}

async function foundryClearAll() {
    if (!foundryCanEdit()) return;
    if (!await showCustomConfirmAsync(foundryL('Kosongkan seluruh roster Foundry IDN?', 'Clear the entire IDN Foundry roster?'))) return;
    try { for (const p of foundryPlayers.filter(foundryInRoster)) await foundryClear(p); }
    catch (e) { showToast(foundryL('Gagal mengosongkan roster.', 'Failed to clear the roster.'), 'error'); }
    foundryRender();
}

// Salin roster untuk Discord. Mode: 'all' (per slot, semua fase) atau 1/2/3 (dikelompokkan per bangunan).
async function foundryCopyText() {
    const mode = (document.getElementById('foundry-copy-mode') || {}).value || 'all';
    const which = (document.getElementById('foundry-copy-legion') || {}).value || 'all';
    const legions = which === 'all' ? FOUNDRY_LEGIONS : [which];
    const lines = ['**FOUNDRY BATTLE ROSTER — IDN**' + (mode === 'all' ? '' : ` — Phase ${mode} (${FOUNDRY_PHASE_RANGE[Number(mode) - 1]} ${foundryL('mnt', 'min')})`)];
    legions.forEach(l => {
        lines.push('', `__${l}__`);
        if (mode === 'all') {
            for (let i = 1; i <= foundryBattleMax(); i++) {
                const p = foundryFind(l, 'Battle', i);
                const jl = p && p.foundry_role === 'Joiner' ? foundryJoinerOf(p, l) : null;
                if (p) lines.push(`${i}. ${p.nickname} — ${p.foundry_role}${jl ? ' → ' + jl.nickname : ''} | P1: ${foundryName(foundryTarget(p, 1))} | P2: ${foundryName(foundryTarget(p, 2))} | P3: ${foundryName(foundryTarget(p, 3))}`);
            }
        } else {
            const ph = Number(mode);
            FOUNDRY_KEYS.forEach(k => {
                const ps = foundryAssigned(l, k, ph);
                if (ps.length) lines.push(`**${foundryName(k)}** (${ps.length}): ` + ps.map(p => `#${p.foundry_slot} ${p.nickname}`).join(', '));
            });
        }
        if (mode === '2' || mode === 2) foundryRallyTeams(l).teams.forEach(t => lines.push(`**Rally ${t.leader.nickname}** (${foundryFmtPower(t.power)}): ${t.joiners.map(j => j.nickname).join(', ') || '-'}`));
        const subs = [];
        for (let i = 1; i <= foundrySubMax(); i++) {
            const p = foundryFind(l, 'Substitute', i);
            if (p) subs.push(p.nickname + (p.foundry_cover ? ` (→#${p.foundry_cover})` : ''));
        }
        if (subs.length) lines.push(`${foundryL('Cadangan (masuk setelah menit 3)', 'Substitutes (enter after minute 3)')}: ${subs.join(', ')}`);
    });
    const text = lines.join('\n');
    const ok = typeof fdtCopyText === 'function' ? await fdtCopyText(text)
        : (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text).then(() => true, () => false) : false);
    if (!ok) { showToast(foundryL('Browser tidak mengizinkan salin otomatis.', 'Your browser does not allow automatic copying.'), 'warning'); return; }
    showToast(text.length > 1900
        ? foundryL(`Roster disalin (${text.length} karakter, lebih dari batas 2000 Discord: kirim per Legion atau per Phase).`, `Roster copied (${text.length} characters, over Discord's 2000 limit: send per Legion or per Phase).`)
        : foundryL('Roster disalin (siap tempel ke Discord).', 'Roster copied (ready to paste into Discord).'), text.length > 1900 ? 'warning' : 'success');
}

// ---------- MAP ----------
function foundryAssigned(legion, key, phase) {
    return foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle' && foundryTarget(p, phase) === key)
        .sort((a, b) => a.foundry_slot - b.foundry_slot);
}

function foundryPickBuilding(key) { foundrySelected = key; foundryRender(); }
function foundrySetPhase(n) { foundryPhase = n === 'all' ? 'all' : Number(n); foundryRender(); }
const foundryNormPhase = v => (String(v).toLowerCase() === 'all' ? 'all' : ([1, 2, 3].includes(Number(v)) ? Number(v) : 1));
const foundryPhaseLabel = ph => ph === 'all' ? foundryL('Semua Phase', 'All Phases') : `Phase ${ph} (${FOUNDRY_PHASE_RANGE[ph - 1]} ${foundryL('mnt', 'min')})`;
function foundrySetMapLegion(l) {
    if (foundryLockedLegion && l !== foundryLockedLegion) return;
    foundryMapLegion = l;
    foundryRender();
}

function foundryToggleTaskMarks() { foundryTaskMarksOn = !foundryTaskMarksOn; foundryRender(); }
function foundryToggleCountMarks() { foundryCountMarksOn = !foundryCountMarksOn; foundryRender(); }
function foundryToggleTaskFilter(role, checked) {
    if (checked) foundryTaskFilters.add(role); else foundryTaskFilters.delete(role);
    foundryRender();
}
function foundrySetAllTaskFilters(checked) {
    foundryTaskFilters = checked ? new Set(FOUNDRY_ROLES) : new Set();
    foundryRender();
}

// Hitung posisi mark nama pemain (anti-tumpuk + garis penghubung ke bangunan).
// Dipakai SVG interaktif dan export PNG agar hasilnya konsisten.
// filters: Set role | null/undefined = tampilkan semua.
function foundryComputeTaskMarks(L, ph, filters) {
    const PAD = 4, MARK_H = 20, GAP = 4;
    const SLOT_RING = [
        [0, 36], [0, -36], [42, 0], [-42, 0],
        [36, 28], [-36, 28], [36, -28], [-36, -28],
        [0, 58], [0, -58], [64, 0], [-64, 0],
        [50, 46], [-50, 46], [50, -46], [-50, -46],
        [22, 72], [-22, 72], [22, -72], [-22, -72],
        [78, 22], [-78, 22], [78, -22], [-78, -22]
    ];
    const items = [];
    Object.entries(FOUNDRY_B).filter(([, b]) => b.x).forEach(([key, b]) => {
        const ps = foundryAssigned(L, key, ph).filter(p => !filters || filters.has(p.foundry_role || ''));
        ps.forEach((p, i) => {
            const col = FOUNDRY_ROLE_COLOR[p.foundry_role] || '#e5e7eb';
            const rawName = (p.nickname || '?').trim();
            const label = rawName.length > 8 ? rawName.slice(0, 7) + '…' : rawName;
            const tw = Math.max(28, Math.min(72, label.length * 7 + 12));
            const slot = SLOT_RING[i % SLOT_RING.length];
            const ring = Math.floor(i / SLOT_RING.length);
            const scale = 1 + ring * 0.55;
            let x = b.x + slot[0] * scale;
            let y = b.y + slot[1] * scale;
            x = Math.max(tw / 2 + PAD, Math.min(FOUNDRY_MAP.w - tw / 2 - PAD, x));
            y = Math.max(MARK_H / 2 + PAD, Math.min(FOUNDRY_MAP.h - MARK_H / 2 - PAD, y));
            items.push({ p, b, key, col, label, tw, x, y, bx: b.x, by: b.y, markH: MARK_H });
        });
    });
    const overlaps = (a, b) => {
        const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
        return dx < (a.tw + b.tw) / 2 + GAP && dy < MARK_H + GAP;
    };
    for (let iter = 0; iter < 28; iter++) {
        let moved = false;
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = items[i], b = items[j];
                if (!overlaps(a, b)) continue;
                const dx = a.x - b.x || 0.01, dy = a.y - b.y || 0.01;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const needX = (a.tw + b.tw) / 2 + GAP - Math.abs(dx);
                const needY = MARK_H + GAP - Math.abs(dy);
                const push = 0.55;
                if (needX > 0 && needX >= needY) {
                    const sx = (dx / dist) * needX * push;
                    a.x += sx; b.x -= sx;
                } else if (needY > 0) {
                    const sy = (dy / dist) * needY * push;
                    a.y += sy; b.y -= sy;
                }
                moved = true;
            }
        }
        items.forEach(it => {
            it.x = Math.max(it.tw / 2 + PAD, Math.min(FOUNDRY_MAP.w - it.tw / 2 - PAD, it.x));
            it.y = Math.max(MARK_H / 2 + PAD, Math.min(FOUNDRY_MAP.h - MARK_H / 2 - PAD, it.y));
        });
        if (!moved) break;
    }
    // Hitung titik ujung garis di tepi label (paling dekat ke bangunan)
    items.forEach(it => {
        const halfW = it.tw / 2, halfH = MARK_H / 2;
        let ex = it.x, ey = it.y;
        const dx = it.bx - it.x, dy = it.by - it.y;
        if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) {
            ex = it.x + (dx > 0 ? halfW : -halfW);
            ey = it.y + (halfW * dy) / (Math.abs(dx) || 1);
            ey = Math.max(it.y - halfH, Math.min(it.y + halfH, ey));
        } else {
            ey = it.y + (dy > 0 ? halfH : -halfH);
            ex = it.x + (halfH * dx) / (Math.abs(dy) || 1);
            ex = Math.max(it.x - halfW, Math.min(it.x + halfW, ex));
        }
        it.ex = ex; it.ey = ey;
    });
    return items;
}

// Isi SVG peta (gambar + lingkaran bangunan + mark slot). Dipakai halaman utama dan Live Share.
// opts: { interactive, filters (Set | null), marks (bool), counts (bool) }
function foundryMapSvgInner(L, ph, opts = {}) {
    const showCounts = opts.counts !== false;
    const nodes = Object.entries(FOUNDRY_B).filter(([k, b]) => b.x && !['roam', 'workshop'].includes(k)).map(([k, b]) => {
        const n = foundryAssigned(L, k, ph).length;
        const attrs = opts.interactive ? ` onclick="foundryPickBuilding('${k}')" tabindex="0" role="button" aria-label="${escapeHtml(b.n)}"` : '';
        const countText = showCounts ? `<text x="${b.x}" y="${b.y + 16}" text-anchor="middle" class="fy-n">${n}</text>` : '';
        return `<g class="fy-node ${b.ph <= ph ? '' : 'fy-off'} ${opts.interactive && k === foundrySelected ? 'fy-sel' : ''}"${attrs}>
            <circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.c}" fill-opacity=".55" stroke="${b.c}" stroke-width="8"/>
            ${countText}</g>`;
    }).join('');

    let marks = '';
    if (opts.marks !== false) {
        const items = foundryComputeTaskMarks(L, ph, opts.filters);
        const lines = items.map(it =>
            `<line class="fy-task-line" x1="${it.bx}" y1="${it.by}" x2="${it.ex}" y2="${it.ey}" stroke="${it.col}" stroke-width="1.25" stroke-opacity="0.75"/>`
        ).join('');
        const labels = items.map(it => {
            const { p, b, col, label, tw, x, y, markH } = it;
            const live = opts.liveEdit && foundryLiveEditAllowed();
            const click = live
                ? ` onclick="foundryOnMapMarkClick('${p.id}',event)" style="cursor:pointer"`
                : '';
            const role = live ? 'button' : 'img';
            return `<g class="fy-task-mark${live ? ' fy-task-mark--edit' : ''}" tabindex="0" role="${role}" aria-label="#${p.foundry_slot} ${escapeHtml(p.nickname)} — ${escapeHtml(p.foundry_role || 'Task')}" transform="translate(${x},${y})"${click}><title>#${p.foundry_slot} · ${escapeHtml(p.nickname)} · ${escapeHtml(p.foundry_role || 'Task')} · ${escapeHtml(b.n)}${live ? ' · click to edit' : ''}</title><rect x="${-tw / 2}" y="${-markH / 2}" width="${tw}" height="${markH}" rx="6" fill="${col}" stroke="${live ? '#fcd34d' : '#111827'}" stroke-width="${live ? 2.5 : 2}"/><text x="0" y="4" text-anchor="middle" class="fy-task-mark-text">${escapeHtml(label)}</text></g>`;
        }).join('');
        marks = `<g class="fy-task-lines" pointer-events="none">${lines}</g>${labels}`;
    }
    return `<image href="${FOUNDRY_MAP.src}" x="0" y="0" width="${FOUNDRY_MAP.w}" height="${FOUNDRY_MAP.h}"/>${nodes}<g class="fy-task-zone-labels"><text x="38" y="22" class="fy-zone-label">ROAM</text><text x="516" y="22" text-anchor="middle" class="fy-zone-label">WORKSHOP</text></g>${marks}`;
}

// Tampilan "All Phase": tiga peta (Phase 1, 2, 3) sekaligus dalam satu grid.
function foundryMapAllHtml(L, opts = {}) {
    return `<div class="fy-map-all">${[1, 2, 3].map(n => `<div class="fy-map-all-item"><h4>${foundryPhaseLabel(n)}</h4><svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map" role="img" aria-label="Foundry Map - Phase ${n}">${foundryMapSvgInner(L, n, opts)}</svg></div>`).join('')}</div>`;
}

function foundryMapLegendHtml(forShare) {
    const en = foundryLanguage === 'en';
    return `<div class="fy-map-legend" aria-label="Map marker legend">
        <h3>${en ? 'Map marker guide' : 'Keterangan mark pada peta'}</h3>
        <p><b>${en ? 'Large number in a circle:' : 'Angka besar di lingkaran:'}</b> ${en ? 'number of players assigned to that building in the selected phase.' : 'jumlah pemain yang ditugaskan ke bangunan tersebut pada fase yang dipilih.'}</p>
        <p><b>${en ? 'Small name marker:' : 'Mark kecil nama:'}</b> ${forShare ? (en ? 'player name; see the table below for slot, role, and target.' : 'nama pemain; lihat tabel di bawah untuk slot, tugas, dan target.') : (en ? 'player name. Tap it to see slot, role, and target.' : 'nama pemain. Ketuk mark untuk melihat slot, tugas, dan target.')}</p>
        <div class="fy-map-legend-items">${FOUNDRY_ROLES.map(r => `<span><i style="background:${FOUNDRY_ROLE_COLOR[r]}"></i>${en ? r : FOUNDRY_ROLE_ID[r]}</span>`).join('')}</div>
    </div>`;
}

function foundryMapHtml() {
    const L = foundryMapLegion, ph = foundryPhase;
    const b = FOUNDRY_B[foundrySelected];
    const live = foundryLiveEdit && foundryLiveEditAllowed();
    const mapOpts = { interactive: true, filters: foundryTaskFilters, marks: foundryTaskMarksOn, counts: foundryCountMarksOn, liveEdit: live };
    const list = (phase) => {
        const ps = foundryAssigned(L, foundrySelected, phase);
        if (!ps.length) return '<li class="fy-empty">belum ada</li>';
        if (live) {
            return ps.map(p => `<li class="fy-live-list-item">
                <button type="button" class="fy-live-name" onclick="foundryOpenLiveEditor('${p.id}', event.clientX, event.clientY)">#${p.foundry_slot} ${escapeHtml(p.nickname)}</button>
                <small>(${escapeHtml(p.foundry_role || '—')})</small>
                ${foundryLiveEditorFieldsHtml(p)}
            </li>`).join('');
        }
        return ps.map(p => `<li>#${p.foundry_slot} ${escapeHtml(p.nickname)} <small>(${escapeHtml(p.foundry_role)})</small></li>`).join('');
    };
    const pts = b.m ? `<p><b>${b.f.toLocaleString('en-US')}</b> ${foundryL('poin first capture', 'first-capture points')} + <b>${b.m.toLocaleString('en-US')}</b> ${foundryL('poin/menit', 'points/min')}</p>` : '';
    const liveBadge = live ? `<p class="fy-live-banner"><b class="fy-edit-badge">✏️ Live Edit on</b> — ${foundryL('Ketuk mark nama di peta atau pemain di daftar untuk mengubah peran & target. Perubahan langsung tersimpan.', 'Tap a name mark on the map or a player in the list to change role & targets. Changes save instantly.')}</p>` : '';
    return `${foundryExtNotice()}<div class="fy-controls">
        ${foundryLiveEditBtnHtml()}
        <button class="btn-apply" type="button" onclick="shareFoundryMapLink()">🔗 Live Share Map</button>
        <button class="btn-apply" type="button" onclick="foundryExportPng()">🖼️ ${foundryL('Ekspor PNG', 'Export PNG')}</button>
        ${foundryLegionSwitchHtml(L, 'foundrySetMapLegion')}
        ${[1, 2, 3].map(n => `<button class="btn-apply ${n === ph ? 'fy-on' : ''}" onclick="foundrySetPhase(${n})">Phase ${n} (${FOUNDRY_PHASE_RANGE[n - 1]} ${foundryL('mnt', 'min')})</button>`).join('')}
        <button class="btn-apply ${ph === 'all' ? 'fy-on' : ''}" onclick="foundrySetPhase('all')">🧭 ${foundryPhaseLabel('all')}</button></div>
        ${liveBadge}
        ${foundryWarningsHtml(L, ph === 'all' ? null : ph)}
        <div class="fy-task-filter"><div class="fy-task-filter-head"><strong>Mark tugas pemain</strong>
            <button class="btn-apply ${foundryTaskMarksOn ? 'fy-on' : ''}" onclick="foundryToggleTaskMarks()">${foundryTaskMarksOn ? 'Nama: ON' : 'Nama: OFF'}</button>
            <button class="btn-apply ${foundryCountMarksOn ? 'fy-on' : ''}" onclick="foundryToggleCountMarks()">${foundryCountMarksOn ? 'Angka: ON' : 'Angka: OFF'}</button>
            <button class="btn-apply" onclick="foundrySetAllTaskFilters(true)">Pilih semua</button>
            <button class="btn-apply" onclick="foundrySetAllTaskFilters(false)">Matikan semua</button>
        </div><div class="fy-task-filter-options">${FOUNDRY_ROLES.map(r => `<label><input type="checkbox" ${foundryTaskFilters.has(r) ? 'checked' : ''} onchange="foundryToggleTaskFilter('${r}',this.checked)"><span>${r}</span></label>`).join('')}</div><small>Mark menampilkan nama pemain yang ditugaskan ke bangunan pada phase terpilih. Arahkan/ketuk mark untuk melihat slot, tugas, dan target. Tombol Angka mengontrol angka besar di lingkaran.${live ? ' ' + foundryL('Mode Live Edit: ketuk mark untuk mengedit.', 'Live Edit mode: tap a mark to edit.') : ''}</small></div>
        ${ph === 'all' ? foundryMapAllHtml(L, mapOpts) : `<svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map${live ? ' fy-map--live' : ''}" role="img" aria-label="Peta Foundry Battle">${foundryMapSvgInner(L, ph, mapOpts)}</svg>`}
        <div class="fy-extra">${['roam', 'workshop'].map(k => `<button class="btn-apply ${k === foundrySelected ? 'fy-on' : ''}" onclick="foundryPickBuilding('${k}')">${escapeHtml(FOUNDRY_B[k].n)}</button>`).join('')}</div>
        <p class="fy-note">Angka di lingkaran = jumlah pemain yang ditugaskan pada bangunan untuk phase terpilih. Mark kecil = nama pemain; gunakan filter tugas untuk menampilkan peran tertentu.</p>
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
        phase = foundryNormPhase(phase);
        const all = phase === 'all', phases = all ? [1, 2, 3] : [phase];
        const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = FOUNDRY_MAP.src; });
        const S = 2, W = FOUNDRY_MAP.w, MH = FOUNDRY_MAP.h, HEAD = 44, FOOT = 40, SUB = all ? 30 : 0, BLOCK = MH + SUB;
        // Satu phase: pemain yang ditugaskan pada phase itu. All Phase: semua pemain Battle + target tiap phase.
        const rows = all
            ? foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle').sort((a, b) => a.foundry_slot - b.foundry_slot).map(p => ({ k: null, p }))
            : FOUNDRY_KEYS.flatMap(k => foundryAssigned(legion, k, phase).map(p => ({ k, p }))).sort((a, b) => a.p.foundry_slot - b.p.foundry_slot);
        const half = all ? rows.length : Math.ceil(rows.length / 2), LH = 17;
        const listH = rows.length ? half * LH + 16 : 24;
        const H = HEAD + BLOCK * phases.length + listH + FOOT;
        const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
        const x = c.getContext('2d'); x.scale(S, S);
        const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, H);
        x.textBaseline = 'middle'; x.textAlign = 'left';
        x.fillStyle = '#fcd34d'; x.font = `bold 15px ${font}`;
        x.fillText(`Foundry Battle · ${foundryTag()} · ${legion} · ${foundryPhaseLabel(phase)}`, 12, HEAD / 2);
        phases.forEach((ph, idx) => {
            const top = HEAD + idx * BLOCK;          // batas atas blok phase ini
            const oy = top + SUB;                    // batas atas gambar peta
            if (all) {
                x.textAlign = 'left'; x.fillStyle = '#fcd34d'; x.font = `bold 13px ${font}`;
                x.fillText(foundryPhaseLabel(ph), 12, top + SUB / 2);
            }
            x.drawImage(img, 0, oy, W, MH);
            Object.entries(FOUNDRY_B).filter(([k, b]) => b.x && !['roam', 'workshop'].includes(k)).forEach(([k, b]) => {
                const n = foundryAssigned(legion, k, ph).length;
                x.globalAlpha = b.ph <= ph ? 1 : .3;
                x.beginPath(); x.arc(b.x, oy + b.y, b.r, 0, Math.PI * 2);
                x.fillStyle = foundryRgba(b.c, .55); x.fill();
                x.lineWidth = 6; x.strokeStyle = b.c; x.stroke();
                if (foundryCountMarksOn) {
                    x.textAlign = 'center'; x.font = `800 26px ${font}`;
                    x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(String(n), b.x, oy + b.y);
                    x.fillStyle = '#fff'; x.fillText(String(n), b.x, oy + b.y);
                }
                x.globalAlpha = 1;
            });
            x.textAlign = 'center'; x.font = `800 12px ${font}`; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.8)'; x.fillStyle = '#fff';
            [['ROAM', 38], ['WORKSHOP', 516]].forEach(([t, px]) => { x.strokeText(t, px, oy + 22); x.fillText(t, px, oy + 22); });
            // Mark nama + garis penghubung (posisi anti-tumpuk, sama dengan SVG)
            if (foundryTaskMarksOn) {
                const markItems = foundryComputeTaskMarks(legion, ph, null);
                markItems.forEach(it => {
                    x.strokeStyle = it.col; x.globalAlpha = 0.75; x.lineWidth = 1.25; x.lineCap = 'round';
                    x.beginPath(); x.moveTo(it.bx, oy + it.by); x.lineTo(it.ex, oy + it.ey); x.stroke();
                    x.globalAlpha = 1;
                });
                markItems.forEach(it => {
                    const mx = it.x, my = oy + it.y, tw = it.tw, h = it.markH;
                    x.beginPath(); if (x.roundRect) x.roundRect(mx - tw / 2, my - h / 2, tw, h, 6); else x.rect(mx - tw / 2, my - h / 2, tw, h);
                    x.fillStyle = it.col; x.fill();
                    x.lineWidth = 2; x.strokeStyle = '#111827'; x.stroke();
                    x.fillStyle = '#111827'; x.font = `800 10px ${font}`; x.textAlign = 'center'; x.fillText(it.label, mx, my + 1);
                });
            }
        });
        // daftar pemain & tugas
        x.textAlign = 'left'; x.font = `11px ${font}`;
        const ly = HEAD + BLOCK * phases.length + 8, colW = all ? W - 14 : W / 2 - 14;
        if (!rows.length) { x.fillStyle = '#94a3b8'; x.fillText(foundryL('Belum ada pemain Battle yang ditugaskan pada phase ini.', 'No battle players assigned for this phase.'), 12, ly + 10); }
        rows.forEach(({ k, p }, i) => {
            const cx = 12 + (!all && i >= half ? W / 2 : 0), cy = ly + (i % half) * LH + 8;
            x.fillStyle = FOUNDRY_ROLE_COLOR[p.foundry_role] || '#e5e7eb'; x.fillRect(cx, cy - 5, 9, 10);
            const tn = ph => { const kk = foundryTarget(p, ph); return kk && FOUNDRY_B[kk] ? FOUNDRY_B[kk].n : '-'; };
            let t = `#${p.foundry_slot} ${p.nickname || '-'} · ${p.foundry_role || '-'} → ` + (all ? `P1 ${tn(1)} · P2 ${tn(2)} · P3 ${tn(3)}` : FOUNDRY_B[k].n);
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
        const name = `foundry-${legion.replace(/\s+/g, '').toLowerCase()}-${all ? 'allphases' : 'phase' + phase}.png`;
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

// ---------- STRATEGY ----------
function foundryStrategyHtml() { return foundryLanguage === 'zh' ? foundryStrategyHtmlZh() : (foundryLanguage === 'en' ? foundryStrategyHtmlEn() : foundryStrategyHtmlId()); }
function foundryStrategyHtmlZh() {
    const rows = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].m).map(k => { const b = FOUNDRY_B[k];
        return `<tr><td>${escapeHtml(b.n)}</td><td>${b.ph === 1 ? '第 0 分钟开放' : '第 15 分钟开放'}</td><td>${b.f.toLocaleString('en-US')}</td><td>${b.m.toLocaleString('en-US')}</td></tr>`; }).join('');
    return `<div class="fy-guide">
<section><h3>1. 活动概览</h3><ul><li>Foundry Battle 是联盟对联盟的战斗活动，每场持续 60 分钟，每两周举行一次。每个军团最多包含 30 名战斗成员和 10 名替补；每位玩家只能加入一个军团。</li><li>参赛条件：熔炉等级达到 16 级以上，且联盟战力排名进入前 20。每个联盟最多可报名 2 个军团；联盟排名奖励主要依据 Legion 1 计算。</li><li>替补玩家只能在第 3 分钟后进入战场。离开战场后，必须等待 12 分钟才能重新进入。</li><li>联盟军械库积分（Alliance Arsenal Points）最高的联盟获胜。个人积分只用于个人奖励（PvP：防守时每 10K 战力获得 40 分，进攻时获得 80 分）。</li><li>建筑积分有容量上限；超出的部分会成为临时积分，并在建筑易主时掉落为 Arsenal Supplies，双方都可以拾取。</li><li>部队不会永久阵亡；受伤部队会在战斗结束后恢复。</li></ul></section>
<section><h3>2. 建筑积分（全地图总计：每分钟 7,560 分）</h3><div class="table-container"><table class="fy-table"><thead><tr><th>建筑</th><th>开放时间</th><th>首次占领积分</th><th>每分钟积分</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fy-note">占领建筑通常约需 2 分钟（控制 Boiler Room 后约需 1 分钟）。建筑完全被占领后才会开始产生积分，因此请确保完成占领。</p></section>
<section><h3>3. 时间线与阶段计划</h3><ul>
<li><b>开始前：</b>确认所有人的任务，保存阵型，并召回所有行军部队。战斗开始后，立即传送到分配的建筑。</li>
<li><b>阶段 1（0–15 分钟）：</b>争夺 2 个 Prototype Site、4 个 Repair Facility、Boiler Room 和 Central Transit Station。优先占领 Boiler Room 与 Transit Station（占领较快，也更容易反复易手）。Prototype Site 由最强集结队负责防守；每个 Repair Facility 安排 2 名守点玩家即可。</li>
<li><b>阶段 2（第 15 分钟）：</b>Imperial Foundry、Munitions Warehouse 和 Mercenary Camp 开放。集结队长与集结成员转向中央目标（阶段 2 的主要目标是 Imperial Foundry）；Prototype Site 和 Repair Facility 的守点玩家留守原位，并补足空缺驻军。</li>
<li><b>阶段 3（30–60 分钟）：</b>Weapon Workshop 会随机出现。负责收集的玩家留意小地图并尽快占领。若战况胶着，可利用 Munitions Warehouse（己方伤害 +15%，敌方伤害 -15%）。</li></ul></section>
<section><h3>4. 名单中的职责</h3><ul><li><b>指挥官（1 人）：</b>观察比分，并发布简短明确的指令：防守、增援、集结、收集或轮换。</li><li><b>集结队长 / 集结成员：</b>负责攻击 Imperial Foundry，并在阶段 1 防守 Prototype Site。</li><li><b>机动队员：</b>在各目标间传送，压制高价值敌方建筑，并协助增援。</li><li><b>守点队员：</b>占领并守住指定建筑直到战斗结束，不要随意转移到中央。</li><li><b>收集员：</b>拾取建筑易主时掉落的 Arsenal Supplies，并争夺 Weapon Workshop。（指挥官、机动队员、收集员和游走侦察员是团队内部职责，并非游戏官方职业。）</li><li><b>替补（10 人）：</b>保持在线，第 3 分钟后即可入场。应尽早替换缺席成员，不要等到战斗中途。</li></ul></section>
<section><h3>5. 核心战术</h3><ul>
<li>不要让所有强力玩家都冲向 Imperial Foundry。稳固控制 Prototype Site、Repair Facility 和外围据点（Boiler Room、Transit Station、Munitions Warehouse、Mercenary Camp），往往比一次失败的中央突击更有效。</li>
<li>建筑的持续占领时间与积分价值同样重要：Prototype Site 持续占领 10 分钟可获得 12,000 点持续积分。</li>
<li>建筑即将失守时就应增援守点玩家，不要等失守后才重新争夺。（战场内是否允许派遣增援，请以游戏内实际机制为准。）</li>
<li>优先攻击储存大量临时积分的敌方建筑。成功夺取后会掉落 Arsenal Supplies，应安排收集员在附近待命。</li>
<li>领先时保护持续产分的建筑；落后时瞄准高价值或储存积分的建筑以及 Weapon Workshop；比分接近时快速轮换，避免参与无法改变目标控制权的战斗。</li>
<li>离开战场后需等待 12 分钟才能重新进入；阶段解锁前或战斗结束前不要轻易离场。</li></ul></section>
<section><h3>6. 战前检查清单</h3><ul><li>确认自己的名字和军团与名单一致，并在活动面板确认战斗时间。</li><li>召回所有行军部队，完成侦察，在 Infirmary 治疗伤兵，并取消前往 Embassy 的增援。</li><li>保留治疗加速道具；装备最强的 Chief Gear / Hero Gear，并启用战斗增益。</li><li>为集结、驻防和单人攻击准备好已保存的阵型。</li><li>确认没有任何功能会自动派遣部队离开城市。</li><li>至少准备 10 个 Advanced Teleporter，并启用宠物增益（行军容量、攻击、防御和行军速度）。</li></ul></section>
<section><h3>7. 常见错误</h3><ul><li>所有玩家都挤到 Imperial Foundry。</li><li>忘记拾取建筑易主后掉落的 Arsenal Supplies。</li><li>攻击不会影响比分的敌方城市。</li><li>持续攻击已经无法夺取的目标。</li><li>没有及时关注比分变化。</li></ul></section>
<p class="fy-note">游戏更新后，机制和数值可能发生变化。报名之前请查看游戏内的 Foundry Battle 活动面板。<br>最后核对的社区攻略：${FOUNDRY_VERIFIED}（WoS Helper、mone.gg、BuffBuff、BlueStacks、WoS Tools）。官方数值与规则以游戏内活动面板为准。</p></div>`;
}
function foundryStrategyHtmlId() {
    const rows = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].m).map(k => { const b = FOUNDRY_B[k];
        return `<tr><td>${escapeHtml(b.n)}</td><td>${b.ph === 1 ? 'Menit 0' : 'Menit 15'}</td><td>${b.f.toLocaleString('en-US')}</td><td>${b.m.toLocaleString('en-US')}</td></tr>`; }).join('');
    return `<div class="fy-guide">
<section><h3>1. Gambaran event</h3><ul>
<li>Foundry Battle: pertempuran antar-aliansi selama 60 menit, diadakan setiap 2 minggu. Satu legion = 30 petarung + 10 cadangan; satu pemain hanya boleh berada di satu legion.</li>
<li>Syarat: Furnace Lv 16+ dan aliansi masuk 20 teratas berdasarkan kekuatan. Satu aliansi boleh mendaftarkan maksimal 2 legion; hadiah ranking aliansi terutama dihitung dari Legion 1.</li>
<li>Cadangan baru bisa masuk setelah menit ke-3. Keluar dari medan perang berarti harus menunggu 12 menit sebelum bisa masuk kembali.</li>
<li>Pemenang adalah aliansi dengan Poin Arsenal Aliansi terbanyak. Poin pribadi hanya digunakan untuk hadiah individu (PvP: 40 poin per 10.000 kekuatan saat bertahan, 80 saat menyerang).</li>
<li>Poin bangunan dibatasi kapasitas; kelebihannya menjadi poin sementara yang jatuh sebagai Persediaan Arsenal saat bangunan berpindah tangan, dan bisa diambil kedua belah pihak.</li>
<li>Pasukan tidak mati permanen; cedera dipulihkan setelah pertempuran.</li>
</ul></section>
<section><h3>2. Poin bangunan (total peta penuh: 7.560 poin/menit)</h3>
<div class="table-container"><table class="fy-table"><thead><tr><th>Bangunan</th><th>Buka</th><th>Poin perebutan pertama</th><th>Poin/menit</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fy-note">Waktu untuk menguasai bangunan sekitar 2 menit (sekitar 1 menit jika menguasai Ruang Ketel). Bangunan hanya menghasilkan poin setelah sepenuhnya dikuasai, jadi pastikan perebutan diselesaikan.</p></section>
<section><h3>3. Timeline &amp; rencana per fase</h3><ul>
<li><b>Sebelum mulai:</b> semua sudah siap, formasi tersimpan, semua pasukan yang sedang berbaris ditarik kembali. Begitu pertempuran dibuka, teleport ke bangunan yang ditugaskan.</li>
<li><b>Fase 1 (0–15):</b> 2 Situs Prototipe, 4 Fasilitas Perbaikan, Ruang Ketel, Pos Transit Pusat. Rebut Ruang Ketel dan Pos Transit lebih dulu (penguasaan lebih cepat dan teleport lebih sering). Situs Prototipe dijaga oleh tim rally terkuat; setiap sudut Fasilitas Perbaikan cukup dijaga 2 pemain.</li>
<li><b>Fase 2 (menit 15):</b> Tanur Imperial, Gudang Amunisi, dan Kamp Tentara Bayaran terbuka. Pemimpin Rally dan Anggota Rally (target Fase 2 = Tanur Imperial) berpindah ke tengah; penjaga Situs Prototipe dan Fasilitas Perbaikan tetap di tempat. Isi kembali garnisun yang ditinggalkan.</li>
<li><b>Fase 3 (menit 30–60):</b> Bengkel Senjata muncul secara acak. Pengumpul memantau minimap dan merebut poinnya secepat mungkin. Gunakan Gudang Amunisi (+15% damage / −15% damage musuh) saat pertarungan seimbang.</li>
</ul></section>
<section><h3>4. Peran dalam roster</h3><ul>
<li><b>Komandan (1):</b> pantau skor dan berikan satu perintah singkat: bertahan, perkuat, pimpin serangan, kumpulkan, atau rotasi.</li>
<li><b>Pemimpin Rally / Anggota Rally:</b> inti serangan Tanur Imperial dan penjaga Situs Prototipe di Fase 1.</li>
<li><b>Mobile:</b> teleport antar titik, tekan bangunan musuh bernilai tinggi, membantu memperkuat pertahanan.</li>
<li><b>Holder:</b> menduduki dan menjaga bangunan sampai akhir; tidak ikut berpindah ke tengah.</li>
<li><b>Pengumpul:</b> kumpulkan Persediaan Arsenal yang jatuh saat bangunan berpindah tangan dan rebut Bengkel Senjata. (Komandan, Mobile, Pengumpul, dan Pengintai adalah peran internal tim, bukan kelas resmi di game.)</li>
<li><b>Cadangan (10):</b> tetap online, bisa masuk setelah menit ke-3. Gantikan anggota yang absen sedini mungkin, jangan menunggu pertengahan pertempuran.</li>
</ul></section>
<section><h3>5. Taktik utama</h3><ul>
<li>Jangan biarkan semua pemain kuat menyerbu Tanur Imperial. Menguasai penuh Situs Prototipe + Fasilitas Perbaikan + pos luar (Ruang Ketel, Pos Transit, Gudang Amunisi, Kamp Tentara Bayaran) sering lebih efektif daripada satu rush ke tengah yang gagal.</li>
<li>Waktu tahan sama pentingnya dengan nilai bangunan: Situs Prototipe 10 menit = 12.000 poin berkelanjutan.</li>
<li>Perkuat holder sebelum bangunan jatuh, bukan menunggu bangunan kalah lalu merebutnya kembali (periksa di dalam game apakah pengiriman bantuan diizinkan di medan perang; panduan yang tersedia berbeda-beda).</li>
<li>Serang bangunan musuh yang menyimpan banyak poin sementara; saat berhasil direbut, poinnya jatuh sebagai Persediaan Arsenal, jadi tempatkan Pengumpul di dekatnya.</li>
<li>Skor unggul: lindungi bangunan penghasil poin. Skor tertinggal: incar bangunan bernilai/berisi poin dan Bengkel Senjata. Skor ketat: rotasi cepat, hindari pertarungan yang tidak mengubah objektif.</li>
<li>Keluar dari medan perang membuat pemain harus menunggu 12 menit sebelum masuk kembali; jangan keluar menjelang buka fase atau akhir pertempuran.</li>
</ul></section>
<section><h3>6. Checklist sebelum pertempuran</h3><ul>
<li>Pastikan nama dan legion sudah sesuai roster ini; konfirmasi jam pertempuran di panel event.</li>
<li>Tarik kembali semua pasukan yang sedang berbaris, selesaikan pengintaian, pulihkan pasukan di Infirmary, dan batalkan bantuan yang menuju Embassy.</li>
<li>Simpan item percepatan penyembuhan; gunakan Chief Gear/Hero Gear dan buff tempur terbaik.</li>
<li>Siapkan formasi tersimpan untuk rally, garnisun, dan serangan solo.</li>
<li>Pastikan tidak ada fitur yang otomatis mengirim pasukan keluar kota.</li>
<li>Siapkan minimal 10 Advanced Teleporter dan aktifkan buff hewan peliharaan (kapasitas pasukan, serangan, pertahanan, dan kecepatan pasukan)..</li>
</ul></section>
<section><h3>7. Kesalahan umum</h3><ul>
<li>Semua pemain berkumpul di Tanur Imperial.</li>
<li>Lupa mengambil Persediaan Arsenal yang jatuh saat bangunan berpindah tangan.</li>
<li>Menyerang kota musuh yang tidak memengaruhi skor.</li>
<li>Terus menyerang posisi yang sudah tidak mungkin direbut.</li>
<li>Terlambat memantau perubahan skor.</li>
</ul></section>
<p class="fy-note">Mekanik dan angka bisa berubah saat game diperbarui. Cek panel Foundry Battle di game sebelum registrasi.<br>Terakhir dicocokkan dengan panduan komunitas: ${FOUNDRY_VERIFIED} (WoS Helper, mone.gg, BuffBuff, BlueStacks, WoS Tools). Angka dan aturan resmi tetap mengikuti panel event di game.</p></div>`;
}

function foundryStrategyHtmlEn() {
    const rows = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].m).map(k => { const b = FOUNDRY_B[k];
        return `<tr><td>${escapeHtml(b.n)}</td><td>${b.ph === 1 ? 'Minute 0' : 'Minute 15'}</td><td>${b.f.toLocaleString('en-US')}</td><td>${b.m.toLocaleString('en-US')}</td></tr>`; }).join('');
    return `<div class="fy-guide">
<section><h3>1. Event overview</h3><ul><li>Foundry Battle: alliance vs alliance, 60 minutes, held every 2 weeks. One legion = 30 fighters + 10 substitutes; a player can only be in one legion.</li><li>Requirements: Furnace Lv 16+ and the alliance must be in the top 20 by power. One alliance can register up to 2 legions; alliance ranking rewards are mainly counted from Legion 1.</li><li>Substitutes can only enter after minute 3. Leaving the battlefield means waiting 12 minutes before you can re-enter.</li><li>The winner is the alliance with the most Alliance Arsenal Points. Personal points only count toward individual rewards (PvP: 40 points per 10K power when defending, 80 when attacking).</li><li>Building points are capped by capacity; the excess becomes temporary points that drop as Arsenal Supplies when the building changes hands, and either side can pick them up.</li><li>Troops do not die permanently; injuries are healed after the battle.</li></ul></section>
<section><h3>2. Building points (full map total: 7,560 points/minute)</h3><div class="table-container"><table class="fy-table"><thead><tr><th>Building</th><th>Opens</th><th>Poin perebutan pertama</th><th>Points/min</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fy-note">Control time is about 2 minutes per building (about 1 minute if you hold the Boiler Room). A building only gives points once it is fully captured, so don't go halfway.</p></section>
<section><h3>3. Timeline &amp; plan per phase</h3><ul>
<li><b>Before the start:</b> everyone is ready, formations are saved, no marches are left out. As soon as the battle opens, teleport to your assigned buildings.</li>
<li><b>Phase 1 (0–15):</b> 2 Prototype Sites, 4 Repair Facilities, Boiler Room, Transit Station. Take the Boiler Room and Transit first (faster capture and more frequent teleports). The strongest rallies hold the Prototypes; 2 holders per Repair corner are enough.</li>
<li><b>Phase 2 (minute 15):</b> Imperial Foundry, Munitions Warehouse and Mercenary Camp open. Rally Leaders and Joiners (Phase 2 target = Imperial Foundry) teleport to the center; Prototype and Repair holders stay put. Refill the garrisons that were left behind.</li>
<li><b>Phase 3 (minutes 30–60):</b> the Weapon Workshop appears at random. Collectors watch the minimap and grab its points right away. Use the Munitions Warehouse (+15% damage / -15% enemy damage) when the fight is even.</li></ul></section>
<section><h3>4. Roster roles</h3><ul><li><b>Commander (1):</b> watch the score and give one short order: defend, reinforce, rally, collect, rotate.</li><li><b>Rally Leader / Joiner:</b> the core of the Imperial Foundry attack and Prototype defenders in Phase 1.</li><li><b>Mobile:</b> teleport between points, pressure high-value enemy buildings, help reinforce.</li><li><b>Holder:</b> occupies and guards a building until the end; does not move to the center.</li><li><b>Collector:</b> picks up the Arsenal Supplies that drop when buildings change hands and captures the Weapon Workshop. (Commander, Mobile, Collector and Roamer are internal team roles, not official game roles.)</li><li><b>Substitutes (10):</b> stay online; they can enter after minute 3. Replace absent fighters from the start instead of waiting until mid-battle.</li></ul></section>
<section><h3>5. Core tactics</h3><ul>
<li>Don't send all your strong players to the Imperial Foundry. Fully held Prototypes + Repairs + Outposts (Boiler, Transit, Munitions, Mercenary) often beat a single failed rush to the center.</li>
<li>Holding time matters as much as building value: a Prototype held for 10 minutes = 12,000 sustained points.</li>
<li>Reinforce holders before a building falls instead of waiting to lose and retake it (check in-game whether reinforcing is allowed on the battlefield; guides differ).</li>
<li>Attack enemy buildings that are storing a lot of temporary points; when captured, the points drop as Arsenal Supplies, so have a Collector nearby.</li>
<li>Ahead on score: protect the point-producing buildings. Behind: go for high-value or point-filled buildings and the Weapon Workshop. Close score: rotate quickly and avoid fights that don't change the objective.</li>
<li>Leaving the battlefield triggers a 12-minute wait before re-entry; don't leave right before a phase unlock or the end of the battle.</li></ul></section>
<section><h3>6. Pre-battle checklist</h3><ul><li>Make sure your name and legion match this roster; confirm the battle time in the event panel.</li><li>Recall all marches, finish scouting, heal the Infirmary, cancel reinforcements headed to the Embassy.</li><li>Save your healing speedups; equip your strongest Chief Gear/Hero Gear and combat buffs.</li><li>Prepare saved formations for rallies, garrisons and solo attacks.</li><li>Make sure no feature automatically sends marches out of the city.</li><li>Prepare at least 10 Advanced Teleporters and activate pet buffs (march capacity, attack, defense, march speed)..</li></ul></section>
<section><h3>7. Common mistakes</h3><ul><li>Everyone piles onto the Imperial Foundry.</li><li>Forgetting to pick up Arsenal Supplies that drop after a building changes hands.</li><li>Attacking enemy cities that don't change the score.</li><li>Keep attacking a position that is already lost.</li><li>Not watching the score until it's too late.</li></ul></section>
<p class="fy-note">Mechanics and numbers can change when the game is updated. Check the Foundry Battle panel in the game before registering.<br>Last cross-checked against community guides: ${FOUNDRY_VERIFIED} (WoS Helper, mone.gg, BuffBuff, BlueStacks, WoS Tools). Official numbers and rules always follow the in-game event panel.</p></div>`;
}

// ---------- LIVE SHARE MAP (public read-only, freshly loaded from Supabase) ----------
function buildFoundryShareUrl(legion = foundryMapLegion, phase = foundryPhase) {
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.searchParams.set('foundry', 'map');
    u.searchParams.set('mode', foundryMode === 'tundra' ? 'tundra' : 'foundry');
    u.searchParams.set('legion', FOUNDRY_LEGIONS.includes(legion) ? legion : 'Legion 1');
    u.searchParams.set('phase', String(foundryNormPhase(phase)));
    u.searchParams.set('lang', foundryLanguage);
    return u.toString();
}
async function shareFoundryMapLink() {
    const url = buildFoundryShareUrl();
    const title = `Foundry Live Map — ${foundryMapLegion} — ${foundryPhase === 'all' ? foundryPhaseLabel('all') : 'Phase ' + foundryPhase}`;
    if (navigator.share) {
        try { await navigator.share({ title, text: title, url }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (await fdtCopyText(url)) showToast(foundryL('Link Live Share Foundry disalin.', 'Foundry Live Share link copied.'), 'success');
    else window.prompt('Salin link Live Share Foundry:', url);
}
async function openFoundrySharedMap(legion, phase) {
    const old = document.getElementById('foundry-shared-map'); if (old) old.remove();
    legion = FOUNDRY_LEGIONS.includes(legion) ? legion : 'Legion 1';
    phase = foundryNormPhase(phase);
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang === 'en' || urlLang === 'id' || urlLang === 'zh') foundryLanguage = urlLang;
    const en = () => foundryLanguage === 'en';
    // State marker khusus Live Share (tidak mengubah preferensi halaman utama)
    let shareMarksOn = true, shareCountsOn = true;
    const wrap = document.createElement('div'); wrap.id = 'foundry-shared-map';
    wrap.innerHTML = `<div class="fdt-shared-bar"><strong>🏭 Foundry Live Map · IDN</strong><span class="fdt-shared-actions"><button id="fy-share-lang">${en()?'<span class="flag flag-id"></span> Bahasa Indonesia':'<span class="flag flag-gb"></span> English'}</button>
      <button id="fy-share-l1">Legion 1</button><button id="fy-share-l2">Legion 2</button>
      <button id="fy-share-p1">Phase 1</button><button id="fy-share-p2">Phase 2</button><button id="fy-share-p3">Phase 3</button><button id="fy-share-pall">🧭 ${foundryPhaseLabel('all')}</button>
      <button id="fy-share-marks" class="fy-share-active">Nama: ON</button>
      <button id="fy-share-counts" class="fy-share-active">Angka: ON</button>
      <button id="fy-share-png">🖼️ PNG</button>
      <button id="fy-share-refresh">⟳ ${en()?'Refresh':'Segarkan'}</button><button id="fy-share-site">${en()?'Open site':'Buka situs'}</button></span></div>
      <div class="fdt-shared-body" id="fy-share-body"><div class="fdt-shared-msg">${en()?'Loading Foundry roster…':'Memuat data roster Foundry…'}</div></div>
      <div class="fy-share-foot">${en()?'Read-only · Data loads from Supabase on open. Auto-refresh every 30 seconds.':'Hanya baca · Data dimuat dari Supabase saat dibuka. Refresh otomatis setiap 30 detik.'}</div>`;
    document.body.appendChild(wrap); document.body.classList.add('fy-shared-open');
    let timer = null;
    const body = wrap.querySelector('#fy-share-body');
    const syncMarkerButtons = () => {
      const bm = wrap.querySelector('#fy-share-marks'), bc = wrap.querySelector('#fy-share-counts');
      if (bm) { bm.textContent = shareMarksOn ? (en() ? 'Names: ON' : 'Nama: ON') : (en() ? 'Names: OFF' : 'Nama: OFF'); bm.classList.toggle('fy-share-active', shareMarksOn); }
      if (bc) { bc.textContent = shareCountsOn ? (en() ? 'Counts: ON' : 'Angka: ON') : (en() ? 'Counts: OFF' : 'Angka: OFF'); bc.classList.toggle('fy-share-active', shareCountsOn); }
    };
    const mapOpts = () => ({ marks: shareMarksOn, counts: shareCountsOn });
    const renderBody = () => {
        foundryMapLegion = legion; foundryPhase = phase;
        const assignedRows = FOUNDRY_KEYS.flatMap(key => foundryAssigned(legion, key, phase).map(p => ({key, building: FOUNDRY_B[key], player:p})))
          .sort((a,b) => Number(a.player.foundry_slot)-Number(b.player.foundry_slot));
        const taskTitle = en() ? 'Players & assigned tasks' : 'Pemain & tugas yang ditetapkan';
        const noPlayers = en() ? 'No battle players assigned for this phase.' : 'Belum ada pemain Battle yang ditugaskan pada phase ini.';
        const taskRowsSingle = assignedRows.length ? `<div class="fy-share-roster-wrap"><h3>${taskTitle}</h3><div class="fy-share-roster-scroll"><table class="fy-share-roster"><thead><tr><th>Slot</th><th>${en()?'Player':'Pemain'}</th><th>${en()?'Task / Role':'Tugas / Peran'}</th><th>Target</th></tr></thead><tbody>${assignedRows.map(({building,player:p})=>`<tr><td>#${escapeHtml(p.foundry_slot)}</td><td>${escapeHtml(p.nickname || '-')}</td><td>${escapeHtml(p.foundry_role || (en()?'Unassigned':'Belum ditentukan'))}</td><td>${escapeHtml(building.n)}</td></tr>`).join('')}</tbody></table></div></div>` : `<p class="fy-note">${noPlayers}</p>`;
        const tgtName = (p, ph) => { const kk = foundryTarget(p, ph); return kk && FOUNDRY_B[kk] ? FOUNDRY_B[kk].n : '-'; };
        const allBattle = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle').sort((a, b) => Number(a.foundry_slot) - Number(b.foundry_slot));
        const taskRowsAll = allBattle.length ? `<div class="fy-share-roster-wrap"><h3>${taskTitle}</h3><div class="fy-share-roster-scroll"><table class="fy-share-roster"><thead><tr><th>Slot</th><th>${en()?'Player':'Pemain'}</th><th>${en()?'Task / Role':'Tugas / Peran'}</th><th>Phase 1</th><th>Phase 2</th><th>Phase 3</th></tr></thead><tbody>${allBattle.map(p => `<tr><td>#${escapeHtml(p.foundry_slot)}</td><td>${escapeHtml(p.nickname || '-')}</td><td>${escapeHtml(p.foundry_role || (en()?'Unassigned':'Belum ditentukan'))}</td><td>${escapeHtml(tgtName(p, 1))}</td><td>${escapeHtml(tgtName(p, 2))}</td><td>${escapeHtml(tgtName(p, 3))}</td></tr>`).join('')}</tbody></table></div></div>` : `<p class="fy-note">${noPlayers}</p>`;
        const taskRows = phase === 'all' ? taskRowsAll : taskRowsSingle;
        const subs = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute').sort((a,b) => a.foundry_slot - b.foundry_slot);
        const subRows = subs.length ? `<div class="fy-share-roster-wrap"><h3>${en()?'Substitutes (enter after minute 3)':'Cadangan (masuk setelah menit 3)'}</h3><div class="fy-share-roster-scroll"><table class="fy-share-roster"><thead><tr><th>#</th><th>${en()?'Player':'Pemain'}</th><th>${en()?'Replaces slot':'Menggantikan slot'}</th></tr></thead><tbody>${subs.map(p => { const c = Number(p.foundry_cover) || 0, b = c ? foundryFind(legion, 'Battle', c) : null; return `<tr><td>C${escapeHtml(p.foundry_slot)}</td><td>${escapeHtml(p.nickname || '-')}</td><td>${c ? '#' + c + (b ? ' ' + escapeHtml(b.nickname) + ' (' + escapeHtml(b.foundry_role || '-') + ')' : '') : '-'}</td></tr>`; }).join('')}</tbody></table></div></div>` : '';
        // strategyGuide remains defined below in the original load flow — kept inside load after fetch
        return { taskRows, subRows };
    };
    const load = async (silent) => {
      if (!silent) body.innerHTML = `<div class="fdt-shared-msg">${en()?'Loading Foundry roster…':'Memuat data roster Foundry…'}</div>`;
      try {
        if (!silent || !foundryPlayers.length) {
          const client = getSupabase(); if (!client) throw new Error('Supabase tidak tersedia');
          const { data, error } = await client.from('troops_power').select('*').order('troops_power', {ascending:false});
          if (error) throw error;
          foundrySetPlayers(data);
        }
        const { taskRows, subRows } = renderBody();
        const strategyGuide = `<details class="fy-share-strategy"><summary>📖 ${foundryLanguage==='en'?'Strategy Guide':'Panduan Strategi'}</summary><div class="fy-share-strategy-content">${foundryLanguage==='en' ? `<section><h4>Battle overview</h4><ul><li>Foundry Battle is a 60-minute alliance-versus-alliance event. Each legion has up to 30 fighters and 10 substitutes.</li><li>The alliance with the most Alliance Arsenal Points wins. Personal points are for individual rewards.</li><li>Troops are not permanently killed; wounded troops recover after the battle.</li><li>Requires Furnace Lv 16+ and a top-20 power alliance; up to 2 legions, alliance ranking rewards mainly follow Legion 1. Substitutes can enter after minute 3; leaving the battlefield means a 12-minute wait to re-enter.</li></ul></section><section><h4>Phase plan</h4><ul><li><b>Before start:</b> confirm assignments, recall marches, prepare formations and be ready to teleport as buildings unlock.</li><li><b>Phase 1 (0–15 min):</b> prioritize Boiler Room and Central Transit Station; secure Prototype Sites and Repair Facilities with dedicated holders.</li><li><b>Phase 2 (15+ min):</b> Imperial Foundry, Munitions Warehouse and Mercenary Camp unlock. Send rally leaders and joiners to high-value objectives while holders defend their posts.</li><li><b>Phase 3 (30–60 min):</b> watch for Weapon Workshop spawns and assign mobile players or collectors to respond quickly.</li></ul></section><section><h4>Roles</h4><ul><li><b>Commander:</b> monitor score and issue concise calls: defend, reinforce, rally, collect or rotate.</li><li><b>Rally Leader / Joiner:</b> coordinate attacks on priority objectives.</li><li><b>Holder:</b> capture and defend assigned buildings; avoid unnecessary rotations.</li><li><b>Mobile:</b> reinforce weak points and rotate to high-value targets.</li><li><b>Collector:</b> collect Arsenal Supplies and respond to Workshop opportunities.</li><li><b>Substitutes:</b> stay available and replace absent fighters early.</li></ul></section><section><h4>Core tactics</h4><ul><li>Keep point-generating buildings secured; a failed attack can cost both time and sustained points.</li><li>Reinforce holders before a building is lost, rather than reacting after defeat.</li><li>When behind, target valuable enemy buildings and prepare collectors for dropped Arsenal Supplies.</li><li>Avoid leaving the battlefield near phase unlocks or the end because re-entry requires a 12-minute wait.</li></ul></section><section><h4>Pre-battle checklist</h4><ul><li>Verify legion, slot, task and phase targets.</li><li>Recall marches, heal troops and prepare saved formations.</li><li>Bring at least 10 Advanced Teleporters and activate pet buffs.</li><li>Confirm battle time and keep communication concise.</li></ul></section>` : `<section><h4>Gambaran Pertempuran</h4><ul><li>Foundry Battle adalah pertempuran antaraliansi selama 60 menit. Setiap legion memiliki hingga 30 petarung dan 10 pemain cadangan.</li><li>Syarat Furnace Lv 16+ dan alliance top 20 power; maksimal 2 legion, hadiah ranking alliance terutama dari Legion 1. Cadangan bisa masuk setelah menit 3; keluar dari battlefield = tunggu 12 menit untuk masuk lagi.</li><li>Aliansi dengan Alliance Arsenal Points terbanyak menang. Poin pribadi digunakan untuk hadiah individu.</li><li>Pasukan tidak mati permanen; pasukan yang terluka pulih setelah pertempuran.</li></ul></section><section><h4>Rencana per fase</h4><ul><li><b>Sebelum mulai:</b> pastikan penugasan, tarik kembali march, siapkan formasi, dan bersiap teleport saat bangunan terbuka.</li><li><b>Fase 1 (menit 0–15):</b> prioritaskan Ruang Ketel dan Pos Transit Pusat; amankan Situs Prototipe dan Fasilitas Perbaikan dengan penjaga khusus.</li><li><b>Fase 2 (menit 15+):</b> Tanur Imperial, Gudang Amunisi, dan Kamp Tentara Bayaran terbuka. Arahkan pemimpin rally dan joiner ke sasaran bernilai tinggi, sementara holder menjaga pos.</li><li><b>Fase 3 (menit 30–60):</b> pantau kemunculan Bengkel Senjata dan tugaskan pemain mobile atau pengumpul untuk merespons cepat.</li></ul></section><section><h4>Peran</h4><ul><li><b>Commander:</b> pantau skor dan berikan perintah singkat: bertahan, perkuat, rally, kumpulkan, atau rotasi.</li><li><b>Rally Leader / Joiner:</b> koordinasikan serangan ke sasaran prioritas.</li><li><b>Holder:</b> rebut dan pertahankan bangunan yang ditugaskan; hindari rotasi yang tidak perlu.</li><li><b>Mobile:</b> perkuat titik lemah dan berpindah ke sasaran bernilai tinggi.</li><li><b>Collector:</b> kumpulkan Arsenal Supplies dan manfaatkan peluang di Workshop.</li><li><b>Cadangan:</b> tetap siap dan gantikan petarung yang absen sejak awal.</li></ul></section><section><h4>Taktik utama</h4><ul><li>Pertahankan bangunan penghasil poin; serangan yang gagal dapat membuang waktu dan poin berkelanjutan.</li><li>Perkuat holder sebelum bangunan jatuh, bukan setelah kalah.</li><li>Jika tertinggal, incar bangunan musuh bernilai tinggi dan siapkan collector untuk mengambil Arsenal Supplies yang jatuh.</li><li>Hindari keluar dari battlefield menjelang pembukaan fase atau akhir pertempuran karena masuk kembali harus menunggu 12 menit.</li></ul></section><section><h4>Checklist sebelum pertempuran</h4><ul><li>Periksa legion, slot, tugas, dan target tiap fase.</li><li>Tarik kembali march, pulihkan pasukan, dan siapkan formasi tersimpan.</li><li>Siapkan minimal 10 Advanced Teleporter dan aktifkan pet buff.</li><li>Pastikan waktu pertempuran dan jaga komunikasi tetap singkat.</li></ul></section>`}</div></details>`;
        body.innerHTML = `${phase === 'all' ? foundryMapAllHtml(legion, mapOpts()) : `<svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map" role="img" aria-label="Foundry Live Map">${foundryMapSvgInner(legion, phase, mapOpts())}</svg>`}<p class="fy-note">${legion} · ${foundryPhaseLabel(phase)} · ${new Date().toLocaleTimeString()} · ${en()?'Small markers show player names.':'Angka kecil adalah nama pemain.'}</p>${foundryMapLegendHtml(true)}${taskRows}${subRows}${strategyGuide}`;
      } catch(e) { console.warn('Foundry live share failed',e); body.innerHTML=`<div class="fdt-shared-msg">${en()?'Unable to load map. Check your connection or Supabase read permissions, then refresh.':'Tidak dapat memuat peta. Periksa koneksi atau izin baca Supabase, lalu refresh.'}</div>`; }
      ['l1','l2'].forEach((x,i)=>wrap.querySelector('#fy-share-'+x).classList.toggle('fy-share-active',legion===FOUNDRY_LEGIONS[i]));
      [1,2,3].forEach(n=>wrap.querySelector('#fy-share-p'+n).classList.toggle('fy-share-active',phase===n));wrap.querySelector('#fy-share-pall').classList.toggle('fy-share-active',phase==='all');
      syncMarkerButtons();
    };
    wrap.querySelector('#fy-share-lang').onclick=()=>{foundryLanguage=foundryLanguage==='en'?'id':'en';localStorage.setItem('foundry-language',foundryLanguage);const u=new URL(location.href);u.searchParams.set('lang',foundryLanguage);history.replaceState({},'',u);openFoundrySharedMap(legion,phase);};
    wrap.querySelector('#fy-share-l1').onclick=()=>{legion='Legion 1';load();}; wrap.querySelector('#fy-share-l2').onclick=()=>{legion='Legion 2';load();};
    [1,2,3].forEach(n=>wrap.querySelector('#fy-share-p'+n).onclick=()=>{phase=n;load();});wrap.querySelector('#fy-share-pall').onclick=()=>{phase='all';load();};
    wrap.querySelector('#fy-share-marks').onclick=()=>{shareMarksOn=!shareMarksOn;syncMarkerButtons();load(true);};
    wrap.querySelector('#fy-share-counts').onclick=()=>{shareCountsOn=!shareCountsOn;syncMarkerButtons();load(true);};
    wrap.querySelector('#fy-share-refresh').onclick=()=>load();
    wrap.querySelector('#fy-share-png').onclick=()=>foundryExportPng(legion,phase);
    wrap.querySelector('#fy-share-site').onclick=()=>{location.href=location.origin+location.pathname;};
    await load(); timer=setInterval(load,30000);
    window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);},{once:true});
}
document.addEventListener('DOMContentLoaded',()=>{const q=new URLSearchParams(location.search);if(q.get('foundry')==='map'){foundryMode=q.get('mode')==='tundra'?'tundra':'foundry';openFoundrySharedMap(q.get('legion')||'Legion 1',q.get('phase')||1);}});


// ---------- VIEW AS CHART (+ LIVE SHARE) ----------
// Grafik roster per Legion & Phase dalam bentuk SVG: cakupan bangunan (jumlah vs minimal), jumlah per peran,
// urutan roster Battle (bar = Power, hanya terlihat setelah login) dan cadangan. SVG yang sama dipakai untuk
// tampilan di tab, ekspor PNG, dan halaman Live Share (?foundry=chart&legion=Legion%201&phase=1).
let foundryChartLegion = 'Legion 1';
let foundryChartPhase = 1;
let foundryChartShareTimer = null;
const foundryTrunc = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

function foundryChartSvg(legion, phase) {
    const W = 760, PAD = 16, en = foundryLanguage === 'en';
    const showPw = canViewSensitive();
    const pw = p => Number(p.troops_power) || 0;
    const sum = ps => ps.reduce((s, p) => s + pw(p), 0);
    const battle = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle')
        .sort((a, b) => Number(a.foundry_slot) - Number(b.foundry_slot));
    const subs = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute')
        .sort((a, b) => Number(a.foundry_slot) - Number(b.foundry_slot));
    const out = [];
    const T = (x, y, str, o = {}) => `<text x="${x}" y="${y}" fill="${o.fill || '#e2e8f0'}" font-size="${o.size || 12}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || 'start'}">${escapeHtml(str)}</text>`;
    const R = (x, y, w, h, fill, rx = 4, extra = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
    let y = 30;
    out.push(T(PAD, y, `Foundry Battle · ${foundryTag()} · ${legion} · Phase ${phase} (${FOUNDRY_PHASE_RANGE[phase - 1]} ${en ? 'min' : 'mnt'})`, { fill: '#fcd34d', size: 16, weight: 700 }));
    y += 20;
    out.push(T(PAD, y, `${battle.length}/${foundryBattleMax()} Battle · ${subs.length}/${foundrySubMax()} ${en ? 'Substitutes' : 'Cadangan'}` +
        (showPw && battle.length ? ` · ${en ? 'Total power' : 'Total Power'} ${foundryFmtPower(sum(battle))}` : ''), { fill: '#94a3b8', size: 12 }));
    y += 14;
    const section = title => { y += 18; out.push(T(PAD, y, title, { fill: '#7dd3fc', size: 13, weight: 700 })); y += 10; };

    if (!battle.length && !subs.length) {
        y += 30;
        out.push(T(PAD, y, en ? 'No players assigned to this legion yet.' : 'Belum ada pemain di legion ini.', { fill: '#94a3b8', size: 13 }));
        y += 30;
    } else {
        // 1. Cakupan bangunan
        section(en ? 'Building coverage (players assigned · white tick = minimum)' : 'Cakupan bangunan (pemain ditugaskan · garis putih = minimal)');
        const keys = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].ph <= phase && (FOUNDRY_MIN[phase][k] || foundryAssigned(legion, k, phase).length));
        const rows = keys.map(k => ({ k, b: FOUNDRY_B[k], ps: foundryAssigned(legion, k, phase), min: FOUNDRY_MIN[phase][k] || 0 }));
        const maxN = Math.max(4, ...rows.map(r => Math.max(r.ps.length, r.min)));
        const bx = 190, bw = 360;
        rows.forEach(r => {
            const n = r.ps.length, low = r.min && n < r.min;
            out.push(T(PAD, y + 14, foundryTrunc(r.b.n, 26), { size: 12 }));
            out.push(R(bx, y + 3, bw, 14, '#1e293b'));
            if (n) out.push(R(bx, y + 3, n / maxN * bw, 14, low ? '#ef4444' : r.b.c));
            if (r.min) out.push(`<line x1="${bx + r.min / maxN * bw}" y1="${y + 1}" x2="${bx + r.min / maxN * bw}" y2="${y + 19}" stroke="#ffffff" stroke-width="2"/>`);
            out.push(T(bx + bw + 10, y + 14, `${n}${r.min ? '/' + r.min : ''}` + (showPw && n ? ` · ${foundryFmtPower(sum(r.ps))}` : ''), { fill: low ? '#fca5a5' : '#e2e8f0', size: 12, weight: low ? 700 : 400 }));
            y += 24;
        });

        // 2. Peran
        section(en ? 'Roles (battle players)' : 'Peran (pemain Battle)');
        const roleN = FOUNDRY_ROLES.map(r => ({ r, ps: battle.filter(p => p.foundry_role === r) }));
        const maxR = Math.max(1, ...roleN.map(o => o.ps.length));
        roleN.forEach(({ r, ps }) => {
            out.push(T(PAD, y + 14, en ? r : FOUNDRY_ROLE_ID[r], { size: 12 }));
            out.push(R(bx, y + 3, bw, 14, '#1e293b'));
            if (ps.length) out.push(R(bx, y + 3, ps.length / maxR * bw, 14, FOUNDRY_ROLE_COLOR[r]));
            out.push(T(bx + bw + 10, y + 14, `${ps.length}` + (showPw && ps.length ? ` · ${en ? 'avg' : 'rata-rata'} ${foundryFmtPower(sum(ps) / ps.length)}` : ''), { size: 12 }));
            y += 22;
        });

        // 3. Roster Battle urut slot
        section(en ? `Battle roster by slot · Phase ${phase} target` : `Roster Battle per slot · target Phase ${phase}`);
        const maxPw = Math.max(1, ...battle.map(pw));
        const pbx = 190, pmax = 150;
        battle.forEach(p => {
            const col = FOUNDRY_ROLE_COLOR[p.foundry_role] || '#e5e7eb';
            const w = showPw ? Math.max(3, pw(p) / maxPw * pmax) : pmax;
            out.push(T(PAD, y + 13, `#${p.foundry_slot}`, { fill: '#94a3b8', size: 11 }));
            out.push(T(PAD + 34, y + 13, foundryTrunc(p.nickname, 18), { size: 12 }));
            out.push(R(pbx, y + 3, w, 12, col, 3, showPw ? '' : 'fill-opacity=".35"'));
            if (showPw) out.push(T(pbx + w + 6, y + 13, foundryFmtPower(p.troops_power), { fill: '#cbd5e1', size: 11 }));
            const role = en ? (p.foundry_role || '-') : (FOUNDRY_ROLE_ID[p.foundry_role] || p.foundry_role || '-');
            out.push(T(400, y + 13, foundryTrunc(`${role} → ${foundryName(foundryTarget(p, phase))}`, 42), { fill: '#cbd5e1', size: 11 }));
            y += 20;
        });

        // 4. Cadangan
        if (subs.length) {
            section(en ? 'Substitutes (enter after minute 3)' : 'Cadangan (masuk setelah menit 3)');
            const half = Math.ceil(subs.length / 2);
            subs.forEach((p, i) => {
                const col = i < half ? 0 : 1, row = i < half ? i : i - half;
                out.push(T(PAD + col * 370, y + 13 + row * 18, `S${p.foundry_slot} ${foundryTrunc(p.nickname, 18)}` + (p.foundry_cover ? ` (→ #${p.foundry_cover})` : ''), { size: 12 }));
            });
            y += half * 18;
        }
    }
    y += 16;
    out.push(T(PAD, y, `${en ? 'Generated' : 'Dibuat'} ${new Date().toLocaleString()}`, { fill: '#64748b', size: 10 }));
    const H = y + 14;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="fy-chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" role="img" aria-label="Foundry roster chart ${escapeHtml(legion)} Phase ${phase}"><rect width="${W}" height="${H}" rx="14" fill="#0b1220"/>${out.join('')}</svg>`;
    return { svg, W, H };
}

function foundryChartNote() {
    return foundryL('Bar bangunan = jumlah pemain ditugaskan (garis putih = minimal, merah = kurang dari minimal). Bar roster = Troops Power (terlihat setelah login).',
        'Building bars = players assigned (white tick = minimum, red = below minimum). Roster bars = Troops Power (visible after login).');
}

function foundryChartLiveTableHtml(legion, phase) {
    if (!(foundryLiveEdit && foundryLiveEditAllowed())) return '';
    const battle = foundryPlayers
        .filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle')
        .sort((a, b) => Number(a.foundry_slot) - Number(b.foundry_slot));
    if (!battle.length) {
        return `<div class="fy-live-chart-panel"><p class="fy-empty">${foundryL('Belum ada pemain Battle di legion ini.', 'No Battle players in this legion yet.')}</p></div>`;
    }
    const rows = battle.map(p => {
        const tgt = foundryTarget(p, phase);
        const tgtName = tgt ? foundryName(tgt) : '—';
        return `<tr>
          <td>${p.foundry_slot || '—'}</td>
          <td><button type="button" class="fy-live-name" onclick="foundryOpenLiveEditor('${p.id}', event.clientX, event.clientY)">${escapeHtml(p.nickname || '-')}</button></td>
          <td>${canViewSensitive() ? escapeHtml(p.game_id || '') : ''}</td>
          <td><select class="fy-manual-task" aria-label="Role ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','foundry_role',this.value)">${foundryRoleOptionsHtml(p.foundry_role || '')}</select></td>
          <td><select class="fy-manual-task" aria-label="P1 ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','foundry_p1',this.value)">${foundryBuildingOptionsHtml(p.foundry_p1 || '')}</select></td>
          <td><select class="fy-manual-task" aria-label="P2 ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','foundry_p2',this.value)">${foundryBuildingOptionsHtml(p.foundry_p2 || '')}</select></td>
          ${foundryExt ? `<td><select class="fy-manual-task" aria-label="P3 ${escapeHtml(p.nickname)}" onchange="foundryUpdateTask('${p.id}','foundry_p3',this.value)">${foundryBuildingOptionsHtml(p.foundry_p3 || p.foundry_p2 || '')}</select></td>` : ''}
          <td><span class="fy-live-phase-tgt" style="border-color:${(FOUNDRY_B[tgt]||{}).c||'#64748b'}">${escapeHtml(tgtName)}</span></td>
        </tr>`;
    }).join('');
    return `<div class="fy-live-chart-panel">
      <div class="fy-live-chart-head"><b class="fy-edit-badge">✏️ Live Edit on</b>
        <small>${foundryL('Ubah peran & target di tabel; chart di atas ikut terbarui. Perubahan langsung tersimpan.', 'Change role & targets in the table; the chart above updates. Changes save instantly.')}</small>
      </div>
      <div class="fy-live-table-wrap"><table class="fy-live-table">
        <thead><tr><th>#</th><th>${foundryL('Nickname', 'Nickname')}</th><th>ID</th><th>${foundryL('Peran', 'Role')}</th><th>P1</th><th>P2</th>${foundryExt ? '<th>P3</th>' : ''}<th>${foundryL('Target fase ini', 'This phase target')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
}
function foundryChartHtml() {
    const L = foundryChartLegion, ph = foundryChartPhase;
    const live = foundryLiveEdit && foundryLiveEditAllowed();
    return `${foundryExtNotice()}<div class="fy-controls">
        ${foundryLiveEditBtnHtml()}
        <button class="btn-apply" type="button" onclick="shareFoundryChartLink()">🔗 Live Share Chart</button>
        <button class="btn-apply" type="button" onclick="foundryChartExportPng()">🖼️ ${foundryL('Ekspor PNG', 'Export PNG')}</button>
        ${foundryLegionSwitchHtml(L, 'foundrySetChartLegion')}
        ${[1, 2, 3].map(n => `<button class="btn-apply ${n === ph ? 'fy-on' : ''}" onclick="foundrySetChartPhase(${n})">Phase ${n} (${FOUNDRY_PHASE_RANGE[n - 1]} ${foundryL('mnt', 'min')})</button>`).join('')}</div>
        ${live ? `<p class="fy-live-banner"><b class="fy-edit-badge">✏️ Live Edit on</b> — ${foundryL('Edit roster lewat tabel di bawah chart.', 'Edit the roster via the table under the chart.')}</p>` : ''}
        ${foundryWarningsHtml(L, ph)}
        <div class="fy-chart-wrap">${foundryChartSvg(L, ph).svg}</div>
        ${foundryChartLiveTableHtml(L, ph)}
        <p class="fy-note">${foundryChartNote()}</p>`;
}
function foundrySetChartLegion(l) {
    if (foundryLockedLegion && l !== foundryLockedLegion) return;
    foundryChartLegion = l;
    foundryRender();
}
function foundrySetChartPhase(n) { foundryChartPhase = n; foundryRender(); }

async function foundryChartExportPng(legion = foundryChartLegion, phase = foundryChartPhase) {
    try {
        const { svg, W, H } = foundryChartSvg(legion, phase);
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
        const S = 2, c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
        c.getContext('2d').drawImage(img, 0, 0, W * S, H * S);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.href = c.toDataURL('image/png');
        a.download = `Foundry_Chart_${legion.replace(/\s+/g, '_')}_Phase${phase}_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast(foundryL('Gambar chart diunduh.', 'Chart image downloaded.'), 'success');
    } catch (e) {
        console.warn('Foundry chart export failed', e);
        showToast(foundryL('Gagal membuat gambar chart.', 'Unable to generate chart image.'), 'error');
    }
}

function buildFoundryChartShareUrl(legion = foundryChartLegion, phase = foundryChartPhase) {
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.searchParams.set('foundry', 'chart');
    u.searchParams.set('mode', foundryMode === 'tundra' ? 'tundra' : 'foundry');
    u.searchParams.set('legion', FOUNDRY_LEGIONS.includes(legion) ? legion : 'Legion 1');
    u.searchParams.set('phase', String([1, 2, 3].includes(Number(phase)) ? Number(phase) : 1));
    u.searchParams.set('lang', foundryLanguage);
    return u.toString();
}
async function shareFoundryChartLink() {
    const url = buildFoundryChartShareUrl();
    const title = `Foundry Live Chart — ${foundryChartLegion} — Phase ${foundryChartPhase}`;
    if (navigator.share) {
        try { await navigator.share({ title, text: title, url }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (await fdtCopyText(url)) showToast(foundryL('Link Live Share Chart disalin.', 'Live Share Chart link copied.'), 'success');
    else window.prompt('Copy Live Share Chart link:', url);
}

async function openFoundrySharedChart(legion, phase) {
    const old = document.getElementById('foundry-shared-map'); if (old) old.remove();
    if (foundryChartShareTimer) { clearInterval(foundryChartShareTimer); foundryChartShareTimer = null; }
    legion = FOUNDRY_LEGIONS.includes(legion) ? legion : 'Legion 1';
    phase = [1, 2, 3].includes(Number(phase)) ? Number(phase) : 1;
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang === 'en' || urlLang === 'id' || urlLang === 'zh') foundryLanguage = urlLang;
    const en = () => foundryLanguage === 'en';
    const wrap = document.createElement('div'); wrap.id = 'foundry-shared-map';
    wrap.innerHTML = `<div class="fdt-shared-bar"><strong>📊 Foundry Live Chart · IDN</strong><span class="fdt-shared-actions"><button id="fy-share-lang">${en() ? '<span class="flag flag-id"></span> Bahasa Indonesia' : '<span class="flag flag-gb"></span> English'}</button>
      <button id="fy-share-l1">Legion 1</button><button id="fy-share-l2">Legion 2</button>
      <button id="fy-share-p1">Phase 1</button><button id="fy-share-p2">Phase 2</button><button id="fy-share-p3">Phase 3</button>
      <button id="fy-share-png">🖼️ PNG</button>
      <button id="fy-share-refresh">⟳ ${en() ? 'Refresh' : 'Segarkan'}</button><button id="fy-share-site">${en() ? 'Open site' : 'Buka situs'}</button></span></div>
      <div class="fdt-shared-body" id="fy-share-body"><div class="fdt-shared-msg">${en() ? 'Loading Foundry roster…' : 'Memuat data roster Foundry…'}</div></div>
      <div class="fy-share-foot">${en() ? 'Read-only · Data loads from Supabase on open. Auto-refresh every 30 seconds.' : 'Hanya baca · Data dimuat dari Supabase saat dibuka. Refresh otomatis setiap 30 detik.'}</div>`;
    document.body.appendChild(wrap); document.body.classList.add('fy-shared-open');
    const body = wrap.querySelector('#fy-share-body');
    let first = true;
    const markActive = () => {
        ['l1', 'l2'].forEach((x, i) => wrap.querySelector('#fy-share-' + x).classList.toggle('fy-share-active', legion === FOUNDRY_LEGIONS[i]));
        [1, 2, 3].forEach(n => wrap.querySelector('#fy-share-p' + n).classList.toggle('fy-share-active', phase === n));
    };
    const load = async () => {
        markActive();
        const u = new URL(location.href); u.searchParams.set('legion', legion); u.searchParams.set('phase', String(phase));
        history.replaceState({}, '', u);
        try {
            const client = getSupabase(); if (!client) throw new Error('Supabase tidak tersedia');
            if (typeof authReady !== 'undefined') await authReady; // sesi login menentukan apakah Power ditampilkan
            let q = client.from('troops_power').select('*').order('troops_power', { ascending: false });
            if (foundryMode !== 'tundra') q = q.eq('alliance', FOUNDRY_ALLIANCE);
            const { data, error } = await q;
            if (error) throw error;
            foundrySetPlayers(data); foundryChartLegion = legion; foundryChartPhase = phase;
            const keep = body.scrollTop;
            body.innerHTML = `<div class="fy-chart-wrap">${foundryChartSvg(legion, phase).svg}</div><p class="fy-note" style="text-align:center">${escapeHtml(foundryChartNote())}</p>`;
            if (!first) body.scrollTop = keep;
            first = false;
        } catch (e) {
            console.warn('Foundry live chart failed', e);
            if (first) body.innerHTML = `<div class="fdt-shared-msg">${en() ? 'Unable to load chart. Check your connection or Supabase read permissions, then refresh.' : 'Tidak dapat memuat chart. Periksa koneksi atau izin baca Supabase, lalu refresh.'}</div>`;
        }
    };
    wrap.querySelector('#fy-share-lang').onclick = () => {
        foundryLanguage = foundryLanguage === 'en' ? 'id' : 'en'; localStorage.setItem('foundry-language', foundryLanguage);
        const u = new URL(location.href); u.searchParams.set('lang', foundryLanguage); history.replaceState({}, '', u);
        openFoundrySharedChart(legion, phase);
    };
    wrap.querySelector('#fy-share-l1').onclick = () => { legion = 'Legion 1'; load(); };
    wrap.querySelector('#fy-share-l2').onclick = () => { legion = 'Legion 2'; load(); };
    [1, 2, 3].forEach(n => wrap.querySelector('#fy-share-p' + n).onclick = () => { phase = n; load(); });
    wrap.querySelector('#fy-share-refresh').onclick = load;
    wrap.querySelector('#fy-share-png').onclick = () => foundryChartExportPng(legion, phase);
    wrap.querySelector('#fy-share-site').onclick = () => { location.href = location.origin + location.pathname; };
    await load();
    foundryChartShareTimer = setInterval(load, 30000);
    window.addEventListener('pagehide', () => { if (foundryChartShareTimer) clearInterval(foundryChartShareTimer); }, { once: true });
}
document.addEventListener('DOMContentLoaded', () => {
    const q = new URLSearchParams(location.search);
    if (q.get('foundry') === 'chart') {
        foundryMode = q.get('mode') === 'tundra' ? 'tundra' : 'foundry';
        openFoundrySharedChart(q.get('legion') || 'Legion 1', Number(q.get('phase') || 1));
    }
});
