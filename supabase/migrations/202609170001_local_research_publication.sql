begin;
create or replace function public.ntm_social_write(action text, args jsonb default '{}') returns jsonb
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
   -- Client references identify a saved local revision; they are not ownership credentials.
   -- Ownership remains auth.uid() -> profile, including replacement/unpublish checks.
   -- Publishing never reads or writes private cloud records.
   if jsonb_typeof(args->'scope') is distinct from 'string'
      or jsonb_typeof(args->'revision') is distinct from 'string'
      or length(btrim(args->>'scope')) not between 1 and 512
      or length(btrim(args->>'revision')) not between 1 and 512 then
     raise sqlstate 'PT400' using message='source_reference'; end if;
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

commit;
