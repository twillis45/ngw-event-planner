// ─── Event orientation (Phase 5G-C1 Parts 8-9) ───────────────────────────────
//
// THE INVARIANT UNDER TEST: orientation is DERIVED. It introduces no source of truth,
// invents no readiness, and cannot disagree with the engine it reads.
import { deriveEventPhaseProgress } from '../phaseProgress';
import {
  orientation, readinessSegments, severeBlocker, segmentsText,
  LIFECYCLE_LABELS, DIMENSION_LABELS,
} from '../eventOrientation';

const NOW = new Date('2026-08-02T12:00:00Z');
const cuesFor = (ev) => deriveEventPhaseProgress(ev, NOW);

const DATED = { id: 'a', type: 'Birthday', date: '2026-09-20', guestCount: 12 };
const UNDATED = { id: 'c', type: 'Birthday', guestCount: 8 };

describe('the lifecycle label comes from the real phase', () => {
  test('a dated future event is Active planning', () => {
    const o = orientation(cuesFor(DATED));
    expect(o.phase).toBe('pre_event');
    expect(o.lifecycleLabel).toBe('Active planning');
  });

  test('NO DATE stays unknown — never a fabricated phase', () => {
    const o = orientation(cuesFor(UNDATED));
    expect(o.phase).toBe('unknown');
    expect(o.lifecycleLabel).toBe(LIFECYCLE_LABELS.unknown);
    expect(o.summary).toMatch(/no date yet/i);
    // and it does NOT imply progress toward a day it does not have
    expect(o.summary).not.toMatch(/\d+%/);
  });

  test('every phase the engine can emit has a host label', () => {
    for (const p of ['unknown', 'pre_event', 'live_event', 'post_event']) {
      expect(LIFECYCLE_LABELS[p]).toBeTruthy();
    }
  });

  test('it returns null rather than an empty shell when the engine gave nothing', () => {
    expect(orientation(null)).toBeNull();
    expect(orientation({})).toBeNull();
  });
});

describe('the summary derives from state and CHANGES with it', () => {
  test('the summary is not a constant', () => {
    const a = orientation(cuesFor(DATED)).summary;
    const b = orientation(cuesFor(UNDATED)).summary;
    expect(a).not.toBe(b);
  });

  test('it names the actually-open dimensions', () => {
    const cues = cuesFor(DATED);
    const o = orientation(cues);
    const open = cues.items.filter((i) => !i.handled).map((i) => DIMENSION_LABELS[i.id].toLowerCase());
    expect(open.length).toBeGreaterThan(0);
    // the first named open dimension really is open
    expect(o.summary.toLowerCase()).toContain(open[0]);
  });

  test('handling everything changes the summary to "nothing is waiting on you"', () => {
    const cues = cuesFor(DATED);
    const allDone = { ...cues, completedCount: cues.totalCount, items: cues.items.map((i) => ({ ...i, handled: true })) };
    const o = orientation(allDone);
    expect(o.summary).toMatch(/nothing is waiting on you/i);
  });
});

describe('a severe blocker dominates cosmetic completion', () => {
  const cues = cuesFor(DATED);
  const nearlyDone = { ...cues, completedCount: cues.totalCount, items: cues.items.map((i) => ({ ...i, handled: true })) };

  test('an OVERDUE lead item outranks a fully-handled count', () => {
    const o = orientation(nearlyDone, [{ id: 'v1', status: 'overdue', title: 'Pay the caterer' }]);
    expect(o.blocker).toBeTruthy();
    expect(o.summary).toMatch(/past its date/i);
    expect(o.summary).not.toMatch(/nothing is waiting on you/i);
  });

  test('a CRITICAL lead item does the same', () => {
    const o = orientation(nearlyDone, [{ id: 'v1', level: 'critical' }]);
    expect(o.blocker).toBeTruthy();
  });

  test('a negative dueInDays counts as overdue', () => {
    expect(severeBlocker([{ id: 'x', dueInDays: -2 }])).toBeTruthy();
  });

  test('an ordinary open item is NOT a blocker', () => {
    expect(severeBlocker([{ id: 'x', level: 'info', dueInDays: 5 }])).toBeNull();
    expect(severeBlocker([])).toBeNull();
    expect(severeBlocker(null)).toBeNull();
  });
});

