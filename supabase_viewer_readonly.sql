-- ============================================================
-- Akun viewer bersama: member@3475-staff.internal  =>  VIEW ONLY
-- Jalankan SEKALI di Supabase -> SQL Editor.
--
-- Cara kerja: policy RESTRICTIVE dihitung bersama (AND) dengan policy lama
-- Anda, jadi tidak perlu mengubah/menghapus policy yang sudah ada. Akun
-- "member" tetap bisa SELECT (melihat semua), tapi INSERT / UPDATE / DELETE
-- ditolak oleh database di tabel yang dipakai aplikasi:
--   - public.troops_power
--   - public.footer_settings
-- Penegakannya di server, jadi tidak bisa dilewati lewat devtools.
--
-- Akun dikenali dari username (email tanpa @3475-staff.internal) atau
-- role_key bila akun pernah di-rename dari President Panel, sama seperti
-- logika di supabase_staff_accounts.sql. Kalau ingin username viewer lain,
-- ganti 'member' di fungsi di bawah (dan di STAFF_ROLES pada core.js).
-- ============================================================

create or replace function public._is_viewer_only()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select coalesce(u.raw_app_meta_data->>'role_key',
                     replace(u.email, '@3475-staff.internal', '')) = 'member'
       from auth.users u
      where u.id = auth.uid()),
    false);
$$;

revoke all on function public._is_viewer_only() from public, anon;
grant execute on function public._is_viewer_only() to authenticated;

-- ---------- troops_power ----------
drop policy if exists viewer_no_insert on public.troops_power;
drop policy if exists viewer_no_update on public.troops_power;
drop policy if exists viewer_no_delete on public.troops_power;

create policy viewer_no_insert on public.troops_power
  as restrictive for insert to authenticated
  with check (not public._is_viewer_only());

create policy viewer_no_update on public.troops_power
  as restrictive for update to authenticated
  using (not public._is_viewer_only())
  with check (not public._is_viewer_only());

create policy viewer_no_delete on public.troops_power
  as restrictive for delete to authenticated
  using (not public._is_viewer_only());

-- ---------- footer_settings (footer, schedule, battle theme) ----------
drop policy if exists viewer_no_insert on public.footer_settings;
drop policy if exists viewer_no_update on public.footer_settings;
drop policy if exists viewer_no_delete on public.footer_settings;

create policy viewer_no_insert on public.footer_settings
  as restrictive for insert to authenticated
  with check (not public._is_viewer_only());

create policy viewer_no_update on public.footer_settings
  as restrictive for update to authenticated
  using (not public._is_viewer_only())
  with check (not public._is_viewer_only());

create policy viewer_no_delete on public.footer_settings
  as restrictive for delete to authenticated
  using (not public._is_viewer_only());

-- ---------- CEK (jalankan terpisah setelah di atas berhasil) ----------
-- 1) RLS harus aktif (rowsecurity = true) di kedua tabel. Jika false,
--    policy di atas TIDAK berlaku:
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public' and tablename in ('troops_power','footer_settings');
--
-- 2) Daftar policy yang terpasang:
--      select tablename, policyname, permissive, cmd from pg_policies
--       where schemaname = 'public' and tablename in ('troops_power','footer_settings')
--       order by tablename, policyname;
