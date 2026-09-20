# Research Entry & Company Selector

2026-09-20. Bounded entry/selection correction. No new Research wave, Knowledge UX 100 work, financial-data changes, account/cloud contract changes, commit, push or deployment.

## 1. Cause of the initial content flash

The checked-out baseline is `a8b4f707f3e55fd4c7e9fd6ceaa099783fe78847`. Its generated company-specific `ntm-relations` sections lacked initial `hidden` attributes. All twelve “Fortsätt med … Research” sections therefore appeared before JavaScript initialization. `ntm-relations-ui.js` hid unrelated sections at `DOMContentLoaded`, while `research.js` revealed the initially hidden SEC directory or requested company. This was plain HTML/JavaScript initialization, not framework hydration.

Holding/blocking JavaScript in Chromium reproduced the twelve continuation sections; releasing it exposed “Bolagsfundamenta från SEC” and twelve large company cards on the no-ticker route. The observed order in this checkout is the reverse of the reported SEC-overview-to-continuation symptom. There is no evidence here of account/cloud state replacing the entry page: local thesis reads are synchronous; asynchronous account resolution updates account navigation and publication controls. A deployed version with a different sequence was not inspected.

## 2. Previous entry behavior

No ticker opened the SEC directory and fetched all twelve financial JSON files. Search was inside a closed “Byt bolag” disclosure, even without a selected company. The selector contained thirteen prebuilt links, including “Alla bolag”. Company-specific generated continuation links were educational/context links, not evidence of recent personal activity.

## 3. New entry-state model

`research-entry.js` owns entry presentation, invoked by the existing Research route/data loader. Static HTML starts in `INITIALIZING`: navigation plus an announced loading state, with selector, entry introduction, company workspace and generated company relations initially hidden. There is no timer, timeout-based reveal or account wait.

| State | Resolution |
| --- | --- |
| `INITIALIZING` | Neutral “Förbereder Research…” until the route and synchronous local reads resolve. |
| `NO_COMPANY` | Entry introduction and open search; no invented recent entries. |
| `RETURNING_RESEARCH` | Same entry layout, with up to three local continuation links below search. |
| `DIRECT_TICKER` | Requested supported company is loading; no entry-directory or relation-section substitution. |
| `COMPANY_SELECTED` | Requested company workspace, with a collapsed “Byt bolag · TICKER” selector. |
| `MANUAL_COMPANY` | Existing manual journal workspace and explicit manual provenance. |
| `LOAD_FAILURE` | Existing error explanation plus an open selector for recovery. No automatic manual-data substitution. |

Later account resolution does not choose an entry layout. Storage events can refresh the bounded recent list, never select a company or replace the workspace. With JavaScript disabled, the loading indicator is suppressed and an honest explanatory fallback is shown.

## 4. No-company experience

H1: **Analysera ett bolag**. Supporting text: “Bygg en investeringstes, granska rapporterad utveckling och följ vad som förändras över tid.” The labeled **Sök bolag eller ticker** field is immediately visible, inside an initially open “Sök/välj bolag” disclosure. Search precedes **Alla bolag**, then **Fortsätt där du slutade**, then the manual path.

Final bounded hierarchy adjustment: moved the existing browse disclosure above recents in DOM order. Its summary now uses the existing primary color, weight 600, 12px vertical padding and 16px top spacing. It remains collapsed by default; selector logic is unchanged. Seven focused entry browser tests pass, including 100/550-company scale, initialization, direct/manual routes and keyboard behavior. Additional checks pass for returning-user visual/Tab order at desktop and 360/390/430px in both themes, and accessibility/CSP for entry and selected-company pages. `git diff --check` passes. [Hierarchy evidence](../qa/research-entry-hierarchy/hierarchy.json) and [accessibility results](../qa/research-entry-hierarchy/accessibility.json). The adjustment remains locally release-ready; no commit, push or deployment.

## 5. Selected-company experience

The existing company H1 and workspace remain intact. The selector action is **Byt bolag · TICKER**. Opening it by keyboard or click places focus in search; Escape closes it and returns focus to its summary. Direct URLs, lowercase ticker URLs, existing query attribution and thesis deep links remain supported.

## 6. Continuation and recents

