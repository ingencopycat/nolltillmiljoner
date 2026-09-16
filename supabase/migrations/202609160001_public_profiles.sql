-- Additive social foundation. Owner applies after local verification. No automatic profiles.
begin;
create table public.ntm_username_rules (
  term text primary key check (term ~ '^[a-z0-9_]+$'),
  kind text not null check (kind in ('reserved','blocked'))
);
insert into public.ntm_username_rules values
 ('admin','reserved'),('administrator','reserved'),('mod','reserved'),('moderator','reserved'),
 ('support','reserved'),('help','reserved'),('security','reserved'),('official','reserved'),
 ('ntm','reserved'),('nolltillmiljoner','reserved'),
 ('nigger','blocked'),('nigga','blocked'),('faggot','blocked'),('heilhitler','blocked');
create table public.ntm_public_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(display_name) between 1 and 60),
  bio text not null default '' check (length(bio)<=200),
  role text not null default 'user' check (role in ('user','moderator','admin')),
  active boolean not null default true,
  suspended boolean not null default false,
  member_since date not null default current_date,
  show_level boolean not null default false,
  show_xp boolean not null default false,
  academy_level text check (length(academy_level)<=60),
  academy_xp integer check (academy_xp between 0 and 10000000)
);
create function public.ntm_username_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.username is distinct from old.username then
   raise sqlstate 'PT400' using message='username_immutable';
 end if;
 new.username:=lower(btrim(new.username));
 if TG_OP='INSERT' and exists(select 1 from public.ntm_username_rules r
   where (r.kind='reserved' and replace(new.username,'_','')=r.term)
      or (r.kind='blocked' and position(r.term in replace(new.username,'_',''))>0)) then
   raise sqlstate 'PT400' using message='username_unavailable';
 end if;
 return new;
end $$;
create trigger ntm_username_guard before insert or update on public.ntm_public_profiles
 for each row execute function public.ntm_username_guard();
create table public.ntm_profile_follows (
 follower uuid not null references public.ntm_public_profiles(id) on delete cascade,
 target uuid not null references public.ntm_public_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower,target), check(follower<>target)
);
create index ntm_follow_target on public.ntm_profile_follows(target,follower);
create table public.ntm_public_analyses (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.ntm_public_profiles(id) on delete cascade,
 request_id uuid not null,
 source_scope text not null check(length(source_scope) between 1 and 512),
 source_revision text not null check(length(source_revision) between 1 and 512),
 snapshot jsonb not null,
 published_at timestamptz not null default now(),
 hidden boolean not null default false,
 moderated boolean not null default false,
 supersedes uuid references public.ntm_public_analyses(id) on delete set null,
 unique(profile_id,request_id),
 check (jsonb_typeof(snapshot)='object' and snapshot ?& array['company','ticker','thesis','analysisDate']
   and snapshot-array['company','ticker','thesis','analysisDate','assumptions','risks','falsification','sources']='{}'::jsonb)
);
create index ntm_analysis_recent on public.ntm_public_analyses(published_at desc,id) where not hidden and not moderated;
create index ntm_analysis_author on public.ntm_public_analyses(profile_id,published_at desc);
create function public.ntm_snapshot_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.snapshot is distinct from old.snapshot or new.profile_id is distinct from old.profile_id
   or new.source_scope is distinct from old.source_scope or new.source_revision is distinct from old.source_revision
   or new.published_at is distinct from old.published_at or new.request_id is distinct from old.request_id then
   raise sqlstate 'PT400' using message='snapshot_immutable';
 end if;
 return new;
end $$;
create trigger ntm_snapshot_guard before update on public.ntm_public_analyses
 for each row execute function public.ntm_snapshot_guard();
create table public.ntm_profile_reports (
 id uuid primary key default gen_random_uuid(),
 reporter uuid references auth.users(id) on delete set null,
 target uuid references public.ntm_public_profiles(id) on delete set null,
 reason text not null check(reason in ('impersonation','abuse','spam','threat','illegal','other')),
 detail text not null default '' check(length(detail)<=500),
 created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','reviewed','dismissed','actioned'))
);
create index ntm_report_rate on public.ntm_profile_reports(reporter,target,created_at desc);
-- Private base tables: deny direct API access, including to authenticated users.
-- Public access is exclusively via the explicit JSON projections below.
do $$ declare t text; begin
 foreach t in array array['ntm_username_rules','ntm_public_profiles','ntm_profile_follows','ntm_public_analyses','ntm_profile_reports'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('alter table public.%I force row level security',t);
   execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
-- A deny-by-default RLS boundary plus owner-only security-definer RPCs. No client role bypass.
create function public.ntm_profile_json(p public.ntm_public_profiles) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('username',p.username,'displayName',p.display_name,'bio',p.bio,
 'role',p.role,'memberSince',p.member_since,
 'level',case when p.show_level then p.academy_level end,
 'xp',case when p.show_xp then p.academy_xp end,
 'followers',(select count(*) from public.ntm_profile_follows f join public.ntm_public_profiles q on q.id=f.follower where f.target=p.id and q.active and not q.suspended),
 'following',(select count(*) from public.ntm_profile_follows f join public.ntm_public_profiles q on q.id=f.target where f.follower=p.id and q.active and not q.suspended))
$$;
create function public.ntm_analysis_json(a public.ntm_public_analyses) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',a.id,'publishedAt',a.published_at,'content',a.snapshot,
   'author',public.ntm_profile_json(p)) from public.ntm_public_profiles p where p.id=a.profile_id
