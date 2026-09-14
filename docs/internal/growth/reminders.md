# B55 — Local review reminder foundation

`min-review.js` owns the existing shared `attention(thesis, data, today)` logic.
Min NTM uses it for the review queue; Research uses the same function through
`renderResearch(stock)` from `research-review.js`. Nothing is persisted separately
and there is no account, permission prompt, scheduler, email, push or background
notification. The browser's local calendar date governs due dates.

Reasons: due thesis review; due non-superseded assumption that has not already
been reviewed for that date; open report questions (explicitly no deadline); and
existing neutral Change Detection evidence not acknowledged in the saved review.
Closed/abstained theses suppress active reminders. Answered questions disappear
through the existing explicit revision save. Viewing/focusing writes no storage.
No automatic dismissal, mutation of historical revisions or new analytics event.

Refresh on existing initial render/save/delete flows, focus, visible-tab return,
and storage events. Refresh only the Research reminder text on return, preserving
unsaved editor fields. A tab left continuously visible across midnight updates on
the next focus/return/reload; no exact-time delivery guarantee. Cross-tab saves
refresh reminders from storage; existing stale-revision guards protect the editor.
Unavailable/corrupt storage displays a warning rather than an all-clear.

Upcoming supported-company reports are deliberately absent: checked-in calendar
content has not established a current authoritative upcoming event for these
companies; archived image transcriptions are not enough. Do not infer dates from
fiscal quarter labels or report questions. Future event input needs supported
ticker, exact date/timezone, source URL, verifiedAt, status (confirmed/tentative/
cancelled), freshness limit and stable event ID; expired/cancelled/unverified
events must never imply an upcoming report. Add fixture tests before enabling it.

Future email/push/Discord requires accounts/backend, explicit per-channel opt-in,
ownership checks, private consent storage, timezone preferences, deduplication by
user/revision/reason/date, retry caps, unsubscribe and deletion handling. Adapters
consume minimal authorized reminder metadata, not whole thesis snapshots. Discord
public content distribution is distinct from private user reminders. Default
message previews must omit thesis text and sensitive financial details. Those are
design boundaries only; no service credentials, stub requests or dead links exist.
