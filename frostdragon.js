// Frostdragon Tyrant tools: task assignments, roster summary, schedule and lock.
const FDT_TASKS = ['Rally Captain','Tyrant Candidate','Capital Reinforcer','Spire Life','Spire Shield','Spire Dragonbane','Spire Blade','Dragonite Collector','Capital Defense','Alliance A','Alliance B'];
// Alliance group tasks: every battle player belongs to exactly one of these groups, in addition to their role tasks above.
const FDT_ALLIANCE_TASKS = ['Alliance A','Alliance B'];
const FDT_SPIRE_TASKS = ['Spire Life','Spire Shield','Spire Dragonbane','Spire Blade'];
const FDT_RALLY_LEAD_NOTE = 'Rally Lead = highest power in each Spire, per alliance';
// Official limit: an eligible alliance can dispatch up to 60 combatants (Century Games Help Center).
const FDT_MAX_PER_ALLIANCE = 60;
// Dragonite gathering is a small support job: only a handful of gatherers per group are useful.
const FDT_DRAGONITE_TASK = 'Dragonite Collector';
const FDT_DRAGONITE_DEFAULT_PER_GROUP = 8;
const FDT_DRAGONITE_SOFT_MAX_PER_GROUP = 10;
// Dragonite only appears 75 min after the Battlefield opens, so collectors multitask until then.
const FDT_PRE_DRAGONITE_TASK = 'Capital Reinforcer';
// Candidates holding these key roles are never pulled into Dragonite duty.
const FDT_DRAGONITE_EXCLUDED = ['Rally Captain','Tyrant Candidate'];
// Official Spire names: Life (+Health), Shield (+Defense), Dragonbane (+Lethality), Blade (+Attack).
// Older saved values used the effect names; map them so existing assignments are not lost.
const FDT_LEGACY_TASKS = { 'Spire Lethality': 'Spire Dragonbane', 'Spire Attack': 'Spire Blade' };
const normalizeFdtTask = t => FDT_LEGACY_TASKS[t] || t;
// Stored as a comma-separated string in the existing text column. This remains
// backward-compatible with records that only have one task assigned.
function parseFdtTasks(value) {
  if (Array.isArray(value)) return value.map(normalizeFdtTask).filter(t => FDT_TASKS.includes(t));
  return String(value || '').split(',').map(t => normalizeFdtTask(t.trim())).filter(t => FDT_TASKS.includes(t));
}
function formatFdtTaskChips(value) {
  const tasks = parseFdtTasks(value);
  const multi = tasks.includes(FDT_DRAGONITE_TASK) && tasks.some(t => !FDT_ALLIANCE_TASKS.includes(t) && t !== FDT_DRAGONITE_TASK);
  return tasks.length ? tasks.map(t => `<span class="fdt-task-chip${FDT_ALLIANCE_TASKS.includes(t) ? ' fdt-task-chip--alliance' : ''}${t === FDT_DRAGONITE_TASK ? ' fdt-task-chip--dragonite' : ''}"${t === FDT_DRAGONITE_TASK && multi ? ' title="Multitask: other duties until Dragonite opens (75 min after Battlefield opens)"' : ''}>${escapeHtml(t)}${t === FDT_DRAGONITE_TASK && multi ? ' ⇄' : ''}</span>`).join(' ') : '<span class="fdt-task-empty">—</span>';
}
let fdtSettings = { open: null, deadline: null, locked: false };
let fdtClockTimer = null;

async function updateFrostdragonTask(playerId, tasks) {
  if (!isAdmin) return;
  if (fdtSettings.locked) { showToast('Frostdragon roster is locked.', 'warning'); fetchData(); return; }
  const normalized = [...new Set(parseFdtTasks(tasks))];
  const storedValue = normalized.length ? normalized.join(', ') : null;
  const { error } = await getSupabase().from('troops_power').update({frostdragon_task: storedValue}).eq('id', playerId);
  if (error) { showToast('Unable to save task: ' + error.message, 'error'); fetchData(); return; }
  const p = loadedTroopsData.find(x => Number(x.id) === Number(playerId));
  if (p) p.frostdragon_task = storedValue;
  const chips = document.getElementById(`fdt-task-chips-${playerId}`);
  if (chips) chips.innerHTML = formatFdtTaskChips(storedValue);
  const picker = chips?.parentElement?.querySelector('.fdt-task-picker');
  const summary = picker?.querySelector('summary');
  if (summary) summary.textContent = `Select tasks (${normalized.length})`;
  showToast('Frostdragon tasks saved.', 'success');
  updateFdtAllianceFilterUi();
  refreshFdtSummary();
  // Live Edit: redraw the open chart (and image) straight away so every bar and list reflects the change.
  if (isFdtChartOpen()) { renderFdtCharts(); if (fdtChartTab === 'image') showFdtChartImage(); }
}
// ---- "View by Alliance" filter (Frostdragon roster only) ----
function isFdtAllianceFilterActive() {
  return !!fdtAllianceFilter
    && typeof viewMode !== 'undefined' && viewMode === 'LEGION'
    && typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
}
function getFdtAllianceScoped(list) {
  if (!isFdtAllianceFilterActive()) return list;
  return list.filter(p => parseFdtTasks(p.frostdragon_task).includes(fdtAllianceFilter));
}
function handleFdtAllianceFilter(value) {
  fdtAllianceFilter = FDT_ALLIANCE_TASKS.includes(value) ? value : '';
  currentPage = 1;
  renderTable();
}
function updateFdtAllianceFilterUi() {
  const wrap = document.getElementById('fdt-alliance-filter-wrap');
  const select = document.getElementById('fdt-alliance-filter');
  if (!wrap || !select) return;
  const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
  const onRoster = typeof viewMode !== 'undefined' && viewMode === 'LEGION'
    && !document.getElementById('troops-table-page')?.classList.contains('hidden');
  const show = frost && onRoster;
  wrap.classList.toggle('hidden', !show);
  if (!show) { fdtAllianceFilter = ''; select.value = ''; if (isFdtChartOpen()) toggleFdtChartView(false); return; }
  const battlePlayers = loadedTroopsData.filter(p => p.frostdragon_role === 'Battle');
  const total = battlePlayers.length;
  Array.from(select.options).forEach(opt => {
    if (!opt.value) { opt.textContent = `All Alliances (${total})`; return; }
    const n = battlePlayers.filter(p => parseFdtTasks(p.frostdragon_task).includes(opt.value)).length;
    opt.textContent = `${opt.value} (${n})`;
  });
  select.value = fdtAllianceFilter;
  applyFdtChartMode();
}

