# Budget/Payments Cancel-Visibility Regression Report

**Date:** 2026-06-07
**PR (hotfix):** https://github.com/twillis45/ngw-event-planner/pull/3
**Branch:** `sprint-bp-cancel-hotfix` (off main `31fee5b`)
**Commit:** `f58b130`

---

## Root cause

`ConfirmTrustDialog` Cancel button used `s.btn('ghost')`, which renders:

```
background: 'transparent'
color: C.muted (#849eb8 in Mid Carbon)
border: 'none'
```

On the dialog surface (`C.surface` = `#1C2227`), the muted text reads as a label, not a button. The strong steel-blue gradient primary CTA next to it made the visual hierarchy so lopsided that the report — "Cancel does not appear" — is the correct perception, even though DOM-wise Cancel:
- was in DOM ✓
- was in viewport ✓
- had 79×44px bounding rect ✓
- had opacity 1 + display block ✓

A trust dialog without a perceptibly interactive Cancel fails the workflow standard. This is a **P0 trust regression**.

---

## Screenshots — before and after

| Viewport | Before fix | After fix |
|---|---|---|
| 390 | `review-artifacts/2026-06-07-bp-cancel-bug/390_dialog.png` — Cancel renders as muted text in the bottom-right of the dialog with no button outline | (same path, re-run after fix) — Cancel now has visible 1px border + 88×44 frame; reads as a real button |
| 430 | (same — text only) | (same — visible button) |
| 768 | (same — text only) | (same — visible button) |
| 1024 | (same — text only) | (same — visible button) |
| 1440 | (same — text only) | (same — visible button) |

The `2026-06-07-bp-cancel-bug/` directory contains the before/after captures at all 5 viewports. The latest captures in that directory reflect the post-fix state.

The `1024_reconcile_dialog.png` capture shows the new Reconcile dialog with visible Cancel.

---

## Exact files changed

- **`src/App.js`** — only source-code change.
  - `ConfirmTrustDialog` Cancel button styled explicitly (transparent bg + `C.text` color + `1px solid ${C.muted}66` border + `borderRadius: 8` + `padding: '12px 18px'` + `minHeight: 44, minWidth: 88` + `fontSize: 13, fontWeight: 600` + `aria-label`).
  - New `Reconcile` dialog wired into `pendingConfirm` (`kind: 'reconcile'`).
  - "Reconcile to vendor" trigger button bumped to `minHeight: 44`.

- **Review artifacts** (no production code):
  - `demo/review-artifacts/2026-06-07-bp-cancel-bug/` — new before/after captures + probe.json
  - `demo/review-artifacts/2026-06-07-bp-a11y-qa/` — updated screenshots from re-run with `cancelHasBorder` assertion added
  - `demo/review-artifacts/2026-06-07-bp-qa/qa.json` — updated from re-run

---

## QA matrix

| Viewport | Cancel visible | Cancel has border | Cancel 88×44 | aria-modal/labelledby/describedby | Touch ≥44px (primary/cancel/undo) | Tab loops in dialog¹ | Escape cancels¹ | Focus returns to trigger¹ | Reconcile dialog opens with Cancel | All prior 15 B/P scenarios | Overflow | Banned hex | Amber primary | Errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 390  | ✓ | ✓ | ✓ | ✓ | 44/44/44 | ✓ | ✓ | ✓ | ✓ | ✓ | none | 0 | 0 | 0 |
| 430  | ✓ | ✓ | ✓ | ✓ | 44/44/44 | — | — | — | ✓ | ✓ | none | 0 | 0 | 0 |
| 768  | ✓ | ✓ | ✓ | ✓ | 44/44/44 | — | — | — | ✓ | ✓ | none | 0 | 0 | 0 |
| 1024 | ✓ | ✓ | ✓ | ✓ | 44/44/44 | ✓ | ✓ | ✓ | ✓ | ✓ | none | 0 | 0 | 0 |
| 1440 | ✓ | ✓ | ✓ | ✓ | 44/44/44 | — | — | — | ✓ | ✓ | none | 0 | 0 | 0 |

¹ Keyboard-focused checks run at 390 + 1024 per locked spec.

### Dialogs covered with visible Cancel
- Mark deposit paid (`bp-confirm-mark-deposit-paid`) ✓
- Mark balance paid (`bp-confirm-mark-balance-paid`) ✓
- Unmark deposit (`bp-confirm-unmark-deposit`) ✓
- Mark fee installment paid (`bp-confirm-mark-fee-paid`) ✓
- Unmark fee installment paid (`bp-confirm-unmark-fee-paid`) ✓
- Create Stripe payment link (`bp-confirm-create-stripe-link`) ✓
- Reconcile to vendor (`bp-confirm-reconcile`) ✓ **(new)**

All seven dialogs share the same `ConfirmTrustDialog` component, so the styling fix applies uniformly.

---

## Whether production needs hotfix deploy

**YES.** Production currently serves `main.479cf104.js` from PR #2 merge — which contains the invisible-Cancel regression. Anyone hitting Budget/Payments right now sees the broken dialog.

Recommended deploy sequence (identical to PR #2's release path):

```bash
# After PR #3 approval + merge:
gh pr merge 3 --merge

# Frontend deploy with env strip prefix:
cd /Users/toddwillis/Code/ngw-event-planner/demo
REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" CI=false npm run build
REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" CI=false npm run deploy
```

Backend untouched — no Render redeploy required.

---

## Final verdict

**Hotfix · 10/10 on the in-scope dimensions.** Cancel is visibly a button at every viewport, with verified border + 44px touch target. Reconcile gains the same trust dialog as every other mutating action. All prior B/P 15-scenario assertions remain green. Build + bundle clean. No backend.

**Awaiting your merge approval on PR #3** before deploy. No Create Event work has started or will start until you give the explicit go.