**Fortsätt där du slutade** uses existing dated recent visits and saved local theses, deduplicated by ticker and capped at three. Saved theses link to their thesis section. Unknown/manual companies require a saved thesis before inclusion; an arbitrary unsupported visit alone is not treated as useful research. Invalid or future dates are excluded. Fresh contexts have no recent section. No new storage, recency telemetry, cloud fetch, automatic restore or history mutation was introduced.

## 7. SEC provenance

SEC EDGAR is named in the search help as the supported universe's data source. Existing selected-company source details, timestamps, limitations, provenance dialogs and financial-profile explanations remain. SEC no longer defines the entry H1. Manual continuation entries explicitly say “Manuell tes · ingen automatisk SEC-data”.

## 8. Selector architecture

A small static ticker/name catalog and dependency-free JavaScript replace prebuilt links and directory cards. A regression asserts catalog agreement with the existing supported Research registry. Matching runs over data, while only a page of at most twenty links is created. No financial file is fetched to search or browse. Synthetic catalogs replace the module response only inside tests; production coverage remains twelve supported companies.

## 9. Search behavior

Search matches ticker and company name, including partial names and trimmed, case-normalized input. Ranking is exact ticker, ticker prefix, name prefix, then other substring matches; name/ticker ordering makes ties deterministic. Duplicate names remain distinct ticker links. Empty input renders no search results; no match provides an announced explanation and points to the manual path. Pagination replaces the current twenty results rather than appending an unbounded list.

## 10. Alphabetical browse

**Alla bolag** is a native collapsed disclosure. Opening it creates only populated company-name initials, selects the first group and shows at most twenty compact links. Selecting another initial replaces the group. Large groups paginate. Alphabet buttons wrap and expose `aria-pressed`; their result region is named and connected with `aria-controls`. Search temporarily hides browsing and recents while a query is present.

## 11. Manual companies

**Skapa en manuell tes för ett annat bolag** remains secondary and uses the existing identity, validation, storage and lifecycle flow. Both direct unsupported ticker routes and manual-form entry were checked. Manual saved work reopens correctly and is never represented as SEC-backed coverage.

## 12. Scale results

Cold, fresh Chromium contexts; 100 synchronous search-and-DOM-update samples per catalog. These are local measurements, not field performance guarantees. The production query was a broad “o”; synthetic catalogs used the all-matching “Company”.

| Companies | Initial selector descendants / result links | Search links rendered | Median / p95 update | Selector JS, uncompressed | Entry financial requests |
| --- | --- | --- | --- | --- | --- |
| 12 | 31 / 0 | 10 matching links | 0.1 / 0.2 ms | 9,783 bytes | 0 |
| 100 synthetic | 31 / 0 | 20 of 100 | 0.5 / 0.6 ms | 13,039 bytes | 0 |
| 550 synthetic | 31 / 0 | 20 of 550 | 2.1 / 2.3 ms | 29,239 bytes | 0 |

The exact-ticker, alphabetical group, pagination, mobile overflow and bounded DOM assertions pass at both synthetic sizes. The module's estimated gzip size for current coverage is 3,496 bytes. See [metrics](../qa/research-entry/metrics.json).

## 13. Mobile

Search is in the initial viewport at 360/390/430 px in light and dark themes. Results and alphabet controls remain tappable, with no horizontal overflow. A held-script initial-paint check and held-company-data check at 390 px show loading rather than a different meaningful page. Dense synthetic alphabetical navigation also passes at 360 px. Visual inspection corrected inherited full-width alphabet-button styling.

Examples: [fresh entry](../qa/research-entry/after-390.png), [alphabetical browse](../qa/research-entry/entry-390-light.png), [initializing](../qa/research-entry/initializing-390.png).

## 14. Accessibility

Visible input label, descriptive help, live result counts/no-match text, semantic lists and native navigation links. Tab/Enter work normally; ArrowDown enters search results, Up/Down moves through them, Home/End reaches boundaries and Up from the first result returns to search. Pagination focuses the first new result. Native disclosures expose their expanded state. Alphabet buttons are keyboard-operable and expose selection. Existing visible focus treatment remains. Reduced-motion mode disables the loading spinner animation.

Keyboard/focus tests, practical accessible-name checks, CSP checks, 320 px reflow and 640/320 CSS-pixel viewport equivalents of 200%/400% zoom pass. This does not claim a manual screen-reader audit or native browser-toolbar zoom test.

