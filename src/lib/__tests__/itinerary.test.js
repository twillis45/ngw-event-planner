// Guest itinerary (Slice A) — one schedule, guest projection. Locks: the
// authority order (host > authored agenda > proposed arc), the Day-N parser
// finally consuming Team Retreat's authored arc, slots-never-fake-times, and
// the span clip on the proposed reunion arc.

import { guestItinerary, parseAgendaWhen, dayLabelFor } from '../itinerary';
import { getPlaybook } from '../playbooks';

describe('parseAgendaWhen', () => {
  test('Day-N slots parse; crew offsets do not', () => {
    expect(parseAgendaWhen('Day 2 afternoon')).toEqual({ day: 2, slot: 'afternoon' });
    expect(parseAgendaWhen('day 1')).toEqual({ day: 1, slot: null });
    expect(parseAgendaWhen('T0 -2h')).toBe(null);
    expect(parseAgendaWhen('T0 last day')).toBe(null);
  });
});

describe('guestItinerary', () => {
  test('Team Retreat: the authored Day 1/2/3 agenda reaches guests at last', () => {
    const it = guestItinerary({ type: 'Team Retreat', date: '2026-09-11', endDate: '2026-09-13' }, getPlaybook);
    expect(it.relevant).toBe(true);
    expect(it.source).toBe('playbook');
    expect(it.rows.length).toBeGreaterThanOrEqual(5);
    expect(it.rows[0].day).toBe(1);
    expect(it.rows.every((r) => r.time === null)).toBe(true); // slots only — no invented clock
  });

  test('multi-day Reunion gets the PROPOSED arc — weekday-aware, span-clipped', () => {
    // Fri–Sun (2026-09-11 is a Friday): cookout lands the Saturday, worship THE Sunday.
    const it = guestItinerary({ type: 'Reunion', date: '2026-09-11', endDate: '2026-09-13' }, getPlaybook);
    expect(it.source).toBe('proposed');
    const cookout = it.rows.find((r) => /cookout/i.test(r.title));
    const worship = it.rows.find((r) => /worship/i.test(r.title));
    expect(cookout.day).toBe(2); // Saturday
    expect(worship.day).toBe(3); // Sunday
    expect(it.provenance.tier).toBe('researched');
    const twoDay = guestItinerary({ type: 'Reunion', date: '2026-09-11', endDate: '2026-09-12' }, getPlaybook);
    expect(Math.max(...twoDay.rows.map((r) => r.day))).toBe(2); // clipped to the span
  });

  test('a Wed–Fri reunion is NEVER proposed a church service (host catch 2026-07-27)', () => {
    // 2026-08-26 is a Wednesday; the span holds no Sunday.
    const it = guestItinerary({ type: 'Reunion', date: '2026-08-26', endDate: '2026-08-28' }, getPlaybook);
    expect(it.rows.some((r) => /worship/i.test(r.title))).toBe(false);
    const cookout = it.rows.find((r) => /cookout/i.test(r.title));
    expect(cookout.day).toBe(2); // middle day, no Saturday to prefer
  });

  test('single-day Reunion proposes nothing — a proposal needs a span', () => {
    expect(guestItinerary({ type: 'Reunion', date: '2026-09-11' }, getPlaybook).relevant).toBe(false);
  });

  test('host-edited rows beat every source, keep host-typed times, drop blanks', () => {
    const it = guestItinerary({
      type: 'Reunion', date: '2026-09-11', endDate: '2026-09-13',
      itinerary: [
        { day: 2, slot: 'evening', title: 'Card night', time: '8:00 PM' },
        { day: 1, slot: 'evening', title: 'Fish fry' },
        { day: 1, title: '   ' },
      ],
    }, getPlaybook);
    expect(it.source).toBe('host');
    expect(it.rows.map((r) => r.title)).toEqual(['Fish fry', 'Card night']);
    expect(it.rows[1].time).toBe('8:00 PM');
  });

  test('dayLabelFor names real weekdays from the start date', () => {
    expect(dayLabelFor({ date: '2026-09-11' }, 1)).toBe('Friday');
    expect(dayLabelFor({ date: '2026-09-11' }, 3)).toBe('Sunday');
    expect(dayLabelFor({}, 2)).toBe('Day 2');
  });
});
