-- READ ONLY: schema/grants only, no profile/report/account contents.
select c.relname,c.relrowsecurity,c.relforcerowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
 has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_update,
 has_table_privilege('authenticated',c.oid,'DELETE') as authenticated_delete
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('ntm_public_profiles','ntm_profile_follows',
 'ntm_public_analyses','ntm_profile_reports','ntm_username_rules') order by c.relname;
select p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('ntm_social_read','ntm_social_write','ntm_profile_json',
 'ntm_analysis_json','ntm_username_guard','ntm_snapshot_guard','ntm_username_availability') order by p.proname;
