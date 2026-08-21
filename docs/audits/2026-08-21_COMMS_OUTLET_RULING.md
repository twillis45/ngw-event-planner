# Comms outlet — board ruling (2026-08-21, six seats, 6-0)

Question: unfreeze comms to build "the outlet" (we draft everything, send
nothing). Seats: Norman, Saarinen, Zhuo, Grandmother, Venue Ops, Weiss.

## Ruling
1. UNFREEZE, narrowly: the freeze is redesign/audit-scoped and does not
   bind hostv2's outlet. Granted: (a) the durable send-state ledger in
   hostv2; (b) wiring to the EXISTING create_message deliver_email path
   (vendor-directed, known email, one at a time, review-then-send) —
   (b) not yet built. App.js stays frozen. No new server transport
   without a further sitting.
2. THE MINIMAL SLICE IS THE LEDGER, NOT THE TRANSPORT (6-0). Native
   share/sms/wa.me remain the primary send; recording the handoff is the
   build. ← SHIPPED `fdfa17fc` (draft-sheet half).
3. State model: not_sent → handed_off (HOST-ATTESTED, channel+time) →
   confirmed (system-verified via brief confirm-back). Server-email
   states (accepted/delivered/failed) join only when (b) ships; bounced
   renders as Send Failed — system-owned, distinct from a vendor's "no".
   Attested and verified must be visually distinct (attested =
   RECORD-ONLY outline; verified = filled pill).
4. MUST NOT SHIP: "Sent ✓" on a share exit; "Delivered" before the
   Resend webhook says so; bulk/scheduled/auto send; red failure for a
   host-side channel; a declined share recording anything; a second
   brief/message surface.

## Key code facts the sitting stood on
- Server email send EXISTS and is honest (communication.py:334-375 —
  "accepted", never "delivered", webhook upgrades).
- Vendor confirm-back EXISTS (vendor_brief.py:279-368).
- hostv2 sent nothing and said so (share/sms/wa.me, "no fake sent
  states"); the missing piece was the durable record — confirmed by
  grep: no markSent/handedOff/sentAt anywhere.

## Shipped in this slice (fdfa17fc)
recordHandoff/sendStateFor/sendStateLine in src/lib/sendLedger.js;
draft-sheet exits record (share-on-success, sms, whatsapp, copy);
"Mark it sent — I sent it myself" (record-language); attested chip with
age; ledger resets on run-it-again (red-proven); 10-test gate
(sendLedger.test.js) incl. the never-"Sent" copy pin.

## Deliberately NOT in this slice (next, in order)
- Vendor-row read: "Handed off · 6d, no reply" beside I REACHED OUT.
- Readiness boundary: handed_off = a wait, not an ask (no re-propose).
- The (b) email path with the review-then-send sheet.
- Named risks 1-6 recorded in the sitting transcript (attested/verified
  blur render test; webhook liveness unproven — cap UI at Accepted).
