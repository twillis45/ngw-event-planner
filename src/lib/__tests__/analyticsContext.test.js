// ─── SHARED ANALYTICS CONTEXT — segmentable, honest, and PII-free ────────────
//
// The Reasoning Continuity events shipped with no event context, so results could
// be counted and not interpreted. This helper is the single producer. These gates
// pin the three properties that matter: it segments, it never invents, and it
// never carries a host's words.
import fs from 'fs';
import path from 'path';
import { analyticsEventContext, runwayBucket } from '../analyticsContext';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

describe('segmentation — the questions this data must be able to answer', () => {
  test('runway: tight vs long is distinguishable', () => {
    expect(analyticsEventContext({ date: daysFromNow(2) }).days_out).toBe(2);
    expect(analyticsEventContext({ date: daysFromNow(45) }).days_out).toBe(45);
    expect(runwayBucket(2)).toBe('day_before');
    expect(runwayBucket(45)).toBe('long');
  });

  test('solemn vs normal is distinguishable', () => {
    expect(analyticsEventContext({ type: 'Repast', name: 'Repast for Deacon Hayes' }).is_solemn).toBe(true);
    expect(analyticsEventContext({ type: 'Birthday', name: 'Milestone' }).is_solemn).toBe(false);
  });

  test('destination vs local is distinguishable', () => {
    expect(analyticsEventContext({ type: 'Wedding', isDestination: true }).is_destination).toBe(true);
    expect(analyticsEventContext({ type: 'Wedding', isDestination: false }).is_destination).toBe(false);
  });

  test('event type is carried, lowercased for stable grouping', () => {
    expect(analyticsEventContext({ type: 'Game Night' }).event_type).toBe('game night');
  });

  test('every runway bucket is reachable and ordered', () => {
    expect(runwayBucket(-1)).toBe('past');
    expect(runwayBucket(0)).toBe('day_of');
    expect(runwayBucket(1)).toBe('day_before');
    expect(runwayBucket(5)).toBe('week');
    expect(runwayBucket(20)).toBe('month');
    expect(runwayBucket(90)).toBe('long');
  });
});

describe('missing data is reported honestly, never defaulted', () => {
  test('no event at all yields all nulls', () => {
    expect(analyticsEventContext(null)).toEqual({ event_type: null, days_out: null, is_solemn: null, is_destination: null });
    expect(analyticsEventContext(undefined).event_type).toBeNull();
  });

  test('a missing date is null, NOT zero — "no date" is not "due today"', () => {
    const c = analyticsEventContext({ type: 'Birthday' });
    expect(c.days_out).toBeNull();
    expect(c.days_out).not.toBe(0);
    expect(runwayBucket(c.days_out)).toBeNull();
  });

  test('an unparseable date is null, not a guess', () => {
    expect(analyticsEventContext({ date: 'someday' }).days_out).toBeNull();
    expect(analyticsEventContext({ date: '' }).days_out).toBeNull();
  });

  test('an absent isDestination is NULL, not false', () => {
    // "nobody set this" and "this is local" are different facts, and the
    // destination-activation question depends on telling them apart.
    expect(analyticsEventContext({ type: 'Wedding' }).is_destination).toBeNull();
  });

  test('an empty or whitespace type is null, not an empty string', () => {
    expect(analyticsEventContext({ type: '   ' }).event_type).toBeNull();
    expect(analyticsEventContext({ type: '' }).event_type).toBeNull();
  });

  test('never throws on hostile input', () => {
    for (const bad of [0, '', 'nope', [], true, { type: 42 }, { date: {} }]) {
      expect(() => analyticsEventContext(bad)).not.toThrow();
    }
  });
});

describe('no PII', () => {
  const HOST_FIELDS = ['name', 'venue', 'venueCity', 'venueState', 'guests', 'vendors', 'email', 'phone', 'budget', 'notes'];

  test('the context carries exactly four keys and none of them are host data', () => {
    const c = analyticsEventContext({
      type: 'Repast', name: 'Repast for Deacon Willie Hayes',
      venue: 'Mount Zion Baptist Church', venueCity: 'Atlanta', venueState: 'GA',
      date: daysFromNow(4), guests: [{ name: 'Ada' }], vendors: [{ name: 'Ace' }],
      totalBudget: 5000, isDestination: false,
    });
    expect(Object.keys(c).sort()).toEqual(['days_out', 'event_type', 'is_destination', 'is_solemn']);
    for (const f of HOST_FIELDS) expect(c).not.toHaveProperty(f);
  });

  test('the host event NAME never leaks, even when it contains a person', () => {
    const c = analyticsEventContext({ type: 'Repast', name: 'Repast for Deacon Willie Hayes' });
    const serialized = JSON.stringify(c);
    expect(serialized).not.toMatch(/Willie|Hayes|Deacon/i);
  });

  test('no value is a free-text string except the controlled type', () => {
    const c = analyticsEventContext({ type: 'Birthday', name: 'X', date: daysFromNow(3), isDestination: true });
    expect(typeof c.event_type).toBe('string');
    expect(typeof c.days_out).toBe('number');
    expect(typeof c.is_solemn).toBe('boolean');
    expect(typeof c.is_destination).toBe('boolean');
  });
});

// ─── VISIBILITY GUARD PARITY ─────────────────────────────────────────────────
// reason_shown must mean "the host could see this reason". The only way to keep
// that true over time is to require the effect's guard to be a COPY of the render
// guard — pinned here because a drift between them is silent and corrupts the one
// ratio the instrumentation exists to produce.
describe('impression guard matches the render guard', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
  const has = (re) => re.test(SRC);

  test('the effect uses the same three conditions as the rendered block', () => {
    expect(has(/const blockRendered = elegantMode && askMode && !\(nearDayPlan && !queueOpen\);/)).toBe(true);
    expect(has(/\{elegantMode && askMode && !\(nearDayPlan && !queueOpen\) && \(\(\) => \{/)).toBe(true);
  });

  test('reason_shown fires only inside that guard', () => {
    const i = SRC.indexOf('if (blockRendered) {');
    const j = SRC.indexOf('REASON_SHOWN');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);   // the emit is inside the guarded block
  });

  test('the misleading event name was retired before any data existed', () => {
    expect(has(/ROW_WITH_REASON_CLICKED/)).toBe(true);
    expect(has(/ANALYTICS\.REASON_CLICKED/)).toBe(false);
  });

  test('completion reports a resolution and a client timestamp', () => {
    expect(has(/resolution: resolution \|\| 'settled'/)).toBe(true);
    expect(has(/completed_at: new Date\(\)\.toISOString\(\)/)).toBe(true);
  });

  test('a snoozed departure is NOT reported as a completion', () => {
    expect(has(/snoozed \? 'snoozed' : 'left_queue'/)).toBe(true);
  });

  test('every reasoning event carries the shared context', () => {
    // Both emitters spread analyticsCtx; without it nothing is segmentable.
    expect((SRC.match(/\.\.\.analyticsCtx,/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
