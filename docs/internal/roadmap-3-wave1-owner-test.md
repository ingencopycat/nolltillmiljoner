# Wave 1 owner acceptance and formative pilot

Status: **procedure prepared; owner content acceptance and external participant evidence pending**. Engineering automation is not a substitute for these results. Use only synthetic test work in a fresh browser profile; do not overwrite your normal private Research.

## Launch exactly this working tree

In PowerShell:

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
python -B -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/research.html?ticker=NVDA`. This serves the actual production files with `data/stocks/NVDA.json`; no seed/import, mocked stock response, build step, login or cloud setup is required. Use HTTP, not `file://`. Leave the terminal running. If port 8000 is occupied, use an unused port consistently. No changes are deployed by this command.

Other entry points:

- `http://127.0.0.1:8000/aktievarderingskalkylator.html`
- `http://127.0.0.1:8000/sparmalskalkylator.html`
- `http://127.0.0.1:8000/fragor-svar.html`
- `http://127.0.0.1:8000/fragor-svar-eps.html`
- `http://127.0.0.1:8000/fragor-svar-ranta-pa-ranta.html`
- `http://127.0.0.1:8000/fragor-svar-arlig-avgift.html`

The existing Public Analysis/account routes were regression-tested but are not Wave 1 pilot tasks. No account or publication action is needed here.

## Owner content review before claiming product completion

Review the 12-to-11 concept mapping in the [report](roadmap-3-wave1-report.md), the exact catalog records, and their linked sources. Confirm that:

1. Each short answer is appropriate in its mapped product context; EPS period and diluted share basis remain explicit.
2. `fees` remains brokerage/courtage; the new `annual-fees` answer handles annual percentage fees. `cagr` and `compounding` answer different questions.
3. Both valuation assumptions and falsification can use the thesis answer without implying that a prose criterion is automatically evaluated.
4. Independently recompute 100 × 1.10² = 121 and 100 × 1.07 × 0.99 = 105.93. The fee formula is the existing NTM convention, not a universal provider charging rule.
5. Existing examples/caveats retain their meanings; external sources support definitions, while synthetic examples are NTM illustrations.
6. The eleven existing-practice links are relevant. The compounding link intentionally uses the existing cost-timing application, not a newly invented lesson or mastery claim.
7. Review owner and proposed next review date (2027-03-18) suit actual maintenance capacity. Source-check dates are not silently advanced for old records.

Record reviewer/date, accepted IDs, corrections and decision in an owner-maintained acceptance note. `internalReview.acceptance` is currently `pending`. Changing it should follow actual review, not merely a green test suite. The two new answers remain `reviewed`/noindex and outside the sitemap; deliberate publication is a separate editorial decision.

## Reproducible functional walk-through

### A. Research → Knowledge → return

1. Open NVDA. Enter `WAVE1 OWNER UNSAVED — test reasoning` into “Vad tror jag?” without saving.
2. Set the Research valuation price to `123.45`. This is a manual scenario input, not a market quote.
3. Use “Förklara EPS” beside EPS. Check the canonical answer, caveat, version, review date and expandable sources/example.
4. Tab and Shift+Tab around the dialog. Focus must remain inside. Escape returns focus to the help button. The text and price must remain unchanged; no revision should have been created.
5. Open help again and choose “Läs hela svaret (ny flik).” The new tab explains how to return. Close it and continue in the original tab; do not navigate the original page to a new copy of Research.
6. Try refreshing the original after editing. The browser must warn about leaving. Cancel and confirm the unsaved work remains. If you explicitly accept leaving, this wave does **not** restore drafts; durable drafts belong to Wave 2.

### B. Research → valuation preview → explicit apply

