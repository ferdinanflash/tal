-- GLOBAL BATTLE THEME
-- Run this once in Supabase SQL Editor. The President Panel stores the active
-- theme in the existing site-wide footer_settings row, so every browser reads
-- the same value.

alter table public.footer_settings
  add column if not exists battle_theme text not null default 'tundra';

alter table public.footer_settings
  drop constraint if exists footer_settings_battle_theme_check;

alter table public.footer_settings
  add constraint footer_settings_battle_theme_check
  check (battle_theme in ('tundra', 'frostdragon'));

update public.footer_settings
set battle_theme = 'tundra'
where id = 'main' and (battle_theme is null or battle_theme not in ('tundra', 'frostdragon'));

-- Optional but recommended if you want instant Realtime updates later:
-- alter publication supabase_realtime add table public.footer_settings;
