// ─── THE BOARD SPLIT THE VENUE FACT IN TWO (ruling 2026-08-14) ───────────────
//
// Full ruling: docs/audits/2026-08-14_VENUE_READER_BOARD_RULING.md
//
// Two engines read "is the venue resolved?" and disagreed, because they were
// answering DIFFERENT QUESTIONS:
//
//   the town     unblocks the TRAVEL layer   — weather, shopping, lodging search
//   the address  unblocks the PRODUCTION layer — COI, dock, rentals, power,
//                run-of-show, transport, and every signature and deposit
//
// Options "strict reader wins" and "permissive reader wins" both died: the town
// genuinely does unblock the first layer (nagging for it is a scar this repo
// already took, phaseProgress.js:88-100), and a town genuinely does not unblock
// the second. The operations seat's argument for TWO FACTS over three values of
// one: they REGRESS INDEPENDENTLY. When a venue falls through, the address goes
// null while the town stays committed, and an enum cannot tell "never had one"
// from "just lost one" — which is exactly the state needing the loudest message.
//
// THE FINDING THAT SET THE BUILD ORDER. Before this, naming the venue changed
// NOTHING on screen — the city-only and named-venue captures were byte-identical
// at mobile-390 and tablet-768, because the strict reader was not wired to
// anything a host could see. So the first assertion below is not about labels or
// counts: it is that the two states produce DIFFERENT ASKS at all.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { eventLocationStatus } from '../locationAssist';
import { DIMENSION_LABELS } from '../eventOrientation';

const NOW = new Date(2026, 7, 14, 9, 0, 0);

const base = (extra) => ({
  id: 'va-test', type: 'Birthday', name: "Mom's 70th", isDestination: true,
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 24, guestCount: 24, totalBudget: 9000,
  budget: [], guests: [], vendors: [], timeline: [],
  ...extra,
});

const NOTHING  = () => base({});
const CITYONLY = () => base({ venueCity: 'Santa Fe', venueState: 'NM' });
const NAMED    = () => base({ venueCity: 'Santa Fe', venueState: 'NM', venue: 'The Lodge at Santa Fe' });

const cues = (ev) => deriveEventPhaseProgress(ev, NOW);
const itemById = (ev, id) => (cues(ev).items || []).find((i) => i && i.id === id) || null;
const nextCueId = (ev) => { const c = cues(ev).nextCue; return c && (c.id || c.source); };

describe('the town and the venue address are two facts', () => {
  test('PREMISE — the three states the shared reader distinguishes', () => {
    expect(eventLocationStatus(NOTHING())).toBe('missing');
    expect(eventLocationStatus(CITYONLY())).toBe('city_only');
    expect(eventLocationStatus(NAMED())).toBe('venue_only');
  });

  // ── THE WIRE. This is the assertion the whole ruling rests on.
  test('naming the venue CHANGES THE ASK — city-only and named are not the same screen', () => {
    expect(nextCueId(CITYONLY())).not.toBe(nextCueId(NAMED()));
  });

  test('with nothing set, the TOWN is the ask and the address does not also fire', () => {
    expect(nextCueId(NOTHING())).toBe('location');
    // Two asks for one thing is the duplicate surface the product forbids: the
    // address essential does not apply until there is a town to put it in.
    expect(itemById(NOTHING(), 'venueaddress')).toBeNull();
  });

  test('with a town but no venue, the ADDRESS is the ask', () => {
    expect(nextCueId(CITYONLY())).toBe('venueaddress');
    expect(itemById(CITYONLY(), 'location').handled).toBe(true);
    expect(itemById(CITYONLY(), 'venueaddress').handled).toBe(false);
  });

  test('with the venue named, both are settled and lodging may lead', () => {
    expect(itemById(NAMED(), 'location').handled).toBe(true);
    expect(itemById(NAMED(), 'venueaddress').handled).toBe(true);
    expect(nextCueId(NAMED())).toBe('lodging');
  });

  // ── FIRST IN ORDER, NOT ON FIRE (both event-industry seats). The address
  // outranks lodging because you cannot sensibly book rooms against a town —
  // but it does this by ORDER, not by a permanent red gate that a host learns
  // to ignore by week two.
  test('the unsigned address outranks lodging', () => {
    const ev = CITYONLY();
    const rank = (id) => (itemById(ev, id) || {}).priority;
    expect(rank('venueaddress')).toBeLessThan(rank('lodging'));
  });

  // ── THE COUNT. The Grandmother seat: "handled" means finished, and a part you
  // can still hurt yourself on is not handled. An unsigned address must never
  // be inside the numerator.
  test('an unsigned address is NOT counted as handled', () => {
    const c = cues(CITYONLY());
    const handledIds = (c.items || []).filter((i) => i.handled).map((i) => i.id);
    expect(handledIds).not.toContain('venueaddress');
    expect(handledIds).toContain('location');
    // And naming it moves the count up by exactly one.
    expect(cues(NAMED()).completedCount).toBe(c.completedCount + 1);
  });

  // ── IT REGRESSES INDEPENDENTLY. The operations seat's reason for two facts
  // rather than three values of one: losing the venue must not lose the town.
  test('losing the venue leaves the town committed', () => {
    const lost = { ...NAMED(), venue: '' };
    expect(itemById(lost, 'location').handled).toBe(true);
    expect(itemById(lost, 'venueaddress').handled).toBe(false);
    expect(nextCueId(lost)).toBe('venueaddress');
  });

  // ── NO RAW ID MAY REACH HOST COPY. Found by driving: the summary line read
  // "date & time and venueaddress still need you", because `DIMENSION_LABELS`
  // had no entry and `label` falls through to the id. This asserts the class,
  // not the one instance — any future essential without a label fails here
  // rather than on a host's screen.
  test('every essential has a host label — no raw id reaches the copy', () => {
    for (const ev of [NOTHING(), CITYONLY(), NAMED()]) {
      for (const id of (cues(ev).items || []).map((i) => i.id)) {
        const label = DIMENSION_LABELS[id];
        // Either it carries a real label, or it is not a segment the summary
        // can name. `location` and `venueaddress` are both segments.
        if (['location', 'venueaddress', 'datetime', 'headcount', 'food', 'budget', 'lodging'].includes(id)) {
          expect(typeof label).toBe('string');
          expect(label).not.toBe(id);
          expect(label).toMatch(/^[A-Z]/);
        }
      }
    }
  });

  // ── THE ASK NAMES THE ACT and says WHY, in host language. No emoji, no
  // jargon; "lock in" / "dial in" / "vendor partner" are banned outright.
  test('the address cue names the act and carries a real route', () => {
    const it = itemById(CITYONLY(), 'venueaddress');
    expect(it.cueLabel).toBeTruthy();
    expect(it.cueLabel).not.toMatch(/lock|dial in|vendor partner/i);
    expect(it.route && it.route.focusField).toBe('event-venue');
  });
});
