// Frostdragon Tyrant tools: task assignments, roster summary, schedule and lock.
const FDT_TASKS = ['Rally Captain','Tyrant Candidate','Capital Reinforcer','Spire Life','Spire Shield','Spire Lethality','Spire Attack','Dragonite Collector','Capital Defense'];
// Stored as a comma-separated string in the existing text column. This remains
// backward-compatible with records that only have one task assigned.
function parseFdtTasks(value) {
  if (Array.isArray(value)) return value.filter(t => FDT_TASKS.includes(t));
  return String(value || '').split(',').map(t => t.trim()).filter(t => FDT_TASKS.includes(t));
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
  const el=document.getElementById('fdt-countdown'); if(!el)return;
  if(!fdtSettings.open){el.textContent='Battlefield schedule not set.';return;}
  const now=Date.now(), open=new Date(fdtSettings.open).getTime();
  if(!fdtSettings.locked && fdtSettings.deadline && now>=new Date(fdtSettings.deadline).getTime() && canOpenPresidentPanel()) {
    toggleFdtLock();
  }
  const phases=[['Battlefield opens',0],['Capital opens',60],['Dragonite gathering starts',75]];
  const gathering=open+75*60000;
  const upcoming=phases.map(([name,mins])=>({name,time:open+mins*60000})).find(x=>x.time>now);
  const fmt=t=>new Date(t).toLocaleString('en-GB',{timeZone:'UTC',hour12:false})+' UTC';
  const countdown=t=>{let s=Math.max(0,Math.floor((t-now)/1000));return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;};
  let text=upcoming?`${upcoming.name}: ${fmt(upcoming.time)} · in ${countdown(upcoming.time)}`:`Battlefield opened: ${fmt(open)}.`;
  if(now>=gathering){const next=gathering+(Math.floor((now-gathering)/1800000)+1)*1800000;text+=`<br>Next Dragonite refresh / Spire rotation: ${fmt(next)} · in ${countdown(next)}`;}
  else text+=`<br>Dragonite gathering and first rotation: ${fmt(gathering)} · in ${countdown(gathering)}`;
  text+=`<br>Rearmament: after battle ends; configure/confirm the end time in-game.`;
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
    const cards=[`Roster: ${players.length} / 500`, `Total power: ${players.reduce((s,p)=>s+(Number(p.troops_power)||0),0).toLocaleString('en-US')}`, ...alliances.map(a=>`${a}: ${players.filter(p=>p.alliance===a).length} / 100`), ...FDT_TASKS.map(t=>`${t}: ${tasks[t]}`)];
    el.innerHTML=cards.map(t=>`<div style="padding:10px;border-radius:8px;background:rgba(15,23,42,.75);border:1px solid #334155">${escapeHtml(t)}</div>`).join('');
    let warnings=[];
    if(tyrants>1)warnings.push(`⚠ ${tyrants} Tyrant Candidates assigned; keep to one.`);
    if(captains>5)warnings.push(`⚠ ${captains} Rally Captains assigned; this exceeds the suggested planning limit of five. Review assignments.`);
    if(players.length>500)warnings.push('⚠ More than 500 players assigned; expected capacity is 100 per alliance across five alliances.');
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
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') toggleFdtGuide(false);
});
document.addEventListener('DOMContentLoaded',()=>{
  if(fdtClockTimer)clearInterval(fdtClockTimer);
  fdtClockTimer=setInterval(updateFdtClock,1000);
  setInterval(()=>{if(typeof getBattleTheme==='function'&&getBattleTheme()==='frostdragon'){loadFdtSettings();refreshFdtSummary();}},60000);
});
