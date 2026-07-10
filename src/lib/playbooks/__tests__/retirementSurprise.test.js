// Retirement Party — the Day-of timeline and vendor alt-to-DIY copy must not
// assume "Full surprise" choreography (co-conspirator, lookout, hiding the
// honoree) before the host has actually chosen that. `surprise` is a real
// decision (Full surprise / Soft surprise / Announced celebration); unanswered
// must read the same as an explicit "Announced celebration" — never silently
// assume the decision's default pick. See resolveAnsweredCopy() in ../index.js
// and buildVendorPlan() in ../../vendorPlan.js.
import { playbookRunOfShow, playbookChecklist } from '../index';
import { buildVendorPlan } from '../../vendorPlan';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (foodChoices) => ({ id: 'rp', type: 'Retirement Party', date: future, guestCount: 40, guestEstimate: 40, foodChoices });

const SURPRISE_RE = /co-conspirator|lookout|out of sight|SURPRISE prep|SURPRISE choreography/i;

describe('Retirement Party Day-of run-of-show — surprise choreography is decision-gated', () => {
  test('unanswered surprise decision → no co-conspirator/lookout/hide language', () => {
    const ros = playbookRunOfShow(ev(undefined)) || [];
    expect(ros.length).toBeGreaterThan(0);
    expect(ros.some((r) => SURPRISE_RE.test(r.segment))).toBe(false);
  });
  test('"Announced celebration" → no co-conspirator/lookout/hide language', () => {
    const ros = playbookRunOfShow(ev({ surprise: 'Announced celebration' })) || [];
    expect(ros.some((r) => SURPRISE_RE.test(r.segment))).toBe(false);
  });
  test('"Full surprise" → the arrival cue keeps the real surprise choreography', () => {
    const ros = playbookRunOfShow(ev({ surprise: 'Full surprise' })) || [];
    const arrival = ros.find((r) => /co-conspirator/i.test(r.segment));
    expect(arrival).toBeTruthy();
    expect(arrival.segment).toMatch(/lookout/i);
  });
  test('"Soft surprise" → some choreography survives, but not the full-surprise hide/lookout framing', () => {
    const ros = playbookRunOfShow(ev({ surprise: 'Soft surprise (honoree knows, not the details)' })) || [];
    const arrival = ros.find((r) => /co-conspirator/i.test(r.segment));
    expect(arrival).toBeTruthy();
    expect(arrival.segment).not.toMatch(/lookout|out of sight/i);
  });
});

describe('Retirement Party Day-of checklist (t_arrival) — same decision gate', () => {
  test('unanswered → no SURPRISE choreography language in the task list', () => {
    const rows = playbookChecklist(ev(undefined), future);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => SURPRISE_RE.test(r.task))).toBe(false);
  });
  test('"Full surprise" → t_arrival keeps the real choreography', () => {
    const rows = playbookChecklist(ev({ surprise: 'Full surprise' }), future);
    expect(rows.some((r) => /co-conspirator brings the honoree in on cue/i.test(r.task))).toBe(true);
  });
});

describe('Retirement Party vendor alt-to-DIY copy — surprise-gated', () => {
  const plan = (foodChoices) => buildVendorPlan({ id: 'rp', type: 'Retirement Party', guestCount: 40, date: future, vendors: [], foodChoices });
  test('unanswered → bartender/photographer altToDIY do not reference "the surprise"', () => {
    const p = plan(undefined);
    const bartender = p.categories.find((c) => c.category === 'Bar / Bartender');
    const photog = p.categories.find((c) => c.category === 'Photographer');
    expect(bartender.altToDIY).not.toMatch(/surprise/i);
    expect(photog.altToDIY).not.toMatch(/surprise/i);
  });
  test('"Announced celebration" → same neutral copy, no "surprise" reference', () => {
    const p = plan({ surprise: 'Announced celebration' });
    const bartender = p.categories.find((c) => c.category === 'Bar / Bartender');
    const photog = p.categories.find((c) => c.category === 'Photographer');
    expect(bartender.altToDIY).not.toMatch(/surprise/i);
    expect(photog.altToDIY).not.toMatch(/surprise/i);
  });
  test('"Full surprise" → altToDIY copy references the surprise again', () => {
    const p = plan({ surprise: 'Full surprise' });
    const bartender = p.categories.find((c) => c.category === 'Bar / Bartender');
    const photog = p.categories.find((c) => c.category === 'Photographer');
    expect(bartender.altToDIY).toMatch(/surprise/i);
    expect(photog.altToDIY).toMatch(/surprise/i);
  });
});
