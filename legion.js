// ================= LEGION MANAGEMENT FEATURES (PRESIDENT) =================
// Candidates loaded when the Assign modal opens; the alliance / search
// controls filter this list client-side without re-querying Supabase.
let legionAssignCandidates = [];

async function openAddLegionModal() {
    if (!canManageLegion(currentSelection)) {
        showToast("You don't have permission to manage this legion's roster.", "warning");
        return;
    }
    const client = getSupabase();
    if (!client) return;

    document.getElementById('legion-assign-target-label').innerText = currentSelection;

    const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
    let availableQuery = client.from('troops_power').select('*');
    availableQuery = frost
        // Frostdragon roster is tracked via frostdragon_role, independent of
        // legion/legion_role — a player already in a Tundra legion can still
        // be added to the Frostdragon roster, and vice versa.
        ? availableQuery.is('frostdragon_role', null)
        : availableQuery.or(`legion.is.null,legion.neq.${currentSelection}`);

    const { data, error } = await availableQuery.order('troops_power', { ascending: false });

    if (error) {
        showToast("Failed to load players list", "error");
        return;
    }
    legionAssignCandidates = data || [];

    // Alliance category dropdown
    const allianceEl = document.getElementById('legion-assign-alliance');
    const presentAlliances = ALL_ALLIANCES.filter(a => legionAssignCandidates.some(p => p.alliance === a));
    allianceEl.innerHTML = `<option value="">All Alliances (${legionAssignCandidates.length})</option>` +
        presentAlliances.map(a => `<option value="${a}">${a} (${legionAssignCandidates.filter(p => p.alliance === a).length})</option>`).join('');

    document.getElementById('legion-assign-search').value = '';

    // Task picker (Frostdragon only: tasks are stored in frostdragon_task)
    const taskGroup = document.getElementById('legion-assign-task-group');
    if (frost && typeof FDT_TASKS !== 'undefined') {
        document.getElementById('legion-assign-task-options').innerHTML = FDT_TASKS.map(t =>
            `<label class="legion-assign-task-chip"><input type="checkbox" value="${escapeHtml(t)}" onchange="onLegionAssignTaskToggle(this)"><span>${escapeHtml(t)}</span></label>`
        ).join('');
        taskGroup.classList.remove('hidden');
    } else {
        taskGroup.classList.add('hidden');
    }

    filterLegionAssignPlayers();
    document.getElementById('legion-assign-modal').classList.remove('hidden');
    document.getElementById('legion-assign-search').focus();
}

// Re-render the player dropdown from the alliance + search filters.
function filterLegionAssignPlayers() {
    const alliance = document.getElementById('legion-assign-alliance').value;
    const q = document.getElementById('legion-assign-search').value.trim().toLowerCase();
    const selectEl = document.getElementById('select-legion-player');
    const previous = selectEl.value;

    const matches = legionAssignCandidates.filter(p => {
        if (alliance && p.alliance !== alliance) return false;
        if (!q) return true;
        return String(p.nickname || '').toLowerCase().includes(q)
            || String(p.game_id || '').toLowerCase().includes(q);
    });

    selectEl.innerHTML = "";
    if (matches.length === 0) {
        selectEl.innerHTML = `<option value="">No matching players</option>`;
    } else {
        matches.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            const currentLegionTag = p.legion ? ` (${p.legion})` : '';
            const prefTimeTag = p.preferred_time ? ` [Time: ${p.preferred_time}]` : '';
            option.text = `[${p.alliance}] ${p.nickname} (ID: ${p.game_id}) - Power: ${Number(p.troops_power).toLocaleString('en-US')}${prefTimeTag}${currentLegionTag}`;
            selectEl.add(option);
        });
        // Keep the previous pick if it is still in the list, else first match.
        if (previous && matches.some(p => String(p.id) === String(previous))) selectEl.value = previous;
    }
    document.getElementById('legion-assign-count').innerText = `(${matches.length} found)`;
    onLegionAssignPlayerChange();
}

