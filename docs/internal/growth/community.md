# B54 — Manual Discord foundation

No server, channel, webhook, bot or outgoing message is created by this pack.
`community.html` remains the website destination and retains its existing invite.
Founder must verify invite validity and server ownership before promotion. Public
product value and private thesis storage never depend on joining Discord.

Start with six channels; use threads instead of splitting thin conversations.

| Channel | Purpose | Posting |
| --- | --- | --- |
| start-here | Purpose, rules, source/disclosure examples, website links, reporting route | Moderator-written |
| announcements | Published NTM content and material product/data corrections | Moderator-written; discussion threads |
| market-discussion | Source-linked market/macro questions; dated facts vs interpretation | Members |
| thesis-review | Voluntary redacted assumptions and counterevidence, process reflection | Members; no portfolio disclosures required |
| content-and-tools | Videos, calculators, questions and existing content discussions | Members; one thread per item |
| feedback | Reproducible tool problems and workflow feedback | Members; no local-storage dumps |

## Rules to pin

Discuss reasoning and evidence respectfully; no harassment, spam, impersonation,
pump coordination, guaranteed returns, referral spam or requests for brokerage
credentials. Members should not post personal financial identifiers, private
theses from others, holdings screenshots or paid transcripts without permission.
Moderators request redaction/removal when necessary; do not republish private content.

For factual claims include original source link, publication/report date, relevant
period and distinction between reported fact, estimate and interpretation. State
material ownership, employment, compensation, sponsorship or affiliate interests
when discussing a company/service. Disclose missing/uncertain information; no
fabricated citations. No individualized buy/sell instructions from NTM moderators.

Self-promotion: only relevant material in an existing topic with moderator approval,
clear affiliation and useful context. No unsolicited promotional DMs, repeated
link drops or hidden referral links. Paid promotion uses a separate disclosed
editorial policy and never grants immunity from moderation.

Founder is initial moderator; designate a backup before growing recruitment.
Provide a private reporting route in Discord after server setup. Remove obvious
spam/exposed personal data promptly; explain routine corrections, warn repeated
rule violations, timeout or ban persistent abuse, permit an appeal to a different
moderator where available. Keep only minimal incident notes privately. Review
moderation workload weekly; pause recruitment if it cannot be supported.

## Ritual and boundaries

Weekly 30-minute thesis-review thread: one voluntary redacted premise, original
assumption, dated new evidence, what remains unknown and next review criterion.
Founder rotates examples; no automatic quality score or returns contest. Monthly
reflection: what was actually revisited, forgotten or changed? Discuss every new
NTM content item in its existing thread. Stop rituals with no useful participation
after four attempts and ask what task members actually need.

Website owns durable tools, public provenance, corrections, learning content and
local personal workflows. Discord owns optional discussion, feedback and voluntary
peer critique. Move reusable public answers to the website only with consent and
editorial/source review; never copy private user research automatically.

## Connected Experience compatibility

Reuse `ntm-relations.js` entity `type: community` with local `community.html` URL.
Existing content `id`, `type`, `url`, `distribution.category`, `shareTitle`, `summary`
can feed a future manual preview. Route published content/video to
`content-and-tools`, release/correction announcements to `announcements`, and a
curated discussion relation to a thesis thread only when substantively relevant.
Ticker tags describe public content, never member holdings. Planned entities with
null URLs stay suppressed. Do not add Discord URLs to every tool or duplicate CTAs.

Future distributor contract: public entity ID + canonical public URL + sanitized
public title/summary + channel category + editor approval; deduplicate by entity
ID/version. Channel IDs and webhook credentials belong in a future backend secret
store, never relation metadata or public JavaScript. No notification adapter is
enabled. A manual copy/paste preview and link to the website is enough today.
