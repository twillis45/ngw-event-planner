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
});
