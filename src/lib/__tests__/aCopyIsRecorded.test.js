// ─── A COPY IS SAID AND KEPT (cohesion G #32, owner 11/24/2026) ──────────────
// "Copy the settle-up ask" copied silently, with no record. It now says
// "Copied — paste it in your group chat." and records the send ledger's own
// "copied to send" handoff, shown as "Settle-up ask copied <date>". This pins
// the ledger half the button writes. (#53, the date change with Undo, is an
// e2e: hostv2/e2e/aDateChangeIsUndoneNotConfirmed.spec.mjs.)
import { recordHandoff, sendStateFor, handoffVia } from '../sendLedger';

test('#32 a copied settle-up ask is a "copied to send" handoff with its time', () => {
  const led = recordHandoff({}, 'Settle-up ask', 'copy', '2026-11-24T15:00:00Z', { kind: 'guests' });
  expect(sendStateFor(led, 'Settle-up ask')).toMatchObject({ status: 'handed_off', attested: true, channel: 'copy', at: '2026-11-24T15:00:00Z', about: { kind: 'guests' } });
  expect(handoffVia('copy')).toBe('copied to send');
  // Another draft's entry is untouched.
  const two = recordHandoff(led, 'You’re invited', 'sms', '2026-11-24T16:00:00Z');
  expect(sendStateFor(two, 'Settle-up ask').channel).toBe('copy');
});
