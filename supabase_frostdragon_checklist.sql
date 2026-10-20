-- Frostdragon Tyrant: save the Admin phase checklist on the server.
-- Run once in Supabase SQL Editor (after supabase_frostdragon_column.sql).
-- Stores {"tyrant": true, "captains": false, ...} in the existing site-wide footer_settings row,
-- so every admin / device sees the same ticks.
alter table public.footer_settings
  add column if not exists frostdragon_checklist jsonb not null default '{}'::jsonb;
