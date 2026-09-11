# Noll till Miljoner

Noll till Miljoner (NTM) is a Swedish investing and personal-finance website focused on useful tools, market context, investment content and resources. It is a static, multi-page site built with plain HTML, CSS and JavaScript, hosted on GitHub Pages at `nolltillmiljoner.se`.

**Positioning:** Utility first. Creator second. The site should feel useful on its own, regardless of who created it. The creator's personal journey and Instagram presence exist, but they are secondary.

**Value proposition:** *Allt du behöver som investerare – på ett ställe.*

**Core product principle:** *Simple by default. Powerful when you want it.* This guides calculators, page layouts, navigation, information density and all future development. Avoid complexity that only exists to make a feature look advanced.

---

## Site structure and navigation

Primary navigation (identical header on all pages, defined in each page's HTML):

| Nav item | Page | Purpose |
|---|---|---|
| Hem | `index.html` | Homepage with the "NTM Idag" dashboard and latest posts |
| Verktyg | `verktyg.html` | Tool directory: search, category filters, tool cards |
| Inlägg | `inlagg.html` | Post archive: search, category filters, pagination |
| Makro | `makro.html` | Weekly macro image + archive |
| Rapporter | `rapporter.html` | Weekly earnings image + archive |
| Resurser | `resurser.html` | Curated resources (YouTube, Podcasts, Böcker) |
| Community | `community.html` | Discord invite |

Every page shares the same topbar: brand/logo, main nav, dark/light theme toggle, and a hamburger menu on mobile.

Redirect shims kept for old links (do not build on these): `calculator.html` → `ranta-pa-ranta.html`, `investeringar.html` → `inlagg.html`.

---

## Tools and calculators

All calculators live in standalone HTML pages and share `style.css` + `script.js`. Each calculator page loads Chart.js from CDN (`https://cdn.jsdelivr.net/npm/chart.js`) if it renders charts.

| Tool | Page | Modes (tabs) | Answers |
|---|---|---|---|
| Investeringskalkylator (Ränta på ränta) | `ranta-pa-ranta.html` | **Tillväxt** / **Utdelning** | How savings grow over time with return, fees, inflation; dividend reinvestment variant. Also renders a scenario comparison (7/10/20 %) |
| FIRE-kalkylator | `fire-kalkylator.html` | **Vägen till FIRE** / **Mitt FIRE-mål** / **Uttag** | When you can reach FIRE, what a chosen FIRE target requires, how long capital lasts during withdrawals |
| Sparmålskalkylator | `sparmalskalkylator.html` | **Månadssparande** / **Tid till mål** / **Målkapital** | Required monthly saving, time to goal, or resulting capital; nominal vs today's-money targets |
| Jämför avgifter | `avgifter.html` | – | End-value difference between two fee levels |
| Hävstångskalkylator | `havstang.html` | **Belåning** / **Daglig hävstång** | Leveraged investing vs unleveraged; daily-reset leverage (X2/X3/X5) day-by-day. Also has "Utan/med hävstång" comparison and an "Amortera eller investera?" section |
| Återhämtningskalkylator | `aterhamtning.html` | – | Required % gain to recover from a drawdown |
| Bolånekalkylator | `bolanekalkylator.html` | **Bolån** / **Amortering** / **Ränta** | Mortgage size, amortization requirements, rate-sensitivity table. Uses Swedish rules effective 2026-04-01 (90 % bolånetak for new purchases, 2 % amortization above 70 % LTV, 1 % above 50–70 %, 0 % at ≤50 %) |
| ISK-skattkalkylator | `isk-skattkalkylator.html` | **Enkel** / **Detaljerad** | ISK schablon tax for 2026, incl. the shared 300 000 kr tax-free allowance across ISK/KF/PEPP |
| Aktievärderingskalkylator | `aktievarderingskalkylator.html` | **Enkel** / **Scenarier** (Bear/Base/Bull) | P/E, forward P/E, PEG, implied future price, CAGR |
| Avkastningskalkylator | `avkastningskalkylator.html` | **Totalavkastning** / **CAGR** / **Årsavkastning** | Total return, compound annual growth, per-year returns |
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

Future calculators must follow this convention.

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
| Mode tabs (primary) | `.mode-toggle` + `.mode-tab` (+`.active`) | Compact inline-flex pill group on desktop; full-width equal tabs under 721px. FIRE uses `.fire-mode-tabs`/`.fire-mode-tab`/`.is-active` but shares the exact same CSS rules (JS hook classes — do not rename) |
| Secondary/nested toggles | `.chart-toggle` + `.chart-view-tab` (+`.is-active`) | Visibly smaller than mode tabs; used e.g. for FIRE chart views |
| Segment radios | `.segment-control` + `.segment-option` | Radio-as-pill control (used in Hävstång for lånebelopp/belåningsgrad) |
| Forms | `.calculator-form` > `.form-grid` > `.field-group` | 2-column grid desktop, 1 column under 721px |
| Aligned fields | `.form-grid--aligned` | Desktop-only reserved label/input/helper rows (49px inputs, 18px helper line) so rows align even when only one field has helper text; collapses to natural stacking on mobile |
| Helper text | `small.field-help` | Muted, 0.75rem |
| Inputs/selects | shared `input, select` rules | 14px radius, accent focus ring; do not override per page |
| Buttons | base `button` (primary gradient), `.secondary-btn`, `.ghost-btn` | Do not invent new button styles |
| Results | `.results` > `.result-box` (+`.highlight`, +`.result-box--wide`) | `.highlight` marks the primary result; `.result-box--wide` spans both columns; `.label` / `.result-value` typography is shared |
| Chart cards | `.chart-panel` > `.chart-header` (+`.chart-header-row`) > `.chart-wrap` | 330px chart height desktop, 260px small/mobile (`.small-chart-wrap`) |
| Messages | `.calculator-message` (+`.is-error`) | Aliases consolidated into the same rule: `.stock-message`, `.return-message`, `.purchase-message`, `.goal-message`, `.mortgage-message`, `.calculator-summary`. Warning variants keep the accent left border; `.info-callout` for info boxes |
| Intro copy in card | `.calculator-intro` | Short muted paragraph under the section heading |
| Advanced settings | `details.advanced-settings` | Collapsible secondary inputs |
| Footnotes | `p.note` | Small muted disclaimer text |
| Progress panels | `.goal-progress-*` / `.fire-progress-*` | Share one rule set |

Do not use inline styles for layout on calculator pages — extend the shared classes instead.

---

## Verktyg page (tool discovery)

`verktyg.html` implements a tool directory (`initToolsDirectory()` in `script.js`):

- **Search** (`#tool-search`): matches card text plus a `data-search` keyword attribute per card; normalized with `toLocaleLowerCase('sv-SE')` and diacritic stripping, so `havstang` matches "hävstång".
- **Category filters**: Alla + five categories — `investera-spara` (Investera & spara), `risk-havstang` (Risk & hävstång), `lan-privatekonomi` (Lån & privatekonomi), `skatt` (Skatt), `aktier-analys` (Aktier & analys).
- **Empty categories are hidden**; an empty-state message shows when nothing matches.
- **Collapse/expand**: on desktop all categories are expanded; on mobile (≤720px) only the first visible category starts expanded. Searching or filtering auto-expands matching categories; manual collapse is disabled while a search/filter is active. Returning to the unfiltered state restores the default expansion.
- Each tool card declares `data-category`, `data-status`, `data-search` and optional `.tool-labels` pills for its modes.

When adding a tool: add a card to the correct category with a good `data-search` keyword list. No JS changes are needed.

---

## Homepage / NTM Idag

`index.html` contains the **NTM Idag** dashboard (`initNtmToday()` in `script.js`, refreshed every 60 s). It is schedule- and data-file-based — **there is no realtime market data feed**.

- **Greeting**: time-segment-based message pools (morning/day/evening/night/weekend) in `NTM_TODAY_MESSAGE_POOLS`; the chosen message is stable per browser session via `sessionStorage`.
- **Market status cards** (Stockholm 🇸🇪 / USA 🇺🇸): driven by `window.NTM_MARKET_CALENDAR` in `data/market-calendar.js` — per-exchange timezone, regular open/close, half-day close, and per-year `closed`/`halfDays` date lists. `getMarketStatus()` produces open/closed state plus countdowns (e.g. time to open/close). Weekends and holidays are handled; if a year is missing from the calendar, the status falls back to an "unknown" schedule instead of guessing (`isUnknownYear`).
- **Market overview**: a TradingView single-ticker widget rendered into `#ntmTradingViewWidget` (re-rendered on theme change), plus a collapsible "Viktig marknadsdata" list of external TradingView links (OMXS30, Nasdaq 100, S&P 500, VIX, US 10Y). On mobile the whole market block is collapsed behind a toggle.
- **Makro idag / Rapporter idag panels**: read from `window.NTM_WEEKLY_EVENTS` in `data/weekly-events.js`. Today's macro events are shown grouped by time (only the day's highest priority level), and up to 3 earnings reports plus a "Visa N till →" link. Event times are converted from the source timezone (`America/New_York`) to the display timezone (`Europe/Stockholm`, `NTM_DISPLAY_TIMEZONE`).
- **Preview helper**: `?ntmDate=YYYY-MM-DD` in the URL overrides "now" for the NTM Idag section (used for testing/previewing a specific date).
- **Latest posts**: the 3 newest posts from `posts.js` rendered into `#latestPosts`.

