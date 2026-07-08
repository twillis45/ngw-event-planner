// RAIN-2 + GUEST-RAIN-2 — rain-plan assist templates and the guest-safe rain
// message. Two different audiences, two different helpers: suggestRainPlan is
// HOST copy (may name vendors/load-in — it's the host's own working plan);
// guestRainMessage is GUEST copy (calm, plain text, light icons, zero internal
// logistics, no weather certainty).

import { suggestRainPlan, guestRainMessage, RAIN_PLAN_TARGET, rainPlanGap } from '../weather';

const atHome = { venueKind: 'home', venueCity: 'Alexandria, VA' };
const venueEv = { venue: 'VFW Post 3150 — Alexandria, VA' };

describe('suggestRainPlan (RAIN-2)', () => {
  test('at-home/outdoor event gets the backup-spot template', () => {
    const s = suggestRainPlan(atHome);
    expect(s).toMatch(/covered or indoor backup spot/i);
    expect(s).toMatch(/entrance and parking note/i);
  });

  test('venue event names the venue and its indoor backup', () => {
    const s = suggestRainPlan(venueEv);
    expect(s).toContain('indoors at VFW Post 3150 — Alexandria, VA');
    expect(s).toMatch(/indoor backup space/i);
  });

  test('no venue data still yields a useful generic plan', () => {
    const s = suggestRainPlan({});
    expect(s.length).toBeGreaterThan(60);
    expect(s).toMatch(/under cover/i);
  });

  test('deterministic — same event, same text (no AI, no randomness)', () => {
    expect(suggestRainPlan(venueEv)).toBe(suggestRainPlan(venueEv));
  });

  test('saving a suggested plan clears the rain gap through the existing loop', () => {
    expect(rainPlanGap({ ...venueEv }, { outdoors: true })).toBeTruthy();
    expect(rainPlanGap({ ...venueEv, rainPlan: suggestRainPlan(venueEv) }, { outdoors: true })).toBeNull();
  });

  test('deep-link target unchanged (CTA contract stays green)', () => {
    expect(RAIN_PLAN_TARGET).toEqual({ tab: 'Event Details', focusField: 'rain-plan' });
  });
});

describe('guestRainMessage (GUEST-RAIN-2)', () => {
  const INTERNAL = /vendor|load-in|load in|power|catering setup|tent|sound|setup protected|COI|invoice/i;

  test('structured plain text: line breaks, no markdown, ONE restrained glyph', () => {
    const m = guestRainMessage({ name: "Wanda's celebration", ...venueEv });
    expect(m.split('\n').length).toBeGreaterThanOrEqual(8);
    expect(m).not.toMatch(/\*\*|__|^#|^- /m);
    // GUEST-RAIN-3: sophistication = restraint. The umbrella glyph is the only
    // pictograph; arrows (→, outside the emoji ranges) carry the structure.
    const emoji = m.match(/[☀-➿\u{1F300}-\u{1FAFF}]/gu) || [];
    expect(emoji.length).toBeGreaterThanOrEqual(1);
    expect(emoji.length).toBeLessThanOrEqual(2);
    expect(m.match(/^→ /gm).length).toBe(3);
  });

  test('venue event copy is guest-facing and names the venue', () => {
    const m = guestRainMessage({ name: 'Retirement Celebration', ...venueEv });
    expect(m).toContain('☂ Weather note — Retirement Celebration');
    expect(m).toContain('→ Head indoors at VFW Post 3150 — Alexandria, VA');
    expect(m).not.toMatch(INTERNAL);
  });

  test('at-home copy is guest-facing (head inside)', () => {
    const m = guestRainMessage({ name: 'Backyard 50th', ...atHome });
    expect(m).toContain('→ Head inside when you arrive');
    expect(m).not.toMatch(INTERNAL);
  });

  test('missing event name still reads well', () => {
    expect(guestRainMessage({})).toContain('☂ Weather note — our event');
  });

  test('parking: real host-authored note when present, safe fallback otherwise', () => {
    expect(guestRainMessage({ parkingNotes: 'Street parking on Elm — overflow at the church lot' }))
      .toContain('→ Parking: Street parking on Elm — overflow at the church lot');
    expect(guestRainMessage({}))
      .toContain('→ Parking stays the same unless we send a change');
  });

  test('never claims confirmed or severe rain — conditional voice only', () => {
    const m = guestRainMessage(venueEv);
    expect(m).toContain('If rain comes through:');
    expect(m).not.toMatch(/it will rain|rain is confirmed|severe|storm warning/i);
    expect(m).toContain("We're still on.");
  });

  test('the host rain plan text NEVER leaks into the guest message', () => {
    const m = guestRainMessage({ ...venueEv, rainPlan: 'SECRET: vendor load-in moves to dock B, generator under the tent' });
    expect(m).not.toContain('SECRET');
    expect(m).not.toMatch(INTERNAL);
  });
});

// ── Rain WINDOW (times) — real hourly data only, never invented ────────────────
import { computeRainWindow } from '../weather';

describe('computeRainWindow + timed guest message', () => {
  // OpenWeather-shaped hourly fixture: event date 2026-07-08, tz UTC (offset 0),
  // rain (pop>=0.4) from 14:00 through 17:00 local.
  const day = '2026-07-08';
  const dt = (h) => Math.floor(Date.parse(`${day}T${String(h).padStart(2,'0')}:00:00Z`) / 1000);
  const hourly = [
    { dt: dt(10), pop: 0.1 }, { dt: dt(12), pop: 0.2 },
    { dt: dt(14), pop: 0.55 }, { dt: dt(15), pop: 0.7 },
    { dt: dt(16), pop: 0.6 }, { dt: dt(17), pop: 0.45 },
    { dt: dt(19), pop: 0.1 },
  ];

  test('extracts the real rain span as a readable label', () => {
    const w = computeRainWindow(hourly, day, 0);
    expect(w.startHour).toBe(14);
    expect(w.endHour).toBe(17);
    expect(w.label).toBe('2 PM–6 PM');
  });

  test('single rainy hour reads as "around"', () => {
    expect(computeRainWindow([{ dt: dt(15), pop: 0.8 }], day, 0).label).toBe('around 3 PM');
  });

  test('no hourly coverage for the date → null (times are never invented)', () => {
    expect(computeRainWindow(hourly, '2026-07-20', 0)).toBeNull();
    expect(computeRainWindow(null, day, 0)).toBeNull();
    expect(computeRainWindow([{ dt: dt(15), pop: 0.2 }], day, 0)).toBeNull();
  });

  test('guest message includes the window only when the forecast carries it', () => {
    const { guestRainMessage } = require('../weather');
    const withWx = guestRainMessage({ name: 'Cookout', venue: 'Fort Ward Park' },
      { rainWindow: computeRainWindow(hourly, day, 0) });
    expect(withWx).toContain('If rain comes through (looks most likely 2 PM–6 PM):');
    const withoutWx = guestRainMessage({ name: 'Cookout', venue: 'Fort Ward Park' });
    expect(withoutWx).toContain('If rain comes through:');
    expect(withoutWx).not.toMatch(/most likely/);
  });
});
