function openAddModal() {
    if (!isAdmin) return;
    const myAlliances = getMyEditableAlliances();
    if (myAlliances.length === 0) {
        showToast("You don't have permission to add players.", "warning");
        return;
    }

    editingPlayerId = null;
    editingPlayerOriginalAlliance = null;
    document.getElementById('modal-form-title').innerText = "Add Troops Power";
    document.getElementById('modal-submit-btn').innerText = "Submit Data";

    document.getElementById('input-nickname').value = "";
    document.getElementById('input-gameid').value = "";
    document.getElementById('input-power').value = "";
    document.getElementById('input-preferred-time').value = "";

    const allianceLabel = document.getElementById('form-alliance-label');
    const allianceSelectGroup = document.getElementById('group-alliance-select');

    if (currentSelection === 'ALL' || viewMode === 'LEGION') {
        allianceLabel.innerText = "Select below";
        allianceSelectGroup.style.display = "flex";
        // Restricted staff only get to pick from the alliance(s) their role covers.
        populateAllianceSelectOptions(myAlliances);
    } else {
        allianceLabel.innerText = currentSelection;
        allianceSelectGroup.style.display = "none";
        populateAllianceSelectOptions([currentSelection]);
        document.getElementById('input-alliance').value = currentSelection;
    }

    document.getElementById('add-modal').classList.remove('hidden');
}

function openEditModal(id, playerOverride = null) {
    if (!isAdmin) return;
    const player = playerOverride || loadedTroopsData.find(p => p.id === id);
    if (!player) return;

    if (!canEditAlliance(player.alliance)) {
        showToast("You don't have permission to edit this player's alliance.", "warning");
        return;
    }

    editingPlayerId = id;
    editingPlayerOriginalAlliance = player.alliance;
    document.getElementById('modal-form-title').innerText = "Edit Troops Power";
    document.getElementById('modal-submit-btn').innerText = "Update Data";

    document.getElementById('input-nickname').value = player.nickname;
    document.getElementById('input-gameid').value = player.game_id;
    document.getElementById('input-power').value = player.troops_power;
    document.getElementById('input-preferred-time').value = player.preferred_time || "";

    document.getElementById('form-alliance-label').innerText = player.alliance;
    document.getElementById('group-alliance-select').style.display = "flex";
    // Any staff member who's allowed to edit this player at all may move
    // them to a different alliance, so the dropdown always offers every
    // alliance here — not just the ones their role normally covers.
    populateAllianceSelectOptions(ALL_ALLIANCES);
    document.getElementById('input-alliance').value = player.alliance;

    document.getElementById('add-modal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('add-modal').classList.add('hidden');
    editingPlayerId = null;
    editingPlayerOriginalAlliance = null;
}

async function submitPlayerData() {
    const client = getSupabase();
    if (!client) return;

    const alliance = document.getElementById('input-alliance').value;

    // When adding a brand-new player, the destination alliance itself must
    // be one this staff member is allowed to edit. When editing an existing
    // player, what matters is whether they're allowed to touch the alliance
    // the player currently belongs to — once that's confirmed, they're free
    // to move the player to any alliance via the dropdown.
    const allianceToCheck = editingPlayerId === null ? alliance : editingPlayerOriginalAlliance;
    if (!canEditAlliance(allianceToCheck)) {
        showToast("You don't have permission to save changes for this player.", "error");
        return;
    }

    const nickname = document.getElementById('input-nickname').value.trim();
    const gameId = document.getElementById('input-gameid').value.trim();
    const power = parseInt(document.getElementById('input-power').value.trim()) || 0;
    const preferredTime = document.getElementById('input-preferred-time').value;

    if (!nickname) { showToast("Please enter Nickname!", "warning"); return; }
    if (!gameId) { showToast("Please enter Game ID!", "warning"); return; }
    if (power <= 0) { showToast("Please enter valid Troops Power!", "warning"); return; }

    // Duplicate Game ID check (queries the DB, since the table on screen only
    // holds the currently viewed alliance).
    const duplicate = await findDuplicateGameId(client, gameId, editingPlayerId);
    if (duplicate && duplicate.error) {
        showToast("Could not verify Game ID: " + duplicate.error.message, "error");
        return;
    }
    if (duplicate) {
        showDuplicateIdModal(duplicate, alliance);
        return;
    }

    if (editingPlayerId !== null) {
        const confirmed = await showCustomConfirmAsync(
            `Update ${nickname}'s player data?`,
            '#2563eb'
        );
        if (!confirmed) return;
    }

    const submitBtn = document.getElementById('modal-submit-btn');
    const originalLabel = submitBtn ? submitBtn.innerText : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Saving..."; }

    if (editingPlayerId === null) {
        const { error } = await client.from('troops_power').insert({
            alliance: alliance,
            nickname: nickname,
            game_id: gameId,
            troops_power: power,
            preferred_time: preferredTime
        });

        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalLabel; }

        if (!error) {
            showToast("Player power added successfully!", "success");
            closeAddModal();
            fetchData();
        } else {
            showToast("Error inserting data: " + error.message, "error");
        }
    } else {
        const { error } = await client.from('troops_power').update({
            alliance: alliance,
            nickname: nickname,
            game_id: gameId,
            troops_power: power,
            preferred_time: preferredTime,
            updated_at: new Date().toISOString()
        }).eq('id', editingPlayerId);

        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalLabel; }

        if (!error) {
            showToast("Player data updated successfully!", "success");
            closeAddModal();
            fetchData();
        } else {
            showToast("Error updating data: " + error.message, "error");
        }
    }
}

