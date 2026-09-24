# Weekly publication and Discord distribution

## Canonical website process

The comparable publication is week 38: commit `db42e455` added the image review gate and manifest; it also contains the 1920/3840 WebP earnings derivatives. The current pipeline still uses:

1. Owner image review: dates, weekday placement, events/tickers and timing must agree with the intended ISO week. The image is evidence for its transcription, not independent verification of economic values.
2. `data/weekly-events.js`: macro events and earnings reports power the homepage and readable calendars. New macro image mappings use `fallbackImage`; earnings use `sourceImage`.
3. `week-pages.js`: earnings image/preview/fallback mappings and readable day-by-day transcription. Preserve existing weeks. The shared resolver selects the Stockholm current week, separates future/archive weeks and never substitutes an older week for missing data.
4. `data/weekly-artifacts.json`: hash the reviewed original and record the sorted event identities/dates/times or earnings tickers/dates/timing. Do not reset reviews merely to silence a mismatch.
5. Run weekly, coverage, browser and release validation. The deployment workflow updates macro values, then reruns the weekly gate before accepting data. An upstream change to schedule identities intentionally requires renewed review.

Week 39 macro dates are September 21–25, 2026. The supplied image has nine events Tuesday–Friday and no Monday events; its ET times remain `America/New_York` inputs to the existing Stockholm conversion. Actuals are absent. Forecast/previous values are explicitly manual image transcriptions, not API-verified values; global partial-fetch metadata is preserved.

The owner replaced the duplicated reports input with the correct Earnings Whispers image headed September 21, 2026. Its 20 ticker/session entries were checked column by column: Monday 1, Tuesday 6, Wednesday 7, Thursday 6, Friday 0. The original PNG is unchanged; its reviewed SHA-256 is `d3296ce6ab638185621c13b2fc58294556635bfd27684cc04cd7df466310f5cb`. The same 1920/3840 WebP derivatives, readable Swedish transcription, `earningsWeeks` records, page mapping and review manifest used by previous weeks are now complete. No issuer-level confirmation is implied by image transcription.

## Adapter boundary

`scripts/discord_weekly.cjs` reads the same mappings, structured records and reviewed PNG hashes through `check_weekly_events.cjs`. It does not scrape HTML, modify website data, regenerate images, obtain financial data or generate captions. Messages contain only a deterministic Swedish week/title and the original reviewed PNG. Mentions are disabled.

Incoming webhooks fit two fixed text-channel destinations without a bot. Multipart upload sends the actual artifact; `wait=true` requests a message acknowledgement. See [Discord Execute Webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook). No Discord request is made during preview or automated tests.

```text
node scripts/discord_weekly.cjs macro 2026-W39 --dry-run
node scripts/discord_weekly.cjs earnings 2026-W39 --dry-run
```

Preview outputs only `channel`, `week`, `text`, `image`, `identity`. Both examples now preview reviewed week-39 publications. Identity is `kind:ISO-week:original-PNG-SHA256`. Website field updates without an image change do not create another Discord post. A changed reviewed image creates a new version and requires a deliberate new send request.

## Owner setup (future, no live configuration applied by this task)

0. After separately authorizing the release, publish these local changes to `main` and complete the normal website release. The new workflow must exist on GitHub before it can be dispatched; this task did not commit, push or deploy.
1. In Discord, open each ordinary text channel (`#makro`, `#rapporter`) → Edit Channel → Integrations → Webhooks → New Webhook. Use separate incoming webhooks. Verify each selected channel. Do not paste URLs into source files, chats, issue bodies or logs. Forum/thread destinations are outside this first adapter.
2. In GitHub Settings → Environments, create `discord-distribution`. Require an owner reviewer and restrict deployment branches to `main`. If required-reviewer protection is unavailable for this repository/plan, keep live delivery disabled until equivalent owner control is in place.
3. Add environment secrets `DISCORD_MAKRO_WEBHOOK_URL` and `DISCORD_RAPPORTER_WEBHOOK_URL`, containing the corresponding complete `https://discord.com/api/webhooks/...` URLs. They are used only in the live job; previews have no secrets. Rotate a webhook in Discord if exposed. No bot token or frontend configuration is needed.
4. Before the first live send, create a separate repository branch named `ntm-distribution-state` and create its root `discord-ledger.json` with exactly `{"version":1,"publications":{}}`. This is one-time initialization, not part of website publication. Protect this branch against deletion, force pushes and casual edits while permitting the distribution job's Contents API writes. Never reset the ledger to empty after use. Do not merge it into `main`. The workflow's scoped `GITHUB_TOKEN` provides `contents: write` only in the live job; no personal access token is needed. GitHub records delivery-state commits only on this separate branch, never canonical website files.
5. Run **Preview or distribute reviewed NTM publications** from GitHub Actions, with the desired `kind` and ISO `week`, leaving `send=false`. Review the exact artifact/title/destination. There is no push/deploy trigger for this experiment.
6. Only after separate authorization for the first live test, set repository Actions variable `NTM_DISCORD_ENABLED=true`. Dispatch from `main` with `send=true`, inspect the preview, and approve the protected environment. For `#makro`, select `kind=macro`, `week=2026-W39`; for `#rapporter`, select `kind=earnings`, `week=2026-W39`. Dispatch and approve each separately. Confirm the correct image/title in each channel and a `sent` ledger entry before concluding the test. Setting the variable alone sends nothing. Set it back to `false` to disable delivery.

