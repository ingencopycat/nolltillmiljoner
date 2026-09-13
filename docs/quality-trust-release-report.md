# Quality / Trust / Release Discipline Pack — completion report

Date: 2026-09-14 (Europe/Stockholm). Repository implementation is the source of
truth; no `NTM-masteraudit.md` was present. No commits, pushes or deployment.

| Item | Confirmed gap / delivered change |
| --- | --- |
| B13 | PRs previously had only the standalone browser workflow. Added a read-only `quality` gate for full validation, browser/accessibility checks, performance artifact and actionlint. Weekly/manual runs included. Write-capable data/deploy jobs remain isolated. Branch protection instructions are documented, not applied. |
| B22 | Added a priority-calculator quality matrix and reusable result-content/state contract. Fixed CalcState retaining success after failure; errors now explicitly invalidate older results. Recovery accepts zero loss and rejects non-finite arguments. Daily fees above 100% are rejected as outside the model. Existing compound/Research/ISK/mortgage boundary coverage retained. |
| B25 | Confirmed incorrect claims about order of the same daily returns. Corrected them and added a beginner-readable/deeper explanation of reset, compounding, volatility, zero absorption and model limitations. Independent 99/91 example tested in both orders. No financial formula changed. |
| B26 | Added dated ISK/mortgage source registry, exact-parameter agreement tests, deadline/year checks and generated public version notices with overdue warnings. Constants agree with official sources; no tax/mortgage formula changes. |
| B59 | Added generated enforcing meta CSP with hashes for existing inline scripts and explicit external hosts. Live checks preserved TradingView/YouTube. Constrained content/AI summary markup and HTTPS source links; error strings render as text. No full security audit claimed. |
| B61 | Added day/year/purchase context to repeated controls. Corrected captured old day numbers after deletion, renumbered labels and retained focus. Existing named Research provenance/history/theme controls inspected. |
| B62 | Image lightbox now has dialog semantics, initial focus, Tab containment, Escape and focus return. Expanded name/menu/focus/reflow/theme checks plus existing dialog, contrast and reduced-motion tests. |
| B64 | Added repeatable seven-page baseline generation and checked in actual local measurements. Repeated runs agreed on request/payload totals. No score-chasing or unrelated performance refactor. |
| B66 | Added a small feature decision template covering user need, existing solutions, success, ownership, dependencies, stop criteria and NTM connections. |
| B77 | Recorded real static/local/data-job boundaries, future backend constraints, ownership, secrets, backup, failure/alert and deployment responsibilities. No backend or migration introduced. |

## Validation

- Full Python suite: **133 passed** (includes calculator, Research, Thesis,
  Change Detection, local storage, stock pipeline/TTM, macro and architecture).
- Full JavaScript suite: **97 passed**. Python also invokes selected JS suites;
  counts should not be added together as unique independent cases.
- Full real-browser suite: **17 passed**, Chrome 152.0.7977.83, fresh contexts.
- Accessibility/CSP baseline: **7 pages × 2 themes × 2 widths (1440/320)** passed;
  menu Escape/focus, named visible controls and no unexpected CSP violations.
- SEO: **28 canonical sitemap URLs, 7 articles; zero stale generated files**.
- Staging and local references: passed in a disposable temporary directory.
- Rule validation: zero issues. Calendar validation passes with the existing
  notice: complete 2027 macro schedules are not yet published; review 2026-11-01.
- Workflow syntax/expressions: actionlint **1.7.7 passed**, pinned archive checksum.
- Performance generation: two consecutive runs had identical local request counts
  and decoded JS/CSS/image/total payloads; timing variation is deliberately allowed.
- `git diff --check`: passed.

Browser flows include homepage/nav, leverage valid/error cases and renumbered
day removal, compound zero-net charts, recovery zero, ISK/mortgage, Research
valuation/provenance/history/restoration/exports/outcomes, Min NTM local backup
and review, content, theme persistence, keyboard/menu/disclosure navigation,
lightbox focus, reduced motion, contrast tokens and zoom-equivalent reflow.
New security checks show approved hashed example scripts run, unapproved inline
scripts are blocked and hostile summary markup cannot create active image nodes.
Live homepage TradingView and click-to-play YouTube checks found no remaining
parent-page CSP violations after source corrections. Visual spot checks included
the leverage page and the mobile light-theme ISK version notice.

## Recorded local baseline

Uncompressed localhost, cold contexts, no CPU/network throttling. External requests
and browser-scheduled favicons excluded. KiB values are rounded decoded payloads;
total also includes HTML and JSON. Exact transfer sizes/timings/assets are in
`performance-baseline.json`.

