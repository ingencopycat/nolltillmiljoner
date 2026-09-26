# Research Wave 1 — publication QA navigation fix

26 September 2026

**Root cause:** `wave5_browser.py` reloaded CRWD into Översikt and clicked `#researchPublishBtn` inside the inactive, hidden/inert Din tes workspace. The old long-document assumption was wrong; publication was not orphaned. No production JavaScript, HTML or CSS changed.

The author test retains its saved/private fixture and all existing publication assertions. It now enters Din tes with the canonical workspace link using keyboard activation, checks publication visibility, writes an unsaved draft, visits Bolagsdata and returns by mouse. It verifies:

- inactive workspaces remain hidden/inert;
- navigation leaves saved storage byte-for-byte unchanged;
- the unsaved draft survives navigation and publication;
- publication contains the intended saved thesis, excluding the draft and private notes;
- explicit financial/chart selection and rejection of a changed private basis still work.

The QA audit extracted the existing visible-link/native-select navigator into `scripts/research_navigation.py`. Evidence, save/review, contextual-help and visual-capture scripts now enter the appropriate workspace/topic before interacting. KPI captures use Verksamhet while guidance captures use Rapport & utsikter; failure fixtures use the new explicit render slots. The old metrics toggle journey now uses the visible link to Finansiellt. Manual-only publication scripts remain unchanged because their controls are already visible.

The older review test now checks the actual `#researchSince` destination of its evidence link. Its decisions, immutable revisions and queue assertions remain intact. The leave-guard test traverses the new same-document history before testing Back out of Research. The shell equivalence test pins the pre-shell commit rather than assuming that `HEAD` still predates Wave 1.

## Validation

| Check | Result |
|---|---|
| Original Wave5 author case, before fix | Reproduced hidden-button timeout |
| Full `wave5_browser.py` | 4 passed |
| Offline publication/social browser | Passed, including explicit publication and privacy boundaries |
| Research shell navigation matrix | 210 viewport/theme/workspace cases passed |
| Research shell edge checks | Passed, including keyboard, source equivalence and manual-company history |
| Full browser smoke | 43 passed |
| Release validation | Passed, including evidence, security, staging and existing environment-dependent skips |
| Accessibility/CSP browser | Passed |
| Audited capital, insiders, ownership, segments, guidance/KPI and events QA | All passed |
| Evidence presentation, Sedan din analys and save QA | All passed |
| Existing roadmap Wave 1 / Wave 2 / Wave 3 / affected Wave 4 case | 7 / 9 / 7 / 1 passed; final Back-guard case also rerun successfully |
| Affected Knowledge tests | 1 Knowledge100 case, 3 Batch1B cases, 3 expansion cases passed |
| Updated visual captures/stress checks | Passed; 106 production stress/reflow/contrast states |
| Python syntax and `git diff --check` | Passed |

**Safe to push again based on local validation.** Hosted credential-dependent writes were not rerun. The production-origin save probe's navigation was updated but not executed against the live site. Generated screenshots/cache changes were discarded; existing QA artifacts were preserved. No force-clicks, visibility overrides, internal publication calls, product redesign, commit, push or deployment were introduced.
