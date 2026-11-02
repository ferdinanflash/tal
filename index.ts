// Supabase Edge Function: wosatlas-states
// Optional fallback for State Tracker / SvS Enemies. Browser tries WoS Atlas
// directly first; if blocked (CORS/network) it calls this function.
//
// Deploy:  supabase functions deploy wosatlas-states
//
// Actions (body.action):
//   "summary" (default) — list States
//   "detail" — state + kingdom power + alliance leaderboard + player leaderboard
//     body: { kid, allianceLimit?, playerLimit? }
//   "power-leaderboard" — /power/leaderboard?kid=&limit=
//     body: { kid, limit? }
//   "alliance" — /alliances/{aid}/members
//   "player" — /players/{uid}
//   "player-extra" — /players/{uid}/power|arena|history
//   "player-search" — /players/search?playerName=

const API = 'https://api.wosatlas.com/v1';
const CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 400;
const UA = '3475.web.id SvS Enemies / State Tracker';

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
  // Up to 100 players for SvS Enemies leaderboard
  const playerLimit = Math.min(Math.max(Math.trunc(Number(input.playerLimit)) || 100, 1), 100);
  const key = `detail:${kid}:${allianceLimit}:${playerLimit}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);

  const urls = [
    `${API}/states/${kid}`,
    `${API}/kingdoms/${kid}/power`,
    `${API}/alliances/leaderboard?limit=${allianceLimit}&kid=${kid}`,
    `${API}/power/leaderboard?kid=${kid}&limit=${playerLimit}`,
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
  const leaderboard = parse(results[3]);

  // Prefer full power/leaderboard entries; fall back to short power.top
  let players: unknown[] = [];
  if (leaderboard && Array.isArray(leaderboard.entries) && leaderboard.entries.length) {
    players = leaderboard.entries;
  } else if (power && Array.isArray(power.top) && power.top.length) {
    players = power.top;
  }

  // Enrich power.top so older clients also see more players when possible
  let powerOut = power;
  if (power && players.length) {
    powerOut = { ...power, top: players };
  }

  if (!state && !power && !alliances && !players.length) {
    return jsonObj({ error: 'upstream-failed' }, 502);
  }

  const payload = JSON.stringify({
    state,
    power: powerOut,
    alliances,
    players,
    kid,
  });
  cacheSet(key, payload);
  return json(payload);
}

async function handlePowerLeaderboard(input: Record<string, unknown>) {
  const kid = Math.trunc(Number(input.kid));
  if (!Number.isFinite(kid) || kid < 1 || kid > 99999) {
    return jsonObj({ error: 'bad-kid' }, 400);
  }
  const limit = Math.min(Math.max(Math.trunc(Number(input.limit)) || 100, 1), 100);
  const key = `power-lb:${kid}:${limit}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  const up = await upstreamGet(`${API}/power/leaderboard?kid=${kid}&limit=${limit}`);
  if (!up.ok) return jsonObj({ error: 'upstream-' + up.status }, 502);
  cacheSet(key, up.body);
  return json(up.body);
}

async function handleAlliance(input: Record<string, unknown>) {
  const aid = Math.trunc(Number(input.aid));
  if (!Number.isFinite(aid) || aid < 1) return jsonObj({ error: 'bad-aid' }, 400);
  const key = `alliance:${aid}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  const up = await upstreamGet(`${API}/alliances/${aid}/members`);
  if (!up.ok) return jsonObj({ error: 'upstream-' + up.status }, 502);
  cacheSet(key, up.body);
  return json(up.body);
}

async function handlePlayer(input: Record<string, unknown>) {
  const uid = Math.trunc(Number(input.uid));
  if (!Number.isFinite(uid) || uid < 1) return jsonObj({ error: 'bad-uid' }, 400);
  const key = `player:${uid}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  const up = await upstreamGet(`${API}/players/${uid}`);
  if (!up.ok) return jsonObj({ error: 'upstream-' + up.status }, 502);
  cacheSet(key, up.body);
  return json(up.body);
}

const PLAYER_EXTRA_PATHS: Record<string, string> = {
  power: 'power',
  arena: 'arena',
  history: 'history?limit=200',
};

async function handlePlayerExtra(input: Record<string, unknown>) {
  const uid = Math.trunc(Number(input.uid));
  if (!Number.isFinite(uid) || uid < 1) return jsonObj({ error: 'bad-uid' }, 400);
  const kind = typeof input.kind === 'string' ? input.kind : '';
  const path = PLAYER_EXTRA_PATHS[kind];
  if (!path) return jsonObj({ error: 'bad-kind' }, 400);
  const key = `player-extra:${uid}:${kind}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  const up = await upstreamGet(`${API}/players/${uid}/${path}`);
  if (!up.ok) return jsonObj({ error: 'upstream-' + up.status }, 502);
  cacheSet(key, up.body);
  return json(up.body);
}

async function handlePlayerSearch(input: Record<string, unknown>) {
  const query = typeof input.query === 'string' ? input.query.trim() : String(input.query ?? '').trim();
  if (!query || query.length > 64) return jsonObj({ error: 'bad-query' }, 400);
  const key = `player-search:${query}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  const qs = new URLSearchParams({ playerName: query });
  const up = await upstreamGet(`${API}/players/search?${qs}`);
  if (!up.ok) return jsonObj({ error: 'upstream-' + up.status }, 502);
  cacheSet(key, up.body);
  return json(up.body);
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
    if (action === 'power-leaderboard') return await handlePowerLeaderboard(input);
    if (action === 'alliance') return await handleAlliance(input);
    if (action === 'player') return await handlePlayer(input);
    if (action === 'player-extra') return await handlePlayerExtra(input);
    if (action === 'player-search') return await handlePlayerSearch(input);
    return await handleSummary(input);
  } catch (_) {
    return jsonObj({ error: 'upstream-failed' }, 502);
  }
});
