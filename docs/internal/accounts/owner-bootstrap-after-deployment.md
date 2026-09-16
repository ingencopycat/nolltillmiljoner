# Owner bootstrap after production deployment

**Procedure only. Not executed against hosted Supabase during the release audit.**

1. After the reviewed build is deployed, use the production Account page to log in with your permanent owner email and its emailed OTP. Stop at the private account; do not create a temporary public username.
2. In the correct Supabase project's Authentication → Users screen, verify that email, its confirmation status and the exact user UUID. Never identify the owner from a display name or a client-supplied role.
3. In SQL Editor as the project database owner, replace only `OWNER_AUTH_USER_UUID` below. Run the entire transaction. It refuses an unconfirmed/missing Auth user, an existing public profile for that user, an existing target username or a missing reservation. Do not remove those guards.

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '15s';
lock table public.ntm_username_rules in access exclusive mode;
do $$
declare owner_uid uuid := 'OWNER_AUTH_USER_UUID'::uuid;
begin
  if not exists(select 1 from auth.users where id=owner_uid and email_confirmed_at is not null) then
    raise exception 'Owner Auth user missing or email unconfirmed';
  end if;
  if exists(select 1 from public.ntm_public_profiles where owner_id=owner_uid or username='nolltillmiljoner') then
    raise exception 'Owner already has a profile or target username already exists';
  end if;
  if not exists(select 1 from public.ntm_username_rules where term='nolltillmiljoner' and kind='reserved') then
    raise exception 'Expected reserved-name protection is missing';
  end if;
  delete from public.ntm_username_rules where term='nolltillmiljoner' and kind='reserved';
  insert into public.ntm_public_profiles(owner_id,username,display_name,role)
    values(owner_uid,'nolltillmiljoner','Noll till Miljoner','admin');
  insert into public.ntm_username_rules(term,kind) values('nolltillmiljoner','reserved');
end $$;
select username,role,active,show_level,show_xp
from public.ntm_public_profiles where username='nolltillmiljoner';
commit;
```

Expected: exactly one row, `nolltillmiljoner`, `admin`, active true, Academy level/XP visibility false. On any failure, roll back the transaction; investigate rather than removing reservations or disabling triggers.

4. Open `https://nolltillmiljoner.se/profil.html?u=nolltillmiljoner` and confirm the intended name and ADMIN badge. Re-login to Account to manage display name/bio. Role assignment itself grants no public admin dashboard in V1; moderation remains owner-side.
5. Run the read-only `supabase/verify_public_profiles.sql` to confirm grants/RLS remain unchanged. Normal users must still be refused reserved names and cannot assign ADMIN through settings/create payloads.

## Why normal users stay protected

The reservation exception exists only inside one owner transaction. The exclusive rules-table lock blocks concurrent name checks/creation until the reservation has been restored and committed. Other transactions never observe an unreserved committed state. Existing triggers, grants and RLS are not disabled or broadened. Username uniqueness and the permanent-name guard remain in place. A second execution refuses to overwrite the owner profile.

This procedure was validated only in an isolated local PostgreSQL/PGlite database with synthetic Auth users. No permanent owner identity was created during the audit.
