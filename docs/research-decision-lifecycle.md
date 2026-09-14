# Research decision lifecycle pack

Implemented B21, B68, B69, B72, B73 and B80. No accounts, cloud storage, new
stock-data coverage, AI interpretation, investment recommendation or financial
formula changes are introduced. Existing calculator-number UX work is retained.

## Product behavior

- **B21:** Outcome has separate assumptions, process and manual price sections.
  Assumption assessments and process notes come from the selected frozen source
  revision, identified as such. Existing observed fundamentals/model comparisons
  remain factual evidence. Price moves never assign a thesis/process verdict or
  an overall score. To document a later judgment, review and save a new thesis
  version. A saved Outcome keeps its source revision even after that source is
  deleted.
- **B68:** Each of three assumptions can have a free-text falsification criterion,
  optional review-by date, review status and user assessment/note. Nothing parses
  the criterion or evaluates it financially.
- **B69:** Up to three optional report questions, each with open/answered status
  and an optional answer/note. They are not linked to an automatically predicted
  earnings date. Updates append revisions; prior questions and answers remain.
- **B72:** Avstod appends a review decision and optional reason/process note,
  retaining the financial baseline. It is inactive, not deleted. Min NTM lists it
  with closed history, outside the active queue. Reopen and revise starts an
  unsaved editor operation; saving commits the new active revision. No hindsight
  ranking is computed.
- **B73:** Due is derived from the user's chosen date. A review already performed
  on/after that date satisfies it; a later review date can become due again.
  Superseded assumptions do not enter the queue. Passing time never changes the
  stored status or assessment. Editing a premise/criterion resets its editor
  assessment to unreviewed for an explicit new judgment.
- **B80:** Research's entry disclosure accepts a ticker or company label. Manual
  journals explicitly say “Manuell tes — automatisk bolagsdata saknas”. They use
  the same editor, immutable history, reviews, Markdown/print, backup and deletion
  as supported Research. No stock JSON is requested for unsupported companies;
  metrics, valuation, financial restoration, Change Detection and Outcomes are
  unavailable. Unsupported companies get no fabricated content relationships.

## Additive schema and identity

The existing `investment-research-theses-v1` key and V2 envelope remain. Legacy
`assumptions: string[]` stays compatible. Optional fields on each immutable revision:

| Field | Meaning |
| --- | --- |
| `assumptionDetails[]` | Aligned with nonblank `assumptions`; stable `id`, `createdAt`, `falsification`, `reviewBy`, `status`, `reviewedAt`, `assessment`, `note` |
| `status` | `current`, `reviewed`, `superseded`; `due` is derived for today's queue only |
| `assessment` | User-authored choice: `unreviewed`, `held`, `mixed`, `did-not-hold` |
| `reportQuestions[]` | Stable `id`, `createdAt`, `text`, `status` (`open`/`answered`), `answer`, `answeredAt` |
| `review.decision` | Existing `keep`/`revise`/`close`, plus `abstain` |
| `review.processNote` | Optional separate free-text process review |
| `origin` | `manual` for a manual revision; missing means existing supported Research |
| `companyIdentity` | `{type: 'ticker' | 'label', key: canonicalKey}` |

Ticker journals use the uppercase ticker as the existing store key. Label-only
journals get a collision-resistant `MANUAL-<UUID>` key. Labels do not enter URLs
or events. Manual revisions must have a matching identity and null valuation
snapshot. Later automated coverage may append supported revisions at the same
ticker key without changing old manual history; no migration/attachment operation
is implemented. Label-only journals require an explicit future identity-resolution
flow; similar names are never automatically merged.

New metadata IDs/timestamps are allocated on an explicit save. An unchanged save
reuses them and suppresses duplicate revisions. Legacy revisions are not assigned
invented criteria, questions, review dates or metadata creation dates. New criteria
added to an old assumption start their metadata history at that save. Reads and
exports never persist a migration. Array order in the revision remains authoritative.

## Review, backup and safety

Min NTM adds user-selected assumption dates and open questions to existing thesis
review dates and supported-company Change Detection reasons. Open questions carry
no implied deadline. Inactive items are excluded from every active reason. Manual
journals require no company data, so its absence is not an incomplete-data error.

