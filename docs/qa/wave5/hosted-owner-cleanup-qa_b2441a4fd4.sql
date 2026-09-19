-- OWNER ONLY. Run once after both disposable accounts have been deleted.
-- No schema changes. Deletes exactly this run's single synthetic complaint.
-- Verifies cascades and retained metadata first; any failed guard rolls back.
-- Returns one JSON result; no private text, user IDs, or credentials.
begin;
do $$
declare affected integer;
begin
 if exists (select 1 from public.ntm_public_profiles
   where username in ('qa_b2441a4fd4_a','qa_b2441a4fd4_b'))
 or exists (select 1 from public.ntm_report_heads
   where id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid)
 or exists (select 1 from public.ntm_public_analyses
   where report_id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid
      or id in ('fd6b9661-a5da-437d-be49-2a1b0775586b'::uuid,
                '4a1e216c-4c1c-40f1-9d4d-a1331f384667'::uuid))
 or exists (select 1 from public.ntm_private_records
   where kind='journal' and scope='theses'
     and id in ('qa_b2441a4fd4_a','qa_b2441a4fd4_b')) then
  raise exception 'Synthetic account cascade audit failed; nothing changed';
 end if;

 if (select count(*) from public.ntm_profile_reports
   where detail='SYNTHETIC-WAVE5-NOT-AN-ALLEGATION:qa_b2441a4fd4')<>1 then
  raise exception 'Expected exactly one synthetic complaint; nothing changed';
 end if;

 -- Step 1 already verified the fingerprint against the original snapshot.
 -- After deletion, only minimal linkage metadata should remain, with null FKs.
 delete from public.ntm_profile_reports
 where detail='SYNTHETIC-WAVE5-NOT-AN-ALLEGATION:qa_b2441a4fd4'
   and report_identity='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid
   and report_version_number=1 and reason='other' and status='pending'
   and reporter is null and target is null and report_version is null
   and content_fingerprint ~ '^[0-9a-f]{32}$';
 get diagnostics affected=row_count;
 if affected<>1 then
  raise exception 'Retained synthetic complaint audit failed; nothing changed';
 end if;
end $$;
select jsonb_build_object(
 'run','qa_b2441a4fd4',
 'synthetic_profile_head_snapshot_and_private_record_cascades_passed',true,
 'retained_complaint_foreign_keys_were_null',true,
 'retained_report_identity_version_number_and_fingerprint_present',true,
 'synthetic_complaints_deleted',1,
 'remaining_synthetic_complaints',(
   select count(*) from public.ntm_profile_reports
   where detail='SYNTHETIC-WAVE5-NOT-AN-ALLEGATION:qa_b2441a4fd4'),
 'remaining_test_profiles',(
   select count(*) from public.ntm_public_profiles
   where username in ('qa_b2441a4fd4_a','qa_b2441a4fd4_b')),
 'remaining_test_report_heads',(
   select count(*) from public.ntm_report_heads
   where id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid),
 'remaining_test_snapshots',(
   select count(*) from public.ntm_public_analyses
   where report_id='a11fc1ec-1a87-4c85-af34-672abeffd439'::uuid),
 'remaining_test_private_records',(
   select count(*) from public.ntm_private_records
   where kind='journal' and scope='theses'
     and id in ('qa_b2441a4fd4_a','qa_b2441a4fd4_b'))
) as wave5_owner_cleanup;
commit;