// ---- "View as Chart" (Frostdragon roster only) ----
// Opens its own chart interface (modal) with two tabs: interactive Chart and a rendered Image (PNG) that can be downloaded.
// Pure SVG/CSS/Canvas (no extra library). Data = Battle roster, scoped by the "View by Alliance" filter.
const FDT_ALLIANCE_COLORS = { 'Alliance A': '#ef4444', 'Alliance B': '#3b82f6', none: '#64748b' };
let fdtChartTab = 'chart';
let fdtChartImageUrl = '';
// ---- Live Edit (Chart tab): change group / tasks or remove players right inside the roster chart ----
let fdtChartEdit = false;
let fdtImageHits = { W: 1400, H: 1, list: [] };
let fdtImgEditId = null;
function canFdtChartEdit() {
  return typeof isAdmin !== 'undefined' && isAdmin && typeof canManageLegion === 'function' && canManageLegion(currentSelection);
}
function syncFdtChartEditUi() {
  const btn = document.getElementById('fdt-chart-edit-btn');
  if (!btn) return;
  const allowed = canFdtChartEdit();
  if (!allowed) fdtChartEdit = false;
  btn.classList.toggle('hidden', !allowed);
  btn.classList.toggle('active', fdtChartEdit);
  btn.setAttribute('aria-pressed', String(fdtChartEdit));
  const imgEdit = fdtChartEdit && fdtChartTab === 'image';
  document.getElementById('fdt-chart-image-wrap')?.classList.toggle('fdt-img-editable', imgEdit);
  document.getElementById('fdt-image-edit-bar')?.classList.toggle('hidden', !imgEdit);
  if (!imgEdit) closeFdtImageEditor();
}
// ---- Live Edit on the Image tab: click a player in the picture to edit it ----
function onFdtImageClick(e) {
  if (!fdtChartEdit || fdtChartTab !== 'image' || !canFdtChartEdit()) return;
  const r = e.currentTarget.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const px = (e.clientX - r.left) / r.width * fdtImageHits.W;
  const py = (e.clientY - r.top) / r.height * fdtImageHits.H;
  const hit = fdtImageHits.list.find(h => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
  if (!hit) { closeFdtImageEditor(); return; }
  openFdtImageEditor(hit.id, e.clientX, e.clientY);
}
function openFdtImageEditor(id, cx, cy) {
  const p = loadedTroopsData.find(x => Number(x.id) === Number(id));
  if (!p) return;
  fdtImgEditId = Number(p.id);
  const modal = document.getElementById('fdt-chart-modal');
  let pop = document.getElementById('fdt-image-editor');
  if (!pop) { pop = document.createElement('div'); pop.id = 'fdt-image-editor'; pop.className = 'fdt-image-editor'; modal.appendChild(pop); }
  const g = (FDT_ALLIANCE_TASKS.find(a => parseFdtTasks(p.frostdragon_task).includes(a))) || '';
  const sel = parseFdtTasks(p.frostdragon_task);
  const roleTasks = FDT_TASKS.filter(t => !FDT_ALLIANCE_TASKS.includes(t));
  pop.innerHTML = `<div class="fdt-ie-head"><div><strong>${escapeHtml(p.nickname || '-')}</strong><small>${escapeHtml(p.alliance || '-')} · ID ${escapeHtml(p.game_id || '-')} · ${(Number(p.troops_power) || 0).toLocaleString('en-US')}</small></div><button type="button" class="fdt-ie-close" aria-label="Close" onclick="closeFdtImageEditor()">&times;</button></div>
    <label class="fdt-ie-label">Group</label>
    <select class="fdt-edit-select" onchange="setFdtPlayerGroup(${Number(p.id)}, this.value)"><option value="">No group</option>${FDT_ALLIANCE_TASKS.map(a => `<option value="${a}" ${g === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <label class="fdt-ie-label">Tasks</label>
    <div class="fdt-ie-tasks">${roleTasks.map(t => `<label><input type="checkbox" ${sel.includes(t) ? 'checked' : ''} onchange="toggleFrostdragonTask(${Number(p.id)}, '${t}', this.checked)"><span>${escapeHtml(t)}</span></label>`).join('')}</div>
    <div class="fdt-ie-actions"><button type="button" class="fdt-mini-btn fdt-edit-remove" onclick="removeFdtPlayerFromChart(${Number(p.id)})">🗑 Remove from roster</button></div>`;
  pop.classList.remove('hidden');
  if (typeof cx === 'number') {
    const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(cx + 12, window.innerWidth - w - 8)) + 'px';
    pop.style.top = Math.max(8, Math.min(cy + 12, window.innerHeight - h - 8)) + 'px';
  }
}
function closeFdtImageEditor() {
  fdtImgEditId = null;
  document.getElementById('fdt-image-editor')?.classList.add('hidden');
}
// After the picture is redrawn: close the editor if its player left the Battle roster.
function refreshFdtImageEditor() {
  if (fdtImgEditId == null) return;
  const p = loadedTroopsData.find(x => Number(x.id) === fdtImgEditId);
  if (!p || p.frostdragon_role !== 'Battle') closeFdtImageEditor();
}
function toggleFdtChartEdit() {
  if (!canFdtChartEdit()) { showToast("You don't have permission to edit this roster.", 'warning'); return; }
  if (!fdtChartEdit && fdtSettings.locked) { showToast('Frostdragon roster is locked. Unlock it in President Panel to make changes.', 'warning'); return; }
  fdtChartEdit = !fdtChartEdit;
  syncFdtChartEditUi();
  renderFdtCharts();
  if (fdtChartEdit) toggleFdtTaskDetails(true);
}
// Group = Alliance A / B (mutually exclusive); '' clears the group. Other tasks are kept.
async function setFdtPlayerGroup(playerId, group) {
  const p = loadedTroopsData.find(x => Number(x.id) === Number(playerId));
  if (!p) return;
  const tasks = new Set(parseFdtTasks(p.frostdragon_task));
  FDT_ALLIANCE_TASKS.forEach(t => tasks.delete(t));
  if (group && FDT_ALLIANCE_TASKS.includes(group)) tasks.add(group);
  await updateFrostdragonTask(playerId, [...tasks]);
}
async function removeFdtPlayerFromChart(playerId) {
  await removeFromLegion(playerId);
}

function fdtRosterContextOk() {
  const page = document.getElementById('troops-table-page');
  const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
  return !!(frost && typeof viewMode !== 'undefined' && viewMode === 'LEGION' && page && !page.classList.contains('hidden'));
}
function isFdtChartOpen() {
  const modal = document.getElementById('fdt-chart-modal');
  return !!modal && !modal.classList.contains('hidden');
}
function toggleFdtChartView(force) {
  const modal = document.getElementById('fdt-chart-modal');
  if (!modal) return;
  const open = typeof force === 'boolean' ? force : modal.classList.contains('hidden');
  if (open && typeof canViewSensitive === 'function' && !canViewSensitive()) {
    showToast('Login to view the roster chart.', 'warning');
    return;
  }
  if (open && !fdtRosterContextOk()) return;
  modal.classList.toggle('hidden', !open);
  document.body.classList.toggle('fdt-guide-open', open);
  if (!open) { fdtChartEdit = false; closeFdtImageEditor(); }
  if (open) {
    fdtChartEdit = false;
    fdtChartTab = 'chart';
    fdtZoom = 1;
    applyFdtChartMode();
    applyFdtZoom();
    modal.querySelector('.close-modal')?.focus();
  }
}
// ---- Zoom in / out (Chart + Image tabs) ----
// Buttons (− / 100% / +), Ctrl/⌘ + mouse wheel, and Ctrl +/-/0 while the modal is open.
// Chart tab: CSS zoom (re-flows like browser zoom). Image tab: scales the PNG width and scrolls.
const FDT_ZOOM_MIN = 0.5, FDT_ZOOM_MAX = 3, FDT_ZOOM_STEP = 0.25;
let fdtZoom = 1;
function applyFdtZoom() {
  const view = document.getElementById('fdt-chart-view');
  const img = document.getElementById('fdt-chart-image');
  if (view) view.style.zoom = fdtZoom === 1 ? '' : String(fdtZoom);
  if (img) {
    img.style.maxWidth = 'none';
    img.style.width = (fdtZoom * 100) + '%';
  }
  const label = document.getElementById('fdt-zoom-level');
  if (label) label.textContent = Math.round(fdtZoom * 100) + '%';
  const out = document.getElementById('fdt-zoom-out'), inn = document.getElementById('fdt-zoom-in');
  if (out) out.disabled = fdtZoom <= FDT_ZOOM_MIN + 1e-6;
  if (inn) inn.disabled = fdtZoom >= FDT_ZOOM_MAX - 1e-6;
}
function fdtSetZoom(z) {
  fdtZoom = Math.min(FDT_ZOOM_MAX, Math.max(FDT_ZOOM_MIN, Math.round(z * 100) / 100));
  applyFdtZoom();
}
function fdtZoomBy(dir) { fdtSetZoom(fdtZoom + dir * FDT_ZOOM_STEP); }
function fdtZoomReset() { fdtSetZoom(1); }
document.addEventListener('wheel', e => {
  if (!isFdtChartOpen() || !(e.ctrlKey || e.metaKey) || !e.target.closest?.('#fdt-chart-modal')) return;
  e.preventDefault();
  fdtZoomBy(e.deltaY < 0 ? 1 : -1);
}, { passive: false });
document.addEventListener('keydown', e => {
  if (!isFdtChartOpen() || !(e.ctrlKey || e.metaKey)) return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); fdtZoomBy(1); }
  else if (e.key === '-') { e.preventDefault(); fdtZoomBy(-1); }
  else if (e.key === '0') { e.preventDefault(); fdtZoomReset(); }
});
// Pinch-to-zoom on touch screens (two fingers inside the chart body).
(function () {
  let startDist = 0, startZoom = 1;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  document.addEventListener('touchstart', e => {
    if (e.touches.length === 2 && e.target.closest?.('#fdt-chart-modal .fdt-guide-body')) { startDist = dist(e.touches); startZoom = fdtZoom; }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !startDist || !e.target.closest?.('#fdt-chart-modal .fdt-guide-body')) return;
    e.preventDefault();
    fdtSetZoom(startZoom * dist(e.touches) / startDist);
  }, { passive: false });
  document.addEventListener('touchend', e => { if (e.touches.length < 2) startDist = 0; }, { passive: true });
})();

// Called on every roster re-render: keeps an open chart in sync with the data / filter.
function applyFdtChartMode() {
  if (!isFdtChartOpen()) return;
  if (!fdtRosterContextOk()) { toggleFdtChartView(false); return; }
  if (fdtChartEdit && fdtSettings.locked) fdtChartEdit = false;
  renderFdtCharts();
  setFdtChartTab(fdtChartTab);
}
function setFdtChartTab(tab) {
  fdtChartTab = tab === 'image' ? 'image' : 'chart';
  const isImage = fdtChartTab === 'image';
  document.getElementById('fdt-chart-view')?.classList.toggle('hidden', isImage);
  document.getElementById('fdt-chart-image-wrap')?.classList.toggle('hidden', !isImage);
  [['chart', 'fdt-chart-tab-chart'], ['image', 'fdt-chart-tab-image']].forEach(([name, id]) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.classList.toggle('active', fdtChartTab === name);
    b.setAttribute('aria-selected', String(fdtChartTab === name));
  });
  syncFdtChartEditUi();
  if (isImage) showFdtChartImage();
}
function fdtCompactPower(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// Shared data for the HTML chart and the PNG image.
function getFdtChartData() {
  const all = (typeof loadedTroopsData !== 'undefined' ? loadedTroopsData : []).filter(p => p.frostdragon_role === 'Battle');
  const scoped = getFdtAllianceScoped(all);
  const power = p => Number(p.troops_power) || 0;
  const byPower = (a, b) => power(b) - power(a);
  const groupOf = p => FDT_ALLIANCE_TASKS.find(g => parseFdtTasks(p.frostdragon_task).includes(g));
  // Display order: Alliance A first, then Alliance B, then players without a group; highest power first inside each group.
  const groupIndex = p => { const i = FDT_ALLIANCE_TASKS.indexOf(groupOf(p)); return i < 0 ? FDT_ALLIANCE_TASKS.length : i; };
  const byGroupThenPower = (a, b) => groupIndex(a) - groupIndex(b) || byPower(a, b);
  const groupRows = FDT_ALLIANCE_TASKS.map(g => {
    const members = all.filter(p => parseFdtTasks(p.frostdragon_task).includes(g));
    return { label: g, count: members.length, power: members.reduce((s, p) => s + power(p), 0) };
  });
  const unassigned = all.filter(p => !groupOf(p));
  if (unassigned.length) groupRows.push({ label: 'No group', count: unassigned.length, power: unassigned.reduce((s, p) => s + power(p), 0) });
  const roleTasks = FDT_TASKS.filter(t => !FDT_ALLIANCE_TASKS.includes(t));
  const taskCounts = roleTasks.map(t => ({ label: t, players: scoped.filter(p => parseFdtTasks(p.frostdragon_task).includes(t)).sort(byGroupThenPower) }));
  taskCounts.push({ label: 'No role task', players: scoped.filter(p => !parseFdtTasks(p.frostdragon_task).some(t => roleTasks.includes(t))).sort(byGroupThenPower) });
  // Rally Lead = the highest-power player of each Spire team, per alliance group (shown with a crown).
  const rallyLeads = {};
  FDT_SPIRE_TASKS.forEach(t => {
    rallyLeads[t] = new Set();
    [...FDT_ALLIANCE_TASKS, ''].forEach(g => {
      const team = all.filter(p => parseFdtTasks(p.frostdragon_task).includes(t) && (groupOf(p) || '') === g).sort(byPower);
      if (team.length) rallyLeads[t].add(String(team[0].id));
    });
  });
  const isRallyLead = (p, label) => !!(rallyLeads[label] && rallyLeads[label].has(String(p.id)));
  return {
    all, scoped, power, groupOf, groupRows, taskCounts, isRallyLead,
    top: [...scoped].sort(byPower).slice(0, 15).sort(byGroupThenPower),
    scopeLabel: fdtAllianceFilter || 'All Alliances',
    scopedPower: scoped.reduce((s, p) => s + power(p), 0)
  };
}
const fdtColorOf = label => FDT_ALLIANCE_COLORS[label] || FDT_ALLIANCE_COLORS.none;

function toggleFdtTaskDetails(open) {
  document.querySelectorAll('#fdt-chart-view .fdt-task-detail').forEach(d => { d.open = !!open; });
}
function fdtBarRows(rows, max, opts = {}) {
  // rows: [{label, value, color, display, sub}]
  if (!rows.length) return '<div class="fdt-chart-empty">No data.</div>';
  return rows.map(r => {
    const pct = max > 0 ? Math.max(r.value > 0 ? 2 : 0, Math.round(r.value / max * 100)) : 0;
    return `<div class="fdt-bar-row">
      <div class="fdt-bar-label" title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</div>
      <div class="fdt-bar-track"><div class="fdt-bar-fill" style="width:${pct}%;background:${r.color}"></div>${opts.cap ? `<div class="fdt-bar-cap" style="left:${Math.min(100, opts.cap / max * 100)}%" title="Limit ${opts.cap}"></div>` : ''}</div>
      <div class="fdt-bar-value">${escapeHtml(r.display)}${r.sub ? `<small>${escapeHtml(r.sub)}</small>` : ''}</div>
    </div>`;
  }).join('');
}
function renderFdtCharts() {
  const view = document.getElementById('fdt-chart-view');
  if (!view) return;
  const openTasks = Array.from(view.querySelectorAll('.fdt-task-detail[open] .fdt-bar-label')).map(el => el.textContent);
  const openPickers = Array.from(view.querySelectorAll('.fdt-edit-picker[open]')).map(el => el.dataset.pid);
  const scrollBox = view.closest('.fdt-guide-body');
  const scrollTop = scrollBox ? scrollBox.scrollTop : 0;
  const edit = fdtChartEdit && canFdtChartEdit() && !fdtSettings.locked;
  const d = getFdtChartData();
  const { power, groupOf } = d;
  if (!d.all.length) {
    view.innerHTML = '<div class="fdt-chart-empty">No Battle roster players yet. Assign players to the Frostdragon roster to see charts.' + (edit ? '<br><br><button type="button" class="fdt-mini-btn fdt-edit-assign" onclick="openAddLegionModal()">+ Assign Player</button>' : '') + '</div>';
    return;
  }
  const maxCount = Math.max(FDT_MAX_PER_ALLIANCE, ...d.groupRows.map(g => g.count));
  const maxGroupPower = Math.max(1, ...d.groupRows.map(g => g.power));
  const countChart = fdtBarRows(d.groupRows.map(g => ({ label: g.label, value: g.count, color: fdtColorOf(g.label), display: `${g.count} / ${FDT_MAX_PER_ALLIANCE}` })), maxCount, { cap: FDT_MAX_PER_ALLIANCE });
  const powerChart = fdtBarRows(d.groupRows.map(g => ({ label: g.label, value: g.power, color: fdtColorOf(g.label), display: fdtCompactPower(g.power), sub: g.power.toLocaleString('en-US') })), maxGroupPower);

  const maxTask = Math.max(1, ...d.taskCounts.map(t => t.players.length));
  const editCell = p => {
    const g = groupOf(p) || '';
    const sel = parseFdtTasks(p.frostdragon_task);
    const groupSel = `<select class="fdt-edit-select" aria-label="Group" onchange="setFdtPlayerGroup(${Number(p.id)}, this.value)"><option value="">No group</option>${FDT_ALLIANCE_TASKS.map(a => `<option value="${a}" ${g === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`;
    const roleTasks = FDT_TASKS.filter(t => !FDT_ALLIANCE_TASKS.includes(t));
    const picker = `<details class="fdt-task-picker fdt-edit-picker" data-pid="${Number(p.id)}"><summary>Tasks (${sel.filter(t => !FDT_ALLIANCE_TASKS.includes(t)).length})</summary><div class="fdt-task-options">${roleTasks.map(t => `<label><input type="checkbox" ${sel.includes(t) ? 'checked' : ''} onchange="toggleFrostdragonTask(${Number(p.id)}, '${t}', this.checked)"><span>${escapeHtml(t)}</span></label>`).join('')}</div></details>`;
    return `<td class="fdt-edit-cell">${groupSel}${picker}<button type="button" class="fdt-mini-btn fdt-edit-remove" title="Remove from Frostdragon roster" onclick="removeFdtPlayerFromChart(${Number(p.id)})">🗑</button></td>`;
  };
  const playerList = (list, label) => list.length ? `<table class="fdt-task-players${edit ? ' fdt-task-players--edit' : ''}"><thead><tr><th>#</th><th>Nickname</th><th>Alliance</th><th>Game ID</th><th>Group</th><th>Troops Power</th>${edit ? '<th>Edit</th>' : ''}</tr></thead><tbody>${
    list.map((p, i) => { const g = groupOf(p); return `<tr><td>${i + 1}</td><td>${escapeHtml(p.nickname || '-')}${d.isRallyLead(p, label) ? ' <span class="fdt-rally-crown" title="Rally Lead">👑</span>' : ''}</td><td>${escapeHtml(p.alliance || '-')}</td><td>${escapeHtml(p.game_id || '-')}</td><td><span class="fdt-group-dot" style="background:${fdtColorOf(g)}"></span>${escapeHtml(g || '—')}</td><td>${power(p).toLocaleString('en-US')}</td>${edit ? editCell(p) : ''}</tr>`; }).join('')
  }</tbody></table>` : '<div class="fdt-chart-empty">No players assigned.</div>';
  const taskChart = d.taskCounts.map(t => `<details class="fdt-task-detail"><summary>${fdtBarRows([{
      label: t.label, value: t.players.length, color: t.label === 'No role task' ? '#64748b' : '#0ea5e9',
      display: `${t.players.length}`, sub: t.players.length ? fdtCompactPower(t.players.reduce((s, p) => s + power(p), 0)) : ''
    }], maxTask)}</summary>${playerList(t.players, t.label)}</details>`).join('');

  const maxTop = Math.max(1, ...d.top.map(power));
  const topChart = fdtBarRows(d.top.map((p, i) => ({
    label: `${i + 1}. ${p.nickname || '-'}`, value: power(p), color: fdtColorOf(groupOf(p)),
    display: fdtCompactPower(power(p)), sub: p.alliance || ''
  })), maxTop);
  const legend = [...FDT_ALLIANCE_TASKS, 'No group'].map(g => `<span class="fdt-legend-item"><i style="background:${fdtColorOf(g)}"></i>${g}</span>`).join('') + `<span class="fdt-legend-item fdt-legend-crown">👑 ${FDT_RALLY_LEAD_NOTE}</span>`;

  view.innerHTML = `
    <div class="fdt-chart-head">
      <div><h3>${escapeHtml(d.scopeLabel)}</h3>
      <small>${d.scoped.length} combatants · total power ${d.scopedPower.toLocaleString('en-US')}</small></div>
      <div class="fdt-legend">${legend}</div>
    </div>
    <div class="fdt-chart-grid">
      <div class="fdt-chart-card"><h4>Combatants per alliance group</h4><small>Yellow marker = limit of ${FDT_MAX_PER_ALLIANCE} per alliance</small>${countChart}</div>
      <div class="fdt-chart-card"><h4>Total troops power per alliance group</h4>${powerChart}</div>
      <div class="fdt-chart-card fdt-chart-card--wide"><div class="fdt-card-head"><div><h4>Task distribution &amp; players</h4><small>${escapeHtml(d.scopeLabel)} · ${edit ? '<b class="fdt-edit-badge">✏️ Live Edit on — changes save instantly</b>' : 'click a task to see its players'}</small></div><div class="fdt-card-actions">${edit ? '<button type="button" class="fdt-mini-btn fdt-edit-assign" onclick="openAddLegionModal()">+ Assign Player</button>' : ''}<button type="button" class="fdt-mini-btn" onclick="toggleFdtTaskDetails(true)">Expand all</button><button type="button" class="fdt-mini-btn" onclick="toggleFdtTaskDetails(false)">Collapse all</button></div></div>${taskChart}</div>
      <div class="fdt-chart-card fdt-chart-card--wide"><h4>Top 15 players by troops power</h4><small>Color = alliance group</small>${topChart}</div>
    </div>`;
  view.querySelectorAll('.fdt-task-detail').forEach(el => {
    if (openTasks.includes(el.querySelector('.fdt-bar-label')?.textContent)) el.open = true;
  });
  view.querySelectorAll('.fdt-edit-picker').forEach(el => { if (openPickers.includes(el.dataset.pid)) el.open = true; });
  if (scrollBox) scrollBox.scrollTop = scrollTop;
}

// ---- Image (PNG) rendering: drawn directly on a canvas so the result is a clean standalone picture ----
function buildFdtChartCanvas() {
  const d = getFdtChartData();
  // Public viewers (not staff, not a verified player) never see per-player power in the image.
  const showPlayerPower = typeof canViewSensitive !== 'function' || canViewSensitive();
  const showTotals = showPlayerPower || typeof HIDE_SUMMARY_FOR_GUESTS === 'undefined' || !HIDE_SUMMARY_FOR_GUESTS;
  const SCALE = 2, W = 1400, PAD = 36, GAP = 18;
  const FONT = '"Segoe UI", Tahoma, Arial, sans-serif';
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  // Clickable areas (in the 1400px-wide drawing space) used by Live Edit on the Image tab.
  let hits = [];
  const draw = (ctx, H) => {
    hits = [];
    const rr = (x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    const txt = (s, x, y, o = {}) => {
      const { size = 14, weight = '400', color = '#e2e8f0', align = 'left', maxW } = o;
      ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
      let t = String(s);
      if (maxW && ctx.measureText(t).width > maxW) {
        while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
        t += '…';
      }
      ctx.fillText(t, x, y);
    };
    const card = (x, y, w, h, title, sub) => {
      rr(x, y, w, h, 12); ctx.fillStyle = 'rgba(15,23,42,0.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(125,211,252,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      if (title) txt(title, x + 16, y + 24, { size: 16, weight: '700', color: '#f1f5f9' });
      if (sub) txt(sub, x + 16, y + 44, { size: 12, color: '#94a3b8' });
    };
    // Vector crown (no emoji font needed) used to mark the Rally Lead of each Spire.
    const crown = (cx, cy, w = 14) => {
      const h = w * 0.75, t = cy - h / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + h / 2); ctx.lineTo(cx, t + h * 0.25); ctx.lineTo(cx + w * 0.25, t + h * 0.55);
      ctx.lineTo(cx + w * 0.5, t); ctx.lineTo(cx + w * 0.75, t + h * 0.55); ctx.lineTo(cx + w, t + h * 0.25); ctx.lineTo(cx + w, cy + h / 2); ctx.closePath();
      ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1; ctx.stroke();
    };
    const bars = (x, y, w, rows, max, cap) => {
      const lw = Math.round(w * 0.3), vw = 96, bx = x + lw + 10, bw = w - lw - vw - 20;
      rows.forEach((r, i) => {
        const cy = y + i * 30 + 15;
        if (r.id != null) hits.push({ x, y: cy - 15, w, h: 30, id: r.id });
        txt(r.label, x, cy, { size: 13, color: '#cbd5e1', maxW: lw });
        rr(bx, cy - 8, bw, 16, 6); ctx.fillStyle = 'rgba(51,65,85,0.6)'; ctx.fill();
        if (max > 0 && r.value > 0) { rr(bx, cy - 8, Math.max(6, bw * r.value / max), 16, 6); ctx.fillStyle = r.color; ctx.fill(); }
        if (cap) { ctx.fillStyle = '#fbbf24'; ctx.fillRect(bx + bw * Math.min(1, cap / max) - 1, cy - 10, 2, 20); }
        txt(r.display, x + w, cy, { size: 13, weight: '700', align: 'right' });
      });
    };

    if (H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1220'); g.addColorStop(1, '#111827');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    let y = PAD;
    // Header
    txt('FROSTDRAGON TYRANT', PAD, y + 8, { size: 12, weight: '700', color: '#38bdf8' });
    txt('Roster Chart — ' + d.scopeLabel, PAD, y + 38, { size: 30, weight: '700', color: '#e0f2fe' });
    txt(`${d.scoped.length} combatants  ·  ${showTotals ? `total power ${d.scopedPower.toLocaleString('en-US')}  ·  ` : ''}${stamp}`, PAD, y + 70, { size: 14, color: '#94a3b8' });
    let lx = W - PAD;
    ['No group', 'Alliance B', 'Alliance A'].forEach(label => {
      ctx.font = `400 13px ${FONT}`;
      const tw = ctx.measureText(label).width;
      lx -= tw; txt(label, lx, y + 38, { size: 13, color: '#cbd5e1' });
      lx -= 16; ctx.fillStyle = fdtColorOf(label); rr(lx, y + 32, 12, 12, 3); ctx.fill();
      lx -= 18;
    });
    y += 100;

    if (!d.all.length) {
      card(PAD, y, W - 2 * PAD, 80, 'No Battle roster players yet.', 'Assign players to the Frostdragon roster to see the chart.');
      return y + 80 + PAD;
    }

    // Section 1: alliance groups (two cards)
    const cw = (W - 2 * PAD - GAP) / 2;
    const h1 = 62 + d.groupRows.length * 30 + 14;
    const maxCount = Math.max(FDT_MAX_PER_ALLIANCE, ...d.groupRows.map(g => g.count));
    const maxGroupPower = Math.max(1, ...d.groupRows.map(g => g.power));
    card(PAD, y, cw, h1, 'Combatants per alliance group', `Yellow marker = limit of ${FDT_MAX_PER_ALLIANCE} per alliance`);
    bars(PAD + 16, y + 62, cw - 32, d.groupRows.map(g => ({ label: g.label, value: g.count, color: fdtColorOf(g.label), display: `${g.count} / ${FDT_MAX_PER_ALLIANCE}` })), maxCount, FDT_MAX_PER_ALLIANCE);
    if (showTotals) {
      card(PAD + cw + GAP, y, cw, h1, 'Total troops power per alliance group', 'Battle roster');
      bars(PAD + cw + GAP + 16, y + 62, cw - 32, d.groupRows.map(g => ({ label: g.label, value: g.power, color: fdtColorOf(g.label), display: fdtCompactPower(g.power) })), maxGroupPower);
    }
    y += h1 + GAP + 8;

    // Section 2: task cards with players
    txt('Task distribution & players', PAD, y + 10, { size: 20, weight: '700', color: '#e0f2fe' });
    ctx.font = `400 13px ${FONT}`;
    const leadNoteW = ctx.measureText(FDT_RALLY_LEAD_NOTE).width;
    txt(FDT_RALLY_LEAD_NOTE, W - PAD, y + 10, { size: 13, color: '#fcd34d', align: 'right' });
    crown(W - PAD - leadNoteW - 22, y + 10);
    y += 34;
    const tw = (W - 2 * PAD - 2 * GAP) / 3;
    const maxTask = Math.max(1, ...d.taskCounts.map(t => t.players.length));
    // Every player is listed (no cap). Cards are packed into the shortest of 3 columns so long lists don't leave big gaps.
    const cardH = t => 62 + Math.max(1, t.players.length) * 22 + 12;
    const colY = [y, y, y];
    // Place the longest cards first so the three columns end up roughly the same height.
    [...d.taskCounts].sort((a, b) => cardH(b) - cardH(a)).forEach(t => {
      const c = colY.indexOf(Math.min(...colY));
      const x = PAD + c * (tw + GAP), cy0 = colY[c], h = cardH(t), n = t.players.length;
      const total = t.players.reduce((s, p) => s + d.power(p), 0);
      card(x, cy0, tw, h, null);
      txt(t.label, x + 16, cy0 + 22, { size: 15, weight: '700', color: '#f1f5f9', maxW: tw - 130 });
      txt(n ? (showTotals ? `${n}  ·  ${fdtCompactPower(total)}` : `${n}`) : '0', x + tw - 16, cy0 + 22, { size: 13, weight: '700', color: '#7dd3fc', align: 'right' });
      rr(x + 16, cy0 + 38, tw - 32, 6, 3); ctx.fillStyle = 'rgba(51,65,85,0.6)'; ctx.fill();
      if (n) { rr(x + 16, cy0 + 38, Math.max(6, (tw - 32) * n / maxTask), 6, 3); ctx.fillStyle = t.label === 'No role task' ? '#64748b' : '#0ea5e9'; ctx.fill(); }
      let py = cy0 + 62;
      if (!n) txt('No players assigned', x + 16, py + 8, { size: 12, color: '#64748b' });
      t.players.forEach((p, k) => {
        hits.push({ x, y: py - 3, w: tw, h: 22, id: p.id });
        ctx.fillStyle = fdtColorOf(d.groupOf(p)); ctx.beginPath(); ctx.arc(x + 22, py + 8, 4, 0, Math.PI * 2); ctx.fill();
        // Nickname followed by the player's alliance tag, e.g. "ACĒ (IDN)". The nickname is shortened first if the row is tight.
        const tag = p.alliance ? ` (${p.alliance})` : '';
        ctx.font = `400 12px ${FONT}`;
        const tagW = tag ? ctx.measureText(tag).width : 0;
        const lead = d.isRallyLead(p, t.label);
        const off = lead ? 20 : 0;
        const nameMax = tw - 34 - 62 - tagW - off;
        const nameStr = `${k + 1}. ${p.nickname || '-'}`;
        ctx.font = `400 13px ${FONT}`;
        const nameW = Math.min(ctx.measureText(nameStr).width, nameMax);
        if (lead) crown(x + 34, py + 8);
        txt(nameStr, x + 34 + off, py + 8, { size: 13, maxW: nameMax });
        if (tag) txt(tag, x + 34 + off + nameW, py + 8, { size: 12, color: '#7dd3fc' });
        if (showPlayerPower) txt(fdtCompactPower(d.power(p)), x + tw - 16, py + 8, { size: 12, color: '#94a3b8', align: 'right' });
        py += 22;
      });
      colY[c] = cy0 + h + GAP;
    });
    y = Math.max(...colY);

    // Section 3: top players (ranks players by power, so it is hidden from the public)
    y += 6;
    if (showPlayerPower) {
      const h3 = 62 + d.top.length * 30 + 14;
      const maxTop = Math.max(1, ...d.top.map(d.power));
      card(PAD, y, W - 2 * PAD, h3, 'Top 15 players by troops power', 'Red = Alliance A · Blue = Alliance B (A first, then B)');
      bars(PAD + 16, y + 62, W - 2 * PAD - 32, d.top.map((p, i) => ({
        id: p.id, label: `${i + 1}. ${p.nickname || '-'}${p.alliance ? '  (' + p.alliance + ')' : ''}`,
        value: d.power(p), color: fdtColorOf(d.groupOf(p)), display: fdtCompactPower(d.power(p))
      })), maxTop);
      y += h3 + GAP;
    }
    txt('Frostdragon Tyrant roster · generated from the roster tool', PAD, y + 8, { size: 12, color: '#64748b' });
    return y + 30 + PAD / 2;
  };

  const measure = document.createElement('canvas'); measure.width = W; measure.height = 10;
  const H = Math.ceil(draw(measure.getContext('2d'), 0));
  const canvas = document.createElement('canvas');
  const scale = Math.min(SCALE, 15000 / H); // stay under browser canvas size limits on very long rosters
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, H);
  fdtImageHits = { W, H, list: hits };
  return canvas;
}
function showFdtChartImage() {
  const img = document.getElementById('fdt-chart-image');
  if (!img) return;
  try {
    fdtChartImageUrl = buildFdtChartCanvas().toDataURL('image/png');
    img.src = fdtChartImageUrl;
    applyFdtZoom();
    refreshFdtImageEditor();
  } catch (e) {
    console.warn('FDT chart image failed', e);
    if (typeof showToast === 'function') showToast('Unable to generate chart image.', 'error');
  }
}
// ---- Share link: a URL that opens a full-screen, freshly rendered image of the roster chart ----
// Link format: <site>/?fdt=image[&alliance=Alliance%20A]. The page loads the live roster (public read, same as the
// roster page), renders the PNG on a canvas and shows only that image. Opening the link again = newest data.
function buildFdtShareUrl() {
  const u = new URL(location.href);
  u.search = ''; u.hash = '';
  u.searchParams.set('fdt', 'image');
  if (fdtAllianceFilter) u.searchParams.set('alliance', fdtAllianceFilter);
  return u.toString();
}
async function fdtCopyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch (e) { return false; }
}
async function shareFdtChartLink() {
  const url = buildFdtShareUrl();
  const title = 'FDT Roster Chart — ' + (fdtAllianceFilter || 'All Alliances');
  if (navigator.share) {
    try { await navigator.share({ title, text: title, url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* otherwise fall back to copy */ }
  }
  if (await fdtCopyText(url)) showToast('Share link copied.', 'success');
  else window.prompt('Copy this link:', url);
}
async function copyFdtChartLink() {
  const url = buildFdtShareUrl();
  if (await fdtCopyText(url)) showToast('Share link copied.', 'success');
  else window.prompt('Copy this link:', url);
}
async function openFdtSharedImage(alliance) {
  const old = document.getElementById('fdt-shared-image'); if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'fdt-shared-image';
  wrap.innerHTML = `<div class="fdt-shared-bar"><strong>🐉 FDT Roster Chart</strong>
    <span class="fdt-shared-actions">
      <button type="button" id="fdt-shared-out" aria-label="Zoom out">−</button>
      <button type="button" id="fdt-shared-level">100%</button>
      <button type="button" id="fdt-shared-in" aria-label="Zoom in">+</button>
      <button type="button" id="fdt-shared-refresh">⟳ Refresh</button>
      <button type="button" id="fdt-shared-dl">⬇ PNG</button>
      <button type="button" id="fdt-shared-site">Open site</button>
    </span></div>
    <div class="fdt-shared-body" id="fdt-shared-body"><div class="fdt-shared-msg" id="fdt-shared-msg">Loading roster chart…</div></div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('fdt-shared-open');
  let zoom = 1, imgUrl = '';
  const body = wrap.querySelector('#fdt-shared-body');
  const applyZoom = () => {
    const img = body.querySelector('img'); if (img) img.style.width = (zoom * 100) + '%';
    wrap.querySelector('#fdt-shared-level').textContent = Math.round(zoom * 100) + '%';
  };
  const setZoom = z => { zoom = Math.min(4, Math.max(0.5, Math.round(z * 100) / 100)); applyZoom(); };
  const load = async () => {
    body.innerHTML = '<div class="fdt-shared-msg">Loading roster chart…</div>';
    try {
      const client = getSupabase(); if (!client) throw new Error('Supabase not available');
      if (typeof authReady !== 'undefined') await authReady; // session restore decides whether power is shown
      const { data, error } = await client.from('troops_power').select('*').eq('frostdragon_role', 'Battle');
      if (error) throw error;
      loadedTroopsData = data || [];
      fdtAllianceFilter = FDT_ALLIANCE_TASKS.includes(alliance) ? alliance : '';
      imgUrl = buildFdtChartCanvas().toDataURL('image/png');
      body.innerHTML = '<img alt="Frostdragon roster chart">';
      body.querySelector('img').src = imgUrl;
      applyZoom();
    } catch (e) {
      console.warn('FDT shared image failed', e);
      body.innerHTML = '<div class="fdt-shared-msg">Unable to load the roster chart. Please try again.</div>';
    }
  };
  wrap.querySelector('#fdt-shared-out').onclick = () => setZoom(zoom - 0.25);
  wrap.querySelector('#fdt-shared-in').onclick = () => setZoom(zoom + 0.25);
  wrap.querySelector('#fdt-shared-level').onclick = () => setZoom(1);
  wrap.querySelector('#fdt-shared-refresh').onclick = load;
  wrap.querySelector('#fdt-shared-dl').onclick = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl; a.download = `FDT_Roster_Chart_${(FDT_ALLIANCE_TASKS.includes(alliance) ? alliance : 'All_Alliances').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  wrap.querySelector('#fdt-shared-site').onclick = () => { location.href = location.origin + location.pathname; };
  await load();
}
document.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(location.search);
  if (q.get('fdt') === 'image') openFdtSharedImage(q.get('alliance') || '');
});
function downloadFdtChartImage() {
  try {
    const url = buildFdtChartCanvas().toDataURL('image/png');
    const scope = (fdtAllianceFilter || 'All_Alliances').replace(/\s+/g, '_');
    const link = document.createElement('a');
    link.href = url;
    link.download = `FDT_Roster_Chart_${scope}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    if (typeof showToast === 'function') showToast('Chart image downloaded.', 'success');
  } catch (e) {
    console.warn('FDT chart download failed', e);
    if (typeof showToast === 'function') showToast('Unable to download chart image.', 'error');
  }
}

// Re-arrange Dragonite Collectors: the lowest-power Battle players of each alliance group (A / B / none)
// become collectors; everyone else loses the task. Collectors keep their other tasks and, if they have
// no other role, get Capital Reinforcer so they multitask until Dragonite opens (+75 min).
function planFdtDragoniteCollectors(perGroup) {
  const battle = (typeof loadedTroopsData !== 'undefined' ? loadedTroopsData : []).filter(p => p.frostdragon_role === 'Battle');
  const power = p => Number(p.troops_power) || 0;
  const groupKey = p => FDT_ALLIANCE_TASKS.find(g => parseFdtTasks(p.frostdragon_task).includes(g)) || 'No group';
  const picked = new Set();
  [...FDT_ALLIANCE_TASKS, 'No group'].forEach(g => {
    battle.filter(p => groupKey(p) === g && !parseFdtTasks(p.frostdragon_task).some(t => FDT_DRAGONITE_EXCLUDED.includes(t)))
      .sort((a, b) => power(a) - power(b))
      .slice(0, perGroup)
      .forEach(p => picked.add(Number(p.id)));
  });
  const changes = [];
  battle.forEach(p => {
    const before = parseFdtTasks(p.frostdragon_task);
    const tasks = new Set(before);
    if (picked.has(Number(p.id))) {
      tasks.add(FDT_DRAGONITE_TASK);
      const hasOtherRole = [...tasks].some(t => !FDT_ALLIANCE_TASKS.includes(t) && t !== FDT_DRAGONITE_TASK);
      if (!hasOtherRole) tasks.add(FDT_PRE_DRAGONITE_TASK);
    } else tasks.delete(FDT_DRAGONITE_TASK);
    const after = FDT_TASKS.filter(t => tasks.has(t));
    if (before.slice().sort().join() !== after.slice().sort().join()) changes.push({ player: p, after });
  });
  return { picked, changes, total: picked.size };
}
async function autoAssignDragoniteCollectors() {
  if (!isAdmin) { showToast('Staff access required.', 'warning'); return; }
  if (fdtSettings.locked) { showToast('Frostdragon roster is locked.', 'warning'); return; }
  const raw = prompt(`Dragonite Collectors per alliance group (lowest power first). Recommended 5–${FDT_DRAGONITE_SOFT_MAX_PER_GROUP}:`, String(FDT_DRAGONITE_DEFAULT_PER_GROUP));
  if (raw === null) return;
  const perGroup = parseInt(raw, 10);
  if (!Number.isFinite(perGroup) || perGroup < 0 || perGroup > FDT_MAX_PER_ALLIANCE) { showToast('Enter a number between 0 and ' + FDT_MAX_PER_ALLIANCE + '.', 'warning'); return; }
  const plan = planFdtDragoniteCollectors(perGroup);
  if (!plan.changes.length) { showToast('Dragonite Collectors are already arranged this way.', 'info'); return; }
  if (!confirm(`Re-arrange Dragonite Collectors?\n\n• ${plan.total} lowest-power players become collectors (multitask until Dragonite opens, default duty: ${FDT_PRE_DRAGONITE_TASK}).\n• ${plan.changes.length} players will be updated.\n• Everyone else loses the Dragonite Collector task.`)) return;
  const results = await Promise.all(plan.changes.map(async ({ player, after }) => {
    const value = after.length ? after.join(', ') : null;
    const { error } = await getSupabase().from('troops_power').update({ frostdragon_task: value }).eq('id', player.id);
    if (!error) player.frostdragon_task = value;
    return !error;
  }));
  const failed = results.filter(ok => !ok).length;
  showToast(failed ? `${failed} updates failed; the rest were saved.` : `Dragonite Collectors updated (${plan.total} players).`, failed ? 'error' : 'success');
  if (typeof fetchData === 'function') fetchData();
  if (typeof renderTable === 'function') renderTable();
  refreshFdtSummary();
}
async function toggleFrostdragonTask(playerId, task, checked) {
  if (!FDT_TASKS.includes(task)) return;
  const player = loadedTroopsData.find(x => Number(x.id) === Number(playerId));
  if (!player) return;
  const tasks = new Set(parseFdtTasks(player.frostdragon_task));
  if (checked) {
    // A player can only belong to one alliance group (A / B).
    if (FDT_ALLIANCE_TASKS.includes(task)) FDT_ALLIANCE_TASKS.forEach(t => tasks.delete(t));
    tasks.add(task);
  } else tasks.delete(task);
  await updateFrostdragonTask(playerId, [...tasks]);
}
async function loadFdtSettings() {
  const client = getSupabase(); if (!client) return;
  try {
    const {data,error}=await client.from('footer_settings').select('frostdragon_battlefield_open_utc,frostdragon_roster_locked,frostdragon_roster_deadline_utc').eq('id','main').single();
    if(error) throw error;
    fdtSettings={open:data.frostdragon_battlefield_open_utc||null,deadline:data.frostdragon_roster_deadline_utc||null,locked:!!data.frostdragon_roster_locked};
    const open=document.getElementById('fdt-open-time'), deadline=document.getElementById('fdt-deadline');
    if(open) open.value=fdtSettings.open?new Date(fdtSettings.open).toISOString().slice(0,16):'';
    if(deadline) deadline.value=fdtSettings.deadline?new Date(fdtSettings.deadline).toISOString().slice(0,16):'';
    const lock=document.getElementById('fdt-lock-btn'); if(lock) lock.textContent=fdtSettings.locked?'Unlock roster':'Lock roster';
    updateFdtClock();
  } catch(e) { console.warn('FDT settings not loaded; run supabase_frostdragon_column.sql',e); }
  loadFdtChecklist();
}
// ---- Admin phase checklist: stored on the server (footer_settings.frostdragon_checklist, jsonb) ----
// Shared by all admins/devices. Before this, the checkboxes were plain HTML and reset on every reload.
let fdtChecklist = {};
// Collapsed by default every time the page opens; tap the header to expand/collapse.
function toggleFdtChecklist(force) {
  const body = document.getElementById('fdt-checklist-body'), btn = document.getElementById('fdt-checklist-toggle');
  if (!body || !btn) return;
  const open = typeof force === 'boolean' ? force : body.classList.contains('hidden');
  body.classList.toggle('hidden', !open);
  btn.setAttribute('aria-expanded', String(open));
  btn.classList.toggle('is-open', open);
}
let fdtChecklistSaving = 0;
function canEditFdtChecklist() {
  return (typeof isAdmin !== 'undefined' && !!isAdmin) || (typeof canOpenPresidentPanel === 'function' && canOpenPresidentPanel());
}
function renderFdtChecklist() {
  const root = document.getElementById('fdt-checklist'); if (!root) return;
  const editable = canEditFdtChecklist();
  root.querySelectorAll('input[type=checkbox][data-chk]').forEach(cb => {
    cb.checked = !!fdtChecklist[cb.dataset.chk];
    cb.disabled = !editable;
  });
  const done = root.querySelectorAll('input[data-chk]:checked').length, total = root.querySelectorAll('input[data-chk]').length;
  const st = document.getElementById('fdt-checklist-status');
  if (st) st.textContent = `(${done}/${total} done${editable ? '' : ' · view only'})`;
}
async function loadFdtChecklist() {
  const client = getSupabase(); if (!client || fdtChecklistSaving) return;
  try {
    const { data, error } = await client.from('footer_settings').select('frostdragon_checklist').eq('id', 'main').single();
    if (error) throw error;
    const v = data?.frostdragon_checklist;
    fdtChecklist = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    renderFdtChecklist();
  } catch (e) { console.warn('FDT checklist not loaded; run supabase_frostdragon_checklist.sql', e); renderFdtChecklist(); }
}
async function onFdtChecklistChange(cb) {
  if (!canEditFdtChecklist()) { renderFdtChecklist(); return; }
  const key = cb.dataset.chk, previous = !!fdtChecklist[key];
  fdtChecklistSaving++;
  try {
    // Re-read the latest server copy first so two admins ticking different items don't overwrite each other.
    let latest = fdtChecklist;
    const cur = await getSupabase().from('footer_settings').select('frostdragon_checklist').eq('id', 'main').single();
    if (!cur.error && cur.data?.frostdragon_checklist && typeof cur.data.frostdragon_checklist === 'object') latest = cur.data.frostdragon_checklist;
    const next = { ...latest, [key]: cb.checked };
    const { data, error } = await getSupabase().from('footer_settings').update({ frostdragon_checklist: next }).eq('id', 'main').select('frostdragon_checklist');
    if (error) throw error;
    if (!data || !data.length) throw new Error('No permission to update (check footer_settings RLS policy).');
    fdtChecklist = next;
    showToast('Checklist saved.', 'success');
  } catch (e) {
    fdtChecklist[key] = previous;
    showToast('Unable to save checklist: ' + (e.message || e) + ' — make sure supabase_frostdragon_checklist.sql has been run.', 'error');
  } finally {
    fdtChecklistSaving--;
    renderFdtChecklist();
  }
}
document.addEventListener('change', e => {
  const cb = e.target; if (cb?.matches?.('#fdt-checklist input[type=checkbox][data-chk]')) onFdtChecklistChange(cb);
});
async function saveFdtSettings() {
  if(!canOpenPresidentPanel()) { showToast('Full-access staff only.', 'warning'); return; }
  const open=document.getElementById('fdt-open-time').value, deadline=document.getElementById('fdt-deadline').value;
  const payload={frostdragon_battlefield_open_utc:open?new Date(open+'Z').toISOString():null,frostdragon_roster_deadline_utc:deadline?new Date(deadline+'Z').toISOString():null};
  const {error}=await getSupabase().from('footer_settings').update(payload).eq('id','main');
  if(error){showToast('Schedule save failed: '+error.message,'error');return;}
  await loadFdtSettings(); showToast('Frostdragon schedule saved (UTC).','success');
}
async function toggleFdtLock() {
  if(!canOpenPresidentPanel()) return;
  const next=!fdtSettings.locked;
  if(next && !confirm('Lock the Frostdragon roster? Staff will not be able to change task assignments until unlocked.')) return;
  const {error}=await getSupabase().from('footer_settings').update({frostdragon_roster_locked:next}).eq('id','main');
  if(error){showToast('Roster lock update failed: '+error.message,'error');return;}
  fdtSettings.locked=next; await loadFdtSettings(); await refreshFdtSummary(); renderTable();
  showToast(next?'Frostdragon roster locked.':'Frostdragon roster unlocked.','success');
}
function updateFdtClock() {
  updateFdtStatus();
  const el=document.getElementById('fdt-countdown'); if(!el)return;
  if(!fdtSettings.open){el.textContent='Battlefield schedule not set.';return;}
  const now=Date.now(), open=new Date(fdtSettings.open).getTime();
  if(!fdtSettings.locked && fdtSettings.deadline && now>=new Date(fdtSettings.deadline).getTime() && canOpenPresidentPanel()) {
    toggleFdtLock();
  }
  const MIN=60000;
  // Official timeline: battlefield 7h; Capital opens +1h (6h contest); Dragonite gathering
  // appears 15 min after the Capital opens; Rearmament follows the battle for 55h.
  const phases=[['Battlefield opens',0],['Capital opens / Frostdragon Escorts appear',60],['Dragonite gathering starts',75],['Battle ends / Rearmament starts',420],['Rearmament ends',420+55*60]];
  const capital=open+60*MIN, gathering=open+75*MIN, battleEnd=open+420*MIN;
  const upcoming=phases.map(([name,mins])=>({name,time:open+mins*MIN})).find(x=>x.time>now);
  const fmt=t=>new Date(t).toLocaleString('en-GB',{timeZone:'UTC',hour12:false})+' UTC';
  const countdown=t=>{let s=Math.max(0,Math.floor((t-now)/1000));return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;};
  let text=upcoming?`${upcoming.name}: ${fmt(upcoming.time)} · in ${countdown(upcoming.time)}`:`Rearmament ended: ${fmt(open+(420+55*60)*MIN)}.`;
  if(now<battleEnd){
    // Dragonite gathering: first at +75 min, then every 30 min. Frostdragon Escorts: first at +60 min, then every 30 min.
    const nextCycle=(first)=>now<first?first:first+(Math.floor((now-first)/(30*MIN))+1)*30*MIN;
    const nextEscort=nextCycle(capital), nextDragonite=nextCycle(gathering);
    if(nextEscort<battleEnd) text+=`<br>${now<capital?'First Frostdragon Escorts':'Next Frostdragon Escorts refresh'}: ${fmt(nextEscort)} · in ${countdown(nextEscort)}`;
    if(nextDragonite<battleEnd) text+=`<br>${now<gathering?'First Dragonite gathering':'Next Dragonite refresh'}: ${fmt(nextDragonite)} · in ${countdown(nextDragonite)}`;
    if(now<capital) text+=`<br>Capital Battle: ${fmt(capital)} – ${fmt(battleEnd)} (6 hours)`;
    text+=`<br><small>Spires alternate 30 min vulnerable / 30 min protected — confirm the exact cycle start in-game.</small>`;
  } else if(now<battleEnd+55*60*MIN){
    text+=`<br>Rearmament active: +500% Healing Speed, -30% Healing Costs (participating States).`;
  }
  el.innerHTML=text;
}
async function refreshFdtSummary() {
  const el=document.getElementById('fdt-summary'); if(!el||!getSupabase())return;
  try{
    const {data,error}=await getSupabase().from('troops_power').select('alliance,nickname,troops_power,frostdragon_role,frostdragon_task');
    if(error)throw error;
    const players=(data||[]).filter(p=>p.frostdragon_role==='Battle');
    const alliances=[...new Set((data||[]).map(p=>p.alliance).filter(Boolean))].slice(0,5);
    const tasks=Object.fromEntries(FDT_TASKS.map(t=>[t,players.filter(p=>parseFdtTasks(p.frostdragon_task).includes(t)).length]));
    const tyrants=tasks['Tyrant Candidate'], captains=tasks['Rally Captain'];
    const cards=[`Roster: ${players.length}`, `Total power: ${players.reduce((s,p)=>s+(Number(p.troops_power)||0),0).toLocaleString('en-US')}`, ...alliances.map(a=>`${a}: ${players.filter(p=>p.alliance===a).length} / ${FDT_MAX_PER_ALLIANCE}`), ...FDT_TASKS.map(t=>`${t}: ${tasks[t]}`)];
    el.innerHTML=cards.map(t=>`<div style="padding:10px;border-radius:8px;background:rgba(15,23,42,.75);border:1px solid #334155">${escapeHtml(t)}</div>`).join('');
    let warnings=[];
    if(tyrants>1)warnings.push(`⚠ ${tyrants} Tyrant Candidates assigned; keep to one.`);
    if(captains>0&&tyrants===0)warnings.push('⚠ No Tyrant Candidate assigned yet. Only the rally captain earns Capital occupation time.');
    FDT_ALLIANCE_TASKS.forEach(t=>{if(tasks[t]>FDT_MAX_PER_ALLIANCE)warnings.push(`⚠ ${t} has ${tasks[t]} combatants; an alliance can dispatch at most ${FDT_MAX_PER_ALLIANCE}.`);});
    FDT_ALLIANCE_TASKS.forEach(g=>{const n=players.filter(p=>{const t=parseFdtTasks(p.frostdragon_task);return t.includes(g)&&t.includes(FDT_DRAGONITE_TASK);}).length;if(n>FDT_DRAGONITE_SOFT_MAX_PER_GROUP)warnings.push(`⚠ ${g} has ${n} Dragonite Collectors; ${FDT_DRAGONITE_SOFT_MAX_PER_GROUP} or fewer is enough. Use "Auto-assign Dragonite" to re-balance.`);});
    players.forEach(p=>{if(parseFdtTasks(p.frostdragon_task).filter(t=>FDT_ALLIANCE_TASKS.includes(t)).length>1)warnings.push(`⚠ ${p.nickname} is in more than one alliance group.`);});
    alliances.forEach(a=>{const n=players.filter(p=>p.alliance===a).length;if(n>FDT_MAX_PER_ALLIANCE)warnings.push(`⚠ ${a} has ${n} combatants; an alliance can dispatch at most ${FDT_MAX_PER_ALLIANCE}.`);});
    if(warnings.length)el.insertAdjacentHTML('afterbegin',`<div style="grid-column:1/-1;padding:10px;color:#fecaca;background:#7f1d1d55;border-radius:8px">${warnings.map(escapeHtml).join('<br>')}</div>`);
  }catch(e){console.warn('FDT summary failed',e);}
}
function toggleFdtGuide(forceOpen) {
  const modal = document.getElementById('fdt-guide-modal');
  if (!modal) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : modal.classList.contains('hidden');
  modal.classList.toggle('hidden', !shouldOpen);
  document.body.classList.toggle('fdt-guide-open', shouldOpen);
  if (shouldOpen) {
    const closeButton = modal.querySelector('.close-modal');
    closeButton?.focus();
  }
}
function toggleFdtStatus(forceOpen) {
  const modal = document.getElementById('fdt-status-modal');
  if (!modal) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : modal.classList.contains('hidden');
  modal.classList.toggle('hidden', !shouldOpen);
  document.body.classList.toggle('fdt-guide-open', shouldOpen);
  if (shouldOpen) {
    updateFdtStatus();
    modal.querySelector('.close-modal')?.focus();
  }
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { toggleFdtGuide(false); toggleFdtStatus(false); toggleFdtChartView(false); }
});
document.addEventListener('DOMContentLoaded',()=>{
  if(fdtClockTimer)clearInterval(fdtClockTimer);
  fdtClockTimer=setInterval(updateFdtClock,1000);
  setInterval(()=>{if(typeof getBattleTheme==='function'&&getBattleTheme()==='frostdragon'){loadFdtSettings();refreshFdtSummary();}},60000);
});

// Show/hide the FDT UI based on theme + current page.
// - "FDT Guide" button on the main menu: Frostdragon theme only.
// - Command Center (#fdt-tools) on the roster page: Frostdragon theme only.
function syncFdtUi() {
  const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
  document.getElementById('fdt-guide-menu-btn')?.classList.toggle('hidden', !frost);
  const onRoster = typeof viewMode !== 'undefined' && viewMode === 'LEGION'
    && !document.getElementById('troops-table-page')?.classList.contains('hidden');
  updateFdtAllianceFilterUi();
  const tools = document.getElementById('fdt-tools');
  const showTools = frost && onRoster;
  if (tools) tools.classList.toggle('hidden', !showTools);
  const admin = document.getElementById('fdt-admin-controls');
  if (admin) admin.classList.toggle('hidden', !(typeof canOpenPresidentPanel === 'function' && canOpenPresidentPanel()));
  if (showTools) { loadFdtSettings(); refreshFdtSummary(); }
  if (!showTools) toggleFdtStatus(false);
  if (!frost) toggleFdtGuide(false);
}

// Live status board: what is happening right now, derived from the battlefield open time.
// Official phases are back-to-back: Sign-up 48h, Dispatch 48h, Eve of Battle 59h, Battlefield 7h, Rearmament 55h.
function updateFdtStatus() {
  const el = document.getElementById('fdt-status'); if (!el) return;
  if (document.getElementById('fdt-status-modal')?.classList.contains('hidden')) return; // render only while open
  const MIN = 60000, HOUR = 60 * MIN;
  const chip = (label, state, detail) => {
    const colors = { active: ['#22c55e', 'rgba(34,197,94,.14)'], soon: ['#f59e0b', 'rgba(245,158,11,.12)'], idle: ['#64748b', 'rgba(15,23,42,.75)'], locked: ['#ef4444', 'rgba(239,68,68,.12)'] };
    const [border, bg] = colors[state] || colors.idle;
    const dot = { active: '🟢', soon: '🟡', idle: '⚪', locked: '🔴' }[state] || '⚪';
    return `<div style="padding:10px;border-radius:8px;background:${bg};border:1px solid ${border}"><div style="font-size:.72rem;opacity:.75;text-transform:uppercase;letter-spacing:.04em">${label}</div><div style="font-weight:700;margin-top:2px">${dot} ${detail}</div></div>`;
  };
  const rosterChip = chip('Roster', fdtSettings.locked ? 'locked' : 'active', fdtSettings.locked ? 'Locked' : 'Open for changes');
  if (!fdtSettings.open) {
    el.innerHTML = chip('Event phase', 'idle', 'Schedule not set') + rosterChip;
    return;
  }
  const now = Date.now(), open = new Date(fdtSettings.open).getTime();
  const dur = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + 'd ' : '') + h + 'h ' + m + 'm'; };
  const capital = open + HOUR, gathering = open + 75 * MIN, battleEnd = open + 7 * HOUR, rearmEnd = battleEnd + 55 * HOUR;
  const phases = [
    ['Alliance Sign-up', open - 155 * HOUR, open - 107 * HOUR],
    ['Combatant Dispatch', open - 107 * HOUR, open - 59 * HOUR],
    ['Eve of Battle', open - 59 * HOUR, open],
    ['Battlefield', open, battleEnd],
    ['Rearmament', battleEnd, rearmEnd]
  ];
  const cur = phases.find(([, s, e]) => now >= s && now < e);
  const chips = [];
  if (cur) chips.push(chip('Event phase', 'active', `${cur[0]} · ends in ${dur(cur[2] - now)}`));
  else if (now < phases[0][1]) chips.push(chip('Event phase', 'soon', `Sign-up starts in ${dur(phases[0][1] - now)}`));
  else chips.push(chip('Event phase', 'idle', 'Event finished'));

  const inBattle = now >= open && now < battleEnd;
  if (now < open) {
    chips.push(chip('Battlefield', 'soon', `Opens in ${dur(open - now)}`));
  } else if (inBattle) {
    chips.push(chip('Battlefield', 'active', `Open · closes in ${dur(battleEnd - now)}`));
  } else {
    chips.push(chip('Battlefield', 'idle', 'Closed'));
  }

  if (now < capital) chips.push(chip('Frostdragon Capital', 'soon', now < open ? 'Locked · opens 1h after battlefield' : `Locked · opens in ${dur(capital - now)}`));
  else if (inBattle) chips.push(chip('Frostdragon Capital', 'active', `Open for battle · ends in ${dur(battleEnd - now)}`));
  else chips.push(chip('Frostdragon Capital', 'idle', 'Closed'));

  const cycle = (first, name) => {
    if (now < first) return chip(name, 'soon', now < open ? 'Not started' : `Starts in ${dur(first - now)}`);
    if (inBattle) { const next = first + (Math.floor((now - first) / (30 * MIN)) + 1) * 30 * MIN; return chip(name, 'active', `Active · refresh in ${dur(Math.min(next, battleEnd) - now)}`); }
    return chip(name, 'idle', 'Ended');
  };
  chips.push(cycle(capital, 'Frostdragon Escorts'));
  chips.push(cycle(gathering, 'Dragonite gathering'));

  if (inBattle && now >= capital) chips.push(chip('Spires', 'active', 'In play · 30 min vulnerable / 30 min protected'));
  else chips.push(chip('Spires', now < capital ? 'soon' : 'idle', now < capital ? 'Not in play yet' : 'Closed'));

  if (now >= battleEnd && now < rearmEnd) chips.push(chip('Rearmament bonus', 'active', `+500% Healing Speed, -30% Healing Cost · ${dur(rearmEnd - now)} left`));
  else if (now < battleEnd) chips.push(chip('Rearmament bonus', 'idle', 'Starts when the battle ends'));
  else chips.push(chip('Rearmament bonus', 'idle', 'Ended'));

  if (fdtSettings.deadline) {
    const dl = new Date(fdtSettings.deadline).getTime();
    chips.push(chip('Roster deadline', now < dl ? 'soon' : 'idle', now < dl ? `In ${dur(dl - now)}` : 'Passed'));
  }
  chips.push(rosterChip);
  el.innerHTML = chips.join('');
}
