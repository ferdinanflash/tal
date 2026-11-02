// Supabase Edge Function: wosatlas-states
// Optional fallback for the State Tracker (statetracker.js). The browser tries
// the WoS Atlas endpoint directly first; if that is blocked (CORS/network) it
// calls this function, which fetches the same public endpoints server-side.
//
// Deploy:  supabase functions deploy wosatlas-states
//
// Actions (body.action):
//   "summary" (default) — list States
//     body: { limit?, offset?, desc? }
//     Client: supabase.functions.invoke('wosatlas-states', { body: { limit: 50, offset: 0 } })
//
//   "detail" — one State dossier (state + kingdom power + alliance leaderboard)
//     body: { kid, allianceLimit? }
//     Client: supabase.functions.invoke('wosatlas-states', { body: { action: 'detail', kid: 3475 } })
//
// Not an open proxy: only the endpoints listed below are reachable, inputs are
// clamped, and responses are cached in memory for a few minutes.

const API = 'https://api.wosatlas.com/v1';
const CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 400;
const UA = 'tal.3475.web.id State Tracker';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const cache = new Map<string, { at: number; body: string }>();

function json(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonObj(obj: unknown, status = 200) {
  return json(JSON.stringify(obj), status);
}

function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body;
  return null;
}

function cacheSet(key: string, body: string) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), body });
}

async function upstreamGet(url: string): Promise<{ ok: true; body: string } | { ok: false; status: number }> {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': UA },
  });
  if (!res.ok) return { ok: false, status: res.status };
  const body = await res.text();
  // Reject non-JSON (e.g. HTML block page) so we never cache garbage.
  JSON.parse(body);
  return { ok: true, body };
}

async function handleSummary(input: Record<string, unknown>) {
  const limit = Math.min(Math.max(Math.trunc(Number(input.limit)) || 50, 1), 50);
  const offset = Math.min(Math.max(Math.trunc(Number(input.offset)) || 0, 0), 100000);
  const desc = input.desc === false ? 'false' : 'true';
  const key = `summary:${limit}:${offset}:${desc}`;

  const hit = cacheGet(key);
  if (hit) return json(hit);

  const qs = new URLSearchParams({
    sort: 'chiefs',
    desc,
    limit: String(limit),
    offset: String(offset),
  });
  const up = await upstreamGet(`${API}/states/summary?${qs}`);
  if (!up.ok) return jsonObj({ error: 'upstream-' + up.status }, 502);

  cacheSet(key, up.body);
  return json(up.body);
}

async function handleDetail(input: Record<string, unknown>) {
  const kid = Math.trunc(Number(input.kid));
  if (!Number.isFinite(kid) || kid < 1 || kid > 99999) {
    return jsonObj({ error: 'bad-kid' }, 400);
  }
  const allianceLimit = Math.min(Math.max(Math.trunc(Number(input.allianceLimit)) || 15, 1), 50);
  const key = `detail:${kid}:${allianceLimit}`;

  const hit = cacheGet(key);
  if (hit) return json(hit);

  const urls = [
    `${API}/states/${kid}`,
    `${API}/kingdoms/${kid}/power`,
    `${API}/alliances/leaderboard?limit=${allianceLimit}&kid=${kid}`,
  ];

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        return await upstreamGet(url);
      } catch (_) {
        return { ok: false as const, status: 0 };
      }
    }),
  );

  const parse = (r: { ok: true; body: string } | { ok: false; status: number }) => {
    if (!r.ok) return null;
    try {
      return JSON.parse(r.body);
    } catch (_) {
      return null;
    }
  };

  const state = parse(results[0]);
  const power = parse(results[1]);
  const alliances = parse(results[2]);

  if (!state && !power && !alliances) {
    return jsonObj({ error: 'upstream-failed' }, 502);
  }

  const payload = JSON.stringify({ state, power, alliances, kid });
  cacheSet(key, payload);
  return json(payload);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonObj({ error: 'method-not-allowed' }, 405);

  let input: Record<string, unknown> = {};
  try {
    input = await req.json();
  } catch (_) {
    // empty body -> defaults
  }

  const action = typeof input.action === 'string' ? input.action : 'summary';

  try {
    if (action === 'detail') return await handleDetail(input);
    // Default and any unknown action: summary (keeps older clients working).
    return await handleSummary(input);
  } catch (_) {
    return jsonObj({ error: 'upstream-failed' }, 502);
  }
});
