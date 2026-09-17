# Work Audit 2.0 — Wave 0

Date: 2026-09-17. Scope: credibility and correctness only. No commit, push or deployment.

## 1. Fråga NTM: root cause and fix

`ask()` stripped question prefixes only from the query. A shared concept such as `pe` then received the same score as a direct answer, with alphabetical IDs breaking ties. Phrase scores also grew without a bound, allowing long overlaps to overtake exact matches.

Matching now uses separate ordered tiers: exact question, equivalent definition question, exact alias, title phrase, exact concept, full term coverage, broader phrase overlap. Definition prefixes are normalized symmetrically; how/why/driver wording is retained. Whole phrase boundaries prevent incidental substring concept matches. Existing normalization, aliases (including `guidning` and `lttm`), categories and deterministic tie-breaking remain. No AI or network calls.

“Vad är P/E?” returns the definition first. “Vad är forward P/E?” returns forward/trailing first. The reviewed P/E answer already discusses price, EPS, expectations, debt and earnings quality; an editorial alias routes “Vad påverkar P/E?” there. An explicit obligationsräntor question still returns the rates explanation first. No new answer or financial claim was added.

## 2. FIRE mathematics

Inspected before editing. **No withdrawal-model error found; mathematical functions are unchanged.**

- `simulateFire` uses annual expenses / initial withdrawal rate as the target and real monthly returns for accumulation.
- `buildPostFireProjection` withdraws fixed real monthly expenses after growth, capped at available capital. It does not recalculate withdrawals as a percentage of the changing balance.
- `simulateFireWithdrawal` uses a monetary monthly withdrawal, optionally compounded with inflation each month starting at month one. Growth is after the selected fee; withdrawals are capped at available funds.

