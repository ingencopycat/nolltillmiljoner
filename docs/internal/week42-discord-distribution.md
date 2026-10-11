# Week 42 original-image distribution review

Prepared locally on 11 October 2026. **Nothing has been sent.**
The owner requested the original supplied images, including their differences
from verified website data. The exact selection is in
[week42-distribution.json](week42-distribution.json).

| Kind | Exact caption | Attachment | SHA-256 |
| --- | --- | --- | --- |
| earnings | Rapporter — Vecka 42, 2026 | images/rapporter/week-42.png | 5ce12d50988fba580ae2fbbf69559c9a6e0ec2470fc8130d5471f7da95dc8c41 |
| macro | Makro — Vecka 42, 2026 | images/makro/week-42.png | b32b977dd33567631e75b6eb6d713207b5848fd5e443b4ba2e4ec68bf8c92692 |

There are no additional cards, commentary, regenerated images or overlays.
Delivery identities are `earnings:2026-W42:<earnings hash>` and
`macro:2026-W42:<macro hash>`. The original attachment bytes are checked against
the manifest and the separately scoped owner selection. Website corrections do
not block this original-reference selection.

Network-free previews:

```powershell
node scripts/discord_weekly.cjs earnings 2026-W42 --dry-run
node scripts/discord_weekly.cjs macro 2026-W42 --dry-run
```

The mocked delivery tests verify exact captions and original PNG bytes, one send
per identity, no network in dry-run even when enabled, fail-closed mismatched
hash/scope/review, and retention of W39/W40/W41 ledger history. They never call
Discord or read/write the remote ledger. Existing webhook destinations,
`NTM_DISCORD_ENABLED`, the `discord-distribution` protected environment, owner
approval and the durable reservation ledger are unchanged.

## Exact GitHub Actions procedure

These local files must first be reviewed and made available on `main` by the
owner. This task does not commit or push them. In the repository, open **Actions →
Preview or distribute reviewed NTM publications → Run workflow**. Every input:

| Run | Use workflow from | kind | week | send |
| --- | --- | --- | --- | --- |
| 1. Earnings preview | main | earnings | 2026-W42 | false / unchecked |
| 2. Earnings live send | main | earnings | 2026-W42 | true / checked |
| 3. Macro preview | main | macro | 2026-W42 | false / unchecked |
| 4. Macro live send | main | macro | 2026-W42 | true / checked |

Run each preview first and inspect its caption, PNG path, hash and identity in
the preview job output. Request that kind's live run only after checking it.
Live delivery also requires repository variable **NTM_DISCORD_ENABLED = true**.
Each live run executes its own preview before the send job; approve the pending
**discord-distribution** environment deployment when GitHub requests owner review.
The workflow uses the existing earnings/macro webhook secrets. Do not replace
destinations or clear ledger entries. Repeating an already delivered identity is
suppressed by the ledger.

Local tests do not prove the current remote enable variable, secret configuration
or environment approval settings; none of those was accessed or changed.
