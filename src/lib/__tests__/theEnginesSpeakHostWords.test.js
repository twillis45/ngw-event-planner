// ─── THE ENGINES SPEAK HOST WORDS (UX_11 rule 4, cohesion batch A, 11/24/2026) ─
//
// Owner-approved cohesion audit, 11/24/2026, P1 #3. On the event day the board
// printed three engine strings the host never says:
//   "Planning this as retirement party + birthday (compound event, requires
//    merging)."                       ← eventIdentityEngine canonicalDescription
//   "Overdue by 28 days. Open decisions block timeline, vendor, and approval
//    progress downstream."           ← CommandCenter's overdue-step consequence
//   `Resolve "Set up a shared photo/notes drop (link or email) and ask
//    coworkers + family for ".`      ← the same step's title, cut at 80 chars
//                                       inside its own quotes
// The e2e sweep (hostv2/e2e/hostWordsOnEveryStage.spec.mjs) reads the screens;
// this reads the engines that write the words, so a string is fixed where it is
// made. Both read the one list, src/lib/hostWords.json.
import HOST_WORDS from '../hostWords.json';
import { eventPlan, _selectEventNextActionInner } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { resolveEventIdentity } from '../eventIdentityEngine';
import { WANDA_GOLD_EVENT } from '../../data/wandaGoldEvent';

const RULES = [...HOST_WORDS.banned, HOST_WORDS.brokenTemplate]
  .map((b) => ({ word: b.word, re: new RegExp(b.re, b.flags == null ? 'i' : b.flags) }));
const offenders = (where, text) => RULES
  .filter((r) => r.re.test(String(text || '')))
  .map((r) => `${where} · ${r.word}: ${String(text).slice(0, 140)}`);

// A made-up host's own plan: a retirement that is also a 60th (two milestones),
// with a step long past its window whose wording runs past 80 characters.
const OWN = {
  id: 'cohesion-a-own', name: 'Jordan Avery’s 60th & Retirement', honoree: 'Jordan Avery',
  type: 'Retirement Party', secondaryType: 'Birthday', milestoneBirthday: 60,
  date: '2027-03-20', startTime: '18:00', startTimeSource: 'host',
  venue: 'Elm Court Hall', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 40, guestEstimate: 40, guestCountSource: 'host',
  guests: [], vendors: [], totalBudget: 1500, budget: [{ id: 'b-food', category: 'Food', budgeted: 1200, actual: 0 }],
  timeline: [
    { id: 'own-t1', when: 'T-28d', task: 'Set up a shared photo and notes drop (a link or an email) and ask coworkers and family for photos, stories and well-wishes', done: false },
  ],
};

const EVENTS = [['Wanda sample', WANDA_GOLD_EVENT], ['own plan', OWN]];
// The day before, the event day, and two days after.
const CLOCKS = ['2027-03-19T17:00:00', '2027-03-20T17:00:00', '2027-03-22T11:00:00'];

afterEach(() => { jest.useRealTimers(); });

describe('the board’s engine copy is in host words', () => {
  for (const [label, ev] of EVENTS) {
    for (const at of CLOCKS) {
      test(`${label} at ${at}`, () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(at));
        const ctx = buildExperienceContext(ev, null, 1);
        const plan = eventPlan(ev, ctx) || {};
        const actions = [...(plan.nextActions || [])];
        // Premise: before it is over, the board has cards (after, it may not).
        if (at < '2027-03-21') expect(actions.length).toBeGreaterThan(0);
        const found = [];
        // The board's lead, which eventPlan folds in from the one-action selector.
        const lead = _selectEventNextActionInner(ev);
        if (lead) actions.push(lead);
        found.push(...offenders('grounding line', ctx && ctx.reasoning));
        for (const a of actions) {
          for (const k of ['title', 'consequence', 'why', 'primaryCta', 'contextLine']) {
            found.push(...offenders(`${a.category || a.kind || '?'}.${k}`, a[k]));
          }
        }
        if (plan.planningState) found.push(...offenders('planningState.reasoning', plan.planningState.reasoning));
        expect(found).toEqual([]);
      });
    }
  }
});

describe('a step’s title keeps its whole quote', () => {
  test('a late step longer than 80 characters is named in full, its quote closed on a word', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2027-03-20T17:00:00'));
    const late = _selectEventNextActionInner(OWN);
    expect(late && late.category).toBe('decision'); // premise: the late step leads
    expect(late.title).toContain('photos, stories and well-wishes');
    expect(late.title).not.toMatch(/\s["”]\./);
  });
});

describe('two milestones are named the way a host says them', () => {
  test('the identity’s description names both and nothing about merging', () => {
    const id = resolveEventIdentity(WANDA_GOLD_EVENT, WANDA_GOLD_EVENT.type, 'self', 'retirement and 50th birthday');
    expect(id.isCompound).toBe(true); // premise: the case the audit saw
    expect(offenders('canonicalDescription', id.canonicalDescription)).toEqual([]);
    expect(id.canonicalDescription).toMatch(/retirement/i);
    expect(id.canonicalDescription).toMatch(/birthday/i);
  });
});
