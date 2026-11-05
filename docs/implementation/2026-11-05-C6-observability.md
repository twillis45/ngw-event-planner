# C6 — failure visibility, restore truth, and pass intent

November 5, 2026. Follows `b3ce9780` and its recovery-preservation follow-up `29bc433e`. No deploy/profile/auth switch is included.

## Runtime changes

- Existing `captureError` and opt-out-respecting `analytics.track` receive the same sanitized operational context. Error messages contain the failure class, never provider payloads, event names, notes, URLs, or raw identifiers. Correlation uses a SHA-256 event-ID hash when available, with no readable fallback.
- Vite exposes the deployment workflow's existing `RELEASE_SHA` and `RELEASE_PROFILE` as public build metadata. Missing metadata remains `unreported`. `captureError` now forwards supplied Sentry tags separately from extra context.
- Central event names: `save_failed`, `provider_failed`, `route_failed`, `pass_checkout_failed`, and `pass_verify_failed`. Call sites cover canonical custom-store refusal/failure, patch writes, food-price requests, stale boot pointers and unresolved action routes, pass refresh/legacy return verification, and checkout failures. Reporting cannot reject into an edit or payment action.
- Pass sheet views and actual checkout-request intent use `pass_sheet_viewed` and `pass_checkout_started`. No client-side grant event was invented; entitlement/grant truth remains server-owned.
- Restoring a file reports actual added/updated/kept counts. All-skipped restores no longer say “Your events are back.” Matching records can be replaced only through an explicit “Replace matching events” action, using the existing guarded importer and backup behavior. Invalid or refused imports do not claim a restore succeeded.

## Reproduction, red proofs, and verification

The original all-skipped import produced a success claim over zero applied events. The new rendered count/replacement and refused-import checks failed before the UI change, then passed.

Swallowed failure reporting and missing pass intent were reintroduced deliberately. **9 of 10 focused unit checks failed**, including all five failure classes. Rebuilt bundles then failed **all five targeted rendered checks** for actual rejected save, provider failure, failed route, checkout view/intent/failure, and pass verification failure. The sources were restored and rebuilt before the green runs.

- Full Jest: **630 suites passed; 8,593 tests passed, 1 standing skipped**.
- HostV2 seam: **54/54 passed**, including actual stale-pointer routing behavior.
- Browser regression: **47/47 passed**, covering the new failure/opt-out/import/pass-intent cases at 390×844 and 1440×900, existing GOLD-10, restore/recovery, and canonical desktop GOLD-09 webhook-race cases.
- After registering event names in the existing analytics catalog: transport/privacy suites **16/16 passed**, build/parity passed, and focused rendered failure/import cases **8/8 passed**.
- Restore screenshot inspected: `evidence/2026-11-05-C6/restore-kept-desktop.png`.

These checks execute the actual browser storage/provider/pass paths; Sentry is mocked at the unit boundary and localhost analytics is read through the existing development tap. No test traffic reaches real Stripe or production analytics.

## Disposition and remaining evidence

`N4-3` restore truth and the client instrumentation portion of `S9-7` are implemented and observed locally. `OBS-2` now has a common reporting boundary and verified actual call sites; food-price requests are the provider seam certified in this commit. Weather/lodging failure reporting is being handled in a bounded follow-up, so this log does not claim exhaustive provider coverage.

`OBS-1` remains owner evidence: prove real production Sentry/PostHog arrival with the deployed release SHA/profile. Passing local instrumentation tests does not attest that arrival. Live checkout, grant, refund, two-device concurrency, and human UAT remain release-candidate checks; none is substituted by these mocked transport tests.
