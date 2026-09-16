-- Additive, read-only availability check. Apply after Public Profiles V1.
-- No email, account ID, profile status or rules list is returned.
begin;
create function public.ntm_username_availability(username text) returns text
language plpgsql stable security definer set search_path='' as $$
declare candidate text:=lower(btrim(username));
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then
   raise sqlstate 'PT401' using message='authentication_required';
 end if;
 if candidate is null or length(candidate)<3 or length(candidate)>24 then return 'length'; end if;
 if candidate !~ '^[a-z0-9_]{3,24}$' then return 'invalid'; end if;
 if exists(select 1 from public.ntm_username_rules where kind='reserved' and term=replace(candidate,'_','')) then return 'reserved'; end if;
 if exists(select 1 from public.ntm_username_rules where kind='blocked' and position(term in replace(candidate,'_',''))>0) then return 'blocked'; end if;
 if exists(select 1 from public.ntm_public_profiles where ntm_public_profiles.username=candidate) then return 'unavailable'; end if;
 return 'available';
end $$;
revoke all on function public.ntm_username_availability(text) from public,anon,authenticated;
grant execute on function public.ntm_username_availability(text) to authenticated;
commit;
