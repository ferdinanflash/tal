function openScheduleModal(legionName) {
    if (!canManageLegion(legionName)) {
        showToast("You don't have permission to set this legion's schedule.", "warning");
        return;
    }
    editingScheduleLegion = legionName;
    document.getElementById('schedule-modal-target').innerText = legionName;
    document.getElementById('input-match-time').value = "";
    document.getElementById('schedule-modal').classList.remove('hidden');
}

function closeScheduleModal() {
    document.getElementById('schedule-modal').classList.add('hidden');
}

async function submitMatchSchedule() {
    if (!editingScheduleLegion || !canManageLegion(editingScheduleLegion)) return;
    const client = getSupabase();
    if (!client) return;

    const matchTime = document.getElementById('input-match-time').value;
    if (!matchTime) {
        showToast("Please select a match time!", "warning");
        return;
    }

    const fieldName = editingScheduleLegion === 'Legion 1' ? 'legion1_schedule' : 'legion2_schedule';

    const confirmed = await showCustomConfirmAsync(
        `Save ${editingScheduleLegion} match time as ${matchTime} UTC?`,
        '#2563eb'
    );
    if (!confirmed) return;

    const submitBtn = document.querySelector('#schedule-modal .btn-apply');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Saving..."; }

    const { error } = await client.from('footer_settings').update({
        [fieldName]: matchTime
    }).eq('id', 'main');

    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Save Schedule"; }

    if (!error) {
        showToast(`Schedule for ${editingScheduleLegion} updated!`, "success");
        closeScheduleModal();
        loadLegionSchedules();
    } else {
        showToast("Failed to save schedule: " + error.message, "error");
    }
}

async function loadLegionSchedules() {
    const client = getSupabase();
    if (!client) return;

    try {
        const { data } = await client.from('footer_settings').select('legion1_schedule, legion2_schedule').eq('id', 'main').single();
        if (data) {
            const l1Container = document.getElementById('display-schedule-legion-1');
            if (data.legion1_schedule) {
                l1Container.querySelector('.schedule-time-val').innerText = data.legion1_schedule;
                l1Container.style.display = "block";
            } else {
                l1Container.style.display = "none";
            }

            const l2Container = document.getElementById('display-schedule-legion-2');
            if (data.legion2_schedule) {
                l2Container.querySelector('.schedule-time-val').innerText = data.legion2_schedule;
                l2Container.style.display = "block";
            } else {
                l2Container.style.display = "none";
            }
        }
    } catch (err) {}
}

