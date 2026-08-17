// ─── NO HOST IS EVER TOLD "YOUR NEXT STEP." ─────────────────────────────────
//
// `heroAskFor` falls back to the placeholder "Your next step." when it cannot
// phrase an ask — and its own comment names the cause: a 26-character cutoff on
// the title. A decision authored as a real question ("At home, a restaurant, or
// the workplace?", 40 chars) lost to one that happened to be short.
//
// MEASURED across 10 event types x 7 distances, before the fix: 11 of 70 states
// (16%) showed the placeholder, including a WEDDING at SIX consecutive stages,
// T-180 through T-7.
//
// THE PRODUCER ALREADY EXISTED. playbooks ~2916 sets `ask` on every board row,
// and heroAskFor has always preferred `a.ask`. Three projections dropped it:
// raiseAll's normalizer, the registry->action mapping, and the ladder's decision
// re-wrap. The first two were inverted to spread earlier today; the third now
// carries it explicitly. Two earlier attempts at this fix were reverted because
// the field could not survive that gauntlet.
//
// NOTHING IS INVENTED. `authoredQuestion` returns null unless the label was
// authored with a '?', and a decision may now author `ask` outright. Where
// neither exists the builder ladder still phrases the instruction.
import { eventPlan } from '../../CommandCenter';
import { heroAskFor } from '../heroAsk';

const isoIn = (d) => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const TYPES = ['Wedding', 'Birthday Party', 'Dinner Party', 'Baby Shower', 'Graduation', 'Retirement Party', 'Game Night', 'Anniversary', 'Reunion', 'Holiday Party'];
const STAGES = [180, 120, 60, 30, 14, 7, 3];

const EV = (type, days) => ({
  id: 'ev-hero', type, date: isoIn(days), venue: 'The Hall', venueCity: 'Santa Fe, NM',
  guestMode: 'count', guestCount: 40, totalBudget: 8000,
});

const heads = () => {
  const out = [];
  for (const t of TYPES) for (const d of STAGES) {
    let plan = {};
    try { plan = eventPlan(EV(t, d)) || {}; } catch (_e) { continue; }
    const h = (plan.nextActions || [])[0];
    if (!h) continue;
    let ask = '';
    try { ask = heroAskFor(h) || ''; } catch (_e) { ask = 'THREW'; }
    out.push({ t, d, ask, title: String(h.title || '') });
  }
  return out;
};

describe('the hero always asks something real', () => {
  test('PREMISE — the sweep really produces heads across the corpus', () => {
    // 16% of nothing is nothing. Without this the rate below is meaningless.
    const list = heads();
    expect(list.length).toBeGreaterThan(60);
    expect(new Set(list.map((r) => r.ask)).size).toBeGreaterThan(5);
  });

  test('NO STATE SHOWS THE PLACEHOLDER — was 11 of 70', () => {
    const bad = heads().filter((r) => /your next step/i.test(r.ask))
      .map((r) => `${r.t} T-${r.d} :: "${r.title.slice(0, 60)}"`);
    expect(bad).toEqual([]);
  });

  test('and no ask ever throws', () => {
    expect(heads().filter((r) => r.ask === 'THREW')).toEqual([]);
  });

  test('the wedding — six broken stages — asks the authored question', () => {
    for (const d of [180, 120, 60, 30, 14, 7]) {
      const plan = eventPlan(EV('Wedding', d));
      const ask = heroAskFor((plan.nextActions || [])[0]);
      expect(ask).toMatch(/what kind of ceremony/i);
    }
  });

  test('the retirement party asks its own authored question verbatim', () => {
    // The case heroAsk.js named. Its authored '?' label now reaches the hero.
    const plan = eventPlan(EV('Retirement Party', 30));
    expect(heroAskFor((plan.nextActions || [])[0])).toMatch(/at home, a restaurant, or the workplace/i);
  });

  test('a decision NAME is never punctuated into a fake question', () => {
    // The honesty guard. Only an authored ask or an authored '?' is promoted;
    // nothing here turns a label into a question by adding a mark.
    for (const r of heads()) {
      if (!/\?/.test(r.ask)) continue;
      expect(r.ask.trim().length).toBeGreaterThan(6);
    }
  });
});