These are deterministic, smooth monthly scenarios, not a historical backtest or a guarantee. The conventional historical rule uses an initial portfolio percentage and subsequent inflation adjustments to the monetary withdrawal. Primary reference: [Bengen, Determining Withdrawal Rates Using Historical Data, original 1994 article reprinted by FPA](https://www.financialplanningassociation.org/sites/default/files/2021-04/MAR04%20Determining%20Withdrawal%20Rates%20Using%20Historical%20Data.pdf), especially printed page 12.

## 3. FIRE wording

Corrected the education paragraph, visible FAQ and JSON-LD FAQ to the same definition: approximately 4% of the portfolio at retirement for year one, then inflation-adjusted monetary withdrawals. Removed the misleading changing-balance annual-percentage explanation. Added the calculator's real/nominal and monthly-model distinctions. The 25-times-expenses target examples remain correct.

Searched root product HTML/JS and the Knowledge/Academy editorial and generated content for 4%-rule variants and related examples. No additional 4%-rule explanation was found outside the FIRE page. Unrelated occurrences of 4% inflation, bond yields or returns were left intact.

## 4. Compound comparison basis

Finding: main growth result included the selected fee, while the adjacent 7/10/20 cards and bar chart hardcoded zero fees. Both used nominal values, equivalent monthly returns and month-end contributions. The main real-value result was separately inflation-adjusted. The old before-fee note was below the comparison.

Cards and comparison chart now use the selected mode's fee, start capital, saving and horizon. The existing annual fee convention is preserved: `(1 + gross return) * (1 - fee)`. No projection formula changed. An explanation directly above the cards states that results are nominal, after fees, before tax, without inflation adjustment, with month-end saving and reinvested total returns. The chart dataset and earnings labels agree.

Dividend-mode comparisons use that mode's selected capital, saving, horizon and fee. They are explicitly separate total-return scenarios: the dividend model's yield, dividend growth and distribution/reinvestment setting are not applied. They therefore are not labelled as forecasts of the dividend portfolio. The main dividend calculation is unchanged. Comparisons remain hidden for a custom annual-return path, as before.

## 5. Recommendation on 7/10/20

All three values are preserved. The 20% card is explicitly a high illustrative scenario; adjacent copy states that none is a forecast and 20% is not normal expected market return. Recommendation: retain the creator's set with these labels. Any future change to scenario values needs an owner decision, not an inferred expected-return assumption.

## 6. Research price provenance

Replaced “dagens aktiekurs” with the entered valuation price and “Vad prisar marknaden in?” with growth required at that price. Exit P/E is an assumption. Input and result messages disclose example/manual/historical status, missing verified quote date and the model basis. Saved snapshot and export labels also disclose the missing quote date; undocumented original price sources are no longer silently called manual. A saved revision's date is not presented as a verified market quote date. No live price provider, new date field or data-schema change was added.

## 7. Research labels and units

Added a presentation map for all 17 metric keys found across the 12 stock files. Cards, missing-data lists, table button accessible names, dialog headings and underlying-quarter labels use Swedish editorial names. In particular, `operatingCashFlow` becomes “Operativt kassaflöde”. Derivation-method identifiers receive readable explanations. The debt card still warns that a component may not represent all debt.

Currency rendering is unchanged: monetary tables/cards use USD with existing magnitude abbreviations; the source dialog retains explicit source units. Per-share and share-count surfaces keep their distinct units. SEC taxonomy/concepts, accession IDs, dates, source inputs and method versions remain available in provenance details. No schema keys, amounts, formulas, stock JSON or financial baselines changed.

## 8. Local / synced / public copy

Replaced Research's obsolete “Ingen inloggning, ingen moln, ingen delning” sentence with three explicit states: saved on this device; optional sync copies private data to the account; an analysis becomes public only through explicit publication.

Reviewed account, Min NTM, sync messages and method/privacy text. Existing account copy already says the account is private, a public profile is optional, publication requires confirmation, sync is chosen, and local deletion does not remove account copies. Local-only Academy/decision-pause exclusions remain accurate and unchanged.

## 9. Encoding/editorial corrections

Corrected literal `?ndringar` in the unsaved-change confirmation, `capital` to `kapital`, and `matematisk sett` to `matematiskt sett`. Swedish display labels replace raw metric/method tokens and the deferred-revenue English shorthand. UTF-8 checks on touched/high-value pages found no further concrete mojibake. No broad copy rewrite.

## 10. Data-state terminology

Preserved reported versus derived source evidence, manual EPS, missing/unsupported values and stale-calculation safeguards. Cards now explicitly distinguish reported values from calculations on reported inputs. Valuation output is described as modelled; manual price provenance is explicit; missing quote dates are explicit. Existing “Härlett värde”, “Manuell”, “Saknas”/“Ej tillgängligt” and stale-result explanations remain valid contextual equivalents. No new badge system or false assertion that old fundamentals are live market data.

## 11. Future correction channel (documentation only)

Current entry points: `om-metod.html#ansvar` links to the Instagram account; `#rattelser` asks for a page URL, disputed claim and preferably a primary source through that contact link. Trust footers direct users to this method/contact page. Instagram requires an external social account and is a weak durable correction workflow.

Smallest credible future solution: one monitored, reply-capable contact address using an owner-controlled mailbox, published on the method page and reachable through the existing footer. Verify inbound delivery and replies before publishing it. If no mailbox is available, use a minimal contact form backed by a monitored inbox, with receipt acknowledgement. Request only page URL, issue, optional source and optional reply address; discourage private portfolios/backups. Assign a responsible reviewer and use the existing dated material-correction log. No mailbox, invented address, provider subscription or form was added in this wave.

## 12. Files changed

- `knowledge-core.js`: ordered deterministic ranking.
- `docs/internal/knowledge/catalog.cjs`, generated `knowledge-catalog.js`: P/E drivers alias.
- `fire-kalkylator.html`: explanation, FAQ/schema and concrete typos.
- `script.js`, `ranta-pa-ranta.html`: comparison fee basis and scenario labels.
- `research.js`, `research.html`, `research-export.js`: labels, provenance, privacy and typo fixes.
- `tests/knowledge.test.cjs`, `tests/calculator-reliability.test.cjs`, `tests/research-workflow.test.cjs`: focused regressions.
- `scripts/browser_smoke.py`: real-page Wave 0 regression.
- This report.

## 13. Tests added/extended

- Definition synonyms, punctuation/diacritics, explicit forward/driver intent, existing spelling aliases, unknown-query abstention, stable results and adversarial long overlap/catalog order.
- Independent FIRE oracles: zero real return, changing portfolio with fixed real spending, depletion, nominal inflation-linked withdrawals and fixed nominal withdrawals.
- Comparison cards and chart against a separate monthly recurrence in both modes, with selected fees and no inflation discount; growth-main parity; visible high-scenario and dividend-basis labels.
- Identical FIRE definition across body/FAQ/schema.
- Metric coverage across every supported ticker, source concepts/units/value preservation, example/manual/restored price disclosures, undocumented legacy export provenance, and local/sync/public wording.
- Real browser first-answer ranking, selected-fee card result, price status, readable metric labels and mobile overflow.

## 14. Validation

Validation used a disposable checkout from `git -c core.autocrlf=false archive HEAD`, overlaid with the changed files, with an isolated Git index. This checks archive file availability and normalized source bytes without modifying the working repository's index. No generated financial artifacts were refreshed.

Environment: Windows, Python 3.14, Node 24, installed Chromium, PGlite 0.5.8. Commands and archive contents mirror the release checks; this is not a Linux/Python 3.12/Node 22 GitHub-hosted run.

| Check | Result |
| --- | --- |
| Focused Knowledge/calculator/Research tests | 101 passed |
| `python -B scripts/validate_release.py` on final product files | Passed: 166 Python tests, 222 JavaScript tests; no skips |
| `python -m unittest discover -s tests -p "test_*.py"` | 166 passed |
| `node scripts/test_social_rls.cjs` | Passed ownership, authenticated/anonymous boundaries, unpublish, cascades and stale tokens |
| `python -B scripts/browser_smoke.py` | 38 passed |
| Final targeted Wave 0 and Research history/export/outcomes/backup browser checks | 2 passed after the legacy-price clarification |
| `python -B scripts/test_social_browser.py` | Passed offline publication/privacy/mobile checks |
| `python -B scripts/test_auth_browser.py` | Passed SDK session persistence, refresh, logout and deletion checks |
| `python -B scripts/quality_browser.py --output ...` | 36 routes passed accessibility/CSP checks |
| `python -B scripts/check_workflows.py` | Passed actionlint 1.7.7 |
| SEO/generated content | 85 canonical sitemap URLs; zero outdated artifacts |
| Staging, local references and staged CSP/security | Passed through release gate |
| Working repository `git -c core.safecrlf=false diff --check` | Passed |

Startup issues were corrected without changing product code or weakening tests: standalone Python/account-browser invocations initially lacked `NODE_BINARY`; one targeted browser invocation used a nonexistent test method name and was rerun with the actual name. The first focused label regression also exposed a real raw-key leak inside the source dialog, which was fixed before the passing gate. Social browser screenshots were generated only inside the disposable checkout.

Logs and quality JSON are in the local temporary directory as `ntm-wave0-*.log` and `ntm-wave0-quality.json`; checkout: `ntm-wave0-ci-75gq1cq3`. Browser/account tests use isolated fixtures, not hosted account mutations. Protected Phase 2 financial hashes were not updated or normalized differently.

## 15. Remaining P0 concerns

No new Wave 0 P0 identified in code review or completed checks. Existing macro gate notices remain: partial upstream availability and a not-yet-published 2027 schedule. They are represented as unavailable data, not inferred values. They were not altered by this task. The future correction channel remains a documented follow-up, not a claim that a new channel exists.

## 16. Release readiness

The implemented Wave 0 changes pass the complete local release gate and are ready for owner review and the normal CI release process. GitHub's target OS/runtime run has not been claimed. No commit, push, frontend deployment or production mutation has been performed.
