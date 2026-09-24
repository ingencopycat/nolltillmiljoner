# Trump–Xi news preparation, 24 September 2026

Locally prepared; owner review/release and first live Discord authorization are separate. No commit, push, deploy or live delivery was performed. Instagram and the other excluded product areas were untouched.

## Canonical publication

- Headline: **Trump och Xi möts i Washington – AI, handel och Taiwan i fokus**.
- Source of truth: `posts.js`; generated URL: `post-trump-xi-washington-ai-handel-taiwan.html`.
- Existing `renderPostView` / `renderPostPreview`, `node scripts/build_seo.cjs`, archive, date sorting, homepage discovery, Article JSON-LD, canonical URL, Open Graph/Twitter and sitemap are reused. Attribution remains in the existing editorial note; no personal byline was invented. Publication date is the intended release date, 2026-09-24; this local file is not evidence of deployment.
- Structure: ingress, expected tech guests, agenda, previous meeting/current relationship, expectations, NTM investor context, closing perspective, dated sources and existing editorial note.
- The existing no-media return path is used with `media.type=none`; its empty article media wrapper is omitted. No supplied photograph was copied, modified or used. No replacement image was fetched or created. The existing NTM brand image remains in generic social metadata. Discord suppresses embeds and sends no attachment.
- Small shared renderer additions: attribute-free `h2` in the existing escaped markup allowlist and structured HTTPS source links with escaped titles/dates. Arbitrary content links, attributes and scripts remain disallowed.
- Two explicit existing relation-catalog connections: Nvidia Research and Macro. No extra promotion or forced cross-linking.

## Factual review

Access date for all article sources: 2026-09-24. Final program/truce recheck: 14:52 UTC / 16:52 Stockholm. The article is a dated preview of the talks, not a live outcome report. Recheck before a delayed owner release; do not silently advance verification timestamps.

