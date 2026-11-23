// ─── WORDS A HOST SEES, READ RIGHT (audit 2, lane A P2, 11/22/2026) ──────────
//
//   (P2-3, "Open the spread (1 items) ›", is a render: theFoodAskSaysItOnce.spec.mjs.)
//   P2-4 "Consider replacing" on rows with nothing to replace ("Write the vision
//        brief", "Tour… venue", "Order the ballgown"). The chip is the rush
//        grade for a step long past its window; it now says what is true of
//        any step: do it now, or let it go.
//   P2-8 Wedding: with "Symbolic / personal" picked as the ceremony, the
//        checklist still asked to confirm the officiant filed the license with
//        the county and to do the legal name change in order.
import { URGENCY_META, taskUrgencyChip } from '../workflowCompression';
import { playbookChecklist } from '../playbooks';

describe('P2-4: the late-step chip never offers a replacement it cannot name', () => {
  test('the rush grade says do it now or let it go', () => {
    expect(URGENCY_META.risk_lost.label).toBe('Do it now or let it go');
    for (const k of ['label', 'short', 'explanation']) expect(URGENCY_META.risk_lost[k]).not.toMatch(/replac|swap|substitute/i);
  });

  test('a wedding step a year early, four days out, reads that way', () => {
    const u = taskUrgencyChip({ task: 'Write the vision brief', week: '_', leadDays: 365 }, 4, 'Wedding', { _: 365 });
    expect(u && u.urgency).toBe('risk_lost');
    expect(u.label).toBe('Do it now or let it go');
  });
});

describe('P2-8: a symbolic ceremony files no license', () => {
  const wedding = (ceremony) => ({
    id: 'w', type: 'Wedding', date: '2027-06-12', guestCount: 120,
    foodChoices: ceremony ? { ceremony } : {},
  });
  const ids = (ev) => new Set((playbookChecklist(ev, new Date('2026-11-22T12:00:00')) || []).map((r) => String(r.id)));
  const has = (set, frag) => [...set].some((id) => id.includes(frag));

  test('answered symbolic: no license filing, no legal name change', () => {
    const s = ids(wedding('Symbolic / personal'));
    expect(has(s, 't_after_license')).toBe(false);
    expect(has(s, 't_after_namechange')).toBe(false);
    expect(has(s, 't_after_gallery')).toBe(true); // the rest of the after-steps stay
  });

  test('civil, religious, or not yet answered: the license steps stay', () => {
    for (const c of ['Civil', 'Religious / house of worship', 'Cultural / traditional', null]) {
      const s = ids(wedding(c));
      expect(has(s, 't_after_license')).toBe(true);
      expect(has(s, 't_after_namechange')).toBe(true);
    }
  });
});
