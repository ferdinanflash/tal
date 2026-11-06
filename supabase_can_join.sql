-- Can Join flag per player (alliance member eligibility for roster assignment).
-- Run once in Supabase SQL Editor.
-- true  = eligible to be assigned to Tundra / Frostdragon / Foundry rosters
-- false = marked as cannot join (still listed on alliance leaderboard; filterable)

alter table public.troops_power
  add column if not exists can_join boolean not null default true;

comment on column public.troops_power.can_join is
  'Whether this alliance member is eligible to join battle rosters (filterable in roster views).';

-- Optional: backfill any nulls if column was added without NOT NULL in an older attempt
update public.troops_power set can_join = true where can_join is null;
