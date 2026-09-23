# Hosted NVDA Form 4 fixture regression

The failed manual run produced existing bot commit `8bb6f3b614f9b3c90082dc9e3a98b15007fd262e`. It auto-accepted accession `0001199039-26-000016` using the existing Form 4 structure policy and committed NVDA evidence/status plus daily state. The workflow transfers/commits generated data before the build job runs `validate_release.py`; its artifact and commit paths do not include source fixtures. The offline XML, submissions index and exact expected count consequently stayed at the previous baseline. The release gate correctly stopped deployment. This was a source-fixture lifecycle mismatch, not evidence that the filing was invalid.

The clean local checkout was fast-forwarded to that already-existing remote commit for diagnosis; no new commit was created.

Repair:

- Restored the complete, bounded 7,281-byte [canonical SEC XML](https://www.sec.gov/Archives/edgar/data/1045810/000119903926000016/wk-form4_1790110579.xml) as `tests/fixtures/company_insiders/0001199039-26-000016.xml`.
- Verified SHA-256 `872cdb869ad15f7a8a6d3396e722d23ba32e66af46cc4c495795765615594548` against the committed source digest. The existing parser reproduces the entire committed filing exactly: NVDA issuer CIK 0001045810, reporting owner Mark A. Stevens (CIK 0001199039), original Form 4, two transactions and two holdings.
- Added only the matching official SEC submissions row to the NVDA offline index (filed September 22, 2026; report period September 18), and advanced the exact reproduction assertion from 12 to 13 filings. No equality or provenance assertion was removed.
- Added offline source-inventory checks for published pilot sources and reviewed registries. All 37 insider filings and registry documents (24 observation, 19 ownership including exclusions, 13 material-event sources), plus verified earnings relationship fixtures, are present. Complete-source hashes and insider index identities are checked; bounded HTML excerpts retain their existing extraction/provenance tests.

Validation: complete Python suite **300 tests, passing with one existing optional PostgreSQL skip**; SEC daily updater **22/22 passing**; complete `validate_release.py` passes, including JavaScript, security, staging and diff checks. Amendment/reconciliation and duplicate-index tests remain unchanged and pass. CI reads local fixtures only.

No updater, workflow, product, published evidence or amendment/deduplication semantics changed. No commit, push or deploy was performed.

After these fixture changes reach `main`, start a **new manual NVDA workflow** from that revision. Re-running the old failed revision does not pick up this repair. The current baseline is consistent and ready to retry. Future newly accepted filings still need corresponding offline fixture maintenance under the unchanged contract; this bounded repair does not change that lifecycle or suppress its release gate.
