# SEC daily source lifecycle repair — 2026-09-24

## Cause and publication boundary

The daily Form 4 path fetched and parsed official XML but discarded it after appending normalized evidence. It did not extend the bounded offline submissions index. The workflow neither transferred nor staged these fixture directories, and its release gate ran after the data bot commit. A one-file repair restored one snapshot without changing any of these paths, so the next accepted filing recreated the failure.

`scripts/evidence_sources.py` now enforces source closure. Each issuer candidate preserves the fetched XML, checks official accession/issuer/index identity, verifies its SHA-256 and exact parser result after reading it back, and merges only the required official submissions row. Historical rows and completeness guards remain. New earnings relationships preserve only bounded Item 2.02/exhibit fragments, their fragment hash and original-document hash. Unsupported extraction remains review-only.

Issuer candidates are isolated. A source-closure failure routes the issuer to REVIEW REQUIRED with unchanged production evidence and checkpoint; transport failures remain REJECT/FAILED. ALL mode accumulates the shared manifest without overwriting earlier issuers' additions. The combined candidate is checked across all three issuers before any production writes. Local write errors roll back source, evidence and checkpoint changes. This is rollback protection, not a crash-safe multi-file filesystem transaction: hosted publication is one Git commit.

The prepare job checks source closure before artifact upload. The artifact and `git add` include all five bounded source directories and source-review registries. The receiving job runs the full release gate before staging, then exports and validates the actual Git index before committing. An unstaged XML present in the working tree cannot satisfy this check. A blocked daily report stops publication. Cadence and product behavior are unchanged.

## Current source repair

The repository audit confirmed exactly these eight missing sources. Each was fetched through the existing throttled SEC client from its canonical SEC Archives URL, matched to official submissions metadata, checked against the already-published SHA-256, and parsed to the entire already-published filing object. No production evidence was dropped or rewritten. Hashes use the established UTF-8 decoded-text/LF contract.

| Issuer | Accession | SHA-256 |
| --- | --- | --- |
| NVDA | 0001696841-26-000014 | 87b3a8f9f46990cc520bcd8af0970fbfb1aac270147ef430a23e24ef926be228 |
| SOFI | 0002032458-26-000028 | fbee458590e681db8a96ba657a374ae844d6e13151018ed3e6f076d41a1a3d56 |
| SOFI | 0001934200-26-000011 | 454b0bd0dc5f5aeffd5f4dc0c32795dd178720ef1df912fdd8b76ad435643d93 |
| CRWD | 0001968270-26-000015 | 5dd4d2d07221590762d220bbb0247bd69745ac479b64020f8106cf2d877ef364 |
| CRWD | 0001921602-26-000010 | d02f46923879a6906a34bda09313aed3eb4a5dafb5db95e7e9a675355f0686db |
| CRWD | 0001778610-26-000022 | 0ebd5280fae8c87d5dc2b531d1da2c77fe1a2bb775b5f89273b49fe8551f3676 |
| CRWD | 0001778564-26-000169 | 2d7fc0aef3e5cc9841307e42246daec73be777d1561d3747eaaf11480f74c58a |
| CRWD | 0001778564-26-000168 | cc967d5d4cdd79627687b606931fe82c6d936b21bec5cacf6c7fa10943c930c0 |

All 45 published insider filings reproduce: NVDA 14, SOFI 10, CRWD 21. Tests now derive counts from the canonical feed while retaining exact whole-object equality. The malformed-number test pins its intended accession and asserts each mutation actually changes the XML, avoiding dependence on the newest submission.

## Other evidence classes and separate historical finding

The invariant also checks earnings exhibit relationships and fragment hashes; guidance/KPI, segments and capital/liquidity reviewed observations, quote hashes and inline XBRL facts; and exact 13D/13G and material 8-K reproduction. Registry sources are checked even when excluded from visible publication. No new extraction capability or indiscriminate full-filing archive was added. Existing companyfacts handling is unchanged. Fixtures remain internal and excluded from the staged website.

Legacy earnings fixtures intentionally retain relationship excerpts, not full documents. Their manifest now pins the existing published full-document digest separately from the independently checked excerpt digest. Index manifest hashes consistently use UTF-8 text with LF, avoiding Windows checkout-byte differences.

**Separate provenance review:** six existing SoFi earnings excerpts parse legal status as `unspecified` while published metadata says `furnished` (2026 accessions ending 000050, 000020, 000008; 2025 ending 000204, 000148, 000068; prefix 0001818874). Re-fetching the first full official document also differed from its historical published digest. These historical claims were not silently rewritten or represented as newly verified. The original exhibit-identity/relationship fixture contract remains; new excerpts must additionally reproduce legal status at admission and subsequent validation. This historical full-document/status discrepancy requires a separate provenance review and does not permit missing source fixtures.

## Regression coverage and release use

The offline end-to-end test discovers a synthetic new Form 4 from a published baseline, supplies an official-source-shaped fixture, accepts it, preserves evidence/source/index, transfers files using the actual workflow artifact patterns, stages using the actual workflow `git add` command in an isolated repository, and validates the exported Git index. Removing just the XML from the index fails even when the working tree contains it; staging stale submissions metadata also fails. No test commits or pushes.

Additional coverage includes source-fetch/persistence failure, hash mismatch, combined-candidate corruption, multiple filings and issuers, shared earnings manifest updates, rerun/idempotency, amendments, no-change byte stability, missing sources in other layers and local publication rollback. CI validation remains offline.

A new hosted NVDA/ALL run can exercise the repaired lifecycle after this code and its source repair are released together. Re-running an older workflow revision still uses the defective implementation. No live hosted run, commit, push or deployment was performed for this task.

Validation completed locally: `validate_release.py` passed; Python ran 311 tests with one optional local PostgreSQL-engine skip (310 passed); JavaScript ran 409 with 407 passed and two optional database skips. This includes all 22 daily tests, ten lifecycle regressions, fixture inventory, insider reproduction and affected evidence-layer suites. The final new-earnings ALL-mode reproduction check also passed separately. Actionlint 1.7.7, working-tree and staged-site security scans, generated-artifact checks, site staging/local references and `git diff --check` passed. Existing macro partial-update/future-schedule notices remain unrelated. Production data has no diff and the repository Git index remains unstaged.
