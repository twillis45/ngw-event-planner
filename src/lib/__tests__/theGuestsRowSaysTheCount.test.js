// THE GUESTS ROW SAYS THE COUNT (single-source audit, 11/18/2026, High).
// The board's handled row put the yes replies first: planning for 40 with 3
// yeses read "3 guests" while every other tile said 40.
import { _eventFoundationActions } from '../../CommandCenter';

const row = (ev) => _eventFoundationActions(ev).find((a) => a.id === 'guests');

test('a locked 40 with three yeses reads 40, not 3', () => {
  const ev = { id: 'e', type: 'Birthday', guestCount: 40, guestEstimate: 30,
    guests: [{ id: 'a', rsvp: 'Yes' }, { id: 'b', rsvp: 'Yes' }, { id: 'c', rsvp: 'Yes' }] };
  expect(row(ev).handledFact).toBe('40 guests');
});

test('a list alone still reads its length', () => {
  expect(row({ id: 'e', type: 'Birthday', guests: [{ id: 'a' }, { id: 'b' }] }).handledFact).toBe('2 guests');
});
