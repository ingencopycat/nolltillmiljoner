# Architecture and operations decision record

Status: current boundaries recorded 2026-09-14. No framework migration proposed.

| Boundary | Current implementation / intended evolution |
| --- | --- |
| Public static | Plain HTML/CSS/JS tools, `posts.js` content, generated `post-*.html` SEO pages, public `data/stocks/*.json`, macro/calendar assets; GitHub Pages. |
| Private local today | `localStorage` holds theses, revisions, scenarios, outcomes and recent tools. `local-data.js` exports/imports the versioned backup. `thesis-storage.js` protects corrupt/unknown data. Review queue is already local (`research-review.js`, `min-review.js`). |
| Future private backend | Optional auth, opt-in cloud sync, private history, synchronized review queue and server-enforced premium entitlements. None exist today. Must preserve local ownership/export and define migration/conflict/deletion behavior first. |
| Data jobs | `update_stocks.py`, SEC client/normalizer and stock contract; `update_macro.py`, provenance and schedule coverage. These run offline/CI, not in the browser. Git versions public outputs; normalized schema/version metadata is not a full historical point-in-time price database. |

Valuation, charts, export, change detection and outcome comparisons run client-side.
The browser reads static fundamentals; it does not call SEC. Manual/example prices
are not live prices. No server receives private journals through these features.
Cloudflare analytics and third-party TradingView/YouTube resources are separate
public integrations; never add private values to their URLs or events.

Never put API secrets, auth signing keys, privileged data writes or entitlement
decisions in shipped JavaScript. Future backend authorization must be enforced
server-side, including object ownership on every private request. Secrets belong
in restricted GitHub job environments today and a backend secret store in future.
Public analytics IDs are not API secrets. No validation job receives data API keys.

Users own their local data and exported backups. Browser clearing, device loss,
private browsing and quota limits can lose local data. Encourage backups before
imports, browser changes or schema migrations; an on-device backup is not cloud
recovery. Never silently replace corrupt/unknown storage. Preserve raw recovery
data, surface errors, and keep the last valid saved record when a write fails.

Data failures should retain last verified data and show freshness/availability,
not substitute plausible numbers. SEC uses bounded retries; contracts reject
unsafe periods and share bases. Macro preserves partial-source provenance.
Outcome checkpoints use their recorded provenance; this is not a trading backtest.

Operations owner: repository owner. `deploy.yml` validates, prepares data, commits
only validated public data, builds a staged artifact and deploys Pages. Only
`commit-data` has contents:write; only `deploy` has pages/id-token write. Ordinary
PR validation has no deploy/data-update step. New validation workflow checks
release readiness weekly as well as per PR/manual run.

Enable GitHub Actions failure notifications and watch scheduled runs. The owner
must investigate failed SEC/macro updates and review overdue rule/calendar warnings;
there is no independent paging service. Failed required checks stop the pipeline,
but branch protection must be configured manually. Check the live site after a
release. Roll back site code through a reviewed revert; inspect data provenance
before rolling back public data. Never include users' local backups in artifacts,
issues, logs or git. Changes to private storage require migration/restore tests.
