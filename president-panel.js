// ================= PRESIDENT PANEL =================
// Full-access President control center. This module works with the existing
// TAL data model: troops_power, footer_settings, five alliances and two legions.

function canOpenPresidentPanel() {
    return isAdmin && currentUserRole && currentUserRole.scope === 'full';
}

let globalBattleTheme = 'tundra';
let globalAllianceBEnabled = false;
let battleThemePollId = null;
let battleThemeLoading = false;

function isAllianceBEnabled() { return !!globalAllianceBEnabled; }

function getBattleTheme() {
    return globalBattleTheme === 'frostdragon' ? 'frostdragon' : 'tundra';
}

// Tundra Arm League and Frostdragon Tyrant share the SAME player pool
// (troops_power: alliance, nickname, game_id, troops_power, preferred_time).
// Only the "which battle roster is this player in" flag is theme-specific:
//   - Tundra uses the existing `legion` + `legion_role` columns
//   - Frostdragon uses its own `frostdragon_role` column ('Battle' or null)
// This keeps the two rosters independent without duplicating player data or
// splitting it across tables — editing the Frostdragon roster only ever
// touches `frostdragon_role`, never `legion` / `legion_role`, and vice versa.
function getRoleField() {
    return getBattleTheme() === 'frostdragon' ? 'frostdragon_role' : 'legion_role';
}

async function loadGlobalBattleTheme({silent = true, forceApply = true} = {}) {
    const client = getSupabase();
    if (!client || battleThemeLoading) return;
    battleThemeLoading = true;
    try {
        const { data, error } = await client
            .from('footer_settings')
            .select('battle_theme, alliance_b_enabled')
            .eq('id', 'main')
            .single();

        if (error) throw error;
        const nextTheme = data?.battle_theme === 'frostdragon' ? 'frostdragon' : 'tundra';
        const nextB = !!data?.alliance_b_enabled;
        const changed = nextTheme !== globalBattleTheme || nextB !== globalAllianceBEnabled;
        globalBattleTheme = nextTheme;
        globalAllianceBEnabled = nextB;
        if (changed || forceApply) {
            applyBattleTheme();
            applyAllianceBVisibility();
            if (canOpenPresidentPanel()) refreshPresidentPanel();
        }
    } catch (err) {
        console.warn('Unable to load global Battle Theme:', err);
        if (!silent) showToast('Failed to load global Battle Theme: ' + (err.message || err), 'error');
    } finally {
        battleThemeLoading = false;
    }
}

let battleThemeChannel = null;

function startGlobalBattleThemeSync() {
    loadGlobalBattleTheme({silent: true, forceApply: true});
    if (battleThemePollId) clearInterval(battleThemePollId);

    // Realtime gives near-instant updates when footer_settings is included in
    // Supabase Realtime. The polling fallback keeps the feature global even if
    // the project has not enabled that table in the realtime publication yet.
    battleThemePollId = setInterval(() => loadGlobalBattleTheme({silent: true, forceApply: false}), 5000);

    const client = getSupabase();
    if (client && !battleThemeChannel) {
        try {
            battleThemeChannel = client
                .channel('global-battle-theme')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'footer_settings',
                    filter: 'id=eq.main'
                }, (payload) => {
                    const nextTheme = payload?.new?.battle_theme === 'frostdragon' ? 'frostdragon' : 'tundra';
                    const nextB = !!payload?.new?.alliance_b_enabled;
                    let msg = null;
                    if (nextTheme !== globalBattleTheme) {
                        globalBattleTheme = nextTheme;
                        applyBattleTheme();
                        msg = `Battle Theme changed globally to ${nextTheme === 'frostdragon' ? 'Frostdragon Tyrant' : 'Tundra Arm League'}`;
                    }
                    if (nextB !== globalAllianceBEnabled) {
                        globalAllianceBEnabled = nextB;
                        applyAllianceBVisibility();
                        msg = nextB ? 'Alliance B reserve legions enabled' : 'Alliance B reserve legions disabled';
                    }
                    if (msg) {
                        if (canOpenPresidentPanel()) refreshPresidentPanel();
                        showToast(msg, 'info');
                    }
                })
                .subscribe();
        } catch (err) {
            console.warn('Global Battle Theme Realtime unavailable; polling remains active.', err);
        }
    }
}

function openPresidentPanel() {
    if (!canOpenPresidentPanel()) {
        showToast('President Panel is available to full-access staff only.', 'warning');
        return;
    }
    document.getElementById('president-panel')?.classList.remove('hidden');
    refreshPresidentPanel();
}

