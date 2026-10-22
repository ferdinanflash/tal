// ================= LOAD & RENDER DATA =================
function showTableLoadingSkeleton() {
    isTableLoading = true;
    const tbody = document.getElementById('troops-table-body');
    const tableContainer = document.querySelector('.table-container');
    if (!tbody) return;
    if (tableContainer) tableContainer.setAttribute('aria-busy', 'true');
    const updatedEl = document.getElementById('last-updated-text');
    if (updatedEl) updatedEl.innerText = 'Loading latest data...';
    const skeletonColumns = viewMode === 'LEGION' ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6);
    let rows = '';
    for (let i = 0; i < 6; i++) {
        rows += `<tr class="skeleton-row"><td colspan="${skeletonColumns}"><div class="skeleton-bar"></div></td></tr>`;
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
            // Alliance-level browsing is the shared player pool: same data for
            // both Battle Themes.
            let query = client.from('troops_power').select('*').order('troops_power', { ascending: false });
            if (currentSelection !== 'ALL') {
                query = query.eq('alliance', currentSelection);
            }
            const { data, error } = await query;
            if (error) throw error;
            loadedTroopsData = data || [];
        } else {
            const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
            let legionQuery = client.from('troops_power').select('*');

            if (frost) {
                // Frostdragon Tyrant's roster is tracked entirely via the
                // frostdragon_role column, independent of `legion` (which stays
                // whatever it is for Tundra Arm League for this same player).
                legionQuery = legionQuery.eq('frostdragon_role', 'Battle');
            } else {
                legionQuery = legionQuery.eq('legion', currentSelection);
            }

            const { data, error } = await legionQuery;
            if (error) throw error;

            const roleField = frost ? 'frostdragon_role' : 'legion_role';
            loadedTroopsData = (data || []).sort((a, b) => {
                const rolePriority = frost ? { 'Battle': 1 } : { 'Battle': 1, 'Substitute': 2 };
                const priorityA = rolePriority[a[roleField]] || 99;
                const priorityB = rolePriority[b[roleField]] || 99;

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
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.removeAttribute('aria-busy');
        lastUpdatedAt = new Date();
        renderTable();
        updateLastUpdatedDisplay();
    } catch (err) {
        isTableLoading = false;
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.removeAttribute('aria-busy');
        console.error("Error fetching data:", err);
        const message = err?.message || "Unable to connect to the database.";
        showTableError(message);
    }
}

function showTableError(message = "Unable to load data right now.") {
    const tbody = document.getElementById('troops-table-body');
    const pagination = document.getElementById('pagination-controls');
    if (pagination) pagination.style.display = "none";
    if (!tbody) return;

    const totalColumns = viewMode === 'LEGION' ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6);
    tbody.innerHTML = `
        <tr class="table-state-row table-error-row">
            <td colspan="${totalColumns}">
                <div class="table-state-content">
                    <div class="table-state-icon">⚠️</div>
                    <strong>Failed to load data</strong>
                    <span>${escapeHtml(message)}</span>
                    <button class="btn-apply table-retry-btn" type="button" onclick="fetchData()">Retry</button>
                </div>
            </td>
        </tr>`;
}


// ================= GUEST MASKING (Game ID + Troops Power) =================
// Guests see these two columns masked; staff and verified players see them.
function updateSensitiveUiState() {
    const locked = !canViewSensitive();
    ['game_id', 'troops_power'].forEach(f => {
        const th = document.getElementById('sort-arrow-' + f)?.closest('th');
        if (th) th.classList.toggle('sort-locked', locked);
    });
    const search = document.getElementById('search-input');
    if (search) {
        search.placeholder = locked ? '🔍 Search nickname...' : '🔍 Search nickname or Game ID...';
    }
}

