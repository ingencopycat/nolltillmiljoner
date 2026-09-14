# Noll till Miljoner

Noll till Miljoner (NTM) is a Swedish investing and personal-finance website focused on useful tools, market context, investment content, resources, and stock research. It is a static, multi-page site built with plain HTML, CSS, and JavaScript, hosted on GitHub Pages at `nolltillmiljoner.se`.

**Positioning:** Utility first. Creator second. The site should feel useful on its own, regardless of who created it. The creator's personal journey and Instagram presence exist, but they are secondary.

**Value proposition:** *Förstå dina val. Följ upp dina investeringar.* The recurring workflow is understand → formulate → save → review → revise.

**Core product principle:** *Simple by default. Powerful when you want it.* This guides calculators, page layouts, navigation, information density, and all future development. Avoid complexity that only exists to make a feature look advanced.

---

## Site structure and navigation

Primary navigation is **Verktyg · Research · Min NTM · Lär dig**. The logo leads home. Lär dig is a native, keyboard-accessible disclosure grouping Inlägg och videor, Resurser, Makro, Rapporter and Community. Links are static HTML; existing URLs/canonicals remain unchanged. `scripts/build_seo.cjs` generates the common navigation and sets `aria-current="page"` only on the exact matching destination.

| Nav item | Page | Purpose |
|---|---|---|
| Hem | `index.html` | Homepage with the "NTM Idag" dashboard and latest posts |
| Verktyg | `verktyg.html` | Tool directory: search, category filters, tool cards |
| Research | `research.html` | SEC EDGAR-normalized fundamental company research, historical financials, valuation scenarios, research thesis journal, and change detection |
| Min NTM | `min-ntm.html` | Local personal overview: saved research theses, calculator scenarios, and recent tools |
| Inlägg | `inlagg.html` | Post archive: search, category filters, tag filters, pagination |
| Makro | `makro.html` | Weekly macroeconomic calendar & historical archive |
| Rapporter | `rapporter.html` | Weekly earnings calendar image archive |
| Resurser | `resurser.html` | Curated resources (YouTube, Podcasts, Böcker) |
| Community | `community.html` | Discord invite |

Every page shares the same topbar: brand/logo, main nav, dark/light theme toggle, and a hamburger menu on mobile. The table above lists destinations, not eight competing top-level links.

Redirect shims kept for old links (do not build on these): `calculator.html` → `ranta-pa-ranta.html`, `investeringar.html` → `inlagg.html`.

---

## NTM Research (Stock Fundamentals & Valuation)

`research.html` is the client-side stock fundamentals explorer and valuation workspace (`research.js`).

### Architecture & Data Flow
- **URL entry point:** `research.html?ticker=<TICKER>` (e.g. `SOFI`, `NVDA`, `CRWD`).
- **Static JSON Data:** The frontend consumes pre-normalized JSON files from `data/stocks/<TICKER>.json`. The browser **never** calls SEC EDGAR endpoints directly at runtime.
- **Supported Tickers:** Currently `SOFI`, `NVDA`, `CRWD` with company-specific profiles (`financial_services`, `standard_company`, `software_saas`).
- **Research Index View:** When visiting `research.html` without a `ticker` parameter, the page renders an index overview with summary cards and key TTM metrics for all supported stocks.

### Key Features
1. **Fundamentals & Key Metrics:**
   - Overview cards show available TTM revenue, operating/net income, cash flows, stock compensation and latest balance-sheet components. EPS is shown in valuation; diluted shares are preserved in snapshots and compared only when the share-basis gate passes.
   - Profile-dependent metrics (e.g. Total Net Revenue net of interest expense for `financial_services`, Operating Income where applicable, FCF where economically meaningful).
2. **Annual & Quarterly History:**
   - Annual tables show revenue, operating income, net income, diluted EPS, operating cash flow, CapEx and FCF. Quarterly tables show revenue, net income, diluted EPS and cash-flow metrics, with period dates. Latest balance-sheet metrics are shown in the overview cards rather than these tables.
   - Interactive Chart.js visualizations for annual and quarterly performance.
3. **SEC Filings & Provenance:**
   - List of recent 10-K and 10-Q filings with filing dates, report periods, accession numbers, and direct SEC EDGAR document links.
   - **Provenance Modal:** Displays exact SEC XBRL concept names, taxonomies, forms, accession numbers, and derivation methods for any reported metric.
4. **Valuation Base & Forward Scenarios:**
   - Driven by `valuationBase` (`asOfPeriod`, `ttmNetIncomeToCommon`, `ttmDilutedShares`, `ttmDilutedEps`, `ttmFreeCashFlow`, `ttmFcfPerShare`).
   - Manual stock price input with stock-specific **example** defaults (NVDA $120.00, SOFI $15.00, CRWD $280.00). Input and calculated results say “Exempelpris – inte aktuell börskurs”; editing the price marks it “Pris angivet av dig”. Restoring assumptions marks the input “Historiskt sparat pris”. Results retain the provenance of the last calculation while inputs are stale. No live market price is fetched; normalized SEC fundamentals are a separate data source. Explicit calculation with an unchanged example remains labeled as an example, without an extra confirmation step.
   - Displays current P/E TTM and P/FCF TTM (where FCF is supported).
   - **"Vad prisar marknaden in?" (Reverse Valuation):** Computes required EPS CAGR given target annual return, horizon years, and exit P/E.
   - **Bear / Base / Bull Scenario Analysis:** Three scenarios calculate future EPS, price and CAGR, accompanied by a 5-by-5 sensitivity matrix around Base assumptions.
   - **Calculator Interaction Rule:** Edits to valuation inputs mark the valuation state as *stale* (showing a status warning banner). Results only update when the user explicitly clicks **Beräkna värdering & scenarier**.
   - **CRWD / Manual EPS Fallback:** When a stock lacks a reliable SEC TTM EPS (e.g. CRWD mid-year stock split setting `ttmDilutedEps: null`), an override banner appears, setting EPS source to "Manuell" and allowing user manual EPS input.
5. **Min Thesis (User Research Journal):**
   - Personal analysis form with up to three assumptions, an optional review date, and four narrative fields: *Min tes* (required), *Viktigaste risker* (optional), *Vad skulle få mig att ändra mig?* (optional), and *Anteckningar* (optional).
   - Saved locally in browser `localStorage` under key `investment-research-theses-v1`.
   - **Thesis Snapshot:** When saving a thesis with a valid, non-stale valuation, the system automatically captures a valuation snapshot (TTM metrics, valuation inputs, valuation results, Bear/Base/Bull scenarios, EPS source, `capturedAt`, and `asOfPeriod`).
   - **Snapshot contract:** `research-snapshot.js` owns `schemaVersion: 2`. `ttmMetrics` contains finite numbers or `null` under `revenue`, `netIncome`, `eps`, `dilutedShares`, `fcf`, `fcfPerShare`, `netMargin`, and `fcfMargin`. Margins are percentages (e.g. `12.5` means 12.5%), not ratios. Financial metadata includes `asOfPeriod`, `quarters`, `periodStart`, `periodEnd`, and `currency`; identity, `capturedAt`, `valuationInputs`, `valuationResults`, and `scenarios` remain part of the snapshot.
   - **Revision storage:** The key remains `investment-research-theses-v1`, with envelope `version: 2` and `theses[TICKER] = { revisions: [...] }`. Revisions are stored oldest first in append order; the last valid revision is latest. Each new revision contains a stable `id`, its own `createdAt` and `savedAt`, `companyName`, `text`, `risks`, `triggerChange`, `notes`, and the canonical `valuationSnapshot` (including inputs/results/scenarios and financial metadata). `get()` / `all()` project the latest revision for existing consumers and expose `latestRevisionId`, `revisionCount`, and normalized read-only `revisions`.
   - **Compatibility:** V1 single-thesis records appear as a first revision with deterministic `legacy-TICKER` ID. Original text, original timestamps, extra fields, and raw snapshot are retained when an explicit write persists migration; reads never rewrite storage. Unversioned/V1 snapshots normalize in memory from short names or legacy `ttm*` names. Missing historical values stay `null`; margins derive only from saved operands. Manual valuation EPS never substitutes for SEC EPS. Unsupported snapshots remain stored but cannot be compared. Unsupported/corrupt envelopes block writes, and malformed revision arrays block append/single-delete for that ticker rather than silently dropping records.
   - **Save behavior:** One **Spara ny version** action appends a revision only when text, valuation, or financial baseline meaningfully differs from the latest revision. Whitespace-only text differences, capture timestamps, and display labels do not create duplicates. Identical saves do not write or refresh timestamps. Reopening or selecting history never creates a revision. Existing revisions are never updated in place or automatically pruned, including when storage is full.
   - **History UI:** A compact newest-first selector shows save time, financial period, and Base target/CAGR where available. Selected revisions are read-only; the editing form stays on the latest thesis and valuation inputs are not restored by selecting history. The preview includes saved text, risks, triggers, notes, valuation assumptions/results, and scenario inputs/outputs. Min NTM shows only the latest revision and count.
   - **Deletion:** Confirmed **Radera vald version** removes only that revision. Deleting latest promotes the preceding valid revision; deleting the final revision clears the baseline. Unsaved text is retained during a single-revision deletion. The separately confirmed **Radera all historik** action deletes all revisions for that ticker.
   - Saved indicator displays relative time ("just nu", "för 5 min sedan", etc.) and an expandable snapshot preview.