function closePresidentPanel() {
    document.getElementById('president-panel')?.classList.add('hidden');
}

function presidentOpenAlliance(alliance) {
    if (!canOpenPresidentPanel()) return;
    closePresidentPanel();
    selectAlliance(alliance);
}

function presidentOpenBattle(legion) {
    if (!canOpenPresidentPanel()) return;
    const target = getBattleTheme() === 'frostdragon' ? 'Legion 1' : legion;
    closePresidentPanel();
    selectLegion(target);
}

function presidentOpenSchedule(legion) {
    if (!canOpenPresidentPanel()) return;
    const target = getBattleTheme() === 'frostdragon' ? 'Legion 1' : legion;
    closePresidentPanel();
    openScheduleModal(target);
}

function presidentOpenInfo() {
    if (!canOpenPresidentPanel()) return;
    closePresidentPanel();
    openPresidentModal();
}

async function refreshPresidentPanel() {
    applyAllianceBVisibility();

    if (!canOpenPresidentPanel()) return;
    const frost = getBattleTheme() === 'frostdragon';
    let players = Array.isArray(loadedTroopsData) ? loadedTroopsData : [];

    // President Dashboard always represents the whole shared player database
    // (same pool for both themes), not whichever alliance/legion the normal
    // roster page happens to be showing.
    const client = getSupabase();
    if (client) {
        const { data, error } = await client.from('troops_power').select('id,alliance,legion,legion_role,frostdragon_role,troops_power');
        if (!error && Array.isArray(data)) players = data;
    }

    const stat = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    };
    const roleField = getRoleField();
    stat('pp-total-players', players.length);
    stat('pp-battle-players', players.filter(p => p[roleField] === 'Battle').length);
    stat('pp-sub-players', frost ? 0 : players.filter(p => p.legion_role === 'Substitute').length);
    stat('pp-theme-name', frost ? 'Frostdragon Tyrant' : 'Tundra Arm League');

    const badge = document.getElementById('pp-theme-badge');
    if (badge) {
        // SVG icons (from index.html's sprite) instead of emoji.
        badge.innerHTML = `<svg class="pp-badge-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#${frost ? 'frostdragon-icon' : 'tundra-snow-icon'}"></use></svg>`
            + (frost ? 'FROSTDRAGON TYRANT' : 'TUNDRA ARM LEAGUE');
    }

    const desc = document.getElementById('pp-battle-description');
    if (desc) desc.innerText = frost
        ? 'One Battle Group. Each alliance can dispatch up to 60 combatants (Alliance A and B). No Substitute/Reserve.'
        : 'Two Legion rosters. Each Legion supports 30 Battle + 20 Substitute.';

    const l2 = document.getElementById('pp-legion2-btn');
    const s2 = document.getElementById('pp-schedule2-btn');
    if (l2) l2.classList.toggle('hidden', frost);
    if (s2) s2.classList.toggle('hidden', frost);

    [['pp-tundra-btn', !frost], ['pp-frostdragon-btn', frost]].forEach(([id, on]) => {
        const b = document.getElementById(id);
        if (!b) return;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
    });

    const roleList = document.getElementById('pp-role-list');
    if (roleList) {
        const roles = Object.entries(STAFF_ROLES).map(([name, role]) => {
            const scope = role.scope === 'alliance'
                ? (role.alliances || []).join(', ')
                : role.scope === 'legion'
                    ? (role.legions || []).join(', ')
                    : role.scope === 'none' ? 'VIEW ONLY' : role.scope;
            return `<div class="pp-role-row"><strong>${escapeHtml(name.toUpperCase())}</strong><span>${escapeHtml(scope)}</span></div>`;
        });
        roles.push('<div class="pp-role-row"><strong>FULL ACCESS</strong><span>ALL ALLIANCES + ALL BATTLE</span></div>');
        roleList.innerHTML = roles.join('');
    }

    loadStaffAccounts();
}

