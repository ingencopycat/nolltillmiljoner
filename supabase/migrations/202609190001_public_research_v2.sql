-- Wave 5. Apply only after owner approval/backup; no hosted execution by this task.
begin;
create function public.ntm_report_fact_valid(f jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; days integer;
begin
 if jsonb_typeof(f) is distinct from 'object' or f-array['metric','value','unit','currency','market','period','periodType','periodStart','periodEnd','observationDate','shareBasis','kind','source','methodVersion','retrievalStatus','rights']<>'{}' or (select count(*) from jsonb_object_keys(f))<>16 then return false; end if;
 for k in select unnest(array['metric','unit','currency','period','periodType','periodStart','periodEnd','observationDate','kind','methodVersion','retrievalStatus']) loop if jsonb_typeof(f->k) is distinct from 'string' then return false;end if;end loop;
 if f->>'metric' not in ('revenue','operatingIncome') or jsonb_typeof(f->'value')<>'number' or abs((f->>'value')::numeric)>1e100
 or f->>'unit'<>'USD' or f->>'currency'<>'USD' or f->'market'<>'null' or f->'shareBasis'<>'null' or f->>'kind'<>'reported'
 or f->>'periodType'<>'annual' or f->>'period'!~'^FY[0-9]{4}$' or f->>'methodVersion'<>'ntm-sec-normalizer/1' or f->>'retrievalStatus'<>'frozen' then return false; end if;
 for k in select unnest(array['periodStart','periodEnd','observationDate']) loop
  if f->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (f->>k)::date::text<>f->>k then return false; end if;
 end loop;
 days:=(f->>'periodEnd')::date-(f->>'periodStart')::date+1;
 if days not between 350 and 378 or f->>'observationDate'<>f->>'periodEnd' then return false; end if;
 if jsonb_typeof(f->'source')<>'object' or (f->'source')-array['provider','url','accession','date','definition']<>'{}' or (select count(*) from jsonb_object_keys(f->'source'))<>5
 or f#>>'{source,provider}'<>'SEC' or f#>>'{source,url}'!~'^https://www[.]sec[.]gov/Archives/edgar/data/[0-9]+/[0-9]+/$'
 or f#>>'{source,accession}'!~'^[0-9]{10}-[0-9]{2}-[0-9]{6}$' or f#>>'{source,date}'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or (f#>>'{source,date}')::date::text<>f#>>'{source,date}' or (f#>>'{source,date}')::date<(f->>'periodEnd')::date
 or length(f#>>'{source,definition}')>160 or not starts_with(f#>>'{source,definition}',(f->>'metric')||':us-gaap:')
 or f->'rights'<>jsonb_build_object('policy','sec-public-facts/1','publicDisplay',true) then return false; end if;
 for k in select unnest(array['provider','url','accession','date','definition']) loop if jsonb_typeof(f->'source'->k) is distinct from 'string' then return false;end if;end loop;
 if f#>>'{source,definition}' not in ('revenue:us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax','revenue:us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax','revenue:us-gaap:Revenues','revenue:us-gaap:RevenuesNetOfInterestExpense','operatingIncome:us-gaap:OperatingIncomeLoss') or right(f#>>'{source,url}',20)<>'/'||replace(f#>>'{source,accession}','-','')||'/' then return false;end if;
 return true;
exception when others then return false;
end $$;
create function public.ntm_report_pair_valid(a jsonb,b jsonb) returns boolean
language sql immutable set search_path='' as $$
 select a->>'metric'=b->>'metric' and a->>'unit'=b->>'unit' and a#>>'{source,definition}'=b#>>'{source,definition}'
 and substring(b->>'period' from 3)::integer=substring(a->>'period' from 3)::integer+1
 and (b->>'periodStart')::date-(a->>'periodEnd')::date=1
 and abs(((b->>'periodEnd')::date-(b->>'periodStart')::date)-((a->>'periodEnd')::date-(a->>'periodStart')::date))<=1
$$;
create function public.ntm_report_v2_valid(s jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; item jsonb; f jsonb; a jsonb; b jsonb; c jsonb; d jsonb; calc numeric; i integer; last_year integer; count_facts integer:=0; definition text;
begin
 if jsonb_typeof(s) is distinct from 'object' or octet_length(s::text)>64000 or s-array['schemaVersion','methodVersion','company','ticker','analysisDate','basisDate','thesis','summary','assumptions','risks','falsification','sources','followUp','reviewDate','correction','financial','chart']<>'{}'
 or not(s ?& array['schemaVersion','methodVersion','company','ticker','analysisDate','basisDate','thesis','financial']) or s->'schemaVersion' is distinct from '2'::jsonb or s->>'methodVersion' is distinct from 'ntm-public-report/2' then return false; end if;
 for k in select jsonb_object_keys(s) loop
  if k not in ('schemaVersion','methodVersion','financial','chart') and (jsonb_typeof(s->k)<>'string' or length(s->>k)>6000) then return false; end if;
 end loop;
 if length(btrim(s->>'company')) not between 1 and 160 or length(s->>'company')>160 or length(btrim(s->>'ticker')) not between 1 and 128 or length(s->>'ticker')>128 or length(btrim(s->>'thesis'))<30 then return false; end if;
 for k in select unnest(array['analysisDate','basisDate','reviewDate']) loop
  if s?k and (s->>k!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (s->>k)::date::text<>s->>k) then return false; end if;
 end loop;
 if jsonb_typeof(s->'financial')<>'array' or jsonb_array_length(s->'financial')>2 or (select count(distinct v->>'type') from jsonb_array_elements(s->'financial') v)<>jsonb_array_length(s->'financial') then return false; end if;
 for item in select value from jsonb_array_elements(s->'financial') loop
  if item-array['type','dimension','methodVersion','observations','calculation']<>'{}' or not(item ?& array['type','dimension','methodVersion','observations','calculation']) or item->>'methodVersion'<>'ntm-fundamental/1'
  or jsonb_typeof(item->'observations')<>'array' or jsonb_typeof(item->'calculation')<>'object' or (item->'calculation')-array['formula','values','unit']<>'{}' or not(item->'calculation' ?& array['formula','values','unit']) or item#>>'{calculation,unit}'<>'%' then return false; end if;
  foreach k in array array['type','dimension','methodVersion'] loop if jsonb_typeof(item->k) is distinct from 'string' then return false;end if;end loop;
  if jsonb_typeof(item#>'{calculation,formula}') is distinct from 'string' or jsonb_typeof(item#>'{calculation,unit}') is distinct from 'string' or jsonb_typeof(item#>'{calculation,values}') is distinct from 'array' then return false;end if;
  for f in select value from jsonb_array_elements(item#>'{calculation,values}') loop if jsonb_typeof(f) is distinct from 'number' then return false;end if;end loop;
  for f in select value from jsonb_array_elements(item->'observations') loop
   if public.ntm_report_fact_valid(f) is distinct from true or f#>>'{source,date}'>s->>'analysisDate' then return false; end if;
  end loop;
  a:=item->'observations'->0;b:=item->'observations'->1;c:=item->'observations'->2;d:=item->'observations'->3;
  if item->>'type'='revenue-change' then
   if jsonb_array_length(item->'observations')<>2 or item->>'dimension'<>'growth' or a->>'metric'<>'revenue' or public.ntm_report_pair_valid(a,b) is distinct from true or (a->>'value')::numeric<=0 or (b->>'value')::numeric<0 or item#>>'{calculation,formula}'<>'(nytt / tidigare − 1) × 100' or jsonb_array_length(item#>'{calculation,values}')<>1 then return false; end if;
   if ((b->>'value')::double precision/(a->>'value')::double precision-1)*100<>(item#>>'{calculation,values,0}')::double precision then return false; end if;
  elsif item->>'type'='operating-margin' then
   if jsonb_array_length(item->'observations')<>4 or item->>'dimension'<>'profitability' or a->>'metric'<>'operatingIncome' or b->>'metric'<>'revenue' or public.ntm_report_pair_valid(a,c) is distinct from true or public.ntm_report_pair_valid(b,d) is distinct from true or (b->>'value')::numeric<=0 or (d->>'value')::numeric<=0 or item#>>'{calculation,formula}'<>'rörelseresultat / intäkter × 100' or jsonb_array_length(item#>'{calculation,values}')<>2 then return false; end if;
   foreach k in array array['period','periodStart','periodEnd','currency','unit'] loop if a->>k<>b->>k or c->>k<>d->>k then return false; end if; end loop;
   if (a->>'value')::double precision/(b->>'value')::double precision*100<>(item#>>'{calculation,values,0}')::double precision or (c->>'value')::double precision/(d->>'value')::double precision*100<>(item#>>'{calculation,values,1}')::double precision then return false; end if;
  else return false; end if;
 end loop;
 if s?'chart' then
  if jsonb_typeof(s->'chart') is distinct from 'object' or not(s->'chart'?&array['type','rows']) or jsonb_typeof(s#>'{chart,type}') is distinct from 'string' then return false;end if;
  if (s->'chart')-array['type','rows']<>'{}' or s#>>'{chart,type}'<>'revenue-annual' or jsonb_typeof(s#>'{chart,rows}')<>'array' or jsonb_array_length(s#>'{chart,rows}') not between 2 and 6 then return false; end if;
  for item in select value from jsonb_array_elements(s#>'{chart,rows}') loop
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'period') is distinct from 'string' or item-array['period','observation']<>'{}' or not(item?&array['period','observation']) or item->>'period'!~'^FY[0-9]{4}$' then return false; end if;
   i:=substring(item->>'period' from 3)::integer;if last_year is not null and i<>last_year+1 then return false;end if;last_year:=i;
   f:=item->'observation';if f<>'null'::jsonb then
    if public.ntm_report_fact_valid(f) is distinct from true or f->>'metric'<>'revenue' or (f->>'value')::numeric<0 or f->>'period'<>item->>'period' or f#>>'{source,date}'>s->>'analysisDate' then return false;end if;
    if definition is not null and definition<>f#>>'{source,definition}' then return false;end if;definition:=f#>>'{source,definition}';count_facts:=count_facts+1;
   end if;
  end loop;
  if count_facts<2 then return false;end if;
 end if;
 return true;
exception when others then return false;
end $$;

create table public.ntm_report_heads (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.ntm_public_profiles(id) on delete cascade,
 source_scope text not null, current_version uuid references public.ntm_public_analyses(id) on delete set null,
 unique(profile_id,source_scope)
);
alter table public.ntm_report_heads enable row level security;
alter table public.ntm_report_heads force row level security;
revoke all on public.ntm_report_heads from public,anon,authenticated;
alter table public.ntm_public_analyses add column report_id uuid references public.ntm_report_heads(id) on delete cascade;
alter table public.ntm_public_analyses add column version_number integer;
alter table public.ntm_public_analyses add column frozen_author jsonb;
create unique index ntm_report_version on public.ntm_public_analyses(report_id,version_number) where report_id is not null;
create unique index ntm_report_current on public.ntm_public_analyses(report_id) where report_id is not null and not hidden;
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.ntm_public_analyses'::regclass and contype='c' and pg_get_constraintdef(oid) like '%snapshot%' loop execute format('alter table public.ntm_public_analyses drop constraint %I',c.conname);end loop;
end $$;
alter table public.ntm_public_analyses add constraint ntm_public_snapshot_contract check (
 (report_id is null and jsonb_typeof(snapshot)='object' and snapshot?&array['company','ticker','thesis','analysisDate'] and snapshot-array['company','ticker','thesis','analysisDate','assumptions','risks','falsification','sources']='{}')
 or (report_id is not null and version_number is not null and frozen_author is not null and version_number>0 and public.ntm_report_v2_valid(snapshot) is true and frozen_author?&array['username','displayName'] and frozen_author-array['username','displayName']='{}'));
create or replace function public.ntm_snapshot_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.snapshot is distinct from old.snapshot or new.profile_id is distinct from old.profile_id or new.source_scope is distinct from old.source_scope or new.source_revision is distinct from old.source_revision or new.published_at is distinct from old.published_at or new.request_id is distinct from old.request_id or new.report_id is distinct from old.report_id or new.version_number is distinct from old.version_number or new.frozen_author is distinct from old.frozen_author then raise sqlstate 'PT400' using message='snapshot_immutable';end if;
 return new;
end $$;
create or replace function public.ntm_analysis_json(a public.ntm_public_analyses) returns jsonb language sql stable set search_path='' as $$
 select case when a.report_id is null then jsonb_build_object('id',a.id,'publishedAt',a.published_at,'content',a.snapshot,'author',public.ntm_profile_json(p))
 else jsonb_build_object('id',a.report_id,'versionId',a.id,'versionNumber',a.version_number,'publishedAt',a.published_at,'content',a.snapshot,'author',a.frozen_author) end from public.ntm_public_profiles p where p.id=a.profile_id
$$;

alter function public.ntm_social_read(text,jsonb) rename to ntm_social_read_v1;
revoke all on function public.ntm_social_read_v1(text,jsonb) from public,anon,authenticated;
create function public.ntm_social_read(action text,args jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if action<>'analysis' then return public.ntm_social_read_v1(action,args);end if;
 select public.ntm_analysis_json(a) into result from public.ntm_public_analyses a join public.ntm_public_profiles p on p.id=a.profile_id
 where p.active and not p.suspended and not a.hidden and not a.moderated
 and (a.id=(args->>'id')::uuid and a.report_id is null and not exists(select 1 from public.ntm_report_heads h where h.id=a.id)
 or a.id=(select h.current_version from public.ntm_report_heads h where h.id=(args->>'id')::uuid))
 and (not(args?'version') or args->>'version'=a.id::text);
 return coalesce(result,'null');
end $$;
grant execute on function public.ntm_social_read(text,jsonb) to anon,authenticated;
revoke all on function public.ntm_social_read(text,jsonb) from public;

alter table public.ntm_profile_reports add column report_identity uuid;
alter table public.ntm_profile_reports add column report_version uuid references public.ntm_public_analyses(id) on delete set null;
alter table public.ntm_profile_reports add column report_version_number integer;
alter table public.ntm_profile_reports add column content_fingerprint text;
alter function public.ntm_social_write(text,jsonb) rename to ntm_social_write_v1;
revoke all on function public.ntm_social_write_v1(text,jsonb) from public,anon,authenticated;
create function public.ntm_social_write(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.ntm_public_profiles;h public.ntm_report_heads;old public.ntm_public_analyses;v public.ntm_public_analyses;s jsonb;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise sqlstate 'PT401' using message='auth';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));select * into p from public.ntm_public_profiles where owner_id=uid;
 if action='reportAnalysis' then
  select a.* into v from public.ntm_public_analyses a join public.ntm_public_profiles q on q.id=a.profile_id where a.id=(args->>'versionId')::uuid and coalesce(a.report_id,a.id)=(args->>'id')::uuid and not a.hidden and not a.moderated and q.active and not q.suspended;
  if not found then raise sqlstate 'PT404' using message='missing';end if;
  if exists(select 1 from public.ntm_profile_reports where reporter=uid and target=v.profile_id and created_at>now()-interval '24 hours') then raise sqlstate 'PT429' using message='report_limit';end if;
  insert into public.ntm_profile_reports(reporter,target,reason,detail,report_identity,report_version,report_version_number,content_fingerprint) values(uid,v.profile_id,args->>'reason',coalesce(args->>'detail',''),coalesce(v.report_id,v.id),v.id,coalesce(v.version_number,1),md5(v.snapshot::text));return 'true';
 end if;
 if action='unpublish' and exists(select 1 from public.ntm_report_heads where id=(args->>'id')::uuid) then
  select * into h from public.ntm_report_heads where id=(args->>'id')::uuid and profile_id=p.id for update;
  if not found or p.suspended then raise sqlstate 'PT403' using message='owner';end if;
  update public.ntm_public_analyses set hidden=true where report_id=h.id;update public.ntm_report_heads set current_version=null where id=h.id;return 'true';
 end if;
 if action<>'publishV2' then
  if action='publish' and (exists(select 1 from public.ntm_report_heads where profile_id=p.id and source_scope=args->>'scope') or exists(select 1 from public.ntm_public_analyses where id=(args->>'supersedes')::uuid and report_id is not null)) then raise sqlstate 'PT409' using message='v2_required';end if;
  return public.ntm_social_write_v1(action,args);
 end if;
 if args-array['scope','revision','snapshot','requestId','confirmed','reportId','expectedVersion','author']<>'{}' or p.id is null or not p.active or p.suspended or args->'confirmed' is distinct from 'true'::jsonb then raise sqlstate 'PT403' using message='confirmation';end if;
 if jsonb_typeof(args->'scope') is distinct from 'string' or jsonb_typeof(args->'revision') is distinct from 'string' or length(btrim(args->>'scope')) not between 1 and 512 or length(btrim(args->>'revision')) not between 1 and 512 then raise sqlstate 'PT400' using message='source_reference';end if;
 if args->'author' is distinct from jsonb_build_object('username',p.username,'displayName',p.display_name) then raise sqlstate 'PT409' using message='author_changed';end if;
 if jsonb_typeof(args->'requestId') is distinct from 'string' then raise sqlstate 'PT400' using message='request';end if;
 s:=args->'snapshot';if public.ntm_report_v2_valid(s) is distinct from true then raise sqlstate 'PT400' using message='snapshot';end if;
 select * into v from public.ntm_public_analyses where profile_id=p.id and request_id=(args->>'requestId')::uuid;
 if found then if v.hidden or v.moderated or v.report_id is null or v.snapshot<>s or v.source_scope<>args->>'scope' or v.source_revision<>args->>'revision' then raise sqlstate 'PT409' using message='conflict';end if;return jsonb_build_object('id',v.report_id,'versionId',v.id,'versionNumber',v.version_number);end if;
 select * into h from public.ntm_report_heads where profile_id=p.id and source_scope=args->>'scope' for update;
 if h.id is not null then
  if args->>'reportId' is distinct from h.id::text or args->>'expectedVersion' is distinct from h.current_version::text then raise sqlstate 'PT409' using message='stale_preview';end if;
  if exists(select 1 from public.ntm_public_analyses where report_id=h.id and moderated) then raise sqlstate 'PT403' using message='moderated';end if;
 elsif args->>'reportId' is not null then
  select * into old from public.ntm_public_analyses where id=(args->>'reportId')::uuid and profile_id=p.id and source_scope=args->>'scope' and not hidden and not moderated and report_id is null;
  if not found or args->>'expectedVersion' is distinct from old.id::text then raise sqlstate 'PT403' using message='owner';end if;
  insert into public.ntm_report_heads(id,profile_id,source_scope,current_version) values(old.id,p.id,args->>'scope',old.id) returning * into h;
 else
  if exists(select 1 from public.ntm_public_analyses where profile_id=p.id and source_scope=args->>'scope' and not hidden) then raise sqlstate 'PT409' using message='stale_preview';end if;
  insert into public.ntm_report_heads(profile_id,source_scope) values(p.id,args->>'scope') returning * into h;
 end if;
 if h.current_version is not null then select * into old from public.ntm_public_analyses where id=h.current_version;update public.ntm_public_analyses set hidden=true where id=h.current_version;end if;
 insert into public.ntm_public_analyses(profile_id,request_id,source_scope,source_revision,snapshot,supersedes,report_id,version_number,frozen_author)
 values(p.id,(args->>'requestId')::uuid,args->>'scope',args->>'revision',s,old.id,h.id,(select coalesce(max(version_number),case when old.id is not null then 1 else 0 end)+1 from public.ntm_public_analyses where report_id=h.id),jsonb_build_object('username',p.username,'displayName',p.display_name)) returning * into v;
 update public.ntm_report_heads set current_version=v.id where id=h.id;return jsonb_build_object('id',h.id,'versionId',v.id,'versionNumber',v.version_number);
exception when unique_violation then raise sqlstate 'PT409' using message='conflict';
end $$;
revoke all on function public.ntm_social_write(text,jsonb),public.ntm_report_fact_valid(jsonb),public.ntm_report_pair_valid(jsonb,jsonb),public.ntm_report_v2_valid(jsonb) from public,anon,authenticated;
grant execute on function public.ntm_social_write(text,jsonb) to authenticated;
commit;
