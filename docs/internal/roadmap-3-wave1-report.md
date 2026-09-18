# NTM Roadmap 3.0 — Wave 1 implementation report

**Understand without losing the task · 18 September 2026 · Local engineering release candidate**

Authority: [Roadmap §17 / Wave 1](ntm-master-roadmap-3.0.md#17-first-three-implementation-briefs). Baseline: `88ac5186`, with the owner's untracked roadmap preserved. No commit, push, deployment or hosted write. Wave 2 has not begun.

## 1. Current-state findings

Checked the current catalog/projection/search/generator, relation generation, Academy activity IDs, Research's actual editable input/provenance state, calculator mode/input/state handlers, production HTML, staging/security policy, existing release instructions and tests before implementation.

The initial catalog contained 26 published editorial seed answers. Fråga NTM already had the Wave 0 exact-definition ranking and reviewed aliases; that algorithm remains unchanged. `fees` covered brokerage, not annual percentage fees; `cagr` explained endpoint annualization, not directly how saving compounds. These are distinct content gaps rather than reasons to duplicate the existing definitions.

Research already calculates valuations, records provenance and has substantial lifecycle/publication functionality. The visible Base inputs are a suitable bounded transfer surface. The standalone tool defaults to SEK and generic example values, so merely adding a company link would not preserve financial context. Existing relation links remain plain fallbacks. Existing account/session/publication/RLS and calculator formulas were retained.

Eight journeys were baselined against §5.2: metric→Knowledge (implemented); Research→valuation (implemented); Knowledge→existing practice (implemented); Academy→labelled calculator task (deferred W3); public report→private interpretation (deferred V2); Min NTM→exact revision (deferred W2); Macro→specific concept help (deferred); calculator→saved work (existing scenarios/plans retained, no replacement). Savings and valuation are additional inline-help consumers in the Wave 1 pilot.

## 2. Knowledge concepts and content

The canonical source remains `docs/internal/knowledge/catalog.cjs`. Twelve pilot concept IDs resolve to eleven answer records: nine existing plus two bounded new answers. No bulk Knowledge expansion, new Academy activity or new financial formula was introduced.

| Pilot concept ID | Canonical answer ID | Existing practice ID |
| --- | --- | --- |
| `pe` | `pe` | `check-pe-0` |
| `forward-basis` | `forward` | `check-forward-metrics-0` |
| `eps` | `eps` | `check-eps-0` |
| `dilution` | `dilution` | `share-count` |
| `fcf` | `fcf` | `growth-cash` |
| `margins` | `margins` | `exercise-operating-margin` |
| `growth` | `cagr` | `check-cagr-0` |
| `inflation` | `inflation` | `price-level` |
| `compounding` | `compounding` — new | `cost-timing` |
| `annual-fees` | `annual-fees` — new | `cost-timing` |
| `valuation-assumptions` | `thesis` | `build-thesis` |
| `review-falsification` | `thesis` | `build-thesis` |

The two thesis contexts intentionally reuse one answer. The new annual-fee answer does not redefine brokerage. The compounding practice is an existing cost/compounding application, not a claim that a new dedicated exercise exists. Original answer IDs, slugs, status semantics and text remain intact.

Pilot entries have content version 1, a proposed review due date of 2027-03-18 and an existing practice ID. Internal metadata names the NTM owner as acceptance reviewer, explicitly `pending`, maps definition/explanation/caveat sections to existing sources, and distinguishes synthetic example checking. The public projection excludes internal review notes and accepts only declared fields. Validation checks concept references, version/date, practice existence and source/reviewer mapping. Nine old source-review dates were preserved rather than falsely advanced.

The new answers were source-checked against [Investor.gov's compound-interest calculator](https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator) and [its fees bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated). Their examples were independently recomputed. The fee timing is explicitly the existing NTM convention. Both additions are `reviewed`, visible locally, **noindex** and excluded from the sitemap; human owner editorial acceptance is still pending. There are now 28 visible answers, while the canonical sitemap remains at 85 URLs.

## 3. Contextual inline help

`wave1-ui.js` resolves a concept through the projected catalog and renders its canonical short answer and caveat, content version, review date, source links and example. No parallel definition strings were embedded in consumer pages. Research metrics/thesis/valuation, standalone valuation and savings use a bounded concept disclosure; EPS/P/E and savings fee/inflation fields also have adjacent help controls.

The native dialog uses canonical V3 tokens via scoped `wave1.css`, a labelled title, initial focus, explicit Tab/Shift+Tab wrap, Escape and focus return. Missing/unavailable answer resolution offers Knowledge search rather than inventing a definition. Opening/closing help never submits a form or calls a calculator.

## 4. Research → Knowledge → return

Inline help leaves the original document alive. “Läs hela svaret” opens the canonical article in a new tab with `noopener noreferrer` and the public `#task-help` marker. The article displays a close/return instruction. No form state, financial values, company identifier or private return URL is carried to Knowledge. Returning means closing the reading tab and continuing in the preserved original tab.

This deliberately avoids serializing unsaved Research as a navigation snapshot. It is not a durable draft feature and cannot recover work after the user explicitly closes or reloads the original document. A browser leave warning protects user-edited pilot forms; accepting that warning remains the user's choice.

## 5. Research → valuation

A source action in Research opens a fresh valuation tab for **Base → Simple**. The read-only adapter `NTMWave1Research` reads the five visible inputs: price, EPS, Base EPS growth, years and Base final P/E. It never uses a hidden last-calculated result or copies a saved thesis. Current inputs may be stale relative to a visible result; the preview explicitly calls them current inputs, not saved/calculated output.

The company must be one of the twelve existing supported datasets. Manual/unsupported companies receive the existing standalone route as the alternative; no fake stock data is generated. Missing/zero/negative EPS blocks transfer. An untouched fallback EPS is not accepted as a deliberate user assumption. Explicit manual EPS remains manual. SEC-derived EPS must have the expected USD/share and TTM basis; unverified share basis is retained and displayed, not upgraded to verified.

## 6. Knowledge → existing practice

Pilot answer pages generate a direct link to the mapped published Academy activity. Existing lesson/related-tool navigation remains. The build validator checks the activity against the actual published activity catalog; no fabricated `check-*` destination is permitted. Opening the link neither submits a response nor awards mastery. Generated reciprocal links on three Academy pages reflect the two new Knowledge answers, without changing lessons or progress rules.

## 7. Company/Scenario context contract

`wave1-context.js` is one small, versioned handoff contract, not a global state framework. It accepts only `research-base-scenario`, schema 1, Research source, Simple valuation destination and `research-base-inputs/1` mapping. The envelope contains a 15-minute creation/expiry interval, pinned public company identity/currency, five numeric inputs and a strict provenance basis.

The basis carries price source and **unknown quote date**, EPS source/unit, percentage-growth unit, period/end date, filing date, source method, share-basis status and the company's SEC companyfacts URL. Company name/ticker/source URL are checked against the current supported dataset identities. Tests detect divergence if those data identities change later. This identity map contains public company metadata, not user identity.

A random UUID fragment resolves one payload in the destination tab's `sessionStorage`. Values never appear in its URL. The new blank tab has its opener severed before navigation; any browser-cloned session storage is cleared in that disposable tab before the bounded record is written. The source tab's storage is untouched. Another browser/device/tab without that record cannot resolve the handoff. Public Concept context uses stable catalog IDs/version references, not a private payload.

Expiry is enforced on initial read and again at apply. An open preview also expires on a timer. Apply, decline and rejected reads remove the payload. Closing the tab ends ordinary session storage lifetime; expiry is an access bound, not a guarantee of secure deletion from browser session recovery or backups. No persistent work is put in the handoff cache.

## 8. Preview and explicit apply

The destination initially keeps its own values, including SEK. The preview displays company, USD, all five numeric values, source/period/date/method and share-basis status. It explains that required return and other scenarios are not transferred and that price is not live.

The user must check an explicit replacement statement and choose “Använd dessa antaganden.” Editing destination inputs after checking resets confirmation. Apply validates the stored payload again, verifies it is the same preview, selects Simple mode, changes only its five fields/currency and sends the existing input/change events so normal stale-result behavior remains in force. It does not submit the form. “Beräkna” remains explicit. Subsequent edits distinguish the original transfer basis from current user-modified inputs. Decline changes no calculator input.

## 9. Unsaved-state protection

Help and transfer preserve the original Research document, unsaved thesis text, current valuation inputs and source state. Full Knowledge and valuation open separately with visible new-tab wording. User-edited pilot forms and applied transfers receive `beforeunload` protection for refresh/leaving. No local draft autosave, revision creation, new storage schema for journals, review queue or Wave 2 lifecycle work was added.

The existing recent-tools list can update when a calculator is opened; this is normal pre-existing navigation behavior. Tests distinguish it from private Research mutation. Closing the original tab deliberately or accepting the leave warning can still discard unsaved work; this limitation is in the owner procedure.

## 10. Privacy boundaries

No thesis prose, assumptions text, revision IDs, portfolio positions, account tokens, private labels, questions or calculated outputs enter the transfer projection. No handoff network endpoint, raw-question logging, AI, new analytics event or background service was added. Catalog text renders with DOM text nodes; external links use fixed reviewed destinations or the validated SEC origin/path.

Wave 1 does not read account state, upload private work, sync, publish or change RLS. Existing SDK/publication boundaries were regression-tested. The transfer uses the five explicitly described financial inputs only, and applying them requires user action. Generic relation links remain unparameterized fallbacks. User sentinel strings were checked against handoff storage, URLs, outgoing requests and Research persistence.

## 11. Malformed, stale and mismatched context

Fail-closed checks cover malformed JSON, oversized/missing records, wrong token/tab, unknown kind/version/method/destination, unknown or mismatched company/name/source, unsupported currency, EPS/growth-unit mismatch, nonfinite/empty/nonpositive EPS, invalid numeric ranges/fractional years, invalid dates, future timestamps and expiry. Manual EPS cannot borrow a reported period or source method. Unknown fields are rejected rather than silently projected into state.

Blocked popups or storage failures leave Research in place with a status message. An unavailable transfer never falls back to silently loading default or stale assumptions. A plain standalone calculator remains usable. These errors are bounded to the handoff, not hidden as successful application.

## 12. Mobile, keyboard and accessibility

Wave 1 browser checks cover three inline-help surfaces at 1440, 390 and 320 CSS pixels in light/dark: **18 combinations**, plus six handoff preview screenshots. No page/dialog horizontal overflow; focus stays in the help dialog and returns to the triggering control. Measured help text/link/button contrast minimum: **5.24:1** across those checks, above the 4.5:1 acceptance threshold.

Inspected the actual dark mobile EPS dialog, light mobile annual-fee dialog and light 320-pixel transfer preview screenshots. The generated [QA artifacts](../qa/roadmap-wave1/) contain 24 screenshots and machine-readable checks. These are headless Chromium/Edge results, not claims of complete WCAG certification or real-device/screen-reader acceptance. The owner procedure retains those manual checks.

## 13. Tests added and changed

- `tests/wave1.test.cjs`: strict contract/expiry/provenance/privacy boundaries, all twelve dataset identities, manual EPS distinction, concept/practice projection, examples and nonindexed additions.
- `tests/fixtures/wave1-queries.json`: 30 labelled retrieval cases; exact/forward/why definitions, reviewed `guidning`/`LTTM` aliases, new bounded coverage and abstention. “Är P/E 40 dyrt?” remains an abstention; no broad numerical interpretation or universal valuation verdict was added.
- `scripts/wave1_browser.py`: production-page help/full article/return; apply/decline; edited-destination re-consent; independent valuation arithmetic; malformed/expired/unit/company failures; missing data/manual company/popup/storage failures; unsaved refresh guard; mobile/theme/focus/contrast/screenshots.
- Existing Knowledge tests now retain the original 26 plus two additions and enforce status-appropriate index/noindex semantics. Existing browser assertions reflect 28 visible answers.
- Quality audit includes valuation and both new answer pages. Route audit accepts an optional output directory so Wave 1 artifacts do not overwrite historical V3 evidence.

Initial runs caught harness assumptions about focus wrapping, existing recent-tools updates and reviewed-versus-published indexing. These were corrected rather than suppressing failures. The final results below refer to the corrected implementation and checks.

## 14. Complete validation results

| Gate | Result |
| --- | --- |
| Full release runner: Python | 166 tests pass; database configured, no skips |
| Full release runner: JavaScript | 229 tests pass, no skips, including publication migration |
| Generated SEO/Knowledge/relations | 85 canonical sitemap URLs; zero stale generated outputs |
| Calendar/weekly records/rule registry | Pass; existing partial macro and unpublished 2027 schedule notices remain explicit |
| Staging/local references/credential scan/CSP/whitespace | Pass |
| Full existing browser suite | 38 pass |
| Wave 1 production-browser suite | 7 pass; 18 help viewport/theme combinations and six preview screenshots |
| Quality accessibility/CSP/payload audit | 39 representative routes, both themes at desktop/320; pass |
| Site-wide V3 route audit | 246 route/theme checks; canonical canvas, no overflow, primary contrast ≥4.5 |
| Actual PostgreSQL private cloud RLS | Pass: ownership/isolation/conflict/cascade/stale-token boundaries |
| Actual PostgreSQL social RLS | Pass: public projection/ownership/reporting/follows/unpublish/deactivation |
| SDK/session browser regression | Pass: restoration/restart/refresh/logout/deletion/offline; no silent upload |
| Social/publication browser regression | Pass: opt-in/preview/cancel/private preservation/XSS/mobile |
| Workflow syntax | actionlint 1.7.7 pass |

Browser: installed Edge/Chromium 153.0.4234.32, fresh automated contexts. Test fixtures intercept hosted auth/social calls; actual PostgreSQL checks run in local PGlite. No real account was created and no hosted backend was mutated. Existing macro warnings were not “fixed” by advancing data/source dates.

Reproduction, after installing the repository's existing Python/browser requirements:

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
$env:NODE_BINARY='C:\Users\Mirne\AppData\Local\Programs\Python\Python314\Lib\site-packages\playwright\driver\node.exe'
$env:NTM_BROWSER_CHANNEL='msedge'
$env:PGLITE_MODULE="$env:TEMP/ntm-pglite-zddk8hjw/package/dist/index.js"
python -B scripts/validate_release.py
python -B scripts/browser_smoke.py
python -B scripts/wave1_browser.py
python -B scripts/quality_browser.py --output docs/qa/roadmap-wave1/quality.json
& $env:NODE_BINARY scripts/test_cloud_rls.cjs
& $env:NODE_BINARY scripts/test_social_rls.cjs
python -B scripts/test_auth_browser.py
python -B scripts/test_social_browser.py
$env:NTM_V3_QA_DIR='docs/qa/roadmap-wave1'
python -B scripts/visual_v3_route_audit.py
python -B scripts/check_workflows.py
```

The PGlite path above is the existing local installation used for verification, not a committed dependency. If it is removed, set `PGLITE_MODULE` to an installed `@electric-sql/pglite/dist/index.js` before reproducing the no-skip database gate. The website itself does not need Node or PGlite to launch. Scripts generating screenshots/reports write only their QA output, not production data.

## 15. Human pilot and remaining evidence

The exact launch, content review, synthetic tasks, expected values, mobile/manual checks and five-participant recording sheet are in [the owner procedure](roadmap-3-wave1-owner-test.md). **No external participants were run and no owner content sign-off was claimed.** The required four-of-five unassisted completion plus provenance comprehension is pending. Automated checks establish engineering boundaries, not user comprehension, demand or retention.

## 16. Deviations and bounded decisions

No expansion into Wave 2, AI, paid data, generic global state, new calculator formulas or design variants. Two Knowledge answers were necessary to avoid explaining annual fees with a brokerage definition or compounding with only a CAGR answer. They are bounded additions within the pilot, not a 100-object publishing wave.

The full-article safe-return design uses a preserved original tab rather than a serialized navigation state. Transfer supports the selected Base→Simple case only; reverse mode, Bear/Bull and required-return transfer are deliberately excluded and described in the UI. Manual-company handoff is unavailable, with standalone calculation retained. These are implementation bounds of the requested smallest handoff.

The roadmap's owner concept/content acceptance dependency remains explicitly pending. The user's current instruction authorized resolving the IDs and implementing the local slice; the resolved set is reviewable here without pretending that implementation approval constituted editorial sign-off. The user's explicit instruction allows the engineering report to finish while external pilot evidence remains pending.

## 17. Engineering readiness

**Engineering portion: release-ready locally under the completed automated gate.** Full product acceptance is pending owner editorial review and the formative pilot. Production deployment was neither performed nor independently verified. No commit or push was made. The next action is the owner procedure, not starting Wave 2 or expanding the scope.