function switchBattleTheme(theme) {
    if (!canOpenPresidentPanel()) {
        showToast('Only the President can switch the Battle theme.', 'warning');
        return;
    }
    const nextTheme = theme === 'frostdragon' ? 'frostdragon' : 'tundra';
    const oldTheme = getBattleTheme();
    if (oldTheme === nextTheme) {
        showToast(`${nextTheme === 'frostdragon' ? 'Frostdragon Tyrant' : 'Tundra Arm League'} is already active.`, 'info');
        return;
    }

    const message = nextTheme === 'frostdragon'
        ? 'Switch Battle to Frostdragon Tyrant for everyone? It uses 1 Battle Group, up to 60 combatants per alliance and no Substitute. Tundra Arm League rosters are kept.'
        : 'Switch Battle back to Tundra Arm League for everyone? It uses Legion 1 + Legion 2, each 30 Battle + 20 Substitute. Frostdragon rosters are kept.';

    showCustomConfirm(message, async () => {
        const client = getSupabase();
        if (!client) return;

        const { error } = await client
            .from('footer_settings')
            .update({ battle_theme: nextTheme })
            .eq('id', 'main');

        if (error) {
            showToast('Failed to switch global Battle Theme: ' + error.message, 'error');
            return;
        }

        globalBattleTheme = nextTheme;
        applyBattleTheme();
        refreshPresidentPanel();
        showToast(`Global Battle Theme: ${nextTheme === 'frostdragon' ? 'Frostdragon Tyrant' : 'Tundra Arm League'}`, 'success');
    }, '#7c3aed');
}


function applyAllianceBVisibility() {
    const frost = getBattleTheme() === 'frostdragon';
    const show = !frost && isAllianceBEnabled();
    ['legion-btn-1b', 'legion-btn-2b'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !show);
    });
    const cb = document.getElementById('pp-alliance-b-enabled');
    if (cb) cb.checked = isAllianceBEnabled();
    const st = document.getElementById('pp-alliance-b-status');
    if (st) st.textContent = isAllianceBEnabled() ? 'Enabled — visible on main menu' : 'Disabled';
    const card = document.getElementById('pp-alliance-b-card');
    if (card) card.classList.toggle('pp-disabled-theme', frost);
    // Schedule buttons for Alliance B
    const s1b = document.getElementById('edit-schedule-legion-1b');
    const s2b = document.getElementById('edit-schedule-legion-2b');
    if (s1b) s1b.classList.toggle('hidden', !show || !canManageLegion('Legion 1 - Alliance B'));
    if (s2b) s2b.classList.toggle('hidden', !show || !canManageLegion('Legion 2 - Alliance B'));
}

async function presidentToggleAllianceB(enabled) {
    if (!canOpenPresidentPanel()) {
        showToast('President Panel only.', 'warning');
        applyAllianceBVisibility();
        return;
    }
    const client = getSupabase();
    if (!client) return;
    const next = !!enabled;
    const { error } = await client.from('footer_settings').update({ alliance_b_enabled: next }).eq('id', 'main');
    if (error) {
        showToast('Failed to update Alliance B: ' + (error.message || error), 'error');
        applyAllianceBVisibility();
        return;
    }
    globalAllianceBEnabled = next;
    applyAllianceBVisibility();
    showToast(next ? 'Alliance B legions enabled on main menu' : 'Alliance B legions hidden', 'success');
}

function applyBattleTheme() {
    const frost = getBattleTheme() === 'frostdragon';
    document.body.classList.toggle('theme-frostdragon', frost);
    document.documentElement.dataset.battleTheme = frost ? 'frostdragon' : 'tundra';

    const l1 = document.querySelector('.legion-btn-1 .legion-btn-label');
    const l2 = document.querySelector('.legion-btn-2');
    const s2 = document.getElementById('edit-schedule-legion-2');
    const title = document.querySelector('#alliance-menu-page .page-title');
    const subtitle = document.querySelector('#alliance-menu-page .page-subtitle');

    if (l1) {
        const label = frost ? 'FROSTDRAGON TYRANT (60 per alliance)' : 'LEGION 1 (30 Battle / 20 Sub)';
        const icon = l1.querySelector('svg:not(.frostdragon-svg)');
        l1.innerHTML = '';
        if (icon) l1.appendChild(icon);
        if (frost) {
            // SVG dragon (replaces the old 🐉 emoji); symbol lives in index.html's sprite.
            const dragon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            dragon.setAttribute('class', 'frostdragon-svg');
            dragon.setAttribute('viewBox', '0 0 24 24');
            dragon.setAttribute('aria-hidden', 'true');
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttribute('href', '#frostdragon-icon');
            dragon.appendChild(use);
            l1.appendChild(dragon);
        }
        l1.appendChild(document.createTextNode(label));
    }
    if (l2) l2.classList.toggle('hidden', frost);
    if (s2) s2.classList.toggle('hidden', frost);

    if (title) title.innerText = frost ? 'Frostdragon Tyrant' : 'Tundra Arm League';
    if (subtitle) subtitle.innerText = frost
        ? 'Select Alliance, Global Leaderboard, or Battle Group'
        : 'Select Alliance, Global Leaderboard, or Legion Roster';

    if (typeof syncFdtUi === 'function') syncFdtUi();

    const counter = document.querySelector('.counter-badge-battle');
    const subCounter = document.querySelector('.counter-badge-substitute');
    if (counter) counter.innerHTML = `<strong>${'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#swords-icon"></use></svg>'} Battle Players:</strong> <span id="count-battle" class="counter-value">0</span>${frost ? ' (max 60 per alliance)' : ' / 30'}`;
    if (subCounter) subCounter.style.display = frost ? 'none' : 'inline-flex';

    const roleSelect = document.getElementById('select-legion-role');
    if (roleSelect) {
        roleSelect.innerHTML = frost
            ? '<option value="Battle">Combatant (Maximum 60 per alliance)</option>'
            : '<option value="Battle">Battle (Maximum 30)</option><option value="Substitute">Substitute (Maximum 20)</option>';
    }

    // If the current page is Legion 2 while Frostdragon is activated, return to
    // the single Battle Group rather than leaving the user on a hidden target.
    if (frost && viewMode === 'LEGION' && currentSelection === 'Legion 2') {
        selectLegion('Legion 1');
        return;
    }

    if (typeof renderTable === 'function' && viewMode === 'LEGION') renderTable();
    applyAllianceBVisibility();
}