The workflow is independent of the website deployment. A failed Discord job cannot make website deployment fail or mutate its canonical data. Its live job independently requires a passing weekly publication gate. Preview establishes reviewed local publication eligibility; the owner should send only after confirming the intended website release is published.

## Durable deduplication and recovery

The adapter requires the existing ledger on every send. Missing/unreadable/malformed state fails closed. It reserves the identity using GitHub Contents API SHA compare-and-swap **before** posting. Concurrent jobs cannot both reserve it; workflow concurrency adds serialization. This survives fresh runners, reruns and deploy retries without relying on caches or expiring workflow artifacts.

The state writer uses the documented `branch`, Base64 `content` and existing-file `sha` fields in [GitHub's Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents). A failed/conflicting write stops delivery.

After Discord acknowledges a numeric message ID, the adapter saves `sent` and that ID. Future attempts skip it. If the process dies, Discord times out, returns an error/429, or the final ledger write fails, the durable reservation remains. Reruns stop for manual review; they never blindly repeat the POST. Errors do not print webhook URLs, headers or response bodies. Redirects are rejected. All requests have bounded network deadlines, not automatic timeout retries.

There is no atomic transaction across Discord and GitHub: an ambiguous delivery can require owner reconciliation. This deliberately prioritizes avoiding duplicates over automatic redelivery. Inspect the configured channel and ledger. If the post exists, mark that exact identity `sent` with its message ID. Only if non-delivery is established should the owner remove that one reservation to permit a new request; respect Discord's retry delay for rate limits. If uncertain, leave it reserved. Do not delete a sent message and expect rerunning to recreate it. Do not change destinations to bypass deduplication. Back up the ledger and preserve it when rotating webhooks.

Manual posts are not automatically discoverable. If the owner posts this week manually, continue manually or explicitly record the matching identity as sent before using the adapter for that same publication. No adapter can infer manual delivery from website data.

The same adapter now also supports text-only canonical news articles through `kind=news`; see [news publication and owner setup](news-publication-2026-09-24.md). Its workflow is now named **Preview or distribute reviewed NTM publications**. Weekly kind/week inputs, image review and identity behavior are unchanged. There is no Research or social-platform distribution framework here.

The reviewed-article path also supports `kind=education` for **#utbildningar**, with `DISCORD_UTBILDNINGAR_WEBHOOK_URL`. See [the education article, dry run and exact owner setup](education-publication-2026-09-24.md). It shares the protected environment and durable ledger; no second sender or ledger is introduced.

## Local validation, 2026-09-20 (completed reports publication)

- Full `scripts/validate_release.py`: **passed**, including all **167 Python tests**, **314 Node tests**, Knowledge/history, SEO, coverage, weekly review, rules, cloud security, diff check and isolated staging/local references.
- Browser smoke: **41/41 passed**, including earnings desktop/mobile, keyboard expansion, empty Friday and missing-data behavior. Additional workflow checks passed: social PostgreSQL/RLS, social browser, Wave 5 (4 tests), auth/session browser, accessibility/CSP quality browser and actionlint. These are local checks with mocked cloud services, not live-provider validation.
- All three prior `unregistered_image` Node failures are resolved without weakening the publication gate.
- Weekly gate passed for September 20, 21 and 27: current/future resolution, reviewed image hashes and structured schedules agree. Existing partial upstream and unavailable future-year notices remain unchanged.
- Added one earnings image-column/hash/resolution test and a desktop/mobile earnings browser test. The existing missing-data browser check now explicitly removes the published week as its missing-data fixture; it first verifies the real ABVX entry.
- Both week-39 Discord dry runs pass. No live Discord or GitHub state requests were made.

This continuation changed `data/weekly-events.js` (earnings only), `data/weekly-artifacts.json` (new earnings review only), `week-pages.js`, `tests/weekly-events.test.cjs`, `scripts/browser_smoke.py`, this report, and added `images/rapporter/week-39-1920.webp` / `week-39-3840.webp`. The replacement PNG was supplied by the owner and was not modified. Completed macro data and the Discord adapter/workflow remain unchanged.

**Readiness:** both week-39 publications pass the local release gate. The Discord foundation is ready for an owner-authorized first live test after the release and the setup above; destination credentials and the durable ledger are not configured by this task. Nothing was committed, pushed, deployed or sent.