// When the picked player changes, preload that player's existing tasks.
function onLegionAssignPlayerChange() {
    const box = document.getElementById('legion-assign-task-options');
    if (!box || !box.children.length) return;
    const id = document.getElementById('select-legion-player').value;
    const player = legionAssignCandidates.find(p => String(p.id) === String(id));
    const tasks = player && typeof parseFdtTasks === 'function' ? parseFdtTasks(player.frostdragon_task) : [];
    box.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = tasks.includes(cb.value); });
}

// Alliance A / B are mutually exclusive, same rule as the roster task picker.
function onLegionAssignTaskToggle(cb) {
    if (!cb.checked || typeof FDT_ALLIANCE_TASKS === 'undefined' || !FDT_ALLIANCE_TASKS.includes(cb.value)) return;
    document.querySelectorAll('#legion-assign-task-options input[type="checkbox"]').forEach(other => {
        if (other !== cb && FDT_ALLIANCE_TASKS.includes(other.value)) other.checked = false;
    });
}

function getLegionAssignSelectedTasks() {
    return Array.from(document.querySelectorAll('#legion-assign-task-options input[type="checkbox"]:checked')).map(cb => cb.value);
}

function closeLegionAssignModal() {
    document.getElementById('legion-assign-modal').classList.add('hidden');
}

async function submitLegionAssignment() {
    if (typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon' && typeof fdtSettings !== 'undefined' && fdtSettings.locked) {
        showToast('Frostdragon roster is locked. Unlock it in President Panel to make changes.', 'warning');
        return;
    }

    if (!canManageLegion(currentSelection)) return;
    const client = getSupabase();
    if (!client) return;

    const playerId = document.getElementById('select-legion-player').value;
    const role = document.getElementById('select-legion-role').value;

    if (!playerId) {
        showToast("Please select a valid player!", "warning");
        return;
    }

    const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
    const roleField = frost ? 'frostdragon_role' : 'legion_role';
    const currentBattleCount = loadedTroopsData.filter(p => p[roleField] === 'Battle').length;
    const currentSubCount = loadedTroopsData.filter(p => p[roleField] === 'Substitute').length;

    if (frost && role !== 'Battle') {
        showToast("Frostdragon Tyrant does not allow substitute players.", "warning");
        return;
    }
    if (frost) {
        // Official rule: each alliance can dispatch up to 60 combatants.
        const picked = loadedTroopsData.find(p => Number(p.id) === Number(playerId));
        const limit = typeof FDT_MAX_PER_ALLIANCE !== 'undefined' ? FDT_MAX_PER_ALLIANCE : 60;
        if (picked) {
            const allianceCount = loadedTroopsData.filter(p => p.alliance === picked.alliance && p.frostdragon_role === 'Battle').length;
            if (allianceCount >= limit) {
                showToast(`${picked.alliance} already has ${limit} combatants (Frostdragon Tyrant maximum per alliance).`, "warning");
                return;
            }
        }
    } else if (role === 'Battle' && currentBattleCount >= 30) {
        showToast("Battle quota is full! (Maximum 30 players)", "warning");
        return;
    }
    if (!frost && role === 'Substitute' && currentSubCount >= 20) {
        showToast("Substitute quota is full! (Maximum 20 players)", "warning");
        return;
    }

    const selectedPlayer = loadedTroopsData.find(p => Number(p.id) === Number(playerId));
    const playerLabel = selectedPlayer ? `${selectedPlayer.nickname} (${selectedPlayer.alliance})` : 'this player';
    const confirmed = await showCustomConfirmAsync(
        `Assign ${playerLabel} to ${currentSelection} as ${role}?`,
        '#7c3aed'
    );
    if (!confirmed) return;

    const submitBtn = document.querySelector('#legion-assign-modal .btn-apply');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Assigning..."; }

    const updatePayload = frost ? { frostdragon_role: role } : { legion: currentSelection, legion_role: role };
    if (frost && typeof FDT_TASKS !== 'undefined') {
        // Same storage format as updateFrostdragonTask(): comma-separated, null when empty.
        const tasks = [...new Set(parseFdtTasks(getLegionAssignSelectedTasks()))];
        updatePayload.frostdragon_task = tasks.length ? tasks.join(', ') : null;
    }
    const { error } = await client.from('troops_power').update(updatePayload).eq('id', playerId);

    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Assign Player"; }

    if (!error) {
        showToast(`Player added to ${currentSelection} as ${role}!`, "success");
        closeLegionAssignModal();
        fetchData();
    } else {
        showToast("Failed to assign player: " + error.message, "error");
    }
}

