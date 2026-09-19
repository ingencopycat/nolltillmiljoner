# Knowledge Engine 100 — local owner review

Use a fresh browser context against `python -m http.server 8765 --bind 127.0.0.1`. Open `http://127.0.0.1:8765/fragor-svar.html`. No production account or private Research is needed. Do not mistake passing engineering checks for financial-content approval.

## Product walkthrough

1. Initial page: calm Fråga/Sök/Utforska; no full FAQ inventory. Open one category, then close it. Search `EPS`, `vinst per aktie`, `Makro`; clear and confirm keyboard focus returns.
2. Ask `Vad är P/E?`, `Vad påverkar P/E?`, `Vad är forward P/E?`. Confirm the exact intended reviewed question, not a related definition.
3. Ask `avkastning` and `avgift`. Choose a real question with keyboard. Ask `diversifering` and `EP`; the short acronym must not be guessed.
4. Ask the exact CAGR/total-return comparison. Read `fragor-svar-forward-trailing-pe.html`; inspect the comparison axis and caveat. Ask `P/E vs P/S`: Batch 1B now supplies its owner-approved comparison, with no universal winner. `P/S vs EV/EBITDA` still has no reviewed comparison.
5. Open the P/E form. Try 150/6 = 25, zero EPS, negative EPS, mismatched prose currencies. Ask `Aktien kostar 100 SEK och årlig EPS är 5 SEK, vad är P/E?`. Check the explicit basis and no investment verdict.
6. Ask `Är P/E 40 dyrt?`: Batch 1B now supplies contextual interpretation, never a yes/no valuation verdict or the basic definition. Ask `Ska jag köpa NVIDIA?` and an unrelated question: verify bounded abstention.
7. Inspect debt's interpretation/caveat and ISK's existing rule-registry notice. Sources and review dates should be understandable; inherited dates must not look like new independent review.
8. At 360/390/430 pixels and 200% text zoom, check search, choices, formula, long answers, comparison table and source depth. Use both themes, reduced motion and keyboard only.
9. In **disposable local** Research, change a field, open EPS help, follow the full answer in a new tab, close it, Escape the dialog. Confirm values and focus remain. Repeat Fundamental Profile help and Macro release help without losing calendar position.
10. In CAGR, GAV, FX, compounding, fees and ISK calculators, open “Förstå begreppen”; confirm canonical compact help and return focus without calculation changes.
11. In Academy start a disposable assessed attempt, then request Knowledge help. It must count as assisted practice before content appears. Navigating to a new attempt during loading must not leak the previous help into an independent attempt.
12. Inspect a synthetic Public Research fixture in the automated Wave 5/local browser package. “Förstå begreppen i rapporten” must be generic Knowledge, not an endorsement of the author or mutation of frozen source data.
13. Disable JavaScript: use a static category link, open an answer and its source disclosure. Answer URLs remain the existing slugs.

## Authoring demonstrations A–E

All examples under `docs/internal/knowledge/examples/` are **unpublished templates**, not new approved answers. Each has a sibling `.html` local preview. They reuse existing prose solely to show the data shape; do not publish them as duplicate answers.

| Example | File | What to inspect |
| --- | --- | --- |
| A: definition | `definition.json` | One intent, concept refs, short/full/caveat, source mappings |
| B: formula | `formula.json` | Approved `pe/1`, canonical field refs, 150/6 example and units |
| C: comparison | `comparison.json` | Axis from existing trailing/forward sentences plus limitations |
| D: interpretation | `interpretation.json` | Existing debt interpretation/unsuitable-case references |
| E: sensitive | `sensitive.json` | SE scope, applicable registry period, rule dependency/deadline |

To create a real draft, for example:

```text
node scripts/knowledge_editorial.cjs template definition my-new-question docs/internal/knowledge/answers/my-new-question.json
node scripts/knowledge_editorial.cjs validate
node scripts/knowledge_editorial.cjs preview docs/internal/knowledge/answers/my-new-question.json docs/internal/knowledge/my-new-question-preview.html
```

The preview command validates the candidate alongside the real catalog and refuses public output locations. For a draft already present in `answers/`, preview validation uses that entry rather than adding a second copy. Open the local HTML to inspect escaped text and source metadata; it is not deployed by staging.

For existing seeds, edit the specific entry in `catalog.cjs` and put explicit version/history/editorial/source overrides in that entry's final options object (the macro entry is already an object). Do not change the shared seed `date` constant. Legacy structural defaults now preserve these explicit overrides, including compounding/annual-fee metadata; accepted reviews are not reset to inherited/pending during generation.

Before review/publish:

- Replace the template prose and `UTKAST` question; keep one clear intent. Choose stable unique ID/slug and existing concept refs, or extend the small concept registry in `scale.cjs`.
- Check duplicate candidates and aliases. An interpretation/comparison is a separate answer when the question differs; do not broaden a definition's aliases to hide a gap.
- Map short/full/caveat sections to actual sources. Set authority/type, `supports`, `evidenceStatus: "checked"`, `checked` (what was verified) and `limitations`. Prefer primary sources; distinguish conventions, scope and uncertainty.
- Independently verify arithmetic, units, share basis, annual/TTM/forward period and the unsuitable cases. Additional executable formula templates require separate engineering validation; ordinary explanatory answers do not.
- Record the real owner/reviewer and actual review date. Set `editorial.approval: "accepted"`, `editorial.reviewer`, `editorial.reviewedAt` and matching `reviewedAt` only after that review. Sensitive new content also needs valid jurisdiction/period and review deadline.
- Choose `reviewed` for visible noindex preview content or `published` with an actual publication date for indexing. Run the validator, then `node scripts/knowledge_history.cjs --record-new` to register accepted new IDs. This does not approve content or reset old baselines/dates. Run the history audit, generator, benchmark and release gate. Inspect resulting pages and generated diff.
- For a later substantive correction, increment content version and append `{from,to,reason,reviewer,date}`. Update a review date only for a real review. Retrieval-only edits go in the separately versioned retrieval file.

Expected hard errors include malformed IDs/URLs, duplicates/collisions, unknown concepts/relations, unapproved formula, missing accepted evidence, unsafe merges, stale rule registry and changed prose without version/history. Maintenance warnings include inherited source gaps, unscheduled reviews and potential duplicates; they are not automatically “fixed” by inventing evidence.

## Decisions still owned by the editor

The engineering task does not approve new financial claims. Review the inherited 29-answer baseline independently, prioritize the source-mapping gaps reported in `docs/qa/knowledge100/editorial.json`, assign stable/methodology review cadence, and approve future interpretation/comparison additions before publication. The six Batch 1B scopes, including contextual P/E and P/E versus P/S, have explicit task-provided owner approval; see [the Batch 1B report](knowledge-batch1b-report.md) for evidence and bounded wording. Do not treat templates, synthetic scale fixtures or test expectations as reviewed content.

Raw-question intake remains unimplemented until consent, retention/deletion, access and moderation responsibilities are explicit. Real-user comprehension, screen-reader use and educational/editorial usefulness need independent human validation; scripted interaction is not evidence of learning.
