# Noll till Miljoner

Noll till Miljoner (NTM) is a Swedish investing and personal-finance website focused on useful tools, market context, investment content, resources, and stock research. It is a static, multi-page site built with plain HTML, CSS, and JavaScript, hosted on GitHub Pages at `nolltillmiljoner.se`.

**Positioning:** Utility first. Creator second. The site should feel useful on its own, regardless of who created it. The creator's personal journey and Instagram presence exist, but they are secondary.

**Value proposition:** *Allt du behöver som investerare – på ett ställe.*

**Core product principle:** *Simple by default. Powerful when you want it.* This guides calculators, page layouts, navigation, information density, and all future development. Avoid complexity that only exists to make a feature look advanced.

---

## Site structure and navigation

Primary navigation (identical header on all pages, defined in each page's HTML):

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

Every page shares the same topbar: brand/logo, main nav, dark/light theme toggle, and a hamburger menu on mobile.

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
   - Highlights TTM revenue, net income, EPS, diluted shares, free cash flow (where supported), cash & equivalents, debt, and stockholders' equity.
   - Profile-dependent metrics (e.g. Total Net Revenue net of interest expense for `financial_services`, Operating Income where applicable, FCF where economically meaningful).
2. **Annual & Quarterly History:**
   - Multi-year financial tables (Revenue, Operating Income, Net Income, Net Income to Common, EPS, Diluted Shares, Cash, Total Debt, Equity).
   - Interactive Chart.js visualizations for annual and quarterly performance.
3. **SEC Filings & Provenance:**
   - List of recent 10-K and 10-Q filings with filing dates, report periods, accession numbers, and direct SEC EDGAR document links.
   - **Provenance Modal:** Displays exact SEC XBRL concept names, taxonomies, forms, accession numbers, and derivation methods for any reported metric.
4. **Valuation Base & Forward Scenarios:**
   - Driven by `valuationBase` (`asOfPeriod`, `ttmNetIncomeToCommon`, `ttmDilutedShares`, `ttmDilutedEps`, `ttmFreeCashFlow`, `ttmFcfPerShare`).
   - Manual stock price input with stock-specific defaults (NVDA $120.00, SOFI $15.00, CRWD $280.00).
   - Displays current P/E TTM and P/FCF TTM (where FCF is supported).
   - **"Vad prisar marknaden in?" (Reverse Valuation):** Computes required EPS CAGR given target annual return, horizon years, and exit P/E.
   - **Bear / Base / Bull Scenario Analysis:** Sensitivity matrix calculating future EPS, future stock price, and CAGR across 3 growth and exit P/E scenarios.
   - **Calculator Interaction Rule:** Edits to valuation inputs mark the valuation state as *stale* (showing a status warning banner). Results only update when the user explicitly clicks **Beräkna värdering & scenarier**.
   - **CRWD / Manual EPS Fallback:** When a stock lacks a reliable SEC TTM EPS (e.g. CRWD mid-year stock split setting `ttmDilutedEps: null`), an override banner appears, setting EPS source to "Manuell" and allowing user manual EPS input.
5. **Min Thesis (User Research Journal):**
   - Personal analysis form with four fields: *Min tes* (required), *Viktigaste risker* (optional), *Vad skulle få mig att ändra mig?* (optional), and *Anteckningar* (optional).
   - Saved locally in browser `localStorage` under key `investment-research-theses-v1`.
   - **Thesis Snapshot:** When saving a thesis with a valid, non-stale valuation, the system automatically captures a valuation snapshot (TTM metrics, valuation inputs, valuation results, Bear/Base/Bull scenarios, EPS source, `capturedAt`, and `asOfPeriod`).
   - Saved indicator displays relative time ("just nu", "för 5 min sedan", etc.) and an expandable snapshot preview.
6. **Change Detection ("Sedan din thesis"):**
   - Handled by `change-detection.js` (`NTMChangeDetection.detect(snapshot, currentData)`).
   - When a returning user visits a stock with a saved thesis snapshot, the page compares snapshot values against current stock JSON.
   - Compares TTM Revenue, Net Income, EPS, Diluted Shares, FCF, FCF/share, derived margins in percentage points `pp` (Net Margin, FCF Margin), period updates (e.g. `2026Q1 → 2026Q2`), and new 10-K/10-Q filings filed after the thesis capture date.
   - **Fact-Based Presentation:** Changes are presented as neutral numerical facts. The system does **not** automatically judge a thesis as "good" or "bad", nor does it produce recommendations or automated scoring.
   - Displays a warning banner if the thesis snapshot is over 12 months old.

---

## SEC Data Pipeline

The backend python pipeline fetches, normalizes, and stores official SEC EDGAR XBRL facts into static JSON files consumed by `research.html`.

### Pipeline Scripts
- `scripts/sec_client.py`: Official SEC EDGAR API client (`SECClient`).
  - Resolves CIK via `company_tickers.json`.
  - Fetches CIK submission metadata (`submissions/CIK{cik}.json`) and XBRL company facts (`api/xbrl/companyfacts/CIK{cik}.json`).
  - Declares required SEC User-Agent header (`NTMResearch admin@nolltillmiljoner.se`).
  - Implements throttling (0.15s rate-limit delay, well within 10 req/sec limit) and handles HTTP 429 retries and network errors.
- `scripts/stock_normalizer.py`: High-integrity SEC XBRL fundamentals normalizer (`StockNormalizer`).
  - Maps XBRL concepts using deterministic company profiles (`COMPANY_PROFILES`).
  - Discovers generic fiscal calendars and period boundaries dynamically.
  - Separates flow/duration concepts (Income Statement, Cash Flow) and instant concepts (Balance Sheet).
  - Handles broken fiscal years and computes standalone quarters safely (Q2 = 6M - Q1, Q3 = 9M - 6M, Q4 = FY - 9M).
  - Guard against non-additive metrics: EPS and weighted average shares are non-additive and never subtracted across periods.
  - Calculates TTM metrics only when 4 consecutive verified quarters exist.
  - Computes duration-weighted diluted shares across trailing quarters (365 days).
  - Derives `ttmDilutedEps` as `ttmCommonIncome / ttmDilutedShares`.
  - Computes Free Cash Flow (`OCF - CapEx`) and FCF per share only where economically meaningful.
  - Attaches full provenance to every value (form, filing date, accession, concept name, taxonomy, derivation notes).
  - Graceful null handling: Returns `null` or `unsupported: true` with explanatory reasons rather than guessing or producing corrupt data on stock splits/incompatible structures.
- `scripts/update_stocks.py`: Execution script CLI (`--ticker <TICKER>`, `--all`, `--offline`).
  - Fetches or reads offline fixtures (`tests/fixtures/sec_<ticker>_*.json`).
  - Runs `StockNormalizer`.
  - Atomically writes JSON to `data/stocks/<TICKER>.json` via temporary files (`save_atomic_json`).

### Company Profiles
- `financial_services` (e.g. `SOFI`): Revenue mapped to `RevenuesNetOfInterestExpense`, Operating Income unsupported (bank structure), Debt unsupported (customer deposits vs borrowings), FCF unsupported (depository banking cash flows dominated by loan originations and deposit changes).
- `standard_company` (e.g. `NVDA`): Standard GAAP Revenue, Operating Income, FCF (`OCF - CapEx`).
- `software_saas` (e.g. `CRWD`): Standard GAAP Revenue, Operating Income, FCF, handles stock splits and manual EPS fallback when TTM EPS is non-derived.

---

## Tools and calculators

All calculators live in standalone HTML pages and share `style.css` + `script.js`. Each calculator page loads Chart.js from CDN (`https://cdn.jsdelivr.net/npm/chart.js`) if it renders charts.

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

---

## Min NTM (`min-ntm.html`)

`min-ntm.html` is the user's personal, device-local overview dashboard.

### Content Sections
1. **Mina analyser (Research Theses):**
   - Lists saved stock research theses from `investment-research-theses-v1`.
   - Displays ticker, company name, base-case target price & CAGR (or required EPS CAGR), update date, and links directly to `research.html?ticker=<TICKER>`.
   - Displays status badges (e.g. `⚠️ Gammal` for snapshots older than 12 months) powered by `NTMChangeDetection.isSnapshotStale()`.
2. **Sparade scenarier:**
   - Lists saved calculator scenarios from `investment-scenarios-v1`.
3. **Senast använda verktyg:**
   - Tracks up to 5 recently visited calculator tools from `investment-recent-tools-v1`.

All data is stored exclusively in `localStorage`. There are no user accounts, passwords, cloud syncing, or analytics tracking.

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

`index.html` contains the **NTM Idag** dashboard (`initNtmToday()` in `script.js`, refreshed every 60 s). It is schedule- and data-file-based — **there is no realtime market data feed**.

- **Greeting**: time-segment-based message pools (morning/day/evening/night/weekend) in `NTM_TODAY_MESSAGE_POOLS`; stable per browser session via `sessionStorage`.
- **Market status cards** (Stockholm 🇸🇪 / USA 🇺🇸): driven by `window.NTM_MARKET_CALENDAR` in `data/market-calendar.js` — per-exchange timezone, regular open/close, half-day close, and per-year `closed`/`halfDays` date lists. `getMarketStatus()` produces open/closed state plus countdowns.
- **Market overview**: TradingView single-ticker widget rendered into `#ntmTradingViewWidget`, plus a collapsible "Viktig marknadsdata" list of external TradingView links.
- **Makro idag / Rapporter idag panels**: read from `window.NTM_WEEKLY_EVENTS` in `data/weekly-events.js`.
- **Preview helper**: `?ntmDate=YYYY-MM-DD` in the URL overrides "now" for testing.
- **Latest posts**: the 3 newest posts from `posts.js` rendered into `#latestPosts`.

---

## Posts system (Inlägg)

Central, data-driven architecture — **new posts are added to `posts.js`, never as standalone HTML pages.**

- `posts.js` exports `NTM_POSTS`: an array of post objects with `title`, `date`, `slug`, `category`, `tags`, `excerpt`, `previewPosition`, `media`, `content` (HTML string), and optional `instagramUrl` and `summary` (`{ sv, en }` for AI video summaries).
- **Media types**: `carousel` (`images: [{ src, alt }]`, with prev/next + dots + lightbox) and `youtube` (`videoId`, click-to-play facade).
- **URLs**: `post.html?post=<slug>` — stable slug-based URLs via `post.html`.
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
- **Additional official providers:** Federal Reserve series via FRED CSV (`TOTALSL`, `INDPRO`, `TCU`), BEA NIPA tables (`T10101`, `T20100`, `T40100`) when `BEA_API_KEY` is configured, and Treasury FiscalData MTS for monthly deficit/surplus.
- **Provider safety:** Provider rules match exact event period, series/table, units and seasonal adjustment. Missing periods or provider/network failures preserve existing values.
- **GitHub Pages Deployment:** Uses official `actions/deploy-pages@v4` workflow.

---

## Resurser & Community

- `resurser.html`: Static curated list with **YouTube**, **Podcasts** and **Böcker**.
- `community.html`: Discord invite section. There are no accounts, portfolio sharing, or leaderboards.

---

## Shared site systems (`script.js`, `thesis-storage.js`, `change-detection.js`)

`script.js` is loaded by every page and organized as independent, element-guarded modules:

- `initTheme()` — theme from `localStorage` key `investment-theme`; toggles `body.light-theme`.
- `initNtmToday()` — homepage dashboard.
- `injectInstagramPromo()` — inserts shared Instagram footer section.
- `initPostSystem()` / `initYoutubePosts()` — posts archive/view, carousels, lightbox, YouTube facades.
- `initToolsDirectory()` — verktyg search/filter/collapse.
- `initMinNtmPage()` — local-only Min NTM overview (reads `investment-research-theses-v1`, `investment-scenarios-v1`, and `investment-recent-tools-v1`).
- `recordRecentToolVisit()` — records visits to tool pages under `investment-recent-tools-v1`.
- `thesis-storage.js` — Standalone module `NTMThesisStorage` managing CRUD operations for research theses under `investment-research-theses-v1`. Handles corrupt JSON, missing localStorage, and quota exceeded errors gracefully.
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

### Test Suites
- `tests/test_stock_pipeline.py`: Validates `SECClient`, `StockNormalizer`, company profile mappings, generic fiscal calendar discovery, TTM derivations, non-additive metric guards, and atomic JSON output.
- `tests/test_macro.py`: Validates macro event structures, BLS schedule period matching, and event rendering.
- `tests/test_thesis_v1.py`: Validates `NTMThesisStorage` CRUD operations, thesis schema validation, valuation snapshots, stale valuation protection, manual EPS tracking, and research UI integration.
- `tests/test_change_detection_v1.py`: Validates `NTMChangeDetection` metric diffs, percentage point (`pp`) margin changes, 10-K/10-Q filing detection, period change detection, backward compatibility, and Min NTM badge integration.

### Staging Validation
Validate site completeness before deployment:
```bash
python scripts/stage_site.py <target_directory>
```
The staging script verifies that all required HTML, CSS, JS, JSON, and asset files exist and that all local asset references in HTML/CSS files resolve cleanly.

---

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

## Workflow for future AI coding sessions

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
