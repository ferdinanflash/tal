// ================= LEGION MANAGEMENT FEATURES (PRESIDENT) =================
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

    const selectEl = document.getElementById('select-legion-player');
    selectEl.innerHTML = "";

    if (!data || data.length === 0) {
        selectEl.innerHTML = `<option value="">No available players to add</option>`;
    } else {
        data.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            const currentLegionTag = p.legion ? ` (${p.legion})` : '';
            const prefTimeTag = p.preferred_time ? ` [Time: ${p.preferred_time}]` : '';
            option.text = `[${p.alliance}] ${p.nickname} - Power: ${Number(p.troops_power).toLocaleString('en-US')}${prefTimeTag}${currentLegionTag}`;
            selectEl.add(option);
        });
    }

    document.getElementById('legion-assign-modal').classList.remove('hidden');
}

function closeLegionAssignModal() {
    document.getElementById('legion-assign-modal').classList.add('hidden');
}

async function submitLegionAssignment() {
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
    if (role === 'Battle' && currentBattleCount >= (frost ? 100 : 30)) {
        showToast(`Battle quota is full! (Maximum ${frost ? 100 : 30} players)`, "warning");
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

    const { error } = await client.from('troops_power').update(
        frost ? { frostdragon_role: role } : { legion: currentSelection, legion_role: role }
    ).eq('id', playerId);

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

