// ── THE DEDUP THAT DIES SILENTLY ────────────────────────────────────────────
//
// The food cue says "Decide what you're serving · 3 open" and COUNTS playbook
// choice records that the `decisions` surface also raises individually. WAVE-6
// added record-level dedup in eventPlan (CommandCenter.jsx ~:1919): the
// per-item raises win, and the summary drops its claim to exactly those
// records — dropping out entirely when every record is raised elsewhere, or
// recounting its own label when only some are.
//
// WHY THIS NEEDS ITS OWN GATE. The whole mechanism hangs on `i.records` being
// present. If that field ever stops flowing, the dedup does not fail — it
// quietly stops running, and the plan bills the same decision twice: once in a
// summary and once as its own row. That is exactly the failure the field was
// added to prevent, and it is invisible from either side alone.
//
// It is not hypothetical. `pickCue` was found DROPPING `records` earlier in
// this same sprint, which had already made a different invariant test pass
// vacuously against an empty list.
//
// So this asserts the dedup FIRES — not merely that nothing looks wrong.
import { eventPlan } from '../../CommandCenter';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { getPlaybook } from '../playbooks';

// ── ONE CLOCK, NOT TWO (2026-09-17) ─────────────────────────────────────────
// This was pinned to 2026-08-07 while the OTHER engine in the same loop —
// eventPlan(ev), which takes no as-of and reads the real date — was not. Every
// fixture date is AS_OF + horizon, so the two agreed on exactly one day: the
// day this was written. Forty-one days later the "@60d" bridal shower was 19
// real days out to eventPlan and still 60 to deriveEventPhaseProgress, the two
// raised different action sets, and the double-billing assertion tripped. The
// suite was green in CI on 2026-09-14 and red on 2026-09-17 with no code change
// in between — a failure that would have recurred every run from then on, and
// that no diff could have explained.
//
// Anchoring to TODAY puts both clocks on the same day, which is what the
// horizons below were always meant to mean: "this many days from now". Noon
// keeps the arithmetic clear of timezone edges either side of midnight.
const AS_OF = (() => { const d = new Date(); d.setUTCHours(12, 0, 0, 0); return d; })();
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const TYPES = ['birthday', 'wedding', 'babyShower', 'dinnerParty', 'cookout',
  'conference', 'reunion', 'bridalShower'];
const HORIZONS = [400, 120, 60, 30, 14, 7, 3, 1];
const STATES = {
  bare: {},
  counted: { guestCount: 40 },
  listed: { guests: [{ name: 'A', rsvp: 'Yes' }] },
  vendored: { guestCount: 30, vendors: [{ name: 'C', category: 'Catering' }] },
};

function observe() {
  const o = { events: 0, foodWithRecords: 0, dropped: 0, recounted: 0, kept: 0, doubleBilled: [] };
  for (const type of TYPES) {
    if (!getPlaybook(type)) continue;
    for (const days of HORIZONS) {
      for (const [state, extra] of Object.entries(STATES)) {
        const ev = {
          id: 'e-dedup', type, name: 'Dedup', venue: 'The Hall',
          date: iso(AS_OF.getTime() + days * 864e5), foodChoices: {}, ...extra,
        };
        let plan, prog;
        try { plan = eventPlan(ev) || {}; prog = deriveEventPhaseProgress(ev, AS_OF) || {}; } catch { continue; }
        o.events++;
        const food = (prog.items || []).find(i => i.id === 'food' && Array.isArray(i.records) && i.records.length);
        if (!food) continue;
        o.foodWithRecords++;
        const actions = plan.nextActions || [];
        const summary = actions.find(a => a.id === 'phase:food');
        if (!summary) { o.dropped++; continue; }
        const claimed = /·\s*(\d+)\s+open/.exec(summary.title || '');
        if (claimed && Number(claimed[1]) !== food.records.length) o.recounted++;
        else o.kept++;
        // No record may be billed by the summary AND by its own row.
        const raised = new Set(actions.filter(a => a !== summary)
          .map(a => String(a.decisionId || a.recordId || (a.id || '').split(':').pop())));
        const stillClaimed = claimed ? Number(claimed[1]) : food.records.length;
        const overlap = food.records.filter(r => raised.has(String(r)));
        if (overlap.length && stillClaimed === food.records.length) {
          o.doubleBilled.push(`${type}@${days}d/${state}: ${overlap.join(',')}`);
        }
      }
    }
  }
  return o;
}

const O = observe();

describe('record-level dedup', () => {
  test('the sweep saw real summaries to dedup (premise)', () => {
    expect(O.events).toBeGreaterThan(200);
    expect(O.foodWithRecords).toBeGreaterThan(80);
  });

  test('the dedup actually FIRES — it is not dormant code', () => {
    // The load-bearing assertion. If `records` stops reaching eventPlan, this
    // drops to zero while every other test in the repo stays green.
    expect(O.dropped + O.recounted).toBeGreaterThan(50);
  });

  test('both of its branches are exercised', () => {
    expect(O.dropped).toBeGreaterThan(0);     // every record raised elsewhere
    expect(O.recounted).toBeGreaterThan(0);   // only some raised — label recounted
  });

  test('no record is billed by a summary and by its own row', () => {
    expect(O.doubleBilled).toEqual([]);
  });
});