| Claim | Evidence and treatment |
| --- | --- |
| Washington meeting and dinner on September 24 | [White House program, September 21](https://www.whitehouse.gov/briefings-statements/2026/09/first-lady-melania-trump-releases-details-ahead-of-his-excellency-xi-jinping-president-of-the-peoples-republic-of-china-and-madame-peng-liyuans-visit-to-the-white-house/). Described as official program, not proof of completed events. |
| Trade truce, May meeting, Taiwan, Iran, AI dialogue and minerals/export controls | [Reuters factbox via AOL, September 23, updated September 24 at 00:02 UTC](https://www.aol.com/articles/factbox-trump-xi-discuss-washington-210309000.html). January 10 extension attributed to Bessent's Wednesday announcement; year clarified as 2027. AI mechanism remains a proposal. |
| Guest list | [Reuters via Internazionale, September 23](https://www.internazionale.it/ultime-notizie-reuters/2026/09/23/china-s-xi-to-visit-washington-without-ceo-delegation-sources-say). Expected attendees, adding Cook and Zuckerberg to the five highlighted in the carousel. No claim that all are already present. |
| Limited breakthrough expectations, advanced-chip restrictions | [AP, September 22](https://apnews.com/article/e560910c897fedb0448eda4cdbfdbaea). Reporting distinguished from NTM's market explanation. |
| Same-day AI qualification | [Reuters via Economic Times, September 24](https://economictimes.indiatimes.com/tech/artificial-intelligence/trump-says-hell-discuss-ai-with-xi-but-wants-to-leave-it-exactly-where-it-is/articleshow/134462695.cms). Trump signalled retaining the status quo; his characterization of China's position is not treated as a joint decision. |

The White House and the Reuters AOL/Internazionale articles were readable in full. AP and Economic Times full-page retrieval was unavailable in the research tool; their indexed reporting supported the limited statements used, with the same-day AI statement additionally corroborated by indexed Bloomberg reporting. No unavailable source was represented as fully read. No summit agreement or market direction is asserted. No source images were downloaded.

## Discord owner setup

The existing `scripts/discord_weekly.cjs` and `.github/workflows/discord-weekly.yml` now accept `news`. Existing weekly previews and delivery behavior remain covered by regression tests. No second sender, ledger, environment or deployment trigger was created.

1. After reviewing the article and releasing through the normal website process, create an incoming webhook in **Discord → #nyheter → Edit Channel → Integrations → Webhooks → New Webhook**. Select the ordinary `#nyheter` text channel.
2. In the GitHub repository, open **Settings → Environments → discord-distribution → Environment secrets → Add secret**. Name it exactly **`DISCORD_NYHETER_WEBHOOK_URL`**, and place the complete webhook URL only there.
3. Keep the existing environment's owner reviewer and `main` branch restriction. If protection is unavailable, leave live delivery disabled until equivalent owner control exists. Reuse the existing `ntm-distribution-state` branch and root `discord-ledger.json`. If it has never been initialized, create it once with `{"version":1,"publications":{}}`, following [the existing setup/recovery guide](weekly-discord-publication.md). Never reset an existing ledger or merge that branch into main.
4. Open Actions → **Preview or distribute reviewed NTM publications**. Dispatch on `main`: `kind=news`, `week=trump-xi-washington-ai-handel-taiwan`, `send=false`. The existing input name `week` is retained for workflow compatibility; for news its value is the canonical slug. No preview secrets or network calls are needed.
5. Only for the separately owner-authorized live test, set the repository Actions variable **`NTM_DISCORD_ENABLED=true`**, dispatch the same inputs with `send=true`, review the preview and approve the protected environment. The sender verifies that the public article matches the prepared HTML before reserving or sending. Confirm the post in `#nyheter` and its `sent` ledger record, then return the variable to `false`.

Local preview (Node 22+):

```text
node scripts/discord_weekly.cjs news trump-xi-washington-ai-handel-taiwan --dry-run
```

On this Windows workstation Node is not on PATH. Equivalent PowerShell:

```powershell
& 'C:\Users\Mirne\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/discord_weekly.cjs news trump-xi-washington-ai-handel-taiwan --dry-run
```

Preview text:

> **Trump och Xi möts i Washington 🇺🇸🇨🇳**
>
> Handel, AI, chip, Taiwan och Iran präglar agendan den 24 september. Flera av techvärldens största namn väntas till statsmiddagen.
>
> **Vad står på spel – och varför bryr sig marknaden?**
>
> [Läs hela på Noll till Miljoner →](https://nolltillmiljoner.se/post-trump-xi-washington-ai-handel-taiwan.html)

This URL becomes available after the owner releases the article. Dry-run output has `image: null`; live payload has no files or embeds, `flags: 4` (suppress embeds) and `allowed_mentions.parse: []`, following [Discord's webhook API](https://docs.discord.com/developers/resources/webhook#execute-webhook).

## Review/version and recovery boundary

`docs/internal/news-distribution.json` binds the prepared canonical post and generated HTML with SHA-256 hashes. It records agent preparation, not fictitious owner approval. The protected environment approval is the owner's live authorization. If article content or generated markup changes, regenerate SEO, review the new content and deliberately refresh the corresponding post/HTML hashes; previews fail until those agree. HTML hashes normalize CRLF to LF for Windows/Linux checkout parity.

Identity is `news:trump-xi-washington-ai-handel-taiwan`. Editing the article does not create a new automatic send identity. Already-sent entries skip delivery; uncertain sends remain reserved for owner reconciliation. CAS reservation, kill switch, bounded requests, redacted errors, redirect rejection and no automatic retries reuse the weekly implementation. The public-page check fails closed for unavailable, redirected or changed pages. A provider outage is not a reason to bypass this gate.

## Validation and readiness

- Final `scripts/validate_release.py`: passed, 300 Python tests (1 skipped); Node 407 passed, 2 skipped, 0 failed (409 total). Generated SEO/schema/archive/sitemap, source rendering, security/CSP, Knowledge/history, calendar/rules, staging/local links and `git diff --check` passed. Existing partial macro-source and unpublished 2027 schedule notices remain unchanged.
- Existing `scripts/browser_smoke.py`: 42/42 passed. `scripts/quality_browser.py`: 41 pages passed accessibility/CSP checks at desktop/mobile in both themes. `scripts/check_workflows.py`: actionlint passed.
- `scripts/news_browser.py`: passed for article, dated sources, archive navigation, absence of article images, keyboard focus and CSP at 1440/390/320 pixels in light/dark. Desktop and mobile screenshots visually inspected. Theme-transition animations were disabled for captures. Evidence is in `%TEMP%/ntm-news-qa`; suite logs are `%TEMP%/ntm-news-release-final.log`, `ntm-news-browser.log`, `ntm-news-quality.log`, and metrics `ntm-news-quality.json`.
- Discord: 15 weekly/news tests passed with mocked network only, covering payload, unpublished-page rejection, source/page changes, kill switch, missing secret, dedupe/CAS concurrency, reservations, ambiguous failures and redaction. Final news dry-run passed with `image: null`; the renderer/security test also passed.

Website is locally release-ready for owner review at the stated factual cutoff. Discord news is locally ready for its first owner-authorized live test after release and configuration. Owner actions still required: editorial review, normal website release, webhook/ledger configuration as needed and separate live-send authorization. No image-rights blocker remains because the images are excluded. No live-provider delivery or GitHub environment configuration is claimed.