6. **Change Detection ("Sedan din thesis"):**
   - Handled by `change-detection.js` (`NTMChangeDetection.detect(snapshot, currentData)`).
   - Default baseline is the latest revision. Selecting an older revision compares that saved snapshot against current stock JSON, without modifying the editing form or treating manual price assumptions as company-data changes. Selection is page-local and resets to latest on reload.
   - Subject to the shared provenance/comparability gate, compares TTM Revenue, Net Income, EPS, Diluted Shares, FCF, FCF/share, derived margins in percentage points `pp` (Net Margin, FCF Margin), period updates (e.g. `2026Q1 → 2026Q2`), and new 10-K/10-Q filings filed after the thesis capture date.
   - **Fact-Based Presentation:** Changes are presented as neutral numerical facts. The system does **not** automatically judge a thesis as "good" or "bad", nor does it produce recommendations or automated scoring.
   - Displays a warning banner if the thesis snapshot is over 12 months old.
   - Reports metric changes strictly greater than 1% and margin changes strictly greater than 0.5 percentage points. A zero metric baseline reports a nonzero absolute change with percentage unavailable; unavailable metrics are omitted. Unknown snapshot dates do not imply an old analysis. Saving or deleting a thesis immediately refreshes the comparison and snapshot preview.

---

## SEC Data Pipeline

The backend python pipeline fetches, normalizes, and stores official SEC EDGAR XBRL facts into static JSON files consumed by `research.html`.

### Pipeline Scripts
- `scripts/sec_client.py`: Official SEC EDGAR API client (`SECClient`).
  - Resolves CIK via `company_tickers.json`.
  - Fetches CIK submission metadata (`submissions/CIK{cik}.json`) and XBRL company facts (`api/xbrl/companyfacts/CIK{cik}.json`).
  - Declares required SEC User-Agent header (`NTMResearch admin@nolltillmiljoner.se`).
  - Implements throttling (0.15s rate-limit delay, well within 10 req/sec limit) and makes at most three attempts by default for transient network failures and HTTP 408/429/500/502/503/504. Backoff starts at 1 second, then 2 seconds; every attempt still throttles. Retry-After seconds/HTTP-date values are respected up to 60 seconds; longer waits stop the request rather than retry early. Permanent 4xx and malformed JSON are not blindly retried.
- `scripts/stock_normalizer.py`: High-integrity SEC XBRL fundamentals normalizer (`StockNormalizer`).
  - Maps XBRL concepts using deterministic company profiles (`COMPANY_PROFILES`).
  - Discovers generic fiscal calendars and period boundaries dynamically.
  - Separates flow/duration concepts (Income Statement, Cash Flow) and instant concepts (Balance Sheet).
  - Handles broken fiscal years and computes standalone quarters safely (Q2 = 6M - Q1, Q3 = 9M - 6M, Q4 = FY - 9M).
  - EPS and weighted average shares are not naively subtracted. Where compatible, Q4 shares use annual share-days minus nine-month share-days divided by Q4 duration.
  - Calculates TTM metrics only when four consecutive fiscal quarters can be identified and the metric has compatible values.
  - Computes duration-weighted diluted shares across trailing quarters using their actual durations (not always 365 days).
  - Derives `ttmDilutedEps` as `ttmCommonIncome / ttmDilutedShares`.
  - Computes Free Cash Flow (`OCF - CapEx`) and FCF per share only where economically meaningful.
  - Direct facts carry available form, filing date, accession, concept and taxonomy. Derived/TTM values carry derivation metadata and included periods; they do not always retain full fact-level lineage. Research labels derived values separately and exposes available source notes.
  - Graceful null handling: Returns `null` or `unsupported: true` with explanatory reasons rather than guessing or producing corrupt data on stock splits/incompatible structures.
- `scripts/update_stocks.py`: Execution script CLI (`--ticker <TICKER>`, `--all`, `--offline`).
  - Fetches or reads offline fixtures (`tests/fixtures/sec_<ticker>_*.json`).
  - Runs `StockNormalizer`.
  - Validates identity, provenance, periods, TTM and regressions before atomically writing `data/stocks/<TICKER>.json` via `save_atomic_json`. Failed updates preserve existing files.

### Company Profiles
- `financial_services` (e.g. `SOFI`): Revenue mapped to `RevenuesNetOfInterestExpense`, Operating Income unsupported (bank structure), Debt unsupported (customer deposits vs borrowings), FCF unsupported (depository banking cash flows dominated by loan originations and deposit changes).
- `standard_company` (e.g. `NVDA`): Standard GAAP Revenue, Operating Income, FCF (`OCF - CapEx`).
- `software_saas` (e.g. `CRWD`): Standard GAAP Revenue, Operating Income, FCF, handles stock splits and manual EPS fallback when a compatible TTM EPS is unavailable.

---

## Tools and calculators

All calculators live in standalone HTML pages and share `style.css` + `script.js`. `valuation-core.js` loads first and owns shared pure valuation arithmetic. Chart pages load self-hosted Chart.js 4.5.1 (`vendor/chart-4.5.1.umd.min.js`); pages without charts do not load it.

| Tool | Page | Modes (tabs) | Answers |
|---|---|---|---|
| Investeringskalkylator (Ränta på ränta) | `ranta-pa-ranta.html` | **Tillväxt** / **Utdelning** | How savings grow over time with return, fees, inflation; dividend reinvestment variant. Scenario comparison (7/10/20 %). Supports saving scenarios (`investment-scenarios-v1`) |
| FIRE-kalkylator | `fire-kalkylator.html` | **Vägen till FIRE** / **Mitt FIRE-mål** / **Uttag** | When you can reach FIRE, what a chosen FIRE target requires, how long capital lasts during withdrawals |
| Sparmålskalkylator | `sparmalskalkylator.html` | **Månadssparande** / **Tid till mål** / **Målkapital** | Required monthly saving, time to goal, or resulting capital; nominal vs today's-money targets. Supports saving scenarios (`investment-scenarios-v1`) |
| Jämför avgifter | `avgifter.html` | – | End-value difference between two fee levels |
| Hävstångskalkylator | `havstang.html` | **Belåning** / **Daglig hävstång** | Leveraged investing vs unleveraged; daily-reset leverage (X2/X3/X5) day-by-day. "Utan/med hävstång" comparison and "Amortera eller investera?" |
| Återhämtningskalkylator | `aterhamtning.html` | – | Required % gain to recover from a drawdown |
| Bolånekalkylator | `bolanekalkylator.html` | **Bolån** / **Amortering** / **Ränta** | Mortgage size, amortization requirements, rate-sensitivity table. Swedish rules effective 2026-04-01 |
| ISK-skattkalkylator | `isk-skattkalkylator.html` | **Enkel** / **Detaljerad** | ISK schablon tax for 2026, incl. shared 300 000 kr tax-free allowance |
| Aktievärderingskalkylator | `aktievarderingskalkylator.html` | **Enkel** / **Scenarier** (Bear/Base/Bull) / **Omvänd värdering** | P/E, Forward P/E, PEG, implied future price, CAGR, reverse valuation for required EPS growth |
| Avkastningskalkylator | `avkastningskalkylator.html` | **Totalavkastning** / **CAGR** / **Årsavkastning** | Total return, CAGR, per-year returns; optional inflation input for real return calculation |
| Aktieköpskalkylator | `aktiekopskalkylator.html` | **GAV** / **DCA** / **Positionsstorlek** | Average purchase price, multi-purchase average, position size from risk and stop-loss |
| Valutajusterad avkastning | `valutajusterad-avkastning.html` | **Valutakurs** / **Procent** | Currency-adjusted SEK return, currency impact in % and SEK |

### FIRE: important structural detail

Inside **Vägen till FIRE** there is a *secondary* chart-view toggle: **Vägen till FIRE / Efter FIRE**. "Efter FIRE" is a 30-year post-FIRE projection of the same simulation — it is **not** the same thing as the standalone **Uttag** mode. Keep the visual hierarchy: main mode tabs are primary, the chart toggle is smaller.

Switching to **Mitt FIRE-mål** intentionally copies the current inputs from Vägen till FIRE (`syncFireGoalInputsFromPath()`). Preserve this convenience behavior.

---

## Calculator interaction rule (critical)

**NTM calculators do NOT recalculate live while the user types.**

1. User edits inputs.
2. Existing results remain unchanged.
3. User clicks **Beräkna** (form `submit`).
4. Only then do results, charts, warnings and status messages update.

Switching tabs/modes must not trigger calculations unless an existing implementation intentionally does so (currently: none of the mode tabs recalculate; they only switch panels).

Exception to be aware of: most calculators run **once on page load** with their default inputs so the page never shows an empty result area. After that, only Beräkna updates.

