-- Legion Visibility di Main Menu (President Panel). Jalankan SEKALI di Supabase SQL Editor.
-- Menyimpan daftar legion yang DISEMBUNYIKAN dari menu utama (pisah koma): l1, l2, l1b, l2b
--   l1 = Legion 1, l2 = Legion 2, l1b = Legion 1 - Alliance B, l2b = Legion 2 - Alliance B
-- Kosong = semua legion tampil (perilaku lama). Data roster tidak berubah.
alter table public.footer_settings
  add column if not exists hidden_legions text not null default '';

comment on column public.footer_settings.hidden_legions is
  'Comma-separated legion keys hidden from the Tundra main menu: l1,l2,l1b,l2b';
