-- Optional: persist ZenRows Zr-Cookies across Vercel cold starts (12h TTL enforced in api/tracker.js)
create table if not exists public.wos_proxy_cache (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.wos_proxy_cache enable row level security;
-- No policies for anon/authenticated — only service_role (bypasses RLS) should write/read.