| Page | Requests | Total KiB | JS KiB | CSS KiB | Images KiB | DOM ready ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 11 | 945 | 750 | 146 | 34 | 372 |
| Leverage | 9 | 698 | 483 | 146 | 34 | 228 |
| ISK | 8 | 476 | 279 | 146 | 34 | 191 |
| Mortgage | 9 | 687 | 483 | 146 | 34 | 205 |
| NVDA Research | 19 | 1140 | 639 | 146 | 34 | 188 |
| Min NTM | 14 | 519 | 329 | 146 | 34 | 178 |
| Jordi Visser video | 10 | 555 | 350 | 146 | 34 | 179 |

Meaningful follow-up candidates: the shared script is about 265 KiB on these
pages; homepage weekly events about 414 KiB; NVDA JSON about 266 KiB; Chart.js about
204 KiB on chart pages. Selective loading/payload scope is worth measuring in a
future task. Images are not the dominant local cost in this sample. External
widget/video cost, real mobile CPU and field Web Vitals remain unmeasured here.

## Tests added or updated

- `calculator-reliability.test.cjs`: loaded-state failure/recovery, finite input
  boundaries, leverage permutation/zero/overflow oracle, constrained content and
  rule parameter agreement.
- `release-quality.test.cjs`: deadline/year/invalid metadata and deterministic
  CSP hashes, policy drift and inline-handler restrictions.
- `test_release_quality.py`: read-only workflow boundaries, required commands,
  executable rule/security checks and architecture/template maintenance contracts.
- `test_video_content.py`: compare intentionally constrained summary rendering.
- `browser_smoke.py`: day renumber/removal, zero recovery, lightbox focus,
  blocked script/markup; CSP-compatible polling preserves existing assertions.
- `quality_browser.py`: repeatable measurement and seven-page accessibility/CSP pass.

## Remaining owner actions and limits

Enable GitHub main protection/required status checks and Actions failure
notifications. Resolve how the existing data bot updates protected main without
granting validation a write token. Run the workflow on GitHub after publishing;
this session verified locally and with actionlint, not an actual hosted CI run.
Review upcoming macro coverage, ISK and mortgage deadlines; source verification
is human maintenance, not automatic legal assurance.

Do a manual screen reader and real zoom/forced-colors pass and live release smoke.
No full WCAG certification, penetration audit, field performance score or private
backend is claimed. CSP still allows necessary inline styles and trusted scripts;
meta policy cannot provide response-header-only protections or reporting. No
Lighthouse score was used. See `release-discipline.md` for the precise boundaries.

All ten items are **complete within the repository scope**, with the explicitly
manual owner configuration and verification above still outstanding.

## Files changed

Core changes: `script.js`, `ntm-ui.js`, `scripts/build_seo.cjs`, `README.md`.
All 32 root HTML files receive generated CSP metadata; ISK/mortgage also receive
rule notices, leverage has explanation/input-bound changes, and generated video
articles reflect safe escaping. Site routes/canonical URLs are unchanged.
The complete file list follows.

- `README.md`
- `aktiekopskalkylator.html`
- `aktievarderingskalkylator.html`
- `aterhamtning.html`
- `avgifter.html`
- `avkastningskalkylator.html`
- `bolanekalkylator.html`
- `calculator.html`
- `community.html`
- `fire-kalkylator.html`
- `havstang.html`
- `index.html`
- `inlagg.html`
- `investeringar.html`
- `isk-skattkalkylator.html`
- `makro.html`
- `min-ntm.html`
- `ntm-ui.js`
- `om-metod.html`
- `post-ai-portfolj.html`
- `post-asml-bank-of-america-high-na-euv.html`
- `post-jordi-visser-ai-agents-crypto.html`
- `post-jordi-visser-anthony-pompliano-ai-krypto-makro.html`
- `post-jordi-visser-linjart-exponentiellt-ai-trading.html`
- `post-micron-ai-memory.html`
- `post-palantir-nebius-sovereign-ai.html`
- `post.html`
- `ranta-pa-ranta.html`
- `rapporter.html`
- `research.html`
- `resurser.html`
- `script.js`
- `scripts/browser_smoke.py`
- `scripts/build_seo.cjs`
- `sparmalskalkylator.html`
- `tests/calculator-reliability.test.cjs`
- `tests/test_video_content.py`
- `valutajusterad-avkastning.html`
- `verktyg.html`
- `.github/workflows/validation.yml`
- `data/rule-registry.json`
- `docs/architecture-operations.md`
- `docs/calculator-quality.md`
- `docs/performance-baseline.json`
- `docs/product-decision.md`
- `docs/quality-trust-release-report.md`
- `docs/release-discipline.md`
- `scripts/check_rules.cjs`
- `scripts/check_workflows.py`
- `scripts/quality_browser.py`
- `scripts/security_policy.cjs`
- `scripts/validate_release.py`
- `tests/release-quality.test.cjs`
- `tests/test_release_quality.py`
