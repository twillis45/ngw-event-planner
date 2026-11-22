// ─── ONE RULE, TWO LANGUAGES: THE OUTWARD LINES (audit 2, lane E P0-4) ───────
//
// The emails a guest or helper gets are composed on the server
// (backend/app/outward.py); the pages they open are composed here. Both
// answer the same four questions — where (formatVenueAddress), which days
// (fmtLongSpan), who hosts (hostNameFor), what diets (dietCountsFor) — and
// this fixture is the contract: this file pins the app's answer, and
// backend/tests/test_outward_lines.py pins the server's to the same rows.
// A changed rule fails here first; regenerate the expectations on purpose.
import { formatVenueAddress, venueFor } from '../venueFor';
import { fmtLongSpan } from '../doItForMe';
import { hostNameFor } from '../hostNameFor';
import { dietCountsFor } from '../dietRows';

const CASES = require('./fixtures/outwardLines.fixture.json');

describe.each(CASES.map((c) => [c.id, c]))('%s', (_id, c) => {
  test('the app gives the fixture\'s lines', () => {
    expect({
      line: formatVenueAddress(c.event),
      town: formatVenueAddress(c.event, { style: 'town' }),
      isHome: venueFor(c.event).isHome,
      days: fmtLongSpan(c.event),
      host: hostNameFor(c.event),
      diets: dietCountsFor(c.event),
    }).toEqual(c.expect);
  });
});
