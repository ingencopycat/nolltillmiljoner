# Wave 2 — owner and formative pilot procedure

18 September 2026. Engineering fixtures are synthetic. **Human evidence is pending.** This procedure does not authorize publication, deployment, account creation or collection of private investment details.

## Launch the exact local working tree

Run in PowerShell:

```powershell
Set-Location 'C:\Users\Mirne\Desktop\investment-site'
python -B -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/research.html?ticker=NVDA` in a fresh browser profile. The checked-in `data/stocks/NVDA.json` supplies Research data. No build, provider credentials, account or cloud configuration is needed. Keep the same origin, port and browser profile for the return visit. Do not clear site data between visits. Stop the server with Ctrl+C.

Use DevTools device mode for 360×844, 390×844 and 430×844, and a 1440×1000 desktop viewport. Choose both light and dark through the existing theme control. The review disclosure is **Granska din tes och fatta ett beslut**. The workspace is **Din tes**; history is **Versioner**. `min-ntm.html` owns the return queue.

## Owner rehearsal before recruiting

1. On NVDA, keep the visible example valuation. Explain that its price is an example, its observation date is unverified, and its output is a scenario. Enter a synthetic thesis, one assumption, an explicit falsification condition and one open question. Choose yesterday as the thesis/assumption review date. Save. Inspect the saved version and source links.
2. Change a sentence without saving. Leave for Min NTM, accepting the navigation warning deliberately. Open the local draft continuation. Confirm the saved thesis is still separate and the unsaved sentence is not silently applied. Restore; inspect the historical/manual valuation labels, calculate again if needed, and save deliberately. Repeat once with **Kasta väntande utkast**. Neither restore nor discard alone may add a saved revision.
3. Open **Att granska** in Min NTM. Expect one company item with grouped reasons. The chosen date is distinct from an open question with no deadline. Click **Granska tes**. The URL may carry company, public campaign context and `review=exact`; no revision IDs, reasons or private sentences belong there.
4. Read the frozen thesis, assumptions and questions. Open the changed-data and frozen-version links. Return to the review disclosure. Reload once: the exact target must still resolve, or visibly explain why it cannot. It must not silently select a different revision.
5. Keep the date/evidence checkboxes selected; leave the open question unselected. Write why the thesis still holds, optionally set a future date, and choose **Behåll**. Confirm a new version records the decision and the original version/snapshot remains unchanged. Return to Min NTM: reviewed evidence is quiet; the intentionally open question remains informational.
6. Open that remaining question. Deliberately check its acknowledgement and choose **Behåll** again. Confirm the question remains open in the historical record, while the same acknowledged question no longer creates attention. Acknowledgement is not an answer.
7. Repeat on separate synthetic theses for **Revidera**, **Stäng tes** and **Avstod**. Revidera opens the existing editor; only **Spara ny version** completes it. Close and decline preserve history and stay out of active attention. Explicit **Återöppna och revidera** followed by saving makes a new active revision. Reload a pending revision draft once before saving.
8. Pause a selected due reason until tomorrow. Return to Min NTM: it moves out of active attention, with a continuation to the paused work. Open it and use **Återaktivera bolagets pausade orsaker**. Confirm it returns without a new thesis revision. A pause applies only to the selected fingerprints, not future evidence. Review dates are rescheduled through the existing next-review field and saved decision.
9. From the review, follow the optional process/outcome link. Record an existing checkpoint only if useful. Confirm the original basis, dated/manual price and process-versus-result distinction remain visible. A profitable outcome is not displayed as proof of good reasoning.
10. Create a manual ticker such as `ACME`, then a manual company label. Repeat save → Min NTM → review. No SEC facts, live quote or automatic report answer should be invented. Manual labels remain private; the existing opaque manual-company key is the route identity.
11. In two tabs, open the same saved revision. Save a deliberate new version in one, then attempt a review/save in the other. The stale tab must block saving, retain the visible text for download and explain the discrepancy. For a queued link, save a newer revision or delete its source before following it; it must fail visibly.
12. Export a backup from Min NTM. Its notice excludes drafts/pauses. Importing it is a non-destructive merge of saved work and does not apply a draft. Importing changed history must not silently rebase an old draft. Full ticker deletion removes its local draft/pauses; full local deletion also removes companions. Checkpoints intentionally preserved by Research-only history deletion retain their established behavior.

Do not manipulate real private data for failure tests. Corrupt-store, quota, clock, expired target/draft, unavailable fetch and malformed schema cases are reproducible in `scripts/wave2_browser.py` and `tests/continuity.test.cjs` using disposable contexts. Run the automated tests for those boundaries instead of editing the owner's normal storage.

## Five-person formative pilot

Recruit five consenting participants; use synthetic companies and reasoning. Give the task, not the navigation instructions above: “Save a reasoned case with something you want to revisit. Leave. Return because that date or evidence deserves inspection, decide what to do, and leave the next step clear.” Do not teach the journal/reason architecture. A chosen date in the past is a labelled fixture for the first rehearsal, not a claim of actual elapsed use.

Record one anonymous participant code and coarse results only:

| Observation | Record |
| --- | --- |
| Save and leave | Completed / assistance / failed; failure step |
| Return reason | Participant explains the chosen date or changed evidence |
| Exact work | Correct company and frozen version; no silent substitution |
| Review | Inspects evidence and chooses keep/revise/close/decline deliberately |
| Original history | Participant can find the prior basis |
| Pending question | Understands intentionally unanswered versus acknowledged |
| Draft | Predicts restore/discard and local-only ownership |
| Price provenance | Distinguishes example/manual/reported facts and unknown quote date |
| Return queue | Resolved reason quiet; unresolved reason still understandable |
| Accessibility | Device, theme, keyboard barriers and assistance |
| Second return | Participant-chosen date, attempted/completed and reason for non-completion |

Do not retain thesis prose, personal amounts, company-specific private IDs or screen recordings without separate consent. Stop a session if work is lost or the wrong version is silently reviewed. Fix that defect before widening the pilot.

Acceptance remains at least **four of five unassisted completed journeys**, with no loss or incorrect version. Schedule a second relevant return opportunity for each participant; record actual results after it occurs. One immediate rehearsal does not establish retention. Open questions intentionally left pending are not automatic failures. Owner sign-off should state sample, assistance, failures, second-return evidence and limitations. Until then, label the human gate **pending**, even if engineering checks pass.

## Automated reproduction

```powershell
$env:NODE_BINARY='C:\Users\Mirne\AppData\Local\Programs\Python\Python314\Lib\site-packages\playwright\driver\node.exe'
$env:NTM_BROWSER_CHANNEL='msedge'
& $env:NODE_BINARY --test tests/continuity.test.cjs
python -B scripts/wave2_browser.py
```

The full command set and validation evidence are in [the engineering report](roadmap-3-wave2-report.md). Browser tests launch their own temporary localhost server and fresh browser contexts; do not substitute a signed-in production browser.
