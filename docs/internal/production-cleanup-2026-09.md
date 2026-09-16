# Production cleanup and Work Audit 2.0 notes

## Macro homepage priority

The collapsed homepage shows three events. Stable indicator IDs for central-bank policy decisions rank first, then CPI, PCE, payrolls, unemployment and GDP. Other events use the feed's structured `priority` (`high`, `medium`, `low`). Equal-ranked events retain chronological order. The disclosure contains every remaining event and its label uses its actual item count. The full macro calendar keeps its own chronological view.

## Knowledge coverage workflow

“Fråga NTM” matches only the 26 public reviewed entries in the canonical Knowledge catalog. It uses exact questions, aliases and concepts before conservative title matching. An unmatched question is answered with an abstention. No query text is sent to analytics or any model. Missing coverage is identified through voluntary, privacy-safe user feedback rather than logging arbitrary query text. Owner workflow: real user question → owner/ChatGPT draft → source and editorial review → Knowledge Bank → optional Academy or Instagram material.

## Email and contact

Subject: **Din inloggningskod | Noll till Miljoner**. Use [email-otp-template.html](accounts/email-otp-template.html) as the exact HTML template and [email-otp-template.txt](accounts/email-otp-template.txt) as the plain-text wording. In the hosted Supabase project, open Authentication → Email Templates → Magic link / OTP, set the subject and paste the HTML. Keep `{{ .Token }}` intact, save, then request a fresh code and inspect desktop and mobile email clients. Supabase sends through the already configured transactional SMTP provider; no paid Resend feature or new integration is required. The plain-text wording is supplied for any provider or client path that supports a text part. Verify the actual delivered fallback before claiming it is present.

Owner references: [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

The proposed public mailbox is **kontakt@nolltillmiljoner.se**. Once the owner configures it, place it on the website contact/about surface and Instagram contact field. Keep authentication delivery at **noreply@nolltillmiljoner.se**. The contact mailbox should receive ordinary feedback and business messages, not OTP replies. Use spam filtering, limited access, retention rules, and avoid asking senders for sensitive financial or account information. Mail hosting and credentials remain an owner task.

## First-user feedback for Work Audit 2.0

1. A user reported that Research analyses could not be published. The current flow requires a saved version, explicit private cloud sync, and an active public profile. The account page previously hid publication for accounts with no profile. Review the deployed flow with a normal account after release; successful local tests alone do not prove hosted publication.
2. A user requested future AI counterarguments and risk challenges to an investment thesis, plus a debate/defense interaction. Evaluate in Work Audit 2.0. No live AI is part of this pass.

Deferred: Research scoring, thesis challenge/debate, Academy V4, live AI, forum/feed, portfolio, direct messages, likes, and payments.

## Validation and release decision

- Root cause of the nav issue: shared navigation created a “Logga in” link on every page; only the Account social controller changed that link, and it ran before the shared link existed. Navigation now reads the existing Supabase adapter session on every page, responds to session and profile changes, and uses a neutral account label while resolving.
- Account healthy state: compact sync status, persisted last sync time, a quiet sync action, and deeper sync/privacy material in disclosures. Unsynced local work and failures remain visible with actions.
- Research publication: local saving alone did not meet the server's explicit private-sync prerequisite, and the Account publication panel was hidden before a user created a profile. The panel now explains the profile prerequisite; the composer explains sync, and Research has both publication and discovery links. The existing safe-field preview, public copy, profile view, unpublish, and private-history behavior passed synthetic normal-user browser checks. A real hosted non-admin account was unavailable, so the original production report cannot be conclusively closed.
- Macro: count derives from the actual hidden array, singular/plural labels agree, duplicate IDs across weekly feeds are removed, and stable indicator-ID priority puts policy decisions and major releases in the compact view. Expanded view preserves remaining events.
- Knowledge: one catalog powers normal search and deterministic reviewed-question matching. Categories begin collapsed; question links open the existing static answer pages with full hierarchy, sources, canonical relations, and SEO. Unmatched questions abstain. There is no global launcher or AI call.
- Inspected browser screenshots: mobile Account light and dark; Knowledge Bank mobile light and dark; homepage macro mobile light. The dark/light and 360/390/430px browser checks showed no horizontal overflow. Keyboard disclosure, focus restoration, accessibility and CSP checks passed.
- Validation: release gate passed (165 Python tests, 215 JavaScript tests, SEO, calendar/weekly, rule, cloud security, staging/local references, `git diff --check`). Full browser suite passed 37 tests; SDK session suite, social browser suite, accessibility/CSP quality suite, and actionlint 1.7.7 passed. Focused Account/Knowledge tests were rerun after the last layout changes.
- Release decision: code is locally validated, but **not yet production release-ready** until the owner verifies publish, profile visibility and unpublish with a real hosted non-admin account. No commit, push or deployment was made.
