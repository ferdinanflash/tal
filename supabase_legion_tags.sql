-- Legion Alliance Tags di Main Menu (President Panel). Jalankan SEKALI di Supabase SQL Editor.
-- Menyimpan tag aliansi tiap legion (JSON teks), mis. {"l1":["ARX","CAT"],"l2":["IDN"]}
--   key: l1 = Legion 1, l2 = Legion 2, l1b = Legion 1 - Alliance B, l2b = Legion 2 - Alliance B
--   aliansi: ARX, IDN, VNX, ZXC, CAT
-- Kosong = tidak ada tag. Data roster tidak berubah.
alter table public.footer_settings
  add column if not exists legion_tags text not null default '';

comment on column public.footer_settings.legion_tags is
  'JSON text of alliance tags per Tundra legion: {"l1":["ARX"],"l2":["IDN"],...}';
