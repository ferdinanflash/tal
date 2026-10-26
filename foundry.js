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
    rep1:    { n: 'Repair Facility I',       ph: 1, f: 3000, m: 600,  x: 361, y: 82, r: 15, c: '#38bdf8', tip: 'Sudut kanan atas. Cukup 2 holder.' },
    rep2:    { n: 'Repair Facility II',      ph: 1, f: 3000, m: 600,  x: 488, y: 254, r: 15, c: '#38bdf8', tip: 'Sisi kanan (dekat spawn musuh). Cukup 2 holder.' },
    rep3:    { n: 'Repair Facility III',     ph: 1, f: 3000, m: 600,  x: 180, y: 477, r: 15, c: '#38bdf8', tip: 'Sudut kiri bawah. Cukup 2 holder.' },
    rep4:    { n: 'Repair Facility IV',      ph: 1, f: 3000, m: 600,  x: 26, y: 318, r: 15, c: '#38bdf8', tip: 'Sisi kiri (dekat spawn kita). Cukup 2 holder.' },
    boiler:  { n: 'Boiler Room',             ph: 1, f: 1200, m: 240,  x: 187, y: 83, r: 13, c: '#fb7185', tip: 'Waktu kontrol bangunan -50% (±1 menit, bukan 2). Rebut paling awal.' },
    transit: { n: 'Central Transit Station', ph: 1, f: 1200, m: 240,  x: 365, y: 477, r: 13, c: '#4ade80', tip: 'Cooldown teleport -50%. Kunci mobilitas tim.' },
    muni:    { n: 'Munitions Warehouse',     ph: 2, f: 1200, m: 240,  x: 278, y: 400, r: 13, c: '#facc15', tip: '+15% damage pasukan sendiri, -15% damage musuh. Buka menit 15.' },
    merc:    { n: 'Mercenary Camp',          ph: 2, f: 1200, m: 240,  x: 278, y: 174, r: 13, c: '#f97316', tip: 'Kirim hingga 4 tim serang ke bangunan musuh. Buka menit 15.' },
    supplies1:{ n: 'Arsenal Supplies I', ph: 1, f: 0, m: 0, x: 106, y: 119, r: 10, c: '#fbbf24', tip: 'Arsenal Supplies: kumpulkan poin yang jatuh setelah bangunan berpindah tangan.' },
    supplies2:{ n: 'Arsenal Supplies II', ph: 1, f: 0, m: 0, x: 164, y: 132, r: 10, c: '#fbbf24', tip: 'Arsenal Supplies: kumpulkan poin yang jatuh setelah bangunan berpindah tangan.' },
    supplies3:{ n: 'Arsenal Supplies III', ph: 1, f: 0, m: 0, x: 286, y: 110, r: 10, c: '#fbbf24', tip: 'Arsenal Supplies: kumpulkan poin yang jatuh setelah bangunan berpindah tangan.' },
    supplies4:{ n: 'Arsenal Supplies IV', ph: 1, f: 0, m: 0, x: 387, y: 137, r: 10, c: '#fbbf24', tip: 'Arsenal Supplies: kumpulkan poin yang jatuh setelah bangunan berpindah tangan.' },
    supplies5:{ n: 'Arsenal Supplies V', ph: 1, f: 0, m: 0, x: 112, y: 359, r: 10, c: '#fbbf24', tip: 'Arsenal Supplies: kumpulkan poin yang jatuh setelah bangunan berpindah tangan.' },
    supplies6:{ n: 'Arsenal Supplies VI', ph: 1, f: 0, m: 0, x: 418, y: 355, r: 10, c: '#fbbf24', tip: 'Arsenal Supplies: kumpulkan poin yang jatuh setelah bangunan berpindah tangan.' },
    roam:    { n: 'Roamer / Pengintai',      ph: 1, f: 0, m: 0, x: 38, y: 42, r: 0, c: '#4ade80', tip: 'Tidak di bangunan: bantu reinforce, serang bangunan musuh yang lemah.' },
    workshop:{ n: 'Weapon Workshop',         ph: 3, f: 0, m: 0, x: 516, y: 42, r: 0, c: '#c084fc', tip: 'Muncul acak mulai menit 30. Ambil poin simpanannya secepatnya.' }
};
const FOUNDRY_KEYS = Object.keys(FOUNDRY_B);

// Template 30 slot (urut dari terkuat). [role, phase1, phase2]
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
    ['Collector', 'roam', 'workshop'], ['Collector', 'roam', 'workshop'], ['Collector', 'roam', 'workshop'], ['Collector', 'roam', 'workshop']
];

let foundryPlayers = [];
let foundryTab = 'Legion 1';   // 'Legion 1' | 'Legion 2' | 'map' | 'strategy'
let foundryMapLegion = 'Legion 1';
let foundryPhase = 1;
let foundrySelected = 'foundry';
let foundryTaskMarksOn = true;
let foundryTaskFilters = new Set(['Commander', 'Rally Leader', 'Joiner', 'Holder', 'Mobile', 'Collector']);