async function toggleLegionRole(id, currentRole) {
    if (typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon' && typeof fdtSettings !== 'undefined' && fdtSettings.locked) {
        showToast('Frostdragon roster is locked. Unlock it in President Panel to make changes.', 'warning');
        return;
    }

    if (!canManageLegion(currentSelection)) return;
    const client = getSupabase();
    if (!client) return;

    const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
    if (frost) {
        showToast("Frostdragon Tyrant uses Battle only. There is no substitute role.", "info");
        return;
    }
    const newRole = currentRole === 'Battle' ? 'Substitute' : 'Battle';

    const currentBattleCount = loadedTroopsData.filter(p => p.legion_role === 'Battle').length;
    const currentSubCount = loadedTroopsData.filter(p => p.legion_role === 'Substitute').length;

    if (newRole === 'Battle' && currentBattleCount >= ((typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon') ? 100 : 30)) {
        showToast("Failed to switch! Battle quota reached 30 players.", "warning");
        return;
    }

    if (newRole === 'Substitute' && currentSubCount >= 20) {
        showToast("Failed to switch! Substitute quota reached 20 players.", "warning");
        return;
    }

    const player = loadedTroopsData.find(p => Number(p.id) === Number(id));
    const confirmed = await showCustomConfirmAsync(
        `Switch ${player?.nickname || 'this player'} to ${newRole}?`,
        '#2563eb'
    );
    if (!confirmed) return;

    const { error } = await client.from('troops_power').update({
        legion_role: newRole
    }).eq('id', id);

    if (!error) {
        showToast(`Role switched to ${newRole}!`, "success");
        fetchData();
    } else {
        showToast("Failed to update role.", "error");
    }
}

async function removeFromLegion(id) {
    if (typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon' && typeof fdtSettings !== 'undefined' && fdtSettings.locked) {
        showToast('Frostdragon roster is locked. Unlock it in President Panel to make changes.', 'warning');
        return;
    }

    if (!canManageLegion(currentSelection)) return;
    const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
    showCustomConfirm(frost ? "Remove this player from the Frostdragon Tyrant roster?" : "Remove this player from Legion roster?", async () => {
        const client = getSupabase();
        if (!client) return;

        // Only clear the field(s) that belong to the currently active theme.
        // Removing a player from the Frostdragon roster must never touch
        // their Tundra legion/legion_role, and vice versa.
        const { error } = await client.from('troops_power').update(
            frost ? { frostdragon_role: null } : { legion: null, legion_role: null }
        ).eq('id', id);

        if (!error) {
            showToast(frost ? "Player removed from Frostdragon Tyrant roster." : "Player removed from Legion.", "success");
            fetchData();
        } else {
            showToast("Failed to remove player.", "error");
        }
    }, '#ef4444');
}



// ================= BULK REMOVE FROM ROSTER (own popup) =================
// Works on the roster that is already loaded on screen (loadedTroopsData), so
// opening the popup needs no extra query. Removal has the same effect as the
// per-row "Remove" button: only the active theme's fields are cleared
// (Frostdragon never touches Tundra legions and vice versa).
const bulkRemoveSelected = new Set();

function bulkRemoveIsFrost() {
    return typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
}

function bulkRemoveBlocked() {
    if (bulkRemoveIsFrost() && typeof fdtSettings !== 'undefined' && fdtSettings.locked) {
        showToast('Frostdragon roster is locked. Unlock it in President Panel to make changes.', 'warning');
        return true;
    }
    if (!canManageLegion(currentSelection)) {
        showToast("You don't have permission to manage this roster.", 'warning');
        return true;
    }
    return false;
}

function openBulkRemoveModal() {
    if (bulkRemoveBlocked()) return;
    if (!loadedTroopsData || loadedTroopsData.length === 0) {
        showToast('This roster is empty.', 'info');
        return;
    }
    bulkRemoveSelected.clear();
    document.getElementById('bulk-remove-target-label').innerText = bulkRemoveIsFrost() ? 'FDT Roster' : currentSelection;

    const allianceEl = document.getElementById('bulk-remove-alliance');
    const present = ALL_ALLIANCES.filter(a => loadedTroopsData.some(p => p.alliance === a));
    allianceEl.innerHTML = `<option value="">All Alliances (${loadedTroopsData.length})</option>` +
        present.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)} (${loadedTroopsData.filter(p => p.alliance === a).length})</option>`).join('');
    document.getElementById('bulk-remove-search').value = '';

    // Task filter exists only for Frostdragon (tasks live in frostdragon_task)
    const taskGroup = document.getElementById('bulk-remove-task-group');
    const taskEl = document.getElementById('bulk-remove-task');
    const showTasks = bulkRemoveIsFrost() && typeof FDT_TASKS !== 'undefined' && typeof parseFdtTasks === 'function';
    taskGroup.classList.toggle('hidden', !showTasks);
    if (showTasks) {
        const withTask = t => loadedTroopsData.filter(p => parseFdtTasks(p.frostdragon_task).includes(t)).length;
        const noTask = loadedTroopsData.filter(p => parseFdtTasks(p.frostdragon_task).length === 0).length;
        taskEl.innerHTML = `<option value="">All Tasks</option>` +
            FDT_TASKS.filter(t => withTask(t) > 0)
                .map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${withTask(t)})</option>`).join('') +
            (noTask > 0 ? `<option value="__none__">No task assigned (${noTask})</option>` : '');
    } else {
        taskEl.innerHTML = '';
    }

    filterBulkRemovePlayers();
    document.getElementById('bulk-remove-modal').classList.remove('hidden');
}

