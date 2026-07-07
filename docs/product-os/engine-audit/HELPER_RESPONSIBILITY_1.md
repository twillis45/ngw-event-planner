# HELPER-RESPONSIBILITY-1 — lightweight helper responsibility layer

**Date:** 2026-07-07 · **Status:** SHIPPED (with the Where & when condensing slice)
**Core truth:** Assigned is not handled. Chosen is not bought.

## 1 · Problem
If Aunt Lisa is bringing dessert, the app previously showed "· Aunt Lisa" on the
row and nothing else — the name read as *covered*. The host's real next action
("Confirm with Aunt Lisa") existed nowhere, and budget recovery would happily
propose trimming a dish someone else was bringing.

## 2 · Audit — what explicit helper data already exists
| Source | Field | Used |
|---|---|---|
| `event.foodAdd[]` | `owner` ("who's bringing it") | YES — food responsibilities |
| `event.timeline[]` | `owner` (free text) | YES — task responsibilities (non-host names only) |
| `event.ros[]` | `owner` + its own `confirmed` flag | YES — setup responsibilities (vendor rows excluded) |
| Supplies (`capacityOwned`) | boolean "I own it" — **no person** | NO — zero supply responsibilities, honestly reported, nothing invented |
| Vendors | full accountability lifecycle already exists | Excluded — a vendor is not a helper |

## 3 · What shipped
### Lib — `src/lib/helperResponsibility.js` (new, pure)
- `deriveHelperResponsibilities(event)` → `{ helpers[], responsibilities[] }`
  with `{helperId, helperName, itemType: food|task|setup, itemId, label,
  status: assigned|confirmed|handled, hostBackupNeeded, hostNextAction, route, anchor, source}`
- `helperResponsibilityForItem(event, item)` — per-row read
- `helperStatusLine(resp)` — ONE author for status copy (bans can't leak in)
- State store: `event.helperConfirmed{itemId: true}` (host-recorded confirm);
  `foodGot[id]` / `task.done` remain the ONLY true completion.

### Surfaces
1. **Food rows (Plan → The spread)** — status-aware label
   (`Assigned to {name} · not confirmed` → `Covered by {name}` → `{name} brought it`)
   plus a one-tap **Confirmed?** control (sibling of the row button, valid HTML).
   Mark-brought stays the existing checkoff.
2. **Day-before plan** (`lib/dayBefore.js`) — new "People bringing things" section:
   "Confirm Marcus is still bringing ice", routed to the exact food row
   (rendered-id rule); calm copy when all confirmed; hidden when no helpers.
3. **Budget recovery** (`lib/budgetRecovery.js`) — assigned ≠ savings. Helper
   dishes never enter the trim pool; an unconfirmed one becomes a protect note:
   "Assigned to Aunt Lisa, but not confirmed. Do not remove the backup yet."
4. **Phase progress / green dots** — already honest (only `foodGot` completes
   shopping); documented, no change needed.

### Privacy (test-locked)
- Vendor brief payload is a whitelist (`buildVendorBriefPayload`) — no `foodAdd`,
  no `helperConfirmed`, no helper names (test 18).
- Guest drafts (invite, guest brief, day-before details) never name helpers
  (test 19). `draftHelperBrief` is the deliberate exception — the host sends it
  to the helpers themselves.

### Language
Allowed: assigned to / bringing / confirm with / marked brought / backup needed /
covered by {name} (confirmed only). Banned (test 12): locked, external owner,
dependency, resource, "complete" from an assigned state.

## 4 · Explicitly NOT built (by spec)
No helper accounts, invitations, notifications, chat, backend collaboration,
helper portals. No supply-person assignment (no data field exists). No
HostHome hero integration yet — the day-before section is the entry point;
promoting "Confirm with X" into `selectEventNextAction` is a follow-up call.

## 5 · Tests
`src/lib/__tests__/helperResponsibility.test.js` — 19/19 green: derivation (5),
status ladder + rendered-id routes (6), language bans (2), budget recovery (2),
day-before (2), privacy (2). Full suite: **2195/2195, 138 suites**.
Live-verified in preview: seeded "Aunt Lisa" dish → row shows assigned-not-
confirmed → tap Confirmed? → "Covered by Aunt Lisa", persisted to
`ngw-events.helperConfirmed`, CTA removed. Seed cleaned after.

## 6 · Kill switch
Remove the two food-row blocks (`helper-status-*` / `helper-confirm-*` testids
in App.js), the dayBefore helpers section, and the budgetRecovery
`assignedUnconfirmed` block; the lib is inert without them.
