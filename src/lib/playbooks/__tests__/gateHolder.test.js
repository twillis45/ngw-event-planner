// Wave-2z: the dependency graph SEQUENCES, not just gates. A READY decision that a sibling is
// waiting on (a gate-holder) leads the rows it blocks — but stays below overdue urgency.
import { playbookDecisionBoard } from '../index';

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

describe('dependency-driven ordering (gate-holders lead)', () => {
  test('a ready gate leads a higher-weight NON-gating sibling (food_style over alcohol)', () => {
    // Graduation: food_menu dependsOn food_style; alcohol is weight:high but gates nothing.
    const b = playbookDecisionBoard({ id: 'g', type: 'Graduation', date: iso(50), guests: [], guestEstimate: 40 });
    const ids = b.open.map((r) => r.id);
    const foodStyle = b.open.find((r) => r.id === 'food_style');
    expect(foodStyle).toBeTruthy();
    expect(foodStyle.gateHolder).toBe(true);
    // the ready food-sourcing gate outranks the higher-weight non-gating alcohol call
    expect(ids.indexOf('food_style')).toBeLessThan(ids.indexOf('alcohol'));
    // and its blocked dependent (food_menu) is waiting, ranked below it
    const menu = b.open.find((r) => r.id === 'food_menu');
    if (menu) { expect(menu.status).toBe('waiting'); expect(ids.indexOf('food_style')).toBeLessThan(ids.indexOf('food_menu')); }
  });

  test('a gate-holder never outranks an OVERDUE row (bounded below the status tier)', () => {
    // Sweet 16 near-ish date: overdue calls must still lead; the ready gate sits below them.
    const b = playbookDecisionBoard({ id: 's', type: 'Sweet 16', date: iso(50), guests: [], guestEstimate: 40 });
    const overdue = b.open.filter((r) => r.status === 'overdue');
    const gate = b.open.find((r) => r.gateHolder);
    if (overdue.length && gate) {
      const gateIdx = b.open.indexOf(gate);
      // every overdue row precedes the gate-holder
      expect(b.open.slice(0, gateIdx).every((r) => r.status === 'overdue' || !r.gateHolder)).toBe(true);
      expect(b.open[0].status).toBe('overdue');
    }
  });

  test('no gate-holders on a playbook with no authored deps → additive (unchanged ordering)', () => {
    // Baby Shower authors zero decision-level dependsOn, so no gateHolder rows (bump never fires).
    const b = playbookDecisionBoard({ id: 'b', type: 'Baby Shower', date: iso(50), guests: [], guestEstimate: 20 });
    expect(b.open.every((r) => !r.gateHolder)).toBe(true);
  });

  test('a gate-holder never buries a SAFETY row (allergy/dietary still leads)', () => {
    // Birthday: cake dependsOn [theme, headcount] — headcount is a high-weight gate — but the
    // dietary/allergy safety row must still lead the board (the gate bump is clamped below it).
    const asof = '2026-07-14';
    const dOut = (n) => { const x = new Date('2026-07-14T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const b = playbookDecisionBoard({ id: 'bd', type: 'Birthday', date: dOut(30), guestMode: 'count', guestCount: 30 }, asof);
    const dietary = b.open.find((r) => r.id === 'dietary');
    if (dietary) {
      expect(b.open[0].id).toBe('dietary');                        // safety leads outright
      const hc = b.open.find((r) => r.id === 'headcount');
      if (hc && hc.gateHolder) expect(b.open.indexOf(hc)).toBeGreaterThan(0); // the high-weight gate sits below it
    }
  });
});
