// ─── AN AUTHORED DEFAULT MUST BE ONE OF ITS OWN OPTIONS ──────────────────────
//
// Found by the 2026-09-18 difmCapable audit, three times:
//
//   dinnerParty  alcohol   default 'Wine + one signature cocktail'
//                          options [... 'Wine + one cocktail' ...]   — one word
//   dinnerParty  seating   default 'Host-assigned for 8+'
//                          options ['Open','Place cards','Host-assigned']
//                          — the default was a RULE, not an option
//   engagementParty toast  default 'Host opens → couple closes'
//                          options ['Host/parent opens → couple closes', …]
//
// WHY THIS IS NOT COSMETIC. `choicePickFor` (playbooks/index.js ~603) falls back
// to the authored default whenever the host has not answered, so the plan runs
// on that string immediately — before anyone taps anything. When the string is
// not in the option list:
//
//   · the decision board offers chips, none of which is the value in force;
//   · `difmCapable: 'can-derive'` proposes it out loud — measured live, a
//     4-guest dinner was told "We'll go with Host-assigned for 8+";
//   · tapping "Sounds good" SETTLES it, and the settled row then reads back a
//     value that does not exist in the schema;
//   · and every `whenChoice: { id, in: [...] }` gate keyed on a real option name
//     silently never fires — the failure mode that shipped the cook-lever leak
//     earlier in this same session, from the opposite direction.
//
// The last one is why a typo here is a functional defect rather than a display
// bug: the gate does not error, it just quietly matches nothing, forever, with
// the suite green.
//
// SCOPE, deliberately narrow: only decisions that AUTHOR a non-empty options
// list are checked. `default: null` is a first-class, honest state (dinnerParty
// `menu` and `dietary` use it, and repast `headcount` was moved to it by this
// same audit — the app does not guess how many people come to a funeral), and an
// options-less decision is free-text by design.
import { ALL_PLAYBOOKS } from '../index';

const decisionsOf = (pb) => (pb && Array.isArray(pb.decisions) ? pb.decisions : []);

describe('every authored default is a real option', () => {
  const offenders = [];
  const checked = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of decisionsOf(pb)) {
      if (!d || !Array.isArray(d.options) || !d.options.length) continue;
      if (d.default == null || d.default === '') continue;      // honest "no default"
      checked.push(`${pb.type}.${d.id}`);
      if (!d.options.includes(d.default)) {
        offenders.push(`${pb.type} · ${d.id}: default ${JSON.stringify(d.default)} is not in ${JSON.stringify(d.options)}`);
      }
    }
  }

  test('no decision defaults to a value it does not offer', () => {
    expect(offenders).toEqual([]);
  });

  // PREMISE CHECK. An empty sweep would pass this file forever — the same
  // silent-pass shape the assertion above exists to catch.
  test('the sweep actually reached the corpus', () => {
    expect(ALL_PLAYBOOKS.length).toBeGreaterThanOrEqual(39);
    expect(checked.length).toBeGreaterThan(150);
  });

  test('the three the audit found are fixed, by name', () => {
    const find = (type, id) => {
      const pb = ALL_PLAYBOOKS.find((p) => p.type === type);
      return decisionsOf(pb).find((d) => d.id === id) || null;
    };
    for (const [type, id] of [['Dinner Party', 'alcohol'], ['Dinner Party', 'seating'], ['Engagement Party', 'toast']]) {
      const d = find(type, id);
      expect(d).toBeTruthy();
      expect(d.options).toContain(d.default);
    }
  });
});

describe('the funeral repast does not guess its own headcount', () => {
  const repast = ALL_PLAYBOOKS.find((p) => /repast/i.test(String(p.type || '')));
  const headcount = decisionsOf(repast).find((d) => d.id === 'headcount');

  test('(premise) the decision still exists', () => {
    expect(repast).toBeTruthy();
    expect(headcount).toBeTruthy();
  });

  test('it asks rather than proposing a number nobody gave', () => {
    // `can-derive` derives nothing — it reprints the authored literal. On this
    // playbook that meant proposing "(~50)" out loud while the engine's own
    // sizingGuests held the real figure.
    expect(headcount.difmCapable).toBe('needs-host');
    expect(headcount.default == null).toBe(true);
  });

  test('and nothing costed depends on it', () => {
    expect(headcount.noCostEffect).toBe(true);
  });
});
