// An event should start with a GROUNDED time — proposed, explained, and the host's to change.
//
// The run of show used to invent one (a bare 15:00, or "afternoon" → 3:00 PM) and ship it to
// vendors. That's fixed. But leaving the host an empty field is only half an answer, exactly
// as it was with the reply-by date. Every number below traces to the real forecast, the
// playbook's own authored duration, or the host's own words. Nothing is invented.

import { proposeStartTime, parseClock, isOutdoorEvent, typicalDurationHours } from '../startTime';

const crab = (over = {}) => ({ id: 'e', type: 'Crab Feast', date: '2026-08-04', guestCount: 18, ...over });

describe('daylight is a REAL constraint — and it was computed and never used', () => {
  test('an outdoor event is timed to finish in the light', () => {
    // weather.js computes this sunset for real, from the forecast, in the event's timezone.
    const p = proposeStartTime(crab(), { sunset: '8:14 PM' });
    expect(p.grounded).toBe(true);
    expect(p.basis).toBe('daylight');
    // sunset 20:14 − 4h typical run − 30m buffer = 15:44
    expect(p.hhmm).toBe('15:44');
    expect(p.why).toMatch(/Sunset is 8:14 PM/);
    expect(p.why).toMatch(/about 4 hours/);
    expect(p.why).toMatch(/finishing in the light/);
  });

  test('every number in the reason is real — the forecast and the playbook, nothing else', () => {
    const p = proposeStartTime(crab(), { sunset: '8:14 PM' });
    expect(p.drivers).toEqual(['sunset 8:14 PM', '4h typical run']);
    expect(typicalDurationHours(crab())).toBe(4);   // authored in the playbook's own meta
  });

  test('a LATER sunset lets the event start later — it tracks the real date', () => {
    const june = proposeStartTime(crab(), { sunset: '8:37 PM' });
    const sept = proposeStartTime(crab(), { sunset: '7:12 PM' });
    expect(june.minutes).toBeGreaterThan(sept.minutes);
  });
});

describe("the host's own word is never quietly overruled", () => {
  test('daylight refines the bucket, it does not escape it', () => {
    // Host said "evening" (17:00–19:59). Daylight alone would say 15:44 — earlier than they
    // asked for. We keep THEIR word, propose the earliest evening, and name the tension.
    const p = proposeStartTime(crab({ timeOfDay: 'evening' }), { sunset: '8:14 PM' });
    expect(p.minutes).toBe(17 * 60);
    expect(p.basis).toBe('daylight-in-bucket');
    expect(p.why).toMatch(/earlier than evening/i);
    expect(p.why).toMatch(/past dark/i);
  });

  test('with no forecast, the bucket alone still grounds it — in what the host said', () => {
    const p = proposeStartTime(crab({ timeOfDay: 'afternoon' }), null);
    expect(p.basis).toBe('bucket');
    expect(p.grounded).toBe(true);
    expect(p.why).toMatch(/You said afternoon — this is the middle of it, not a guess/);
  });
});

describe('we do not invent', () => {
  // 2026-07-15 (host directive: frictionless, never a blank field): when nothing grounds a
  // time we now propose a RULE OF THUMB rather than nothing — the middle of the part-of-day
  // most events of this kind land in, marked the weakest basis, in a sentence that owns it as a
  // starting point. This is safe where the old 15:00 was a bug ONLY because of provenance: it
  // carries startTimeSource:'derived' + basis:'rule-of-thumb', and the outward gate still hides
  // it from guests/vendors/ROS until the host confirms (the "we do not INVENT AS FACT" invariant
  // the rest of this block still guards).
  test('no forecast, no bucket, nothing said → rule-of-thumb, honestly labelled', () => {
    const p = proposeStartTime(crab(), null);
    expect(p).not.toBeNull();
    expect(p.basis).toBe('rule-of-thumb');
    expect(p.grounded).toBe(false);                 // never dressed as a derivation
    expect(p.hhmm).toBe('15:00');                    // afternoon anchor for a crab feast
    expect(p.why).toMatch(/starting point/i);        // the sentence admits what it is
  });

  test('a host who already chose a time is left alone', () => {
    expect(proposeStartTime(crab({ startTime: '13:00', timeOfDay: 'afternoon' }), { sunset: '8:14 PM' })).toBeNull();
  });

  test('an unreadable sunset is not guessed at', () => {
    expect(parseClock('soon')).toBeNull();
    expect(parseClock('')).toBeNull();
    // A garbage sunset is never turned into a daylight-derived time; we fall past it to the
    // rule of thumb, which does NOT claim daylight as its basis.
    const p = proposeStartTime(crab(), { sunset: 'soon' });
    expect(p.basis).toBe('rule-of-thumb');
    expect(p.drivers.join(' ')).not.toMatch(/sunset/i);
  });

  test('an INDOOR event has no daylight constraint — do not pretend it does', () => {
    const indoor = crab({ type: 'Dinner Party', indoorVenue: true, timeOfDay: 'evening' });
    expect(isOutdoorEvent(indoor)).toBe(false);
    const p = proposeStartTime(indoor, { sunset: '8:14 PM' });
    expect(p.basis).toBe('bucket');            // falls back to the host's word, not the sun
    expect(p.why).not.toMatch(/sunset/i);
  });
});

