// ================= PRESIDENT / GUILD INFO (Full-access staff only) =================
function openPresidentModal() {
    if (!canEditPresidentInfo()) {
        showToast("You don't have permission to edit President info.", "warning");
        return;
    }

    const presEl = document.getElementById('display-president-name');
    const guildEl = document.getElementById('display-guild-name');
    document.getElementById('input-president-name').value = (presEl && presEl.innerText !== '...') ? presEl.innerText : '';
    document.getElementById('input-guild-name').value = (guildEl && guildEl.innerText !== '...') ? guildEl.innerText : '';

    document.getElementById('president-modal').classList.remove('hidden');
}

function closePresidentModal() {
    document.getElementById('president-modal').classList.add('hidden');
}

async function submitPresidentInfo() {
    if (!canEditPresidentInfo()) return;
    const client = getSupabase();
    if (!client) return;

    const presidentName = document.getElementById('input-president-name').value.trim();
    const guildName = document.getElementById('input-guild-name').value.trim();

    if (!presidentName) { showToast("Please enter President name!", "warning"); return; }
    if (!guildName) { showToast("Please enter Guild name!", "warning"); return; }

    const confirmed = await showCustomConfirmAsync(
        `Save President as ${presidentName} and Guild as ${guildName}?`,
        '#2563eb'
    );
    if (!confirmed) return;

    const submitBtn = document.getElementById('president-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Saving..."; }

    const { error } = await client.from('footer_settings').update({
        president_name: presidentName,
        guild_name: guildName
    }).eq('id', 'main');

    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Save"; }

    if (!error) {
        showToast("President info updated!", "success");
        closePresidentModal();
        loadFooterInfo();
    } else {
        showToast("Failed to save: " + error.message, "error");
    }
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

