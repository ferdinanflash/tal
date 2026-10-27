-- Foundry Battle Roster (IDN) - tambahan. Jalankan SEKALI di Supabase SQL Editor,
-- setelah supabase_foundry_roster.sql.
--   foundry_p3    : target Phase 3 (kunci bangunan), terpisah dari Phase 2
--   foundry_cover : untuk Cadangan, nomor slot Battle (1-30) yang digantikan
--   foundry_ready : bitmask checklist kesiapan pemain (5 item, nilai 0-31)
alter table public.troops_power
  add column if not exists foundry_p3 text,
  add column if not exists foundry_cover integer,
  add column if not exists foundry_ready integer default 0;

-- Salin target Phase 2 lama ke Phase 3 supaya roster yang sudah ada tidak berubah,
-- lalu pindahkan Collector ke 'roam' di Phase 2 (Weapon Workshop baru muncul menit 30).
update public.troops_power
   set foundry_p3 = foundry_p2
 where foundry_status = 'Battle' and foundry_p3 is null;

update public.troops_power
   set foundry_p2 = 'roam'
 where foundry_status = 'Battle' and foundry_role = 'Collector' and foundry_p2 = 'workshop';
