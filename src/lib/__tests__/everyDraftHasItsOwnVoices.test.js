// Owner, 11/19/2026: "Rewrite the other drafts' voices the same way." Every
// draft's voices now differ in greeting, closing and length, and none drops a
// fact. Run against the REAL drafts, built from one event.
import * as D from '../doItForMe';
import { voiceDraft, voicesFor, draftAudience, formalText } from '../draftVoice';

const EV = { id: 'e1', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2026-12-01', startTime: '16:00', venue: 'Vida’s place',
  venueAddress: '12 Pine St, Baltimore, MD', guestEstimate: 15, guestMode: 'list', parkingNote: 'Park on Elm St; the lot closes at 9.',
  guests: [{ id: 'g1', name: 'Maya', rsvp: 'Yes', needs: 'vegetarian' }, { id: 'g2', name: 'Jordan', rsvp: '' }],
  vendors: [{ id: 'v1', name: 'Capital Rotisserie', category: 'Catering', status: 'Confirmed', cost: 900, deposit: 300, contact: 'Ana Ruiz' }],
  timeline: [], budget: [] };
const HOST = 'Vida Reyes';
const PR = { name: HOST };
const V = EV.vendors[0];
const DRAFTS = [
  ['The guest brief', () => D.draftGuestBrief(EV, PR, { rsvpUrl: 'https://x.test/r' }), null],
  ['Note to Capital Rotisserie', () => D.draftVendorOutreach(EV, V, PR), 'v1'],
  ['Venue inquiry', () => D.draftVenueInquiry(EV, PR), null],
  ['The thank-you', () => D.draftThankYou(EV, PR), null],
  ['The RSVP nudge', () => D.draftRsvpChase(EV, PR, { rsvpUrl: 'https://x.test/r' }), null],
  ['Dietary note', () => D.draftDietaryNote(EV, PR), null],
  ['The recap', () => D.draftRecap(EV, PR), null],
  ['Day-before details', () => D.draftDayBeforeDetails(EV, PR), null],
  ['Reconfirm — Capital Rotisserie', () => D.draftVendorReconfirm(EV, V, PR), 'v1'],
  ['Your toast', () => D.draftToast(EV, PR), null],
  ['Payment reminder', () => D.draftVendorPaymentReminder(EV, V, PR), 'v1'],
  ['Parking instructions', () => D.draftParkingInstructions(EV, PR), null],
  ['Your shopping list', () => D.draftShoppingList(EV, PR), null],
];
const shown = (d) => (typeof d === 'string' ? d : [d.subject, d.body].filter(Boolean).join('\n\n'));
const ctxFor = (title, vendorId, d) => ({ audience: draftAudience(title, vendorId), host: HOST, subject: d && d.subject, title, vendor: vendorId ? V : null });
// A fact line: it has a digit, a link, or a list mark. Formal may expand its contractions.
const facts = (t) => t.split('\n').map((l) => l.trim()).filter((l) => /\d|https?:|^[•-]/.test(l) && !/^—/.test(l));

test.each(DRAFTS)('%s: no voice drops a fact', (title, build, vendorId) => {
  const d = build();
  const ctx = ctxFor(title, vendorId, d);
  const base = shown(d);
  for (const v of voicesFor(ctx.audience, false)) {
    const out = voiceDraft(base, v, ctx);
    const flat = (x) => formalText(x).toLowerCase().replace(/\s+/g, ' ').trim();
    for (const f of facts(base)) {
      const line = f.replace(/^(hi|hello|hey|dear)\b[^,—!\n]{0,40}?\s*(?:[,!]|\s—)\s*/i, '');   // a greeting prefix is a voice's to replace
      const keep = flat(out).replace(/\n/g, ' ').includes(flat(line));
      expect([title, v, f, keep]).toEqual([title, v, f, true]);
    }
  }
});

test.each(DRAFTS.filter(([t]) => !/shopping list/i.test(t)))('%s: each voice opens or closes differently, and Tighter is shortest', (title, build, vendorId) => {
  const d = build();
  const ctx = ctxFor(title, vendorId, d);
  const base = shown(d);
  const outs = voicesFor(ctx.audience, false).map((v) => voiceDraft(base, v, ctx));
  expect(new Set(outs).size).toBe(outs.length);                     // five different texts
  const ends = outs.slice(1).map((o) => o.trim().split('\n').slice(-2).join(' '));
  expect(new Set(ends).size).toBe(ends.length);                     // four different closings
  const tighter = outs[1].length;
  for (const o of outs.slice(2)) expect(tighter).toBeLessThan(o.length);
  expect(outs[4]).not.toMatch(/!/);                                 // Formal
});

test('a note to a vendor keeps the warm closing its reader needs', () => {
  const d = D.draftVendorReconfirm(EV, V, PR);
  const out = voiceDraft(shown(d), 'warmer', ctxFor('Reconfirm — Capital Rotisserie', 'v1', d));
  expect(out).toContain('So glad to be working with you on this.');
  expect(out).not.toContain('Thanks so much!');
});

test('a solemn gathering has no Playful, and nothing festive in its voices', () => {
  const REPAST = { ...EV, name: 'Repast for Mr. Lewis', type: 'Repast', honoree: 'Mr. Lewis' };
  expect(voicesFor('guests', true)).not.toContain('playful');
  const d = D.draftDayBeforeDetails(REPAST, PR);
  for (const v of voicesFor('guests', true)) {
    const out = voiceDraft(shown(d), v, { audience: 'guests', sombre: true, host: HOST, subject: d.subject });
    expect([v, /can’t wait|see you there|hey everyone|cheers/i.test(out)]).toEqual([v, false]);
  }
});

test('a note to yourself offers only As written and Tighter', () => {
  expect(voicesFor(draftAudience('Your shopping list'), false)).toEqual(['as-written', 'tighter']);
});

test('the RSVP nudge says the time the way a guest says it', () => {
  const t = shown(D.draftRsvpChase(EV, PR, { rsvpUrl: 'https://x.test/r' }));
  expect(t).toContain('on Tuesday, December 1 at 4:00 PM');
  expect(t).not.toContain('16:00');
});
