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

  test('structured plain text: line breaks, no markdown, light icons (3-5)', () => {
    const m = guestRainMessage({ name: "Wanda's celebration", ...venueEv });
    expect(m.split('\n').length).toBeGreaterThanOrEqual(8);
    expect(m).not.toMatch(/\*\*|__|^#|^- /m);
    const emoji = m.match(/[☀-➿\u{1F300}-\u{1FAFF}]/gu) || [];
    expect(emoji.length).toBeGreaterThanOrEqual(3);
    expect(emoji.length).toBeLessThanOrEqual(5);
  });

  test('venue event copy is guest-facing and names the venue', () => {
    const m = guestRainMessage({ name: 'Retirement Celebration', ...venueEv });
    expect(m).toContain('☔ Weather update for Retirement Celebration');
    expect(m).toContain('📍 Head indoors at VFW Post 3150 — Alexandria, VA');
    expect(m).not.toMatch(INTERNAL);
  });

  test('at-home copy is guest-facing (head inside)', () => {
    const m = guestRainMessage({ name: 'Backyard 50th', ...atHome });
    expect(m).toContain('📍 Head inside when you arrive');
    expect(m).not.toMatch(INTERNAL);
  });

  test('missing event name still reads well', () => {
    expect(guestRainMessage({})).toContain('☔ Weather update for our event');
  });

  test('parking: real host-authored note when present, safe fallback otherwise', () => {
    expect(guestRainMessage({ parkingNotes: 'Street parking on Elm — overflow at the church lot' }))
      .toContain('🚗 Parking: Street parking on Elm — overflow at the church lot');
    expect(guestRainMessage({}))
      .toContain('🚗 Parking stays the same unless we send a change');
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