## 15. Performance and initialization

Measured no-company entry before/after, same local Chromium setup:

| Metric | Before | After |
| --- | --- | --- |
| Whole-page DOM elements, including hidden workspace | 1,186 | 942 |
| Selector descendants | 46 | 31 |
| Large company cards | 12 | 0 |
| Financial JSON requests | 12 | 0 |
| Total decoded page/resource bytes | 4,354,446 | 1,493,857 |

Changed production assets together are 4,811 bytes smaller despite the new selector module. Decoded bytes are uncompressed and do not model production caching/compression. Existing shared scripts, Chart.js and the hidden workspace still load; lazy-loading the broader Research bundle is outside this correction. A selected company still loads its existing complete data file. See [payload comparison](../qa/research-entry/payload-comparison.json).

## 16. Files changed

- `research.html`: explicit initial state, entry copy, selector markup, removal of directory cards, no-JS fallback, regenerated initially hidden relation sections.
- `research-entry.js`: entry controller, catalog, pure search/group/recent helpers, bounded rendering, pagination and focus behavior.
- `research.js`: connect route/load outcomes to entry states, remove directory-wide financial requests and obsolete pill selection code.
- `research-v3.js`: remove the superseded selector handlers; workspace/chart presentation remains unchanged.
- `research-v3.css`: compact selector, wrapped alphabet controls, entry layout, loading relation suppression and reduced motion.
- `ntm-relations.js`: generate Research-specific context sections hidden initially, so regeneration preserves the fix.
- `tests/research-entry.test.cjs`, `scripts/research_entry_browser.py`: new focused regressions and scale measurements.
- `tests/research-expansion.test.cjs`, `tests/research-workflow.test.cjs`, `scripts/browser_smoke.py`: replace obsolete directory-card assertions with coverage/search/no-unselected-fetch assertions.
- `scripts/test_auth_browser.py`: assert search-first and direct-ticker behavior during the existing signed-in SDK session fixture.
- This report and `docs/qa/research-entry/`: evidence and screenshots. Unrelated regenerated historical QA images were restored.

## 17. Tests and results

| Gate | Result |
| --- | --- |
| Focused entry Chromium suite | 7 tests pass: initial paint/slow direct route, search/keyboard/manual, returning/error, mobile/themes, scale, saved manual/reflow, no-JS. |
| Complete release validator | 167 Python tests and 301 Node tests pass, no skips; includes local PostgreSQL/RLS/publication checks. |
| Existing browser smoke | 38 tests pass. |
| Existing Wave 1–5 browser regressions | 7 / 9 / 7 / 4 / 4 tests pass. |
| Knowledge100 browser regression | 6 tests pass; this is verification of existing behavior, not new Knowledge work. |
| Account/session and social browser scripts | Both pass, including persisted signed-in Research entry and direct ticker. |
| Practical accessibility/CSP/payload suite | Existing 41-page suite plus no-company Research entry pass. |
| SEO generation/check, catalog/history, staging and local references | Pass through the release validator. |
| `git diff --check` | Pass. |

Evidence: [focused log](../qa/research-entry/browser.log), [release log](../qa/research-entry/release.log), [browser regressions](../qa/research-entry/regressions.log), [accessibility log](../qa/research-entry/quality.log), [41-page report](../qa/research-entry/quality.json), [entry accessibility report](../qa/research-entry/entry-quality.json).

Existing release notices about partial macro updates and unpublished future schedules remain visible; they are unrelated to this change. Browser-server cancellation traces during navigation did not fail the suites.

## 18. Remaining limitations

Signed-in verification uses the real SDK against local synthetic Auth responses, not a hosted production account. Recents reflect existing local state, including previously synchronized records already present locally; Research does not newly fetch or promise cross-device recents. The static catalog must be extended alongside actual supported data; the 100/550-company tests prove selector capacity, not additional financial coverage. Accessibility verification is practical automated/browser inspection, with the manual-review limits described above. The exact reported reverse-order flash was not reproduced in this baseline.

## 19. Local release readiness

Locally release-ready for this bounded correction, with the documented verification limits. Data ingestion, valuation, Fundamental Profile, thesis/review contracts, Public Research contracts, account/cloud contracts, RLS and canonical Visual V3 design tokens are unchanged. No commit, push or deployment was performed.
