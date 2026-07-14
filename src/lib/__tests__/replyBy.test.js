// The reply-by date, done honestly: PROPOSE it, GROUND it, let the host own it.
//
// The old behaviour invented `event.date − 7d` and the invite printed it as though the host
// had chosen it. Removing it from the invite was only half an answer — an RSVP deadline
// genuinely helps, because the whole point of a reply is to LOCK THE COUNT, and the count
// has real downstream walls. So the app proposes, shows its work, and writes nothing until
// the host taps.

import { proposeReplyBy, countDrivers, CHASE_DAYS } from '../replyBy';
import { rsvpDeadlineFor } from '../dates';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const withCaterer = (over = {}) => ({
  id: 'r', type: 'Crab Feast', date: iso(40), guestCount: 18, guestMode: 'count',
  vendors: [{ id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Booked' }],
  guests: [], timeline: [], ...over,
});

describe('the proposal is GROUNDED in what actually needs a count', () => {
  test('a caterer\'s own final-guest-count promise is the wall', () => {
    const d = countDrivers(withCaterer());
    expect(d.length).toBeGreaterThan(0);
    expect(d[0].source).toBe('vendor');
    expect(d[0].daysBefore).toBe(7);                    // catering playbook: final_guest_count
    expect(d[0].label).toMatch(/Fired Up BBQ/);
  });

  test('the date is the wall PLUS the days it takes to chase people', () => {
    const p = proposeReplyBy(withCaterer());
    expect(p.grounded).toBe(true);
    expect(p.leadDays).toBe(-(7 + CHASE_DAYS));
    expect(p.iso).toBe(iso(40 - 7 - CHASE_DAYS));       // 30 days out
    expect(p.why).toMatch(/Fired Up BBQ/);
    expect(p.why).toMatch(/chase/i);
  });

  test('the EARLIEST wall wins — a florist needing 21 days beats a caterer needing 7', () => {
    const ev = withCaterer({ vendors: [
      { id: 'v1', name: 'Fired Up BBQ', category: 'Catering', status: 'Booked' },
      { id: 'v2', name: 'Petal & Stem', category: 'Florist', status: 'Booked' },
    ] });
    const p = proposeReplyBy(ev);
    expect(p.driver.daysBefore).toBeGreaterThanOrEqual(14);
    expect(p.why).toMatch(/Petal & Stem/);
  });

  test('an informal helper is not a deadline', () => {
    const ev = withCaterer({ vendors: [{ id: 'v1', name: 'Aunt Rae', category: 'Catering', isInformal: true }] });
    expect(countDrivers(ev)).toEqual([]);
  });

  test('a count-dependent TASK counts too — the crab pre-order needs a number', () => {
    const ev = withCaterer({
      vendors: [],
      timeline: [{ id: 't', task: 'Pre-order the crabs by size and count', leadDays: -5, done: false }],
    });
    const d = countDrivers(ev);
    expect(d[0]).toMatchObject({ source: 'task', daysBefore: 5 });
  });
});

describe('when nothing needs a count, we SAY it is a rule of thumb', () => {
  test('ungrounded proposals are labelled, not disguised', () => {
    const p = proposeReplyBy(withCaterer({ vendors: [], timeline: [] }));
    expect(p.grounded).toBe(false);
    expect(p.why).toMatch(/rule of thumb/i);
  });
});

describe('an event too close for an honest deadline says so', () => {
  test('no date is offered that is already behind the guest', () => {
    const p = proposeReplyBy(withCaterer({ date: iso(2) }));   // wall is 7+3 = 10 days out
    expect(p.tooClose).toBe(true);
    expect(p.iso).toBeNull();
    expect(p.why).toMatch(/as soon as/i);
  });
});

describe('nothing is written until the host taps', () => {
  test('proposing does not make it the host\'s word', () => {
    const ev = withCaterer();
    proposeReplyBy(ev);
    // The event is untouched, so rsvpDeadlineFor still reports 'derived' and the invite
    // (which renders only source==='override') stays silent. Proposal ≠ commitment.
    expect(ev.rsvpDeadline).toBeUndefined();
    expect(rsvpDeadlineFor(ev).source).toBe('derived');
  });

  test('once accepted, it IS the host\'s word and the invite may speak it', () => {
    const p = proposeReplyBy(withCaterer());
    const accepted = withCaterer({ rsvpDeadline: p.iso });
    const d = rsvpDeadlineFor(accepted);
    expect(d.source).toBe('override');
    expect(d.iso).toBe(p.iso);
  });
});