## Posts system (Inlägg)

Central, data-driven architecture — **new posts are added to `posts.js`, never as standalone HTML pages.**

- `posts.js` exports `NTM_POSTS`: an array of post objects with `title`, `date`, `slug`, `category`, `tags`, `excerpt`, `previewPosition`, `media`, `content` (HTML string), and optional `instagramUrl` and `summary` (`{ sv, en }` for AI video summaries).
- **Media types**: `carousel` (`images: [{ src, alt }]`, with prev/next + dots + lightbox) and `youtube` (`videoId`, click-to-play facade — the iframe is only created after the user clicks; optional Swedish/English AI summary with a language toggle).
- **URLs**: `post.html?post=<slug>` — stable slug-based URLs via the shared post shell `post.html` (renders full content, copy-link button with clipboard fallback, not-found state).
- **Archive** (`inlagg.html`): search, category filter buttons (`Alla, Analys, Portfölj, Utbildning, Makro, Video, Nyheter`), `?tag=` URL filter support, pagination (9 posts/page).
- **Homepage**: latest 3 posts.
- **Image convention**: `images/posts/<post-folder>/01.png`, `02.png`, … where the folder is the slug or a `<name>-<date>` form (e.g. `images/posts/nebius-2026-09-08/`).
- The shared lightbox is exposed as `window.NTMLightbox` and reused by post carousels and week pages.

