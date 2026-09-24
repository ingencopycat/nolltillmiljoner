# Sedan din analys — local release review

Implemented on 24 September 2026. No commit, push, deployment, new companies, data categories, prices, paid data, or AI.

## Baseline and evidence

- The latest revision identified by the existing immutable Research store is the baseline. Its `savedAt` determines the cutoff. Selecting an older history entry does not change this return summary. Saving a meaningful later revision moves the cutoff; no-op saves retain the existing revision contract.
- Publication/SEC filing dates determine eligibility, never ingestion, verification or updater timestamps. Date-only evidence on the baseline day is conservatively excluded. Future evidence is excluded.
- Reuses the existing reporting, observations, segments, capital, insider, ownership, material-event and snapshot comparison APIs. TTM financial changes require validated stock data and dated underlying inputs. Existing comparison thresholds remain >1% for TTM amounts and >0.5 percentage points for margins.
- Includes reviewed reporting/documents, financials, guidance, KPIs, segment/business categories, capital/share counts/SBC/buybacks, liquidity/debt, Form 4, 13D/G, and material 8-K events within existing coverage.
- Pending, rejected, ambiguous, invalid and unsupported evidence is not promoted. Segment bundles must reconcile; conflicting capital observations are withheld. Unreviewed insider amendments and affected originals are excluded. Validation failures fail closed.
- Updater failure uses verified data. Missing/broken health responses no longer discard an otherwise verified feed. A failed same-company reload retains already-loaded verified comparison evidence; a fresh load without evidence reports unavailability.

## Presentation and continuation

- At most three area previews by default; remaining populated areas are behind **Fler områden**. No empty areas. Each area opens to all its underlying changes, with nested **Källor & metod** and official links.
- Reporting documents appear in one reporting area; financial and operating effects appear in their respective areas. Exact accession relationships are retained. Separate filings are not falsely merged just because dates match. Material-event grouping reuses the reviewed event identities.
- Latest relevant periods lead previews. Comparable previous/current values, percentages or guidance direction are shown where the existing APIs allow them. Definitions, accounting basis, recasts, quotes and prior sources stay in disclosure. Existing history/chart sections remain reachable; no extra chart engine was introduced.
- The new view replaces the pilot companies' old raw snapshot-diff presentation and duplicate reporting-only counter. Other companies' legacy comparison presentation is retained.
- **Granska mot min tes** opens and focuses the existing review workflow. It neither changes assumptions nor chooses a decision. Earlier versions remain immutable and readable.
- Unsafe comparisons show the existing reason; definition/scope breaks explicitly state that direct comparison is impossible. No percentage is manufactured. No-change and no-revision states use the requested explanations.
- The adapter and UI perform no network requests or storage writes. Private Research prose is not included in their output or sent to services; canonical evidence uses the existing local feed loader.

## Screenshot review

Two passes cover NVDA, SOFI and CRWD at 1440, 360, 390 and 430 pixels in dark/light themes, using isolated saved-revision fixtures dated 1 August 2026 and unchanged canonical evidence.

Pass 1 exposed an overly tall seven-area mobile view, an unclear Form 4 count, unchanged financial values producing distracting comparison warnings, and older recast periods leading previews. These were corrected. Pass 2 shows three concise previews, explicit Form labels, latest periods and readable wrapping. Expanded groups, source links, keyboard disclosures and revision preservation were checked. No horizontal overflow occurred. Values screenshots supplement the default and expanded-report screenshots. The existing Research page remains dense; its wider information architecture was deliberately left for the later dedicated pass.

## Validation

- Full release runner: **311 Python tests** (one skip); **428 JavaScript tests** (426 pass, two skips), zero failures. Includes Research, company evidence, SEC daily updater, Fundamental Profile, publication/privacy/security and release checks.
- Final focused Research/feature run: **83/83 passed**.
- Full browser smoke: **43/43 passed**. Research entry: **7/7 passed**.
- Evidence/Fundamental Profile presentation matrix: **24/24 configurations passed**.
- Feature browser matrix: **24/24 configurations per pass**, with refresh, Back/Forward, keyboard use, themes, all expanded groups, subsequent save, immutable prior revision, private-text exclusion and updater/source failure assertions.
- Accessibility/CSP suite, actionlint, source reproducibility, generated metadata, security scans, staging/local references and `git diff --check`: passed.
- Initial failures were fixed: minimal test-DOM methods, generated Research metadata, and legacy tests expecting the replaced reporting counter. Logs preserve the final results. PowerShell can mark redirected native stderr as an error even when a Python runner finishes successfully; the release log ends with the runner's explicit PASS and both test summaries have zero failures.

## Limits and readiness

Locally release-ready for the existing reviewed pilot coverage. The view is not a complete filing archive: reporting remains bounded by the feed's 24-event window, and company-specific reviewed histories vary. Date-only metadata cannot establish same-day ordering or an earlier publication time absent from the canonical contract. TTM comparisons require usable saved provenance; unsupported comparisons remain withheld. Historical/recast disclosures may still yield many rows after deliberate expansion. No live SEC requests or hosted deployment were performed.
