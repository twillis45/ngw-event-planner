const { checklistRouteFor } = require('../taskRoute');
describe('the act beats the trailing inventory', () => {
  test('a pavilion reservation row routes to the venue, not the parking note', () => {
    const hit = checklistRouteFor('The park / reserve the pavilion and confirm what it includes (tables, grills, power, parking)', {}, null);
    expect(hit).toBeTruthy();
    expect(hit.label).not.toMatch(/parking/i);
    expect(hit.route.tab).toBe('Event Details');
  });
  test('a row that really is about parking still lands on the parking note', () => {
    const hit = checklistRouteFor('Post the parking map and mark the overflow lot', {}, null);
    expect(hit.label).toBe('Open the parking note');
    expect(hit.route.focusField).toBe('parking-notes');
  });
  test('book the shelter behaves the same as reserve the pavilion', () => {
    const hit = checklistRouteFor('Book the shelter; confirm tables, power and parking', {}, null);
    expect(hit.label).not.toMatch(/parking/i);
  });
});
