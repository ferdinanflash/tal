-- Frostdragon Tyrant tools migration. Run once in Supabase SQL Editor.
alter table public.troops_power
  add column if not exists frostdragon_task text;
alter table public.footer_settings
  add column if not exists frostdragon_battlefield_open_utc timestamptz,
  add column if not exists frostdragon_roster_locked boolean not null default false,
  add column if not exists frostdragon_roster_deadline_utc timestamptz;
