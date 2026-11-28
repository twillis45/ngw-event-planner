// UPDATES AND QUESTIONS, THE REST (G2c-2b step 5b; owner, 11/28/2026, UX_12
// §8a, render screen 5): "Photos from guests · 3 waiting". The count is the
// photos a guest sent that wait for the host's approval, the same ones the old
// sheet's "N guest photos waiting for you to approve" counts. Made-up data.
import { photosWaitingCount, photosWaitingLine } from '../guestInbox';

const P = [{ id: 'a', status: 'pending' }, { id: 'b', status: 'approved' }, { id: 'c', status: 'pending' }, { id: 'd', status: 'hidden' }];

test('counts only the photos waiting for her approval', () => {
  expect(photosWaitingCount(P)).toBe(2);
  expect(photosWaitingCount([])).toBe(0);
  expect(photosWaitingCount(undefined)).toBe(0);
});

test('the same photos the old sheet’s line counts', () => {
  expect(photosWaitingLine(P)).toBe('2 guest photos waiting for you to approve');
});
