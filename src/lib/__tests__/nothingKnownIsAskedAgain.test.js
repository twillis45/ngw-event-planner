// ─── NOTHING THE HOST TOLD US IS ASKED AGAIN (owner, 11/21/2026) ─────────────
//
// "Don't keep asking host for the same information." Single source for every
// fact. A playbook call was answered only when picked, or when a BOOKED vendor
// answered it — so every call that restates one of the event's own fields asked
// again. The audit at 0bc6e20f, driven at 1024×1366, in rank order; each case
// here is one of its findings. Read rule: lib/knownFacts.js.
// e2e twin: hostv2/e2e/nothingKnownIsAskedAgain.spec.mjs.
import {
  playbookDecisionBoard, decisionSettledByData, decisionKnownPart, choicePickFor,
  playbookDecisionOptions, playbookChecklist, getPlaybook, stepCallsAnswered,
} from '../playbooks';

const asOf = new Date(Date.UTC(2026, 10, 21, 17));
const dec = (type, id) => [...(getPlaybook(type).decisions || [])].find((d) => d.id === id);
const board = (ev) => playbookDecisionBoard(ev, asOf);
const openRow = (ev, id) => [...board(ev).open, ...(board(ev).deferred || [])].find((r) => r.id === id);
const lockedRow = (ev, id) => board(ev).locked.find((r) => r.id === id);
const base = (over) => ({
  id: 'k1', date: '2027-09-18', createdAt: '2026-11-21T12:00:00Z', guestMode: 'count',
  guests: [], vendors: [], budget: [], foodChoices: {}, ...over,
});

describe('1 — the wedding’s budget and count are hers', () => {
  const wedding = base({ type: 'Wedding', name: 'Maya and Theo’s Wedding', guestEstimate: 150, guestCountSource: 'host', totalBudget: 40000 });
  test('the guest-count call is settled from her 150', () => {
    const s = decisionSettledByData(wedding, dec('Wedding', 'guestcount'));
    expect(s).toEqual(expect.objectContaining({ pick: 'Large (120–250)', because: 'From your plan: 150 guests' }));
    expect(lockedRow(wedding, 'guestcount').because).toBe('From your plan: 150 guests');
  });
  test('the budget call asks only who pays, and runs on her $40,000', () => {
    const r = openRow(wedding, 'budget');
    expect(r.label).toBe('Who pays?');
    expect(r.ask).toBe('Who pays?');
    expect(r.because).toBe('From your plan: $40,000. Only this part is left.');
    expect(choicePickFor(wedding, 'budget')).toBe('$25k–$50k');
    expect(playbookDecisionOptions(wedding, 'budget').options).toEqual(['The couple', 'Family is helping', 'Split between the families']);
  });
  test('nothing waits on the budget she already set', () => {
    const waits = [...board(wedding).open, ...(board(wedding).deferred || [])]
      .filter((r) => /total budget/i.test(r.because || ''));
    expect(waits).toEqual([]);
  });
  test('the step names only who pays, and a pick answers it', () => {
    const step = playbookChecklist(wedding).find((r) => r.id === 'pbt-k1-t_budget');
    expect(step.task).toBe('Agree who pays');
    const paid = { ...wedding, foodChoices: { budget: 'The couple' } };
    expect(stepCallsAnswered(paid, step)).toBe(true);
    expect(lockedRow(paid, 'budget').because).toBe('$40,000 · The couple');
    // Her answer to the rest is not a band: the plan still runs on $25k–$50k.
    expect(choicePickFor(paid, 'budget')).toBe('$25k–$50k');
  });
  test('control: a playbook-typical count settles nothing', () => {
    const typical = { ...wedding, guestCountSource: 'playbook-typical' };
    expect(decisionSettledByData(typical, dec('Wedding', 'guestcount'))).toBeNull();
  });
  test('control: no budget, the whole call asks', () => {
    expect(openRow({ ...wedding, totalBudget: '' }, 'budget').label).not.toBe('Who pays?');
  });
});

describe('2 — a named venue answers where; only an unknown kind is asked', () => {
  test('Lucia’s Bistro is a restaurant', () => {
    const ev = base({ type: 'Engagement Party', venue: 'Lucia’s Bistro', venueKind: 'venue', guestEstimate: 40, guestCountSource: 'host' });
    expect(decisionSettledByData(ev, dec('Engagement Party', 'venue')).pick).toBe('Restaurant private room');
    expect(openRow(ev, 'venue')).toBeUndefined();
  });
  test('The Loft is a place we cannot classify: ask only its kind', () => {
    const ev = base({ type: 'Sweet 16', venue: 'The Loft', venueKind: 'venue' });
    const kp = decisionKnownPart(ev, dec('Sweet 16', 'venue_type'));
    expect(kp.ask).toBe('What kind of place is The Loft?');
    expect(kp.options).toEqual(['Rented hall / clubhouse', 'Event venue']);
    expect(openRow(ev, 'venue_type').label).toBe('What kind of place is The Loft?');
  });
  test('a wedding hall asks whether it is full-service', () => {
    const ev = base({ type: 'Wedding', venue: 'The Grand Hall', venueKind: 'venue' });
    expect(decisionKnownPart(ev, dec('Wedding', 'venue')).ask).toBe('Is The Grand Hall full-service?');
  });
  test('WRONG ANSWER: a backyard is outside, not "Indoor (home or rented room)"', () => {
    const ev = base({ type: 'Gender Reveal', venue: 'Backyard', venueKind: 'home' });
    expect(decisionSettledByData(ev, dec('Gender Reveal', 'venue')).pick).toBe('Backyard / outdoor');
  });
  test('control: plain home still reads home', () => {
    const ev = base({ type: 'Engagement Party', venue: 'Home', venueKind: 'home' });
    expect(decisionSettledByData(ev, dec('Engagement Party', 'venue')).pick).toBe('Host home');
  });
});

