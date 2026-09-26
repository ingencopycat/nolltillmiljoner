# Research scale-out — registry foundation

26 September 2026 · Baseline `f60b85c` · No issuer onboarding

The canonical contract is [data/issuer-registry.json](../data/issuer-registry.json). Each issuer declares its ticker, legal name, CIK, configured accounting profile, existing display names/order, financial support, evidence disposition and daily enrollment. `verified` evidence means admission to the existing bounded evidence pipeline; it does not claim complete coverage or live freshness. `pending`, `unavailable` and `not_applicable` remain distinct, non-enrolled dispositions. Daily enrollment requires financial support and verified evidence.

Membership is unchanged:

| Capability | Before and after |
|---|---|
| Financial | NVDA, SOFI, CRWD, MU, MRVL, VRT, COHR, RKLB, TTMI, SNDK, FLY, CRWV (12) |
| Deep evidence | NVDA, SOFI, CRWD (3) |
| Daily updates | NVDA, SOFI, CRWD (3) |

## Consumers and generation

[scripts/issuer_registry.py](../scripts/issuer_registry.py) validates the JSON and provides Python identity/enrollment selectors. `stock_contract`, company evidence, source closure, SEC daily admission and all three CLI modes use it. `company_evidence.PILOT` remains a derived compatibility alias, not a second list.

One deterministic browser projection is embedded at the start of the existing `ntm-product.js` bootstrap. It exposes immutable issuer records and catalog/capability selectors, and is also exported for Node consumers. This avoids an asynchronous catalog request, additional script tags across generated pages, or a second handwritten JavaScript registry. Research entry/routes, product links, relations, saved-review loading, scenario handoff, evidence loading, overview wording and since-analysis capability flags use that projection. The SEO build VM and isolated test VMs now load the same dependency.

Accounting recipes in `stock_normalizer.py` remain unchanged. The validator checks their membership and profile identifiers against the registry. SoFi banking applicability, CrowdStrike split restrictions, special calendars, limited history, CoreWeave financing restrictions and reviewed observation recipes are retained.

Run after an explicitly reviewed contract change:

```text
python -B scripts/issuer_registry.py --generate
python -B scripts/issuer_registry.py --check
```

Generation updates the browser projection and the deployment workflow's dispatch choices, financial transfer paths and staging paths. Those workflow values are unchanged today. Evidence/status JSONs, review/checkpoint manifests and all five source-artifact directories remain included. The generator/checker rejects missing or ambiguous workflow blocks and missing admission/index gates. The existing 06:35 UTC schedule and Git-index source validation are unchanged. The registry check runs in release validation and before workflow updates, including scheduled runs.

Source closure reads enrollment from the candidate root, including the exact Git-index copy. Daily candidates therefore carry the registry alongside the copied sources/data. Every evidence-enabled entry is visited; a missing feed or required source fails closed. Enrollment does not replace feed validation, status/health checks, bounded source retention or offline reproduction.

## Parity and validation

Tests pin today's 12/3/3 membership while the validator itself derives requirements from the contract, allowing future reviewed onboarding. New tests cover identities, uniqueness, profiles, capability combinations, projection/workflow drift, catalog/route parity, CLI modes, rejection of unknown or financial-only daily selections, and a test-only future issuer through generation, closure and CLI selection. No test activates a production issuer.

All 12 published annual, quarterly, TTM and valuation-base objects reproduce exactly from existing SEC fixtures. The 24-case browser comparison against `f60b85c` covers all 12 issuers at 1440 and 390px: stock objects, complete main-content text, source links and workspace hidden/inert state match. Financial-only issuers make no evidence requests. Re-run with:

```text
python -B scripts/issuer_registry_browser.py --baseline f60b85c
```

Validation completed:

| Check | Result |
|---|---|
| Full Python suite (stock, SEC daily/source lifecycle, company evidence included) | 317 run; 316 passed, 1 skipped |
| Full JavaScript suite | 434 run; 432 passed, 2 skipped |
| Browser smoke / entry / publication | 43 / 7 / 4 passed |
| Research shell | 210 visual/state cases passed |
| Evidence presentation / since-analysis | 24 / 24 cases passed |
| Browser baseline parity | 24 cases passed, all 12 issuers |
| Accessibility/CSP | 41 pages passed |
| Registry/workflow paths, actionlint, source closure, release/security/staging, diff check | Passed |

All 24 existing financial/feed/status/review/checkpoint JSON documents compare exactly with baseline `f60b85c`; Git reports no changes under `data/stocks`, `tests/fixtures` or `scripts/source_reviews`. Browser QA captures from this run were kept outside the repository rather than replacing earlier captures. Existing macro coverage warnings remained explicit during release validation; this task did not refresh macro data.

## Remaining onboarding work

The foundation is ready for the separate MU + VRT task. Neither issuer has been evidence-enabled or daily-enrolled. Candidate bootstrap, source capture, issuer-specific semantic review, defensible coverage dispositions and verified checkpoints are still required before activation. Existing daily bootstrap assumptions and financial-fixture preservation limits described in the coverage audit are not solved by enrollment centralization.

No financial datasets, evidence observations, source hashes, review queues, checkpoints, calculations, revision semantics, publication boundaries or UI design were changed. No live SEC refresh, commit, push or deployment was performed.
