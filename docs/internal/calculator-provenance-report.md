# Calculator completion provenance correction

2026-09-20. Scoped to the reported homepage-to-calculator deployment assertion. No commit, push or deployment. Earlier uncommitted Research entry work was preserved.

## Root cause and reproduction

The homepage URL was correct. The canonical source allowlist already included `home`, and `CalcState.calculate()` already emitted only `{result: 'success'}` through `NTMEvents` after a successful calculation. No calculator-specific source parser or override was responsible.

The defect was initialization order:

1. `ntm-product.js` exposed `NTMEvents.emit` with an empty internal context. Its existing route/source/CTA normalization ran only inside `DOMContentLoaded`.
2. `script.js` constructed `CalcState` and attached calculator submit handlers immediately while the document was still loading.
3. A later script could delay `DOMContentLoaded` while the form was already usable. A successful early calculation therefore emitted a frozen event without `source`, `category`, `tool` or `cta`.
4. DOM readiness populated context for later events but could not repair the existing immutable completion event.

The original smoke journey passed under ordinary local timing even before this fix. Holding the later `ntm-ui.js` response while submitting the real calculator reproduced the failure deterministically at `document.readyState === 'loading'`:

```json
{"event":"calculator_completed","result":"success"}
```

After releasing the response, the baseline's landing/tool-open events correctly had `source: "home"` and `cta: "home_calculator"`, confirming that normalization was correct but late. The same experiment after the fix immediately emits:

```json
{"event":"calculator_completed","category":"tools","source":"home","tool":"compound","cta":"home_calculator","result":"success"}
```

[Before/after reproduction](../qa/calculator-provenance/reproduction.json) uses the baseline `HEAD:ntm-product.js` versus the working module. The actual failed hosted run's artifacts were not provided; this establishes a reproducible code-level cause of the reported assertion, without claiming inspection of that runner's timing.

## Smallest canonical change

Move the existing context initialization block out of the `DOMContentLoaded` callback so it runs synchronously when `ntm-product.js` loads. Keep DOM-dependent hooks and landing events in that callback. Reuse the normalization block unchanged; no duplicate helper, new analytics field, calculator-specific query handling, financial calculation change or submission behavior change was introduced.

## Provenance contract before and after

The intended contract is unchanged. It now applies to early completion events as well as post-initialization events.

| Entry | Canonical completion provenance |
| --- | --- |
| `from=home&via=home_calculator` | `source: home`, `cta: home_calculator` |
| `from=content&via=ai_reverse` | `source: content`, `cta: ai_reverse` |
| `from=instagram&via=assumption` | `source: instagram`, `cta: assumption` |
| Direct, no recognized search referrer | `source: direct_or_unknown` |
| Unknown/malicious `from` | `direct_or_unknown`, or `search` only via the existing recognized search-referrer rule |
| Recognized search referrer | `source: search`; raw referrer/query is never recorded |
| Unknown `via` | Omitted; the contract exposes only allowlisted `cta`, not raw `via` |

The emitter's existing closed field/value allowlists and immutable, bounded memory queue remain unchanged. The caller still passes only the literal success result. No input values, result amounts, free text, URLs or private data enter completion payloads. Unsuccessful/incomplete calculations still emit no completion.

## Files changed for this correction

- `ntm-product.js`: initialize the existing canonical context before calculator interaction can occur.
- `tests/calculator-reliability.test.cjs`: add canonical events to the optional test harness; two new tests exercise the real shared `CalcState`, provenance before DOM readiness, failed outcomes and exact private-data-free payloads.
- `scripts/browser_smoke.py`: add a delayed-script regression with real calculator submission. The original homepage/content journey assertions are unchanged. This file also retains earlier Research-task edits.
- This report and `docs/qa/calculator-provenance/`: reproduction and validation evidence.

## Focused coverage

The new browser test covers home, content, direct and malicious-query origins while holding a later script response. It checks invalid and incomplete submissions before a valid submission, exact completion payloads, preservation after DOM readiness, allowed CTA retention, and absence of entered values/private query text.

The new unit tests additionally cover Instagram, a recognized search referrer, untrusted `from=search`, prototype-like query values, callbacks returning failed/incomplete outcomes, and success objects containing private fields that must never be copied into events. Existing article-to-calculator, homepage-to-calculator, strict emitter privacy, content metadata and trust journeys remain regression coverage.

## Validation

All requested local gates passed. See [release/unit gate results](../qa/calculator-provenance/validation.json) and [browser gate results](../qa/calculator-provenance/browser-validation.json), with individual logs in the same directory.

| Gate | Result |
| --- | --- |
| Affected calculator and product/trust unit tests | 24 passed |
| Complete release validator | 167 Python and 303 Node tests passed; no skips |
| Complete `scripts/browser_smoke.py` | 39 passed, including the unchanged homepage/content journey and new early-completion regression |
| Social PostgreSQL/RLS | Passed |
| Social browser and persisted Auth/session browser | Passed using local synthetic services and the real SDK |
| Public Research V2/Wave 5 browser | 4 passed |
| Accessibility/CSP/payload browser suite | 41 pages passed |
| Workflow syntax/expression validation | Pinned actionlint passed |
| SEO/generated files, history/catalog, rules/calendar, disposable staging, local references and staged CSP | Passed through release validation |
| `git diff --check` | Passed |

These cover the executable local validation commands in the deploy workflow. Existing notices about partial macro updates and unpublished future schedules remain unchanged. Production account variables, hosted configuration and an actual GitHub deployment were not exercised. Test-generated changes to historical social screenshots were restored; prior working-tree edits were preserved.

**The previously failing browser assertion now passes unchanged locally, including under a deterministic delayed-script reproduction of the provenance loss.** No commit, push or deployment was performed.