// ================= SEARCH / SORT / PAGINATION HELPERS =================
function getDisplayData() {
    let data = [...loadedTroopsData];

    if (searchQuery) {
        const canSearchId = canViewSensitive();
        data = data.filter(p =>
            (p.nickname || '').toLowerCase().includes(searchQuery) ||
            (canSearchId && String(p.game_id || '').toLowerCase().includes(searchQuery))
        );
    }

    if (typeof isFdtAllianceFilterActive === 'function' && isFdtAllianceFilterActive()) {
        data = getFdtAllianceScoped(data);
    }

    const sortLocked = !canViewSensitive() && (currentSortField === 'game_id' || currentSortField === 'troops_power');
    if (currentSortField && !sortLocked) {
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
    if (!canViewSensitive() && (field === 'game_id' || field === 'troops_power')) {
        showToast("Login to use this.", "warning");
        return;
    }
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
    const totalPages = Math.max(1, Math.ceil(getDisplayData().length / PAGE_SIZE));
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
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

// ================= BULK SELECT (roster view) =================
const selectedRosterIds = new Set();

// Bulk tools exist only in a roster (Legion / FDT) view, for staff who may manage it.
function isBulkRosterMode() {
    return isAdmin && viewMode === 'LEGION' && canManageLegion(currentSelection);
}

function updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    const thSelect = document.getElementById('th-select');
    const bulk = isBulkRosterMode();
    if (thSelect) thSelect.style.display = bulk ? 'table-cell' : 'none';
    if (!bar) return;
    bar.classList.toggle('hidden', !bulk);
    if (!bulk) return;

    const count = selectedRosterIds.size;
    const countEl = document.getElementById('bulk-count');
    if (countEl) countEl.innerText = `${count} selected`;
    const removeBtn = document.getElementById('bulk-remove-btn');
    if (removeBtn) removeBtn.disabled = count === 0;

    // Header checkbox: checked = every shown player selected, indeterminate = some
    const all = document.getElementById('roster-select-all');
    if (all) {
        const shownIds = getDisplayData().map(p => Number(p.id));
        const selectedShown = shownIds.filter(id => selectedRosterIds.has(id)).length;
        all.checked = shownIds.length > 0 && selectedShown === shownIds.length;
        all.indeterminate = selectedShown > 0 && selectedShown < shownIds.length;
    }

    // Alliance quick-select: only alliances present in this roster
    const sel = document.getElementById('bulk-alliance-select');
    if (sel) {
        const present = [...new Set(loadedTroopsData.map(p => p.alliance).filter(Boolean))].sort();
        const key = present.join('|');
        if (sel.dataset.key !== key) {
            sel.innerHTML = '<option value="">Select by alliance…</option>' +
                present.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
            sel.dataset.key = key;
        }
    }
}

// Selects/unselects everything the current search/filter shows (all pages).
function toggleSelectAllRoster(checked) {
    if (!isBulkRosterMode()) return;
    getDisplayData().forEach(p => {
        if (checked) selectedRosterIds.add(Number(p.id)); else selectedRosterIds.delete(Number(p.id));
    });
    renderTable();
}

function selectRosterByAlliance(code) {
    const sel = document.getElementById('bulk-alliance-select');
    if (sel) sel.value = '';
    if (!code || !isBulkRosterMode()) return;
    const matches = getDisplayData().filter(p => p.alliance === code);
    if (matches.length === 0) {
        showToast(`No ${code} players in this roster.`, 'info');
        return;
    }
    matches.forEach(p => selectedRosterIds.add(Number(p.id)));
    renderTable();
    showToast(`${matches.length} ${code} player(s) selected.`, 'info');
}

function clearRosterSelection() {
    selectedRosterIds.clear();
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('troops-table-body');
    const thAction = document.getElementById('th-action');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (thAction) {
        thAction.style.display = isAdmin ? "table-cell" : "none";
    }
    updateSensitiveUiState();

    // Keep only selections that still exist in the loaded roster (and none outside bulk mode)
    const bulkMode = isBulkRosterMode();
    if (!bulkMode) {
        selectedRosterIds.clear();
    } else {
        const loadedIds = new Set(loadedTroopsData.map(p => Number(p.id)));
        [...selectedRosterIds].forEach(id => { if (!loadedIds.has(id)) selectedRosterIds.delete(id); });
    }
    const taskHeader = document.getElementById('th-frostdragon-task');
    if (taskHeader) taskHeader.style.display = (viewMode === 'LEGION' && typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon') ? 'table-cell' : 'none';
    if (typeof updateFdtAllianceFilterUi === 'function') updateFdtAllianceFilterUi();

    if (viewMode === 'LEGION') {
        const roleField = (typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon') ? 'frostdragon_role' : 'legion_role';
        const countBattle = loadedTroopsData.filter(p => p[roleField] === 'Battle').length;
        const countSub = loadedTroopsData.filter(p => p[roleField] === 'Substitute').length;

        document.getElementById('count-battle').innerText = countBattle;
        document.getElementById('count-substitute').innerText = countSub;
    }

    // ================= DINAMIS RENDER KOTAK RINGKASAN POWER =================
    const summaryBoxContainer = document.getElementById('dynamic-summary-cards');
    summaryBoxContainer.innerHTML = "";

    const sortedByPower = [...loadedTroopsData].sort((a, b) => b.troops_power - a.troops_power);

    const hideSummary = HIDE_SUMMARY_FOR_GUESTS && !canViewSensitive();
    if (hideSummary) {
        summaryBoxContainer.style.gridTemplateColumns = "1fr";
        summaryBoxContainer.innerHTML = `<div style="padding: 12px; background: #111827; border: 1px dashed #334155; border-radius: 10px; text-align: center; color: #8a8d98; font-size: 0.85rem;">🔒 Login to see Troops Power totals.</div>`;
    } else if (viewMode === 'LEGION') {
        const roleField = (typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon') ? 'frostdragon_role' : 'legion_role';
        // When "View by Alliance" is active (Frostdragon), the power cards follow the selected alliance.
        const summaryData = (typeof getFdtAllianceScoped === 'function') ? getFdtAllianceScoped(loadedTroopsData) : loadedTroopsData;
        const summarySorted = [...summaryData].sort((a, b) => b.troops_power - a.troops_power);
        const top20 = summarySorted.slice(0, 20).reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const battle = summaryData.filter(p => p[roleField] === 'Battle').reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);
        const sub = summaryData.filter(p => p[roleField] === 'Substitute').reduce((sum, p) => sum + (Number(p.troops_power) || 0), 0);

        const isFdtSummary = roleField === 'frostdragon_role'; // Frostdragon has no substitutes
        summaryBoxContainer.style.gridTemplateColumns = isFdtSummary ? "repeat(2, 1fr)" : "repeat(3, 1fr)";
        summaryBoxContainer.innerHTML = `
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Top 20 Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #f59e0b;">${top20.toLocaleString('en-US')}</div>
            </div>
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Battle Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #4ade80;">${battle.toLocaleString('en-US')}</div>
            </div>
            ${isFdtSummary ? '' : `
            <div style="padding: 10px; background: linear-gradient(135deg, #1e2230 0%, #111827 100%); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 10px; text-align: center;">
                <div style="font-size: 0.7rem; color: #8a8d98; font-weight: 600; text-transform: uppercase; margin-bottom: 3px;">Substitute Troops Power</div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #3b82f6;">${sub.toLocaleString('en-US')}</div>
            </div>
            `}
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
    if (bulkMode) totalColumns++;

    if (loadedTroopsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="padding: 20px; color: #8a8d98;">No player data available.</td></tr>`;
        updatePaginationControls(0);
        updateBulkBar();
        return;
    }

    // Apply search filter + custom sort (if any) on top of the loaded data
    const displayData = getDisplayData();

    if (displayData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="padding: 20px; color: #8a8d98;">No players match your search or filter.</td></tr>`;
        updatePaginationControls(0);
        updateBulkBar();
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
        const currentRoleField = (typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon') ? 'frostdragon_role' : 'legion_role';
        const safeLegionRole = escapeHtml(player[currentRoleField]);

        const frostTaskOptions = (typeof FDT_TASKS !== 'undefined') ? FDT_TASKS : ['Rally Captain', 'Tyrant Candidate', 'Capital Reinforcer', 'Spire Life', 'Spire Shield', 'Spire Dragonbane', 'Spire Blade', 'Dragonite Collector', 'Capital Defense', 'Alliance A', 'Alliance B'];
        const isFrostView = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
        const selectedFdtTasks = typeof parseFdtTasks === 'function' ? parseFdtTasks(player.frostdragon_task) : String(player.frostdragon_task || '').split(',').map(t => t.trim()).filter(Boolean);
        const taskChips = typeof formatFdtTaskChips === 'function' ? formatFdtTaskChips(player.frostdragon_task) : escapeHtml(player.frostdragon_task || '—');
        const fdtDisabled = typeof fdtSettings !== "undefined" && fdtSettings.locked ? 'disabled' : '';
        const taskPicker = isAdmin ? `<details class="fdt-task-picker" ${fdtDisabled ? '' : ''}><summary ${fdtDisabled ? 'aria-disabled="true"' : ''}>Select tasks (${selectedFdtTasks.length})</summary><div class="fdt-task-options">${frostTaskOptions.map(t => `<label><input type="checkbox" value="${t}" ${selectedFdtTasks.includes(t) ? 'checked' : ''} ${fdtDisabled} onchange="toggleFrostdragonTask(${playerId}, '${t}', this.checked)"><span>${t}</span></label>`).join('')}</div></details>` : '';
        const taskCellHtml = (viewMode === 'LEGION' && isFrostView) ? `<td data-label="Frostdragon Task"><div class="fdt-task-cell"><div id="fdt-task-chips-${playerId}" class="fdt-task-chips">${taskChips}</div>${taskPicker}</div></td>` : '';
        let statusCellHtml = '';
        if (viewMode === 'LEGION') {
            const isBattle = player[currentRoleField] === 'Battle';
            const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
            const badgeStyle = isBattle 
                ? 'background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #4ade80;'
                : 'background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24;';
            
            const swordSvgIcon = `
                <svg class="clash-svg" viewBox="0 0 100 100" style="width: 16px; height: 16px; margin-right: 4px; color:#22c55e;">
                    <use href="#clash-sword-icon"></use>
                </svg>`;

            const badgeLabel = isBattle ? `${swordSvgIcon} Battle` : (frost ? '' : '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#alliance-shield-icon"></use></svg> Substitute');

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

        const isSelected = bulkMode && selectedRosterIds.has(playerId);
        if (isSelected) row.classList.add('row-selected');
        const selectCellHtml = bulkMode
            ? `<td data-label="Select" class="bulk-select-cell"><input type="checkbox" class="js-roster-select" data-id="${playerId}" aria-label="Select ${safeNickname}" ${isSelected ? 'checked' : ''}></td>`
            : '';

        row.innerHTML = `
            ${selectCellHtml}
            <td data-label="Rank"><strong style="color: ${rank !== '-' && rank <= 20 ? '#f59e0b' : '#f1f5f9'};">#${rank}</strong></td>
            <td data-label="Alliance"><span style="background: #1e2230; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: ${allianceTextColor}; border: 1px solid ${allianceTextColor}40;">${safeAlliance}</span></td>
            <td data-label="Nickname"><strong>${safeNickname}</strong></td>
            <td data-label="Game ID">${canViewSensitive()
                ? `<span class="js-copy-gameid" style="cursor:pointer; color:#3b82f6; text-decoration:underline;" data-gameid="${safeGameId}">${safeGameId}</span>`
                : `<span class="masked-value" title="Login to view">${MASKED_TEXT}</span>`}</td>
            <td data-label="Troops Power">${canViewSensitive()
                ? `<strong style="color: #22c55e;">${formattedPower}</strong>`
                : `<span class="masked-value" title="Login to view">${MASKED_TEXT}</span>`}</td>
            <td data-label="Pref. Time"><span style="color: #f59e0b; font-weight: 600;">${safePrefTime}</span></td>
            ${taskCellHtml}
            ${statusCellHtml}
            ${actionCellHtml}
        `;

        tbody.appendChild(row);
    });

    updatePaginationControls(displayData.length);
    updateBulkBar();
}

// ================= PLAYER MODAL & EDIT =================
