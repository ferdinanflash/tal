-- Tundra Arm League Battle Plan (Foundry-style map / phases / roles)
-- Run once in Supabase SQL Editor.
-- Kolom ini terpisah dari foundry_* (IDN Foundry Battle) dan frostdragon_*.
-- Roster keanggotaan tetap memakai legion + legion_role (Battle/Substitute).
-- Slot, role, dan target fase disimpan di tundra_*.

alter table public.troops_power
  add column if not exists tundra_slot integer,   -- Battle 1-30, Substitute 1-20
  add column if not exists tundra_role text,      -- Commander, Rally Leader, Joiner, Holder, Mobile, Collector, Substitute
  add column if not exists tundra_p1 text,        -- target Phase 1
  add column if not exists tundra_p2 text,        -- target Phase 2
  add column if not exists tundra_p3 text,        -- target Phase 3
  add column if not exists tundra_cover integer,  -- Substitute: battle slot digantikan (1-30)
  add column if not exists tundra_ready integer default 0; -- checklist bitmask

comment on column public.troops_power.tundra_slot is 'Tundra battle-plan slot (Battle 1-30 / Sub 1-20)';
comment on column public.troops_power.tundra_role is 'Tundra battle-plan role';
comment on column public.troops_power.tundra_p1 is 'Tundra Phase 1 building key';
comment on column public.troops_power.tundra_p2 is 'Tundra Phase 2 building key';
comment on column public.troops_power.tundra_p3 is 'Tundra Phase 3 building key';