// ── The DEFAULT (host directive): the app arrives with a grounded time ────────
//
// What makes this safe, and different from the bare 15:00 we deleted, is PROVENANCE. The old
// invention was indistinguishable from a host decision the moment it was written, and it went
// out to a caterer. This one knows it is ours.

import { defaultStartTime, startTimeIsConfirmed } from '../startTime';
import { eventStartLabel } from '../eventWhen';
import { buildVendorBriefPayload } from '../vendorBrief';

describe('the event arrives with a grounded start time', () => {
  test('a created event gets a real clock — the plan never runs on nothing', () => {
    const patch = defaultStartTime(crab({ timeOfDay: 'afternoon' }), null);
    expect(patch.startTime).toBe('15:00');
    expect(patch.startTimeSource).toBe('derived');       // ours, and it says so
    expect(patch.startTimeWhy).toMatch(/You said afternoon/);
  });

  test('with a real forecast, daylight wins — every number traceable', () => {
    const patch = defaultStartTime(crab(), { sunset: '8:14 PM' });
    expect(patch.startTime).toBe('15:44');
    expect(patch.startTimeBasis).toBe('daylight');
  });

  test('when we cannot ground it, we still default a rule of thumb — never a blank field', () => {
    // 2026-07-15 host directive: the app arrives with a time to accept or change, always.
    const patch = defaultStartTime(crab(), null);
    expect(patch.startTime).toBe('15:00');
    expect(patch.startTimeSource).toBe('derived');       // still ours until confirmed → still gated outward
    expect(patch.startTimeBasis).toBe('rule-of-thumb');  // honestly the weakest tier
  });
});

describe('an unconfirmed hour is OURS, not the host\'s — it does not go out', () => {
  const derived = crab({ startTime: '15:00', startTimeSource: 'derived' });
  const confirmed = crab({ startTime: '15:00', startTimeSource: 'host' });

  test('the GUEST is not told an hour the host never chose', () => {
    // The exact bug the reply-by date taught us. A default is a plan, not a promise.
    // With nothing else to say, the invite says NOTHING about the hour — it does not fall
    // back to printing our default in smaller type.
    expect(eventStartLabel(derived)).toBeNull();
    // And with a bucket the host DID give, it says the bucket — their word, not our clock.
    expect(eventStartLabel({ ...derived, timeOfDay: 'afternoon' })).toEqual({ kind: 'bucket', label: 'Afternoon' });
    // Confirmed, it is theirs, and it speaks.
    expect(eventStartLabel(confirmed)).toEqual({ kind: 'exact', label: '3:00 PM' });
  });

  test('the VENDOR is not told an hour the host never chose', () => {
    const ros = [{ id: 'r1', time: '13:00', segment: 'Load-in', vendorName: 'Bay Crab Co' }];
    const v = { id: 'v1', name: 'Bay Crab Co', category: 'Catering' };
    const p = buildVendorBriefPayload(v, derived, ros, {});
    expect(p.ros[0].time).toBeNull();      // a caterer at the wrong hour doesn't care whose default it was

    const p2 = buildVendorBriefPayload(v, confirmed, ros, {});
    expect(p2.ros[0].time).toBe('13:00');  // once it's theirs, it goes out
  });

  test("a host who wrote their OWN schedule owns those hours — we never hide their decision", () => {
    const ros = [{ id: 'r1', time: '13:00', segment: 'Load-in', vendorName: 'Bay Crab Co' }];
    const v = { id: 'v1', name: 'Bay Crab Co', category: 'Catering' };
    const hostOwned = crab();   // no startTimeSource at all — nothing was defaulted
    expect(buildVendorBriefPayload(v, hostOwned, ros, {}).ros[0].time).toBe('13:00');
  });

  test('confirming it makes it theirs', () => {
    expect(startTimeIsConfirmed(derived)).toBe(false);
    expect(startTimeIsConfirmed(confirmed)).toBe(true);
    expect(startTimeIsConfirmed(crab())).toBe(false);   // no time at all is not confirmed
  });
});
