"""Generate a read-only owner audit scoped to this synthetic verification run."""
from pathlib import Path
from uuid import UUID


def prepare(h):
    # Retain public snapshot identifiers and report timestamps, never auth IDs/emails/tokens.
    ids=[str(UUID(a['id'])) for a in h.ok(h.write('ownAnalyses'))]
    reports=[]
    for who in ['a','b']:
        reports.extend(h.ok(h.write('export',who=who))['reports'])
    quote=lambda s:"'"+s.replace("'","''")+"'"
    report_values=',\n'.join('('+quote(r['createdAt'])+'::timestamptz,'+quote(r['detail'])+')' for r in reports)
    id_values=','.join(quote(i)+'::uuid' for i in ids)
    names=','.join(quote(n) for n in h.handles.values())
    sql=f'''-- READ ONLY. Run as owner AFTER both dedicated test accounts have been deleted.
-- Returns one JSON cell: counts and booleans only. No account IDs, emails or tokens.
-- Scoped to synthetic Public Profiles V1 verification run {h.prefix}.
with reports as (
 select reporter,target from public.ntm_profile_reports
 where (created_at,detail) in (values {report_values})
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
 'test_profiles_remaining',(select count(*) from public.ntm_public_profiles where username in ({names})),
 'test_analysis_rows_remaining',(select count(*) from public.ntm_public_analyses where id in ({id_values})),
 'test_reports_expected',{len(reports)},
 'test_reports_retained',(select count(*) from reports),
 'test_reports_with_account_or_profile_reference',(select count(*) from reports where reporter is not null or target is not null)
) as public_profiles_hosted_cleanup_audit;
'''
    Path('supabase/verify_public_profiles_hosted_cleanup.sql').write_text(sql,encoding='utf-8')
    h.check('read-only owner cleanup audit prepared without account identifiers',True)