function closeBulkRemoveModal() {
    document.getElementById('bulk-remove-modal').classList.add('hidden');
    bulkRemoveSelected.clear();
}

function getBulkRemoveShown() {
    const alliance = document.getElementById('bulk-remove-alliance').value;
    const q = document.getElementById('bulk-remove-search').value.trim().toLowerCase();
    const task = bulkRemoveIsFrost() ? document.getElementById('bulk-remove-task').value : '';
    return loadedTroopsData.filter(p => {
        if (alliance && p.alliance !== alliance) return false;
        if (task) {
            const tasks = parseFdtTasks(p.frostdragon_task);
            if (task === '__none__' ? tasks.length > 0 : !tasks.includes(task)) return false;
        }
        if (!q) return true;
        return (p.nickname || '').toLowerCase().includes(q) || String(p.game_id || '').toLowerCase().includes(q);
    });
}

// Re-renders the checklist for the current alliance/search filter. Selections
// persist across filter changes (they are kept in bulkRemoveSelected).
function filterBulkRemovePlayers() {
    const roleField = bulkRemoveIsFrost() ? 'frostdragon_role' : 'legion_role';
    const shown = getBulkRemoveShown();
    const list = document.getElementById('bulk-remove-list');

    list.innerHTML = shown.length === 0
        ? '<div class="bulk-remove-empty">No players match.</div>'
        : shown.map(p => {
            const id = Number(p.id);
            const role = p[roleField] ? ` · ${escapeHtml(p[roleField])}` : '';
            const tasks = bulkRemoveIsFrost() && typeof parseFdtTasks === 'function' ? parseFdtTasks(p.frostdragon_task) : [];
            const taskLine = tasks.length ? `<span class="bulk-remove-tasks">${tasks.map(escapeHtml).join(', ')}</span>` : '';
            return `<label class="bulk-remove-item">
                <input type="checkbox" value="${id}" ${bulkRemoveSelected.has(id) ? 'checked' : ''} onchange="onBulkRemoveToggle(this)">
                <span class="bulk-remove-name">${escapeHtml(p.nickname)}${taskLine}</span>
                <span class="bulk-remove-meta">${escapeHtml(p.alliance)} · ${escapeHtml(p.game_id)}${role}</span>
            </label>`;
        }).join('');
    updateBulkRemoveSummary();
}

function onBulkRemoveToggle(cb) {
    const id = Number(cb.value);
    if (cb.checked) bulkRemoveSelected.add(id); else bulkRemoveSelected.delete(id);
    updateBulkRemoveSummary();
}

