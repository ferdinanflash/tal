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

    // Export whatever the table is currently showing the user (same search
    // filter + sort order as on screen), not always the full unfiltered set.
    const exportData = getDisplayData();
    if (exportData.length === 0) {
        showToast("No players match your search.", "warning");
        return;
    }

    const isLegion = viewMode === 'LEGION';
    const frost = typeof getBattleTheme === 'function' && getBattleTheme() === 'frostdragon';
    const roleField = frost ? 'frostdragon_role' : 'legion_role';
    const headers = isLegion 
        ? ["Rank", "Alliance", "Nickname", "Game ID", "Troops Power", "Preferred Time", "Legion Status"]
        : ["Rank", "Alliance", "Nickname", "Game ID", "Troops Power", "Preferred Time"];

    const rows = exportData.map((p) => {
        const base = [csvSafeField(p.__rank || '-'), csvSafeField(p.alliance), csvSafeField(p.nickname), csvSafeField(p.game_id), csvSafeField(p.troops_power), csvSafeField(p.preferred_time || '-')];
        if (isLegion) base.push(csvSafeField(p[roleField] || '-'));
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
