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
// NOTE: 'demon' is intentionally left out of this map — any username not
// listed here automatically gets full access (see FULL_ACCESS_ROLE below),
// which is exactly what "demon" should have.
const STAFF_ROLES = {
    'idn':   { scope: 'alliance', alliances: ['IDN'] },
    'arx':   { scope: 'alliance', alliances: ['ARX'] },
    'vnx':   { scope: 'alliance', alliances: ['VNX'] },
    'zxc':   { scope: 'alliance', alliances: ['ZXC'] },
    'cat':   { scope: 'alliance', alliances: ['CAT'] },
    'tal':   { scope: 'legion', legions: ['Legion 1', 'Legion 2'] },
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

// Editing the President/Guild footer info is a global, site-wide setting
// (not tied to one alliance or legion), so only "full" scope staff get it.
function canEditPresidentInfo() {
    return isAdmin && !!currentUserRole && currentUserRole.scope === 'full';
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
    initOpeningAnimation();
    const client = getSupabase();
    if (client) {
        // Restore session from Supabase's own (encrypted, HttpOnly-adjacent) storage
        // instead of trusting a plain sessionStorage flag anyone could set by hand.
        const { data: { session } } = await client.auth.getSession();
        applyAuthSession(session);

        // Load the site-wide Battle Theme from Supabase before the first data
        // render. President-selected theme is global; never use localStorage
        // as the source of truth for Battle mode.
        if (typeof loadGlobalBattleTheme === 'function') {
            await loadGlobalBattleTheme({ silent: true, forceApply: true });
        }

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

    const loginUsernameInput = document.getElementById('input-login-username');
    if (loginUsernameInput) {
        loginUsernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitStaffLogin();
        });
    }

    const loginPasswordInput = document.getElementById('input-login-password');
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitStaffLogin();
        });
    }

    // Let Escape close whichever modal is currently open, same as clicking
    // its own "Cancel"/"x" button (so per-modal state gets cleaned up too).
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const closers = {
            'schedule-modal': closeScheduleModal,
            'president-modal': closePresidentModal,
            'add-modal': closeAddModal,
            'legion-assign-modal': closeLegionAssignModal,
            'login-modal': closeLoginModal,
            'redeem-modal': closeRedeemModal,
        };
        for (const [modalId, closeFn] of Object.entries(closers)) {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                closeFn();
                return;
            }
        }
        // The confirm dialog isn't in `closers` above: it must resolve its
        // pending promise via the actual Cancel button click, not just hide.
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && !confirmModal.classList.contains('hidden')) {
            document.getElementById('confirm-cancel-btn')?.click();
        }
    });

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

async function showCustomConfirmAsync(message, buttonColor = '#ef4444') {
    return new Promise((resolve) => {
        showCustomConfirm(message, () => resolve(true), buttonColor);
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        if (!cancelBtn) return;
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.addEventListener('click', () => {
            document.getElementById('confirm-modal')?.classList.add('hidden');
            resolve(false);
        });
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

    // "Edit President Info" is only for full-access staff.
    const editPresidentBtn = document.getElementById('edit-president-btn');
    if (editPresidentBtn) editPresidentBtn.classList.toggle('hidden', !canEditPresidentInfo());

    // President Panel is the central control center for full-access staff.
    const presidentPanelBtn = document.getElementById('president-panel-btn');
    if (presidentPanelBtn) presidentPanelBtn.classList.toggle('hidden', !canOpenPresidentPanel());
}

function resetAdminUI() {
    const adminBtn = document.getElementById('admin-toggle-btn');
    const adminInd = document.getElementById('admin-indicator');

    if (adminBtn) adminBtn.innerText = "Alliance Staff";
    if (adminInd) adminInd.style.display = "none";

    document.querySelectorAll('.admin-schedule-btn').forEach(btn => btn.classList.add('hidden'));

    const editPresidentBtn = document.getElementById('edit-president-btn');
    if (editPresidentBtn) editPresidentBtn.classList.add('hidden');

    const presidentPanelBtn = document.getElementById('president-panel-btn');
    if (presidentPanelBtn) presidentPanelBtn.classList.add('hidden');
    document.getElementById('president-panel')?.classList.add('hidden');
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