// ================= STAFF ACCOUNTS (change username / password) =================
// Backed by the SECURITY DEFINER functions in supabase_staff_accounts.sql,
// which re-check on the server that the caller is the President account.
let staffAccountsCache = [];
let editingStaffAccount = null;

function canManageStaffAccounts() {
    return canOpenPresidentPanel() && (currentStaffRoleKey || '').toLowerCase() === PRESIDENT_ACCOUNT_KEY;
}

async function loadStaffAccounts() {
    const card = document.getElementById('pp-accounts-card');
    const list = document.getElementById('pp-accounts-list');
    if (!card || !list) return;
    if (!canManageStaffAccounts()) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');

    const client = getSupabase();
    if (!client) return;
    list.innerHTML = '<div class="pp-accounts-empty">Loading…</div>';

    const { data, error } = await client.rpc('staff_list_accounts');
    if (error) {
        list.innerHTML = `<div class="pp-accounts-empty">Failed to load accounts: ${escapeHtml(error.message)}<br>Run <code>supabase_staff_accounts.sql</code> in the Supabase SQL Editor first.</div>`;
        return;
    }
    staffAccountsCache = data || [];
    if (!staffAccountsCache.length) {
        list.innerHTML = '<div class="pp-accounts-empty">No staff accounts found.</div>';
        return;
    }
    list.innerHTML = staffAccountsCache.map(acc => {
        const role = getRoleForUsername(acc.username, acc.role_key);
        const scope = role.scope === 'alliance' ? (role.alliances || []).join(', ')
            : role.scope === 'legion' ? (role.legions || []).join(', ')
            : role.scope === 'none' ? 'VIEW ONLY'
            : 'FULL ACCESS';
        const me = acc.id && acc.username === currentStaffUsername ? ' <em>(you)</em>' : '';
        return `<div class="pp-account-row">
            <div class="pp-account-info"><strong>${escapeHtml(acc.username.toUpperCase())}${me}</strong><span>${escapeHtml(scope)}</span></div>
            <button class="btn-apply" onclick="openStaffAccountModal('${escapeHtml(acc.id)}')">Edit</button>
        </div>`;
    }).join('');
}

function openStaffAccountModal(id) {
    if (!canManageStaffAccounts()) return;
    const acc = staffAccountsCache.find(a => a.id === id);
    if (!acc) return;
    editingStaffAccount = acc;
    document.getElementById('staff-account-current').innerText = acc.username;
    document.getElementById('staff-account-username').value = acc.username;
    document.getElementById('staff-account-password').value = '';
    document.getElementById('staff-account-password2').value = '';
    document.getElementById('staff-account-modal').classList.remove('hidden');
    document.getElementById('staff-account-username').focus();
}

function closeStaffAccountModal() {
    document.getElementById('staff-account-modal')?.classList.add('hidden');
    editingStaffAccount = null;
}

