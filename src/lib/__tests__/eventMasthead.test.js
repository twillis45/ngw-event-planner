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

// ─── THE TYPE LINE ONLY WHEN IT ADDS (owner ruling 2, 11/23/2026) ─────────────
// On the phone and the tall iPad the event type sits under the title only when
// it is not redundant with the title. One rule, typeLineFor, read by both
// layouts (and by the eyebrow that came before them). A word that names the
// act of hosting ("Hosting", "Gathering") rather than the kind of event says
// nothing the title has not: "Thanksgiving Dinner" over "Thanksgiving Hosting"
// is the same fact twice. "Grandma's 80th" over "Birthday Party" is not.
import { typeLineFor } from '../eventMasthead';

describe('the type line only when it adds', () => {
  test('the owner’s two examples', () => {
    expect(typeLineFor('Thanksgiving Dinner', 'Thanksgiving Hosting')).toBe('');
    expect(typeLineFor('Grandma’s 80th', 'Birthday Party')).toBe('Birthday Party');
  });

  test('sample names', () => {
    expect(typeLineFor('Kwanzaa Night', 'Kwanzaa Gathering')).toBe('');
    expect(typeLineFor('Pupusas at Tía’s', 'Pupusa Gathering')).toBe('Pupusa Gathering');   // "pupusas" is not "pupusa"
    expect(typeLineFor('Wanda turns 50', 'Birthday')).toBe('Birthday');
    expect(typeLineFor('A repast for Deacon Willie Hayes', 'Repast')).toBe('');
    expect(typeLineFor('Friendsgiving', 'Friendsgiving')).toBe('');
    expect(typeLineFor('Game Night', 'Game Night')).toBe('');
    expect(typeLineFor('Sunday at Ma’s', 'Sunday Dinner')).toBe('Sunday Dinner');
    expect(typeLineFor('Crab night', 'Crab Feast')).toBe('Crab Feast');
    expect(typeLineFor('The Ryan Way', 'Graduation')).toBe('Graduation');
    expect(typeLineFor('', 'Birthday')).toBe('Birthday');
    expect(typeLineFor('Saturday', '')).toBe('');
  });

  test('all 47 playbook types: a name that does not say the type keeps the line', () => {
    expect(ALL_PLAYBOOKS.length).toBe(47);
    for (const pb of ALL_PLAYBOOKS) {
      expect(typeLineFor('Saturday with everyone', pb.type)).toBe(pb.type);
      expect(typeLineFor('Grandma’s 80th', pb.type)).toBe(pb.type);
    }
  });

  test('all 47 playbook types: a name that already says the type drops the line', () => {
    const HOSTING_WORDS = /\b(hosting|gathering|party|celebration|event)\b/gi;
    for (const pb of ALL_PLAYBOOKS) {
      // The type as its own name.
      expect(typeLineFor(pb.type, pb.type)).toBe('');
      // The type's kind with a different noun after it ("Thanksgiving Dinner",
      // "Kwanzaa Night", "Bridal Shower Brunch").
      const kind = pb.type.replace(HOSTING_WORDS, ' ').replace(/\s+/g, ' ').trim();
      if (!kind || /^(the|a|an)$/i.test(kind)) continue;
      expect(typeLineFor(`${kind} Brunch`, pb.type)).toBe('');
    }
  });
});
