# Week 41 local validation — 5 October 2026

The weekly pages retain the shared template. No public HTML, CSS, Research data
or renderer changed. The earnings registry adds only W41 image/content metadata.
Locally release-ready. See the [source and publication review](../../weekly-publication-2026-W41.md)
and [Discord preparation](../../internal/week41-discord-distribution.md).

## Checks

| Check | Result / evidence |
| --- | --- |
| Full release validation | Passed: 331 Python tests, 454 Node tests; three existing optional database checks skipped; [log](release.log) |
| Browser smoke | 43 tests passed; [log](browser-smoke.log) |
| Authoritative weekly structural regression | Passed: W38–W41, five date states, five widths, both themes; [log](template.log) |
| W41 browser/content checks | Passed: nine macro events, twenty reports, dates/times, future actuals, source keyboard access, history, homepage rollover, original-image previews; [log](week41-browser.log) |
| Accessibility/CSP | Passed on 41 pages; [log](accessibility.log), [report](accessibility-csp.json) |
| Historical integrity | 99 prior week datasets, previous review records and provider metadata unchanged; [audit](history-integrity.log) |
| Discord dry runs | Original PNGs and caption only; [earnings](discord-earnings-preview.json), [macro](discord-macro-preview.json) |
| Git diff / review links | `git diff --check` passed; all local Markdown review links resolve |

Release validation also passed issuer/evidence checks, generated SEO, knowledge
history/editorial validation, calendar coverage, weekly image/data review, rules,
credential scanning, isolated staging, staged CSP and local asset references.
The existing partial macro-provider warning and 2027 schedule notice remain;
they do not represent newly verified provider coverage. The optional database
checks require a local PGlite module and were not run; no database code changed.

W41 unit tests cover Eastern/Central/Stockholm instants and the October 4/5 week
boundary, nine release families, all twenty issuer identities, separate release
and call times, unavailable sessions and Research relationships. Discord tests
cover no-network dry runs, exact original bytes, enable gates, full-year/week
selection, changed/missing selection rejection, canonical review mismatch,
deduplication and preservation of previous ledger entries. Deliveries use mocks.

The historical image-transcription smoke assertion is pinned to W39, making its
meaning independent of today's week. The generic future-template fixture now
uses W42 because W41 is real data. The source inventory includes Dallas/Kansas
City Fed schedules; existing publishers keep their canonical registry names.
Source verification does not alter the registry's existing rights-review status.

## Screenshots

64 captures: twenty W41 page/theme/width combinations, forty W38–W41 template
comparisons, two source disclosures and two original-attachment previews.
Desktop keeps the large earnings image left, verified text right and navigation
below; all narrower widths use the existing responsive stacking. Macro uses its
unchanged event hierarchy/navigation. No horizontal overflow or new layout was
found in the checks and visual review. Full-page captures start at scroll zero
to avoid Chromium placing offscreen fixed elements into the page capture.

| Width | Earnings light / dark | Macro light / dark |
| --- | --- | --- |
| 1440 desktop | [light](rapporter-1440-light.png) / [dark](rapporter-1440-dark.png) | [light](makro-1440-light.png) / [dark](makro-1440-dark.png) |
| 768 tablet | [light](rapporter-768-light.png) / [dark](rapporter-768-dark.png) | [light](makro-768-light.png) / [dark](makro-768-dark.png) |
| 430 mobile | [light](rapporter-430-light.png) / [dark](rapporter-430-dark.png) | [light](makro-430-light.png) / [dark](makro-430-dark.png) |
| 390 mobile | [light](rapporter-390-light.png) / [dark](rapporter-390-dark.png) | [light](makro-390-light.png) / [dark](makro-390-dark.png) |
| 360 mobile | [light](rapporter-360-light.png) / [dark](rapporter-360-dark.png) | [light](makro-360-light.png) / [dark](makro-360-dark.png) |

Template comparisons: [W39 desktop](template/2026-W39-1440-light.png),
[W40 desktop](template/2026-W40-1440-light.png),
[W41 desktop](template/2026-W41-1440-light.png),
[W39 mobile](template/2026-W39-360-dark.png),
[W40 mobile](template/2026-W40-360-dark.png),
[W41 mobile](template/2026-W41-360-dark.png).

Original Discord references: [desktop](discord-preview-1440.png),
[mobile](discord-preview-390.png). These are ephemeral local attachment-review
captures, not Discord posts; no week-specific HTML file is added.
Source disclosure: [desktop](peng-source-1440.png), [mobile](peng-source-360.png).

## Reproduction

Run with Node on PATH (or set `NODE_BINARY` to the Node executable), Python and
the repository's Playwright requirements. Local run: Node 24.18.1, Python 3.14,
Chromium 151.0.7922.34, fresh nonpersistent browser contexts.

```powershell
python -B scripts/validate_release.py
python -B scripts/browser_smoke.py
$env:NTM_WEEKLY_QA_DIR='docs/qa/week41/template'
python -B scripts/weekly_template_browser.py
python -B scripts/week41_browser.py
python -B scripts/quality_browser.py --output docs/qa/week41/accessibility-csp.json
node scripts/discord_weekly.cjs earnings 2026-W41 --dry-run
node scripts/discord_weekly.cjs macro 2026-W41 --dry-run
git diff --check
```

Original hashes were checked after all generation. New 1920/3840 WebPs are
responsive derivatives only; the original PNGs remain unchanged. No commit,
push, deployment, Actions dispatch, remote ledger access or live Discord send
was performed. Runtime webhook/environment settings were not exercised.
