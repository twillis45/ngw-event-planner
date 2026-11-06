# C6 / FRIC-7 — accepted local writes precede success

November 5, 2026. Base: `d22a96837cfc3361526739883c7a7f7edbf03126`. This is the save-truth portion of C6; observability, import-overwrite truth, and pass-funnel work remain separate work.

## Root cause and runtime change

`patchEvent` updated React state and initiated cloud persistence before local persistence effects ran, then unconditionally displayed a green receipt/toast. Its return value was void, so forms could not distinguish a durable edit from one refused by storage. A storage-full custom-event edit visibly settled a question despite leaving the saved event unchanged.

`patchEvent` now performs the existing canonical local commit first. Custom-event writes still use `saveCustomEvents`; patch-layer writes use one local helper shared with the existing initialization effect. Failed writes return `{ok:false,reason,error}`, leave the event's rendered state unchanged, suppress the success receipt/haptic, retain a visible failure warning, and start no cloud write. Successful commits return `{ok:true}`, publish the stored snapshot into React, and then start the existing cloud save.

Existing effects skip snapshots that are already committed, preventing the synchronous commit from creating duplicate writes/backups. Custom edits read the committed list before applying a patch so immediately successive edits compose without waiting for React to render.

`writeVendor` forwards the result. Vendor cost and paid-state handlers gate their separate success toasts on that result; a rejected cost preserves the input draft. The C1 payment form's result check can now keep its fields open on refusal.

## Evidence

- New storage-full browser test reproduced the original false state transition before implementation: the “Plan for 40” question disappeared despite a refused save. Its durable control passed.
- Exact Margaret sample payment action: refused `ngw-hostv2-patch-ev-x-retirement-party` write leaves “Mark as paid” available and displays no `.rmsg` success receipt.
- Red proof: injected a false success receipt while keeping the failure warning. Rebuilt source and watched the exact payment check fail with **1 receipt instead of 0**. Restored source and rebuilt.
- Full Jest: **629 suites passed; 8,583 tests passed, 1 existing skipped**. This run precedes the separate new telemetry tests/work.
- HostV2 seam: **53/53 passed**.
- Affected browser regression: **36/36 passed**, including the new rejected-edit tests at 430px and 1440px, existing GOLD-10 storage/invalid-route checks, cloud conflict/offline/Undo cases, and People behavior.
- Focused 390px run: **3/3 passed**. Screenshot inspected: `evidence/2026-11-05-C6/rejected-payment-phone390.png`.
- Parity and production build passed. Existing large-chunk warnings remain.

## Scope and remaining work

This closes the observed FRIC-7 false-success paths through `patchEvent`, including the inline payment receipt. It does not attest cloud durability, production telemetry arrival, creation's other direct state producers, or the paid release candidate. C1 and this commit must be tested together for the new payment form. C6's `OBS-2`, `N4-3`, and `S9-7` remain open until their separate implementations and checks land.

No legacy runtime, auth/release-profile switch, money/parser engine, test gate, or prioritization rule changed. Temporary local configs, dependency symlinks, raw test outputs, and build outputs are excluded from this commit.

## Follow-up — preserve the boot recovery snapshot

Broader recovery QA reproduced a regression in the initial effect skip: the existing “CORRUPT THE STORE” test offered only one backup instead of more than one, because equality with storage skipped the original boot snapshot. Replaced broad equality with a one-use marker only for snapshots synchronously committed by `patchEvent`. Boot and other producers retain their prior backup behavior; accepted edits still avoid a duplicate write.

The unchanged recovery test failed **1 row versus >1** before this fix. Afterward, that test and the durable-edit/reload test passed **2/2**. The latter now also asserts **exactly one actual custom-store write** for the edit. No backup assertion was relaxed.