function foundryCanEdit() { return typeof canEditAlliance === 'function' && canEditAlliance(FOUNDRY_ALLIANCE); }
function foundryName(key) { return (FOUNDRY_B[key] || {}).n || '-'; }
function foundryPower(p) { return canViewSensitive() ? Number(p.troops_power || 0).toLocaleString('en-US') : MASKED_TEXT; }

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
    foundryPlayers = data || [];
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
    else body.innerHTML = foundryStrategyHtml();
    foundryApplyLanguage();
}

// ---------- BILINGUAL UI (English / Bahasa Indonesia) ----------
let foundryLanguage = localStorage.getItem('foundry-language') || 'en';
const FOUNDRY_I18N = {
  'Back to Menu':'Kembali ke Menu','Foundry Battle Roster':'Roster Foundry Battle',
  'IDN Alliance · 2 Legion · 30 Battle + 10 Cadangan per Legion':'Aliansi IDN · 2 Legion · 30 Petarung + 10 Cadangan per Legion',
  'Bulk Assign':'Penugasan Massal','⚡ Isi Otomatis (by Power)':'⚡ Isi Otomatis (berdasarkan Power)',
  '📋 Salin untuk Discord':'📋 Salin untuk Discord','Kosongkan Roster':'Clear Roster',
  '🗺️ Peta':'🗺️ Map','📖 Strategi':'📖 Strategy','Pemain':'Player','Cadangan':'Substitute',
  '— kosong —':'— empty —','kosong':'empty','Role':'Role','Phase 1':'Phase 1','Phase 2/3':'Phase 2/3',
  'Pemain Cadangan':'Substitute Players','Mark tugas pemain':'Player task markers','Pilih semua':'Select all',
  'Matikan semua':'Clear all','Mark: ON':'Markers: ON','Mark: OFF':'Markers: OFF',
  'Mark angka menunjukkan nomor slot pemain di roster untuk target bangunan pada phase terpilih. Arahkan/ketuk mark untuk melihat nama dan tugas.':'Numbered markers show roster slots assigned to each building for the selected phase. Hover/tap a marker to view the player name and task.',
  'belum ada':'none assigned','Angka di lingkaran = jumlah pemain yang ditugaskan pada bangunan untuk phase terpilih. Mark kecil = nomor slot pemain; gunakan filter tugas untuk menampilkan peran tertentu.':'Numbers in circles show assigned players for the selected phase. Small markers show player slot numbers; use task filters to show selected roles.',
  'Gambaran event':'Event overview','Timeline & rencana per phase':'Timeline & phase plan','Peran dalam roster':'Roster roles',
  'Gagal memuat data pemain IDN':'Failed to load IDN player data','Anda tidak punya izin mengubah roster IDN.':'You do not have permission to edit the IDN roster.',
  'Link Live Share Foundry disalin.':'Foundry Live Share link copied.','Tidak dapat memuat peta. Periksa koneksi atau izin baca Supabase, lalu refresh.':'Unable to load map. Check your connection or Supabase read permissions, then refresh.',
  'Memuat data roster Foundry…':'Loading Foundry roster…','Read-only · Data dimuat dari Supabase saat dibuka. Refresh otomatis setiap 30 detik.':'Read-only · Data loads from Supabase on open. Auto-refreshes every 30 seconds.',
  'Open site':'Buka situs','Refresh':'Segarkan','ROAM':'ROAM','WORKSHOP':'WORKSHOP',
  'Arsenal Supplies I':'Arsenal Supplies I','Arsenal Supplies II':'Arsenal Supplies II','Arsenal Supplies III':'Arsenal Supplies III','Arsenal Supplies IV':'Arsenal Supplies IV','Arsenal Supplies V':'Arsenal Supplies V','Arsenal Supplies VI':'Arsenal Supplies VI',
  'Roster Foundry Battle':'Foundry Battle Roster','Aliansi IDN':'IDN Alliance','Peta':'Map','Strategi':'Strategy','Pilih Legion dan Phase':'Select Legion and Phase','Tugas':'Task','Target':'Target','Simpan':'Save','Batal':'Cancel','Penugasan Massal':'Bulk Assign','Kosongkan Roster':'Clear Roster','Pemain Cadangan':'Substitute Players','Nomor slot':'Slot number',
  'Angka kecil adalah nomor slot roster.':'Small numbers indicate roster slot numbers.'
};
function foundryT(text) {
  if (foundryLanguage === 'id') return text;
  return FOUNDRY_I18N[text] || text;
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

// ---------- ROSTER ----------
function foundryRosterHtml(legion) {
    const edit = foundryCanEdit();
    const free = foundryPlayers.filter(p => !foundryInRoster(p));
    const opts = (cur) => '<option value="">— kosong —</option>' +
        (cur ? `<option value="${cur.id}" selected>${escapeHtml(cur.nickname)}</option>` : '') +
        free.map(p => `<option value="${p.id}">${escapeHtml(p.nickname)}</option>`).join('');
    const row = (status, slot, tpl) => {
        const p = foundryFind(legion, status, slot);
        const role = p ? (p.foundry_role || '-') : (tpl ? tpl[0] : 'Substitute');
        const p1 = status === 'Battle' ? foundryName(p ? p.foundry_p1 : tpl[1]) : '-';
        const p2 = status === 'Battle' ? foundryName(p ? p.foundry_p2 : tpl[2]) : '-';
        const who = edit
            ? `<select onchange="foundryAssign('${legion}','${status}',${slot},this.value)">${opts(p)}</select>`
            : (p ? escapeHtml(p.nickname) : '<span class="fy-empty">kosong</span>');
        const id = p && canViewSensitive() ? escapeHtml(p.game_id) : (p ? MASKED_TEXT : '');
        return `<tr class="${p ? '' : 'fy-row-empty'}"><td>${slot}</td><td>${who}</td><td>${id}</td><td>${p ? foundryPower(p) : ''}</td><td>${escapeHtml(role)}</td><td>${escapeHtml(p1)}</td><td>${escapeHtml(p2)}</td></tr>`;
    };
    const head = '<thead><tr><th>#</th><th>Pemain</th><th>Game ID</th><th>Power</th><th>Role</th><th>Phase 1</th><th>Phase 2/3</th></tr></thead>';
    const nb = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle').length;
    const ns = foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Substitute').length;
    let battle = '', subs = '';
    for (let i = 1; i <= FOUNDRY_BATTLE_MAX; i++) battle += row('Battle', i, FOUNDRY_TEMPLATE[i - 1]);
    for (let i = 1; i <= FOUNDRY_SUB_MAX; i++) subs += row('Substitute', i, null);
    return `<div class="fy-counter"><span class="fy-badge fy-b-battle">Battle ${nb} / ${FOUNDRY_BATTLE_MAX}</span><span class="fy-badge fy-b-sub">Cadangan ${ns} / ${FOUNDRY_SUB_MAX}</span></div>
        <div class="table-container"><table class="fy-table">${head}<tbody>${battle}</tbody></table></div>
        <h3 class="fy-h">Pemain Cadangan</h3>
        <div class="table-container"><table class="fy-table">${head}<tbody>${subs}</tbody></table></div>`;
}

async function foundryClear(p) {
    const nulls = { foundry_legion: null, foundry_status: null, foundry_slot: null, foundry_role: null, foundry_p1: null, foundry_p2: null };
    const { error } = await getSupabase().from('troops_power').update(nulls).eq('id', p.id);
    if (error) throw error;
    Object.assign(p, nulls);
}

async function foundryAssign(legion, status, slot, idValue) {
    if (!foundryCanEdit()) { showToast('Anda tidak punya izin mengubah roster IDN.', 'warning'); return; }
    try {
        const old = foundryFind(legion, status, slot);
        if (old) await foundryClear(old);
        if (idValue) {
            const p = foundryPlayers.find(x => String(x.id) === String(idValue));
            const tpl = status === 'Battle' ? FOUNDRY_TEMPLATE[slot - 1] : null;
            const patch = { foundry_legion: legion, foundry_status: status, foundry_slot: slot,
                foundry_role: tpl ? tpl[0] : 'Substitute', foundry_p1: tpl ? tpl[1] : null, foundry_p2: tpl ? tpl[2] : null };
            const { error } = await getSupabase().from('troops_power').update(patch).eq('id', p.id);
            if (error) throw error;
            Object.assign(p, patch);
        }
    } catch (e) {
        showToast('Gagal menyimpan. Pastikan supabase_foundry_roster.sql sudah dijalankan.', 'error');
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
    const jobs = chosen.map((p, i) => {
        const slot = slots[i], tpl = status === 'Battle' ? FOUNDRY_TEMPLATE[slot - 1] : null;
        return { p, patch: { foundry_legion: legion, foundry_status: status, foundry_slot: slot,
            foundry_role: tpl ? tpl[0] : 'Substitute', foundry_p1: tpl ? tpl[1] : null, foundry_p2: tpl ? tpl[2] : null } };
    });
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
        showToast(`Sebagian gagal (${done}/${jobs.length} tersimpan). Pastikan supabase_foundry_roster.sql sudah dijalankan.`, 'error');
        foundryBulkSel.clear(); foundryBulkFilter(); foundryBulkUpdate();
    }
    foundryRender();
}

// Isi otomatis: urut power -> L1 Battle 30, L2 Battle 30, lalu cadangan 10 per legion.
async function foundryAutoFill() {
    if (!foundryCanEdit()) return;
    if (!await showCustomConfirmAsync('Isi otomatis roster Foundry IDN berdasarkan Troops Power? Roster Foundry yang ada akan diganti.', '#f59e0b')) return;
    try {
        const sorted = [...foundryPlayers].sort((a, b) => Number(b.troops_power || 0) - Number(a.troops_power || 0));
        const plan = [];
        FOUNDRY_LEGIONS.forEach(l => { for (let i = 1; i <= FOUNDRY_BATTLE_MAX; i++) plan.push([l, 'Battle', i]); });
        FOUNDRY_LEGIONS.forEach(l => { for (let i = 1; i <= FOUNDRY_SUB_MAX; i++) plan.push([l, 'Substitute', i]); });
        const client = getSupabase();
        const jobs = sorted.map((p, idx) => {
            const t = plan[idx];
            const tpl = t && t[1] === 'Battle' ? FOUNDRY_TEMPLATE[t[2] - 1] : null;
            const patch = t ? { foundry_legion: t[0], foundry_status: t[1], foundry_slot: t[2],
                foundry_role: tpl ? tpl[0] : 'Substitute', foundry_p1: tpl ? tpl[1] : null, foundry_p2: tpl ? tpl[2] : null }
                : { foundry_legion: null, foundry_status: null, foundry_slot: null, foundry_role: null, foundry_p1: null, foundry_p2: null };
            return { p, patch };
        });
        for (let i = 0; i < jobs.length; i += 20) {
            const res = await Promise.all(jobs.slice(i, i + 20).map(j => client.from('troops_power').update(j.patch).eq('id', j.p.id)));
            const bad = res.find(r => r.error);
            if (bad) throw bad.error;
        }
        jobs.forEach(j => Object.assign(j.p, j.patch));
        showToast('Roster Foundry terisi otomatis.', 'success');
    } catch (e) {
        showToast('Gagal mengisi otomatis. Pastikan supabase_foundry_roster.sql sudah dijalankan.', 'error');
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

function foundryCopyText() {
    const lines = ['**FOUNDRY BATTLE ROSTER — IDN**'];
    FOUNDRY_LEGIONS.forEach(l => {
        lines.push('', `__${l}__`);
        for (let i = 1; i <= FOUNDRY_BATTLE_MAX; i++) {
            const p = foundryFind(l, 'Battle', i);
            if (p) lines.push(`${i}. ${p.nickname} — ${p.foundry_role} | P1: ${foundryName(p.foundry_p1)} | P2: ${foundryName(p.foundry_p2)}`);
        }
        const subs = [];
        for (let i = 1; i <= FOUNDRY_SUB_MAX; i++) { const p = foundryFind(l, 'Substitute', i); if (p) subs.push(p.nickname); }
        if (subs.length) lines.push(`Cadangan: ${subs.join(', ')}`);
    });
    const text = lines.join('\n');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => showToast('Roster disalin (siap tempel ke Discord).', 'success'));
    else showToast('Browser tidak mengizinkan salin otomatis.', 'warning');
}

// ---------- MAP ----------
function foundryAssigned(legion, key, phase) {
    return foundryPlayers.filter(p => p.foundry_legion === legion && p.foundry_status === 'Battle' &&
        (phase === 1 ? p.foundry_p1 === key : p.foundry_p2 === key)).sort((a, b) => a.foundry_slot - b.foundry_slot);
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
    foundryTaskFilters = checked ? new Set(['Commander', 'Rally Leader', 'Joiner', 'Holder', 'Mobile', 'Collector']) : new Set();
    foundryRender();
}

function foundryMapHtml() {
    const L = foundryMapLegion, ph = foundryPhase;
    const nodes = Object.entries(FOUNDRY_B).filter(([k, b]) => b.x && !['roam', 'workshop'].includes(k)).map(([k, b]) => {
        const active = b.ph <= ph;
        const n = foundryAssigned(L, k, ph === 1 ? 1 : 2).length;
        return `<g class="fy-node ${active ? '' : 'fy-off'} ${k === foundrySelected ? 'fy-sel' : ''}" onclick="foundryPickBuilding('${k}')" tabindex="0" role="button" aria-label="${escapeHtml(b.n)}">
            <circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.c}" fill-opacity=".55" stroke="${b.c}" stroke-width="8"/>
            <text x="${b.x}" y="${b.y + 16}" text-anchor="middle" class="fy-n">${n}</text>
            </g>`;
    }).join('');
    // Each visible pill represents one player's assignment for the selected phase.
    // Pills are grouped around the target building and can be filtered by task/role.
    const marks = foundryTaskMarksOn ? Object.entries(FOUNDRY_B).filter(([, b]) => b.x).map(([key, b]) => {
        const ps = foundryAssigned(L, key, ph === 1 ? 1 : 2).filter(p => foundryTaskFilters.has(p.foundry_role || ''));
        return ps.map((p, i) => {
            const col = ({ Commander:'#f59e0b', 'Rally Leader':'#ef4444', Joiner:'#fb923c', Holder:'#38bdf8', Mobile:'#4ade80', Collector:'#c084fc' })[p.foundry_role] || '#e5e7eb';
            const perRow = 4, dx = ((i % perRow) - 1.5) * 24, dy = 32 + Math.floor(i / perRow) * 23;
            const x = Math.max(17, Math.min(FOUNDRY_MAP.w - 17, b.x + dx));
            const y = Math.max(14, Math.min(FOUNDRY_MAP.h - 14, b.y + dy));
            const label = String(p.foundry_slot);
            return `<g class="fy-task-mark" tabindex="0" role="img" aria-label="Slot ${label}: ${escapeHtml(p.nickname)} — ${escapeHtml(p.foundry_role || 'Task')}" transform="translate(${x},${y})"><title>Slot ${label} · ${escapeHtml(p.nickname)} · ${escapeHtml(p.foundry_role || 'Task')} · ${escapeHtml(b.n)}</title><rect x="-11" y="-10" width="22" height="20" rx="6" fill="${col}" stroke="#111827" stroke-width="2"/><text x="0" y="5" text-anchor="middle" class="fy-task-mark-text">${label}</text></g>`;
        }).join('');
    }).join('') : '';
    const b = FOUNDRY_B[foundrySelected];
    const list = (phase) => {
        const ps = foundryAssigned(L, foundrySelected, phase);
        return ps.length ? ps.map(p => `<li>#${p.foundry_slot} ${escapeHtml(p.nickname)} <small>(${escapeHtml(p.foundry_role)})</small></li>`).join('') : '<li class="fy-empty">belum ada</li>';
    };
    const pts = b.m ? `<p><b>${b.f.toLocaleString('en-US')}</b> poin first capture + <b>${b.m.toLocaleString('en-US')}</b> poin/menit</p>` : '';
    const roles = ['Commander', 'Rally Leader', 'Joiner', 'Holder', 'Mobile', 'Collector'];
    return `<div class="fy-controls">
        <button class="btn-apply" type="button" onclick="shareFoundryMapLink()">🔗 Live Share Map</button>
        ${FOUNDRY_LEGIONS.map(l => `<button class="btn-apply ${l === L ? 'fy-on' : ''}" onclick="foundrySetMapLegion('${l}')">${l}</button>`).join('')}
        ${[1, 2, 3].map(n => `<button class="btn-apply ${n === ph ? 'fy-on' : ''}" onclick="foundrySetPhase(${n})">Phase ${n} (${(n - 1) * 15}–${n * 15} mnt${n === 3 ? '+' : ''})</button>`).join('')}</div>
        <div class="fy-task-filter"><div class="fy-task-filter-head"><strong>Mark tugas pemain</strong><button class="btn-apply ${foundryTaskMarksOn ? 'fy-on' : ''}" onclick="foundryToggleTaskMarks()">${foundryTaskMarksOn ? 'Mark: ON' : 'Mark: OFF'}</button><button class="btn-apply" onclick="foundrySetAllTaskFilters(true)">Pilih semua</button><button class="btn-apply" onclick="foundrySetAllTaskFilters(false)">Matikan semua</button></div><div class="fy-task-filter-options">${roles.map(r => `<label><input type="checkbox" ${foundryTaskFilters.has(r) ? 'checked' : ''} onchange="foundryToggleTaskFilter('${r}',this.checked)"><span>${r}</span></label>`).join('')}</div><small>Mark angka menunjukkan nomor slot pemain di roster untuk target bangunan pada phase terpilih. Arahkan/ketuk mark untuk melihat nama dan tugas.</small></div>
        <svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map" role="img" aria-label="Peta Foundry Battle">
            <image href="${FOUNDRY_MAP.src}" x="0" y="0" width="${FOUNDRY_MAP.w}" height="${FOUNDRY_MAP.h}"/>
            ${nodes}<g class="fy-task-zone-labels"><text x="38" y="22" class="fy-zone-label">ROAM</text><text x="516" y="22" text-anchor="middle" class="fy-zone-label">WORKSHOP</text></g>${marks}</svg>
        <div class="fy-extra">${['roam', 'workshop'].map(k => `<button class="btn-apply ${k === foundrySelected ? 'fy-on' : ''}" onclick="foundryPickBuilding('${k}')">${escapeHtml(FOUNDRY_B[k].n)}</button>`).join('')}</div>
        <p class="fy-note">Angka di lingkaran = jumlah pemain yang ditugaskan pada bangunan untuk phase terpilih. Mark kecil = nomor slot pemain; gunakan filter tugas untuk menampilkan peran tertentu.</p>
        <div class="fy-detail"><h3>${escapeHtml(b.n)}</h3>${pts}<p>${escapeHtml(b.tip)}</p>
            <div class="fy-cols"><div><h4>Phase 1</h4><ul>${list(1)}</ul></div><div><h4>Phase 2/3</h4><ul>${list(2)}</ul></div></div></div>`;
}

// ---------- STRATEGY ----------
function foundryStrategyHtml() {
    const rows = FOUNDRY_KEYS.filter(k => FOUNDRY_B[k].m).map(k => { const b = FOUNDRY_B[k];
        return `<tr><td>${escapeHtml(b.n)}</td><td>${b.ph === 1 ? 'Menit 0' : 'Menit 15'}</td><td>${b.f.toLocaleString('en-US')}</td><td>${b.m.toLocaleString('en-US')}</td></tr>`; }).join('');
    return `<div class="fy-guide">
<section><h3>1. Gambaran event</h3><ul><li>Foundry Battle: alliance vs alliance, 60 menit, diadakan tiap 2 minggu. Satu legion = 30 petarung + 10 cadangan; satu pemain hanya boleh di satu legion.</li><li>Pemenang = Alliance Arsenal Points terbanyak. Poin pribadi hanya untuk hadiah individu.</li><li>Pasukan tidak mati permanen; cedera dipulihkan setelah battle.</li></ul></section>
<section><h3>2. Poin bangunan (total peta penuh: 7.560 poin/menit)</h3><div class="table-container"><table class="fy-table"><thead><tr><th>Bangunan</th><th>Buka</th><th>First capture</th><th>Poin/menit</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="fy-note">Waktu kontrol ±2 menit per bangunan (±1 menit bila Boiler Room dikuasai). Kalah sebelum timer selesai = 0 poin, jadi jangan setengah-setengah.</p></section>
<section><h3>3. Timeline &amp; rencana per phase</h3><ul>
<li><b>Menit 0–2 (safe zone):</b> semua sudah di posisi, formasi siap, tidak ada march tersisa. Begitu terbuka, teleport ke bangunan masing-masing.</li>
<li><b>Phase 1 (0–15):</b> 2 Prototype Site, 4 Repair Facility, Boiler Room, Transit Station. Rebut Boiler Room dan Transit paling awal (capture lebih cepat dan teleport lebih sering). Prototype dipegang rally terkuat; Repair cukup 2 holder per sudut.</li>
<li><b>Phase 2 (menit 15):</b> Imperial Foundry, Munitions Warehouse, Mercenary Camp terbuka. Rally Leader dan Joiner (target Phase 2 = Imperial Foundry) teleport ke tengah; holder Prototype dan Repair tetap di tempat. Isi kembali garnisun yang ditinggal.</li>
<li><b>Phase 3 (menit 30+):</b> Weapon Workshop muncul acak. Collector menjaga minimap dan mengambil poinnya segera. Munitions Warehouse (+15% damage / -15% damage musuh) dipakai bila pertarungan seimbang.</li></ul></section>
<section><h3>4. Peran dalam roster</h3><ul><li><b>Commander (1):</b> pantau skor, beri satu perintah singkat: defend, reinforce, rally, collect, rotate.</li><li><b>Rally Leader / Joiner:</b> inti serangan Imperial Foundry dan penjaga Prototype saat Phase 1.</li><li><b>Mobile:</b> teleport antar titik, tekan bangunan musuh bernilai tinggi, bantu reinforce.</li><li><b>Holder:</b> menduduki dan menjaga bangunan sampai akhir; tidak ikut pindah ke tengah.</li><li><b>Collector:</b> kumpulkan Arsenal Supplies yang jatuh saat bangunan berpindah tangan dan Weapon Workshop.</li><li><b>Cadangan (10):</b> tetap online; gantikan petarung yang absen sejak awal, jangan menunggu tengah battle.</li></ul></section>
<section><h3>5. Taktik inti</h3><ul>
<li>Jangan kirim semua pemain kuat ke Imperial Foundry. Prototype + Repair + Outpost yang dipegang penuh sering mengalahkan satu rush ke tengah yang gagal.</li>
<li>Waktu tahan sama pentingnya dengan nilai bangunan: Prototype 10 menit = 12.000 poin berkelanjutan.</li>
<li>Pakai reinforcement untuk menjaga holder, bukan menunggu kalah lalu rebut ulang.</li>
<li>Serang bangunan musuh yang menyimpan banyak poin sementara; saat direbut, poinnya jatuh sebagai Arsenal Supplies, jadi siapkan Collector di dekatnya.</li>
<li>Skor unggul: lindungi bangunan penghasil poin. Skor tertinggal: incar bangunan bernilai/berisi poin dan Weapon Workshop. Skor ketat: rotasi cepat, hindari pertarungan yang tidak mengubah objektif.</li>
<li>Keluar dari battlefield memicu cooldown masuk kembali; jangan keluar menjelang unlock phase atau akhir battle.</li></ul></section>
<section><h3>6. Checklist sebelum battle</h3><ul><li>Pastikan nama dan legion sudah sesuai roster ini; konfirmasi jam battle di panel event.</li><li>Recall semua march, selesaikan scout, sembuhkan Infirmary, batalkan reinforce yang masuk ke Embassy.</li><li>Simpan speedup penyembuhan; pasang Chief Gear/Hero Gear dan buff tempur terkuat.</li><li>Siapkan formasi tersimpan untuk rally, garnisun, dan serangan solo.</li><li>Pastikan tidak ada fitur yang otomatis mengirim march keluar kota.</li></ul></section>
<section><h3>7. Kesalahan umum</h3><ul><li>Semua orang menumpuk di Imperial Foundry.</li><li>Lupa mengambil Arsenal Supplies setelah merebut bangunan.</li><li>Menyerang kota musuh yang tidak mengubah skor.</li><li>Terus menyerang posisi yang sudah kalah.</li><li>Tidak memantau skor sampai terlambat.</li></ul></section>
<p class="fy-note">Mekanik dan angka bisa berubah saat game diperbarui. Cek panel Foundry Battle di game sebelum registrasi.</p></div>`;
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
    const wrap = document.createElement('div'); wrap.id = 'foundry-shared-map';
    wrap.innerHTML = `<div class="fdt-shared-bar"><strong>🏭 Foundry Live Map · IDN</strong><span class="fdt-shared-actions"><button id="fy-share-lang">${foundryLanguage==='en'?'🇮🇩 Bahasa Indonesia':'🇬🇧 English'}</button>
      <button id="fy-share-l1">Legion 1</button><button id="fy-share-l2">Legion 2</button>
      <button id="fy-share-p1">Phase 1</button><button id="fy-share-p2">Phase 2</button><button id="fy-share-p3">Phase 3</button>
      <button id="fy-share-refresh">⟳ ${foundryLanguage==='en'?'Refresh':'Segarkan'}</button><button id="fy-share-site">${foundryLanguage==='en'?'Open site':'Buka situs'}</button></span></div>
      <div class="fdt-shared-body" id="fy-share-body"><div class="fdt-shared-msg">${foundryLanguage==='en'?'Loading Foundry roster…':'Memuat data roster Foundry…'}</div></div>
      <div class="fy-share-foot">${foundryLanguage==='en'?'Read-only · Data loads from Supabase on open. Auto-refresh every 30 seconds.':'Hanya baca · Data dimuat dari Supabase saat dibuka. Refresh otomatis setiap 30 detik.'}</div>`;
    document.body.appendChild(wrap); document.body.classList.add('fy-shared-open');
    let timer = null;
    const body = wrap.querySelector('#fy-share-body');
    const load = async () => {
      body.innerHTML = `<div class="fdt-shared-msg">${foundryLanguage==='en'?'Loading Foundry roster…':'Memuat data roster Foundry…'}</div>`;
      try {
        const client = getSupabase(); if (!client) throw new Error('Supabase tidak tersedia');
        const { data, error } = await client.from('troops_power').select('*').eq('alliance', FOUNDRY_ALLIANCE).order('troops_power', {ascending:false});
        if (error) throw error;
        foundryPlayers = data || []; foundryMapLegion = legion; foundryPhase = phase;
        // Build map without editor controls; the map and task marks reflect latest database values.
        const nodes = Object.entries(FOUNDRY_B).filter(([k,b]) => b.x && !['roam','workshop'].includes(k)).map(([k,b]) => {
          const n = foundryAssigned(legion,k,phase===1?1:2).length;
          return `<g class="fy-node ${b.ph <= phase ? '' : 'fy-off'}"><circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.c}" fill-opacity=".55" stroke="${b.c}" stroke-width="8"/><text x="${b.x}" y="${b.y+16}" text-anchor="middle" class="fy-n">${b.f || b.m ? n : ''}</text>${k.startsWith('supplies') ? `<text x="${b.x}" y="${b.y+25}" text-anchor="middle" class="fy-zone-label">${foundryLanguage==='en'?'SUPPLIES':'PERBEKALAN'}</text>` : ''}</g>`;
        }).join('');
        const marks = Object.entries(FOUNDRY_B).filter(([,b])=>b.x).map(([key,b])=>foundryAssigned(legion,key,phase===1?1:2).map((p,i)=>{
          const col=({'Commander':'#f59e0b','Rally Leader':'#ef4444','Joiner':'#fb923c','Holder':'#38bdf8','Mobile':'#4ade80','Collector':'#c084fc'})[p.foundry_role]||'#e5e7eb';
          const dx=((i%4)-1.5)*24,dy=32+Math.floor(i/4)*23,x=Math.max(17,Math.min(FOUNDRY_MAP.w-17,b.x+dx)),y=Math.max(14,Math.min(FOUNDRY_MAP.h-14,b.y+dy));
          return `<g class="fy-task-mark" transform="translate(${x},${y})"><title>Slot ${p.foundry_slot} · ${escapeHtml(p.nickname)} · ${escapeHtml(p.foundry_role||'Task')} · ${escapeHtml(b.n)}</title><rect x="-11" y="-10" width="22" height="20" rx="6" fill="${col}" stroke="#111827" stroke-width="2"/><text x="0" y="5" text-anchor="middle" class="fy-task-mark-text">${p.foundry_slot}</text></g>`;
        }).join('')).join('');
        const assignedRows = FOUNDRY_KEYS.flatMap(key => foundryAssigned(legion, key, phase === 1 ? 1 : 2).map(p => ({key, building: FOUNDRY_B[key], player:p})))
          .sort((a,b) => Number(a.player.foundry_slot)-Number(b.player.foundry_slot));
        const taskTitle = foundryLanguage === 'en' ? 'Players & assigned tasks' : 'Pemain & tugas yang ditetapkan';
        const slotLabel = foundryLanguage === 'en' ? 'Slot' : 'Slot';
        const playerLabel = foundryLanguage === 'en' ? 'Player' : 'Pemain';
        const roleLabel = foundryLanguage === 'en' ? 'Task / Role' : 'Tugas / Peran';
        const targetLabel = foundryLanguage === 'en' ? 'Target' : 'Target';
        const noPlayers = foundryLanguage === 'en' ? 'No battle players assigned for this phase.' : 'Belum ada pemain Battle yang ditugaskan pada phase ini.';
        const taskRows = assignedRows.length ? `<div class="fy-share-roster-wrap"><h3>${taskTitle}</h3><div class="fy-share-roster-scroll"><table class="fy-share-roster"><thead><tr><th>${slotLabel}</th><th>${playerLabel}</th><th>${roleLabel}</th><th>${targetLabel}</th></tr></thead><tbody>${assignedRows.map(({key,building,player:p})=>`<tr><td>#${escapeHtml(p.foundry_slot)}</td><td>${escapeHtml(p.nickname || '-')}</td><td>${escapeHtml(p.foundry_role || (foundryLanguage==='en'?'Unassigned':'Belum ditentukan'))}</td><td>${escapeHtml(foundryLanguage==='en' ? (building.n==='Roamer / Pengintai'?'Roamer':building.n==='Weapon Workshop'?'Weapon Workshop':building.n) : building.n)}</td></tr>`).join('')}</tbody></table></div></div>` : `<p class="fy-note">${noPlayers}</p>`;
        body.innerHTML = `<svg viewBox="0 0 ${FOUNDRY_MAP.w} ${FOUNDRY_MAP.h}" class="fy-map" role="img" aria-label="Foundry Live Map"><image href="${FOUNDRY_MAP.src}" x="0" y="0" width="${FOUNDRY_MAP.w}" height="${FOUNDRY_MAP.h}"/>${nodes}<g class="fy-task-zone-labels"><text x="38" y="22" class="fy-zone-label">ROAM</text><text x="516" y="22" text-anchor="middle" class="fy-zone-label">WORKSHOP</text></g>${marks}</svg><p class="fy-note">${legion} · Phase ${phase} · ${new Date().toLocaleTimeString()} · ${foundryLanguage==='en'?'Small numbers indicate roster slot numbers.':'Angka kecil adalah nomor slot roster.'}</p>${taskRows}`;
      } catch(e) { console.warn('Foundry live share failed',e); body.innerHTML=`<div class="fdt-shared-msg">${foundryLanguage==='en'?'Unable to load map. Check your connection or Supabase read permissions, then refresh.':'Tidak dapat memuat peta. Periksa koneksi atau izin baca Supabase, lalu refresh.'}</div>`; }
      ['l1','l2'].forEach((x,i)=>wrap.querySelector('#fy-share-'+x).classList.toggle('fy-share-active',legion===FOUNDRY_LEGIONS[i]));
      [1,2,3].forEach(n=>wrap.querySelector('#fy-share-p'+n).classList.toggle('fy-share-active',phase===n));
    };
    wrap.querySelector('#fy-share-lang').onclick=()=>{foundryLanguage=foundryLanguage==='en'?'id':'en';localStorage.setItem('foundry-language',foundryLanguage);const u=new URL(location.href);u.searchParams.set('lang',foundryLanguage);history.replaceState({},'',u);openFoundrySharedMap(legion,phase);};
    wrap.querySelector('#fy-share-l1').onclick=()=>{legion='Legion 1';load();}; wrap.querySelector('#fy-share-l2').onclick=()=>{legion='Legion 2';load();};
    [1,2,3].forEach(n=>wrap.querySelector('#fy-share-p'+n).onclick=()=>{phase=n;load();});
    wrap.querySelector('#fy-share-refresh').onclick=load;
    wrap.querySelector('#fy-share-site').onclick=()=>{location.href=location.origin+location.pathname;};
    await load(); timer=setInterval(load,30000);
    window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);},{once:true});
}
document.addEventListener('DOMContentLoaded',()=>{const q=new URLSearchParams(location.search);if(q.get('foundry')==='map')openFoundrySharedMap(q.get('legion')||'Legion 1',Number(q.get('phase')||1));});
