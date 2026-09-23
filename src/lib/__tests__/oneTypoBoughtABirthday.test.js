// ─── ONE DELETED CHARACTER BOUGHT A BIRTHDAY PLAYBOOK ───────────────────────
//
// Found auditing misspelling behaviour, 2026-09-23. Delete a single character
// from the type word and 35 of 45 playbook types resolve to Birthday:
//
//     Graduaton party   -> Birthday
//     Bridl Shower      -> Birthday
//     Retiement Party   -> Birthday
//     Gendr Reveal      -> Birthday
//
// Not "no type" — a CONFIDENT wrong one, carrying a birthday checklist, birthday
// risks, birthday food and birthday vendors, stated with no hedge anywhere.
//
// The cause is a deliberate last-resort rule in eventTaxonomy: any text holding
// "party" (or celebration / bash / soiree / fiesta / shindig) maps to Birthday.
// For a host who genuinely just says "a party" that is a fair guess. As a silent
// answer to a typo it is the app inventing the single fact everything else
// follows from.
//
// THE RULE STAYS AND THE GUESS IS DECLARED. `typeBasis` is decided the same way
// unusedClauses decides: strip the generic words, re-resolve, and see whether
// anything specific was holding the answer up.
import { parseSmartEventText } from '../smartParseEvent';
import { ALL_PLAYBOOKS } from '../playbooks';

const basis = (s) => parseSmartEventText(s).typeBasis;

describe('(premise) the defect is real and this is its size', () => {
  test('one deleted character still lands on a wrong type, for most of the corpus', () => {
    // The measurement that made this worth building. If a later pass fixes the
    // keyword table properly, this number drops and this test says so.
    let wrong = 0;
    for (const pb of ALL_PLAYBOOKS) {
      if (pb.type.length < 6) continue;
      const typo = pb.type.slice(0, 4) + pb.type.slice(5);
      const got = parseSmartEventText(`${typo} party in Austin Texas on June 14 2027, 30 people`).type;
      if (got && got !== pb.type) wrong++;
    }
    expect(wrong).toBeGreaterThan(25);
  });
});

describe('a guessed type declares itself', () => {
  test('a typo that falls through to the catch-all is marked generic', () => {
    expect(basis('Graduaton party in Austin Texas on June 14 2027, 30 people')).toBe('generic');
    expect(basis('Bridl Shower party in Austin Texas, 30 people')).toBe('generic');
  });

  test('so does a host who really did just say "a party"', () => {
    // Not an error — the catch-all is doing its job. It is still a guess, and
    // the host should be able to see that it was one.
    expect(basis('Just a party for 30 people on June 14 2027')).toBe('generic');
  });

  test('AND A NAMED TYPE IS NEVER MARKED A GUESS', () => {
    // The failure that would be worse than the bug: hedging a type the host
    // stated plainly teaches them to ignore the hedge.
    expect(basis('Graduation party in Austin Texas on June 14 2027, 30 people')).toBe('named');
    expect(basis('Birthday party in Austin Texas on June 14 2027, 30 people')).toBe('named');
    expect(basis("Mom's 80th birthday party on June 14 2027, 45 people")).toBe('named');
    expect(basis('Wedding in Austin Texas on June 14 2027, 120 people')).toBe('named');
  });

  test('TWO PLAYBOOKS ARE UNREACHABLE BY THEIR OWN NAME — found by this test', () => {
    // The strongest control: spell a type correctly and it should never be
    // hedged. Running it surfaced a defect with nothing to do with typos.
    //
    // `Card Party` and `Day Party` are real playbooks in the corpus and the
    // resolver cannot name either — both fall through to the "party" catch-all.
    // So a host who types "Card Party in Austin" gets a BIRTHDAY plan, and the
    // playbook they asked for by name is unreachable from free text entirely.
    //
    // The hedge is CORRECT for them: the type genuinely was a guess. This pins
    // the list rather than asserting it away, so it can only shrink — add the
    // missing keyword rules and this test tells you it worked.
    const hedged = [];
    for (const pb of ALL_PLAYBOOKS) {
      const p = parseSmartEventText(`${pb.type} in Austin Texas on June 14 2027, 30 people`);
      if (p.type && p.typeBasis === 'generic') hedged.push(`${pb.type} -> ${p.type}`);
    }
    expect(hedged.sort()).toEqual(['Card Party -> Birthday', 'Day Party -> Birthday']);
  });

  test('no type at all carries no basis', () => {
    expect(basis('30 people on June 14 2027')).toBe(null);
    expect(basis('')).toBe(null);
  });
});
