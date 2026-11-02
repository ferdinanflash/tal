// Supabase Edge Function: wosatlas-states
// Optional fallback for the State Tracker (statetracker.js). The browser tries
// the WoS Atlas endpoint directly first; if that is blocked (CORS/network) it
// calls this function, which fetches the same public endpoint server-side.
//
// Deploy:  supabase functions deploy wosatlas-states
// Client:  supabase.functions.invoke('wosatlas-states', { body: { limit: 50, offset: 0 } })
//
// Not an open proxy: only the States summary endpoint is reachable, `sort` is
// limited to the one value the app uses, and limit/offset are clamped.
// Responses are cached in memory for a few minutes to keep upstream load low.

const UPSTREAM = 'https://api.wosatlas.com/v1/states/summary';
const CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(JSON.stringify({ error: 'method-not-allowed' }), 405);

  let input: Record<string, unknown> = {};
  try {
    input = await req.json();
  } catch (_) {
    // empty body -> defaults
  }

  const limit = Math.min(Math.max(Math.trunc(Number(input.limit)) || 50, 1), 50);
  const offset = Math.min(Math.max(Math.trunc(Number(input.offset)) || 0, 0), 100000);
  const desc = input.desc === false ? 'false' : 'true';
  const key = `${limit}:${offset}:${desc}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.body);

  try {
    const qs = new URLSearchParams({ sort: 'chiefs', desc, limit: String(limit), offset: String(offset) });
    const res = await fetch(`${UPSTREAM}?${qs}`, {
      headers: { accept: 'application/json', 'user-agent': 'tal.3475.web.id State Tracker' },
    });
    if (!res.ok) return json(JSON.stringify({ error: 'upstream-' + res.status }), 502);
    const body = await res.text();
    JSON.parse(body); // reject non-JSON (e.g. an HTML block page) instead of caching it

    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), body });
    return json(body);
  } catch (_) {
    return json(JSON.stringify({ error: 'upstream-failed' }), 502);
  }
});