1. In the original NVDA Research, use price `123.45`, displayed EPS `7.91`, Base EPS growth `12`, years `5`, Base final P/E `22`. Do not save a thesis or recalculate merely for transfer.
2. Click “Pröva Base i värderingskalkylatorn (ny flik).” Research stays open with its unsaved work.
3. Inspect all five values and USD in the destination preview. It identifies current editable inputs, manual/example/historical price, unknown quote date, NTM-derived versus manual EPS, source period/file date/method and unverified share basis where applicable.
4. Before apply, the destination's default price must remain `100` and currency `SEK`. Clicking “Använd dessa antaganden” without checking the confirmation must not change them.
5. Check confirmation, edit the destination price to `999`, and verify the checkbox resets. Check it again, then apply. Only the five Simple-mode values and currency become the previewed values; other modes are untouched.
6. Select “Beräkna.” The expected future price is approximately USD `306.68`: 7.91 × 1.12⁵ × 22. The UI's rounding follows the existing calculator.
7. Edit an applied input. The status must say the displayed transfer basis is the original basis and that current inputs differ. Recalculate explicitly.
8. Return to the original Research tab. Unsaved reasoning, price, Base growth/multiple and source state must be intact. No automatic save, private sync or publication occurs.
9. Open another transfer and choose “Avstå från överföringen.” Destination values remain unchanged. On a new transfer, wait 15 minutes or use the automated clock/expiry cases; an expired transfer cannot apply. A copied handoff URL in another fresh browser/tab without its session record is unavailable, not automatically fetched.
10. With EPS empty, zero or negative, transfer must fail visibly. An untouched fallback EPS when usable data is unavailable must not be passed off as a user-selected estimate. A supported manual EPS entered by the user stays labelled manual.

### C. Knowledge → existing practice

Open `fragor-svar-eps.html`, choose “Pröva begreppet i en befintlig övning,” and confirm the destination is `academy-activity-check-eps-0.html`. Opening a link does not award mastery or submit an answer. The source help/full-article flow should preserve the original Research tab if you arrived from there.

### D. Savings and independent valuation help

In savings, edit the monthly target/contribution assumptions, then open annual-fee and inflation help. Close via Escape and via the return button. Inputs and results remain unchanged. Open the concept disclosure for compounding. Repeat EPS/P/E help in standalone valuation with populated inputs and an existing result; help must not submit or recalculate the form.

## Desktop, mobile and assistive checks

Repeat A–D at desktop 1440 pixels and mobile 390/320 CSS pixels, in dark and light themes using the site's theme control. Check visible focus, readable wrap, touch targets, no horizontal overflow, dialog scrolling and the explicit new-tab notice. The automated tests cover these dimensions; the owner should additionally check a real touch device, browser zoom, forced colors, NVDA/VoiceOver reading order and new-tab return behavior. Do not record those manual checks as passed without doing them.

## Five-participant formative pilot

Recruit five consenting participants from the intended audience. Use synthetic values and no real private portfolio material. Before coaching, ask each participant:

> “You are examining NVIDIA. Write a short provisional view, find out what EPS means without losing it, try your chosen Base assumptions in the valuation tool, and return to continue your reasoning. Then find a relevant practice exercise.”

Record assistance separately. Afterwards ask them to identify: what was reported/derived, what was an example or manual assumption, whether the price was live, which five values transferred, whether anything was saved/published, and how they returned. Do not count guessing from prompts as independent comprehension.

| Participant pseudonym | Device/theme | Explain → apply → return unassisted? | Correct provenance interpretation? | Unsaved work preserved? | Practice reached? | Assistance/failure reason |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Pending | Pending | Pending | Pending | Pending | Pending |
| P2 | Pending | Pending | Pending | Pending | Pending | Pending |
| P3 | Pending | Pending | Pending | Pending | Pending | Pending |
| P4 | Pending | Pending | Pending | Pending | Pending | Pending |
| P5 | Pending | Pending | Pending | Pending | Pending | Pending |

Acceptance remains the roadmap criterion: at least four of five complete the specified journey without assistance and correctly distinguish example/manual/reported inputs; all automated boundaries pass and the owner accepts the content set. Any private leakage or silent overwrite blocks completion regardless of success rate. Store consent/identifying details outside the repository; report only redacted task outcomes. No participant result or owner acceptance has been fabricated by the engineering work.