`youtube-transcriber/` is a **local Python dev tool** (yt-dlp + Whisper) used to produce transcripts for video post summaries. It is not part of the website and has no runtime relationship with it.

## Makro and Rapporter

- `makro.html` renders native structured macroeconomic events from `data/weekly-events.js` (`macroWeeks`), grouped by Swedish calendar day (`Europe/Stockholm`) with time, country, actual/forecast/previous and optional details/sources. Older weeks with only images fall back to the image visual and lightbox.
- `rapporter.html` continues to be driven by `week-pages.js` with weekly images from `images/rapporter/` and lightbox.

### Automated Macro Data & Deployment

Macroeconomic data is updated via `scripts/update_macro.py` and GitHub Actions (`.github/workflows/deploy.yml`):
- **Live Automated Source:** U.S. Bureau of Labor Statistics (BLS) Public API.
  - Queries exact series (e.g. `CES0000000001` for Nonfarm Payrolls, `LNS14000000` for Unemployment Rate, `CUSR0000SA0` / `CUUR0000SA0` for CPI, `WPSFD4` for PPI, `PRS85006092` for Productivity, `JTS000000000000000JOL` for JOLTS).
  - Matches strictly by Year + Period (e.g. `2026 M08`, `2026 Q02`).
   - Auto-populates upcoming weeks and events from the official BLS 2026 release schedule (`BLS_OFFICIAL_SCHEDULE_2026`).
