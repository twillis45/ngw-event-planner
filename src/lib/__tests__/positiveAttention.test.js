// Sprint 57F-A — Positive Attention reader. Proves: pure reader over EXISTING
// readiness signals; surfaces only confirmed-true dimensions; NEVER invents
// certainty (no budget/capacity/safety claims); flag default OFF + host-gated.

import { attentionOn, attentionActive, positiveAttention } from '../positiveAttention';

const ON = { status: 'ON_TRACK', note: '3 confirmed' };
const ATT = { status: 'ATTENTION', note: '1 unconfirmed' };
// A fully-handled event + an all-green 4-axis readiness.
const readyAll = { decision: ON, vendor: ON, timeline: ON, document: { status: 'ON_TRACK', note: '2 approved' } };
function ev(extra) {
  return {
    audience: 'self_family',
    guests: [
      { id: 'g1', rsvp: 'Yes', table: 'T1' },
      { id: 'g2', rsvp: 'Yes', table: 'T1' },
      { id: 'g3', rsvp: 'Yes', table: 'T2' },
    ],
    ...extra,
  };
}

beforeEach(() => { try { localStorage.clear(); } catch {} });

describe('57F-A flag gating', () => {
  test('attentionOn default OFF', () => { expect(attentionOn()).toBe(false); });
  test('attentionActive needs flag AND host audience', () => {
    expect(attentionActive(ev())).toBe(false);                 // flag off
    try { localStorage.setItem('ngw-pi-attention', '1'); } catch {}
    expect(attentionActive(ev())).toBe(true);                  // host + flag
    expect(attentionActive(ev({ audience: 'client' }))).toBe(false); // planner stays off
  });
});

describe('57F-A positiveAttention reader', () => {
  test('fully-handled event surfaces the confirmed dimensions', () => {
    const items = positiveAttention(ev(), readyAll).items;
    const keys = items.map((i) => i.key);
    expect(keys).toEqual(expect.arrayContaining(['Guests', 'Timeline', 'Vendors', 'Documents', 'Seating']));
    expect(items.find((i) => i.key === 'Guests').note).toBe('3 of 3 confirmed');
  });

  test('honest: a dimension is surfaced ONLY at its existing ON_TRACK signal', () => {
    const items = positiveAttention(ev(), { vendor: ATT, timeline: ATT, document: ATT }).items;
    const keys = items.map((i) => i.key);
    expect(keys).not.toContain('Vendors');    // ATTENTION, not set
    expect(keys).not.toContain('Timeline');
    expect(keys).not.toContain('Documents');
    expect(keys).toContain('Guests');         // RSVPs still ≥70%
  });

  test('Guests needs ≥70% RSVP Yes; Seating needs every confirmed guest seated', () => {
    const mostlyNo = ev({ guests: [{ rsvp: 'Yes', table: 'T1' }, { rsvp: 'No' }, { rsvp: 'No' }] });
    expect(positiveAttention(mostlyNo, {}).items.map((i) => i.key)).not.toContain('Guests');
    const unseated = ev({ guests: [{ rsvp: 'Yes', table: 'T1' }, { rsvp: 'Yes' }, { rsvp: 'Yes' }] });
    expect(positiveAttention(unseated, {}).items.map((i) => i.key)).not.toContain('Seating');
  });

  test('NEVER invents certainty: no Budget / Capacity / Reality-Check / Event-Day item', () => {
    const items = positiveAttention(ev({ totalBudgeted: 5000, budget: [] }), readyAll).items;
    const keys = items.map((i) => i.key);
    ['Budget', 'Capacity', 'Reality Check', 'Event Day'].forEach((k) => expect(keys).not.toContain(k));
  });

  test('empty / missing inputs are safe (no throw, no items)', () => {
    expect(positiveAttention(null, null)).toEqual({ items: [] });
    expect(positiveAttention({ guests: [] }, {})).toEqual({ items: [] });
  });
});
