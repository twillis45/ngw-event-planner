/* global globalThis */
// THE IDS A NEW EVENT IS MINTED WITH. Moved from hostv2/src/eventPool.js
// (which re-exports them) so both shells mint the same way.
// Unique id for a created event — prefixed so it can never collide with sample
// ids ('ev-*', 'test-*', 'my-crab-feast'), demo seeds ('demo-*'), or the app's
// own 6-char uid() ids.
export const mintEventId = () => 'cust-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
// The PUBLIC invite secret (?rsvp=CODE) — the link is the only gate on the
// public invite and RSVP endpoints (backend/app/routers/rsvp.py, MIN_CODE_LEN).
// Gold run (11/5/2026): HostV2 used the event id, whose random part is about 31
// bits; the legacy shell already minted this 22-char token (rsvpToken, App.js).
export const mintRsvpToken = () => {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const N = 22;
  const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  if (c && c.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(N));
    let out = '';
    for (let i = 0; i < N; i++) out += ALPHA[bytes[i] % ALPHA.length];
    return out;
  }
  let out = '';
  while (out.length < N) out += Math.random().toString(36).slice(2);
  return out.slice(0, N);
};
