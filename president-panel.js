// ================= PRESIDENT PANEL =================
// Full-access President control center. This module works with the existing
// TAL data model: troops_power, footer_settings, five alliances and two legions.

function canOpenPresidentPanel() {
    return isAdmin && currentUserRole && currentUserRole.scope === 'full';
}

let globalBattleTheme = 'tundra';
let battleThemePollId = null;
let battleThemeLoading = false;

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
            .select('battle_theme')
            .eq('id', 'main')
            .single();

        if (error) throw error;
        const nextTheme = data?.battle_theme === 'frostdragon' ? 'frostdragon' : 'tundra';
        const changed = nextTheme !== globalBattleTheme;
        globalBattleTheme = nextTheme;
        if (changed || forceApply) {
            applyBattleTheme();
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
                    if (nextTheme !== globalBattleTheme) {
                        globalBattleTheme = nextTheme;
                        applyBattleTheme();
                        if (canOpenPresidentPanel()) refreshPresidentPanel();
                        showToast(`Battle Theme changed globally to ${nextTheme === 'frostdragon' ? 'Frostdragon Tyrant' : 'Tundra Arm League'}`, 'info');
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
    if (badge) badge.innerText = frost ? '🐉 FROSTDRAGON TYRANT' : '❄️ TUNDRA ARM LEAGUE';

    const desc = document.getElementById('pp-battle-description');
    if (desc) desc.innerText = frost
        ? 'One Battle Group only. Maximum 100 players. No Substitute/Reserve.'
        : 'Two Legion rosters. Each Legion supports 30 Battle + 20 Substitute.';

    const l2 = document.getElementById('pp-legion2-btn');
    const s2 = document.getElementById('pp-schedule2-btn');
    if (l2) l2.classList.toggle('hidden', frost);
    if (s2) s2.classList.toggle('hidden', frost);

    document.getElementById('pp-tundra-btn')?.classList.toggle('active', !frost);
    document.getElementById('pp-frostdragon-btn')?.classList.toggle('active', frost);

    const roleList = document.getElementById('pp-role-list');
    if (roleList) {
        const roles = Object.entries(STAFF_ROLES).map(([name, role]) => {
            const scope = role.scope === 'alliance'
                ? (role.alliances || []).join(', ')
                : role.scope === 'legion'
                    ? (role.legions || []).join(', ')
                    : role.scope;
            return `<div class="pp-role-row"><strong>${escapeHtml(name.toUpperCase())}</strong><span>${escapeHtml(scope)}</span></div>`;
        });
        roles.push('<div class="pp-role-row"><strong>FULL ACCESS</strong><span>ALL ALLIANCES + ALL BATTLE</span></div>');
        roleList.innerHTML = roles.join('');
    }
}

function switchBattleTheme(theme) {
    if (!canOpenPresidentPanel()) {
        showToast('Only the President can switch the Battle theme.', 'warning');
        return;
    }
    const nextTheme = theme === 'frostdragon' ? 'frostdragon' : 'tundra';
    const oldTheme = getBattleTheme();
    if (oldTheme === nextTheme) {
        applyBattleTheme();
        refreshPresidentPanel();
        return;
    }

    const message = nextTheme === 'frostdragon'
        ? 'Switch Battle to Frostdragon Tyrant? It will use 1 group, maximum 100 Battle players and no Substitute.'
        : 'Switch Battle back to Tundra Arm League? It will use Legion 1 + Legion 2, each 30 Battle + 20 Substitute.';

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
        const label = frost ? '🐉 FROSTDRAGON TYRANT (100 Battle)' : '⚔️ LEGION 1 (30 Battle / 20 Sub)';
        const icon = l1.querySelector('svg');
        l1.innerHTML = '';
        if (icon) l1.appendChild(icon);
        l1.appendChild(document.createTextNode(label));
    }
    if (l2) l2.classList.toggle('hidden', frost);
    if (s2) s2.classList.toggle('hidden', frost);

    if (title) title.innerText = 'Tundra Arm League';
    if (subtitle) subtitle.innerText = 'Select Alliance, Global Leaderboard, or Legion Roster';

    const counter = document.querySelector('.counter-badge-battle');
    const subCounter = document.querySelector('.counter-badge-substitute');
    if (counter) counter.innerHTML = `<strong>⚔️ Battle Players:</strong> <span id="count-battle" class="counter-value">0</span> / ${frost ? 100 : 30}`;
    if (subCounter) subCounter.style.display = frost ? 'none' : 'inline-flex';

    const roleSelect = document.getElementById('select-legion-role');
    if (roleSelect) {
        roleSelect.innerHTML = frost
            ? '<option value="Battle">⚔️ Battle (Maximum 100)</option>'
            : '<option value="Battle">⚔️ Battle (Maximum 30)</option><option value="Substitute">🛡️ Substitute (Maximum 20)</option>';
    }

    // If the current page is Legion 2 while Frostdragon is activated, return to
    // the single Battle Group rather than leaving the user on a hidden target.
    if (frost && viewMode === 'LEGION' && currentSelection === 'Legion 2') {
        selectLegion('Legion 1');
        return;
    }

    if (typeof renderTable === 'function' && viewMode === 'LEGION') renderTable();
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
