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