describe('3 — headcount calls read her count', () => {
  test('Sweet 16 asks only how many are adults', () => {
    const ev = base({ type: 'Sweet 16', guestEstimate: 60, guestCountSource: 'host' });
    const r = openRow(ev, 'guest_count');
    expect(r.label).toBe('How many of the 60 are adults?');
    expect(choicePickFor(ev, 'guest_count')).toBe('~60 (big bash)');
  });
  test('Low Country Boil and Repast settle from the count', () => {
    expect(decisionSettledByData(base({ type: 'Low Country Boil', guestEstimate: 30, guestCountSource: 'host' }), dec('Low Country Boil', 'headcount')).pick).toBe('30 (full table)');
    expect(decisionSettledByData(base({ type: 'Repast', guestEstimate: 50, guestCountSource: 'host' }), dec('Repast', 'headcount')).pick).toBe('Family, friends, congregation (~50)');
  });
  test('a fly-in trip is travelers, not "a mix"', () => {
    const ev = base({ type: 'Group Trip', isDestination: true, travelMode: 'fly', guestsStayOvernight: true, guestEstimate: 8, guestCountSource: 'host' });
    expect(choicePickFor(ev, 'dest_travelmix')).toBe('Most guests are traveling');
    expect(openRow(ev, 'dest_travelmix')).toBeUndefined();
  });
});

describe('4 — indoors or outside is one store', () => {
  test('her "Outside" in Space answers the reunion’s indoor/outdoor call', () => {
    const ev = base({ type: 'Family Reunion', indoorOutdoor: 'outdoor' });
    expect(decisionSettledByData(ev, dec('Family Reunion', 'venue-setting')).pick).toBe('Outdoor park pavilion');
    expect(decisionSettledByData({ ...ev, indoorOutdoor: 'indoor' }, dec('Family Reunion', 'venue-setting')).pick).toBe('Indoor hall / community room');
  });
});

describe('6 — a booked DJ answers the music call', () => {
  test('Wedding music is the DJ she booked', () => {
    const ev = base({ type: 'Wedding', vendors: [{ id: 'v1', category: 'DJ', name: '', status: 'Booked' }] });
    expect(decisionSettledByData(ev, dec('Wedding', 'music'))).toEqual(expect.objectContaining({ pick: 'DJ', because: 'Your DJ — booked' }));
  });
  test('control: a DJ only being considered still asks', () => {
    const ev = base({ type: 'Wedding', vendors: [{ id: 'v1', category: 'DJ', name: '', status: 'Considering' }] });
    expect(decisionSettledByData(ev, dec('Wedding', 'music'))).toBeNull();
  });
});

describe('7 — her clock answers serve time', () => {
  test('dinner at 4pm is "Late afternoon, around 4 or 5"', () => {
    const ev = base({ type: 'Thanksgiving Hosting', startTime: '4:00 PM', startTimeSource: 'host' });
    expect(decisionSettledByData(ev, dec('Thanksgiving Hosting', 'serve_time'))).toEqual(expect.objectContaining({ pick: 'Late afternoon, around 4 or 5', because: 'From your plan: 4 PM' }));
  });
  test('control: a derived start time settles nothing', () => {
    const ev = base({ type: 'Thanksgiving Hosting', startTime: '16:00', startTimeSource: 'derived' });
    expect(decisionSettledByData(ev, dec('Thanksgiving Hosting', 'serve_time'))).toBeNull();
  });
  test('Housewarming asks only open house or a fixed start', () => {
    const ev = base({ type: 'Housewarming', startTime: '14:00', startTimeSource: 'host' });
    const kp = decisionKnownPart(ev, dec('Housewarming', 'window'));
    expect(kp.ask).toBe('Do guests arrive at 2 PM, or drop in all afternoon?');
    expect(kp.options).toEqual(['Fixed start, afternoon', 'Open house (drop in 2-5pm)']);
  });
});

describe('8 — lodging she named', () => {
  test('staying at an Airbnb answers how guests are staying', () => {
    const ev = base({ type: 'Group Trip', isDestination: true, guestsStayOvernight: true, lodgingStyle: 'airbnb' });
    expect(choicePickFor(ev, 'dest_lodging')).toBe('A host-arranged Airbnb');
  });
  test('3 staying overnight answers Thanksgiving’s overnight call', () => {
    const ev = base({ type: 'Thanksgiving Hosting', guestsStayOvernight: true, overnightCount: 3 });
    expect(decisionSettledByData(ev, dec('Thanksgiving Hosting', 'overnight_guests')).because).toBe('From your plan: 3 staying overnight');
  });
});

