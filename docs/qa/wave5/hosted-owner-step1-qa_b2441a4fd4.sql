-- OWNER ONLY. Run once while the disposable hosted test accounts remain active.
-- No schema changes. Only this run's current synthetic publication is moderated.
-- Aborts without changes if exact report linkage, ownership or version differs.
begin;
do $$
declare affected integer;
begin
 if (select count(*) from public.ntm_profile_reports r
     join public.ntm_public_analyses a on a.id=r.report_version
     join public.ntm_public_profiles author on author.id=r.target
     join public.ntm_public_profiles reporter on reporter.owner_id=r.reporter
     where r.report_identity='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid
       and r.report_version='fd6b9661-a5da-437d-be49-2a1b0775586b'::uuid
       and r.report_version_number=1
       and r.detail='SYNTHETIC-WAVE5-NOT-AN-ALLEGATION:qa_b2441a4fd4'
       and r.reason='other'
       and author.username='qa_b2441a4fd4_a' and author.role='user'
       and reporter.username='qa_b2441a4fd4_b' and reporter.role='user'
       and a.profile_id=author.id and a.report_id=r.report_identity
       and a.version_number=1 and a.hidden
       and r.content_fingerprint=md5(a.snapshot::text))<>1 then
  raise exception 'Synthetic report linkage verification failed; nothing changed';
 end if;

 update public.ntm_public_analyses a set moderated=true
 from public.ntm_public_profiles p,public.ntm_report_heads h
 where a.id='4a1e216c-4c1c-40f1-9d4d-a1331f384667'::uuid
   and a.report_id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid
   and a.version_number=3 and not a.hidden and not a.moderated
   and p.id=a.profile_id and p.username='qa_b2441a4fd4_a'
   and p.role='user' and p.active and not p.suspended
   and h.id=a.report_id and h.profile_id=p.id and h.current_version=a.id;
 get diagnostics affected=row_count;
 if affected<>1 then
  raise exception 'Expected exactly one active synthetic version; nothing changed';
 end if;
end $$;
select jsonb_build_object(
 'run','qa_b2441a4fd4',
 'original_complaint_still_targets_version_1',true,
 'original_content_fingerprint_matches',true,
 'synthetic_current_version_moderated',true,
 'public_reader_returns_null',
 public.ntm_social_read('analysis',jsonb_build_object(
   'id','a11fc1ec-1a87-4c85-af34-672abeffd439'))='null'::jsonb
) as wave5_owner_moderation_step1;
commit;
