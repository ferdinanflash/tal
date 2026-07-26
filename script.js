// ================= SUPABASE PUBLIC CONFIGURATION =================
const SUPABASE_URL = 'https://pwqkpeykjyujhnreleax.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWtwZXlranl1amhucmVsZWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzgxNDgsImV4cCI6MjA5ODgxNDE0OH0.6u2CKOPHcMtVeA2ph0QWTqgtvs-4BQJpsz6v2kCyOEY'; 
// =================================================================

let supabaseClient = null;
let isAdmin = false;
let savedApplications = [];
let currentPosition = 'Vice President D1';
let selectedTimeSlot = ''; 
let isReservationOpen = true; 

document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('isPresidentMode') === 'true') {
        isAdmin = true;
        updateAdminUI(); 
    }
    
    loadFooterInfo();
    checkReservationStatus(); 
    startLiveClock();
    loadRecentAccepts();
    
    setInterval(() => {
        loadRecentAccepts();
        loadFooterInfo(); 
    }, 30000);
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`ID ${text} copied to clipboard!`, "success");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast("Failed to copy", "error");
    });
}

function updateAdminUI() {
    const adminBtn = document.getElementById('admin-toggle-btn');
    const adminInd = document.getElementById('admin-indicator');
    const editFooterBtn = document.getElementById('edit-footer-btn');
    const toggleResBtn = document.getElementById('toggle-reservation-btn'); 
    const finishSvsBtn = document.getElementById('finish-svs-btn'); 

    if (adminBtn) adminBtn.innerText = "Logout President";
    if (adminInd) adminInd.style.display = "inline";
    if (editFooterBtn) editFooterBtn.style.display = "inline-block";
    if (toggleResBtn) toggleResBtn.style.display = "inline-block"; 
    if (finishSvsBtn) finishSvsBtn.style.display = "inline-block"; 
}

function getSupabase() {
    if (!supabaseClient) {
        if (typeof window.supabase !== 'undefined') {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.error("Supabase CDN library failed to load");
        }
    }
    return supabaseClient;
}

async function checkReservationStatus() {
    const client = getSupabase();
    if (!client) return;
    try {
        const { data, error } = await client
            .from('system_settings')
            .select('is_open')
            .eq('id', currentPosition)
            .single();
        
        if (data) {
            isReservationOpen = data.is_open;
        } else {
            isReservationOpen = true; 
        }
        updateReservationButtonUI();
    } catch (err) {
        console.error("Error checking status:", err);
    }
}

function updateReservationButtonUI() {
    const toggleBtn = document.getElementById('toggle-reservation-btn');
    if (!toggleBtn) return;

    if (isReservationOpen) {
        toggleBtn.innerText = "Close Reservation";
        toggleBtn.style.background = "#dc2626"; 
    } else {
        toggleBtn.innerText = "Open Reservation";
        toggleBtn.style.background = "#22c55e"; 
    }
}

