# Aktier och fonder — article and education distribution

Title: **Aktier och fonder – vad är skillnaden?**

Canonical publication path: `post-aktier-och-fonder-vad-ar-skillnaden.html`, generated from `posts.js` by `node scripts/build_seo.cjs`. This is local release preparation, not confirmation that the public URL is live.

## Editorial and presentation

The native Swedish introduction covers share ownership, price changes/dividends, fund mandates and types, diversification, a six-part comparison, costs and combining shares with funds. Beyond the carousel it explains that a successful company need not have a rising share price, distributions can stop, funds can concentrate/overlap, index and active management differ, ETF purchases can incur brokerage, and ongoing fees reduce the capital available for future returns. No allocation or specific product is recommended.

The comparison is a semantic definition list: each term has separate labelled descriptions for stocks and funds. It uses three columns on wider screens and a single readable sequence below 600px. The shared article formatter allows only attribute-free `dl`, `dt` and `dd` in addition to its existing safe tokens. Text is escaped before formatting; arbitrary attributes remain escaped. Styling uses existing V3 fonts and colors.

The article uses the existing no-image presentation, category filter, cards/listing, Article schema, canonical URL and sitemap. The existing brand social fallback remains; none of the six supplied images was copied, modified or published. Instagram is untouched.

The existing relation catalog links to the published Academy lessons `academy-aktier.html`, `academy-fonder.html` and `academy-diversifiering.html`. These offer the relevant next step without extra Knowledge/tool promotions or invented destinations.

Verification sources, also recorded in article metadata (accessed 2026-09-24):

- [Finansinspektionen: Investera i aktier](https://www.fi.se/sv/for-konsumenter/spara/investera-i-aktier/).
- [Konsumenternas: Olika fondtyper](https://www.konsumenternas.se/sparande--pension/sparande/fonder/olika-fondtyper/).
- [Konsumenternas: Avgifter i fondsparande](https://www.konsumenternas.se/sparande--pension/sparande/fonder/fondavgifter/).
- [Finansinspektionen: Avgifters effekt över tid](https://www.fi.se/sv/publicerat/nyheter/2026/fondavgifter-kan-kosta-dig-hundratusentals-kronor-pa-sikt/).

The source list distinguishes retrieval dates from known publication dates; undated informational pages do not receive invented publication dates.

## Distribution and dry run

`scripts/discord_weekly.cjs` now shares its reviewed-article adapter between `news` and `education`. Education binds category `Utbildning` to destination `utbildningar` and environment secret `DISCORD_UTBILDNINGAR_WEBHOOK_URL`. It uses the existing sender, protected workflow, kill switch, durable ledger, reservation before POST, duplicate protection and uncertain-delivery handling. The published page must match the reviewed generated HTML before any reservation or send. Cross-destination substitutions fail.

`docs/internal/education-distribution.json` pins the exact canonical post and generated HTML hashes. Article edits require a fresh editorial review and updated pins; changing text does not bypass the stable `education:aktier-och-fonder-vad-ar-skillnaden` ledger identity. No ledger initialization, reset, credentials or live delivery occurred here.

Dry run:

```text
node scripts/discord_weekly.cjs education aktier-och-fonder-vad-ar-skillnaden --dry-run
```

Verified output: destination `utbildningar`, `image: null`, stable identity above, and this compact text/link payload (mentions and automatic embeds are disabled):

> **Aktier eller fonder – vad är egentligen skillnaden? 📚**
>
> Vad äger du när du köper en aktie? Hur fungerar en fond? Och måste man välja mellan dem?
>
> Vi går igenom grunderna, skillnaderna, avgifterna och varför riskspridning spelar roll.
>
> [Läs hela guiden på Noll till Miljoner →](https://nolltillmiljoner.se/post-aktier-och-fonder-vad-ar-skillnaden.html)

## Exact owner setup — future, separately authorized delivery

1. Release the reviewed website/code changes through the normal NTM workflow first. Confirm the canonical article is public. Nothing in this task commits, pushes or deploys it.
2. Discord: open **#utbildningar → Edit Channel → Integrations → Webhooks → New Webhook**. Confirm that webhook's destination is **#utbildningar** and copy its URL privately.
3. GitHub repository: **Settings → Environments → discord-distribution → Environment secrets → Add secret**. Name: **`DISCORD_UTBILDNINGAR_WEBHOOK_URL`**. Value: the complete incoming webhook URL. Keep this environment restricted to `main` with an owner required reviewer. Do not put the URL in source, logs, frontend configuration or repository variables.
4. Reuse the existing `ntm-distribution-state` branch and root `discord-ledger.json`; never reset an existing ledger. If the original distribution setup has not yet been completed, initialize it once using the procedure in [the shared distribution guide](weekly-discord-publication.md). Missing or invalid ledger state blocks delivery.
5. GitHub **Actions → Preview or distribute reviewed NTM publications → Run workflow**, branch **main**: **`kind=education`**, **`week=aktier-och-fonder-vad-ar-skillnaden`**, **`send=false`**. Despite its legacy name, `week` takes the article slug. Inspect the exact text, canonical link and destination. Preview needs no Discord secret and makes no delivery request.
6. Only after separately authorizing live delivery: **Settings → Secrets and variables → Actions → Variables**, set repository variable **`NTM_DISCORD_ENABLED=true`**. Run the same workflow from **main** with **`kind=education`**, **`week=aktier-och-fonder-vad-ar-skillnaden`**, **`send=true`**. Review the preview and approve the **discord-distribution** environment. Verify the channel message and `sent` ledger entry. Set `NTM_DISCORD_ENABLED=false` to disable further live requests.

If delivery is uncertain, retain the reservation and reconcile the channel/ledger using the shared recovery procedure. Do not blindly retry or create a second identity. An already-sent identity is skipped.

## Validation and readiness

- `validate_release.py`: passed. Python: 311 tests, 310 passed and one optional PostgreSQL-engine skip. JavaScript: 417 tests, 415 passed and two optional database skips. Existing skips were not changed.
- Full `browser_smoke.py`: all 43 tests passed in Chromium 151.0.7922.34, including the new article test and existing publishing journeys.
- Comparison layout: checked at 360, 390, 430 and 1440px in dark/light; six semantic terms/twelve labelled descriptions, no horizontal overflow, correct stacking, visible keyboard focus and real Academy destinations. Screenshots were visually inspected; local artifacts are in `%TEMP%/ntm-education-qa`.
- Practical accessibility/CSP check on the new article: passed at 320/1440px in both themes, including named controls, mobile menu keyboard/focus restoration, reduced motion and no CSP violations. This is the repository's practical browser check, not a claim of exhaustive accessibility certification.
- Article/SEO/schema/listing/sitemap/internal links, generated outputs and staged-site references: passed. Source pages with unknown publication dates render without undefined metadata.
- Education dry run, isolated channel mapping, changed/unreviewed source/page rejection, disabled/missing secrets, unpublished-page rejection, pre-send reservation, idempotency, concurrent workers and ambiguous delivery: passed. All simulated sends used injected mocks; no real Discord POST or GitHub ledger write occurred.
- Actionlint 1.7.7, working-tree/staged-site secret/security checks and final `git diff --check`: passed. Existing unrelated macro partial-update/future-schedule notices remain.

Locally release-ready. Public website release, webhook/ledger setup verification and separate owner live-send approval remain external prerequisites. No commit, push, deploy, Instagram change or live Discord send was performed.
