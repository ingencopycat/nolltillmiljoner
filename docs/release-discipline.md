# Quality / trust / release discipline

Implemented scope: B13, B22, B25, B26, B59, B61, B62, B64, B66, B77.
See calculator-quality.md, product-decision.md and architecture-operations.md.

## Local and PR gate

Install Python, Node, and `pip install -r requirements-browser.txt`; install
Chromium with `python -m playwright install chromium`. Run:

```text
python -B scripts/validate_release.py
python -B scripts/browser_smoke.py
python -B scripts/quality_browser.py --output /tmp/ntm-performance.json
python -B scripts/check_workflows.py
```

Windows: set NODE_BINARY to your Node executable, NTM_BROWSER_CHANNEL=chrome to
use installed Chrome, and choose a temporary output path appropriate to Windows.
The runner executes all Python and JS tests, SEO `--check`, calendar/rule checks,
temporary staging/local references and working-tree whitespace checks. CI also
checks whitespace against the PR base. It never generates source files or updates
data. Generated files are refreshed explicitly with `node scripts/build_seo.cjs`.
Workflow syntax/expressions are checked with actionlint 1.7.7, downloaded to a
temporary directory with pinned SHA-256 checksums (Windows/Linux x64). Its optional
shellcheck/pyflakes integrations are disabled; this is not a shell-script lint audit.

`validation.yml` runs on PR, manual dispatch and weekly schedule with contents:read
only, no saved checkout credentials, no secrets and no deployment. Artifact upload
stores public local performance measurements, not repository writes. Existing
browser-smoke workflow remains for compatibility with existing status checks.

Owner must enable branch protection/rulesets for main: require PRs and successful
`quality` plus `browser-smoke` checks, require branches up to date, resolve review
conversations, block force pushes/deletion. Require a reviewer where practical for
a solo owner; avoid an impossible self-review gate. Configure the bot's narrowly
scoped data-update path if protected-main rules reject the existing scheduled
`commit-data` push; do not grant ordinary validation write permissions or a broad
bypass. These settings have NOT been enabled by this work.

## Dated rules

`data/rule-registry.json` records sources, effective dates/year, verified dates,
review dates, status and exact parameters. Tests compare parameters with executable
constants. `check_rules.cjs` fails at review deadlines and on an unmaintained ISK
income year. Generated calculator notices show dates/source and warn at runtime
after the review deadline. The owner must re-read official sources, update
parameters and examples if needed, then advance review metadata. Never advance
dates just to turn CI green. ISK review is due 2026-12-01; mortgage 2027-01-01.
Rule dates and deadlines use Europe/Stockholm calendar dates.
No annual schedule can detect an unscheduled legal change; banks and individual
tax treatment still require manual review. Other future tax/regulatory assumptions
must be registered before they become maintained calculator logic.

## CSP and external input

GitHub Pages has no repository-configured response headers. The generator places
an enforcing CSP meta tag immediately after charset on every root HTML page.
Local scripts, exact inline-script hashes, Cloudflare analytics and the existing
TradingView widget host are allowed; no unsafe-inline/unsafe-eval for scripts.
YouTube/TradingView frames and YouTube thumbnails have explicit sources.
TradingView script/frame/logo hosts are permitted only on the homepage that loads
the widget; live integration checks inform these hosts, not broad wildcard domains.
Object loading and base tags are blocked. Required inline styles remain allowed
because the current UI/charts use inline style attributes. The policy does not
sanitize CSS or sandbox permitted same-origin/third-party scripts.

Meta CSP cannot enforce frame-ancestors or report-only/reporting headers. If a
header-capable host/proxy is introduced, move policy delivery there, add
frame-ancestors and evaluate reports before tightening. No header configuration
or complete security/penetration audit is claimed here.

`constrainPostMarkup` escapes all content before restoring only p/strong/em/list/br
and en/sv spans. It works identically in static generation and runtime, including
AI summaries. Links outside that markup are HTTPS-only, without credentials.
Curated `posts.js` is executable code and still needs review; CSP cannot make a
malicious same-origin script safe. Data URLs are limited to images by policy.
New content integrations must preserve this boundary, not bypass it with innerHTML.

## Accessibility and performance

Daily rows now have numbered percentage input/remove labels, including after
renumbering. Repeated annual/DCA inputs include their row context. The image
lightbox has a dialog name, initial focus, Tab containment, Escape and focus return.
Research uses a native dialog. Existing theme controls, native details, status
regions, reduced motion and visible focus styles are retained.

`quality_browser.py` checks seven representative pages in two themes at desktop
and 320 CSS pixels, control-name presence, menu Escape/focus and CSP violations.
The full browser suite covers forms, financial contrast tokens, equivalent zoom
reflow, local backup/dialog/history workflows and keyboard interactions. These
checks are not complete WCAG compliance: manual screen reader testing (NVDA/VoiceOver),
actual browser zoom, high-contrast/forced-colors, reading order and third-party
frame accessibility still need owner review.

The performance script writes a fresh-context localhost baseline: requests,
transferred/decoded bytes, assets by type and navigation timings. External requests
are listed and excluded for repeatability; browser-scheduled favicon requests are
excluded because their timing/cache behavior varies independently of page readiness.
Local resources settle before measurement; no unrealistic timing threshold fails
CI. Compare payload deltas on the same browser/environment. See performance-baseline.json
for recorded measurements. This does not measure real network compression, cache,
mobile CPU, LCP/INP/CLS field data or complete third-party costs. Owner should also
inspect the live homepage widget and click-to-play YouTube after publishing.
