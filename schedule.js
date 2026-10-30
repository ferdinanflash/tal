function openScheduleModal(legionName) {
    if (!canManageLegion(legionName)) {
        showToast("You don't have permission to set this legion's schedule.", "warning");
        return;
    }
    editingScheduleLegion = legionName;
    document.getElementById('schedule-modal-target').innerText = legionName;
    document.getElementById('input-match-time').value = "";
    document.getElementById('input-match-day').value = "";
    document.getElementById('schedule-modal').classList.remove('hidden');
}

function closeScheduleModal() {
    document.getElementById('schedule-modal').classList.add('hidden');
}

async function submitMatchSchedule() {
    if (!editingScheduleLegion || !canManageLegion(editingScheduleLegion)) return;
    const client = getSupabase();
    if (!client) return;

    const matchDay = document.getElementById('input-match-day').value;
    const matchTimeOnly = document.getElementById('input-match-time').value;
    if (!matchDay) {
        showToast("Please select a match day!", "warning");
        return;
    }
    if (!matchTimeOnly) {
        showToast("Please select a match time!", "warning");
        return;
    }
    // Stored as e.g. "Saturday, 12:00 UTC" (time options already include "UTC")
    const matchTime = `${matchDay}, ${matchTimeOnly}`;

    const fieldName = ({
        'Legion 1': 'legion1_schedule',
        'Legion 2': 'legion2_schedule',
        'Legion 1 - Alliance B': 'legion1b_schedule',
        'Legion 2 - Alliance B': 'legion2b_schedule'
    })[editingScheduleLegion] || 'legion1_schedule';

    const confirmed = await showCustomConfirmAsync(
        `Save ${editingScheduleLegion} match time as ${matchTime}?`,
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
        const { data } = await client.from('footer_settings').select('legion1_schedule, legion2_schedule, legion1b_schedule, legion2b_schedule').eq('id', 'main').single();
        if (data) {
            const applySched = (id, value) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (value) {
                    const span = el.querySelector('.schedule-time-val');
                    if (span) span.innerText = value;
                    el.style.display = 'block';
                } else {
                    el.style.display = 'none';
                }
            };
            applySched('display-schedule-legion-1', data.legion1_schedule);
            applySched('display-schedule-legion-2', data.legion2_schedule);
            applySched('display-schedule-legion-1b', data.legion1b_schedule);
            applySched('display-schedule-legion-2b', data.legion2b_schedule);
        }
    } catch (err) {}
}

