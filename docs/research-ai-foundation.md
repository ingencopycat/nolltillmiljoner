# Research AI foundation: B44–B48

Status: repository/product foundation implemented; **live AI is disabled**. No model SDK, API key, endpoint, recurring service, chat or paywall is installed. Financial calculations and storage contracts are unchanged.

## Architecture and provider contract

`research.js` supplies the explicitly selected saved revision and current normalized company data to `research-ai-ui.js`. `research-ai.js` builds a task-specific version-1 request using `NTMResearchSnapshot` and `NTMChangeDetection`. It never calculates deltas. The interface is `createProvider(config) -> { mode, async generate(request) }`. Disabled and unknown provider configurations return `{status: 'unavailable', message}` without touching the request or network. Only `{mode:'mock', environment:'test'}` selects the deterministic adapter. There is deliberately no live registration path yet.

Production UI remains unavailable even with a mock flag on a public hostname. Browser tests explicitly inject `window.NTM_AI_TEST_MODE=true` before load on loopback. This is a test switch, not an authentication boundary. Outputs and the panel say TESTDEMO; no mock is represented as real AI. The adapter has no storage, network or analytics dependencies.

## Workflows

- **B44:** revision summary, assumptions and falsification criteria plus existing exact changes, unchanged comparable values, unavailable comparisons, report periods, provenance and new filing metadata. The existing >1% metric and >0.5 percentage-point margin thresholds define “no meaningful change”; the model does not choose these thresholds. A zero or negative baseline retains Change Detection's deterministic treatment.
- **B45:** fixed review questions ask for measurement, evidence, falsification, uncertain dependencies and missing risks. They never recommend an investment action. The template can provide a starting point for a criterion, but does not invent a company-specific risk or claim.
- **B46:** only metrics explicitly matched to selected assumptions/falsification text or pre-report questions are included. Report questions remain unresolved: metric relevance is not proof that a question has been answered. Missing data stays unavailable. New filing links are for manual inspection, not a generic earnings summary. Unknown vocabulary, gross margin (not currently provided by the shared comparison module), and implicit relationships are intentionally not inferred.
- **B47:** deterministic metadata rules identify currency, period type/date, definition, share basis, restatement/split and provider differences. Definitions retain their original metadata; a rule never guesses a numerical reconciliation. Unknown differences abstain: “NTM kan inte avgöra varför uppgifterna skiljer sig.” These explanations and the existing comparability gate reasons are available in Research even with AI disabled. Missing data is not asserted to be a source disagreement.
- **B48:** versioned frozen evaluation cases and executable pass/fail expectations cover growth, decline, negative EPS, absent FCF, share basis, currencies, restatement, missing source, unsupported/manual cases, vague assumptions, contradictory claims, unchanged data, hostile source instructions, unsupported facts, missing citations, confidence, wrong assumption mapping and recommendation leakage.

## Structured output and grounding

The output has `version`, `mode`, `status`, `summary`, `evidence_items`, `affected_assumptions`, `questions_to_review`, `unresolved_questions`, `suggestions`, and `limitations`. Each company-data statement has an evidence ID, metric ID, source ID and limited confidence. Request evidence resolves these IDs to before/current values and periods, deterministic change, before/after definitions and provenance, SEC accession references and a validated SEC source URL. Expand “Varför säger AI detta?” to inspect this evidence. Citations are joined by ID, not invented by the renderer.

The current validator is intentionally a **closed template grammar**: every field must exactly equal the deterministic result allowed by the request, within the output byte limit. Changing any claim, confidence, mapping, status, citation or recommendation fails validation. This is a narrow mock safety foundation, not a claim that arbitrary future model prose can be verified by string matching. A future live adapter must implement a reviewed structured claim schema and semantic validation; it cannot bypass the current gate.

## Privacy, injection and approval

Request construction allowlists fields. It excludes revision IDs, user identifiers, other theses, backup contents, unrelated notes, stored answers, valuation inputs, price assumptions and analytics IDs. Challenge does not receive financial evidence or report metadata. Report receives only matching metrics. The exact payload is inspectable locally in mock mode; it is neither persisted nor logged. No response cache exists.

The request policy treats all thesis/import/source text as untrusted data, never instructions. Document extracts are deliberately empty: future licensing and source handling are unresolved. Tests also inject hostile documents directly into the adapter request and hostile thesis summaries. The fixed grammar never executes or follows this text. Rendering uses textContent, not HTML; external source URLs are restricted to HTTPS SEC hosts. This prevents execution, but is not a substitute for future live model adversarial testing.

No output writes a thesis, assumption, report answer, lifecycle state, revision or valuation input. “Använd som utkast” explicitly accepts a suggestion into a separate editable text area. Users can edit/copy into the existing thesis form and save normally. Selecting a revision clears results/drafts; a generation token discards stale async results. No automatic review queue is introduced.

## Cost controls and future activation

Current preparation: 24,000 UTF-8 context bytes, 16,000 output bytes, ten test requests per adapter per UTC day and zero monthly live budget. Errors, oversized input/output, exhausted test quota and unsupported providers fail gracefully. Byte limits are not token estimates. The mock quota is memory-only, resets on reload and is **not** a production per-user limiter.

