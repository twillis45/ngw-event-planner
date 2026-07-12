// Smoke coverage for lib/download — the ONLY DOM download trigger (moved
// verbatim out of csvParsers so the parse/serialize module stays pure).
// jsdom has no URL.createObjectURL, so stub the object-URL pair and observe
// the anchor-click choreography.
import { downloadCSV } from '../download';

test('downloadCSV builds a CSV blob, clicks a named anchor, and cleans up', () => {
  const createObjectURL = jest.fn(() => 'blob:fake-url');
  const revokeObjectURL = jest.fn();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;

  let clickedAnchor = null;
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function () { clickedAnchor = this; });

  downloadCSV('party-guests.csv', 'Name,RSVP\nAda,Yes');

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob.type).toBe('text/csv;charset=utf-8;');
  expect(click).toHaveBeenCalledTimes(1);
  expect(clickedAnchor.download).toBe('party-guests.csv');
  expect(clickedAnchor.href).toContain('blob:fake-url');
  expect(document.body.contains(clickedAnchor)).toBe(false); // removed after click
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');

  click.mockRestore();
});
