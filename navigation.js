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
