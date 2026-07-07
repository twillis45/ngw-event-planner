# ACTIONABLE-ROWS-1 — No dead warning rows (2026-07-07)

## 1 · Executive verdict
The core rule (fix directly · deep-link to the exact fix · or be honestly
informational) was already met by MOST of the app thanks to this cycle's CTA
doctrine work — the audit found the dead rows concentrated exactly where Todd
pointed: **the vendor detail's Files section.** The missing-contract row and
the not-OK insurance row were pure passive warnings while a fully-capable
ContractFlow (attach link · real upload · mark received · log the ask) sat
one section away. Both rows now route into it; the un-fixable rows
(invoice/menu attachments with no in-app control) are now explicitly labeled
"track outside the app" so they can't read as actionable.

## 2 · Actionable Rows Matrix (findings)

| Surface · row | State reported | Before | Fix |
|---|---|---|---|
| Vendor Files · Contract (missing) | no file, not signed | **DEAD** — text only | "Add contract status" → opens ContractFlow, focused + flashed (P0, fixed) |
| Vendor Files · Contract (signed, no file) | the "no file on record" flag state | dead | same button reads "Attach the contract" (P0, fixed) |
| Vendor Files · COI/Insurance (not valid / not tracked) | status badge only | **DEAD** | "Review insurance" → same files fix-it flow (P0, fixed) |
| Vendor Files · Invoice / Menu-rider | "Not attached" italic | looked semi-actionable | relabeled "Not attached · track outside the app" (P1, honest informational) |
| Vendor attention rows ("What needs attention", "Also open") | payment/contract/arrival/docs | actionable — addressRow expands inline panels; a prior fix already killed the "went nowhere" class | audited, compliant |
| "Where things stand" ⚑ conflict flag | scheduling conflict | actionable (selects vendor + section) | compliant |
| Documents tab per-vendor missing rows + empty state | missing contract | routes onOpenVendor(v.id,'contract') | compliant |
| Command/HostHome/Place/Budget/Guests/settle/weather/checklist rows | various | actionable per CTA-DEEPLINK-1..4, HOST-AUDIT-1, PLACE/GUEST/PAY slices | audited, compliant |
| WhatCouldGoWrongPanel per-risk rows | risks + mitigations | broad, not per-risk | **PARKED for WCGW-ROUTE-1** per instruction |

## 3–7 · Vendor findings & fixes
Dead rows found: 3 (contract-missing, contract-signed-no-file, COI-not-ok).
All now satisfy acceptance option B (exact deep link into the existing
control): they call the SAME section-focus machinery the attention rows use
(`setExpandedKind('contract')` + flash + centered scroll), so behavior is
identical wherever the host arrives from. No fake upload, no fake signed
state — every action in the flow writes real fields (contractSigned,
contractUrl, storage path) through the existing patch path.

## 8 · Parked
WCGW per-risk routing (next slice, per instruction) · invoice/menu in-app
attachment controls (no storage model for them — honest label instead).

## 9–12 · Files changed / behavior
`src/plan/VendorPlanningWorkspace.jsx` only: DocumentsSection gains
`onAction`; VendorDetail wires it to the section-focus internals. State
clears by re-derivation: live-verified "Add contract status" → ContractFlow
(Attach + sign / Mark received) → Mark received → contractSigned=true → the
row's action honestly EVOLVED to "Attach the contract" (still-real remaining
work, not a stale warning).

## 13 · Privacy / green-dot
No payload changes; contract/COI status remains host-internal (whitelist
untouched, pinned by existing tests). No new dots; no completion claims.

## 14–22 · Tests & runs
Vendor suites 57/57 · full frontend 2010/2010 · backend 97/97 · build clean.
Live-verified desktop: missing contract → button → flow → mark received →
honest state evolution. (Repo has no JSX render-test infra; the flow's field
writes are covered by existing vendor suites, and the routing reuses the
already-tested section-focus path.)

## 23 · DAYBEFORE-DIFM-1 unblocked?
It shipped before this slice — and its rows route through the same audited
rails, so it inherits compliance.

## 24 · Recommendation
Accept. Proceeding to WEATHER-IMPACT-1 per the queued order.
