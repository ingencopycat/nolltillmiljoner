-- OWNER ONLY. Run after the agent confirms the step-1 hosted moderation checks.
-- Isolates profile suspension: clears moderation on this exact synthetic version,
-- then suspends only its disposable author. No schema or real-user changes.
-- Both changes roll back if any ownership/state/count guard fails.
begin;
do $$
declare affected integer;
begin
 update public.ntm_public_analyses a set moderated=false
 from public.ntm_public_profiles p,public.ntm_report_heads h
 where a.id='4a1e216c-4c1c-40f1-9d4d-a1331f384667'::uuid
   and a.report_id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid
   and a.version_number=3 and not a.hidden and a.moderated
   and p.id=a.profile_id and p.username='qa_b2441a4fd4_a'
   and p.role='user' and p.active and not p.suspended
   and h.id=a.report_id and h.profile_id=p.id and h.current_version=a.id;
 get diagnostics affected=row_count;
 if affected<>1 then
  raise exception 'Expected exactly one moderated synthetic version; nothing changed';
 end if;

 update public.ntm_public_profiles p set suspended=true
 where p.username='qa_b2441a4fd4_a' and p.role='user'
   and p.active and not p.suspended
   and exists (
     select 1 from public.ntm_report_heads h
     join public.ntm_public_analyses a on a.id=h.current_version
     where h.id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid
       and h.profile_id=p.id and a.profile_id=p.id and a.report_id=h.id
       and a.id='4a1e216c-4c1c-40f1-9d4d-a1331f384667'::uuid
       and a.version_number=3 and not a.hidden and not a.moderated
   );
 get diagnostics affected=row_count;
 if affected<>1 then
  raise exception 'Expected exactly one active disposable author; nothing changed';
 end if;
end $$;
select jsonb_build_object(
 'run','qa_b2441a4fd4',
 'synthetic_version_moderation_cleared',true,
 'synthetic_author_suspended',true,
 'public_reader_returns_null',
 public.ntm_social_read('analysis',jsonb_build_object(
   'id','a11fc1ec-1a87-4c85-af34-672abeffd439'))='null'::jsonb,
 'public_profile_returns_null',
 public.ntm_social_read('profile',jsonb_build_object(
   'username','qa_b2441a4fd4_a'))='null'::jsonb
) as wave5_owner_moderation_step2;
commit;
