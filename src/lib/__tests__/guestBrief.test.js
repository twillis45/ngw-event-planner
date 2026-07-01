// Invite/RSVP P1 engine — rsvpDeadlineFor (dates.js) + draftGuestBrief (doItForMe.js).
// Spec: docs/ecosystem/INVITE_RSVP_MODEL.md. Guardrails under test: honest-empty (never invent a
// fact), tone-gated (somber ≠ festive), and the T-7d deadline model.
import { rsvpDeadlineFor } from '../dates';
import { draftGuestBrief } from '../doItForMe';

// A date N days from today, in the local-midnight YYYY-MM-DD the app uses.
const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('rsvpDeadlineFor', () => {
  test('default = event date − 7 days', () => {
    const r = rsvpDeadlineFor({ date: inDays(30) });
    expect(r.hard).toBe(true);
    expect(r.source).toBe('derived');
    expect(r.iso).toBe(inDays(23)); // 30 − 7
  });
  test('event < 7 days out → no hard date (ask "as soon as you can")', () => {
    const r = rsvpDeadlineFor({ date: inDays(4) });
    expect(r.hard).toBe(false);
    expect(r.iso).toBe(null);
    expect(r.source).toBe('soon');
  });
  test('explicit override wins', () => {
    const r = rsvpDeadlineFor({ date: inDays(30), rsvpDeadline: inDays(10) });
    expect(r.source).toBe('override');
    expect(r.iso).toBe(inDays(10));
  });
  test('no date → null', () => { expect(rsvpDeadlineFor({})).toBe(null); expect(rsvpDeadlineFor(null)).toBe(null); });
});

describe('draftGuestBrief — honest-empty + derivation', () => {
  const base = { id: 'e', type: 'Backyard BBQ', date: inDays(21), startTime: '15:00', venue: 'our place' };

  test('never invents parking/dress for a real (non-home) venue', () => {
    const b = draftGuestBrief({ ...base, venue: 'Riverside Hall' }, { name: 'Maya' });
    expect(b.body).not.toMatch(/street parking/i);
    // no accessibility/rain lines unless the host set them
    expect(b.body).not.toMatch(/♿|rain plan/i);
  });
  test('at-home event gets the light casual + parking defaults', () => {
    const b = draftGuestBrief(base, { name: 'Maya' });
    expect(b.body).toMatch(/street parking/i);
    expect(b.body).toMatch(/casual/i);
  });
  test('host overrides win and print verbatim', () => {
    const b = draftGuestBrief({ ...base, guestBrief: { dress: 'Wear white', rainPlan: 'Moves to the garage', accessibility: 'Step-free side gate' } }, { name: 'Maya' });
    expect(b.body).toMatch(/Wear white/);
    expect(b.body).toMatch(/Moves to the garage/);
    expect(b.body).toMatch(/Step-free side gate/);
  });
});

describe('draftGuestBrief — gift wish + policies', () => {
  const base = { id: 'e', type: 'Birthday', date: inDays(21), venue: 'our place' };
  test('unset giftWish → the brief says nothing about gifts', () => {
    expect(draftGuestBrief(base, {}).body).not.toMatch(/gift|registry|potluck/i);
  });
  test('no_gifts / registry / potluck each read correctly', () => {
    expect(draftGuestBrief({ ...base, giftWish: { mode: 'no_gifts' } }, {}).body).toMatch(/no gifts, please/i);
    expect(draftGuestBrief({ ...base, giftWish: { mode: 'registry', detail: 'https://reg.example' } }, {}).body).toMatch(/Registry: https:\/\/reg\.example/);
    expect(draftGuestBrief({ ...base, giftWish: { mode: 'potluck' } }, {}).body).toMatch(/Potluck — bring a dish/i);
  });
  test('kids + plus-one stances print only when set', () => {
    expect(draftGuestBrief({ ...base, kidsPolicy: 'adults_only', plusOnePolicy: 'no_plus_ones' }, {}).body).toMatch(/Adults-only/i);
    expect(draftGuestBrief({ ...base, kidsPolicy: 'adults_only' }, {}).body).toMatch(/Adults-only/i);
    expect(draftGuestBrief(base, {}).body).not.toMatch(/Adults-only|plus-one/i);
  });
});

describe('draftGuestBrief — tone gate (somber ≠ festive)', () => {
  const somber = { id: 'e', type: 'Celebration of Life', date: inDays(10), venue: 'Grace Chapel' };
  test('somber event never gets a registry/contribution gift line', () => {
    const b = draftGuestBrief({ ...somber, giftWish: { mode: 'registry', detail: 'x' } }, { name: 'Sam' });
    expect(b.body).not.toMatch(/registry/i);
    const c = draftGuestBrief({ ...somber, giftWish: { mode: 'contribution', detail: '20' } }, { name: 'Sam' });
    expect(c.body).not.toMatch(/splitting costs/i);
  });
  test('somber charity framing is allowed', () => {
    const b = draftGuestBrief({ ...somber, giftWish: { mode: 'charity', detail: 'the food bank' } }, {});
    expect(b.body).toMatch(/donation to the food bank/i);
  });
});
