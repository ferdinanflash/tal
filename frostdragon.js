// Frostdragon Tyrant tools: task assignments, roster summary, schedule and lock.
const FDT_TASKS = ['Rally Captain','Tyrant Candidate','Capital Reinforcer','Spire Life','Spire Shield','Spire Dragonbane','Spire Blade','Dragonite Collector','Capital Defense'];
// Official limit: an eligible alliance can dispatch up to 60 combatants (Century Games Help Center).
const FDT_MAX_PER_ALLIANCE = 60;
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
  return tasks.length ? tasks.map(t => `<span class="fdt-task-chip">${escapeHtml(t)}</span>`).join(' ') : '<span class="fdt-task-empty">—</span>';
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
  refreshFdtSummary();
}
async function toggleFrostdragonTask(playerId, task, checked) {
  if (!FDT_TASKS.includes(task)) return;
  const player = loadedTroopsData.find(x => Number(x.id) === Number(playerId));
  if (!player) return;
  const tasks = new Set(parseFdtTasks(player.frostdragon_task));
  if (checked) tasks.add(task); else tasks.delete(task);
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
}
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
  if (event.key === 'Escape') { toggleFdtGuide(false); toggleFdtStatus(false); }
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
