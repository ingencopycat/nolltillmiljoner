-- NTM optional cloud foundation. Run as project database owner; no client admin key.
begin;
create table public.ntm_private_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('metadata','journal','revision','outcome','calculator','scenario','observation','preference')),
  scope text not null check (length(scope) between 1 and 512),
  id text not null check (length(id) between 1 and 512),
  record jsonb not null,
  parent_kind text,
  parent_scope text,
  parent_id text,
  server_sequence bigint generated always as identity unique,
  received_at timestamptz not null default now(),
  primary key(owner_id,kind,scope,id),
  foreign key(owner_id,parent_kind,parent_scope,parent_id)
    references public.ntm_private_records(owner_id,kind,scope,id),
  check (jsonb_typeof(record)='object' and record ?& array['kind','scope','id','createdAt','sourceVersion','payload']
    and record - array['kind','scope','id','createdAt','sourceVersion','payload'] = '{}'::jsonb
    and record->>'kind'=kind and record->>'scope'=scope and record->>'id'=id
    and jsonb_typeof(record->'kind')='string' and jsonb_typeof(record->'scope')='string' and jsonb_typeof(record->'id')='string'
    and jsonb_typeof(record->'payload')='object' and jsonb_typeof(record->'sourceVersion')='number'
    and record->>'sourceVersion'=case when kind in ('journal','revision') then '2' else '1' end
    and jsonb_typeof(record->'createdAt') in ('null','string')),
  check (case when kind='revision' then
      parent_kind is not null and parent_kind='journal' and parent_scope='theses' and parent_id=scope
    when kind='observation' then
      parent_kind is not null and parent_kind='scenario' and parent_scope is not null and parent_id is not null
      and scope::jsonb=jsonb_build_array(parent_scope,parent_id)
    when kind='scenario' then
      parent_kind is not null and parent_kind='calculator' and parent_scope='scenarios' and parent_id=scope
    else parent_kind is null and parent_scope is null and parent_id is null end)
);
create index ntm_owner_receive_idx on public.ntm_private_records(owner_id,server_sequence);
create index ntm_parent_idx on public.ntm_private_records(owner_id,parent_kind,parent_scope,parent_id);
alter table public.ntm_private_records enable row level security;
alter table public.ntm_private_records force row level security;
revoke all on public.ntm_private_records from public,anon,authenticated;
grant select,insert on public.ntm_private_records to authenticated;
grant usage on sequence public.ntm_private_records_server_sequence_seq to authenticated;
create policy ntm_read_own on public.ntm_private_records for select to authenticated
  using ((select auth.uid()) is not null and owner_id=(select auth.uid()));
create policy ntm_insert_own on public.ntm_private_records for insert to authenticated
  with check ((select auth.uid()) is not null and owner_id=(select auth.uid()));
-- No UPDATE/DELETE grant or policy. History is immutable, even for its owner.

create function public.ntm_put_records(records jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); r jsonb; existing jsonb; pk text; ps text; pi text;
  accepted jsonb:='[]'::jsonb;
begin
  if uid is null then raise sqlstate 'PT401' using message='auth'; end if;
  if jsonb_typeof(records)<>'array' or jsonb_array_length(records)>10000
    or octet_length(records::text)>20971520 then raise sqlstate 'PT400' using message='invalid'; end if;
  -- Serializes same-user import/delete transactions, including concurrent devices.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  for r in select value from jsonb_array_elements(records) loop
    select p.record into existing from public.ntm_private_records p
      where p.owner_id=uid and p.kind=r->>'kind' and p.scope=r->>'scope' and p.id=r->>'id';
    if found then
      if existing<>r then raise sqlstate 'PT409' using message='conflict'; end if;
    else
      pk:=null;ps:=null;pi:=null;
      if r->>'kind'='revision' then pk:='journal';ps:='theses';pi:=r->>'scope'; end if;
      if r->>'kind'='scenario' then pk:='calculator';ps:='scenarios';pi:=r->>'scope'; end if;
      if r->>'kind'='observation' then
        pk:='scenario';ps:=(r->>'scope')::jsonb->>0;pi:=(r->>'scope')::jsonb->>1;
      end if;
      insert into public.ntm_private_records(owner_id,kind,scope,id,record,parent_kind,parent_scope,parent_id)
        values(uid,r->>'kind',r->>'scope',r->>'id',r,pk,ps,pi);
    end if;
    accepted:=accepted || jsonb_build_array(jsonb_build_array(r->>'kind',r->>'scope',r->>'id'));
  end loop;
  return jsonb_build_object('userId',uid,'accepted',accepted);
exception when sqlstate 'PT409' then raise sqlstate 'PT409' using message='conflict';
  when sqlstate 'PT401' then raise sqlstate 'PT401' using message='auth';
  when others then raise sqlstate 'PT400' using message='invalid';
end $$;

create function public.ntm_export_records() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
  if uid is null then raise sqlstate 'PT401' using message='auth'; end if;
  -- One statement/snapshot prevents a partially paginated restore or export.
  select coalesce(jsonb_agg(record order by server_sequence),'[]'::jsonb) into result
    from public.ntm_private_records where owner_id=uid;
  return jsonb_build_object('userId',uid,'records',result);
end $$;

-- The only elevated operation, with no caller-supplied owner identifier.
-- Auth user deletion cascades private rows. Tokens may remain cryptographically valid
-- until expiry; the deleted owner FK prevents writing new rows under that identity.
create function public.ntm_delete_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise sqlstate 'PT401' using message='auth'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  delete from auth.users where id=uid;
  return jsonb_build_object('deletedUserId',uid);
exception when sqlstate 'PT401' then raise sqlstate 'PT401' using message='auth';
  when others then raise sqlstate 'PT400' using message='delete_failed';
end $$;

revoke all on function public.ntm_put_records(jsonb) from public,anon;
revoke all on function public.ntm_export_records() from public,anon;
revoke all on function public.ntm_delete_account() from public,anon;
grant execute on function public.ntm_put_records(jsonb) to authenticated;
grant execute on function public.ntm_export_records() to authenticated;
grant execute on function public.ntm_delete_account() to authenticated;
commit;
