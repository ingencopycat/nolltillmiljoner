-- READ ONLY. Run the entire query in Supabase SQL Editor as the project owner.
-- Returns one JSON cell: schema and allowlisted logging settings only.
-- No user records, email addresses, tokens, passwords or connection strings.
with relations as (
  select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,
    pg_get_userbyid(c.relowner) as owner
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
), target as (
  select * from relations where relname='ntm_private_records'
), functions as (
  select p.oid,p.proname,pg_get_userbyid(p.proowner) as owner,
    p.prosecdef,p.proconfig,pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('ntm_put_records','ntm_export_records','ntm_delete_account')
), logging_names(name) as (
  values ('log_statement'),('log_min_duration_statement'),('log_min_duration_sample'),
    ('log_statement_sample_rate'),('log_transaction_sample_rate'),
    ('log_parameter_max_length'),('log_parameter_max_length_on_error'),
    ('log_min_error_statement'),('log_error_verbosity'),('pgaudit.log'),
    ('pgaudit.log_parameter'),('pgaudit.log_statement')
)
select jsonb_build_object(
  'public_tables',(select coalesce(jsonb_agg(to_jsonb(r)-'oid' order by relname),'[]') from relations r),
  'columns',(select coalesce(jsonb_agg(jsonb_build_object('name',a.attname,
      'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity)
      order by a.attnum),'[]') from pg_attribute a join target t on t.oid=a.attrelid
      where a.attnum>0 and not a.attisdropped),
  'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',c.conname,
      'type',c.contype,'validated',c.convalidated,'definition',pg_get_constraintdef(c.oid))
      order by c.conname),'[]') from pg_constraint c join target t on t.oid=c.conrelid),
  'indices',(select coalesce(jsonb_agg(jsonb_build_object('name',i.relname,
      'valid',x.indisvalid,'unique',x.indisunique,'definition',pg_get_indexdef(x.indexrelid))
      order by i.relname),'[]') from pg_index x join target t on t.oid=x.indrelid
      join pg_class i on i.oid=x.indexrelid),
  'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by p.policyname),'[]')
      from pg_policies p where schemaname='public' and tablename='ntm_private_records'),
  'table_privileges',(select coalesce(jsonb_agg(jsonb_build_object('role',r.role,
      'select',has_table_privilege(r.role,t.oid,'SELECT'),
      'insert',has_table_privilege(r.role,t.oid,'INSERT'),
      'update',has_table_privilege(r.role,t.oid,'UPDATE'),
      'delete',has_table_privilege(r.role,t.oid,'DELETE'),
      'truncate',has_table_privilege(r.role,t.oid,'TRUNCATE'))),'[]')
      from target t cross join (values ('anon'),('authenticated')) r(role)),
  'sequence_privileges',(select coalesce(jsonb_agg(jsonb_build_object('role',r.role,
      'sequence',s.relname,'usage',has_sequence_privilege(r.role,s.oid,'USAGE'),
      'update',has_sequence_privilege(r.role,s.oid,'UPDATE'))),'[]')
      from pg_class s join pg_namespace n on n.oid=s.relnamespace
      cross join (values ('anon'),('authenticated')) r(role)
      where n.nspname='public' and s.relkind='S'
      and s.relname='ntm_private_records_server_sequence_seq'),
  'functions',(select coalesce(jsonb_agg(to_jsonb(f)-'oid' order by proname,arguments),'[]') from functions f),
  'session_logging',(select coalesce(jsonb_agg(jsonb_build_object('name',p.name,
      'setting',p.setting,'unit',p.unit,'source',p.source) order by p.name),'[]')
      from pg_settings p join logging_names l on p.name=l.name),
  'logging_overrides',(select coalesce(jsonb_agg(jsonb_build_object(
      'database',coalesce(d.datname,'ALL'),'role',coalesce(r.rolname,'ALL'),
      'setting',v.value) order by d.datname,r.rolname,v.value),'[]')
      from pg_db_role_setting s left join pg_database d on d.oid=s.setdatabase
      left join pg_roles r on r.oid=s.setrole cross join lateral unnest(s.setconfig) v(value)
      join logging_names l on split_part(v.value,'=',1)=l.name)
) as production_readiness_audit;
