-- Read-only catalog evidence. Run in the project's SQL editor after all migrations.
-- No auth identities, private rows, keys or connection settings are selected.
begin read only;
select schemaname, tablename, rowsecurity
from pg_tables where schemaname='public' order by tablename;
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='ntm_private_records';
select conname,contype,convalidated,pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid='public.ntm_private_records'::regclass order by conname;
select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='ntm_private_records' order by indexname;
select policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename='ntm_private_records' order by policyname;
select role,
  has_table_privilege(role,'public.ntm_private_records','SELECT') as can_select,
  has_table_privilege(role,'public.ntm_private_records','INSERT') as can_insert,
  has_table_privilege(role,'public.ntm_private_records','UPDATE') as can_update,
  has_table_privilege(role,'public.ntm_private_records','DELETE') as can_delete
from (values ('anon'),('authenticated')) as roles(role);
select p.proname,pg_get_userbyid(p.proowner) as function_owner,p.prosecdef,p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('ntm_put_records','ntm_export_records','ntm_delete_account')
order by p.proname;
commit;
