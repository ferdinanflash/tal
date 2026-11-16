// ================= OPENING ANIMATION =================
// A short 2.5-second intro shown on every full page refresh.
function initOpeningAnimation() {
    const overlay = document.getElementById('opening-animation');
    if (!overlay) return;

    document.body.classList.add('opening-active');
    overlay.classList.remove('opening-animation-hidden');
    overlay.setAttribute('aria-hidden', 'false');

    window.setTimeout(() => {
        overlay.classList.add('opening-animation-hidden');
        document.body.classList.remove('opening-active');
        overlay.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => overlay.remove(), 300);
    }, 2500);
}

function createSnowEffect() {
    const maxOrnaments = 22;
    if (document.querySelectorAll('.christmas-ornament').length >= maxOrnaments) return;

    const ornament = document.createElement('span');
    ornament.className = 'christmas-ornament';
    ornament.setAttribute('aria-hidden', 'true');
    ornament.style.left = Math.random() * 100 + 'vw';

    const size = Math.round(Math.random() * 12 + 16);
    ornament.style.width = size + 'px';
    ornament.style.height = size + 'px';

    const colors = ['#e53935', '#16a34a', '#d4a017', '#2563eb', '#c026d3'];
    ornament.style.setProperty('--ornament-color', colors[Math.floor(Math.random() * colors.length)]);
    const durationSeconds = Math.random() * 7 + 13;
    ornament.style.animationDuration = durationSeconds + 's';
    ornament.style.opacity = (Math.random() * 0.28 + 0.62).toFixed(2);

    document.body.appendChild(ornament);
    setTimeout(() => ornament.remove(), durationSeconds * 1000);
}

function startSnowEffect() {
    if (snowIntervalId) return;
    snowIntervalId = setInterval(createSnowEffect, 650);
}

function stopSnowEffect() {
    if (snowIntervalId) {
        clearInterval(snowIntervalId);
        snowIntervalId = null;
    }
    document.querySelectorAll('.christmas-ornament').forEach(el => el.remove());
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
    btn.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#christmas-ornament-icon"></use></svg> <span class="snow-label">Christmas</span> <span class="snow-state">' + (snowEnabled ? 'ON' : 'OFF') + '</span>';
    btn.classList.toggle('snow-off', !snowEnabled);
}