Before enabling a live provider, the owner must explicitly authorize it, implement a server-side adapter with server-held secrets, configure a budget above zero, add authenticated persistent per-user/day quotas, global atomic monthly accounting, provider token/output caps and timeouts, cancellation, rate limits and cost alerts. Show the exact minimized data to the user and obtain the applicable activation consent before transmission. Enforce the frozen evals plus provider-specific adversarial/semantic evals before rollout; retain a kill switch and unavailable fallback. Do not put keys in static JS. No current provider pricing is assumed.

A future PUBLIC cache may key only public source versions + metric/definition/method/period versions and task/schema version. Private thesis-conditioned requests and responses must never share a cache across users; they cannot be treated as public merely because the source metrics are public. Current code caches nothing.

Possible packaging hypothesis only: Free could include limited challenges or monthly explanations; Pro could include higher review limits, report relevance, deeper history or a review queue. No packaging decision, entitlement or paywall is implemented.

## Evaluation and validation

`tests/fixtures/research-ai-evals-v1.json` is the frozen v1 case library. Do not silently replace expectations for a new provider: version additions and review regressions. `tests/research-ai.test.cjs` executes cases and mutation attacks; `scripts/browser_smoke.py::test_research_ai_foundation` covers real UI, disabled state, all three actions, evidence expansion, no network activity during mock actions, unchanged persisted history, explicit editable draft, keyboard, 320/375/1440 widths and themes. `scripts/quality_browser.py` checks accessibility and enforcing CSP across the existing 12-page matrix.

Run `python -B scripts/validate_release.py`, `python -B scripts/browser_smoke.py` and `python -B scripts/quality_browser.py --output <temporary-json>`. Node may be supplied through `NODE_BINARY`; an installed browser may be selected using `NTM_BROWSER_CHANNEL=msedge`. See the implementation report for this run's actual results.

## Limitations

The foundation is complete for the disabled/local deterministic product layer, not for live semantic AI. It does not interpret licensed documents, identify novel risks, answer report questions, infer causality, reconcile contradictory sources or validate arbitrary generated prose. Keyword mapping is conservative and may miss relevant assumptions; users must inspect the mapping. Existing provenance limitations block comparisons rather than backfilling history. No provider can be enabled just by adding a key; the activation work above remains required.

## Implementation report — 2026-09-14

1. B44 uses saved revision + shared structured diff/comparability, with exact evidence and unavailable comparisons.
2. B45 supplies measurement/evidence/falsification/dependency/risk questions and optional explicitly accepted draft text.
3. B46 filters metrics by explicit assumption/question terms; answers remain unresolved and unavailable values remain absent.
4. B47 exposes deterministic conflict explanations without a provider; ambiguous conflicts abstain without reconciliation.
5. B48 has 20 frozen named cases, a frozen normalized baseline independent of future stock refreshes, output mutation rejection and three additional domain/provider tests.
6. Provider interface is isolated in `research-ai.js`; no live implementation or SDK exists.
7. Disabled production; loopback plus explicit test injection enables clearly labelled deterministic mock output.
8. Evidence expansion resolves metric/source IDs to periods, provenance, accession references and source links.
9. Task-specific allowlists exclude unrelated private data; payload previews remain local and no cache exists.
10. Untrusted text is data, document ingestion is absent, hostile input cannot alter fixed output grammar, rendering uses textContent and safe source URLs.
11. A separate editable draft requires a user click; no writes to thesis/history/valuation occur.
12. Byte limits and a test quota exist; zero live budget and required server-side future controls are documented above.
13. Changed files: `research-ai.js`, `research-ai-ui.js`, `research.html`, `research.js`, `scripts/stage_site.py`, `scripts/browser_smoke.py`, `tests/research-ai.test.cjs`, `tests/fixtures/research-ai-evals-v1.json`, `tests/fixtures/research-ai-baseline-v1.json`, `docs/research-ai-foundation.md`, `README.md`.
14. Added 23 AI/evaluation tests and one integrated browser flow. Existing financial and Research tests retained.
15. Browser flows executed: production disabled state, all three local mock actions, evidence expansion, no action network calls, untouched persisted history, explicit draft acceptance/editing with keyboard, mobile widths 320/375 and desktop 1440, light/dark. Full browser suite also covers existing Research/history and security flows.
16. Validation: 149 Python tests passed; 152 JavaScript tests passed including 23 AI tests; 29 browser tests passed on Edge Chromium 153.0.4234.32. Accessibility/CSP matrix passed for 12 pages. SEO artifacts current; rule/calendar checks, isolated staging/local references and git diff --check passed. A common private-key/API-token pattern scan of tracked text and new runtime modules found no matches. This is a pattern scan, not a guarantee against every secret format. Existing macro notices remain: partial upstream data and unpublished 2027 schedules. Playwright bundled Chromium was unavailable; installed Edge worked. The frozen-baseline follow-up reran all 23 AI cases and the AI browser flow successfully.
17. Remaining limitations: deterministic templates, conservative keyword relevance, no document interpretation, no novel risk inference, no automatic report answers, no arbitrary-prose semantic validation, and no production quota/budget backend. These are explicit activation prerequisites, not enabled functionality.
18. B44–B48 are complete as a repository/product foundation with mock/disabled adapters. They are **not live AI features**. Nothing was committed or pushed.
