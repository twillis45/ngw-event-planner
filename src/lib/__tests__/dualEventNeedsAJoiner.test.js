// ─── "RETIREMENT DINNER" IS ONE PARTY, NOT TWO ──────────────────────────────
//
// Found by driving the real first-run path in a browser, cold: typed
// "retirement dinner for 30 on Oct 18" into the one free-text intake field and
// the reveal screen named the event **"My Retirement & Dinner"**.
//
// That string is the FIRST thing a new host reads about their own event, on the
// screen whose whole job is "your event, understood". Getting the name subtly
// wrong there is a trust defect, not a cosmetic one — it says the app misheard.
//
// THE CAUSE, and why the `&` itself is innocent. `HostShellV2.jsx:5623` joins
// occasions with " & " ON PURPOSE, so a genuine dual event ("Retirement & 50th
// Birthday") does not silently drop half of itself. The defect was upstream:
// smartParseEvent decided a SECOND occasion had been named using bare substring
// inclusion —
//
//     key.length > 3 && t.toLowerCase().includes(key)
//
// so the word "dinner" inside "retirement dinner" matched the Dinner Party
// playbook and became a second party.
//
// THE RULE COMES FROM THE CODE'S OWN COMMENT, not from taste: fire only when the
// text "clearly names a SECOND occasion". A conjunction is what makes it clear.
// "retirement AND 50th birthday" is two events; "retirement dinner" is one event
// with a descriptor. Adjacency never was evidence.
import { parseSmartEventText } from '../smartParseEvent';

const secondaryOf = (text) => (parseSmartEventText(text) || {}).secondaryType || null;

describe('a descriptor is not a second event', () => {
  test('PREMISE — these phrases still resolve a primary type at all', () => {
    // If the primary parse breaks, "no secondary" passes for the wrong reason.
    expect((parseSmartEventText('retirement dinner for 30 on Oct 18') || {}).type).toBe('Retirement Party');
    expect((parseSmartEventText('birthday dinner for 12') || {}).type).toBe('Birthday');
    expect((parseSmartEventText('graduation lunch') || {}).type).toBe('Graduation');
  });

  test('THE REPORTED CASE — "retirement dinner" names ONE event', () => {
    expect(secondaryOf('retirement dinner for 30 on Oct 18')).toBeNull();
  });

  test('and the same shape anywhere else', () => {
    // Each of these is a meal word sitting next to an occasion. All one event.
    expect(secondaryOf('birthday dinner for 12')).toBeNull();
    expect(secondaryOf('graduation lunch')).toBeNull();
    expect(secondaryOf('engagement brunch in June')).toBeNull();
  });
});

describe('a genuine dual event still names both', () => {
  test('joined by "and"', () => {
    expect(secondaryOf('retirement and 50th birthday')).toBe('Birthday');
  });

  test('joined by "&"', () => {
    expect(secondaryOf('graduation & birthday party')).toBe('Birthday');
  });

  test('joined by "plus"', () => {
    expect(secondaryOf('engagement party plus birthday')).toBe('Birthday');
  });

  test('the dual case is why the " & " join exists at all', () => {
    // HostShellV2:5623 joins occasions deliberately so a dual event does not
    // drop half. This asserts the feature the fix had to preserve — without it,
    // "require a joiner" could have been implemented as "never set a secondary",
    // which would pass every test above and silently delete a real feature.
    const r = parseSmartEventText('retirement and 50th birthday') || {};
    expect(r.type).toBe('Retirement Party');
    expect(r.secondaryType).toBe('Birthday');
  });
  // ── A COMMA IS NOT A CONJUNCTION (2026-10-06) ────────────────────────────
  // The 2026-08-17 fix closed "retirement dinner" -> "My Retirement & Dinner"
  // by requiring a joiner, and its comment states the rule in English: "A
  // conjunction is what makes it clear". The LIST it shipped was
  // `and | & | + | , | plus | slash | /` — and a comma is not a conjunction,
  // nor is a slash. The two members that are not conjunctions are exactly the
  // two this file never exercised, so the class reopened through the one
  // character nobody tested.
  //
  // It cost the Santa Fe 80th its name. "...for 3 nights, dinner at an adobe
  // courtyard" matched `, dinner`, and "Mom's 80th Birthday & Dinner" was
  // stamped on the header of every screen after the reveal — the first thing a
  // host reads about their own event, and wrong, which is verbatim the harm
  // the original fix was written to stop.
  //
  // The intake invites exactly this: "Say it like you'd text a friend" asks
  // for run-on prose, where a comma is a clause separator and nothing more.
  describe('a comma is a clause separator, not a second occasion', () => {
    test('THE DEFECT: the Santa Fe 80th keeps its own name', () => {
      expect(secondaryOf("Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
        + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard, '
        + 'she uses a walker and the altitude is hard on her')).toBeNull();
    });

    test('…and the gate\'s OWN reported case, plus one comma', () => {
      // The 2026-08-17 entry is "retirement dinner for 30". Adding a comma put
      // it straight back.
      expect(secondaryOf('retirement dinner, for 30 on Oct 18')).toBeNull();
    });

    test('a comma between two real occasions is still not a joiner', () => {
      // Deliberate: a list separator cannot carry this claim either way. If a
      // host means two events they can say "and", which this file already
      // guards. Under-reporting is the safe direction — a dropped signal, not
      // an invented one, and it is the host's own event NAME at stake.
      expect(secondaryOf('birthday, graduation')).toBeNull();
    });

    test('a slash is not a joiner either, in either position', () => {
      expect(secondaryOf('graduation slash birthday party')).toBeNull();
      expect(secondaryOf('birthday / graduation')).toBeNull();
    });

    test('NEGATIVE CONTROL: a real conjunction still names both', () => {
      // The guard against over-correcting into "never set a secondary".
      // The parser resolves Graduation as PRIMARY here and Retirement Party as
      // the secondary — measured, not assumed. My first draft of this asserted
      // the pair the other way round and went red against correct code, which
      // is a red test for the wrong reason and looks exactly like a real one.
      expect(secondaryOf('retirement and graduation party')).toBe('Retirement Party');
      expect(secondaryOf('retirement & graduation party')).toBe('Retirement Party');
      expect(secondaryOf('retirement plus graduation party')).toBe('Retirement Party');
    });

    test('(premise) the `and` branch is REACHED, not shadowed by milestoneType', () => {
      // Bench E, re-score: every existing case in this file says "50th
      // birthday", and `milestoneType` fires on /\bbirthday\b/ BEFORE the
      // joiner is consulted — so the headline test and its own anti-vacuity
      // guard both passed through a different code path and the `\band\b`
      // branch was never exercised. These two strings carry no birthday and
      // no ordinal, so only the joiner can produce the answer.
      expect(secondaryOf('retirement graduation party')).toBeNull();
      expect(secondaryOf('retirement and graduation party')).toBe('Retirement Party');
    });
  });
});
