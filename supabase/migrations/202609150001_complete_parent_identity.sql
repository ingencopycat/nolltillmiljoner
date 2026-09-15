-- SQL CHECK accepts UNKNOWN and composite FKs skip partially NULL keys.
-- Require a complete parent identity before the existing kind/scope/FK checks.
-- Additive correction: also applies when the foundation migration already ran.
begin;
alter table public.ntm_private_records
  add constraint ntm_private_parent_complete check (
    (parent_kind is null and parent_scope is null and parent_id is null)
    or (parent_kind is not null and parent_scope is not null and parent_id is not null)
  );
commit;
