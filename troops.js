// ================= SUPABASE PUBLIC CONFIGURATION =================
const SUPABASE_URL = 'https://pwqkpeykjyujhnreleax.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cWtwZXlranl1amhucmVsZWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzgxNDgsImV4cCI6MjA5ODgxNDE0OH0.6u2CKOPHcMtVeA2ph0QWTqgtvs-4BQJpsz6v2kCyOEY'; 
// =================================================================

// ================= SECURITY HELPERS =================
// Escapes a value for safe insertion into innerHTML, including inside
// single- or double-quoted HTML attributes (covers onclick="...'${x}'...").
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Lets any element marked role="button" (used for the non-<button> clickable
// cards/rows in this app) be activated with the keyboard, not just a mouse.
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches('[role="button"]')) {
        e.preventDefault();
        e.target.click();
    }
});

// Supabase Auth requires an email address, but this app only wants a plain
// username + password. We transparently map "username" -> "username@<this>"
// under the hood. Pick something clearly fake/internal so it can never
// collide with a real staff email domain.
const STAFF_EMAIL_DOMAIN = '@3475-staff.internal';

function usernameToStaffEmail(username) {
    return username.trim().toLowerCase().replace(/\s+/g, '') + STAFF_EMAIL_DOMAIN;
}

function staffEmailToUsername(email) {
    return (email || '').endsWith(STAFF_EMAIL_DOMAIN)
        ? email.slice(0, -STAFF_EMAIL_DOMAIN.length)
        : email;
}

// ================= STAFF ROLE / PERMISSION CONFIG =================
// IMPORTANT: this is a CLIENT-SIDE UI restriction only. It decides what
// buttons/actions each signed-in username *sees*, so people without the
// right role don't accidentally poke at things they shouldn't. It is NOT a
// real security boundary — anyone could open devtools and call the Supabase
// client directly, bypassing all of this. Real protection has to come from
// Row Level Security (RLS) policies on the `troops_power` / `footer_settings`
// tables in Supabase (e.g. checking a role claim tied to auth.uid()). Set up
// matching RLS rules on the Supabase side so this UI restriction is actually
// backed up by one the database enforces.
//
// scope:
//   'full'     -> full access, every alliance + both legions (fallback for
//                 any signed-in username not listed below, so existing staff
//                 keep working exactly as before)
//   'alliance' -> can only add/edit/delete players in the alliance(s) listed
//   'legion'   -> can only set schedule / manage rosters for the legion(s) listed
//   'none'     -> signed in, but no edit rights anywhere (view-only)
//
// Usernames are matched case-insensitively. Add more usernames below as needed.
const STAFF_ROLES = {
    'idn':   { scope: 'alliance', alliances: ['IDN'] },
    'arx':   { scope: 'alliance', alliances: ['ARX'] },
    'vnx':   { scope: 'alliance', alliances: ['VNX'] },
    'zxc':   { scope: 'alliance', alliances: ['ZXC'] },
    'cat':   { scope: 'alliance', alliances: ['CAT'] },
    'tal':   { scope: 'legion', legions: ['Legion 1', 'Legion 2'] },
    'demon': { scope: 'legion', legions: ['Legion 1', 'Legion 2'] },
};

const ALL_ALLIANCES = ['ARX', 'IDN', 'VNX', 'ZXC', 'CAT'];
const ALL_LEGIONS = ['Legion 1', 'Legion 2'];
const FULL_ACCESS_ROLE = { scope: 'full', alliances: ALL_ALLIANCES, legions: ALL_LEGIONS };

let currentUserRole = null; // computed on login / session restore

function getRoleForUsername(username) {
    if (!username) return null;
    const found = STAFF_ROLES[username.trim().toLowerCase()];
    return found || FULL_ACCESS_ROLE;
}

