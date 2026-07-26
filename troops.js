// ================= SUPABASE PUBLIC CONFIGURATION =================
const SUPABASE_URL = 'https://pwqkpeykjyujhnreleax.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWtwZXlranl1amhucmVsZWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzgxNDgsImV4cCI6MjA5ODgxNDE0OH0.6u2CKOPHcMtVeA2ph0QWTqgtvs-4BQJpsz6v2kCyOEY'; 
// =================================================================

let supabaseClient = null;
let isAdmin = false;
let currentAlliance = 'ARX';
let loadedTroopsData = [];

document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('isPresidentMode') === 'true') {
        isAdmin = true;
        updateAdminUI(); 
    }
    
    loadFooterInfo();
    startLiveClock();
    
    setInterval(() => {
        loadFooterInfo(); 
    }, 30000);
});

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

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`ID ${text} copied to clipboard!`, "success");
    }).catch(err => {
        showToast("Failed to copy", "error");
    });
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

function updateAdminUI() {
    const adminBtn = document.getElementById('admin-toggle-btn');
    const adminInd = document.getElementById('admin-indicator');

    if (adminBtn) adminBtn.innerText = "Logout President";
    if (adminInd) adminInd.style.display = "inline";
}

function handleAdminLogin() {
    if (!isAdmin) {
        const password = prompt("Enter President Password:");
        if (password === "3475") { 
            isAdmin = true;
            sessionStorage.setItem('isPresidentMode', 'true'); 
            updateAdminUI();
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
        showToast("Logged out from President Mode.", "info");
    }
    renderTroopsTable();
}

// ================= ALIANSI & NAVIGASI =================
function selectAlliance(alliance) {
    currentAlliance = alliance;
    document.getElementById('alliance-menu-page').classList.add('hidden');
    document.getElementById('troops-table-page').classList.remove('hidden');

    const titleEl = document.getElementById('selected-alliance-title');
    if (alliance === 'ALL') {
        titleEl.innerText = "All Troops Power (Global)";
    } else {
        titleEl.innerText = `${alliance} Alliance Troops Power`;
    }

    fetchTroopsData();
}

function showAllianceMenu() {
    document.getElementById('troops-table-page').classList.add('hidden');
    document.getElementById('alliance-menu-page').classList.remove('hidden');
}

// ================= LOAD & RENDER DATA =================
async function fetchTroopsData() {
    const client = getSupabase();
    if (!client) return;

    try {
        let query = client.from('troops_power').select('*').order('troops_power', { ascending: false });
        
        // Filter jika memilih Aliansi Spesifik
        if (currentAlliance !== 'ALL') {
            query = query.eq('alliance', currentAlliance);
        }

        const { data, error } = await query;
        if (error) throw error;

        loadedTroopsData = data || [];
        renderTroopsTable();
    } catch (err) {
        console.error("Error fetching troops data:", err);
        showToast("Failed to load troops data.", "error");
    }
}

function renderTroopsTable() {
    const tbody = document.getElementById('troops-table-body');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (loadedTroopsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; color: #8a8d98;">No player data available. Click "+ Add Player Power" to add.</td></tr>`;
        return;
    }

    loadedTroopsData.forEach((player, index) => {
        const row = document.createElement('tr');
        
        // Format Angka Troops Power dengan Koma (Contoh: 150,000,000)
        const formattedPower = Number(player.troops_power).toLocaleString('en-US');

        let actionHtml = `
            <button class="btn-apply btn-danger" style="padding: 3px 6px; font-size: 0.7rem;" onclick="deletePlayerData(${player.id})">Delete</button>
        `;

        row.innerHTML = `
            <td><strong style="color: ${index < 3 ? '#f59e0b' : '#f1f5f9'};">#${index + 1}</strong></td>
            <td><span style="background: #1e2230; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #3b82f6;">${player.alliance}</span></td>
            <td><strong>${player.nickname}</strong></td>
            <td><span style="cursor:pointer; color:#3b82f6; text-decoration:underline;" onclick="copyToClipboard('${player.game_id}')">${player.game_id}</span></td>
            <td><strong style="color: #22c55e;">${formattedPower}</strong></td>
            <td>${actionHtml}</td>
        `;

        tbody.appendChild(row);
    });
}

// ================= MODAL & INPUT DATA =================
function openAddModal() {
    document.getElementById('input-nickname').value = "";
    document.getElementById('input-gameid').value = "";
    document.getElementById('input-power').value = "";

    const allianceLabel = document.getElementById('form-alliance-label');
    const allianceSelectGroup = document.getElementById('group-alliance-select');

    if (currentAlliance === 'ALL') {
        allianceLabel.innerText = "Select below";
        allianceSelectGroup.style.display = "flex";
    } else {
        allianceLabel.innerText = currentAlliance;
        allianceSelectGroup.style.display = "none";
        document.getElementById('input-alliance').value = currentAlliance;
    }

    document.getElementById('add-modal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('add-modal').classList.add('hidden');
}

async function submitPlayerData() {
    const client = getSupabase();
    if (!client) return;

    const alliance = currentAlliance === 'ALL' ? document.getElementById('input-alliance').value : currentAlliance;
    const nickname = document.getElementById('input-nickname').value.trim();
    const gameId = document.getElementById('input-gameid').value.trim();
    const power = parseInt(document.getElementById('input-power').value.trim()) || 0;

    if (!nickname) { showToast("Please enter Nickname!", "warning"); return; }
    if (!gameId) { showToast("Please enter Game ID!", "warning"); return; }
    if (power <= 0) { showToast("Please enter valid Troops Power!", "warning"); return; }

    const { error } = await client.from('troops_power').insert({
        alliance: alliance,
        nickname: nickname,
        game_id: gameId,
        troops_power: power
    });

    if (!error) {
        showToast("Player power added successfully!", "success");
        closeAddModal();
        fetchTroopsData();
    } else {
        showToast("Error inserting data: " + error.message, "error");
    }
}

function deletePlayerData(id) {
    showCustomConfirm("Are you sure you want to delete this player entry?", async () => {
        const client = getSupabase();
        if (!client) return;

        const { error } = await client.from('troops_power').delete().eq('id', id);

        if (!error) {
            showToast("Player data removed.", "success");
            fetchTroopsData();
        } else {
            showToast("Failed to delete player.", "error");
        }
    }, '#ef4444');
}

// ================= EXPORT CSV =================
function exportToCSV() {
    if (loadedTroopsData.length === 0) {
        showToast("No data to export!", "warning");
        return;
    }

    const headers = ["Rank", "Alliance", "Nickname", "Game ID", "Troops Power"];
    const rows = loadedTroopsData.map((p, idx) => [
        `"${idx + 1}"`,
        `"${p.alliance}"`,
        `"${p.nickname}"`,
        `"${p.game_id}"`,
        `"${p.troops_power}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `3475_Troops_Power_${currentAlliance}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Downloaded successfully!", "success");
}

// ================= FOOTER & CLOCK =================
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
        const { data } = await client.from('footer_settings').select('president_name, guild_name').eq('id', 'main').single();
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
    } catch (err) {}
}

function startLiveClock() {
    const localClockEl = document.getElementById('local-clock');
    const utcClockEl = document.getElementById('utc-clock');
    if (!localClockEl || !utcClockEl) return;

    setInterval(() => {
        const now = new Date();
        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
        const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
        utcClockEl.innerText = `${utcHours}:${utcMinutes}:${utcSeconds}`;

        localClockEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }, 1000);
}

// ================= EFEK SALJU =================
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