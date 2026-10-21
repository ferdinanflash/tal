-- ============================================================
-- President Panel: kelola akun staff (ubah username & password)
-- Jalankan SEKALI di Supabase -> SQL Editor.
--
-- Hanya akun "demon" yang boleh memanggil fungsi ini (dicek di server,
-- bukan hanya di tampilan). Ganti 'demon' di bawah jika perlu.
-- Username staff disimpan sebagai email: <username>@3475-staff.internal
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- Kunci role pemanggil: username asli, atau role_key jika akun pernah di-rename
create or replace function public._staff_caller_key()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
           u.raw_app_meta_data->>'role_key',
           replace(u.email, '@3475-staff.internal', '')
         )
  from auth.users u
  where u.id = auth.uid();
$$;

-- Daftar semua akun staff
create or replace function public.staff_list_accounts()
returns table (
  id uuid,
  username text,
  role_key text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if coalesce(public._staff_caller_key(), '') <> 'demon' then
    raise exception 'Not allowed';
  end if;

  return query
  select u.id,
         replace(u.email, '@3475-staff.internal', '')::text,
         coalesce(u.raw_app_meta_data->>'role_key',
                  replace(u.email, '@3475-staff.internal', ''))::text,
         u.created_at,
         u.last_sign_in_at
  from auth.users u
  where u.email like '%@3475-staff.internal'
  order by u.email;
end;
$$;

-- Ubah username dan/atau password satu akun staff.
-- new_username / new_password boleh null (= tidak diubah).
create or replace function public.staff_update_account(
  target_id uuid,
  new_username text default null,
  new_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  old_email text;
  old_name  text;
  new_email text;
  clean     text;
begin
  if coalesce(public._staff_caller_key(), '') <> 'demon' then
    raise exception 'Not allowed';
  end if;

  select email into old_email from auth.users
   where id = target_id and email like '%@3475-staff.internal';
  if old_email is null then
    raise exception 'Staff account not found';
  end if;
  old_name := replace(old_email, '@3475-staff.internal', '');

  if new_password is not null and new_password <> '' and length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  -- username baru
  if new_username is not null and btrim(new_username) <> '' then
    clean := lower(regexp_replace(btrim(new_username), '\s+', '', 'g'));
    if clean !~ '^[a-z0-9._-]{2,32}$' then
      raise exception 'Username must be 2-32 chars: letters, numbers, . _ -';
    end if;
    new_email := clean || '@3475-staff.internal';

    if new_email <> old_email then
      if exists (select 1 from auth.users where email = new_email and id <> target_id) then
        raise exception 'Username already taken';
      end if;

      -- role_key menjaga hak akses lama (mis. akun "idn" yang di-rename
      -- tetap dibatasi ke alliance IDN, tidak jadi full access)
      update auth.users
         set email = new_email,
             raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
               || jsonb_build_object(
                    'role_key',
                    coalesce(raw_app_meta_data->>'role_key', old_name)),
             updated_at = now()
       where id = target_id;

      update auth.identities
         set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(new_email)),
             provider_id = case when provider_id = old_email then new_email else provider_id end,
             updated_at = now()
       where user_id = target_id and provider = 'email';
    end if;
  end if;

  -- password baru
  if new_password is not null and new_password <> '' then
    update auth.users
       set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = target_id;
  end if;

  -- paksa login ulang di semua perangkat bila ada yang diubah
  delete from auth.sessions where user_id = target_id;
end;
$$;

revoke all on function public._staff_caller_key() from public, anon;
revoke all on function public.staff_list_accounts() from public, anon;
revoke all on function public.staff_update_account(uuid, text, text) from public, anon;
grant execute on function public._staff_caller_key() to authenticated;
grant execute on function public.staff_list_accounts() to authenticated;
grant execute on function public.staff_update_account(uuid, text, text) to authenticated;
