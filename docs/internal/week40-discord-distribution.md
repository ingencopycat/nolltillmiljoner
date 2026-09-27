# Week 40 Discord distribution

Owner decision, 27 September 2026: distribute the supplied original external
reference images unchanged. These images are not NTM's canonical verified dataset.
This decision supersedes the distribution restriction in the earlier
[website publication audit](../weekly-publication-2026-W40.md); no website data,
image bytes or public review manifest was changed.

The existing `scripts/discord_weekly.cjs` sender and `.github/workflows/discord-weekly.yml`
workflow are reused. `week40-distribution.json` records the owner's selection,
scoped to each kind, Week 40, image path and original SHA-256. This is approval of
the selected material, not authorization to send. Canonical review validation still runs.

## Preview

Open [the local attachment preview](week40-discord-preview.html) in a browser.
It loads the original files directly and shows precisely:

- `Rapporter — Vecka 40, 2026` with `images/rapporter/week-40.png` (Earnings Whispers).
- `Makro — Vecka 40, 2026` with `images/makro/week-40.png` (macro calendar).

No article, URL, embed or additional message text is sent. The local HTML is a
review aid, not a screenshot from Discord. The existing Actions preview prints
the JSON plan (caption, channel, image path and identity); it does not post a
preview message or upload an attachment to Discord.

Original SHA-256 values and duplicate identities:

```text
earnings:2026-W40:f74db50265a811f9ee668e225a15b94acffb7f284fbce7e67db95329b4918af4
macro:2026-W40:9ed0b10e3824b1c9467eff6f719ff1b65767e15adc8fc20ac413b7599b8bd1d0
```

## GitHub Actions: every input

These changes are local and uncommitted. They must be present on GitHub's `main`
before the following runs can use this selection. No commit, push or deployment
was performed in this task; no website deployment is needed for distribution.

Open the repository → **Actions** → **Preview or distribute reviewed NTM publications**
(`discord-weekly.yml`) → **Run workflow**. Fill every field as follows:

| Run | Use workflow from / Branch | kind | week | send |
| --- | --- | --- | --- | --- |
| Reports preview | `main` | `earnings` | `2026-W40` | `false` (unchecked) |
| Reports live send | `main` | `earnings` | `2026-W40` | `true` (checked) |
| Macro preview | `main` | `macro` | `2026-W40` | `false` (unchecked) |
| Macro live send | `main` | `macro` | `2026-W40` | `true` (checked) |

There is no separate slug, image, webhook, channel or caption input.
Run each preview first. Open its `preview` job → **Preview reviewed canonical artifact**;
compare its exact caption, channel, image and identity above and review the original
image. The step name is historical: Week 40 attachments are external references.

Only when ready for live delivery, start the corresponding `send=true` run.
It first runs the preview again. Live delivery requires all existing controls:
branch `main`, repository variable `NTM_DISCORD_ENABLED` equal to `true`, successful
preview and validation, and owner approval of the protected `discord-distribution`
environment. In the waiting run, use **Review deployments**, select that environment
and **Approve and deploy**. That GitHub button releases the Discord job; it does not
deploy the website. Leave existing reviewer rules in place. If the kill switch is
not `true`, the send job is skipped; this task did not change that variable.

The existing environment secrets `DISCORD_RAPPORTER_WEBHOOK_URL` and
`DISCORD_MAKRO_WEBHOOK_URL` select the same destinations as previous weeks.
No new secrets, channels or webhooks are required. Existing ledger
`ntm-distribution-state:discord-ledger.json`, reservation, SHA compare-and-swap,
concurrency and no-blind-retry behavior remain unchanged. A previously successful
identity returns `already_sent`; uncertain reservations require manual review.

## Validation performed locally

- 15 targeted Node tests passed: existing delivery protections, Week 40 canonical
  regression checks, exact captions and attachment payload/bytes, correct existing
  destination selection, isolated Week 40 identities, duplicate prevention and
  preservation of seeded Week 39 history in a mocked ledger.
- Both actual CLI `--dry-run` commands passed. A test replacing global fetch with
  a failure confirms dry-run has no network access even with the kill switch enabled.
- Weekly validation passed (existing partial-source/future-schedule notices remain).
- Original PNG hashes match the pre-existing review manifest; images decoded at
  3840×2160 (reports) and 740×1920 (macro). Local browser preview rendered both at
  desktop and 390px width; no horizontal overflow. Visually inspected original
  images and rendered preview. Discord's own thumbnail rendering was not exercised.
- Workflow file and environment gates were not changed. Remote environment settings,
  secrets and live ledger were not accessed or modified.
- Website files, canonical data, original images and Week 39 history were not changed.
  No commit, push, deployment, Actions dispatch or Discord send was performed.
