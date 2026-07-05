// POP-1 rain-plan continuity slice: the planner readiness source for "do we
// have a rain plan?" is event.rainPlan ONLY. event.guestBrief.rainPlan is
// guest-facing brief copy and never satisfies planner readiness — the two
// fields are intentionally separate and NOT synced.

import { rainPlanStatus, rainPlanGap, rainAwareSummary, RAIN_PLAN_TARGET } from '../weather';
import { draftGuestBrief } from '../doItForMe';

describe('rainPlanStatus — planner readiness source is event.rainPlan only', () => {
  test('empty event.rainPlan -> hasPlan false, CTA is "Add rain plan"', () => {
    expect(rainPlanStatus({ rainPlan: '' })).toEqual({
      hasPlan: false, plan: null, target: RAIN_PLAN_TARGET, ctaLabel: 'Add rain plan',
    });
  });

  test('meaningful event.rainPlan -> hasPlan true with the trimmed plan text', () => {
    const st = rainPlanStatus({ rainPlan: '  Move ceremony into the VFW hall by 10am.  ' });
    expect(st.hasPlan).toBe(true);
    expect(st.plan).toBe('Move ceremony into the VFW hall by 10am.');
    expect(st.ctaLabel).toBe('Review rain plan');
  });

  test('whitespace-only rainPlan does NOT count as a plan', () => {
    expect(rainPlanStatus({ rainPlan: '   ' }).hasPlan).toBe(false);
  });

  test('event.guestBrief.rainPlan alone does NOT satisfy planner readiness', () => {
    const st = rainPlanStatus({ rainPlan: '', guestBrief: { rainPlan: 'We move under the pavilion.' } });
    expect(st.hasPlan).toBe(false);
  });

  test('null/undefined event never throws', () => {
    expect(rainPlanStatus(null).hasPlan).toBe(false);
    expect(rainPlanStatus(undefined).hasPlan).toBe(false);
  });

  test('deep-link target uses the existing {tab, focusField} route convention', () => {
    // 'Event Details' is the real tab id (App.js renders `tab === 'Event Details'`;
    // host label "Where & when"). NOT 'Details' — that id has no render branch.
    expect(RAIN_PLAN_TARGET).toEqual({ tab: 'Event Details', focusField: 'rain-plan' });
  });
});

describe('rainPlanGap — the "Rain plan missing for an outdoor event" readiness gap', () => {
  test('outdoor event with no rainPlan -> gap with message + deep-link target', () => {
    const gap = rainPlanGap({ rainPlan: '' }, { outdoors: true });
    expect(gap).toEqual({
      message: 'Rain plan missing for an outdoor event',
      target: RAIN_PLAN_TARGET,
      ctaLabel: 'Add rain plan',
    });
  });

  test('outdoor event WITH rainPlan filled -> gap resolves (null)', () => {
    expect(rainPlanGap({ rainPlan: 'Tent from Old Town Tent & Party Rentals; call by 8am.' }, { outdoors: true })).toBeNull();
  });

  test('indoor event -> no gap regardless of rainPlan', () => {
    expect(rainPlanGap({ rainPlan: '' }, { outdoors: false })).toBeNull();
    expect(rainPlanGap({ rainPlan: '' }, {})).toBeNull();
  });

  test('guestBrief.rainPlan alone does NOT resolve the gap', () => {
    const gap = rainPlanGap({ rainPlan: '', guestBrief: { rainPlan: 'Pavilion.' } }, { outdoors: true });
    expect(gap).not.toBeNull();
  });
});

describe('rainAwareSummary — weather copy recognizes a saved rain plan (forecast untouched)', () => {
  test('"rain plan required" stops nagging once a plan exists', () => {
    expect(rainAwareSummary('Heavy rain likely (80%) — rain plan required', true))
      .toBe('Heavy rain likely (80%) — your rain plan is on file');
  });

  test('"monitor and prepare a rain plan" stops nagging once a plan exists', () => {
    expect(rainAwareSummary('Rain possible (45%) — monitor and prepare a rain plan', true))
      .toBe('Rain possible (45%) — monitor; your rain plan is on file');
  });

  test('no plan -> summary passes through unchanged', () => {
    expect(rainAwareSummary('Heavy rain likely (80%) — rain plan required', false))
      .toBe('Heavy rain likely (80%) — rain plan required');
  });

  test('non-rain summaries pass through unchanged even with a plan', () => {
    expect(rainAwareSummary('Hot day forecast (97°F) — plan ice, shade, and water', true))
      .toBe('Hot day forecast (97°F) — plan ice, shade, and water');
    expect(rainAwareSummary(null, true)).toBeNull();
  });
});

describe('Guest Brief behavior unchanged — event.guestBrief.rainPlan stays guest-facing only', () => {
  test('draftGuestBrief still reads guestBrief.rainPlan for the shareable brief (no sync from event.rainPlan)', () => {
    const event = {
      name: 'Backyard Send-Off', type: 'Backyard BBQ', date: '2026-08-15',
      rainPlan: 'PLANNER-ONLY: garage fallback', // must NOT leak into the brief
      guestBrief: { rainPlan: 'If it rains we move under the covered patio.' },
    };
    const { body } = draftGuestBrief(event, null);
    expect(body).toContain('☔ Rain plan: If it rains we move under the covered patio.');
    expect(body).not.toContain('PLANNER-ONLY');
  });

  test('empty guestBrief.rainPlan -> no rain line in the brief, even when event.rainPlan is set (no auto-copy)', () => {
    const event = {
      name: 'Backyard Send-Off', type: 'Backyard BBQ', date: '2026-08-15',
      rainPlan: 'Garage fallback by 9am.',
      guestBrief: {},
    };
    const { body } = draftGuestBrief(event, null);
    expect(body).not.toContain('☔ Rain plan:');
  });
});