Markdown and print use the same selected-revision export model. They preserve
criteria, assessments, question answers, IDs, dates, identity and decision/process
context. Manual exports omit financial tables and state the data boundary. The
existing full JSON backup/import path validates the new fields via thesis storage;
no backup envelope/key change or new storage system is needed. It preserves raw
revision records and archived Outcome source records, detects conflicting IDs,
and retains existing corruption/quota/rollback safeguards. Malformed lifecycle
metadata blocks writes/imports; source revisions are never rewritten.

## Validation

- `tests/lifecycle.test.cjs` plus Python discovery wrapper: legacy/duplicate safety,
  criteria, 0/1/3 questions, immutable answers, dates, abstention/reopening, manual
  identity/export/backup/deletion, future support, archived Outcome lifecycle and
  corruption rejection; price has no aggregate verdict.
- `scripts/browser_smoke.py`: NVDA criteria/questions, review and process note,
  saved Outcome, historical inspection, Avstod, Min NTM exclusion, reopening;
  unsupported ticker and label-only journals, no fake data/relations, Markdown
  and print, downloaded JSON roundtrip, deletion and unsafe ticker rejection.
  Both themes and widths 1440/360/390/430; screenshots outside the repository.
- Existing complete Python/JavaScript, Research/Outcome/review/backup/relations,
  browser and release checks remain required. `validate_release.py` checks SEO,
  staged local references, calendar/rule registry and whitespace.

## Limits

No automated truth evaluation, report scheduling/answers, background notifications,
manual price observation flow, or automatic conversion of label-only identities is
included. Physical-device and screen-reader testing remain manual follow-up; the
browser checks use fresh Chromium/Edge contexts and viewport/touch emulation.
Local storage limitations and backup ownership remain unchanged.

## Completed validation and changed files

Final validation on 2026-09-14: full Python discovery **134 passed**; full JavaScript
suite **105 passed**; full browser suite **22 passed**. After the last display/date
adjustments, relevant Research/lifecycle JavaScript tests (78) and both new browser
flows were rerun successfully. No console/page errors in the lifecycle flow.
Release validation passed SEO generation checks (zero outdated files), calendar
and rule checks, isolated staging/local references and `git diff --check`.
`quality_browser.py` passed seven-page accessibility/CSP checks; workflow lint
passed with actionlint 1.7.7. Manual screenshots were inspected in desktop dark
and mobile light themes after correcting hidden-control styling.

An existing nonblocking calendar notice remains: complete 2027 macro schedules
were not yet published at the last check, with a recheck due 2026-11-01. This task
neither updates calendar data nor claims new provider verification.

Files changed by this pack:

- `thesis-storage.js`: lifecycle validation, normalization, identity, immutable saves,
  review decisions, local-date status and shared read-only lifecycle text.
- `research-review.js`: optional editor fields, process review and inactive/reopen flow.
- `research.js`, `research.html`: manual entry/context, historical inspection and
  guarded journal-only views.
- `research-export.js`: lifecycle Markdown/print and manual-data boundaries.
- `research-outcomes.js`, `research-outcome-ui.js`: manual observation guard,
  archived lifecycle validation and separate assumption/process/price sections.
- `min-review.js`, `min-ntm.html`, `script.js`: manual/inactive lists and review reasons.
- `ntm-product.js`: allowlisted abstention action, without private payloads.
- `premium.css`: optional lifecycle layout and manual hidden-state enforcement.
- `scripts/browser_smoke.py`: two complete lifecycle browser regressions.
- `tests/lifecycle.test.cjs`, `tests/test_lifecycle.py`: eight lifecycle contracts and
  Python suite integration.
- `tests/test_premium_ui.py`, `tests/test_seo_foundation.py`: explicit new disclosures
  and mutually exclusive manual page heading.
- `README.md`, `docs/research-decision-lifecycle.md`: implementation and maintenance notes.

The prior uncommitted money-input changes in README, premium.css, script.js and
browser_smoke.py remain intact. No commit, push or deployment was performed.
