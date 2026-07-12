// Behavioral coverage for THE single guest-reply merge both shells consume
// (lib/guestMerge.js — extracted from App.js's RSVP read-back and
// HostShellV2's inline helper). Locks the name-match ladder, the field-merge
// rules, change-only merge counting, and purity.
import { mergeGuestReplies } from '../guestMerge';

const roster = () => ([
  { id: 'g1', name: 'Ada Byron', group: 'Family', rsvp: '', meal: '—', needs: '', plusOne: '', plusOneMeal: '—', plusOneNeeds: '', kids: 0, address: '', partyNotes: '' },
  { id: 'g2', name: 'Samuel Hill', group: 'Friends', rsvp: 'Pending', meal: 'Chicken', needs: '', plusOne: '', plusOneMeal: '—', plusOneNeeds: '', kids: 1, address: '12 Oak St', partyNotes: '' },
  { id: 'g3', name: 'Maximilian Ray', group: 'Work', rsvp: '', meal: '—', needs: '', plusOne: '', plusOneMeal: '—', plusOneNeeds: '', kids: 0, address: '', partyNotes: '' },
]);

test('exact full-name match updates the existing row', () => {
  const { guests, merged, added } = mergeGuestReplies(roster(), [
    { name: 'ada byron', rsvp: 'Yes', meal: 'Veggie', idempotencyKey: 'k1' },
  ]);
  expect(merged).toBe(1);
  expect(added).toBe(0);
  expect(guests).toHaveLength(3);
  const ada = guests.find(g => g.id === 'g1');
  expect(ada.rsvp).toBe('Yes');
  expect(ada.meal).toBe('Veggie');
});

test('last(≥3)+first match finds the row despite extra middle tokens', () => {
  const { guests, merged, added } = mergeGuestReplies(roster(), [
    { name: 'Samuel J. Hill', rsvp: 'No' },
  ]);
  expect(merged).toBe(1);
  expect(added).toBe(0);
  expect(guests.find(g => g.id === 'g2').rsvp).toBe('No');
});

test('first-only match applies when the first name is ≥4 chars', () => {
  const { guests, merged, added } = mergeGuestReplies(roster(), [
    { name: 'Maximilian', rsvp: 'Yes', meal: 'Fish' },
  ]);
  expect(merged).toBe(1);
  expect(added).toBe(0);
  expect(guests.find(g => g.id === 'g3').meal).toBe('Fish');
});

test('short first name alone (<4 chars) does NOT first-only match — adds instead', () => {
  const base = [{ id: 'g9', name: 'Sam Hill', rsvp: '', meal: '—', needs: '', plusOne: '', plusOneMeal: '—', plusOneNeeds: '', kids: 0, address: '', partyNotes: '' }];
  const { guests, merged, added } = mergeGuestReplies(base, [{ name: 'Sam', rsvp: 'Yes' }]);
  expect(merged).toBe(0);
  expect(added).toBe(1);
  expect(guests).toHaveLength(2);
});

test('no match adds a new guest with the roster default shape and sub values', () => {
  const { guests, merged, added, yesCount } = mergeGuestReplies(roster(), [
    { name: 'Zora Neale', rsvp: 'Yes', meal: 'Veggie', kids: 2, note: 'bringing a cake', mailingAddress: '9 Elm Ave', idempotencyKey: 'idem-42' },
  ]);
  expect(merged).toBe(0);
  expect(added).toBe(1);
  expect(yesCount).toBe(1);
  const zora = guests[3];
  expect(zora).toEqual({
    id: 'g-rsvp-idem-42', name: 'Zora Neale', group: 'Friends', rsvp: 'Yes',
    meal: 'Veggie', needs: '',
    // Structured dietary/access arrays default to empty when the reply carried
    // none (redesigned invite; free-text-only replies like this one stay []).
    allergens: [], diets: [], access: [],
    plusOne: '', plusOneMeal: '—', plusOneNeeds: '',
    kids: 2, address: '9 Elm Ave', partyNotes: 'bringing a cake',
  });
});

