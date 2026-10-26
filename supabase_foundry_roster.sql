-- Foundry Battle Roster (IDN). Run once in Supabase SQL Editor.
-- Roster Foundry disimpan terpisah dari Tundra Arm League & Frostdragon Tyrant,
-- sehingga tidak saling menimpa.
alter table public.troops_power
  add column if not exists foundry_legion text,   -- 'Legion 1' | 'Legion 2'
  add column if not exists foundry_status text,   -- 'Battle' | 'Substitute'
  add column if not exists foundry_slot integer,  -- Battle 1-30, Substitute 1-10
  add column if not exists foundry_role text,     -- Commander, Rally Leader, Joiner, Mobile, Holder, Collector
  add column if not exists foundry_p1 text,       -- target Phase 1 (kunci bangunan)
  add column if not exists foundry_p2 text;       -- target Phase 2/3 (kunci bangunan)
