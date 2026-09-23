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

  test('EVERY PLAYBOOK IS NOW REACHABLE BY ITS OWN NAME', () => {
    // The strongest control: spell a type correctly and it should never be
    // hedged. Running it surfaced a defect with nothing to do with typos.
    //
    // WHEN THIS TEST WAS WRITTEN IT FAILED, and the list it printed was the
    // finding: `Card Party` and `Day Party` were real playbooks in the corpus
    // that the resolver could not name. Both fell through to the "party"
    // catch-all, so a host typing "Card Party in Austin" got a BIRTHDAY plan and
    // the playbook they asked for by name was unreachable from free text.
    //
    // Both were given keyword rules on 2026-09-23, in the playbooks' OWN
    // vocabulary — Card Party's header defines it around Spades and Bid Whist,
    // Day Party's around the "grown folks" afternoon social. The list is empty
    // now, and this test is what says so if a new playbook ships unreachable.
    const hedged = [];
    for (const pb of ALL_PLAYBOOKS) {
      const p = parseSmartEventText(`${pb.type} in Austin Texas on June 14 2027, 30 people`);
      if (p.type && p.typeBasis === 'generic') hedged.push(`${pb.type} -> ${p.type}`);
    }
    expect(hedged).toEqual([]);
  });

  test('no type at all carries no basis', () => {
    expect(basis('30 people on June 14 2027')).toBe(null);
    expect(basis('')).toBe(null);
  });
});
