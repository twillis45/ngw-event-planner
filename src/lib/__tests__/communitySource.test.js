// The store picker offered a grieving family a shop called "Brought by the
// community". These pin the predicate that stops it — and, more importantly,
// pin it against the REAL authored corpus rather than against invented strings,
// so a playbook adding a new community phrasing fails here instead of shipping.
import { isCommunitySource, firstStoreIn, storesIn } from '../communitySource';
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
    // Measured 2026-09-24: exactly the repast dishes, nothing else. The count
    // was 4 until the same day, when those four bundled lines were split one
    // dish per line so the Bringing panel could name a different person against
    // the greens, the mac and the potato salad. Eleven is the same four dishes'
    // worth of food; no playbook and no `where` value changed.
    expect(caught).toHaveLength(11);
    expect(caught.every((s) => /repast/i.test(s))).toBe(true);
  });
});

// ─── THE META LINE WAS THE SECOND PLACE A PERSON WAS LISTED AS A SHOP ────────
//
// `firstStoreIn` fixed the store PICKER. The row meta underneath it still
// printed `it.where` raw, so the same repast line rendered
//
//   23 lbs · $3–$7/lb · Brought by the community,Grocery,Caterer,Restaurant
//
// Found by reading a failing e2e's output rather than by looking for it — the
// identical defect one element over, which is this repo's recurring shape: a
// fact owned by an accessor and re-derived by the consumer beside it.
describe('storesIn keeps the shops and drops the people', () => {
  test('the authored repast shape loses only the community entry', () => {
    expect(storesIn(['Brought by the community', 'Grocery', 'Caterer', 'Restaurant']))
      .toEqual(['Grocery', 'Caterer', 'Restaurant']);
  });

  test('ORDER IS PRESERVED — it is a list a host reads, not a set', () => {
    expect(storesIn(['Grocery', 'Brought by the community', 'Bakery']))
      .toEqual(['Grocery', 'Bakery']);
  });

  test('a list of only people returns [], so the caller drops the segment', () => {
    // The honest meta for a line nobody is buying: no shops named at all. The
    // tag beside it already says who is carrying it.
    expect(storesIn(['Brought by the community'])).toEqual([]);
    expect(storesIn(['The repast committee', 'Church'])).toEqual([]);
  });

  test('an ordinary list is returned untouched — the common case must not move', () => {
    expect(storesIn(['Grocery', 'Costco'])).toEqual(['Grocery', 'Costco']);
  });

  test('a bare string is accepted, because `where` is not always an array', () => {
    expect(storesIn('Grocery')).toEqual(['Grocery']);
    expect(storesIn('Brought by the community')).toEqual([]);
  });

  test('junk in, empty out — never a crash and never a fabricated shop', () => {
    expect(storesIn(null)).toEqual([]);
    expect(storesIn(undefined)).toEqual([]);
    expect(storesIn([])).toEqual([]);
    expect(storesIn([null, '', '   ', 'Grocery'])).toEqual(['Grocery']);
  });

  test('it agrees with firstStoreIn, which is the accessor it generalizes', () => {
    // If these two ever disagree the module has two opinions about what a shop
    // is, which is the thing it was written to prevent.
    const cases = [
      ['Brought by the community', 'Grocery', 'Caterer'],
      ['Grocery', 'Costco'],
      ['The repast committee'],
      [],
    ];
    for (const w of cases) {
      expect(storesIn(w)[0] || null).toBe(firstStoreIn(w));
    }
  });
});