function toggleBulkRemoveAll(checked) {
    getBulkRemoveShown().forEach(p => {
        if (checked) bulkRemoveSelected.add(Number(p.id)); else bulkRemoveSelected.delete(Number(p.id));
    });
    filterBulkRemovePlayers();
}

function updateBulkRemoveSummary() {
    const count = bulkRemoveSelected.size;
    document.getElementById('bulk-remove-count').innerText = `${count} selected`;
    const btn = document.getElementById('bulk-remove-submit-btn');
    btn.disabled = count === 0;
    btn.innerText = count > 0 ? `Remove Selected (${count})` : 'Remove Selected';

    const all = document.getElementById('bulk-remove-select-all');
    const shown = getBulkRemoveShown();
    const selShown = shown.filter(p => bulkRemoveSelected.has(Number(p.id))).length;
    all.checked = shown.length > 0 && selShown === shown.length;
    all.indeterminate = selShown > 0 && selShown < shown.length;
}

function submitBulkRemove() {
    if (bulkRemoveBlocked()) return;
    const ids = [...bulkRemoveSelected];
    if (ids.length === 0) {
        showToast('Select at least one player first.', 'warning');
        return;
    }
    const frost = bulkRemoveIsFrost();
    const where = frost ? 'the Frostdragon Tyrant roster' : `the ${currentSelection} roster`;

    showCustomConfirm(`Remove ${ids.length} selected player(s) from ${where}?`, async () => {
        const client = getSupabase();
        if (!client) return;

        const patch = frost ? { frostdragon_role: null } : { legion: null, legion_role: null };
        let removed = 0;
        let failed = false;

        // Chunked so the request URL stays small even for large selections.
        for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100);
            let q = client.from('troops_power').update(patch).in('id', chunk);
            if (!frost) q = q.eq('legion', currentSelection); // never touch another legion
            const { data, error } = await q.select('id');
            if (error) { failed = true; break; }
            removed += (data || []).length;
        }

        closeBulkRemoveModal();
        if (failed) {
            showToast(`Stopped early: ${removed} of ${ids.length} removed. Please try again.`, 'error');
        } else if (removed < ids.length) {
            showToast(`${removed} of ${ids.length} removed (the rest were not allowed or already gone).`, 'warning');
        } else {
            showToast(`${removed} player(s) removed from ${frost ? 'Frostdragon Tyrant roster' : currentSelection}.`, 'success');
        }
        fetchData();
    }, '#ef4444');
}


// ================= BULK ASSIGN PLAYERS (own popup) =================
// Pick many players at once and give them all the same role (+ tasks for
// Frostdragon). Uses the same limits and storage format as the single Assign
// popup: FDT max 60 Battle per alliance, Tundra 30 Battle / 20 Substitute.
const bulkAssignSelected = new Set();
let bulkAssignCandidates = [];

