# N4-1 and N4-2 — vendor amount and agreement truth

Production base: `d22a9683`. This focused change is based on C6's `b3ce9780`, whose canonical `patchEvent` returns a durable local-write result before publishing success. Integrate C6 before this commit. Audit/planning evidence: `origin/main-2utz0n` one-week plan, C1 amendment (`ac1d085d`). No runtime code was imported from that evidence branch.

## Reproduction and root causes

- N4-1: typing `4800.50` into the actual amount field saved `480050`. The input removed every nondigit before the commit handler rounded to whole dollars. A negative sign was also stripped. The new browser regression failed with the actual stored `480050` before implementation.
- N4-2: the field and receipt said "agreed," but the only monetary commitment evidence was a booked status. A Considering/Quoted amount could not enter commitments, and there was no existing amount-agreement provenance field. Contract signatures and operational booking status describe different facts and are not inferred from editing a price.

## Runtime change

The amount field retains raw input for validation. `parseVendorCost()` accepts nonnegative dollar amounts with at most two decimal places, preserves cents, treats blank as clear, and rejects malformed/negative amounts without changing stored data. Validation names the error beside the field. The exact amount appears in the receipt, and a rejected local write keeps the draft and never reports success.

An explicit valid edit records `{cost, costAgreed}` together through `writeVendor` → `patchEvent`. The canonical writer owns receipt and Undo. Focusing a quoted amount alone does not attest it; reentering it does. Clearing removes the attestation. Explicit `$0` is distinct from an unknown price. Status stays unchanged, and imported quotes are not retroactively treated as agreements.

`vendorIsCommitted()` reads the narrow explicit agreement. Directly affected consumers retain their proper meanings:

- Budget recovery protects an agreed amount instead of suggesting it is an uncommitted quote.
- Booking tasks still use `isVendorBooked()`, so a price agreement cannot complete "Book the photographer" or "Hire vendors."
- Duplication keeps the reusable price and clears this occurrence's agreement evidence.
- An explicitly agreed numeric zero is priced; raw zero and blank prices remain unknown.

Validation initially exposed a draft-owner defect: one provider's rejected `-500` appeared as another provider's `$200` price. A failing browser regression reproduced it. Draft ownership is now scoped to the event and vendor.

## Verification

- New behavioral unit suite: 20 tests. Initial regressions failed before each canonical fix.
- Six independent unit faults reintroduced: digit stripping failed 13 tests; omitted agreement failed 3; copied agreement, price-as-booking, unprotected agreement, and treating agreed zero as unknown each failed 1. Every source restored afterward.
- Three rebuilt browser faults failed: digit stripping stored `480050`; omitted agreement stored no attestation; removed draft-owner guard showed `-500` in the other provider's field. Source restoration was checked byte for byte, followed by a successful rebuild.
- Final Jest run: **630 suites passed; 8,603 tests passed, 1 skipped; 0 failed**. The intended broader financial pattern also matched this worktree's `vendor-money` path, so it ran the entire suite (94.52 seconds).
- HostV2 parity and `e2e:build`: passed.
- Final Chromium browser run: **12/12 passed** at 390px and 1440px. Covers exact cents persistence/reload, amount-plus-evidence Undo, focus versus explicit agreement, clearing and agreed zero, malformed/negative input, quota refusal, and isolation between provider drafts. No document overflow in the cents journey. Screenshot capture also waits for the detail region to reach full opacity.
- Inspected evidence: [persisted cents on phone](evidence/2026-11-05-N4/agreed-price-phone390.png), [negative input refused on phone](evidence/2026-11-05-N4/negative-price-refused-phone390.png).

## Integration boundary

The integrating C1 lane owns cent precision and formatting in `hostSpending`/category totals. This commit preserves stored cents and exact canonical vendor-money amounts; it does not change those overlapping ledger implementations. Their integrated headline must be verified after combining the lanes. Vendor-source rows backed by an amount agreement should say "committed" or "agreed," rather than claiming a contract exists.

No new dependencies, Legacy edits, new UI surfaces, push, or deployment. The integrating session owns the shared HANDOFF and WHERE_WE_ARE updates and combined release checks.
