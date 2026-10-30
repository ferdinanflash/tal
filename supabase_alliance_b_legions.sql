-- Tundra Arm League — Legion Cadangan Alliance B
-- Run once in Supabase SQL Editor.
-- Dua legion cadangan: "Legion 1 - Alliance B" dan "Legion 2 - Alliance B".
-- Hanya muncul di menu jika alliance_b_enabled = true (di-set dari President Panel).

alter table public.footer_settings
  add column if not exists alliance_b_enabled boolean not null default false;

alter table public.footer_settings
  add column if not exists legion1b_schedule text;

alter table public.footer_settings
  add column if not exists legion2b_schedule text;

comment on column public.footer_settings.alliance_b_enabled is
  'When true, show Legion 1 - Alliance B and Legion 2 - Alliance B on the Tundra menu';