$$;
create function public.ntm_social_read(action text, args jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.ntm_public_profiles; result jsonb; term text:=lower(btrim(coalesce(args->>'username','')));
 off integer:=least(10000,greatest(0,coalesce((args->>'offset')::integer,0)));
begin
 if action='search' then
   if term !~ '^[a-z0-9_]{3,24}$' then return '[]'::jsonb; end if;
   select coalesce(jsonb_agg(public.ntm_profile_json(q)),'[]') into result from
     (select * from public.ntm_public_profiles where active and not suspended and starts_with(username,term) order by username limit 20 offset off) q;
 elsif action='recent' then
   select coalesce(jsonb_agg(public.ntm_analysis_json(q)),'[]') into result from
     (select a.* from public.ntm_public_analyses a join public.ntm_public_profiles author on author.id=a.profile_id
       where author.active and not author.suspended and not a.hidden and not a.moderated order by a.published_at desc,a.id limit 20 offset off) q;
 elsif action='analysis' then
   select public.ntm_analysis_json(a) into result from public.ntm_public_analyses a join public.ntm_public_profiles author on author.id=a.profile_id
     where a.id=(args->>'id')::uuid and author.active and not author.suspended and not a.hidden and not a.moderated;
 else
   select * into p from public.ntm_public_profiles where username=term and active and not suspended;
   if not found then return 'null'::jsonb; end if;
   if action='profile' then
     result:=public.ntm_profile_json(p);
   elsif action='analyses' then
     select coalesce(jsonb_agg(public.ntm_analysis_json(q)),'[]') into result from
      (select * from public.ntm_public_analyses where profile_id=p.id and not hidden and not moderated order by published_at desc,id limit 20 offset off) q;
   elsif action in ('followers','following') then
     select coalesce(jsonb_agg(public.ntm_profile_json(q)),'[]') into result from
      (select v.* from public.ntm_profile_follows f join public.ntm_public_profiles v
        on v.id=case when action='followers' then f.follower else f.target end
        where case when action='followers' then f.target=p.id else f.follower=p.id end
        and v.active and not v.suspended order by v.username limit 20 offset off) q;
   else raise sqlstate 'PT400' using message='invalid'; end if;
 end if;
 return coalesce(result,'null'::jsonb);
end $$;
create function public.ntm_social_write(action text, args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p public.ntm_public_profiles; target_id uuid; s jsonb; k text;
 aid uuid; previous public.ntm_public_analyses; result jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise sqlstate 'PT401' using message='auth'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into p from public.ntm_public_profiles where owner_id=uid;
 if action='mine' then
   if p.id is null then return 'null'::jsonb; end if;
   return public.ntm_profile_json(p)||jsonb_build_object('active',p.active,'suspended',p.suspended,'showLevel',p.show_level,'showXp',p.show_xp);
 elsif action='export' then
   return jsonb_build_object('profile',case when p.id is not null then public.ntm_profile_json(p)||jsonb_build_object('active',p.active,'showLevel',p.show_level,'showXp',p.show_xp) end,
    'analyses',(select coalesce(jsonb_agg(public.ntm_analysis_json(a)||jsonb_build_object('hidden',a.hidden,'moderated',a.moderated)),'[]') from public.ntm_public_analyses a where a.profile_id=p.id),
    'following',(select coalesce(jsonb_agg(q.username),'[]') from public.ntm_profile_follows f join public.ntm_public_profiles q on q.id=f.target where f.follower=p.id),
    'reports',(select coalesce(jsonb_agg(jsonb_build_object('reason',r.reason,'detail',r.detail,'createdAt',r.created_at,'status',r.status)),'[]') from public.ntm_profile_reports r where r.reporter=uid));
 elsif action='create' then
   if args->'confirmed' is distinct from 'true'::jsonb then raise sqlstate 'PT400' using message='confirmation'; end if;
   insert into public.ntm_public_profiles(owner_id,username,display_name)
     values(uid,args->>'username',btrim(args->>'displayName')) returning * into p;
   return public.ntm_profile_json(p);
 elsif action='report' then
   select id into target_id from public.ntm_public_profiles where username=lower(args->>'username') and active and not suspended;
   if target_id is null then raise sqlstate 'PT404' using message='missing'; end if;
   if exists(select 1 from public.ntm_profile_reports where reporter=uid and target=target_id and created_at>now()-interval '24 hours') then
     raise sqlstate 'PT429' using message='report_limit'; end if;
   insert into public.ntm_profile_reports(reporter,target,reason,detail) values(uid,target_id,args->>'reason',coalesce(args->>'detail',''));
   return 'true'::jsonb;
 end if;
 if p.id is null or p.suspended then raise sqlstate 'PT403' using message='profile_required'; end if;
 if action='settings' then
   update public.ntm_public_profiles set display_name=btrim(args->>'displayName'),bio=coalesce(args->>'bio',''),
     active=(args->>'active')::boolean,show_level=(args->>'showLevel')::boolean,show_xp=(args->>'showXp')::boolean,
     academy_level=case when (args->>'showLevel')::boolean then args->>'level' end,
     academy_xp=case when (args->>'showXp')::boolean then (args->>'xp')::integer end where id=p.id;
 elsif action='ownAnalyses' then
   select coalesce(jsonb_agg(public.ntm_analysis_json(a)||jsonb_build_object('hidden',a.hidden,'moderated',a.moderated,
      'sourceScope',a.source_scope,'sourceRevision',a.source_revision) order by a.published_at desc),'[]') into result
      from public.ntm_public_analyses a where a.profile_id=p.id;
   return result;
 elsif action in ('follow','unfollow','followState') then
   select id into target_id from public.ntm_public_profiles where username=lower(args->>'username') and active and not suspended;
   if target_id is null or target_id=p.id or not p.active then raise sqlstate 'PT400' using message='invalid_follow'; end if;
   if action='follow' then insert into public.ntm_profile_follows(follower,target) values(p.id,target_id) on conflict do nothing;
   elsif action='unfollow' then delete from public.ntm_profile_follows where follower=p.id and target=target_id; end if;
   return to_jsonb(exists(select 1 from public.ntm_profile_follows where follower=p.id and target=target_id));
 elsif action='publish' then
   if not p.active or args->'confirmed' is distinct from 'true'::jsonb then raise sqlstate 'PT400' using message='confirmation'; end if;
   -- Only an owned cloud revision may be the provenance. No broad cloud upload here.
   if not exists(select 1 from public.ntm_private_records where owner_id=uid and kind='revision'
      and scope=args->>'scope' and id=args->>'revision') then raise sqlstate 'PT403' using message='source_required'; end if;
   s:=args->'snapshot';
   if s is null or jsonb_typeof(s)<>'object' or s-array['company','ticker','thesis','analysisDate','assumptions','risks','falsification','sources']<>'{}'::jsonb
      or not (s ?& array['company','ticker','thesis','analysisDate']) then raise sqlstate 'PT400' using message='snapshot'; end if;
   for k in select jsonb_object_keys(s) loop
     if jsonb_typeof(s->k)<>'string' or length(s->>k)>6000 then raise sqlstate 'PT400' using message='snapshot'; end if;
   end loop;
   if length(btrim(s->>'thesis'))<30 or length(s->>'company') not between 1 and 160
      or length(s->>'ticker') not between 1 and 128 or s->>'analysisDate' !~ '^\d{4}-\d{2}-\d{2}$' then
      raise sqlstate 'PT400' using message='snapshot'; end if;
   -- Same preview can be retried after a lost response without duplicate publication.
   select * into previous from public.ntm_public_analyses where profile_id=p.id and request_id=(args->>'requestId')::uuid;
   if found then
     if previous.snapshot<>s or previous.source_scope<>args->>'scope' or previous.source_revision<>args->>'revision' then
       raise sqlstate 'PT409' using message='conflict'; end if;
     return jsonb_build_object('id',previous.id);
   end if;
   if args->>'supersedes' is not null then
     select * into previous from public.ntm_public_analyses where id=(args->>'supersedes')::uuid and profile_id=p.id;
     if not found or previous.source_scope<>args->>'scope' or previous.moderated then raise sqlstate 'PT403' using message='owner'; end if;
     update public.ntm_public_analyses set hidden=true where id=previous.id;
   end if;
   insert into public.ntm_public_analyses(profile_id,request_id,source_scope,source_revision,snapshot,supersedes)
      values(p.id,(args->>'requestId')::uuid,args->>'scope',args->>'revision',s,previous.id) returning id into aid;
   return jsonb_build_object('id',aid);
 elsif action='unpublish' then
   update public.ntm_public_analyses set hidden=true where id=(args->>'id')::uuid and profile_id=p.id;
   if not found then raise sqlstate 'PT404' using message='missing'; end if;
 else raise sqlstate 'PT400' using message='invalid'; end if;
 return 'true'::jsonb;
exception when unique_violation then raise sqlstate 'PT409' using message='unavailable';
end $$;
revoke all on function public.ntm_username_guard(),public.ntm_snapshot_guard(),public.ntm_profile_json(public.ntm_public_profiles),
 public.ntm_analysis_json(public.ntm_public_analyses),public.ntm_social_read(text,jsonb),public.ntm_social_write(text,jsonb) from public,anon,authenticated;
grant execute on function public.ntm_social_read(text,jsonb) to anon,authenticated;
grant execute on function public.ntm_social_write(text,jsonb) to authenticated;
commit;
