# Wave 3 — owner acceptance and human pilot

18 September 2026. All human results below are **pending**. Automated clock fixtures prove software behavior only. They do not prove learning, seven days of real elapsed use, or successful human navigation.

## Launch this local build

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
python -B -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/academy.html` in a separate test browser profile. No build, login, provider or cloud configuration is required. Keep that profile, origin and port for the delayed visit. Do not clear its site data between visits. Stop the server with Ctrl+C. Test at 1440×1000 and 360×844, 390×844, 430×844, using the existing light/dark theme control. Allow the application calculator tab when deliberately requested.

Direct entries:

- `http://127.0.0.1:8000/academy.html#competency=per-share`
- `http://127.0.0.1:8000/academy.html#competency=valuation-return`
- `http://127.0.0.1:8000/academy.html#competency=real-fx`
- `http://127.0.0.1:8000/min-ntm.html`

## Owner content and rubric acceptance — before participant use

Read `academy-competencies.js`, the mapping and evidence rules in the companion report, and the existing canonical Knowledge objects. Check all 18 synthetic tasks, interpretation choices, units, tolerances and feedback. Recompute using the formulas below; compare with the independent constants in `tests/academy-evidence.test.cjs`.

| Competency | Owner checks |
| --- | --- |
| Company/per-share | EPS = comparable annual profit / average comparable shares. Original EPS is 3. Application asks percentage change, not absolute EPS. Growth in profit alone cannot establish growth per share. |
| Valuation | Terminal EPS = EPS × (1+growth)^years; terminal price = terminal EPS × PE; annual return = (terminal price / price)^(1/years)−1. No dividends, fees or tax. Application compares with the stated 10% target, never a guarantee. |
| Nominal/real/FX | SEK factor = asset factor × FX factor; real factor = SEK factor / inflation factor. Application asks 10,000 × real factor in SEK purchasing power. Savings uses zero contributions, zero fees, one year and real money mode. |

Accept or reject the pilot's version-1 rule explicitly: one correct novel practice without recorded help, one correct separately labelled application (help allowed), and a different correct check started at least 168 hours after the independent practice, without recorded help. A later eligible delayed failure changes the current recommendation while retaining earlier evidence. This rule is a product choice, not certification. Record reviewer, date, task/rubric versions, findings and acceptance. Do not change reviewed Knowledge status merely because these engineering checks pass.

## Owner mechanical rehearsal — separate disposable profile

1. Open each competency. Verify Introducerat, relevant existing lessons and canonical Knowledge. Read help before starting; no assessed attempt exists yet.
2. Start **Försök utan hjälp**, enter a number, open **Förklara med Knowledge**. The number stays present. Open the full answer in its new tab and close it. Submit; history must say help was used. Repeat with **Visa svaret och öva**. A correct repetition must not become independent evidence.
3. In a fresh profile, complete the first practice without help. Verify Övat and the separate evidence explanation. Start **Tillämpa i ett nytt exempel**. Do not use the mechanical answer key with pilot participants.
4. For valuation, open **Öppna syntetiskt kalkylatorexempel**. Enter 777 into the destination price. Attempt application without the checkbox: 777 must remain. Check consent, edit the price again: consent must clear. Deliberately check and apply: all listed fields and USD basis must match the preview. Click Beräkna. Closing the tab returns to the original live learning form. Opening/calculating alone must not mark application correct.
5. For real/FX, use both the FX and **Pröva köpkraft i sparmål** tabs. Verify labelled practice, explicit application, and real SEK capital in the savings calculator. Save the successful synthetic plan deliberately through the existing follow-up controls, reload, select that saved plan, and verify the original inputs/date/basis. No separate Academy plan manager exists.
6. Submit the application and inspect **Se vad du har gjort**. Tool use is labelled help, application is separate, and the earliest delayed date is visible. Min NTM offers one learning continuation in its existing lower learning section; investment reviews remain above it.
7. Use Tab, Space and Enter for opening a competency, numeric input, radio choices, help, consent and submit. Focus must be visible; help must retain typed values. Repeat at all three mobile widths in both themes. Test browser-back/reload warning during an unfinished attempt; an abandoned variant remains consumed rather than becoming novel again.
8. Export a test backup with old activity plus new attempts; import into another disposable profile. Existing XP, original event records and new evidence must survive. A same-ID conflicting record must be rejected. Never use private real participant data in an engineering fixture.

The automated command `python -B scripts/wave3_browser.py` exercises delayed success/failure using explicitly synthetic timestamps. Do not use it or DevTools timestamp edits as a participant result.

## Five-person immediate formative pilot

Recruit five consenting participants. Explain local storage, optional help and the limited pilot; collect no investment holdings, account credentials or private thesis prose. Assign anonymous participant codes and record only task outcomes with consent. Use a clean dedicated profile per participant and retain it for return.

Give this task, without identifying controls: “Choose one topic, learn what you need, try an example, explain its result, apply it in another example, and leave knowing when and where to return.” Include valuation and FX/savings across the five participants. Have participants identify which values are synthetic, whether a calculator result is a promise, and whether opening a calculator alone proves understanding.

Observe without coaching. Record the first point requiring assistance. Help used through the product is valid learning behavior and must be labelled; researcher navigation assistance is a usability outcome. Ask the participant to show the evidence behind the displayed state and resume from Min NTM. A wrong financial answer does not automatically mean the interface failed; distinguish navigation, explanation, arithmetic and evidence comprehension.

| Participant code | Competency/version | Device/theme | Workflow unassisted? | Help/reveal used? | Synthetic basis explained? | Next return understood? | Failure category | Consent for follow-up? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | | | | | | | | |

Immediate usability gate: at least four of five complete the application workflow without navigation assistance. Any silent overwrite, history loss or false independent evidence blocks acceptance even if four succeed. Record actual outcomes, not a percentage inferred from automated tests. If the finite two practice variants are exhausted, report that limit; do not coach a repeated answer into “novel” status.

## Actual delayed follow-up

Schedule the participant's return for **after the displayed earliest time**, at least seven real days after their qualifying independent practice. Do not adjust clocks or records. Participants without qualifying first evidence remain eligible for practice but cannot yet supply this delayed outcome.

On the same profile/origin, ask the participant to return through Min NTM or Academy, attempt the new delayed example before help, and explain the result. Record actual elapsed time, help/reveal, correctness, variant/version and assistance. Helped or wrong results remain useful evidence but are not independent delayed success. If an eligible later delayed check fails, verify that earlier success remains visible and the current state recommends review.

| Participant code | First qualifying date | Actual return date | Elapsed ≥168h? | New variant? | Help/reveal? | Correct? | Displayed state explained? | Follow-up action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | | | | | | | | |

Publish an internal pilot finding only after these events occur. Separate task usability from learning evidence and uncertainty. Poor delayed results call for improved explanation/practice before adding competencies. No population retention or durable mastery claim follows from five people. Owner acceptance, immediate usability and delayed evidence are three separate pending gates.