test('opts.makeId wins over the default id factory', () => {
  const { guests } = mergeGuestReplies([], [{ name: 'Zora Neale', rsvp: 'Yes', idempotencyKey: 'idem-42' }],
    { makeId: (sub) => 'custom-' + sub.idempotencyKey });
  expect(guests[0].id).toBe('custom-idem-42');
});

test("meal is NOT overwritten when the reply is 'No'", () => {
  const { guests } = mergeGuestReplies(roster(), [
    { name: 'Samuel Hill', rsvp: 'No', meal: 'Steak' },
  ]);
  const sam = guests.find(g => g.id === 'g2');
  expect(sam.rsvp).toBe('No');
  expect(sam.meal).toBe('Chicken'); // previously chosen meal survives the decline
});

test('other fields only overwrite when the submission carries a truthy value', () => {
  const { guests } = mergeGuestReplies(roster(), [
    { name: 'Samuel Hill', rsvp: 'Yes', meal: '', needs: '', kids: 0, mailingAddress: '' },
  ]);
  const sam = guests.find(g => g.id === 'g2');
  expect(sam.meal).toBe('Chicken');      // empty meal falls back even on Yes
  expect(sam.kids).toBe(1);              // 0 is falsy → keeps existing
  expect(sam.address).toBe('12 Oak St'); // blank address never clears
});

test('an unchanged re-arriving submission counts merged 0 (server rows re-arrive every visit)', () => {
  const first = mergeGuestReplies(roster(), [{ name: 'Ada Byron', rsvp: 'Yes', meal: 'Veggie' }]);
  expect(first.merged).toBe(1);
  const second = mergeGuestReplies(first.guests, [{ name: 'Ada Byron', rsvp: 'Yes', meal: 'Veggie' }]);
  expect(second.merged).toBe(0);
  expect(second.added).toBe(0);
  expect(second.guests).toEqual(first.guests);
});

test('yesCount counts every Yes submission processed — updates, adds, and unchanged re-merges', () => {
  const { merged, added, yesCount } = mergeGuestReplies(roster(), [
    { name: 'Ada Byron', rsvp: 'Yes' },       // update, Yes
    { name: 'Samuel Hill', rsvp: 'No' },      // update, not Yes
    { name: 'Zora Neale', rsvp: 'Yes' },      // add, Yes
    { name: 'Ada Byron', rsvp: 'Yes' },       // re-arrival, unchanged, still Yes
  ]);
  expect(yesCount).toBe(3);
  expect(merged).toBe(2); // Ada once (second is unchanged) + Samuel
  expect(added).toBe(1);
});

test('blank-name submissions are skipped entirely', () => {
  const { guests, merged, added, yesCount } = mergeGuestReplies(roster(), [
    { name: '', rsvp: 'Yes' }, { name: '   ', rsvp: 'Yes' }, null,
  ]);
  expect(guests).toHaveLength(3);
  expect(merged + added + yesCount).toBe(0);
});

test('never mutates inputs — arrays, guest objects, or submissions', () => {
  const base = roster();
  const baseSnapshot = JSON.parse(JSON.stringify(base));
  const baseRefs = [...base];
  const subs = [
    { name: 'Ada Byron', rsvp: 'Yes', meal: 'Veggie' },
    { name: 'Zora Neale', rsvp: 'Yes' },
  ];
  const subsSnapshot = JSON.parse(JSON.stringify(subs));

  const { guests } = mergeGuestReplies(base, subs);

  expect(base).toEqual(baseSnapshot);              // deep-unchanged
  expect(base).toHaveLength(3);                    // nothing pushed onto input
  base.forEach((g, i) => expect(g).toBe(baseRefs[i])); // same object refs inside
  expect(subs).toEqual(subsSnapshot);
  expect(guests).not.toBe(base);                   // result is a new array
  // Untouched rows keep their original refs; the updated row is a NEW object.
  expect(guests.find(g => g.id === 'g2')).toBe(base[1]);
  expect(guests.find(g => g.id === 'g1')).not.toBe(base[0]);
});