- **Additional official providers:** Federal Reserve series via FRED CSV (`TOTALSL`, `INDPRO`, `TCU`), BEA NIPA tables (`T10101`, `T20100`, `T40100`) when `BEA_API_KEY` is configured, and Treasury FiscalData MTS for monthly deficit/surplus.
- **Provider safety:** Provider rules match exact event period, series/table, units and seasonal adjustment. Missing periods or provider/network failures preserve existing values. BEA credentials are supplied only through the optional `BEA_API_KEY` GitHub secret.
- **Call Budget:** Runs via cron on trading weekdays (12:35, 14:35, 16:35 UTC) using 1 batch request per run = 3 requests/day (well within the BLS 25 req/day unauthenticated / 500 req/day authenticated limit).
- **GitHub Pages Deployment:** Uses the official `actions/deploy-pages@v4` workflow. In GitHub Repository Settings, ensure **Settings → Pages → Build and deployment → Source** is set to **"GitHub Actions"**.

### Adding or updating Macro Data manually

1. **Add a new macro week / event**:
   If adding an event not in the official BLS calendar, add an entry to `macroWeeks` in `data/weekly-events.js` with a stable `id`, date, time, country, and `period`.
2. **Missing values**:
   Forecasts and outcomes without verified public sources or redistribution rights are kept as `null` and rendered as `"–"`. Real zeros must be written as `'0%'` or `'0'`.
3. **Historical image archive**:
   Weeks without structured events specify `fallbackImage: './images/makro/week-NN.png'` and `events: []`.

- **Rapporter**: To add a reporting week, add the image to `images/rapporter/week-NN.png` and add the entry to `earningsWeekData` in `week-pages.js`.

## Resurser

`resurser.html` is a static curated list with three `.resource-category` sections: **YouTube**, **Podcasts** and **Böcker**. Each entry is a `.resource-card` with title, meta, tags, description and an external link. Add resources by copying the card pattern.

## Community

`community.html` currently contains only a Discord invite section (image, short copy, "Gå med i Discord" button). There are no accounts, portfolio sharing, leaderboards, tracking or competitions implemented — do not describe or build UI implying they exist.

---

## Shared site systems (`script.js`)

`script.js` is loaded by every page and is organized as independent, element-guarded modules (each feature checks that its DOM exists before wiring up). `initPage()` boots the shared systems:

- `initTheme()` — theme from `localStorage` key `investment-theme`; toggling switches `body.light-theme`. There are desktop (`#themeToggle`) and mobile (`#mobileThemeToggle`) toggles; the mobile one delegates to the desktop one. Switching theme re-renders charts so they pick up CSS-variable colors.
- `initNtmToday()` — homepage dashboard (see above).
- `injectInstagramPromo()` — inserts the shared Instagram footer section after `<main>` on every page (idempotent).
- `initPostSystem()` / `initYoutubePosts()` — posts archive/view, carousels, lightbox, YouTube facades.
- `initToolsDirectory()` — verktyg search/filter/collapse.
- Mobile nav toggle (`#mobileNavToggle` + `.main-nav.open`).
- Calculator modules: investment (`calculateProjection`, `calculateInvestment`), dividend, fee comparison, FIRE (path/goal/withdrawal + charts), ISK, stock valuation, return/CAGR, purchase (GAV/DCA/position), goal, mortgage, leverage, recovery — each with its own `parse*/format*` helpers.
- Shared formatting helpers: `formatCurrency()`, `formatPercent()`, `formatYearsAndMonths()`, etc. Reuse them.

## File map

```
/
├── index.html                  # Homepage: NTM Idag dashboard + latest posts
├── verktyg.html                # Tool directory (search + category filters)
├── inlagg.html                 # Post archive (search, filters, pagination)
├── post.html                   # Shared post shell (?post=<slug>)
├── makro.html                  # Weekly macro image + archive
├── rapporter.html              # Weekly earnings image + archive
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
├── aktievarderingskalkylator.html  # Aktievärdering (Enkel / Scenarier)
├── avkastningskalkylator.html  # Avkastning (Total / CAGR / Årsavkastning)
├── aktiekopskalkylator.html    # Aktieköp (GAV / DCA / Positionsstorlek)
├── valutajusterad-avkastning.html # Valutajusterad avkastning (Valutakurs / Procent)
├── style.css                   # Single shared stylesheet (design tokens + all components)
├── script.js                   # Single shared JS (theme, nav, NTM Idag, posts, all calculators)
├── posts.js                    # NTM_POSTS — central post data
├── week-pages.js               # Makro/Rapporter weekly image system
├── data/
│   ├── market-calendar.js      # window.NTM_MARKET_CALENDAR — exchange hours/holidays
│   └── weekly-events.js        # window.NTM_WEEKLY_EVENTS — macro + earnings per week
├── images/
│   ├── posts/<post>/           # Post images (01.png, 02.png, ...)
│   ├── makro/                  # week-NN.png
│   ├── rapporter/              # week-NN.png
│   └── discord/
├── calculator.html             # Legacy redirect → ranta-pa-ranta.html
├── investeringar.html          # Legacy redirect → inlagg.html
├── youtube-transcriber/        # Local Python dev tool (not part of the site)
├── CNAME                       # nolltillmiljoner.se
└── README.md
```

