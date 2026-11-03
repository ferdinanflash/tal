// Supabase Edge Function: wosatlas-states
// Proxy for State Tracker / SvS Enemies.
// api.wosatlas.com requires an API key (401 without it), so "detail",
// "power-leaderboard" and "alliance" now use the PUBLIC site endpoints
// https://wosatlas.com/api/v1/servers/{kid}[/alliances|/players] (no key).
// WOSATLAS_API_KEY is no longer needed.
//
// Deploy:
//   supabase functions deploy wosatlas-states
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
const FN_VERSION = '2026-11-03-paging-v2';
// Filled by fetchAllServers so the client/console can see what wosatlas returned.
let lastPaging: Record<string, unknown> = {};
const API_KEY = (Deno.env.get('WOSATLAS_API_KEY') || '').trim();

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

function upstreamHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    accept: 'application/json',
    'user-agent': UA,
  };
  if (API_KEY) {
    // WoS Atlas accepts several common forms; send both to be safe.
    h['X-Api-Key'] = API_KEY;
    h['Authorization'] = `Bearer ${API_KEY}`;
  }
  return h;
}

async function upstreamGet(url: string): Promise<{ ok: true; body: string } | { ok: false; status: number }> {
  const res = await fetch(url, {
    headers: upstreamHeaders(),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const body = await res.text();
  JSON.parse(body);
  return { ok: true, body };
}

// ---------- Public site endpoints (no API key) ----------
const SITE = 'https://wosatlas.com/api/v1';

let lastSiteStatus: number | string | null = null;

async function siteGet(path: string): Promise<any | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${SITE}${path}`, {
        headers: { accept: 'application/json', 'user-agent': UA },
      });
      lastSiteStatus = res.status;
      if (res.ok) return JSON.parse(await res.text());
      if (res.status !== 429 && res.status < 500) return null;
    } catch (e) {
      lastSiteStatus = `fetch-error: ${(e as Error).message}`;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

// Cursor pagination: responses carry `next` (opaque cursor) when there is more.
// For /servers the cursor is base64("k|<last server_id>"), so when `next` is
// missing we build it ourselves from the last item (stops when nothing new).
async function siteGetPaged(
  path: string,
  idOf: (it: any) => string,
  maxItems: number,
  synthCursor?: (last: any) => string | null,
  maxPages = 400,
  onPage?: () => void,
): Promise<any[] | null> {
  const sep = path.includes('?') ? '&' : '?';
  const seen = new Set<string>();
  const out: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < maxPages && out.length < maxItems; page++) {
    const url = cursor ? `${path}${sep}cursor=${encodeURIComponent(cursor)}` : path;
    const data = await siteGet(url);
    onPage?.();
    if (!data) return page === 0 ? null : out;
    const items: any[] = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
    let added = 0;
    for (const it of items) {
      const id = idOf(it);
      if (!seen.has(id)) { seen.add(id); out.push(it); added++; }
    }
    if (!added) break;
    const next = data && typeof data.next === 'string' && data.next ? data.next : null;
    cursor = next || (synthCursor ? synthCursor(items[items.length - 1]) : null);
    if (!cursor) break;
  }
  return out.slice(0, maxItems);
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchServer(kid: number) {
  return await siteGet(`/servers/${kid}`);
}

async function fetchServerAlliances(kid: number, limit: number): Promise<any[] | null> {
  const key = `alliances:${kid}:${limit}`;
  const hit = cacheGet(key);
  if (hit) return JSON.parse(hit);
  const items = await siteGetPaged(
    `/servers/${kid}/alliances?sort=power&limit=${Math.min(Math.max(limit, 1), 200)}`,
    (a) => String(a.alliance_id),
    limit,
    undefined,
    20,
  );
  if (items) cacheSet(key, JSON.stringify(items));
  return items;
}

function mapMember(m: any, i: number) {
  return {
    rank: i + 1,
    uid: m.uid ?? null,
    nick_name: m.name ?? null,
    power: num(m.power) ?? 0,
    stove_lv: m.hq_level ?? null,
    lv: m.hq_level ?? null,
    x: m.x ?? null,
    y: m.y ?? null,
    alliance_tag: m.alliance_tag ?? null,
  };
}

async function fetchAllianceMembers(aid: number): Promise<any[]> {
  const key = `members:${aid}`;
  const hit = cacheGet(key);
  if (hit) return JSON.parse(hit);
  const items = (await siteGetPaged(
    `/alliances/${aid}/members?limit=200`,
    (m) => String(m.uid),
    200,
    undefined,
    10,
  )) || [];
  cacheSet(key, JSON.stringify(items));
  return items;
}

// There is no per-server player list endpoint, so build the leaderboard from
// the members of the strongest alliances (players without an alliance are missed).
const PLAYER_SOURCE_ALLIANCES = 10;

async function fetchServerPlayers(kid: number, limit: number): Promise<any[]> {
  const key = `players:${kid}:${limit}`;
  const hit = cacheGet(key);
  if (hit) return JSON.parse(hit);
  const alliances = (await fetchServerAlliances(kid, 50)) || [];
  const lists = await Promise.all(
    alliances.slice(0, PLAYER_SOURCE_ALLIANCES).map((a: any) => fetchAllianceMembers(Number(a.alliance_id))),
  );
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const m of lists.flat()) {
    const uid = String(m.uid);
    if (seen.has(uid)) continue;
    seen.add(uid);
    merged.push(m);
  }
  merged.sort((a, b) => (num(b.power) ?? 0) - (num(a.power) ?? 0));
  const out = merged.slice(0, limit).map(mapMember);
  cacheSet(key, JSON.stringify(out));
  return out;
}

async function handleDetail(input: Record<string, unknown>) {
  const kid = Math.trunc(Number(input.kid));
  if (!Number.isFinite(kid) || kid < 1 || kid > 99999) {
    return jsonObj({ error: 'bad-kid' }, 400);
  }
  const allianceLimit = Math.min(Math.max(Math.trunc(Number(input.allianceLimit)) || 15, 1), 50);
  const playerLimit = Math.min(Math.max(Math.trunc(Number(input.playerLimit)) || 100, 1), 100);
  const key = `detail:${kid}:${allianceLimit}:${playerLimit}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);

  const [server, allianceItems, players] = await Promise.all([
    fetchServer(kid),
    fetchServerAlliances(kid, allianceLimit),
    fetchServerPlayers(kid, playerLimit),
  ]);

  if (!server && !allianceItems && !players.length) {
    return jsonObj({
      error: 'upstream-failed',
      message: 'wosatlas.com/api/v1/servers/' + kid + ' could not be loaded.',
    }, 502);
  }

  const rollup = (server && server.rollup) || {};
  const king = server && Array.isArray(server.roles)
    ? server.roles.find((r: any) => r && r.role === 'king')
    : null;

  const totalPower = num(rollup.player_power);
  const playerCount = num(rollup.players);

  const state = server
    ? {
        server_id: server.server_id ?? String(kid),
        chiefs: playerCount,
        total_power: totalPower,
        alliance_count: num(rollup.alliances),
        king: king ? { uid: king.uid, nick_name: null } : null,
        refreshed_at: rollup.refreshed_at ?? null,
      }
    : null;

  const power = server
    ? { player_count: playerCount, total_power: totalPower, top: players }
    : null;

  const alliances = allianceItems
    ? {
        entries: allianceItems.slice(0, allianceLimit).map((a: any) => ({
          ...a,
          aid: Number(a.alliance_id),
          abbr: a.tag,
          members: a.member_count,
          memberMax: a.max_members,
          totalPower: a.power,
          maxPower: a.held_members ? a.held_members.power_max : 0,
          publicRecruit: !!a.public_recruit,
        })),
      }
    : null;

  const payload = JSON.stringify({ state, power, alliances, players, kid });
  cacheSet(key, payload);
  return json(payload);
}

