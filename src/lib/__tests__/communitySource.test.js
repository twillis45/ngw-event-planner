// The store picker offered a grieving family a shop called "Brought by the
// community". These pin the predicate that stops it — and, more importantly,
// pin it against the REAL authored corpus rather than against invented strings,
// so a playbook adding a new community phrasing fails here instead of shipping.
import { isCommunitySource, firstStoreIn } from '../communitySource';
import { ALL_PLAYBOOKS } from '../playbooks';

describe('a person is not a shop', () => {
  test('the authored community phrasings are recognised', () => {
    expect(isCommunitySource('Brought by the community')).toBe(true);
    expect(isCommunitySource('The repast committee')).toBe(true);
    expect(isCommunitySource('Friends and neighbors sign up')).toBe(true);
    expect(isCommunitySource('Church kitchen sign-up')).toBe(true);
    expect(isCommunitySource('Potluck')).toBe(true);
  });

  test('REAL SHOPS ARE NOT SWALLOWED — a false positive hides a store the host needs', () => {
    for (const s of ['Grocery', 'Costco', 'Caterer', 'Wine shop', 'Liquor store',
      'Bakery', 'Butcher', 'Trader Joe\'s', 'Restaurant', 'Party store',
      'Drugstore photo', 'Latin market', 'Seafood market', 'Office supply']) {
      expect(isCommunitySource(s)).toBe(false);
    }
  });

  test('empty and malformed input is not a community source', () => {
    expect(isCommunitySource('')).toBe(false);
    expect(isCommunitySource(null)).toBe(false);
    expect(isCommunitySource(undefined)).toBe(false);
  });

  test('firstStoreIn skips the people and returns the shop behind them', () => {
    expect(firstStoreIn(['Brought by the community', 'Grocery', 'Caterer'])).toBe('Grocery');
    expect(firstStoreIn(['Grocery', 'Costco'])).toBe('Grocery');
  });

  test('a line with NOTHING but people returns null, never a fabricated shop', () => {
    expect(firstStoreIn(['Brought by the community'])).toBeNull();
    expect(firstStoreIn([])).toBeNull();
    expect(firstStoreIn(null)).toBeNull();
  });

  test('THE LIVE CASE: repast authors four lines whose first `where` is people', () => {
    // Not a fixture — the shipped playbook. If repast is re-authored so that
    // `where[0]` is a real shop, this test should be deleted, not loosened.
    const repast = ALL_PLAYBOOKS.find((p) => p && /repast/i.test(String(p.id || p.type || '')));
    expect(repast).toBeTruthy();
    const peopleFirst = (repast.purchases || []).filter(
      (p) => p && Array.isArray(p.where) && isCommunitySource(p.where[0]));
    expect(peopleFirst.length).toBeGreaterThanOrEqual(4);
    // And every one of them still names a real shop behind the people, so the
    // sheet has somewhere honest to group it if the host ends up buying it.
    for (const p of peopleFirst) expect(firstStoreIn(p.where)).toBeTruthy();
  });

  test('(premise) the registry actually loaded — an empty list passes every sweep below', () => {
    expect(Array.isArray(ALL_PLAYBOOKS)).toBe(true);
    expect(ALL_PLAYBOOKS.length).toBeGreaterThan(40);
  });

  test('no OTHER playbook is accidentally caught by this predicate', () => {
    // The blast radius, measured rather than assumed: if a cookout line starts
    // resolving to a different store because of this rule, that is a defect and
    // this test names which playbook and which line.
    // Playbooks carry no `id`; `type` is the identifier. Using the wrong field
    // here made every entry read "undefined:p_x" and the sweep fail for a
    // reason that had nothing to do with the rule — kept in mind, not repeated.
    const caught = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const p of (pb.purchases || [])) {
        if (!p || !Array.isArray(p.where)) continue;
        if (isCommunitySource(p.where[0])) caught.push(`${pb.type}:${p.id}`);
      }
    }
    // Measured 2026-09-24: exactly the four repast dishes, nothing else.
    expect(caught).toHaveLength(4);
    expect(caught.every((s) => /repast/i.test(s))).toBe(true);
  });
});
