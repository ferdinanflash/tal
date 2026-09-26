// ================= REDEEM CODE MODAL =================
// Ported from the reservation site (3475.web.id). Talks to the SAME
// Supabase project / `redeem-giftcode` edge function — nothing to deploy
// here, it's shared backend. See that project's
// supabase/functions/redeem-giftcode/index.ts for how the upstream call to
// Century Games' wos-giftcode-api is made and signed.
let redeemModalTrigger = null;

function setRedeemStatus(elId, message, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('is-success', 'is-error', 'is-visible');
    if (message) {
        el.classList.add('is-visible');
        if (type) el.classList.add(type === 'success' ? 'is-success' : 'is-error');
    }
}

// Disables a button + shows a spinner while an async call runs, so the user
// can't double-click. (Local to this file: core.js doesn't define one.)
function setRedeemButtonBusy(button, isBusy, busyText = null) {
    if (!button) return;
    if (isBusy) {
        button.dataset.originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner-inline"></span>${busyText || 'Please wait…'}`;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

async function invokeGiftCodeApi(payload) {
    const client = getSupabase();
    if (!client) throw new Error('no-supabase-client');
    const { data, error } = await client.functions.invoke('redeem-giftcode', { body: payload });
    if (error) throw error;
    return data; // { ok, status, data: <Century Games response> }
}

// Century Games' response shape isn't publicly documented, so this maps the
// known message strings and otherwise falls back to showing their raw `msg`
// rather than a wrong-sounding generic error.
function redeemUpstreamIsSuccess(upstream) {
    if (!upstream) return false;
    const msg = String(upstream.msg || '').trim().toUpperCase();
    return upstream.err_code === 0 || upstream.code === 0 || msg === 'SUCCESS' || msg === 'SUCCESS.';
}

// A plain `{ msg: "Timeout" }` means Century Games' own upstream call timed
// out — not a real result for the FID either way, so it's retried instead
// of shown as an error (see redeemWithTimeoutRetry below).
function redeemUpstreamIsTimeout(upstream) {
    const msg = String((upstream && upstream.msg) || '').trim().toUpperCase();
    return msg === 'TIMEOUT' || msg === 'TIMEOUT.';
}

function redeemMessageKeyFor(upstream) {
    const msg = String((upstream && upstream.msg) || '').trim().toUpperCase();
    const map = {
        'RECEIVED': 'You\'ve already redeemed this code.',
        'SAME TYPE EXCHANGE': 'You\'ve already redeemed this code.',
        'CDK NOT FOUND': 'This code doesn\'t exist.',
        'NOT FOUND': 'This code doesn\'t exist.',
        'CDK NOT FOUND.': 'This code doesn\'t exist.',
        'TIME ERROR': 'This code has expired.',
        'TIME ERROR.': 'This code has expired.',
        'USAGE LIMIT': 'This code has reached its usage limit.',
        'USED': 'This code has reached its usage limit.',
    };
    return map[msg] || null;
}

// These two upstream messages mean the *code itself* is bad (wrong/unknown
// code, or expired) rather than something specific to one FID — every
// remaining FID in the batch would fail the exact same way. So once one of
// these comes back, the rest of the batch is skipped instead of firing
// requests that can't possibly succeed, to avoid hammering the server (and
// Century Games' own rate limit) for nothing.
function redeemCodeIsFatalForBatch(upstream) {
    const msg = String((upstream && upstream.msg) || '').trim().toUpperCase();
    return ['CDK NOT FOUND', 'CDK NOT FOUND.', 'NOT FOUND', 'TIME ERROR', 'TIME ERROR.'].includes(msg);
}

// Parses the FID textarea: one ID per line (commas/spaces also accepted),
// de-duplicated, keeping first-seen order.
function parseRedeemFidList(raw) {
    const seen = new Set();
    const out = [];
    for (const piece of String(raw || '').split(/[\s,]+/)) {
        const fid = piece.trim();
        if (!fid) continue;
        if (!/^[0-9]{4,20}$/.test(fid)) continue;
        if (seen.has(fid)) continue;
        seen.add(fid);
        out.push(fid);
    }
    return out;
}

function renderRedeemResultList(rows) {
    const list = document.getElementById('redeem-result-list');
    if (!list) return;
    list.innerHTML = '';
    for (const row of rows) {
        const li = document.createElement('li');
        li.className = `redeem-result-row is-${row.status}`;
        li.textContent = `${row.fid} — ${row.message}`;
        list.appendChild(li);
    }
}

// A short pause between requests so a batch of FIDs doesn't hammer Century
// Games' API (their gift_code endpoint reported a "x-ratelimit-limit: 30"
// header) or trip an anti-bot rate check.
const REDEEM_BATCH_DELAY_MS = 1200;
const REDEEM_TIMEOUT_RETRY_DELAY_MS = 2000;
const redeemSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls invokeGiftCodeApi for a single FID, and if the upstream reply is a
// "Timeout" (see redeemUpstreamIsTimeout), waits 2s and retries the exact
// same FID again — indefinitely — until a non-timeout response comes back.
// `onRetry` lets the caller update the on-screen status row while this waits.
async function redeemWithTimeoutRetry(fid, cdk, onRetry) {
    for (;;) {
        const result = await invokeGiftCodeApi({ action: 'redeem', fid, cdk });
        const upstream = (result && result.data) || {};
        if (!redeemUpstreamIsTimeout(upstream)) return result;
        if (onRetry) onRetry();
        await redeemSleep(REDEEM_TIMEOUT_RETRY_DELAY_MS);
    }
}

async function submitRedeemCode() {
    const fidInput = document.getElementById('redeem-fid-input');
    const codeInput = document.getElementById('redeem-code-input');
    const submitBtn = document.getElementById('redeem-submit-btn');
    const cdk = (codeInput?.value || '').trim();
    const fids = parseRedeemFidList(fidInput?.value);

    setRedeemStatus('redeem-result-status', '', null);
    renderRedeemResultList([]);

    if (fids.length === 0) {
        setRedeemStatus('redeem-result-status', 'Enter a valid Player ID.', 'error');
        return;
    }
    if (!cdk) {
        setRedeemStatus('redeem-result-status', 'Enter a gift code.', 'error');
        return;
    }

    setRedeemButtonBusy(submitBtn, true, 'Redeeming…');
    const rows = fids.map((fid) => ({ fid, status: 'pending', message: 'Waiting…' }));
    renderRedeemResultList(rows);

    for (let i = 0; i < fids.length; i++) {
        const fid = fids[i];
        setRedeemStatus('redeem-result-status', `Redeeming ${i + 1}/${fids.length}…`, null);
        try {
            const result = await redeemWithTimeoutRetry(fid, cdk, () => {
                rows[i] = { fid, status: 'pending', message: 'Server timed out, retrying in 2s…' };
                renderRedeemResultList(rows);
            });
            const upstream = (result && result.data) || {};
            if (result.ok && redeemUpstreamIsSuccess(upstream)) {
                rows[i] = { fid, status: 'success', message: 'Code redeemed! Check your in-game mail.' };
            } else {
                const key = redeemMessageKeyFor(upstream);
                const message = key || (upstream.msg ? `Server said: ${escapeHtml(upstream.msg)}` : 'Something went wrong. Please try again.');
                // "Already used" isn't really a failure for this FID (the
                // account already has the reward), so mark it distinctly.
                rows[i] = { fid, status: key === 'You\'ve already redeemed this code.' ? 'info' : 'error', message };

                // Code is invalid/expired: every FID after this one would
                // get the exact same answer, so stop the batch here instead
                // of burning through the rest of the list for nothing.
                if (redeemCodeIsFatalForBatch(upstream)) {
                    for (let j = i + 1; j < fids.length; j++) {
                        rows[j] = { fid: fids[j], status: 'skipped', message: 'Skipped — code is invalid or expired.' };
                    }
                    renderRedeemResultList(rows);
                    setRedeemStatus('redeem-result-status', `Stopped: ${message} (checked ${i + 1}/${fids.length}).`, 'error');
                    setRedeemButtonBusy(submitBtn, false);
                    return;
                }
            }
        } catch (e) {
            console.error('submitRedeemCode failed for fid', fid, e);
            rows[i] = { fid, status: 'error', message: 'Something went wrong. Please try again.' };
        }
        renderRedeemResultList(rows);
        if (i < fids.length - 1) await redeemSleep(REDEEM_BATCH_DELAY_MS);
    }

    const successCount = rows.filter((r) => r.status === 'success').length;
    setRedeemStatus('redeem-result-status', `Done: ${successCount}/${fids.length} succeeded.`, 'success');
    setRedeemButtonBusy(submitBtn, false);
}

function resetRedeemForm() {
    const fidInput = document.getElementById('redeem-fid-input');
    const codeInput = document.getElementById('redeem-code-input');
    if (fidInput) fidInput.value = '';
    if (codeInput) codeInput.value = '';
    setRedeemStatus('redeem-result-status', '', null);
    renderRedeemResultList([]);
    setRedeemAllianceStatus('', null);
    setActiveAllianceLoadButton(null);
}

// ================= PREMIUM ALLIANCE REDEEM =================
// Reads every Player ID (`game_id`) straight from Supabase's `troops_power`
// table for the chosen alliance (ARX / IDN / ZXC / VNX / CAT) and drops
// them into the FID textarea, so staff can redeem a code for a whole
// alliance in one go instead of copy-pasting IDs by hand.

function setRedeemAllianceStatus(message, type) {
    const el = document.getElementById('redeem-alliance-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('is-success', 'is-error');
    if (type) el.classList.add(type === 'success' ? 'is-success' : 'is-error');
}

function setActiveAllianceLoadButton(activeBtn) {
    document.querySelectorAll('#redeem-alliance-quickload .btn-alliance-load').forEach((btn) => {
        btn.classList.toggle('is-active', btn === activeBtn);
    });
}

function setAllianceLoadButtonsBusy(isBusy) {
    document.querySelectorAll('#redeem-alliance-quickload .btn-alliance-load').forEach((btn) => {
        btn.disabled = isBusy;
    });
}

async function loadAllianceFidsForRedeem(allianceCode, buttonEl) {
    const fidInput = document.getElementById('redeem-fid-input');
    if (!fidInput) return;

    const client = getSupabase();
    if (!client) {
        setRedeemAllianceStatus('Could not connect to the database.', 'error');
        return;
    }

    setAllianceLoadButtonsBusy(true);
    setActiveAllianceLoadButton(buttonEl || null);
    setRedeemAllianceStatus(`Loading ${allianceCode} Player IDs…`, null);

    try {
        const { data, error } = await client
            .from('troops_power')
            .select('game_id')
            .eq('alliance', allianceCode);

        if (error) throw error;

        // De-dupe and drop anything that isn't a real ID (blank/malformed
        // rows), keeping first-seen order, same rule as parseRedeemFidList.
        const seen = new Set();
        const fids = [];
        for (const row of (data || [])) {
            const fid = String(row.game_id ?? '').trim();
            if (!fid || seen.has(fid)) continue;
            seen.add(fid);
            fids.push(fid);
        }

        if (fids.length === 0) {
            fidInput.value = '';
            setRedeemAllianceStatus(`No Player IDs found for ${allianceCode}.`, 'error');
            return;
        }

        fidInput.value = fids.join('\n');
        setRedeemAllianceStatus(`Loaded ${fids.length} Player ID${fids.length === 1 ? '' : 's'} from ${allianceCode}.`, 'success');
    } catch (e) {
        console.error('loadAllianceFidsForRedeem failed for alliance', allianceCode, e);
        setRedeemAllianceStatus(`Failed to load ${allianceCode} Player IDs. Please try again.`, 'error');
    } finally {
        setAllianceLoadButtonsBusy(false);
    }
}

function openRedeemModal() {
    const modal = document.getElementById('redeem-modal');
    if (!modal) return;
    redeemModalTrigger = document.activeElement;
    resetRedeemForm();
    modal.classList.remove('hidden');
    document.body.classList.add('redeem-modal-open');
    const fidInput = document.getElementById('redeem-fid-input');
    if (fidInput) fidInput.focus();
}

function closeRedeemModal() {
    const modal = document.getElementById('redeem-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('redeem-modal-open');
    if (redeemModalTrigger && typeof redeemModalTrigger.focus === 'function') {
        redeemModalTrigger.focus();
    }
    redeemModalTrigger = null;
}

// Escape-to-close is handled centrally by core.js's keydown listener
// (redeem-modal is registered in its `closers` map).
(function initRedeemModal() {
    const modal = document.getElementById('redeem-modal');
    if (!modal) return;
    let pressStartedOnBackdrop = false;
    modal.addEventListener('mousedown', (event) => {
        pressStartedOnBackdrop = event.target === modal;
    });
    modal.addEventListener('mouseup', (event) => {
        if (event.target === modal && pressStartedOnBackdrop) closeRedeemModal();
    });
})();