function deletePlayerData(id) {
    if (!isAdmin) return;
    const player = loadedTroopsData.find(p => p.id === id);
    if (!player || !canEditAlliance(player.alliance)) {
        showToast("You don't have permission to delete this player.", "warning");
        return;
    }
    showCustomConfirm("Are you sure you want to delete this player entry?", async () => {
        const client = getSupabase();
        if (!client) return;

        const { error } = await client.from('troops_power').delete().eq('id', id);

        if (!error) {
            showToast("Player data removed.", "success");
            fetchData();
        } else {
            showToast("Failed to delete player.", "error");
        }
    }, '#ef4444');
}



// ================= DUPLICATE GAME ID CHECK =================
let duplicatePlayerRecord = null;
let duplicateMoveTarget = null; // alliance this staff can move the existing player into

// Returns the existing player row that already uses `gameId` (ignoring the row
// currently being edited), `null` when the ID is free, or `{ error }` on failure.
async function findDuplicateGameId(client, gameId, excludeId = null) {
    let query = client.from('troops_power')
        .select('*')
        .eq('game_id', gameId)
        .limit(1);
    if (excludeId !== null) query = query.neq('id', excludeId);

    const { data, error } = await query;
    if (error) return { error };
    return data && data.length ? data[0] : null;
}

function showDuplicateIdModal(existing, targetAlliance) {
    duplicatePlayerRecord = existing;
    const sameAlliance = existing.alliance === targetAlliance;
    const canEdit = canEditAlliance(existing.alliance);

    document.getElementById('dup-game-id').textContent = existing.game_id;
    document.getElementById('dup-nickname').textContent = existing.nickname || '-';
    document.getElementById('dup-alliance').textContent = existing.alliance || '-';
    document.getElementById('dup-power').textContent =
        Number(existing.troops_power || 0).toLocaleString('en-US');

    document.getElementById('dup-message').textContent = sameAlliance
        ? `This Game ID is already registered in ${existing.alliance}.`
        : `This Game ID is already registered in another alliance (${existing.alliance}).`;

    // Exception: staff who can't edit the other alliance may still pull the
    // player into an alliance they do manage.
    const myAlliances = getMyEditableAlliances();
    duplicateMoveTarget = null;
    if (!canEdit && myAlliances.length) {
        duplicateMoveTarget = myAlliances.includes(targetAlliance) ? targetAlliance : myAlliances[0];
    }

    document.getElementById('dup-no-permission').classList.toggle('hidden', canEdit || !!duplicateMoveTarget);
    document.getElementById('dup-edit-btn').classList.toggle('hidden', !canEdit);
    const moveBtn = document.getElementById('dup-move-btn');
    moveBtn.classList.toggle('hidden', !duplicateMoveTarget);
    if (duplicateMoveTarget) moveBtn.textContent = `Move to ${duplicateMoveTarget}`;
    document.getElementById('dup-move-note').classList.toggle('hidden', !duplicateMoveTarget);
    if (duplicateMoveTarget) {
        document.getElementById('dup-move-note').textContent =
            `You can't edit ${existing.alliance}, but you can move this player to ${duplicateMoveTarget}.`;
    }

    showToast(
        `ID ${existing.game_id} is already registered in ${existing.alliance} (${existing.nickname || 'unknown'}).`,
        'warning'
    );
    document.getElementById('duplicate-id-modal').classList.remove('hidden');
}

function closeDuplicateIdModal() {
    document.getElementById('duplicate-id-modal').classList.add('hidden');
    duplicatePlayerRecord = null;
    duplicateMoveTarget = null;
}

// Staff without edit rights on the player's current alliance move the player
// into their own alliance, then land in the Edit form to update the data.
async function moveDuplicatePlayer() {
    const existing = duplicatePlayerRecord;
    const target = duplicateMoveTarget;
    if (!existing || !target) return;
    if (!canEditAlliance(target)) {
        showToast("You don't have permission to move players into this alliance.", "warning");
        return;
    }

    const confirmed = await showCustomConfirmAsync(
        `Move ${existing.nickname || existing.game_id} from ${existing.alliance} to ${target}?`,
        '#2563eb'
    );
    if (!confirmed) return;

    const client = getSupabase();
    if (!client) return;
    const btn = document.getElementById('dup-move-btn');
    btn.disabled = true;
    const { data, error } = await client.from('troops_power')
        .update({ alliance: target, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    btn.disabled = false;

    if (error || !data) {
        showToast("Failed to move player: " + (error ? error.message : "not allowed"), "error");
        return;
    }

    showToast(`${data.nickname || data.game_id} moved from ${existing.alliance} to ${target}.`, "success");
    closeDuplicateIdModal();
    closeAddModal();
    fetchData();
    openEditModal(data.id, data);
}

// "Edit Player Data": jump to the existing record instead of creating a duplicate.
function editDuplicatePlayer() {
    const existing = duplicatePlayerRecord;
    if (!existing) return;
    if (!canEditAlliance(existing.alliance)) {
        showToast("You don't have permission to edit this player's alliance.", "warning");
        return;
    }
    closeDuplicateIdModal();
    closeAddModal();
    openEditModal(existing.id, existing);
    showToast(`Editing existing player: ${existing.nickname || existing.game_id}`, 'info');
}
