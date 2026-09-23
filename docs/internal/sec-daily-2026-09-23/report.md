# Daily SEC evidence refresh — 2026-09-23

The existing deployment workflow now runs the NVDA/SOFI/CRWD admission pipeline once daily at **06:35 UTC**: 07:35 CET / 08:35 CEST. Its previous three weekday runs are replaced; the shared macro update consequently also runs once daily. GitHub schedules can be delayed and run from the default branch; this is a daily schedule, not a guaranteed delivery time. [GitHub scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## Reuse and incremental work

`update_stocks.py --daily` delegates admission to `sec_daily.py`, using the existing SEC transport, reviewed CIK identities, filing/exhibit parser, Form 4 parser, financial normalizer and complete evidence validators. No alternate observation schema or UI was added. Research continues reading the same public feeds; private accounts, Research prose and snapshots are never inputs.

Each issuer gets one submissions request. Accession metadata fingerprints are persisted in `scripts/source_reviews/daily_state.json`, outside the public site. Normal unchanged runs fetch no filing bodies or company facts and preserve production bytes and timestamps. A new periodic filing permits one cached company-facts request; new eligible Form 4/earnings documents are fetched individually. Reviewed narrative/history layers are not rebuilt daily.

Bootstrap recognizes published accessions and discovers unrepresented supported filings from September 1, 2026, matching the current pilot boundary. Existing review queues are also carried forward. Historical reviewed examples remain intact. Recent-window gaps, changed known metadata, more than 100 new documents per issuer, or a review backlog above 2,000 fail closed for controlled catch-up.

## Admission boundaries

| Outcome | Treatment |
|---|---|
| AUTO-ACCEPT | Valid original Form 4 with previously exercised XML paths and supported transaction codes; periodic financial additions with established definitions/units/derivations and unchanged historical observations; deterministic earnings exhibit relationships; routine vote/exhibit filing metadata. |
| REVIEW REQUIRED | New/changed KPI, guidance, segment, capital or narrative disclosures; financial restatements/definition changes; ownership amendments and 13D/G identity/comparability; unreviewed material/unsupported 8-K structures. No interpreted observation is published merely because a number parses. |
| REJECT/FAILED | Malformed/unsafe responses, identity/contract failures, changed accession metadata, missing new-period facts, network failures or catch-up bounds. Retry on the next scheduled/manual run; failed issuer checkpoints do not advance. |

An earnings filing can contribute an accepted document relationship while its guidance/KPIs remain review-only. No generic automatic extractor was added for future narrative disclosures: the existing exact-source review registries remain authoritative.

All issuer work is staged and validated before adoption. Any failure discards that issuer's entire candidate, including already parsed rows, while allowing independently valid issuers to proceed. Existing histories and failed-issuer status timestamps remain unchanged. Local write failures roll back; public publication remains one release-gated revision.

## Owner operation and publication

In **Actions → Deploy and Update NTM Website → Run workflow**, select `ALL` (default), NVDA, SOFI or CRWD. This calls exactly the scheduled pipeline. Local equivalents:

```text
python -B scripts/update_stocks.py --daily --all
python -B scripts/update_stocks.py --daily --ticker SOFI
```

Read the run summary and `sec-owner-review` artifact: issuer/new filing/accepted/review/failure counts, production-change flag, and up to 100 review entries per issuer with accession, form, source URL, recognized structure and reason. Omitted counts are explicit; the complete bounded backlog persists in the state file. Reports contain no raw documents or arbitrary transport error bodies. Review artifacts expire after 14 days; transfer artifacts after one day. They are excluded from Pages staging, but are repository artifacts, not confidential storage.

Resolve an entry through the existing source review registry, fixtures and explicit reviewed regeneration commands; verify the regenerated feed and then remove the corresponding `review` entry from daily state in that same reviewed change. A single reviewed number never automatically closes every concern in its filing. Daily “Update now” cannot bypass this boundary.

The existing validated-data → commit-data → exact-revision release tests → Pages path is retained. State-only changes may persist without building or deploying. No data changes means no scheduled/manual deployment. Macro timestamp-only churn is suppressed; actual macro value/status changes still justify deployment. Code pushes retain normal release validation. No commit, push, workflow dispatch or deployment was performed during implementation.

## Cost, scale and setup

External SEC data cost remains **0 SEK/month**: no paid provider or credential is introduced. The existing identifying User-Agent, approximately 6.6 requests/second maximum throttle, bounded JSON retries and strict source URLs remain in use; SEC permits up to 10 requests/second. [SEC access guidance](https://www.sec.gov/about/webmaster-frequently-asked-questions)

| Hypothetical issuer count | Ordinary submissions requests/day | Per 30 days |
|---|---:|---:|
| 3 | 3 | 90 |
| 25 | 25 | 750 |
| 100 | 100 | 3,000 |

Only the three pilots are enabled. Extra document traffic depends on new filings, not accumulated history. Source review workload and release tests will dominate before these request counts become difficult. No sharding or extra infrastructure is needed now.

GitHub standard runners are free for public repositories; private repositories draw from plan allowances (Free: 2,000 minutes/month and 500 MB artifact storage). Other workflows share those allowances, so zero total hosting cost is conditional on repository settings and usage. As an illustrative budget, 30 runs at five preparation minutes plus fifteen release minutes each would use 600 runner-minutes, excluding other jobs/retries; this is not a measured estimate. Check actual Actions usage and enforce a zero-spend budget where required. [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

Owner setup: land the reviewed changes on the default branch when ready; verify Actions scheduling, bot write/branch-policy compatibility, Pages environment and existing public cloud configuration. Confirm the SEC contact identity remains accurate. No new secrets are required. Existing macro credentials remain separate. GitHub scheduling/billing and production permissions were not exercised remotely.

## Validation and readiness

Deterministic tests cover real pilot bootstrap, no new filings, one/multiple/duplicate discoveries, Form 4 admission/provenance, unknown XML, comparable financial additions, changed definitions/restatements, new KPI/segment/guidance review boundaries, unsupported 8-K, malformed sources, network/partial failures, whole-issuer rollback, retry/idempotency, window gaps, bounded owner artifacts, manual/scheduled parity and no-op publication. Macro tests distinguish timestamp-only changes from values/status changes.

Full release checks passed: 298 Python tests (one optional PostgreSQL skip) and 402 JavaScript tests (400 passed, two optional migration skips), including 22 new daily-pipeline tests. Existing financial/evidence/Research contracts, workflow actionlint, browser smoke (42), Fundamental Profile regression (4), and three-pilot accessibility/CSP at 320/1440px in light/dark themes passed. Security/staging and `git diff --check` passed. Browser evidence is in `docs/qa/sec-daily-wave4/`.

Locally release-ready with these conservative admission boundaries. Live GitHub execution and billing configuration remain unverified. The next step is an owner-run ALL update after the normal release, inspecting the artifact and confirming a second unchanged run skips publication.
