// ─── A VENDOR CONFLICT DECLARES ITS OWN ASK (six root causes, cause 1) ───────
//
// The hero's copy ladder (lib/heroAsk) picked wording from words in a title.
// A conflict titled "Bloom & Thistle Florals arrives before venue access"
// matched /venue/ and the hero asked "Add the location." on an event with a
// venue; "Buttercream & Co. setup runs into guest arrival" matched /guest/ and
// asked "Add who’s coming." Measured over the sample events on 11/23/2026.
//
// The producer knows what the conflict asks for: every conflict carries its
// own `recommendedAction`. The raise declares it as the ask, and the hero
// reads the declaration, never the title.
jest.mock('@app/lib/failureTelemetry', () => require('../failureTelemetry'), { virtual: true });
jest.mock('@app/lib/playbooks', () => require('../playbooks'), { virtual: true });
jest.mock('@app/lib/artworkMarks', () => require('../artworkMarks'), { virtual: true });
jest.mock('@app/lib/welcomeGate', () => require('../welcomeGate'), { virtual: true });
jest.mock('@app/lib/welcomeGate', () => require('../welcomeGate'), { virtual: true });
jest.mock('@app/lib/eventDates', () => require('../eventDates'), { virtual: true });
jest.mock('@app/lib/customEventStore', () => require('../customEventStore'), { virtual: true });
jest.mock('@app/lib/eventIds', () => require('../eventIds'), { virtual: true });
jest.mock('@app/lib/inviteTone', () => require('../inviteTone'), { virtual: true });
jest.mock('@app/theme/palette', () => require('../../theme/palette'), { virtual: true });
jest.mock('@app/data/sampleEventsExtra', () => require('../../data/sampleEventsExtra'), { virtual: true });
jest.mock('@app/data/sampleEventsDMV', () => require('../../data/sampleEventsDMV'), { virtual: true });
jest.mock('@app/data/wandaGoldEvent', () => require('../../data/wandaGoldEvent'), { virtual: true });
jest.mock('@app/data/repastSampleEvent', () => require('../../data/repastSampleEvent'), { virtual: true });
const { ALL_SAMPLES } = require('../../../hostv2/src/eventPool.js');
const { raiseAll } = require('../surfaceRegistry');
const { heroAskFor } = require('../heroAsk');
const { normalizeAsk } = require('../askVoice');
const { deriveVendorPromiseConflicts } = require('../vendorAccountability/conflicts');
const { inferPromisesFromVendor } = require('../vendorAccountability/derive');

test('every vendor-conflict raise asks what its conflict recommends', () => {
  const bad = [];
  let n = 0;
  for (const ev of ALL_SAMPLES) {
    const raises = (raiseAll(ev) || []).filter((r) => r.surface === 'vendor-conflicts');
    if (!raises.length) continue;
    const conflicts = deriveVendorPromiseConflicts(ev, (ev.vendors || []).flatMap((v) => inferPromisesFromVendor(v, ev) || [])) || [];
    for (const r of raises) {
      n++;
      const c = conflicts.find((x) => x.title === r.title);
      const want = normalizeAsk(c && c.recommendedAction) || 'Untangle your vendors.';
      if (r.ask !== want) bad.push(`${ev.id}: "${r.title}" declares ${JSON.stringify(r.ask)}, its conflict recommends "${want}"`);
      if (heroAskFor({ ...r, domain: 'vendors' }, ev) !== want) bad.push(`${ev.id}: hero asks "${heroAskFor({ ...r, domain: 'vendors' }, ev)}" for "${r.title}"`);
    }
  }
  expect(n).toBeGreaterThan(20);
  expect(bad).toEqual([]);
});
