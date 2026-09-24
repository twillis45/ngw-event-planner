// Host, 2026-09-24, on the elegant masthead: "this also need adjustment not
// easily readable". Measured: 85 characters at 11.5px/700/uppercase with
// 1.035px tracking, wrapping to four lines at 390px with an orphan on the last.
//
// The fix drops a RESTATEMENT, never a fact — so these tests are mostly about
// the cases where the type must SURVIVE.
import { typeIsRestatedByName } from '../eventMasthead';
import { ALL_PLAYBOOKS } from '../playbooks';

describe('the masthead says each thing once', () => {
  test('a name that already carries its type drops the type slot', () => {
    expect(typeIsRestatedByName("Margaret Adeyemi's Retirement Celebration", 'Retirement Party')).toBe(true);
    expect(typeIsRestatedByName('A repast for Deacon Willie Hayes', 'Repast')).toBe(true);
    expect(typeIsRestatedByName('The Cookout', 'The Cookout')).toBe(true);
    expect(typeIsRestatedByName('My Crab Feast', 'Crab Feast')).toBe(true);
  });

  test('A NAME THAT DOES NOT SAY THE TYPE KEEPS IT — this is the half that matters', () => {
    // Dropping the type here would leave a host looking at "Wanda turns 50"
    // with nothing on screen saying it is a birthday.
    expect(typeIsRestatedByName('Wanda turns 50', 'Birthday')).toBe(false);
    expect(typeIsRestatedByName('Sunday at Ma’s', 'Sunday Dinner')).toBe(false);
    expect(typeIsRestatedByName('The Ryan Way', 'Graduation')).toBe(false);
    expect(typeIsRestatedByName('Deacon Hayes', 'Repast')).toBe(false);
  });

  test('a PARTIAL overlap is not a restatement', () => {
    // "Crab" alone does not tell you it is a crab FEAST.
    expect(typeIsRestatedByName('Crab night', 'Crab Feast')).toBe(false);
  });

  test('filler words alone never justify dropping the type', () => {
    // A type made only of filler has nothing to restate, so it keeps its slot
    // rather than vanishing on a technicality.
    expect(typeIsRestatedByName('Something lovely', 'The Party')).toBe(false);
    expect(typeIsRestatedByName('Something lovely', '')).toBe(false);
  });

  test('empty and malformed input never drops a fact', () => {
    expect(typeIsRestatedByName('', 'Repast')).toBe(false);
    expect(typeIsRestatedByName(null, 'Repast')).toBe(false);
    expect(typeIsRestatedByName('A repast', null)).toBe(false);
  });

  test('punctuation and case do not defeat it', () => {
    expect(typeIsRestatedByName('REPAST — Deacon Hayes', 'repast')).toBe(true);
    expect(typeIsRestatedByName("Willie's repast.", 'Repast')).toBe(true);
  });

  test('(premise) the corpus has types worth testing against', () => {
    // Guards the sweep below from passing over an empty list.
    expect(ALL_PLAYBOOKS.length).toBeGreaterThan(40);
  });

  test('no playbook TYPE is swallowed by a name that does not contain it', () => {
    // The blast radius, measured: for every shipped type, a generic host name
    // must keep the type slot. If this ever fails, a real event type has become
    // invisible on the hero.
    for (const pb of ALL_PLAYBOOKS) {
      const t = String(pb.type || '');
      if (!t) continue;
      expect(typeIsRestatedByName('Saturday with everyone', t)).toBe(false);
    }
  });
});