## Charts

- Chart.js is loaded per calculator page from CDN; no bundling.
- All charts read their colors from CSS variables via `getChartColors()` so they follow the active theme; charts are re-rendered when the theme toggles.
- Charts are responsive (`maintainAspectRatio: false` inside fixed-height `.chart-wrap` containers).
- Do not duplicate chart boilerplate — follow the existing `render*Chart()` patterns, and never reduce calculation precision just to simplify rendering.

## Dark / light mode

- Dark is the default theme; `body.light-theme` switches to light.
- All colors are CSS custom properties defined in `:root` and overridden in `body.light-theme` (`--bg`, `--panel`, `--border`, `--text`, `--muted`, `--primary`, `--accent`, …).
- The choice persists in `localStorage` (`investment-theme`) across pages and sessions.
- **Never hardcode colors** in new UI — use the tokens. Any visual change must be verified in both themes.

## Responsive design

Mobile is a first-class requirement. Verify changes at ~1440px (desktop), ~1024px (laptop), ~768px (tablet) and ~390px (mobile):

- No horizontal page overflow.
- Forms stack to a single clean column; tabs remain usable (full-width equal tabs on small screens).
- Cards stack; charts stay responsive; spacing stays compact.
- No desktop-only interaction assumptions (hover, wide tables need `overflow-x` wrappers, etc.).

## Deployment

- Fully static site, hosted on **GitHub Pages** with the custom domain `nolltillmiljoner.se` (`CNAME`).
- No backend, no build step, no environment secrets in the repo.
- A Cloudflare Web Analytics beacon snippet is included in page footers.
- External runtime dependencies: Chart.js CDN, TradingView widget CDN, Google Fonts is not used (system font stack).

## Brand conventions

- User-facing language is **Swedish**; code, comments and this README are English-first.
- Visual identity: dark-first premium look, turquoise/teal accent (`--primary`), blue secondary accent, clean compact cards, generous radii, subtle borders, system font stack ("Segoe UI").
- Brand name rendering: "NOLL" / "TILL" / "MILJONER" with accent colors via `.brand-zero` / `.brand-neutral` / `.brand-million`.
- Direction: compact, premium, clean, calm. No heavy animations, gratuitous gradients or oversized controls.

---

## Development rules — don't break these

1. Read README.md and inspect the existing implementation before changing a feature.
2. Reuse existing architecture, components and styles before creating new ones.
3. Simple by default. Powerful when you want it.
4. Utility first. Creator second.
5. Calculator results update only after **Beräkna** — never live while typing.
6. Do not change calculator math while doing purely visual/UI work.
7. Preserve dark **and** light mode.
8. Mobile is a first-class requirement.
9. Avoid one-off CSS when a shared calculator/UI pattern already exists.
10. Main mode tabs and nested/secondary toggles must have a clear visual hierarchy.
11. Do not create standalone content pages when the central post/content architecture (`posts.js` + `post.html`) should be used.
12. Do not silently invent financial data, calculations or assumptions.
13. Keep calculations deterministic; handle invalid/edge inputs gracefully (no `NaN`/`Infinity` in the UI).
14. Avoid unrelated refactors during focused tasks.
15. Do not turn README.md into a changelog.

## Workflow for future AI/Copilot sessions

Start every session with: *"Read README.md and inspect the existing project structure/design before making changes."*

Then:

1. Inspect the relevant existing implementation.
2. Identify reusable components/helpers.
3. Make the smallest coherent change.
4. Test desktop and mobile.
5. Test dark and light mode.
6. For calculators, test deterministic math cases with known outputs.
7. Verify no unrelated behavior changed.
8. Summarize changed files and behavior.