async function handleToggleReservation() {
    if (!isAdmin) return;
    
    const client = getSupabase();
    if (!client) return;

    const newStatus = !isReservationOpen;
    const actionText = newStatus ? "open" : "close";
    
    if (confirm(`Are you sure to ${actionText} reservation for ${currentPosition}?`)) {
        const { error } = await client
            .from('system_settings')
            .update({ is_open: newStatus })
            .eq('id', currentPosition); 
            
        if (!error) {
            isReservationOpen = newStatus;
            updateReservationButtonUI();
            showToast(`Reservation of ${currentPosition} now-${newStatus ? 'open' : 'close'}!`, "success");
        } else {
            showToast("Gagal memperbarui status ke database.", "error");
        }
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerText = message;

    if (type === 'success') toast.style.borderLeftColor = '#22c55e';
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    if (type === 'warning') toast.style.borderLeftColor = '#f59e0b';

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showCustomConfirm(message, onConfirm, buttonColor = '#ef4444') {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    msgEl.innerText = message;
    okBtn.style.background = buttonColor;
    modal.classList.remove('hidden');

    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

async function loadFooterInfo() {
    const cachedPresident = localStorage.getItem('cached_president_name');
    const cachedGuild = localStorage.getItem('cached_guild_name');
    
    if (cachedPresident) {
        const elPres = document.getElementById('display-president-name');
        if (elPres) elPres.innerText = cachedPresident;
    }
    if (cachedGuild) {
        const elGuild = document.getElementById('display-guild-name');
        if (elGuild) elGuild.innerText = cachedGuild;
    }

    const client = getSupabase();
    if (!client) return;
    try {
        const { data, error } = await client
            .from('footer_settings')
            .select('president_name, guild_name')
            .eq('id', 'main')
            .single();
        
        if (data) {
            if (data.president_name) {
                const elPres = document.getElementById('display-president-name');
                if (elPres) elPres.innerText = data.president_name;
                localStorage.setItem('cached_president_name', data.president_name);
            }
            if (data.guild_name) {
                const elGuild = document.getElementById('display-guild-name');
                if (elGuild) elGuild.innerText = data.guild_name;
                localStorage.setItem('cached_guild_name', data.guild_name);
            }
        }
    } catch (err) {
        console.error("Error loading footer info from database:", err);
    }
}

async function handleEditFooter() {
    if (!isAdmin) return;
    const currentName = document.getElementById('display-president-name').innerText;
    const currentGuild = document.getElementById('display-guild-name').innerText;

    const newName = prompt("Enter New President Name:", currentName);
    if (newName === null) return;
    const newGuild = prompt("Enter New Guild Name:", currentGuild);
    if (newGuild === null) return;

    if (newName.trim() === "" || newGuild.trim() === "") {
        showToast("Name and Guild cannot be empty!", "warning");
        return;
    }

    const client = getSupabase();
    if (!client) return;

    const { error } = await client
        .from('footer_settings')
        .upsert({ 
            id: 'main', 
            president_name: newName.trim(), 
            guild_name: newGuild.trim(),
            updated_at: new Date().toISOString()
        });

    if (!error) {
        localStorage.setItem('cached_president_name', newName.trim());
        localStorage.setItem('cached_guild_name', newGuild.trim());
        loadFooterInfo();
        showToast("President info updated globally!", "success");
    } else {
        showToast("Failed to update database.", "error");
    }
}

function handleAdminLogin() {
    const editFooterBtn = document.getElementById('edit-footer-btn');
    const toggleResBtn = document.getElementById('toggle-reservation-btn'); 
    const finishSvsBtn = document.getElementById('finish-svs-btn'); 

    if (!isAdmin) {
        const password = prompt("Enter President Password:");
        if (password === "3475") { 
            isAdmin = true;
            sessionStorage.setItem('isPresidentMode', 'true'); 
            document.getElementById('admin-toggle-btn').innerText = "Logout President";
            document.getElementById('admin-indicator').style.display = "inline";
            if (editFooterBtn) editFooterBtn.style.display = "inline-block";
            if (toggleResBtn) toggleResBtn.style.display = "inline-block"; 
            if (finishSvsBtn) finishSvsBtn.style.display = "inline-block"; 
            showToast("Welcome back President!", "success");
        } else {
            showToast("Incorrect password!", "error");
            return;
        }
    } else {
        isAdmin = false;
        sessionStorage.removeItem('isPresidentMode'); 
        document.getElementById('admin-toggle-btn').innerText = "President Login";
        document.getElementById('admin-indicator').style.display = "none";
        if (editFooterBtn) editFooterBtn.style.display = "none";
        if (toggleResBtn) toggleResBtn.style.display = "none"; 
        if (finishSvsBtn) finishSvsBtn.style.display = "none"; 
        showToast("Logged out from President Mode.", "info");
    }
    loadApplications();
}

function showSchedule(positionName) {
    currentPosition = positionName;
    document.getElementById('positions-page').classList.add('hidden');
    document.getElementById('schedule-page').classList.remove('hidden');
    document.getElementById('selected-title').innerText = positionName;
    detectAndSetTimezone();
    
    checkReservationStatus().then(() => {
        loadApplications();
    });
}

function detectAndSetTimezone() {
    const selector = document.getElementById('timezone');
    if (!selector) return;
    selector.innerHTML = "";

    const tzLabels = {
        "-12": "Kwajalein", "-11": "Midway Island", "-10": "Hawaii", "-9": "Alaska", 
        "-8": "Pacific Time", "-7": "Mountain Time", "-6": "Central Time", 
        "-5": "Eastern Time", "-4": "Atlantic Time", "-3.5": "Newfoundland", 
        "-3": "Buenos Aires", "-2": "Mid-Atlantic", "-1": "Azores", 
        "0": "GMT / UTC", "1": "Berlin, Paris", "2": "Cairo, Johannesburg", 
        "3": "Moscow, Nairobi", "3.5": "Tehran", "4": "Dubai", 
        "4.5": "Kabul", "5": "Karachi", "5.5": "New Delhi", 
        "5.75": "Kathmandu", "6": "Dhaka", "6.5": "Yangon", 
        "7": "Jakarta, WIB", "8": "Singapore, WITA", "9": "Tokyo, WIT", 
        "9.5": "Darwin", "10": "Sydney", "10.5": "Lord Howe",
        "11": "Solomon Is.", "11.5": "Norfolk Is.", "12": "Auckland, Fiji", 
        "12.75": "Chatham Is.", "13": "Tonga", "14": "Kiritimati"
    };

    const offsets = [
        -12, -11, -10, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 
        1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.75, 13, 14
    ];

    const userOffsetMinutes = new Date().getTimezoneOffset();
    const userOffsetHours = parseFloat((-(userOffsetMinutes / 60)).toFixed(2));
    let exactMatchFound = false;

    offsets.forEach(offset => {
        const option = document.createElement('option');
        option.value = offset;
        const sign = offset >= 0 ? "+" : "-";
        const absOffset = Math.abs(offset);
        const hours = Math.floor(absOffset);
        const minutes = Math.round((absOffset % 1) * 60);
        const timeString = `UTC ${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        const label = tzLabels[String(offset)] ? ` (${tzLabels[String(offset)]})` : "";
        option.text = `${timeString}${label}`;

        if (Math.abs(offset - userOffsetHours) < 0.1) {
            option.selected = true;
            exactMatchFound = true;
        }
        selector.add(option);
    });

    if (!exactMatchFound) {
        const sign = userOffsetHours >= 0 ? "+" : "-";
        const absOffset = Math.abs(userOffsetHours);
        const hours = Math.floor(absOffset);
        const minutes = Math.round((absOffset % 1) * 60);
        const customOption = document.createElement('option');
        customOption.value = userOffsetHours;
        customOption.text = `UTC ${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} (Your Location)`;
        customOption.selected = true;
        selector.insertBefore(customOption, selector.firstChild);
    }
}

function showPositions() {
    document.getElementById('schedule-page').classList.add('hidden');
    document.getElementById('positions-page').classList.remove('hidden');
}

async function loadApplications() {
    const client = getSupabase();
    if (!client) return;
    try {
        const { data, error } = await client.from('reservation_slots').select('*').eq('position', currentPosition);
        if (error) throw error;
        savedApplications = data || [];
    } catch (e) {
        console.error("Database failure:", e);
        savedApplications = [];
    }
    renderTimeSlots();
}

function renderTimeSlots() {
    const tbody = document.getElementById('schedule-table-body');
    if (!tbody) return;
    const offset = parseFloat(document.getElementById('timezone').value);
    tbody.innerHTML = "";

    for (let i = 0; i < 48; i++) {
        let totalMinutes = i * 30;
        let utcH = Math.floor(totalMinutes / 60);
        let utcM = totalMinutes % 60;
        let utcTimeStr = `${String(utcH).padStart(2, '0')}:${String(utcM).padStart(2, '0')}`;

        let totalLocalMinutes = totalMinutes + Math.round(offset * 60);
        let localH = Math.floor(totalLocalMinutes / 60) % 24;
        if (localH < 0) localH += 24;
        let localM = totalLocalMinutes % 60;
        if (localM < 0) localM += 60;
        let localTimeStr = `${String(localH).padStart(2, '0')}:${String(localM).padStart(2, '0')}`;

        let appsInSlot = savedApplications.filter(a => String(a.time_slot).trim() === utcTimeStr);
        let acceptedApp = appsInSlot.find(a => a.status === 'Accepted');
        let countWaiting = appsInSlot.filter(a => a.status === 'Waiting').length;

        const row = document.createElement('tr');
        if (acceptedApp) {
            let detailBtn = `<span style="cursor:pointer; font-size: 1rem; vertical-align: middle;" title="View Details" onclick="openDetailsModal(${acceptedApp.id})">🔍</span>`;
            let actionBtn = isAdmin
                ? `<div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                     ${detailBtn}
                     <button class="btn-apply btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeApp(${acceptedApp.id})">Remove</button>
                   </div>`
                : detailBtn;

            row.innerHTML = `
                <td>${actionBtn}</td>
                <td><strong>${utcTimeStr} UTC</strong><br><small style="color:#8a8d98;">Local: ${localTimeStr}</small></td>
                <td><span style="color:#22c55e; font-weight:bold;">Accepted</span></td>
                <td>${acceptedApp.nickname}</td>
                <td><span style="cursor:pointer; color:#3b82f6; text-decoration:underline;" onclick="copyToClipboard('${acceptedApp.game_id}')">${acceptedApp.game_id}</span></td>
            `;
        } else {
            let actionBtn = `<button class="btn-apply" onclick="applySlot('${utcTimeStr}')">Apply</button>`;
            let statusText = '<span class="no-apps">No Applications</span>';
            if (countWaiting > 0) {
                statusText = `<span style="color:#f59e0b; font-weight:bold; cursor:pointer; text-decoration:underline;" onclick="openWaitingModal('${utcTimeStr}')">Waiting (${countWaiting})</span>`;
            }
            row.innerHTML = `
                <td>${actionBtn}</td>
                <td><strong>${utcTimeStr} UTC</strong><br><small style="color:#8a8d98;">Local: ${localTimeStr}</small></td>
                <td>${statusText}</td>
                <td>-</td>
                <td>-</td>
            `;
        }
        tbody.appendChild(row);
    }
}

// Fungsi untuk membuka pop-up modal detail
function openDetailsModal(appId) {
    const app = savedApplications.find(a => a.id === appId);
    if (!app) return;

    const modal = document.getElementById('details-modal');
    const contentEl = document.getElementById('details-content');
    
    contentEl.innerHTML = `
        <div><span style="color:#8a8d98;">Nickname:</span> <strong style="color:#f1f5f9;">${app.nickname || '-'}</strong></div>
        <div><span style="color:#8a8d98;">Game ID:</span> <strong style="color:#3b82f6;">${app.game_id || '-'}</strong></div>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 4px 0;">
        <div><span style="color:#8a8d98;">Fire Crystals (FC):</span> <strong style="color:#f59e0b;">${app.fire_crystal || '0'}</strong></div>
        <div><span style="color:#8a8d98;">Refined Fire Crystals (RFC):</span> <strong style="color:#f59e0b;">${app.refined_fire_crystal || '0'}</strong></div>
        <div><span style="color:#8a8d98;">General Speedup:</span> <strong style="color:#f1f5f9;">${app.general_speedup || '0'} Days</strong></div>
        <div><span style="color:#8a8d98;">Construction Speedup:</span> <strong style="color:#f1f5f9;">${app.construction_speedup || '0'} Days</strong></div>
        <div><span style="color:#8a8d98;">Research Speedup:</span> <strong style="color:#f1f5f9;">${app.research_speedup || '0'} Days</strong></div>
        <div><span style="color:#8a8d98;">Training Speedup:</span> <strong style="color:#f1f5f9;">${app.training_speedup || '0'} Days</strong></div>
    `;
    
    modal.classList.remove('hidden');
}

function closeDetailsModal() {
    document.getElementById('details-modal').classList.add('hidden');
}

function openWaitingModal(timeStr) {
    const modal = document.getElementById('waiting-modal');
    if (!modal) return;
    
    document.getElementById('modal-title').innerText = `Waiting List - ${timeStr} UTC`;
    const modalTbody = document.getElementById('modal-table-body');
    modalTbody.innerHTML = "";

    const thead = modal.querySelector('thead tr');
    thead.innerHTML = `
        <th style="padding: 5px 10px; text-align: left;">NICKNAME</th>
        <th style="padding: 5px 10px; text-align: left;">ID</th>
    `;

    let appsInSlot = savedApplications.filter(a => String(a.time_slot).trim() === timeStr && a.status === 'Waiting');

    appsInSlot.forEach(app => {
        const mainRow = document.createElement('tr');
        let adminButtons = isAdmin ? `
            <div style="margin-top: 4px;">
                <button class="btn-apply" style="background:#22c55e; font-size:0.65rem; padding:1px 4px; margin-right:4px; animation: none;" onclick="acceptApp(${app.id})">Accept</button>
                <button class="btn-apply btn-danger" style="font-size:0.65rem; padding:1px 4px;" onclick="removeApp(${app.id})">Drop</button>
            </div>
        ` : '';

        mainRow.innerHTML = `
            <td style="padding: 5px 10px; text-align: left; font-weight: 500; white-space: nowrap;">
                <span style="cursor:pointer; margin-right: 6px;" onclick="toggleDetails(${app.id})">🔍</span>${app.nickname}
            </td>
            <td style="padding: 5px 10px; text-align: left; white-space: nowrap;">
                <span style="cursor:pointer; color:#3b82f6; text-decoration:underline;" onclick="copyToClipboard('${app.game_id}')">${app.game_id}</span>
                ${adminButtons}
            </td>
        `;
        modalTbody.appendChild(mainRow);

        const detailsRow = document.createElement('tr');
        detailsRow.id = `details-${app.id}`;
        detailsRow.style.display = 'none'; 
        detailsRow.innerHTML = `
            <td colspan="2" style="padding: 0; border: none;">
                <div style="background: #151821; padding: 8px; margin: 2px 5px; border-radius: 4px; font-size: 0.8rem; text-align: left; border: 1px solid #334155;">
                    <div><span style="color:#8a8d98; margin-right: 10px;">FC:</span> <strong style="color:#f59e0b;">${app.fire_crystal || '0'}</strong></div>
                    <div><span style="color:#8a8d98; margin-right: 10px;">RFC:</span> <strong style="color:#f59e0b;">${app.refined_fire_crystal || '0'}</strong></div>
                    <div><span style="color:#8a8d98; margin-right: 10px;">General:</span> <strong style="color:#f1f5f9;">${app.general_speedup || '0'}</strong></div>
                    <div><span style="color:#8a8d98; margin-right: 10px;">Const:</span> <strong style="color:#f1f5f9;">${app.construction_speedup || '0'}</strong></div>
                    <div><span style="color:#8a8d98; margin-right: 10px;">Research:</span> <strong style="color:#f1f5f9;">${app.research_speedup || '0'}</strong></div>
                    <div><span style="color:#8a8d98; margin-right: 10px;">Train:</span> <strong style="color:#f1f5f9;">${app.training_speedup || '0'}</strong></div>
                </div>
            </td>
        `;
        modalTbody.appendChild(detailsRow);
    });
    
    modal.classList.remove('hidden');
}

function toggleDetails(id) {
    const detailsRow = document.getElementById(`details-${id}`);
    if (detailsRow) {
        detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
    }
}

function closeModal() {
    document.getElementById('waiting-modal').classList.add('hidden');
}

function applySlot(time) {
    if (!isReservationOpen) {
        showToast("This day reservation still locked for now", "error");
        return; 
    }

    selectedTimeSlot = time;
    document.getElementById('form-position-title').innerText = currentPosition;
    document.getElementById('form-time-title').innerText = time + " UTC";
    
    document.getElementById('input-nickname').value = "";
    document.getElementById('input-gameid').value = "";
    document.getElementById('input-fc').value = "";
    document.getElementById('input-rfc').value = "";
    document.getElementById('input-gensp').value = "";
    document.getElementById('input-constsp').value = "";
    document.getElementById('input-ressp').value = "";
    document.getElementById('input-trainsp').value = "";

    const groupFc = document.getElementById('input-fc').closest('.form-group');
    const groupRfc = document.getElementById('input-rfc').closest('.form-group');
    const groupConst = document.getElementById('input-constsp').closest('.form-group');
    const groupRes = document.getElementById('input-ressp').closest('.form-group');
    const groupTrain = document.getElementById('input-trainsp').closest('.form-group');

    groupFc.classList.remove('hidden');
    groupRfc.classList.remove('hidden');
    groupConst.classList.remove('hidden');
    groupRes.classList.remove('hidden');
    groupTrain.classList.remove('hidden');

    if (currentPosition === 'Vice President D1') {
        groupRes.classList.add('hidden');
        groupTrain.classList.add('hidden');
    } 
    else if (currentPosition === 'Vice President D5') {
        groupTrain.classList.add('hidden');
    } 
    else if (currentPosition === 'Vice President D2') {
        groupFc.classList.add('hidden');
        groupRfc.classList.add('hidden');
        groupConst.classList.add('hidden');
        groupTrain.classList.add('hidden');
    } 
    else if (currentPosition === 'Minister of Education D4') {
        groupFc.classList.add('hidden');
        groupRfc.classList.add('hidden');
        groupConst.classList.add('hidden');
        groupRes.classList.add('hidden');
    }
    
    document.getElementById('apply-modal').classList.remove('hidden');
}

function closeApplyModal() {
    document.getElementById('apply-modal').classList.add('hidden');
}

async function submitApplication() {
    if (!isReservationOpen) {
        showToast("This day reservation still locked for now", "error");
        return;
    }

    const client = getSupabase();
    if (!client) return;

    const nickname = document.getElementById('input-nickname').value.trim();
    const gameId = document.getElementById('input-gameid').value.trim();
    const fc = parseInt(document.getElementById('input-fc').value.trim()) || 0;
    const rfc = parseInt(document.getElementById('input-rfc').value.trim()) || 0;
    const genSp = parseInt(document.getElementById('input-gensp').value.trim()) || 0;
    const constSp = parseInt(document.getElementById('input-constsp').value.trim()) || 0;
    const resSp = parseInt(document.getElementById('input-ressp').value.trim()) || 0;
    const trainSp = parseInt(document.getElementById('input-trainsp').value.trim()) || 0;

    if (!nickname) { showToast("Please enter In-Game Nickname!", "warning"); return; }
    if (!gameId) { showToast("Please enter In-Game ID!", "warning"); return; }

    const { error } = await client
        .from('reservation_slots')
        .insert({ 
            time_slot: selectedTimeSlot, position: currentPosition, nickname: nickname, game_id: gameId, 
            fire_crystal: fc, refined_fire_crystal: rfc, general_speedup: genSp, construction_speedup: constSp, research_speedup: resSp, training_speedup: trainSp,
            status: 'Waiting'
        });

    if (!error) {
        showToast("Application submitted successfully!", "success");
        closeApplyModal();
        loadApplications();
    } else {
        showToast("Database error: " + error.message, "error");
    }
}

async function acceptApp(id) {
    showCustomConfirm("Accept this application? This will lock this time slot.", async () => {
        const client = getSupabase();
        if (!client) return;
        closeModal(); 
        const { error } = await client.from('reservation_slots').update({ status: 'Accepted' }).eq('id', id);
        if (!error) {
            showToast("Application Approved!", "success");
            loadApplications();
            loadRecentAccepts(); 
        } else {
            showToast("Failed to approve.", "error");
        }
    }, '#22c55e');
}

async function removeApp(id) {
    showCustomConfirm("Delete this application record permanently?", async () => {
        const client = getSupabase();
        if (!client) return;
        closeModal(); 
        const { error } = await client.from('reservation_slots').delete().eq('id', id);
        if (!error) {
            showToast("Record dropped successfully.", "success");
            loadApplications();
            loadRecentAccepts(); 
        } else {
            showToast("Failed executing delete request.", "error");
        }
    }, '#ef4444');
}

function exportToCSV() {
    if (savedApplications.length === 0) {
        showToast("No data available to export!", "warning");
        return;
    }
    const headers = ["Position", "Time Slot UTC", "Status", "Nickname", "Game ID", "Fire Crystal", "Refined Fire Crystal", "General SP (Days)", "Construction SP (Days)", "Research SP (Days)", "Training SP (Days)"];
    const rows = savedApplications.map(app => [
        `"${app.position}"`, `"${app.time_slot}"`, `"${app.status}"`,
        `"${app.nickname || '-'}"`, `"${app.game_id || '-'}"`, `"${app.fire_crystal || '0'}"`,
        `"${app.refined_fire_crystal || '0'}"`,
        `"${app.general_speedup || '0'}"`, `"${app.construction_speedup || '0'}"`,
        `"${app.research_speedup || '0'}"`, `"${app.training_speedup || '0'}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SVS_Ministry_Export_${currentPosition.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV File downloaded successfully!", "success");
}

async function handleFinishSVS() {
    if (!isAdmin) return;
    const client = getSupabase();
    if (!client) return;

    showCustomConfirm("Caution to finish SVS!\n Are you sure ?, this will be reset all applied data", async () => {
        try {
            const { error } = await client.from('reservation_slots').delete().neq('id', 0); 
            if (!error) {
                showToast("All record has been cleared.", "success");
                loadApplications();
                loadRecentAccepts(); 
            } else { throw error; }
        } catch (err) {
            showToast("Fail to clear data: " + err.message, "error");
        }
    }, '#dc2626'); 
}

function startLiveClock() {
    const localClockEl = document.getElementById('local-clock');
    const localLabelEl = document.getElementById('local-clock-label');
    const utcClockEl = document.getElementById('utc-clock');
    const timezoneSelect = document.getElementById('timezone');

    if (!localClockEl || !utcClockEl || !localLabelEl) return;

    setInterval(() => {
        const now = new Date();
        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
        const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
        utcClockEl.innerText = `${utcHours}:${utcMinutes}:${utcSeconds}`;

        const schedulePage = document.getElementById('schedule-page');
        const isScheduleVisible = schedulePage && !schedulePage.classList.contains('hidden');

        if (isScheduleVisible && timezoneSelect && timezoneSelect.value !== "") {
            const offset = parseFloat(timezoneSelect.value); 
            const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
            const targetTime = new Date(utcTime + (3600000 * offset));

            const displayHours = String(targetTime.getHours()).padStart(2, '0');
            const displayMinutes = String(targetTime.getMinutes()).padStart(2, '0');
            const displaySeconds = String(targetTime.getSeconds()).padStart(2, '0');
            
            const sign = offset >= 0 ? "+" : "-";
            const absOffset = Math.abs(offset);
            const hours = Math.floor(absOffset); 
            const minutes = Math.round((absOffset - hours) * 60); 
            
            if (minutes > 0) {
                localLabelEl.innerText = `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:`;
            } else {
                localLabelEl.innerText = `UTC${sign}${String(hours).padStart(2, '0')}:`;
            }
            localClockEl.innerText = `${displayHours}:${displayMinutes}:${displaySeconds}`;
        } else {
            localLabelEl.innerText = "LOCAL:";
            localClockEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        }
    }, 1000);
}

async function loadRecentAccepts() {
    const logListEl = document.getElementById('recent-log-list');
    if (!logListEl) return;
    const client = getSupabase();
    if (!client) return;

    try {
        const { data, error } = await client
            .from('reservation_slots')
            .select('nickname, position, time_slot, updated_at') 
            .eq('status', 'Accepted')
            .not('nickname', 'is', null)
            .neq('nickname', '')
            .order('updated_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        if (!data || data.length === 0) {
            logListEl.innerHTML = `<div class="log-item-empty">No recent activity</div>`;
            return;
        }
        logListEl.innerHTML = ''; 
        data.forEach(item => {
            let shortPos = item.position ? item.position.replace('Vice President', 'VP').replace('Minister of Education', 'Edu') : 'Unknown';
            const logRow = document.createElement('div');
            logRow.className = 'log-entry';
            logRow.innerHTML = `
                <span>✅ <span class="log-user">${item.nickname}</span> <span style="color: #8a8d98; font-size: 0.95em; margin-left: 5px;">${item.time_slot} UTC</span></span>
                <span class="log-pos">[${shortPos}]</span>
            `;
            logListEl.appendChild(logRow);
        });
    } catch (err) { console.error(err); }
}

// ================= SNOWFLAKE EFFECT =================
function createSnowEffect() {
    const maxSnowflakes = 30; 
    if (document.querySelectorAll('.snowflake').length >= maxSnowflakes) return;

    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.style.left = Math.random() * 100 + 'vw';

    const size = Math.random() * 3 + 2 + 'px';
    snowflake.style.width = size;
    snowflake.style.height = size;

    const durationSeconds = Math.random() * 5 + 10; 
    snowflake.style.animationDuration = durationSeconds + 's';
    snowflake.style.opacity = Math.random() * 0.5 + 0.2;

    document.body.appendChild(snowflake);

    setTimeout(() => {
        snowflake.remove();
    }, durationSeconds * 1000);
}
setInterval(createSnowEffect, 200);
// ======================================================