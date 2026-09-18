-- OWNER: run after applying 202609190001. Read-only catalog/invariant audit.
-- No personal content, user IDs, credentials, or report text is returned.
begin transaction read only;
select c.relname,c.relrowsecurity,c.relforcerowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') as authenticated_direct
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('ntm_report_heads','ntm_public_analyses','ntm_profile_reports','ntm_private_records');
-- All above: RLS/force=true; direct privileges=false.
select p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('ntm_social_read','ntm_social_write','ntm_social_read_v1','ntm_social_write_v1','ntm_report_fact_valid','ntm_report_pair_valid','ntm_report_v2_valid')
order by p.proname;
-- Only social_read: anon+authenticated. Only social_write: authenticated.
-- Wrappers: security definer + empty search_path. Internal helpers: neither role.
select count(*) as invalid_v2_contracts from public.ntm_public_analyses
where report_id is not null and public.ntm_report_v2_valid(snapshot) is distinct from true;
select count(*) as invalid_head_links from public.ntm_report_heads h
left join public.ntm_public_analyses a on a.id=h.current_version
where h.current_version is not null and (a.id is null or a.report_id is distinct from h.id or a.profile_id<>h.profile_id or a.source_scope<>h.source_scope);
select count(*) as visible_noncurrent_versions from public.ntm_public_analyses a
join public.ntm_report_heads h on h.id=a.report_id
where not a.hidden and a.id is distinct from h.current_version;
select count(*) as reports_missing_version_fingerprint from public.ntm_profile_reports
where report_identity is not null and (report_version_number is null or content_fingerprint is null);
-- Four counts must be zero. No hosted end-to-end authorization is proven by this alone.
select indexname,indexdef from pg_indexes where schemaname='public' and indexname in ('ntm_report_version','ntm_report_current');
select tgname,pg_get_triggerdef(oid) as definition from pg_trigger
where tgrelid='public.ntm_public_analyses'::regclass and not tgisinternal;
commit;
