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