Future calculators and valuation tools must follow this convention.

### Readable money inputs

`initGroupedNumberInputs()` in `script.js` opts in 47 money fields across investment,
fees, recovery, leverage (including daily), FIRE, ISK, return, stock-purchase
(portfolio size only), savings-goal, mortgage and currency-return calculators.
`premium.css` displays space-grouped digits while unfocused (`1000000.50` →
`1 000 000.50`); focus reveals the original native number input. The decorative
text is hidden from assistive technology. Values, decimal precision, native
min/max/step validation, calculation parsers and scenario storage stay unchanged.
Formatting emits no input/change/submit events. Scenario restore, FIRE copying,
leverage loan updates and form resets refresh the presentation explicitly.

Rates, years/ages, share counts, per-share prices/EPS, multiples, brokerage and
exchange rates are excluded. Scientific notation stays native; pasted grouped
text is not newly supported. Forced-colors mode uses the native display.
Future programmatic writes to opted-in fields must call
`refreshGroupedNumberInput(input)` after assigning `.value`.
Browser regressions live in `scripts/browser_smoke.py` (`test_grouped_money_*`).

## Calculator math conventions

These conventions exist in the current implementations — preserve them and reuse them for new tools:

- **Effective monthly rates**: `monthlyRate = (1 + annualRate)^(1/12) - 1`, never `annualRate / 12`.
- **Fees**: `annualNetReturn = (1 + r) * (1 - fee) - 1` before deriving the monthly rate.
- **End-of-month contributions**: monthly growth is applied first, then the contribution is added (`portfolio = portfolio * (1 + monthlyRate) + monthlySavings`).
- **Real vs nominal return**: `realReturn = (1 + nominal) / (1 + inflation) - 1` (`calculateRealReturn()`).
- **FIRE distinction**:
  - *Vägen till FIRE* and *Mitt FIRE-mål* simulate in **real** terms (today's purchasing power).
  - *Uttag* simulates **nominal** portfolio values with a fee-adjusted nominal return and models inflation-linked withdrawals separately (monthly inflation compounding, withdrawal capped at remaining portfolio).
- **Simulation horizons**: loops are bounded (`maxMonths = 1200`, i.e. 100 years). Unreachable/depleted states are detected and reported instead of looping forever.
- **Validation**: inputs are parsed defensively (`Number(...) || 0`, `Math.max(0, ...)`, `Number.isFinite` guards, division-by-zero guards). Results must never be `NaN`/`Infinity`; invalid inputs produce a message instead.
- **Deterministic**: no randomness anywhere in calculations; same inputs → same outputs.
- **Year-keyed rule tables** where rules change over time, e.g. `ISK_TAX_RULES = { 2026: { ... } }` in `script.js`.

## Calculator design system

All calculators share one visual system defined in `style.css`. **Reuse these primitives before writing any one-off CSS.** Every calculator should feel like part of the same NTM product.

| Primitive | Classes | Notes |
|---|---|---|
| Page intro | `.page-intro.tool-intro` + `.section-kicker` | Eyebrow pill + H1 + intro text, same on every tool page |
| Calculator card | `.card.calculator-card`, `.section-heading` | 28px radius / 32px padding desktop; 20px / 24px 18px on mobile |
| Mode tabs (primary) | `.mode-toggle` + `.mode-tab` (+`.active`) | Compact inline-flex pill group on desktop; full-width equal tabs under 721px |
| Secondary/nested toggles | `.chart-toggle` + `.chart-view-tab` (+`.is-active`) | Visibly smaller than mode tabs; used e.g. for FIRE chart views |
| Segment radios | `.segment-control` + `.segment-option` | Radio-as-pill control (used in Hävstång for lånebelopp/belåningsgrad) |
| Forms | `.calculator-form` > `.form-grid` > `.field-group` | 2-column grid desktop, 1 column under 721px |
| Aligned fields | `.form-grid--aligned` | Desktop-only reserved label/input/helper rows (49px inputs, 18px helper line) |
| Helper text | `small.field-help` | Muted, 0.75rem |
| Inputs/selects | shared `input, select` rules | 14px radius, accent focus ring; do not override per page |
| Buttons | base `button` (primary gradient), `.secondary-btn`, `.ghost-btn` | Do not invent new button styles |
| Results | `.results` > `.result-box` (+`.highlight`, +`.result-box--wide`) | `.highlight` marks the primary result; `.result-box--wide` spans both columns |
| Chart cards | `.chart-panel` > `.chart-header` (+`.chart-header-row`) > `.chart-wrap` | 330px chart height desktop, 260px small/mobile (`.small-chart-wrap`) |
| Messages | `.calculator-message` (+`.is-error`) | Aliases consolidated into shared rules; warning variants keep left border |
| Intro copy in card | `.calculator-intro` | Short muted paragraph under the section heading |
| Advanced settings | `details.advanced-settings` | Collapsible secondary inputs |
| Footnotes | `p.note` | Small muted disclaimer text |

Do not use inline styles for layout on calculator pages — extend the shared classes instead.

---

## Saved Scenarios (Calculators)

Calculators with scenario persistence allow users to save input sets locally:
- **LocalStorage Key:** `investment-scenarios-v1`.
- **Supported Tools:** Investeringskalkylator (`ranta-pa-ranta.html`) and Sparmålskalkylator (`sparmalskalkylator.html`).
- **Functionality:** Users can save named scenarios, select and load saved scenarios, or delete them.
- **Interaction Rule:** Loading a saved scenario populates input fields but does **not** trigger an automatic recalculation. The user must click **Beräkna** to update results. Modifying loaded inputs marks existing results as stale.
- **Storage Scope:** 100% browser-local on the user's device. No account or server backend.
- **Failure safety:** Unreadable JSON, unsupported versions or malformed scenario collections block save/delete without replacing the original. Quota/access failures are shown in the scenario status. Unknown fields in valid records are preserved. `NTMScenarioStorage.remove()` returns `{ ok, error? }`, like save, so callers must inspect `ok`.
- **Recovery:** On the affected site's origin, `NTMScenarioStorage.read().raw` exposes the unmodified stored text. Copy it from browser developer tools into a backup file before attempting manual recovery; there is no automatic discard/repair. Browser storage still has no transactional multi-tab guarantee.

---

## Min NTM (`min-ntm.html`)

### Thesis assumptions and second review

Each revision may now contain `assumptions` (0–3 user-authored strings), `reviewDate` (optional valid `YYYY-MM-DD` local calendar date), and `review` (`decision: keep|revise|close`, `at`, `sourceRevisionId`, `context`, optional `observedPeriod` and `changeKey`). These are backwards-compatible optional additions to the existing V2 revision envelope. Legacy reads project no assumptions/no review without rewriting raw storage or inventing historical content. Validation rejects malformed additions; duplicate-save fingerprints include the new fields.

`research-review.js` places the saved belief, assumptions and explicit review controls ahead of detailed valuation. “Behåll” and “Stäng tes” append a decision revision with the same frozen snapshot; they do not silently recalculate or overwrite earlier revisions. “Revidera” starts an unsaved editor workflow and records its decision/context only through **Spara ny version**. Closing preserves history and checkpoints; revising can reopen a closed thesis. A review may set the next optional date; leaving it empty clears the prior reminder. There are no push alerts or investment recommendations.

`min-review.js` prioritizes **Att granska**, then active theses, saved calculator plans and recent tools. Review dates use the local calendar day. It reads the existing NVDA/SOFI/CRWD static data and Change Detection report; a saved review acknowledges the exact report through `changeKey`, so unchanged findings are not repeatedly presented as new work. New differences can appear again. Missing/corrupt storage or unavailable company data is reported as incomplete checking, never falsely “nothing to review”. Closed theses remain in a separate history disclosure. No additional stock coverage or separate reminder store is introduced.

Historical inspection/Markdown/print use the selected revision's own assumptions, review date and review context. JSON backup and archived checkpoints preserve these fields through the existing record model. “Använd dessa antaganden med aktuell Research-data” copies only historical valuation inputs into the current working calculation; it does not restore historical fundamentals or change thesis text. The status explains this mixed-time workflow and keeps historical/manual price provenance visible.

The browser suite additionally covers homepage paths, mobile navigation/current-page links, creating three assumptions and a date, the due review queue, keep/revise/close, frozen historical inspection and restored valuation wording. The native review date has no predictive meaning, and review-in-progress edits are not persisted until a new revision is saved.

### Research decision lifecycle (B21, B68, B69, B72, B73, B80)

Research now supports optional per-assumption falsification/review metadata and up
to three report questions with open/answered states. `Avstod` appends an inactive
decision; `Återöppna och revidera` starts an explicit new revision. Assumption dates
request reconsideration, never automatically classify an assumption as false.
Outcome displays assumptions, process and manual price outcomes separately,
without an overall score. Reviews can include a separate process note.

The Research entry disclosure also creates manual journals for unsupported tickers
or company labels. They share revision history, reviews, export, local backup and
Min NTM, but have no automated fundamentals, valuation snapshot, Change Detection,
or automated Outcome observations. Existing NVDA/SOFI/CRWD coverage is unchanged.
All data stays local. [Lifecycle schema, behavior and validation](docs/research-decision-lifecycle.md)
documents the additive V2 fields and future identity boundaries.

### JSON backup and deliberate deletion

The **Backup och lokal Research-data** section uses `local-data.js`. “Exportera all lokal data” downloads a readable envelope `{ application: "NTM", schemaVersion: 1, exportedAt, data: { theses, outcomes, scenarios, theme } }`. It includes complete records, immutable revisions and snapshots, archived checkpoint source revisions, calculator inputs and theme. Known V1 thesis records migrate in memory through the existing storage adapter with deterministic legacy IDs and original dates/content; export does not write storage. Missing financial values remain null. Recent-tool navigation, session greetings and public SEC/macro data are excluded as transient/recreatable state. Markdown is not a backup. Keep JSON backups private.

Import validates the entire envelope and all stores before writing. Only **merge** is supported: existing records remain; unseen IDs append in source order, so an imported revision can become latest even if its timestamp is older. Identical IDs/content are no-ops; conflicting IDs or unknown-field values abort the entire import. Existing theme wins. Unsupported/corrupt backups or current stores block import; no automatic discard/repair occurs. Import is limited to 20 MB in the UI. Writes are checked against the captured store, read back and rolled back on failure where possible. LocalStorage is not a multi-key transaction: a browser crash, concurrent tab, or failure of rollback itself can still leave partial changes; keep the source backup and heed the explicit partial-write error. Close other NTM tabs during import/deletion.

Deleting a revision or all thesis history in Research **retains checkpoints and their archive copies**; confirmation text explains this. Min NTM offers checkpoint-only deletion and confirmed full Research deletion for an explicitly entered ticker. Full deletion removes every thesis revision/snapshot and checkpoint/archive copy for that ticker, verifies the stored result, and preserves other tickers and calculator scenarios. Corrupt stores block deletion. This does not erase downloaded JSON/Markdown/PDF files or copies on another device.

### Real browser QA

`scripts/browser_smoke.py` uses Playwright with a loopback server on an ephemeral port and a fresh non-persistent browser context per test. It never attaches to a personal browser profile. It exercises real HTML, Chart.js, event handlers and storage: leverage result state, zero-net compound charts, scenario corruption, Research price provenance/revisions/restoration/Markdown/outcomes, JSON download/import round trip and full ticker deletion. Page JavaScript errors fail the tests. Chart.js is self-hosted. Existing external page widgets/beacons may still make network requests; no chart CDN is required.

```bash
pip install -r requirements-browser.txt
python -m playwright install chromium
python -B scripts/browser_smoke.py
```

To use an installed Chrome/Edge, set `NTM_BROWSER_CHANNEL=chrome` or `msedge` and omit browser installation. The separate `browser-smoke.yml` workflow runs on pull requests or manual dispatch. Missing dependencies/browser binaries fail visibly; the ordinary Python unit suite does not silently count browser checks as passed. Local backup/deletion regression tests are included in the normal Python suite via `tests/test_local_data.py`.

`min-ntm.html` is the user's personal, device-local overview dashboard.

### Content Sections
1. **Mina analyser (Research Theses):**
   - Lists saved stock research theses from `investment-research-theses-v1`.
   - Displays the latest revision per ticker: company name, base-case target price & CAGR (or required EPS CAGR), save date, revision count, and a link to `research.html?ticker=<TICKER>`.
   - Displays status badges (e.g. `⚠️ Gammal` for snapshots older than 12 months) powered by `NTMChangeDetection.isSnapshotStale()`.
2. **Sparade scenarier:**
   - Lists saved calculator scenarios from `investment-scenarios-v1`.
3. **Senast använda verktyg:**
   - Tracks up to 5 recently visited calculator tools from `investment-recent-tools-v1`.

Private Research/scenario data stays in browser storage; there are no user accounts, passwords or cloud sync. Some public HTML pages embed Cloudflare Web Analytics (`static.cloudflareinsights.com/beacon.min.js`); analytics coverage is not uniform. Third-party Chart.js, TradingView and video requests are separate from local Research storage. This is not a claim that the site makes no external requests.

---

## Verktyg page (tool discovery)

`verktyg.html` implements a tool directory (`initToolsDirectory()` in `script.js`):

- **Search** (`#tool-search`): matches card text plus a `data-search` keyword attribute per card; normalized with `toLocaleLowerCase('sv-SE')` and diacritic stripping, so `havstang` matches "hävstång".
- **Category filters**: Alla + five categories — `investera-spara` (Investera & spara), `risk-havstang` (Risk & hävstång), `lan-privatekonomi` (Lån & privatekonomi), `skatt` (Skatt), `aktier-analys` (Aktier & analys).
- **Empty categories are hidden**; an empty-state message shows when nothing matches.
- **Collapse/expand**: on desktop all categories are expanded; on mobile (≤720px) only the first visible category starts expanded. Searching or filtering auto-expands matching categories; manual collapse is disabled while a search/filter is active.
- Each tool card declares `data-category`, `data-status`, `data-search` and optional `.tool-labels` pills for its modes.

---

## Homepage / NTM Idag

The first section explains the product and offers “Räkna på ditt sparande” (existing compound calculator), “Granska en investering” (Research), and a return link to Min NTM. Market status, macro/report previews and content remain below; no personalized claims are shown without local data.

`index.html` contains the **NTM Idag** dashboard (`initNtmToday()` in `script.js`, refreshed every 60 s). It is schedule- and data-file-based — **there is no realtime market data feed**.

- **Greeting**: time-segment-based message pools (morning/day/evening/night/weekend) in `NTM_TODAY_MESSAGE_POOLS`; stable per browser session via `sessionStorage`.
- **Market status cards** (Stockholm 🇸🇪 / USA 🇺🇸): driven by `window.NTM_MARKET_CALENDAR` in `data/market-calendar.js` — per-exchange timezone, regular open/close, half-day close, and per-year `closed`/`halfDays` date lists. `getMarketStatus()` produces open/closed state plus countdowns.
- **Market overview**: TradingView single-ticker widget rendered into `#ntmTradingViewWidget`, plus a collapsible "Viktig marknadsdata" list of external TradingView links.
- **Makro idag / Rapporter idag panels**: read from `window.NTM_WEEKLY_EVENTS` in `data/weekly-events.js`.
- **Shared weekly selection**: `NTMWeekly` in `script.js` owns Stockholm date/ISO-week resolution for homepage macro, earnings, and `week-pages.js`. Missing current-week records never fall back to another week. Macro keeps timezone conversion before matching today's Swedish date, includes lower-priority events, shows three initially and expands the rest in place. Partial updates are labelled separately from missing weeks and empty days.
- **Homepage earnings contract**: `index.html` loads `data/weekly-events.js` before `script.js`. `renderWeeklyEvents()` selects `earningsWeeks` by today's Stockholm calendar date and ISO week, then filters reports by exact date. Priority only sorts; it never hides companies. Three reports appear initially; native “Visa X rapporter till” disclosure expands the rest in place and stays open through same-day refreshes. Missing week data is labelled unavailable, separately from a loaded week with zero reports that day.
- **Weekly earnings publishing**: updating an image in `week-pages.js` does **not** update homepage records. Add that week's complete image transcription to `earningsWeeks` in `data/weekly-events.js` in the same change. `scripts/update_macro.py` preserves this block; it does not fetch earnings or read images. The newest image/week dataset and daily ticker coverage are checked by the earnings regression test. The calendar is a published selection, not a comprehensive live earnings feed.
- **Preview helper**: `?ntmDate=YYYY-MM-DD` in the URL overrides "now" for testing.
- **Latest posts**: the 3 newest posts from `posts.js` rendered into `#latestPosts`.

---

## Posts system (Inlägg)

Central, data-driven architecture — **new posts are added to `posts.js`, never as standalone HTML pages.**

- `posts.js` exports `NTM_POSTS`: an array of post objects with `title`, `date`, `slug`, `category`, `tags`, `excerpt`, `previewPosition`, `media`, `content` (HTML string), and optional `instagramUrl` and `summary` (`{ sv, en }` for AI video summaries).
- **Media types**: `carousel` (`images: [{ src, alt }]`, with prev/next + dots + lightbox) and `youtube` (`videoId`, click-to-play facade).
- **URLs**: canonical `post-<slug>.html` pages are generated from the shared post system. Legacy `post.html?post=<slug>` URLs redirect to them.
- **Archive** (`inlagg.html`): search, category filter buttons, `?tag=` URL filter support, pagination (9 posts/page).
- **Homepage**: latest 3 posts.
- **Image convention**: `images/posts/<post-folder>/01.png`, `02.png`, …

`youtube-transcriber/` is a **local Python dev tool** (yt-dlp + Whisper) used to produce transcripts for video post summaries. It is not part of the website runtime.

---

## Makro and Rapporter

- `makro.html` renders native structured macroeconomic events from `data/weekly-events.js` (`macroWeeks`), grouped by Swedish calendar day (`Europe/Stockholm`) with time, country, actual/forecast/previous and optional details/sources. Older weeks with only images fall back to the image visual and lightbox.
- `rapporter.html` is driven by `week-pages.js` with weekly images from `images/rapporter/` and lightbox.

### Automated Macro Data & Deployment
Macroeconomic data is updated via `scripts/update_macro.py` and GitHub Actions (`.github/workflows/deploy.yml`):
- **Live Automated Source:** U.S. Bureau of Labor Statistics (BLS) Public API.
  - Queries exact series (e.g. `CES0000000001` for Nonfarm Payrolls, `LNS14000000` for Unemployment Rate, `CUSR0000SA0` / `CUUR0000SA0` for CPI, `WPSFD4` for PPI, `PRS85006092` for Productivity, `JTS000000000000000JOL` for JOLTS).
  - Matches strictly by Year + Period (e.g. `2026 M08`, `2026 Q02`).
  - Auto-populates upcoming weeks and events from the official BLS release schedule.
- **Additional official providers:** DOL weekly claims, Census wholesale/construction/factory data, Federal Reserve series via FRED CSV (`TOTALSL`, `INDPRO`, `TCU`), BEA NIPA tables (`T10101`, `T20100`, `T40100`) when `BEA_API_KEY` is configured, and Treasury FiscalData MTS for monthly deficit/surplus.
- **Provider safety:** Provider rules match exact event period, series/table, units and seasonal adjustment. Missing periods or provider/network failures preserve existing values.
- **GitHub Pages Deployment:** Uses official `actions/deploy-pages@v4` workflow.

---

## Resurser & Community

- `resurser.html`: Static curated list with **YouTube**, **Podcasts** and **Böcker**.
- `community.html`: Discord invite section. There are no accounts, portfolio sharing, or leaderboards.

---

## Shared site systems (`script.js`, `thesis-storage.js`, `change-detection.js`)

`script.js` is loaded by content/calculator pages and contains element-guarded initializers and global adapters. It is still a large classic script, not a collection of isolated modules:

- `initTheme()` — theme from `localStorage` key `investment-theme`; toggles `body.light-theme`.
- `initNtmToday()` — homepage dashboard.
- `injectInstagramPromo()` — inserts shared Instagram footer section.
- `initPostSystem()` / `initYoutubePosts()` — posts archive/view, carousels, lightbox, YouTube facades.
- `initToolsDirectory()` — verktyg search/filter/collapse.
- `initMinNtmPage()` — local-only Min NTM overview (reads `investment-research-theses-v1`, `investment-scenarios-v1`, and `investment-recent-tools-v1`).
- `recordRecentToolVisit()` — records visits to tool pages under `investment-recent-tools-v1`.
- `thesis-storage.js` — Module `NTMThesisStorage` managing V2 append-only revisions under `investment-research-theses-v1`, with safe V1 migration, duplicate-save detection, latest projections, and explicit single/all deletion. Handles corrupt JSON, missing localStorage, and quota exceeded errors gracefully.
- `research-snapshot.js` — Shared snapshot normalization and current-stock metric extraction for capture, storage, and comparison. Load before `thesis-storage.js` and `change-detection.js` on Research and Min NTM.
- `change-detection.js` — Standalone module `NTMChangeDetection` comparing thesis valuation snapshots against current stock JSON metrics, margins (in percentage points `pp`), period changes, and new 10-K/10-Q filings.

---

## File map

```
/
├── index.html                  # Homepage: NTM Idag dashboard + latest posts
├── verktyg.html                # Tool directory (search + category filters)
├── research.html               # Stock research explorer & valuation workspace
├── min-ntm.html                # Local personal overview (theses + scenarios + recent tools)
├── inlagg.html                 # Post archive (search, filters, pagination)
├── post.html                   # Shared post shell (?post=<slug>)
├── makro.html                  # Weekly macro calendar & archive
├── rapporter.html              # Weekly earnings calendar image archive
├── resurser.html               # Curated resources
├── community.html              # Discord invite
├── ranta-pa-ranta.html         # Investeringskalkylator (Tillväxt/Utdelning)
├── fire-kalkylator.html        # FIRE (Vägen till FIRE / Mitt FIRE-mål / Uttag)
├── sparmalskalkylator.html     # Sparmål (Månadssparande / Tid till mål / Målkapital)
├── avgifter.html               # Jämför avgifter
├── havstang.html               # Hävstång (Belåning / Daglig hävstång)
├── aterhamtning.html           # Återhämtning
├── bolanekalkylator.html       # Bolån / Amortering / Ränta
├── isk-skattkalkylator.html    # ISK-skatt (Enkel / Detaljerad)
├── aktievarderingskalkylator.html  # Aktievärdering (Enkel / Scenarier / Omvänd)
├── avkastningskalkylator.html  # Avkastning (Total / CAGR / Årsavkastning)
├── aktiekopskalkylator.html    # Aktieköp (GAV / DCA / Positionsstorlek)
├── valutajusterad-avkastning.html # Valutajusterad avkastning (Valutakurs / Procent)
├── style.css                   # Single shared stylesheet (design tokens + all components)
├── script.js                   # Single shared JS (theme, nav, NTM Idag, posts, calculators, Min NTM)
├── research.js                 # Research app (rendering, valuation, thesis form & UI)
├── thesis-storage.js           # NTMThesisStorage module for localStorage theses
├── change-detection.js         # NTMChangeDetection module for comparing snapshots
├── posts.js                    # NTM_POSTS — central post data
├── week-pages.js               # Makro/Rapporter weekly image system
├── data/
│   ├── market-calendar.js      # window.NTM_MARKET_CALENDAR — exchange hours/holidays
│   ├── weekly-events.js        # window.NTM_WEEKLY_EVENTS — macro + earnings per week
│   └── stocks/                 # Pre-normalized stock JSON files
│       ├── SOFI.json           # SoFi Technologies normalized fundamentals & filings
│       ├── NVDA.json           # NVIDIA Corp normalized fundamentals & filings
│       └── CRWD.json           # CrowdStrike normalized fundamentals & filings
├── scripts/
│   ├── sec_client.py           # Official SEC EDGAR API client
│   ├── stock_normalizer.py     # SEC XBRL fundamentals & filings normalizer
│   ├── update_stocks.py        # CLI script to update data/stocks/*.json
│   ├── update_macro.py         # Automated macro data pipeline script
│   └── stage_site.py           # Site staging & required file validator
├── tests/
│   ├── test_stock_pipeline.py  # Tests for SEC client & stock normalizer
│   ├── test_macro.py           # Tests for macro data & BLS schedule matching
│   ├── test_thesis_v1.py       # Tests for thesis storage & research UI integration
│   ├── test_change_detection_v1.py # Tests for change detection logic & filings
│   └── fixtures/               # Offline SEC & BLS response fixtures
├── youtube-transcriber/        # Local Python dev tool (not part of the site)
├── CNAME                       # nolltillmiljoner.se
└── README.md
```

---

## Testing & Staging

Run all python unit tests using Python's `unittest` module:
```bash
python -m unittest discover -s tests -p "test_*.py"
```

The full suite also executes the real Research JavaScript with Node.js 18+ (no npm dependencies). Put `node` on PATH, or set `NODE_BINARY` to its executable path. A missing runtime fails the test instead of skipping it. Run the JavaScript cases directly with `node --test tests/research-workflow.test.cjs`. The harness loads the page's local scripts in order and uses a minimal DOM/localStorage boundary; it tests application behavior, not browser layout.

### Assumption Restoration V1

In the saved revision inspector, **Använd dessa antaganden** copies compatible inputs into the current valuation editor and focuses it. The selected revision remains the Change Detection baseline. Restoration never writes storage, edits Thesis text, copies calculated outputs or replaces company fundamentals. Calculate explicitly before saving a new revision; duplicate-save protection still applies.

Restorable inputs are stock price, required return, integer horizon (1–50 years), exit P/E, and Bear/Base/Bull EPS growth and exit P/E. Explicit manual EPS restores its saved value and manual source. A SEC-based revision instead uses the current company's positive SEC EPS under the existing valuation rules. If that EPS is unavailable, the current EPS input/source stays unchanged. Unknown EPS sources, missing fields and incompatible numeric ranges are skipped with an explanation; no compatible assumptions means a disabled action. The editor notice identifies the source revision and labels the copied price as historically saved, not a live quote.

Confirmation is required only when copying would overwrite inputs that differ from the last successful calculation. Numerically equivalent formatting, already-matching inputs and edits to fields omitted by a partial restore do not prompt. The copy is independent of the historical revision; later editor changes do not modify it.

### Export V1

**Exportera sparad analys** offers a client-side Markdown download and a dedicated print view for the version selected in **Sparade versioner** (latest by default). Select the latest entry to export the latest saved analysis, or an older entry for historical export. Without a readable saved revision, both actions are disabled. Unsaved editor changes are excluded, including restored assumptions that have not been explicitly calculated and saved. Export never saves or changes the selected Change Detection baseline.

`research-export.js` builds a shared document from the saved revision and canonical snapshot only. Markdown contains metadata, thesis/risks/triggers/notes, historical financial metrics and period metadata, valuation inputs/results, Bear/Base/Bull scenarios and data caveats. It uses Swedish number formatting and UTC timestamps. The filename is `NTM-<sanitized ticker>-Research-<UTC export date>.md`; temporary download URLs are revoked after the browser starts the download. User text is escaped in Markdown and inserted as text in print output.

The print view preserves the same document content, uses a white A4 layout in either theme, hides the site navigation and print controls when printing, repeats table headers and discourages orphaned headings and split rows. Use **Skriv ut / Spara som PDF**, then the browser's PDF destination. Browser-generated headers/footers are controlled by the browser's print settings. **Tillbaka till Research** returns to the unchanged editor and historical selection.

No current comparison data, live quotes, recalculation, backend or PDF library is included. Explicit manual EPS is labeled separately from historical SEC EPS. Missing/unsupported snapshot values show **Ej tillgängligt**. P/FCF and detailed SEC fact provenance are not stored in the current snapshot contract and are not reconstructed for export. Legacy revisions remain exportable even with incomplete snapshots. Browser pagination still requires visual verification on the target browser.

### Outcome Tracking / Backtest Foundation V1

**Utfall sedan analysen** uses the selected Research revision (latest by default) as the historical source. It compares its saved snapshot with current normalized company data without changing either, the valuation editor or Change Detection. Optional manual observed price belongs only to Outcome Tracking. **Uppdatera utfall** explicitly recalculates after price edits; **Spara utfallsobservation** deliberately saves the displayed observation. Opening Research, selecting history and calculating valuation do not save checkpoints.

`research-outcomes.js` owns pure comparisons and separate local storage; `research-outcome-ui.js` renders the Research section. The storage key is `ntm-research-outcomes-v1`, with `{schemaVersion: 1, checkpoints: [...]}`. Each checkpoint contains `schemaVersion`, stable `id`, `ticker`, `sourceRevisionId`, an archival `sourceRevision` copy, `observedAt`, canonical `currentSnapshot` (including reporting period and normalized fundamentals), and nullable `manualPrice: {value, currency, source: 'manual'}`. Elapsed time and comparisons are recalculated from these inputs, rather than stored as redundant results. `observedAt` is when the displayed observation was calculated. The schema preserves the inputs for future horizon evaluation, multiple observations and later price-source extensions; V1 has no accuracy score.

- All eight metrics (revenue, net income, EPS, diluted shares, FCF, FCF/share, net margin and FCF margin) show historical/current values and available changes. Relative change uses the absolute historical denominator; zero bases have no percentage change. Margins use percentage points. CAGR requires positive endpoints and at least 365 days between actual reporting-period end dates; missing dates, incompatible bases and overflowing results remain unavailable. Gaps in reporting periods are not treated as sequential quarters. Numeric changes require compatible provenance, periods, definitions and currency; per-share/share-count comparisons additionally require a verified share basis. SOFI FCF and missing CRWD share/EPS bases retain their normalized limitations.
- Horizon progress uses elapsed calendar time since the revision's saved date, with years approximated as 365.25 days. Future/missing source dates or missing horizons yield unavailable progress. Remaining time floors at zero; elapsed percentage may exceed 100%. Completion only marks eligibility for a future final assessment, never success/failure.
- Each approximate EPS path is `saved EPS basis × (1 + saved annual growth / 100)^min(elapsed years, horizon)`, using a positive basis and growth above −100%. These are annual model paths, not quarterly predictions. Latest reported SEC EPS can lag the observation date. Manual starting EPS is explicitly distinguished: its path is displayed, but percentage deviation against SEC EPS is suppressed because the bases may differ. No revenue forecast is invented.
- When the shared comparability gate verifies currency and share basis, manual observed price can show price-only return from the saved starting price and distance from old end-of-horizon targets, excluding dividends, FX, taxes and costs. Interval labels require positive, strictly ordered Bear < Base < Bull targets in the same currency; exact boundaries are labeled explicitly. Missing, equal or unordered targets do not produce an interval classification.
- Repeated identical observations on the same UTC day are no-ops; a changed observation or later day can create another checkpoint. IDs and frozen read results remain stable. Corrupt/unsupported storage or malformed records block writes without overwriting existing bytes; storage access/quota errors are reported. As with revision storage, simultaneous writes from multiple tabs are not transactional.
- **Deletion policy:** deleting one or all Research revisions retains linked checkpoints as archival records, including their source revision copies. The per-ticker observation history remains accessible even when no Research revision remains. Viewing an archive never substitutes current data. Checkpoint deletion and full ticker deletion are available in Min NTM. Cloud sync, automatic prices, portfolio/strategy backtesting, final scoring and a Min NTM outcome dashboard remain outside V1. Export V1 continues exporting saved Research revisions only.

Run the outcome regression subset with `node --test --test-name-pattern="^outcome:" tests/research-workflow.test.cjs`. These cases also run in the full Research workflow suite. Browser layout/visual QA requires an available browser.

### Research V1 quality status

The final code-quality pass covers NVDA, SOFI and CRWD through real-JavaScript load/render, valuation, history, restoration, exports and outcome checkpoints, with a mocked DOM/network boundary. Landing metrics now come from the same normalized JSON files as the detail view. Missing Chart.js no longer blocks the rest of Research. Valuation rejects fractional/out-of-range horizons, non-finite inputs and overflowing results; failed calculations remain stale and cannot be saved as valid snapshots. The sensitivity-grid center uses the actual Base assumptions even for low multiples and negative growth.

The header separates reporting period, filing date and successful fetch time; local fixture data has no fabricated live fetch timestamp. Debt cards describe the mapped component rather than claiming comprehensive total debt. The manual EPS fallback of 1.00 is explicitly a calculator example. Provenance cells support keyboard activation, and missing historical dates are not shown as 1970.

**Release verification:** real isolated Chrome smoke tests cover desktop/mobile navigation, theme controls, calculators and Research workflows, including uncaught JavaScript errors. Automated coverage does not replace visual review of every layout or the native Save as PDF dialog; that manual review remains outstanding. Browser-local revision/checkpoint storage has no cloud sync or transactional multi-tab writes. Existing SEC mapping/share-basis limitations remain; Outcome Tracking is preliminary comparison, not a strategy backtest or final assessment.

### Test Suites
- `tests/test_stock_pipeline.py`: Validates `SECClient`, `StockNormalizer`, company profile mappings, generic fiscal calendar discovery, TTM derivations, non-additive metric guards, and atomic JSON output.
- `tests/test_macro.py`: Validates macro event structures, BLS schedule period matching, and event rendering.
- `tests/test_thesis_v1.py`: Validates `NTMThesisStorage` CRUD operations, thesis schema validation, valuation snapshots, stale valuation protection, manual EPS tracking, and research UI integration.
- `tests/test_change_detection_v1.py`: Validates `NTMChangeDetection` metric diffs, percentage point (`pp`) margin changes, 10-K/10-Q filing detection, period change detection, backward compatibility, and Min NTM badge integration.
- `tests/test_research_workflow.py` / `tests/research-workflow.test.cjs`: Executes real capture, form submit, storage, reload/normalization, comparison, and save/delete refresh functions. Covers snapshot/storage migration, immutable revisions, duplicate suppression, historical selection without editing changes, deletion/promotion, missing/corrupt records, thresholds, zero/null values, SOFI/CRWD limitations, and Min NTM rendering.

### Staging Validation
Validate site completeness before deployment:
```bash
python scripts/stage_site.py <target_directory>
```
The staging command verifies mandatory artifacts and copies the site. Local reference validation is a separate call to `find_missing_local_references(staged_directory)` in `scripts/stage_site.py`; it checks HTML/CSS/JS references. The quality pass runs both checks on a fresh temporary staging directory.

---

## Technical SEO and search-engine onboarding

The canonical production origin is `https://nolltillmiljoner.se/` (`CNAME`). Public pages have static Swedish titles/descriptions, canonical URLs, robots directives, Open Graph/Twitter metadata and the existing brand favicon. `robots.txt` allows crawling and references `sitemap.xml`; the sitemap contains canonical public HTML URLs only, without query variants or invented modification dates. Min NTM is browser-local and marked `noindex`; legacy redirect pages and the bare article router are also excluded. Research ticker variants consolidate to the Research landing canonical. The dividend calculator remains a mode of `ranta-pa-ranta.html`.

Run `node scripts/build_seo.cjs` after changing article content, its renderer/template, page metadata or the public page inventory. It generates existing posts, including videos, as `post-<slug>.html` using **the same** `posts.js` content and `script.js` renderer with `post.html` as the template; do not edit these generated article files directly. It also seeds crawlable archive links and updates metadata, sitemap and robots. Add metadata overrides for new pages in the generator; remove obsolete generated article files when deleting posts. `node scripts/build_seo.cjs --check` checks for drift and is included in the Python test suite (set `NODE_BINARY` if Node is not on PATH). Staging requires both crawl files and copies all root HTML pages.

Existing article links now use the static canonical URLs. Valid legacy `post.html?post=...` links redirect client-side to the corresponding article. Homepage WebSite and article Article JSON-LD use existing factual content; existing calculator application/FAQ markup is retained. Dynamic Research data and calendars still depend on JavaScript; this foundation does not prerender every data view or guarantee indexing/rich results.

After deploying, the owner must complete these external steps (not performed by this repository task):

1. Check the live HTTPS apex domain, HTTP/www redirects, `robots.txt`, `sitemap.xml` and representative calculator/article URLs.
2. Add `nolltillmiljoner.se` as a Domain property in Google Search Console and verify ownership using its DNS TXT record.
3. Submit `https://nolltillmiljoner.se/sitemap.xml` in Sitemaps.
4. Use URL Inspection/live testing to check accessibility, rendered content and Google's selected canonical; request indexing for important new pages as appropriate.
5. Monitor sitemap processing, Page indexing and Performance (impressions, queries and pages). Choose later content/keyword work from that evidence.

See [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Submission is a discovery hint, not an indexing guarantee. Analytics, keyword campaigns, new SEO articles and additional landing pages are outside this foundation.

## Development rules — don't break these

1. Read README.md and inspect the existing implementation before changing a feature.
2. Reuse existing architecture, components and styles before creating new ones.
3. Simple by default. Powerful when you want it.
4. Utility first. Creator second.
5. Calculator and valuation results update only after explicit submit (**Beräkna**) — never live while typing.
6. Do not change calculator or valuation math while doing purely visual/UI work.
7. Preserve dark **and** light mode.
8. Mobile is a first-class requirement.
9. Avoid one-off CSS when a shared calculator/UI pattern already exists.
10. Main mode tabs and nested/secondary toggles must have a clear visual hierarchy.
11. Do not create standalone content pages when the central post/content architecture (`posts.js` + `post.html`) should be used.
12. Do not silently invent financial data, calculations or assumptions.
13. Keep calculations deterministic; handle invalid/edge inputs gracefully (no `NaN`/`Infinity` in the UI).
14. **SEC / Frontend separation:** Frontend reads static pre-normalized JSON files from `data/stocks/`; it must never call SEC EDGAR APIs directly at runtime.
15. **Null / unsupported rather than guessing:** Never fabricate or guess missing financial data. Return `null` or `unsupported: true` with explanatory reasons.
16. **Derived metrics carry provenance:** Derived numbers (e.g. FCF, TTM EPS) must retain source facts, concepts, and derivation methods.
17. **Respect profile-specific financial semantics:** Always respect industry/profile accounting differences (`financial_services`, `software_saas`, `standard_company`).
18. **Thesis snapshots are historical:** Thesis snapshots capture historical valuation state at save time and must never be mutated or conflated with current live Research data.
19. **External price/consensus API data cannot be assumed to exist:** All stock prices in valuation tools are user-provided/manual defaults.
20. Avoid unrelated refactors during focused tasks.
21. Do not turn README.md into a changelog.

---

## Module ownership and operational validation

- `valuation-core.js` (`NTMValuation`, also CommonJS for Node tests) owns P/E and P/FCF multiples, compounded future values, CAGR, forward scenarios and reverse valuation. Outcome model paths and eligible CAGR calculations also use this core. Inputs use percentage points; output returns use ratios. Invalid/unavailable or overflowing results are `null`, never non-finite. Negative earnings remain available as earnings, but do not produce meaningful P/E targets. Page adapters preserve existing Swedish UI validation, manual/SEC selection, ranges and submit-only workflows. Research sensitivity and saved scenario outputs use the same core.
- `script.js` retains standalone UI adapters and unrelated calculator math; `research.js` owns Research rendering/initialization. Existing separate storage modules retain their own versioned contracts; this pack does not force them into a generic storage abstraction.
- The Pages workflow uses five jobs: read-only validation, read-only data preparation, contents-write commit, read-only build of the exact commit, and Pages/id-token-only deployment. Data preparation runs macro updates on the existing triggers and stock refresh on schedules/manual dispatch. Schedules remain weekdays at 12:35, 14:35 and 16:35 UTC; local clock time changes with daylight saving. Failed required jobs prevent publication. Validation/build check SEO, staging and public local references. Remote Actions execution needs verification after publication.
- `scripts/check_calendar_coverage.cjs` warns within 120 days of year-end when next-year exchange holidays or macro releases are absent, and fails when the current exchange year is absent. It does not invent dates or certify every release as complete. Current exchange holiday data covers 2026 only. Market status already returns unknown for unsupported years; empty macro weeks now explicitly state that coverage may be incomplete. Earnings images and dated tax rules remain manually maintained; the ISK tool explicitly targets 2026. Macro compatibility aliases use the update's current ISO week instead of a fixed 2026 week.
- Independent oracles/property checks live in `tests/valuation-core.test.cjs`, `tests/calculator-reliability.test.cjs` and `tests/test_architecture.py`: hand-calculated valuation/TTM, inverse and monotonic properties, a monthly recurrence independent of compound's closed formula, FX identities, FCF/margins, retry bounds and permission/module boundaries. Run all Node tests with `node --test tests/*.test.cjs`; the Python suite includes their wrappers. Playwright remains a separate required browser run.

## Financial data contracts and publication safety

`scripts/stock_contract.py` defines `ntm-stock-v1` and method `ntm-sec-normalizer/1`. Newly normalized metrics retain existing SEC concept/accession/filing fields and add definition, unit/currency, period boundaries/type, method, quality and `kind` (`reported`, `derived`, `unavailable`). Derived TTM carries quarter inputs and source filing references; FCF explicitly uses OCF minus CapEx. Document metadata separates `generatedAt`, successful live `fetchedAt`, `updateStatus` and `qualityStatus`. Offline fixture normalization never claims a successful live fetch. The checked-in V1 files were regenerated from local SEC fixtures with unchanged financial values.

Snapshot schema 2 remains readable and gains an optional, independently versioned `provenance.version: 1` block copied only at capture time. Old snapshots receive no modern provenance backfill. `NTMResearchSnapshot.comparable` is shared by Change Detection and Outcome Tracking: definition, currency/unit, TTM periods/quarter sequence, method/schema/source, known restatement/split flags and relevant share basis must pass before numeric changes are calculated. Missing evidence produces a Swedish explanation. Ordinary TTM windows may advance; a quarter cannot be compared with TTM or a regressed period. Existing thresholds still apply to comparable metrics.

SEC facts do not currently establish a verified split-adjusted share basis across observations. V1 therefore records this as unverified and suppresses per-share, share-count and price-return comparisons. It does not infer a stock split adjustment from share-count ratios. Manual valuation prices/EPS remain assumptions, not provider data; manual outcome prices can still be saved even when a return comparison is unavailable. Historical values and immutable revisions remain readable and unchanged.

`update_stocks.py` validates supported company identity, schema, source metadata, fiscal ordering, period durations, TTM continuity/recomputation, finite values and required availability before atomic replacement. Existing corrupt/unsupported output, reporting regression or lost TTM availability blocks publication. Failed SEC/network/429/malformed responses leave the existing file and successful fetch timestamp intact; the command/workflow reports failure. The existing scheduled Pages workflow refreshes only NVDA/SOFI/CRWD after tests and commits/deploys only after all updates succeed. Read-only validation, data preparation and build jobs are isolated from the contents-write commit job and the Pages/id-token deployment job. Build checks out the exact committed data revision; no additional provider credentials are introduced. Remote Actions execution still needs verification after these changes are published.

Macro updates use metadata schema 2 and per-event `provenanceVersion: 1` with independent `fieldProvenance.actual`, `.previous` and `.forecast`. Only provider values actually written by the updater receive its source/method/fetch metadata; retained legacy values have unknown field provenance. Existing explicit manual/provider forecast metadata is preserved, and missing forecasts remain unavailable. Forecasts are never inherited from the actual's source or described as consensus by default. Fetch status tracks individual BLS series and other requested provider components; partial failures or missing configuration cannot yield global OK. The separate `lastCompleteFetch` timestamp advances only when all tracked source fetches succeed; legacy BLS-only `lastSuccessfulUpdate` is retained for compatibility and never relabeled as a complete fetch. A successful fetch does not guarantee every scheduled release has a value. The UI exposes source status and field provenance in expandable details and labels legacy global status as incomplete evidence.

Validation includes `tests/test_data_quality.py`, executable comparability regressions in `tests/research-workflow.test.cjs`, and two isolated browser flows in `scripts/browser_smoke.py` for financial provenance/blocked comparison and partial macro status/missing forecast. No live provider request or personal browser storage is needed for these tests.

## Product trust and measurement operations

Public information: [Om NTM, integritet, metod och rättelser](om-metod.html).
Operational source: [editorial checklist, privacy-safe events, Instagram links, owner TODOs and annual calendar maintenance](docs/product-trust-operations.md).
`ntm-product.js` owns the small text-first status helper and provider-neutral event API. Product events are bounded, memory-only and have **no connected analytics provider**. Existing Cloudflare page analytics is separate. No private financial payloads are accepted. `posts.js` owns visible editorial metadata; `ntm-relations.js` owns curated connections, including the three original content journeys. Regenerate static pages after edits.

### Search Console baseline — owner action required

Search Console ownership has not been verified by this repository task. No fake verification token is installed.

1. In Google Search Console, add the **Domain** property `nolltillmiljoner.se`.
2. Copy Google's exact TXT record into the domain's DNS provider, wait for propagation, then select Verify. Keep the TXT record. DNS verification needs no site-code change.
3. Submit `https://nolltillmiljoner.se/sitemap.xml`. Confirm the deployed `robots.txt` allows crawling and points to that sitemap.
4. Use URL Inspection on the priority pages below; compare Google's selected canonical with the delivered canonical. Request indexing where appropriate. Min NTM and legacy router/redirect pages remain excluded/noindex.
5. Record a dated baseline of indexed pages, impressions, clicks, CTR and average position by landing page/device in Search Console. Compare equal reporting windows after deployment; do not claim causation or identify visitors. Product completion metrics remain unavailable externally until the owner chooses a reviewed provider.

Priority landing inventory (all under `https://nolltillmiljoner.se/`):

| Page | Intent / useful action |
| --- | --- |
| `/` | Choose a tool or Research |
| `verktyg.html` | Find a calculator |
| `ranta-pa-ranta.html` | Complete a savings calculation |
| `avgifter.html` | Compare fee effects |
| `aktievarderingskalkylator.html` | Test valuation assumptions |
| `valutajusterad-avkastning.html` | Calculate currency-adjusted return |
| `research.html` | Choose a company, calculate and save a thesis |
| `inlagg.html` | Find source content and a relevant tool journey |
| `om-metod.html` | Understand method and report a correction |

Run `node scripts/build_seo.cjs --check` before deployment. Chart.js is pinned/self-hosted at 4.5.1 on the ten chart pages; optimized header/icon/social assets replace the oversized delivered logo. See the operations document for byte measurements and dependency provenance.

## UI foundation and progressive depth

Permanent NTM principle: **SIMPLE BY DEFAULT. POWERFUL WHEN YOU WANT IT.**
Show the answer, a simple explanation and editable assumptions before advanced detail and source data. Never infer financial certainty from surface styling.

`premium.css` is the deliberate presentation layer after `style.css`: neutral graphite/cool-white surfaces, restrained blue interaction accents, type/spacing/radius tokens, consistent controls, primary-result hierarchy and financial-table treatments. Legacy layout/state rules remain in `style.css`; keep future visual changes in this layer rather than adding competing page overrides. No external font or framework is required.

`ntm-ui.js` owns only presentation: keyboard/menu dismissal, compact metric expansion, disclosure/chart resizing, accessible table regions and revealing linked details. It does not read/write private storage, calculate values or emit product events. Existing financial and storage modules retain their ownership. Research exposes four key metrics initially; all others remain available. Financial tables/filings and sensitivity are native disclosures. Calculator scenario controls and Min NTM data management are deliberately expandable, with their original confirmation behavior intact.

Run `python -B scripts/browser_smoke.py` for workflows/accessibility interactions and `python -B scripts/visual_smoke.py` for the 17-page inventory in both themes at 1440/360/390/430 pixels. Visual artifacts are written to an OS temporary folder, never the staged site. Playwright is required; Pillow optionally produces review contact sheets. Inspect actual screenshots as well as checking overflow. The 640 CSS-pixel browser test approximates reflow at 200% zoom on a 1280px viewport; it is not a claim of a full assistive-technology audit.

## Color System V2

`premium.css` separates blue interaction colors from semantic finance colors. Use `--action`/`--action-text` for solid primary buttons, `--primary` for links/focus, and `--market-positive`, `--market-negative`, `--success`, `--warning`, `--danger`, `--manual`, `--derived`, `--unavailable` for their named meanings. Category labels and ordinary review surfaces stay neutral. Research and calculator charts share `getChartColors()`; three non-directional series use blue/slate tones. Theme controls use inline SVG sun/moon icons with the existing accessible action labels and persistence. Layout, spacing, financial logic and Connected Experience remain unchanged. See [the color tokens, visual evidence and validation report](docs/color-system-v2.md).

## Connected Experience Foundation V1

Permanent principle: **NTM ska inte bara samla funktioner — NTM ska koppla ihop dem.**

`ntm-relations.js` owns the public relation catalog, controlled concepts, deterministic queries and one renderer. Post titles, canonical paths and distribution summaries derive from `posts.js`; curated ticker/concept metadata and relation reasons live in the catalog. `scripts/build_seo.cjs` validates and materializes real anchors into selected calculators, Research and generated content pages. Future Learn topics have `status: planned` and `url: null` and are excluded from rendered links. No Academy routes, accounts, personalization or financial input transfers are introduced.

Research uses three static company groups and `ntm-relations-ui.js` selects only the current URL's ticker. Each company gets three actions; local thesis links preserve unsaved work. Without JavaScript the static groups remain crawlable, but Research itself still requires JavaScript. The homepage and Min NTM retain their existing paths rather than gaining another generic recommendations block.

Adding a connection: add/edit the post in `posts.js`, add intentional metadata/edges in `ntm-relations.js`, run `node scripts/build_seo.cjs`, then tests and `--check`. Never hand-edit generated relation blocks or article files. See [the relation schema, vocabulary, six journeys, analytics policy and validation report](docs/connected-experience.md).

`relation_click` uses allowlisted `relation_type`, `source_surface`, and `destination_type` fields. It sends no ticker, relation/entity ID, URL, thesis text or financial values, and has no external provider. Original content CTA events remain compatible. Run `node --test tests/relations.test.cjs` for catalog/render/privacy contracts; these also run through the full Python suite. Browser smoke includes connected journeys, no-JavaScript anchors, keyboard operation and both themes at 1440/360/390/430 pixels.

## Workflow for future AI coding sessions

Release gate: see [quality/trust/release discipline](docs/release-discipline.md).
Run `python -B scripts/validate_release.py`, the full `scripts/browser_smoke.py`,
`scripts/quality_browser.py --output <temporary-json-path>` and
`scripts/check_workflows.py` before merging. PR validation is read-only; GitHub
branch protection still requires owner configuration. Dated ISK/mortgage rules
live in `data/rule-registry.json`; review deadlines fail validation. The SEO
generator also maintains enforcing CSP meta tags and rule-version notices.

Use the [calculator standard](docs/calculator-quality.md),
[feature decision template](docs/product-decision.md) and
[architecture/operations boundaries](docs/architecture-operations.md) when making
significant changes. [Performance baseline](docs/performance-baseline.json) records
local payloads and timings, with external requests explicitly excluded.

Start every session with: *"Read README.md and inspect the existing project structure/design before making changes."*

Then:

1. Inspect the relevant existing implementation.
2. Identify reusable components/helpers.
3. Make the smallest coherent change.
4. Test desktop and mobile.
5. Test dark and light mode.
6. For calculators and valuation tools, test deterministic math cases with known outputs.
7. Run tests (`python -m unittest discover -s tests -p "test_*.py"`).
8. Verify no unrelated behavior changed.
9. Summarize changed files and behavior.


## Calculator depth and manual savings follow-up

B23/B24/B28/B29/B33/B63 use the existing `depth-panel` native-details pattern:
answer first, short explanation, visible editable assumptions, optional advanced
questions, then formula/source context. Required calculator inputs remain visible;
opening details never calculates. Research reuses the same pattern for sensitivity
and financial source detail. See [the implementation and validation report](docs/calculator-progressive-depth.md).

Savings follow-up is optional `followup: {version: 1, plan, observations}` inside
an existing `sparmal` scenario, not another storage key. A plan copies only a
successful current calculation; loading or editing inputs does not create one.
Observations append IDs/dates without editing that plan. JSON backup merges
observations by ID only when the original scenario and plan agree. Invalid storage
blocks writes. Older scenarios remain usable without fabricated historical plans.
The ten-scenario limit also includes follow-up plans; each supports 500 observations.
Real plans require manually entered amounts in the original purchasing power.


## Weekly publication reliability

Run `python -B scripts/validate_release.py` as the single read-only release gate.
It includes `node scripts/check_weekly_events.cjs`; use `--date YYYY-MM-DD` on the
latter to simulate a Stockholm calendar date without changing any clock. PR/weekly
validation runs this gate. Deployment checks again after automatic macro refresh,
before uploading data, and before staging the site.

The gate verifies current-week resolution, dates/ISO metadata, event identities,
field provenance, source update status, image/data mappings and reviewed image
hashes in `data/weekly-artifacts.json`. New/changed images or forgotten structured
records fail. Valid empty days pass; honest partial updates warn; explicitly
unpublished future authoritative schedules produce a dated notice.

Macro BLS schedule sync and configured provider updates remain automatic. Other
calendar entries, earnings curation, original weekly images and their image/data
review remain manual. Do not simply regenerate the review hashes to silence a
failure: inspect the image against the structured identities/dates/times, correct
the data, and record that review. The manifest intentionally does not freeze macro
actual/previous/forecast values, which update independently of a historical image.
See [weekly reliability findings and maintenance instructions](docs/weekly-data-reliability.md).