async function openBulkAssignModal() {
    if (!canManageLegion(currentSelection)) {
        showToast("You don't have permission to manage this legion's roster.", "warning");
        return;
    }
    if (bulkRemoveBlocked()) return;
    const client = getSupabase();
    if (!client) return;
    const frost = bulkRemoveIsFrost();

    let q = client.from('troops_power').select('*');
    q = frost ? q.is('frostdragon_role', null) : q.or(`legion.is.null,legion.neq.${currentSelection}`);
    const { data, error } = await q.order('troops_power', { ascending: false });
    if (error) { showToast("Failed to load players list", "error"); return; }
    bulkAssignCandidates = data || [];
    if (bulkAssignCandidates.length === 0) { showToast('No players available to assign.', 'info'); return; }

    bulkAssignSelected.clear();
    document.getElementById('bulk-assign-target-label').innerText = frost ? 'FDT Roster' : currentSelection;
    const allianceEl = document.getElementById('bulk-assign-alliance');
    const present = ALL_ALLIANCES.filter(a => bulkAssignCandidates.some(p => p.alliance === a));
    allianceEl.innerHTML = `<option value="">All Alliances (${bulkAssignCandidates.length})</option>` +
        present.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)} (${bulkAssignCandidates.filter(p => p.alliance === a).length})</option>`).join('');
    document.getElementById('bulk-assign-search').value = '';

    // Frostdragon: no substitutes, but tasks can be set. Tundra: role picker only.
    document.getElementById('bulk-assign-role-group').classList.toggle('hidden', frost);
    document.getElementById('bulk-assign-role').value = 'Battle';
    const taskGroup = document.getElementById('bulk-assign-task-group');
    const showTasks = frost && typeof FDT_TASKS !== 'undefined';
    taskGroup.classList.toggle('hidden', !showTasks);
    if (showTasks) {
        document.getElementById('bulk-assign-task-options').innerHTML = FDT_TASKS.map(t =>
            `<label class="legion-assign-task-chip"><input type="checkbox" value="${escapeHtml(t)}" onchange="onBulkAssignTaskToggle(this)"><span>${escapeHtml(t)}</span></label>`
        ).join('');
        document.getElementById('bulk-assign-task-mode').value = 'add';
    }

    filterBulkAssignPlayers();
    document.getElementById('bulk-assign-modal').classList.remove('hidden');
}

function closeBulkAssignModal() {
    document.getElementById('bulk-assign-modal').classList.add('hidden');
    bulkAssignSelected.clear();
}

function onBulkAssignTaskToggle(cb) {
    if (!cb.checked || typeof FDT_ALLIANCE_TASKS === 'undefined' || !FDT_ALLIANCE_TASKS.includes(cb.value)) return;
    document.querySelectorAll('#bulk-assign-task-options input[type="checkbox"]').forEach(other => {
        if (other !== cb && FDT_ALLIANCE_TASKS.includes(other.value)) other.checked = false;
    });
}

function getBulkAssignShown() {
    const alliance = document.getElementById('bulk-assign-alliance').value;
    const q = document.getElementById('bulk-assign-search').value.trim().toLowerCase();
    return bulkAssignCandidates.filter(p => {
        if (alliance && p.alliance !== alliance) return false;
        if (!q) return true;
        return (p.nickname || '').toLowerCase().includes(q) || String(p.game_id || '').toLowerCase().includes(q);
    });
}

function filterBulkAssignPlayers() {
    const shown = getBulkAssignShown();
    const list = document.getElementById('bulk-assign-list');
    list.innerHTML = shown.length === 0
        ? '<div class="bulk-remove-empty">No players match.</div>'
        : shown.map(p => {
            const id = Number(p.id);
            const power = Number(p.troops_power || 0).toLocaleString('en-US');
            const legionTag = p.legion ? ` · ${escapeHtml(p.legion)}` : '';
            return `<label class="bulk-remove-item">
                <input type="checkbox" value="${id}" ${bulkAssignSelected.has(id) ? 'checked' : ''} onchange="onBulkAssignToggle(this)">
                <span class="bulk-remove-name">${escapeHtml(p.nickname)}</span>
                <span class="bulk-remove-meta">${escapeHtml(p.alliance)} · ${escapeHtml(p.game_id)} · ${power}${legionTag}</span>
            </label>`;
        }).join('');
    updateBulkAssignSummary();
}

function onBulkAssignToggle(cb) {
    const id = Number(cb.value);
    if (cb.checked) bulkAssignSelected.add(id); else bulkAssignSelected.delete(id);
    updateBulkAssignSummary();
}

function toggleBulkAssignAll(checked) {
    getBulkAssignShown().forEach(p => {
        if (checked) bulkAssignSelected.add(Number(p.id)); else bulkAssignSelected.delete(Number(p.id));
    });
    filterBulkAssignPlayers();
}

function updateBulkAssignSummary() {
    const count = bulkAssignSelected.size;
    document.getElementById('bulk-assign-count').innerText = `${count} selected`;
    const btn = document.getElementById('bulk-assign-submit-btn');
    btn.disabled = count === 0;
    btn.innerText = count > 0 ? `Assign Selected (${count})` : 'Assign Selected';
    const all = document.getElementById('bulk-assign-select-all');
    const shown = getBulkAssignShown();
    const selShown = shown.filter(p => bulkAssignSelected.has(Number(p.id))).length;
    all.checked = shown.length > 0 && selShown === shown.length;
    all.indeterminate = selShown > 0 && selShown < shown.length;
}

async function submitBulkAssign() {
    if (bulkRemoveBlocked()) return;
    const client = getSupabase();
    if (!client) return;
    const ids = [...bulkAssignSelected];
    if (ids.length === 0) { showToast('Select at least one player first.', 'warning'); return; }
    const frost = bulkRemoveIsFrost();
    const picked = bulkAssignCandidates.filter(p => bulkAssignSelected.has(Number(p.id)));

    // ---- quota checks (same rules as the single Assign popup) ----
    const role = frost ? 'Battle' : document.getElementById('bulk-assign-role').value;
    if (frost) {
        const limit = typeof FDT_MAX_PER_ALLIANCE !== 'undefined' ? FDT_MAX_PER_ALLIANCE : 60;
        const addBy = {};
        picked.forEach(p => { addBy[p.alliance] = (addBy[p.alliance] || 0) + 1; });
        for (const [alliance, add] of Object.entries(addBy)) {
            const have = loadedTroopsData.filter(p => p.alliance === alliance && p.frostdragon_role === 'Battle').length;
            if (have + add > limit) {
                showToast(`${alliance} would have ${have + add} combatants (max ${limit}). Select fewer ${alliance} players.`, 'warning');
                return;
            }
        }
    } else {
        const cap = role === 'Battle' ? 30 : 20;
        const have = loadedTroopsData.filter(p => p.legion_role === role).length;
        if (have + picked.length > cap) {
            showToast(`${role} quota exceeded: ${have} + ${picked.length} > ${cap}. Select fewer players.`, 'warning');
            return;
        }
    }

    const confirmed = await showCustomConfirmAsync(
        `Assign ${picked.length} selected player(s) to ${frost ? 'the Frostdragon Tyrant roster' : currentSelection + ' as ' + role}?`,
        '#7c3aed'
    );
    if (!confirmed) return;

    const btn = document.getElementById('bulk-assign-submit-btn');
    btn.disabled = true; btn.innerText = 'Assigning...';

    // ---- build per-player payloads ----
    const chosen = frost && typeof parseFdtTasks === 'function'
        ? [...new Set(parseFdtTasks(Array.from(document.querySelectorAll('#bulk-assign-task-options input:checked')).map(cb => cb.value)))]
        : [];
    const mode = frost ? document.getElementById('bulk-assign-task-mode').value : 'add';
    const chosenGroup = chosen.find(t => FDT_ALLIANCE_TASKS.includes(t));
    const taskFor = p => {
        let tasks = mode === 'replace' ? [] : parseFdtTasks(p.frostdragon_task);
        if (chosenGroup) tasks = tasks.filter(t => !FDT_ALLIANCE_TASKS.includes(t));
        const merged = [...new Set([...tasks, ...chosen])];
        return merged.length ? merged.join(', ') : null;
    };

    let done = 0, failed = false;
    if (!frost) {
        // Same payload for everyone -> chunked bulk update.
        for (let i = 0; i < ids.length; i += 100) {
            const { data, error } = await client.from('troops_power')
                .update({ legion: currentSelection, legion_role: role }).in('id', ids.slice(i, i + 100)).select('id');
            if (error) { failed = true; break; }
            done += (data || []).length;
        }
    } else {
        // Group players by resulting task string so identical payloads go in one request.
        const groups = new Map();
        picked.forEach(p => {
            const key = (chosen.length || mode === 'replace') ? (taskFor(p) ?? '\u0000null') : '\u0000keep';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(Number(p.id));
        });
        outer: for (const [key, gids] of groups) {
            const payload = { frostdragon_role: 'Battle' };
            if (key !== '\u0000keep') payload.frostdragon_task = key === '\u0000null' ? null : key;
            for (let i = 0; i < gids.length; i += 100) {
                const { data, error } = await client.from('troops_power').update(payload).in('id', gids.slice(i, i + 100)).select('id');
                if (error) { failed = true; break outer; }
                done += (data || []).length;
            }
        }
    }

    btn.disabled = false;
    closeBulkAssignModal();
    if (failed) showToast(`Stopped early: ${done} of ${ids.length} assigned. Please try again.`, 'error');
    else if (done < ids.length) showToast(`${done} of ${ids.length} assigned (the rest were not allowed).`, 'warning');
    else showToast(`${done} player(s) added to ${frost ? 'Frostdragon Tyrant roster' : currentSelection}.`, 'success');
    fetchData();
}