async function submitStaffAccountChange() {
    if (!canManageStaffAccounts() || !editingStaffAccount) return;
    const acc = editingStaffAccount;
    const username = document.getElementById('staff-account-username').value.trim().toLowerCase().replace(/\s+/g, '');
    const pw = document.getElementById('staff-account-password').value;
    const pw2 = document.getElementById('staff-account-password2').value;

    const nameChanged = username && username !== acc.username;
    if (!username) { showToast('Username cannot be empty.', 'warning'); return; }
    if (!/^[a-z0-9._-]{2,32}$/.test(username)) { showToast('Username: 2-32 chars, letters/numbers/. _ - only.', 'warning'); return; }
    if (pw && pw.length < 6) { showToast('Password must be at least 6 characters.', 'warning'); return; }
    if (pw !== pw2) { showToast('Password confirmation does not match.', 'warning'); return; }
    if (!nameChanged && !pw) { showToast('Nothing to change.', 'info'); return; }

    const isSelf = acc.username === currentStaffUsername;
    const summary = [nameChanged ? `username "${acc.username}" → "${username}"` : null, pw ? 'password' : null].filter(Boolean).join(' and ');
    const confirmed = await showCustomConfirmAsync(`Change ${summary} for ${acc.username.toUpperCase()}? ${isSelf ? 'You' : 'They'} will be signed out and must log in again.`, '#7c3aed');
    if (!confirmed) return;

    const btn = document.getElementById('staff-account-save-btn');
    btn.disabled = true;
    const client = getSupabase();
    const { error } = await client.rpc('staff_update_account', {
        target_id: acc.id,
        new_username: nameChanged ? username : null,
        new_password: pw || null
    });
    btn.disabled = false;

    if (error) {
        showToast('Failed to update account: ' + error.message, 'error');
        return;
    }
    closeStaffAccountModal();
    showToast(`Account ${acc.username.toUpperCase()} updated.`, 'success');

    if (isSelf) {
        // Our own sessions were revoked server-side; sign out cleanly.
        closePresidentPanel();
        await handleStaffLogout();
        return;
    }
    loadStaffAccounts();
}

function exportPresidentSnapshot() {
    if (!canOpenPresidentPanel()) return;
    if (typeof exportToCSV === 'function') exportToCSV();
}

async function presidentRefreshData() {
    if (!canOpenPresidentPanel()) return;
    await fetchData();
    refreshPresidentPanel();
    showToast('President Panel data refreshed.', 'success');
}

async function presidentClearAllTroops() {
    if (!canOpenPresidentPanel()) return;
    const frost = getBattleTheme() === 'frostdragon';
    const client = getSupabase();
    if (!client) return;

    if (frost) {
        // Frostdragon shares the same player pool as Tundra Arm League, so
        // "Clear All" here only removes the Frostdragon roster flag
        // (frostdragon_role) from every player. It never deletes player
        // records and never touches Tundra's legion / legion_role columns.
        const confirmed = await showCustomConfirmAsync("Remove ALL players from the Frostdragon Tyrant battle roster? Player records and Tundra Arm League assignments are not affected. This cannot be undone.", '#ef4444');
        if (!confirmed) return;

        const { error } = await client.from('troops_power').update({ frostdragon_role: null }).not('frostdragon_role', 'is', null);
        if (error) {
            showToast('Failed to clear the Frostdragon roster: ' + error.message, 'error');
            return;
        }
        showToast('Frostdragon Tyrant roster cleared.', 'success');
    } else {
        const confirmed = await showCustomConfirmAsync('DELETE ALL PLAYER RECORDS from the shared player database? This removes players entirely (every alliance, both themes) and cannot be undone.', '#ef4444');
        if (!confirmed) return;

        const { error } = await client.from('troops_power').delete().not('id', 'is', null);
        if (error) {
            showToast('Failed to clear player data: ' + error.message, 'error');
            return;
        }
        showToast('All player records were deleted.', 'success');
    }

    loadedTroopsData = [];
    if (typeof renderTable === 'function') renderTable();
    refreshPresidentPanel();
}

function presidentClearLocalSettings() {
    if (!canOpenPresidentPanel()) return;
    showCustomConfirm("Reset this browser's local snow preference? The global Battle Theme is stored in Supabase and will not be changed.", () => {
        localStorage.removeItem('snowEnabled');
        loadGlobalBattleTheme({silent: false, forceApply: true});
        location.reload();
    }, '#f59e0b');
}

document.addEventListener('DOMContentLoaded', () => {
    applyBattleTheme();
    startGlobalBattleThemeSync();
});