async function handlePowerLeaderboard(input: Record<string, unknown>) {
  const kid = Math.trunc(Number(input.kid));
  if (!Number.isFinite(kid) || kid < 1 || kid > 99999) {
    return jsonObj({ error: 'bad-kid' }, 400);
  }
  const limit = Math.min(Math.max(Math.trunc(Number(input.limit)) || 100, 1), 100);
  const entries = await fetchServerPlayers(kid, limit);
  return jsonObj({ entries });
}

async function handleAlliance(input: Record<string, unknown>) {
  const aid = Math.trunc(Number(input.aid));
  if (!Number.isFinite(aid) || aid < 1) return jsonObj({ error: 'bad-aid' }, 400);
  const key = `alliance:${aid}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  // alliance_id looks like "<serverId><6-digit seq>", e.g. 3369000011
  const kid = Math.trunc(aid / 1_000_000);
  const items = await fetchServerAlliances(kid, 200);
  const a = items ? items.find((x: any) => Number(x.alliance_id) === aid) : null;
  if (!a) return jsonObj({ error: 'alliance-not-found' }, 404);
  const held = a.held_members || {};
  const memberItems = await fetchAllianceMembers(aid);
  const body = JSON.stringify({
    members: memberItems.map(mapMember),
    aid,
    abbr: a.tag,
    name: a.name,
    memberCount: a.member_count,
    memberMax: a.max_members,
    serverPower: a.power,
    leaderUid: a.leader_uid,
    leaderName: a.leader_name,
    lv: a.alliance_level,
    joinMinLevel: a.join_min_level,
    joinMinPower: a.join_min_power,
    publicRecruit: !!a.public_recruit,
    homeKid: Number(a.home_server_id) || kid,
    honorLevel: a.honor_level,
    heldMembers: held,
  });
  cacheSet(key, body);
  return json(body);
}

// ---------- State list (State Tracker) ----------
// /servers returns one page at a time (cursor pagination, see siteGetPaged).
async function fetchAllServers(): Promise<any[]> {
  const key = 'servers:all';
  const hit = cacheGet(key);
  if (hit) return JSON.parse(hit);
  const t0 = Date.now();
  let pages = 0;
  const all = (await siteGetPaged(
    '/servers?limit=200',
    (x) => String(x.server_id),
    100000,
    (last) => (last && last.server_id != null ? btoa(`k|${last.server_id}`) : null),
    400,
    () => { pages++; },
  )) || [];
  const blocked = typeof lastSiteStatus === 'number' ? lastSiteStatus >= 400 : lastSiteStatus !== null;
  lastPaging = { fn: FN_VERSION, items: all.length, pages, lastStatus: lastSiteStatus, blocked, ms: Date.now() - t0 };
  console.log('[wosatlas-states] servers', JSON.stringify(lastPaging));
  // A list this short is almost certainly a failed/trimmed paging run: don't pin it in cache.
  if (all.length > 25) cacheSet(key, JSON.stringify(all));
  return all;
}

async function handleSummary(input: Record<string, unknown>) {
  const limit = Math.min(Math.max(Math.trunc(Number(input.limit)) || 50, 1), 50);
  const offset = Math.min(Math.max(Math.trunc(Number(input.offset)) || 0, 0), 100000);
  // Official route: with a WOSATLAS_API_KEY secret, use api.wosatlas.com directly
  // (50 States per request). Falls through to the public site list if it fails.
  if (API_KEY) {
    const qs = new URLSearchParams({ sort: 'chiefs', desc: 'true', limit: String(limit), offset: String(offset) });
    const r = await upstreamGet(`${API}/states/summary?${qs}`);
    if (r.ok) {
      const j = JSON.parse(r.body);
      if (j && Array.isArray(j.entries)) {
        j.meta = { fn: FN_VERSION, source: 'api-key' };
        return jsonObj(j);
      }
    }
    lastPaging = { ...lastPaging, apiKeyStatus: r.ok ? 'bad-shape' : r.status };
  }
  const all = await fetchAllServers();
  if (!all.length) return jsonObj({ error: 'upstream-failed', message: 'wosatlas.com/api/v1/servers could not be loaded.' }, 502);
  const rows = all
    .filter((x: any) => x && x.rollup && Number.isFinite(Number(x.server_id)))
    .map((x: any) => ({
      kid: Number(x.server_id),
      chiefs: num(x.rollup.players) ?? 0,
      alliances: num(x.rollup.alliances) ?? 0,
      recruitingAlliances: 0,
      shielded: 0,
      generation_ceiling: x.generation_ceiling ?? null,
      recorded_at: x.rollup.refreshed_at ?? null,
      total_power: num(x.rollup.player_power) ?? 0,
      median_power: 0,
      max_power: 0,
      topAlliance: null,
    }))
    .sort((a: any, b: any) => b.chiefs - a.chiefs);
  return jsonObj({
    entries: rows.slice(offset, offset + limit),
    total: rows.length,
    recorded_at: rows[0] ? rows[0].recorded_at : null,
    partial: lastPaging.blocked === true,
    meta: { fn: FN_VERSION, ...lastPaging },
  });
}

// ---------- Players (public /players/{uid}) ----------
function mapPlayer(p: any) {
  const pct = num(p.last_power_step && p.last_power_step.pct);
  return {
    uid: p.uid,
    nick_name: p.name ?? null,
    current_power: num(p.power) ?? 0,
    stove_lv: p.hq_level ?? null,
    kid: p.current_server_id ?? p.home_server_id ?? null,
    aid: p.alliance_id ?? null,
    abbr: p.alliance_tag ?? '',
    alliance_name: p.alliance_name ?? null,
    last_jump_pct: pct == null ? null : pct / 100,
    observed_at: p.last_seen_at ?? null,
    furnace_rank: p.board_rank && p.board_rank.rank ? p.board_rank.rank : null,
  };
}

async function handlePlayer(input: Record<string, unknown>) {
  const uid = Math.trunc(Number(input.uid));
  if (!Number.isFinite(uid) || uid < 1) return jsonObj({ error: 'bad-uid' }, 400);
  const key = `player:${uid}`;
  const hit = cacheGet(key);
  if (hit) return json(hit);
  const p = await siteGet(`/players/${uid}`);
  if (!p) return jsonObj({ error: 'player-not-found' }, 404);
  const body = JSON.stringify({ players: [mapPlayer(p)] });
  cacheSet(key, body);
  return json(body);
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
  const data = await siteGet(`/players/${uid}/${path}`);
  if (!data) return jsonObj({ error: 'unavailable' }, 404);
  const body = JSON.stringify(data);
  cacheSet(key, body);
  return json(body);
}

// Public search: /search?q= returns players and alliances.
async function handlePlayerSearch(input: Record<string, unknown>) {
  const query = typeof input.query === 'string' ? input.query.trim() : String(input.query ?? '').trim();
  if (!query || query.length > 64) return jsonObj({ error: 'bad-query' }, 400);
  const data = await siteGet(`/search?q=${encodeURIComponent(query)}`);
  const items: any[] = data && Array.isArray(data.items) ? data.items : [];
  const players: any[] = [];
  for (const it of items) {
    const kind = String(it.kind || '').toLowerCase();
    const name = it.name || it.matched_name || '';
    if (kind === 'player') {
      players.push({ kind: 'player', uid: it.id, nick_name: name, kid: it.server_id, aid: it.alliance_id, abbr: it.alliance_tag || '' });
    } else if (kind === 'alliance') {
      players.push({ kind: 'alliance', aid: it.id || it.alliance_id, name, abbr: it.tag || it.alliance_tag || it.abbr || '', kid: it.server_id || it.home_server_id });
    }
  }
  if (!players.length && /^\d+$/.test(query)) {
    const p = await siteGet(`/players/${query}`);
    if (p) return jsonObj({ players: [mapPlayer(p)] });
  }
  return jsonObj({ players });
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
