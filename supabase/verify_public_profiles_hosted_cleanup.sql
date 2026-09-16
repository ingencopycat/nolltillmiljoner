-- READ ONLY. Run as owner AFTER both dedicated test accounts have been deleted.
-- Returns one JSON cell: counts and booleans only. No account IDs, emails or tokens.
-- Scoped to synthetic Public Profiles V1 verification run qa_c927719ad4.
with reports as (
 select reporter,target from public.ntm_profile_reports
 where (created_at,detail) in (values ('2026-09-15T23:50:49.564832+00:00'::timestamptz,'SYNTHETIC-CONCURRENT-REPORT'),
('2026-09-15T23:50:00.492388+00:00'::timestamptz,'SYNTHETIC-REPORT-NOT-AN-ALLEGATION'))
), tables as (
 select c.oid,c.relrowsecurity,c.relforcerowsecurity
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in
 ('ntm_public_profiles','ntm_profile_follows','ntm_public_analyses','ntm_profile_reports','ntm_username_rules')
)
select jsonb_build_object(
 'rls_enabled_and_forced_on_all_five_tables',
   (select count(*)=5 and bool_and(relrowsecurity and relforcerowsecurity) from tables),
 'no_direct_client_table_access',not exists(
   select 1 from tables t cross join (values ('anon'),('authenticated')) r(role)
   where has_table_privilege(r.role,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
 'test_profiles_remaining',(select count(*) from public.ntm_public_profiles where username in ('qa_c927719ad4_a','qa_c927719ad4_b')),
 'test_analysis_rows_remaining',(select count(*) from public.ntm_public_analyses where id in ('aaf23430-8612-4ed9-b25f-3b41ff7b2bb2'::uuid,'dabbcad6-c800-405a-888d-dd9aaffd61d1'::uuid,'0de1c609-b346-4091-ad27-709c1c2fb0cb'::uuid,'c60af1a8-c03d-4c38-933e-9d8c29a412c9'::uuid)),
 'test_reports_expected',2,
 'test_reports_retained',(select count(*) from reports),
 'test_reports_with_account_or_profile_reference',(select count(*) from reports where reporter is not null or target is not null)
) as public_profiles_hosted_cleanup_audit;