describe('12 — her theme answers the theme call', () => {
  test('neon glow is "Neon / glow party"', () => {
    const ev = base({ type: 'Sweet 16', theme: 'neon glow' });
    expect(decisionSettledByData(ev, dec('Sweet 16', 'theme')).pick).toBe('Neon / glow party');
  });
  test('a theme no option names still settles, and claims no option', () => {
    const ev = base({ type: 'Birthday Party', theme: 'Great Gatsby' });
    expect(decisionSettledByData(ev, dec('Birthday Party', 'theme')).because).toBe('From your plan: Great Gatsby');
    expect(choicePickFor(ev, 'theme')).toBeNull();
  });
});

describe('4 — a pick that says indoors or outside writes the one store', () => {
  // eslint-disable-next-line global-require
  const { settleChoicePatch } = require('../choiceProvenance');
  test('picking "Backyard / outdoor" sets indoorOutdoor', () => {
    expect(settleChoicePatch(base({ type: 'Gender Reveal' }), 'venue', 'Backyard / outdoor', 'host').indoorOutdoor).toBe('outdoor');
    expect(settleChoicePatch(base({ type: 'Family Reunion' }), 'venue-setting', 'Outdoor with indoor backup', 'host').indoorOutdoor).toBe('both');
  });
  test('control: a pick that says nothing about it writes nothing', () => {
    expect('indoorOutdoor' in settleChoicePatch(base({ type: 'Engagement Party' }), 'venue', 'Host home', 'host')).toBe(false);
    expect('indoorOutdoor' in settleChoicePatch(base({ type: 'Wedding' }), 'music', 'DJ', 'host')).toBe(false);
  });
});

describe('7 — the time-of-day bucket follows her clock', () => {
  // eslint-disable-next-line global-require
  const { timeOfDayFor } = require('../knownFacts');
  test('4:00 PM is afternoon, whatever "dinner" said', () => {
    expect(timeOfDayFor({ startTime: '4:00 PM', startTimeSource: 'host', timeOfDay: 'evening' })).toBe('afternoon');
    expect(timeOfDayFor({ startTime: '19:30', startTimeSource: 'host' })).toBe('evening');
  });
  test('control: a derived clock leaves her word; nothing leaves nothing', () => {
    expect(timeOfDayFor({ startTime: '15:00', startTimeSource: 'derived', timeOfDay: 'evening' })).toBe('evening');
    expect(timeOfDayFor({})).toBeUndefined();
  });
});

describe('9 — a known allergy is not asked again', () => {
  // eslint-disable-next-line global-require
  const { playbookRisks } = require('../playbooks');
  // eslint-disable-next-line global-require
  const { allergyAsk } = require('../knownFacts');
  const bday = base({ type: 'Birthday Party', guestEstimate: 30, guestCountSource: 'host', dietCounts: { 'Nut allergy': 1 } });
  test('the ask is about anyone else', () => {
    expect(allergyAsk(bday)).toBe('Anyone besides the 1 nut allergy?');
    expect(allergyAsk(base({}))).toBe('Who has a food allergy?');
  });
  test('"allergies not collected" clears once she noted them', () => {
    const allergyRisk = (ev) => ((playbookRisks(ev) || {}).items || []).filter((r) => /allergies not collected/i.test(r.trigger));
    expect(allergyRisk(bday).length).toBe(1);
    expect(allergyRisk({ ...bday, dietaryNoted: true })).toEqual([]);
  });
});

describe('8 — a local party with a few staying over is not asked how guests stay', () => {
  test('Thanksgiving with 3 overnight', () => {
    const ev = base({ type: 'Thanksgiving Hosting', guestsStayOvernight: true, overnightCount: 3, guestEstimate: 14, guestCountSource: 'host' });
    expect(openRow(ev, 'dest_lodging')).toBeUndefined();
    expect(choicePickFor(ev, 'dest_lodging')).toBeNull();
  });
  test('control: a destination trip still asks it', () => {
    const ev = base({ type: 'Group Trip', isDestination: true, guestsStayOvernight: true, overnightCount: 3 });
    expect(openRow(ev, 'dest_lodging')).toBeTruthy();
  });
});

describe('confirms read as confirms', () => {
  test('Birthday’s count step says her number', () => {
    const ev = base({ type: 'Birthday Party', guestEstimate: 30, guestCountSource: 'host', date: '2026-12-20' });
    const r = openRow(ev, 'headcount');
    expect(r.label).toBe('Confirm 30 guests');
    expect(r.confirm).toBe(true);
  });
  test('control: no count of hers, the authored ask', () => {
    const r = openRow(base({ type: 'Birthday Party', date: '2026-12-20' }), 'headcount');
    expect(r.label).not.toMatch(/^Confirm \d/);
  });
});