// Can this staff member add/edit/delete players belonging to `allianceCode`?
function canEditAlliance(allianceCode) {
    if (!isAdmin || !currentUserRole) return false;
    if (currentUserRole.scope === 'full') return true;
    if (currentUserRole.scope === 'alliance') return (currentUserRole.alliances || []).includes(allianceCode);
    return false;
}

// Can this staff member set the schedule / manage the roster of `legionName`?
function canManageLegion(legionName) {
    if (!isAdmin || !currentUserRole) return false;
    if (currentUserRole.scope === 'full') return true;
    if (currentUserRole.scope === 'legion') return (currentUserRole.legions || []).includes(legionName);
    return false;
}

// The list of alliances this staff member is allowed to add/edit players in
// right now — used to populate the "Select Alliance" dropdown and to decide
// whether the "+ Add Player Power" button should show at all.
function getMyEditableAlliances() {
    if (!isAdmin || !currentUserRole) return [];
    if (currentUserRole.scope === 'full') return ALL_ALLIANCES;
    if (currentUserRole.scope === 'alliance') return currentUserRole.alliances || [];
    return [];
}

function populateAllianceSelectOptions(list) {
    const el = document.getElementById('input-alliance');
    if (!el) return;
    el.innerHTML = list.map(a => `<option value="${a}">${a}</option>`).join('');
}

let supabaseClient = null;
let isAdmin = false;
let currentStaffUsername = null;
let viewMode = 'ALLIANCE'; // 'ALLIANCE' or 'LEGION'
let currentSelection = 'ARX'; // Alliance name or 'Legion 1' / 'Legion 2'
let loadedTroopsData = [];
let editingPlayerId = null;
let editingPlayerOriginalAlliance = null; // the alliance the player belonged to when Edit was opened
let editingScheduleLegion = null;

// ================= SEARCH / SORT / PAGINATION STATE =================
let searchQuery = '';
let currentSortField = null; // null = use default fetch order
let currentSortDirection = 'asc';
let currentPage = 1;
const PAGE_SIZE = 25;
let lastUpdatedAt = null;
let isTableLoading = false;

// ================= SNOWFALL TOGGLE STATE =================
let snowEnabled = localStorage.getItem('snowEnabled') !== 'false'; // default: on
let snowIntervalId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const client = getSupabase();
    if (client) {
        // Restore session from Supabase's own (encrypted, HttpOnly-adjacent) storage
        // instead of trusting a plain sessionStorage flag anyone could set by hand.
        const { data: { session } } = await client.auth.getSession();
        applyAuthSession(session);

        // Keep isAdmin in sync if the session refreshes, expires, or the user
        // signs in/out in another tab.
        client.auth.onAuthStateChange((_event, session) => {
            applyAuthSession(session);
            fetchData();
        });
    }

    loadFooterInfo();
    loadLegionSchedules();
    startLiveClock();
    updateSnowToggleUI();
    if (snowEnabled) startSnowEffect();

    const tableBody = document.getElementById('troops-table-body');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const copyEl = e.target.closest('.js-copy-gameid');
            if (copyEl) { copyToClipboard(copyEl.dataset.gameid); return; }

            const editEl = e.target.closest('.js-edit-player');
            if (editEl) { openEditModal(Number(editEl.dataset.id)); return; }

            const deleteEl = e.target.closest('.js-delete-player');
            if (deleteEl) { deletePlayerData(Number(deleteEl.dataset.id)); return; }

            const toggleEl = e.target.closest('.js-toggle-role');
            if (toggleEl) { toggleLegionRole(Number(toggleEl.dataset.id), toggleEl.dataset.role); return; }

            const removeEl = e.target.closest('.js-remove-legion');
            if (removeEl) { removeFromLegion(Number(removeEl.dataset.id)); return; }
        });
    }

    const loginPasswordInput = document.getElementById('input-login-password');
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitStaffLogin();
        });
    }

    setInterval(() => {
        loadFooterInfo(); 
        loadLegionSchedules();
    }, 30000);
});