describe('segments are categorical and honestly routed', () => {
  const o = orientation(cuesFor(DATED));

  test('every segment mirrors an engine item — none invented', () => {
    const cues = cuesFor(DATED);
    expect(o.segments.length).toBe(cues.items.length);
    for (const s of o.segments) {
      const src = cues.items.find((i) => i.id === s.id);
      expect(src).toBeTruthy();
      expect(s.handled).toBe(!!src.handled);
    }
  });

  test('no segment carries a percentage — handled is a state, not a degree', () => {
    for (const s of o.segments) {
      expect(typeof s.handled).toBe('boolean');
      expect(s).not.toHaveProperty('percent');
      expect(s).not.toHaveProperty('progress');
    }
  });

  test('a HANDLED segment offers no route and no cue', () => {
    const cues = cuesFor(DATED);
    const handled = readinessSegments({ ...cues, items: cues.items.map((i) => ({ ...i, handled: true })) });
    for (const s of handled) {
      expect(s.route).toBeNull();
      expect(s.cueLabel).toBeNull();
      expect(s.explanation).toBeNull();
    }
  });

  test('a weak segment WITHOUT a destination gets a sentence, never a CTA', () => {
    const segs = readinessSegments({ items: [{ id: 'budget', handled: false, route: null, cueLabel: 'Set a budget' }] });
    expect(segs[0].route).toBeNull();
    expect(segs[0].explanation).toMatch(/still open/i);
  });

  test('a weak segment WITH a destination gets the route and no explanation', () => {
    const segs = readinessSegments({ items: [{ id: 'location', handled: false, route: { tab: 'Event Details', focusField: 'event-venue' }, cueLabel: 'Add the location' }] });
    expect(segs[0].route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
    expect(segs[0].explanation).toBeNull();
  });

  test('every routed segment resolves to a REAL landing with a focus or anchor', () => {
    // eslint-disable-next-line global-require
    const { resolveRoute } = require('../routeResolver');
    let checked = 0;
    for (const s of o.segments) {
      if (!s.route) continue;
      const r = resolveRoute(s.route);
      expect(r).toBeTruthy();
      expect(r.anchor || r.focus || r.kind).toBeTruthy();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('every dimension the engine can emit has a plain-language label', () => {
    for (const id of ['datetime', 'location', 'headcount', 'food', 'shopping', 'budget', 'vendors', 'rain', 'moment', 'crabs']) {
      expect(DIMENSION_LABELS[id]).toBeTruthy();
      expect(DIMENSION_LABELS[id]).not.toBe(id);       // a real word, not the key
    }
  });
});

describe('it never disagrees with the engine it reads', () => {
  test('counts are the engine counts, not re-derived', () => {
    const cues = cuesFor(DATED);
    const o = orientation(cues);
    expect(o.completedCount).toBe(cues.completedCount);
    expect(o.totalCount).toBe(cues.totalCount);
    expect(o.primaryAction).toBe(cues.nextCue);
  });

  test('countText is categorical — no percentage anywhere in the output', () => {
    const o = orientation(cuesFor(DATED));
    expect(o.countText).toMatch(/^\d+ of \d+ handled$/);
    expect(JSON.stringify(o)).not.toMatch(/\d+%/);
  });
});

describe('the visual has a text equivalent (accessibility)', () => {
  test('it names the phase, the count and what is open', () => {
    const t = segmentsText(orientation(cuesFor(DATED)));
    expect(t).toMatch(/Active planning/);
    expect(t).toMatch(/\d+ of \d+ handled/);
    expect(t).toMatch(/Still open:/);
  });

  test('it reports a blocker when there is one', () => {
    const cues = cuesFor(DATED);
    const t = segmentsText(orientation(cues, [{ id: 'v', status: 'overdue' }]));
    expect(t).toMatch(/past its date/i);
  });

  test('it degrades safely', () => {
    expect(segmentsText(null)).toBe('');
  });
});
