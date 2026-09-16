# Hosted username availability verification

Completed 2026-09-16. Status: **passed**.

The owner confirmed application of `202609160002_username_availability.sql` and completion of the read-only schema/grants query. A local staged build then connected to the real hosted project using its public configuration and one authorized dedicated test account. No deployment or privileged database credential was used.

## Verified

- Anonymous execution denied; authenticated execution succeeds.
- Available names, uppercase/whitespace normalization, short/long/null input, invalid characters, reserved names (including underscore variants), and blocked names.
- Real browser validation messages and required permanent-name confirmation.
- Confirmed profile creation normalizes the username and retains the server-controlled user role.
- Existing names are unavailable; deactivation hides the profile while keeping its username unavailable.
- No private upload, public analyses or reports were created.
- No browser errors or CSP violations.
- Dedicated account deletion preserves local data and its confirmation message.
- Deleted profile is absent publicly; retained test credentials are rejected by both the availability function and Auth user lookup.

The final run recorded 33 passing check events. Evidence: [hosted-username-results.json](../../qa/account-polish/hosted-username-results.json). Checks are scoped to this addition and do not replace the earlier full hosted V1 audit.

## Correction found during verification

The first attempt passed username checks but stopped on a deletion-confirmation assertion. A background profile refresh cleared the account's success message. `social-ui.js` now preserves account feedback during that refresh. The deterministic browser regression waits for logged-out profile state before checking the confirmation. It passed, followed by the complete successful hosted rerun and cleanup.

## Cleanup and release status

The final synthetic account was deleted through the account UI. The test browser/process was closed, removing in-memory credentials, and its temporary staged site was removed. Evidence contains no email, OTP, auth ID or session token.

The username-availability hosted release gate is closed. Both migrations are already applied; neither needs rerunning. Previously documented memory-only login, generic public metadata and manual accessibility/device-testing limits remain. No commit, push or deployment was performed.