function applyAuthSession(session) {
    isAdmin = !!session;
    currentStaffUsername = session ? staffEmailToUsername(session.user.email) : null;
    currentUserRole = isAdmin ? getRoleForUsername(currentStaffUsername) : null;
    if (isAdmin) {
        updateAdminUI();
    } else {
        resetAdminUI();
    }
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

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`ID ${text} copied to clipboard!`, "success");
        }).catch(() => {
            showToast("Failed to copy", "error");
        });
        return;
    }

    // Fallback for browsers/contexts without the async Clipboard API.
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) {
            showToast(`ID ${text} copied to clipboard!`, "success");
        } else {
            showToast("Failed to copy", "error");
        }
    } catch (err) {
        showToast("Failed to copy", "error");
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

function updateAdminUI() {
    const adminBtn = document.getElementById('admin-toggle-btn');
    const adminInd = document.getElementById('admin-indicator');

    if (adminBtn) {
        adminBtn.innerText = currentStaffUsername ? `Logout (${currentStaffUsername.toUpperCase()})` : "Logout";
    }

    if (adminInd) {
        adminInd.style.display = "inline";
        let modeLabel = "(ALLIANCE STAFF MODE)";
        if (currentUserRole) {
            if (currentUserRole.scope === 'full') modeLabel = "(FULL ACCESS STAFF)";
            else if (currentUserRole.scope === 'alliance') modeLabel = `(${(currentUserRole.alliances || []).join('/')} STAFF ONLY)`;
            else if (currentUserRole.scope === 'legion') modeLabel = `(${(currentUserRole.legions || []).join(' & ')} STAFF ONLY)`;
            else modeLabel = "(VIEW ONLY)";
        }
        adminInd.innerText = modeLabel;
    }

    // Only reveal "Set Schedule" on the legion(s) this staff member is
    // actually allowed to manage, not both by default.
    const scheduleBtn1 = document.getElementById('edit-schedule-legion-1');
    const scheduleBtn2 = document.getElementById('edit-schedule-legion-2');
    if (scheduleBtn1) scheduleBtn1.classList.toggle('hidden', !canManageLegion('Legion 1'));
    if (scheduleBtn2) scheduleBtn2.classList.toggle('hidden', !canManageLegion('Legion 2'));
}

function resetAdminUI() {
    const adminBtn = document.getElementById('admin-toggle-btn');
    const adminInd = document.getElementById('admin-indicator');

    if (adminBtn) adminBtn.innerText = "Alliance Staff";
    if (adminInd) adminInd.style.display = "none";

    document.querySelectorAll('.admin-schedule-btn').forEach(btn => btn.classList.add('hidden'));
}

// ================= STAFF LOGIN (Supabase Auth) =================
// Real authentication now happens on Supabase's servers via auth.signInWithPassword,
// which returns a verified session token. Access to write endpoints must be
// enforced with Row Level Security policies on the `troops_power` and
// `footer_settings` tables tied to `auth.uid()` / `auth.role() = 'authenticated'` —
// this client-side flag is only used to show/hide UI, never to authorize writes.
function handleAdminLogin() {
    if (isAdmin) {
        handleStaffLogout();
        return;
    }
    document.getElementById('input-login-username').value = '';
    document.getElementById('input-login-password').value = '';
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('input-login-username').focus();
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

async function submitStaffLogin() {
    const client = getSupabase();
    if (!client) return;

    const username = document.getElementById('input-login-username').value.trim();
    const password = document.getElementById('input-login-password').value;

    if (!username || !password) {
        showToast("Please enter both username and password!", "warning");
        return;
    }

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Signing in...";

    const { data, error } = await client.auth.signInWithPassword({
        email: usernameToStaffEmail(username),
        password
    });

    submitBtn.disabled = false;
    submitBtn.innerText = "Sign In";

    if (error) {
        showToast("Login failed: incorrect username or password", "error");
        return;
    }

    applyAuthSession(data.session);
    closeLoginModal();
    showToast(`Welcome back${currentStaffUsername ? ', ' + currentStaffUsername.toUpperCase() : ''}!`, "success");
    fetchData();
}

async function handleStaffLogout() {
    const client = getSupabase();
    if (client) {
        await client.auth.signOut();
    }
    applyAuthSession(null);
    showToast("Logged out successfully.", "info");
    fetchData();
}

// ================= NAVIGATION =================
function resetTableControls() {
    searchQuery = '';
    currentSortField = null;
    currentSortDirection = 'asc';
    currentPage = 1;
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    updateSortArrows();
}

function selectAlliance(alliance) {
    viewMode = 'ALLIANCE';
    currentSelection = alliance;
    resetTableControls();
    document.getElementById('alliance-menu-page').classList.add('hidden');
    document.getElementById('troops-table-page').classList.remove('hidden');

    document.getElementById('th-status').style.display = "none";
    document.getElementById('legion-counter-bar').style.display = "none";

    // Only show "+ Add Player Power" if this staff member can actually add
    // to the selected alliance (or has at least one editable alliance when
    // viewing the combined "ALL" list).
    const myAlliances = getMyEditableAlliances();
    const canAddHere = alliance === 'ALL' ? myAlliances.length > 0 : myAlliances.includes(alliance);
    document.getElementById('add-entry-btn').style.display = canAddHere ? "inline-block" : "none";
    document.getElementById('add-legion-member-btn').style.display = "none";

    const titleEl = document.getElementById('selected-alliance-title');
    if (alliance === 'ALL') {
        titleEl.innerText = "All Troops Power (Global)";
    } else {
        titleEl.innerText = `${alliance} Alliance Troops Power`;
    }

    fetchData();
}

function selectLegion(legionName) {
    viewMode = 'LEGION';
    currentSelection = legionName;
    resetTableControls();
    document.getElementById('alliance-menu-page').classList.add('hidden');
    document.getElementById('troops-table-page').classList.remove('hidden');

    document.getElementById('th-status').style.display = "table-cell";
    document.getElementById('legion-counter-bar').style.display = "flex";
    document.getElementById('add-entry-btn').style.display = "none";

    document.getElementById('add-legion-member-btn').style.display = canManageLegion(legionName) ? "inline-block" : "none";

    document.getElementById('selected-alliance-title').innerText = `${legionName} Official Roster`;

    fetchData();
}

function showAllianceMenu() {
    document.getElementById('troops-table-page').classList.add('hidden');
    document.getElementById('alliance-menu-page').classList.remove('hidden');
}

// ================= SCHEDULE MANAGEMENT =================
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

// ================= LOAD & RENDER DATA =================
function showTableLoadingSkeleton() {
    isTableLoading = true;
    const tbody = document.getElementById('troops-table-body');
    if (!tbody) return;
    let rows = '';
    for (let i = 0; i < 6; i++) {
        rows += `<tr class="skeleton-row"><td colspan="8"><div class="skeleton-bar"></div></td></tr>`;
    }
    tbody.innerHTML = rows;

    const pagination = document.getElementById('pagination-controls');
    if (pagination) pagination.style.display = "none";
}

function updateLastUpdatedDisplay() {
    const el = document.getElementById('last-updated-text');
    if (!el || !lastUpdatedAt) return;
    const h = String(lastUpdatedAt.getHours()).padStart(2, '0');
    const m = String(lastUpdatedAt.getMinutes()).padStart(2, '0');
    const s = String(lastUpdatedAt.getSeconds()).padStart(2, '0');
    el.innerText = `Last updated: ${h}:${m}:${s}`;
}

async function fetchData() {
    const client = getSupabase();
    if (!client) return;

    showTableLoadingSkeleton();

    try {
        if (viewMode === 'ALLIANCE') {
            let query = client.from('troops_power').select('*').order('troops_power', { ascending: false });
            if (currentSelection !== 'ALL') {
                query = query.eq('alliance', currentSelection);
            }
            const { data, error } = await query;
            if (error) throw error;
            loadedTroopsData = data || [];
        } else {
            const { data, error } = await client.from('troops_power')
                .select('*')
                .eq('legion', currentSelection);

            if (error) throw error;
            
            loadedTroopsData = (data || []).sort((a, b) => {
                const rolePriority = { 'Battle': 1, 'Substitute': 2 };
                const priorityA = rolePriority[a.legion_role] || 99;
                const priorityB = rolePriority[b.legion_role] || 99;

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                return b.troops_power - a.troops_power;
            });
        }

        // Capture the original rank (based on the sorted fetch order) so it stays
        // stable even when the user later searches, sorts, or paginates the table.
        loadedTroopsData.forEach((p, i) => { p.__rank = i + 1; });

        isTableLoading = false;
        lastUpdatedAt = new Date();
        renderTable();
        updateLastUpdatedDisplay();
    } catch (err) {
        isTableLoading = false;
        console.error("Error fetching data:", err);
        showToast("Failed to load data.", "error");
        const tbody = document.getElementById('troops-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding: 20px; color: #ef4444;">Failed to load data. Please try again.</td></tr>`;
    }
}

// ================= SEARCH / SORT / PAGINATION HELPERS =================
function getDisplayData() {
    let data = [...loadedTroopsData];

    if (searchQuery) {
        data = data.filter(p =>
            (p.nickname || '').toLowerCase().includes(searchQuery) ||
            String(p.game_id || '').toLowerCase().includes(searchQuery)
        );
    }

    if (currentSortField) {
        data.sort((a, b) => {
            let valA = a[currentSortField];
            let valB = b[currentSortField];

            if (currentSortField === 'troops_power') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return data;
}

let searchDebounceId = null;
function handleSearchInput(value) {
    clearTimeout(searchDebounceId);
    searchDebounceId = setTimeout(() => {
        searchQuery = value.trim().toLowerCase();
        currentPage = 1;
        renderTable();
    }, 200);
}

function handleSortClick(field) {
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    currentPage = 1;
    updateSortArrows();
    renderTable();
}

function updateSortArrows() {
    ['alliance', 'nickname', 'game_id', 'troops_power', 'preferred_time'].forEach(f => {
        const el = document.getElementById('sort-arrow-' + f);
        if (!el) return;
        el.innerText = (f === currentSortField) ? (currentSortDirection === 'asc' ? '▲' : '▼') : '';
    });
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

function goToNextPage() {
    currentPage++;
    renderTable();
}

function updatePaginationControls(totalItems) {
    const controls = document.getElementById('pagination-controls');
    const info = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('pagination-prev-btn');
    const nextBtn = document.getElementById('pagination-next-btn');
    if (!controls || !info || !prevBtn || !nextBtn) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

    if (totalItems <= PAGE_SIZE) {
        controls.style.display = "none";
        return;
    }

    controls.style.display = "flex";
    info.innerText = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function renderTable() {
    const tbody = document.getElementById('troops-table-body');
    const thAction = document.getElementById('th-action');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (thAction) {
        thAction.style.display = isAdmin ? "table-cell" : "none";
    }

    if (viewMode === 'LEGION') {
        const countBattle = loadedTroopsData.filter(p => p.legion_role === 'Battle').length;
        const countSub = loadedTroopsData.filter(p => p.legion_role === 'Substitute').length;

        document.getElementById('count-battle').innerText = countBattle;
        document.getElementById('count-substitute').innerText = countSub;
    }

    // ================= DINAMIS RENDER KOTAK RINGKASAN POWER =================
    const summaryBoxContainer = document.getElementById('dynamic-summary-cards');
    summaryBoxContainer.innerHTML = "";

    const sortedByPower = [...loadedTroopsData].sort((a, b) => b.troops_power - a.troops_power);

    if (viewMode === 'LEGION') {
        const top20 = sortedByPower.slice(0, 20).reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const battle = loadedTroopsData.filter(p => p.legion_role === 'Battle').reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const sub = loadedTroopsData.filter(p => p.legion_role === 'Substitute').reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);

        summaryBoxContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
        summaryBoxContainer.innerHTML = `
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Top 20 Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #f59e0b;">${top20.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Battle Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #4ade80;">${battle.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Substitute Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #3b82f6;">${sub.toLocaleString('en-US')}</div>
            </div>
        `;
    } else if (currentSelection !== 'ALL') {
        const top20 = sortedByPower.slice(0, 20).reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const total = loadedTroopsData.reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);

        summaryBoxContainer.style.gridTemplateColumns = "1fr 1fr";
        summaryBoxContainer.innerHTML = `
            <div style="padding: 12px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.75rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Top 20 Troops Power</div>
                <div style="font-size: 1.25rem; font-weight: 900; color: #f59e0b;">${top20.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 12px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.75rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Total Troops Power</div>
                <div style="font-size: 1.25rem; font-weight: 900; color: #3b82f6;">${total.toLocaleString('en-US')}</div>
            </div>
        `;
    } else {
        const top20 = sortedByPower.slice(0, 20).reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const top50 = sortedByPower.slice(0, 50).reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const top100 = sortedByPower.slice(0, 100).reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const allState = loadedTroopsData.reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);

        summaryBoxContainer.style.gridTemplateColumns = "repeat(2, 1fr)";
        summaryBoxContainer.innerHTML = `
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Top 20 Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #f59e0b;">${top20.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Top 50 Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #3b82f6;">${top50.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Top 100 Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #a855f7;">${top100.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">All Troops Power in this State</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #4ade80;">${allState.toLocaleString('en-US')}</div>
            </div>
        `;
    }
    // =========================================================

    let totalColumns = 6;
    if (viewMode === 'LEGION') totalColumns++;
    if (isAdmin) totalColumns++;

    if (loadedTroopsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="padding: 20px; color: #8a8d98;">No player data available.</td></tr>`;
        updatePaginationControls(0);
        return;
    }

    // Apply search filter + custom sort (if any) on top of the loaded data
    const displayData = getDisplayData();

    if (displayData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="padding: 20px; color: #8a8d98;">No players match your search.</td></tr>`;
        updatePaginationControls(0);
        return;
    }

    // Clamp current page in case the filtered set got smaller
    const totalPages = Math.max(1, Math.ceil(displayData.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const pageData = displayData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    pageData.forEach((player) => {
        const row = document.createElement('tr');
        const formattedPower = Number(player.troops_power).toLocaleString('en-US');
        const rank = player.__rank || '-';
        const playerId = Number(player.id); // numeric, safe to inline into onclick

        // Everything below comes from the database (which anyone with write
        // access could have populated), so it's escaped before being placed
        // into innerHTML or into a quoted onclick="...", to prevent stored XSS.
        const safeAlliance = escapeHtml(player.alliance);
        const safeNickname = escapeHtml(player.nickname);
        const safeGameId = escapeHtml(player.game_id);
        const safePrefTime = escapeHtml(player.preferred_time || '-');
        const safeLegionRole = escapeHtml(player.legion_role);

        let statusCellHtml = '';
        if (viewMode === 'LEGION') {
            const isBattle = player.legion_role === 'Battle';
            const badgeStyle = isBattle 
                ? 'background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #4ade80;'
                : 'background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24;';
            
            const swordSvgIcon = `
                <svg class="clash-svg" viewBox="0 0 100 100" style="width: 16px; height: 16px; margin-right: 4px; color:#22c55e;">
                    <use href="#clash-sword-icon"></use>
                </svg>`;

            const badgeLabel = isBattle ? `${swordSvgIcon} Battle` : '🛡️ Substitute';

            statusCellHtml = `<td data-label="Status"><span style="padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 0.75rem; display: inline-flex; align-items: center; ${badgeStyle}">${badgeLabel}</span></td>`;
        }

        let actionCellHtml = '';
        if (isAdmin) {
            if (viewMode === 'ALLIANCE') {
                if (canEditAlliance(player.alliance)) {
                    actionCellHtml = `<td data-label="Action">
                        <div style="display:flex; gap:6px; justify-content:center;">
                            <button class="btn-apply js-edit-player" style="background:#f59e0b; padding: 3px 8px; font-size: 0.7rem; animation: none;" data-id="${playerId}">Edit</button>
                            <button class="btn-apply btn-danger js-delete-player" style="padding: 3px 8px; font-size: 0.7rem;" data-id="${playerId}">Delete</button>
                        </div>
                    </td>`;
                } else {
                    // Signed in, but this staff member's role doesn't cover this
                    // player's alliance — show the column with no actions.
                    actionCellHtml = `<td data-label="Action" style="color:#4b5563; text-align:center;">—</td>`;
                }
            } else {
                if (canManageLegion(currentSelection)) {
                    actionCellHtml = `<td data-label="Action">
                        <div style="display:flex; gap:6px; justify-content:center;">
                            <button class="btn-apply js-toggle-role" style="background:#3b82f6; padding: 3px 8px; font-size: 0.7rem; animation: none;" data-id="${playerId}" data-role="${safeLegionRole}">Switch Role</button>
                            <button class="btn-apply btn-danger js-remove-legion" style="padding: 3px 8px; font-size: 0.7rem;" data-id="${playerId}">Remove</button>
                        </div>
                    </td>`;
                } else {
                    actionCellHtml = `<td data-label="Action" style="color:#4b5563; text-align:center;">—</td>`;
                }
            }
        }

        // Warna unik untuk setiap aliansi pada kolom tabel
        let allianceTextColor = '#3b82f6';
        if (player.alliance === 'ARX') allianceTextColor = '#f59e0b';
        else if (player.alliance === 'IDN') allianceTextColor = '#22c55e';
        else if (player.alliance === 'VNX') allianceTextColor = '#a855f7';
        else if (player.alliance === 'ZXC') allianceTextColor = '#ef4444';
        else if (player.alliance === 'CAT') allianceTextColor = '#ec4899';

        row.innerHTML = `
            <td data-label="Rank"><strong style="color: ${rank !== '-' && rank <= 20 ? '#f59e0b' : '#f1f5f9'};">#${rank}</strong></td>
            <td data-label="Alliance"><span style="background: #1e2230; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: ${allianceTextColor}; border: 1px solid ${allianceTextColor}40;">${safeAlliance}</span></td>
            <td data-label="Nickname"><strong>${safeNickname}</strong></td>
            <td data-label="Game ID"><span class="js-copy-gameid" style="cursor:pointer; color:#3b82f6; text-decoration:underline;" data-gameid="${safeGameId}">${safeGameId}</span></td>
            <td data-label="Troops Power"><strong style="color: #22c55e;">${formattedPower}</strong></td>
            <td data-label="Pref. Time"><span style="color: #f59e0b; font-weight: 600;">${safePrefTime}</span></td>
            ${statusCellHtml}
            ${actionCellHtml}
        `;

        tbody.appendChild(row);
    });

    updatePaginationControls(displayData.length);
}

// ================= PLAYER MODAL & EDIT =================
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

function openEditModal(id) {
    if (!isAdmin) return;
    const player = loadedTroopsData.find(p => p.id === id);
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

// ================= LEGION MANAGEMENT FEATURES (PRESIDENT) =================
async function openAddLegionModal() {
    if (!canManageLegion(currentSelection)) {
        showToast("You don't have permission to manage this legion's roster.", "warning");
        return;
    }
    const client = getSupabase();
    if (!client) return;

    document.getElementById('legion-assign-target-label').innerText = currentSelection;

    const { data, error } = await client.from('troops_power')
        .select('*')
        .or(`legion.is.null,legion.neq.${currentSelection}`)
        .order('troops_power', { ascending: false });

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

    const currentBattleCount = loadedTroopsData.filter(p => p.legion_role === 'Battle').length;
    const currentSubCount = loadedTroopsData.filter(p => p.legion_role === 'Substitute').length;

    if (role === 'Battle' && currentBattleCount >= 30) {
        showToast("Battle quota is full! (Maximum 30 players)", "warning");
        return;
    }

    if (role === 'Substitute' && currentSubCount >= 20) {
        showToast("Substitute quota is full! (Maximum 20 players)", "warning");
        return;
    }

    const submitBtn = document.querySelector('#legion-assign-modal .btn-apply');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Assigning..."; }

    const { error } = await client.from('troops_power').update({
        legion: currentSelection,
        legion_role: role
    }).eq('id', playerId);

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

    const newRole = currentRole === 'Battle' ? 'Substitute' : 'Battle';

    const currentBattleCount = loadedTroopsData.filter(p => p.legion_role === 'Battle').length;
    const currentSubCount = loadedTroopsData.filter(p => p.legion_role === 'Substitute').length;

    if (newRole === 'Battle' && currentBattleCount >= 30) {
        showToast("Failed to switch! Battle quota reached 30 players.", "warning");
        return;
    }

    if (newRole === 'Substitute' && currentSubCount >= 20) {
        showToast("Failed to switch! Substitute quota reached 20 players.", "warning");
        return;
    }

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
    showCustomConfirm("Remove this player from Legion roster?", async () => {
        const client = getSupabase();
        if (!client) return;

        const { error } = await client.from('troops_power').update({
            legion: null,
            legion_role: null
        }).eq('id', id);

        if (!error) {
            showToast("Player removed from Legion.", "success");
            fetchData();
        } else {
            showToast("Failed to remove player.", "error");
        }
    }, '#ef4444');
}

// ================= EXPORT CSV =================
// Prevents CSV/formula injection: a field starting with = + - @ (or a tab/CR)
// would otherwise be executed as a formula when opened in Excel/Sheets.
function csvSafeField(value) {
    let str = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
}

function exportToCSV() {
    if (loadedTroopsData.length === 0) {
        showToast("No data to export!", "warning");
        return;
    }

    const isLegion = viewMode === 'LEGION';
    const headers = isLegion 
        ? ["Rank", "Alliance", "Nickname", "Game ID", "Troops Power", "Preferred Time", "Legion Status"]
        : ["Rank", "Alliance", "Nickname", "Game ID", "Troops Power", "Preferred Time"];

    const rows = loadedTroopsData.map((p, idx) => {
        const base = [csvSafeField(idx + 1), csvSafeField(p.alliance), csvSafeField(p.nickname), csvSafeField(p.game_id), csvSafeField(p.troops_power), csvSafeField(p.preferred_time || '-')];
        if (isLegion) base.push(csvSafeField(p.legion_role || '-'));
        return base;
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `3475_${currentSelection.replace(/\s+/g, '_')}_Roster.csv`);
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

function startSnowEffect() {
    if (snowIntervalId) return;
    snowIntervalId = setInterval(createSnowEffect, 200);
}

function stopSnowEffect() {
    if (snowIntervalId) {
        clearInterval(snowIntervalId);
        snowIntervalId = null;
    }
    document.querySelectorAll('.snowflake').forEach(el => el.remove());
}

function toggleSnowEffect() {
    snowEnabled = !snowEnabled;
    localStorage.setItem('snowEnabled', snowEnabled ? 'true' : 'false');
    updateSnowToggleUI();
    if (snowEnabled) {
        startSnowEffect();
    } else {
        stopSnowEffect();
    }
}

function updateSnowToggleUI() {
    const btn = document.getElementById('snow-toggle-btn');
    if (!btn) return;
    btn.innerText = snowEnabled ? '❄️ ON' : '❄️ OFF';
    btn.classList.toggle('snow-off', !snowEnabled);
}