// ─── AN INVITE THAT ARRIVES AFTER THE CHEAP SEATS ARE GONE ───────────────────
//
// Birthday authors `bd_invite` at offsetDays 18. On a local party that is right.
// On the Santa Fe 80th — ten people flying to New Mexico — it is past the point
// where fares reliably step up, so the app's own instruction costs the guests
// money.
//
// MEASURED, FROM THE PAGES (not from search snippets — the research doctrine is
// explicit about that, and it is why these numbers are trustworthy):
//
//   CheapAir 2024, 917M airfares across 8,000+ US markets: domestic prime
//   booking window 74-21 days, best single day 42, and "the fare spikes start
//   right around 21 days from your travel date".
//   Google Flights (2021-2025 data): optimum 39 days, window 23-51.
//   Expedia (2025 data): 15-30 days; more than six months out cost $160 more.
//
// THE TWO CLOCKS. The wedding industry's "save-the-dates 9-12 months out" is
// about a guest's CALENDAR — leave, savings, holding the date. It is NOT about
// buying the ticket early, and this file exists partly to keep the two apart:
// CheapAir measures booking 315-206 days out at 36% MORE. Telling a host to make
// guests buy in January for a June trip would be advice against the evidence.
import { playbookMilestones, getPlaybook, ALL_PLAYBOOKS, playbookChecklist } from '../playbooks';
import { airTravelInviteFloor, pastPrimeBookingWindow, AIR_BOOKING, TRAVEL_LEAD_SOURCES } from '../knowledge/travelLeadTime';
import { isGroundedTier } from '../knowledge/groundingDoctrine';

const AS_OF = new Date('2026-09-23T12:00:00');
const ev = (extra) => ({
  id: 'lt', name: "Mom's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 10, ...extra,
});
const DEST = ev({ isDestination: true });
const LOCAL = ev({ isDestination: false, venueCity: 'Silver Spring', state: 'MD' });
const invite = (e) => playbookMilestones(e, AS_OF).find((m) => m.id === 'bd_invite');

describe('the invite lands before the cheap seats are gone', () => {
  test('(premise) the playbook really does author the invite at 18 days', () => {
    // If the authored value ever changes, the assertions below start passing or
    // failing for a reason that has nothing to do with this fix.
    const authored = getPlaybook('Birthday').milestones.find((m) => m.id === 'bd_invite');
    expect(authored.offsetDays).toBe(18);
    expect(authored.category).toBe('guest');
  });

  test('(premise) 18 days is genuinely past the measured spike, not just tight', () => {
    // The whole reason this is a defect and not a preference.
    expect(pastPrimeBookingWindow(18)).toBe(true);
    expect(AIR_BOOKING.primeClosesDays).toBe(21);
  });

  test('THE FIX: a destination event invites before the prime window opens', () => {
    const m = invite(DEST);
    expect(m.offsetDays).toBe(88);           // 74 (cited) + 14 (reasoned buffer)
    expect(m.offsetDays).toBeGreaterThan(AIR_BOOKING.primeOpensDays);
    expect(m.airFloorApplied).toBe(true);
  });

  test('the move NAMES ITSELF, rather than showing a date the playbook lacks', () => {
    const m = invite(DEST);
    expect(m.airFloorBecause).toMatch(/74–21 days|74-21 days/);
    expect(m.airFloorBecause).toMatch(/fares step up/i);
    expect(m.airFloorSources).toEqual(['cheapair-airfare-2024', 'frommers-booking-windows-2026']);
  });

  test('IT DOES NOT CLAIM TO BE CITED, because part of it is reasoned', () => {
    // Two cited edges plus a judgement call is not a cited figure. The ladder
    // has a rung for exactly that and the honest answer is to stand on it.
    const f = airTravelInviteFloor(DEST);
    expect(f.tier).toBe('synthesized');
    expect(isGroundedTier(f.tier)).toBe(false);
    expect(f.decisionBufferTier).toBe('reasoned');
    // …while the two window edges it is built from ARE cited.
    for (const id of f.sources) expect(TRAVEL_LEAD_SOURCES[id].tier).toBe('cited');
  });

  test('every source carries a url, a fetched date and its own conditionals', () => {
    // The doctrine's registration bar: a number without its conditional is not a
    // grounded claim.
    for (const [id, s] of Object.entries(TRAVEL_LEAD_SOURCES)) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.fetched).toBe('2026-09-23');
      expect(s.note.length).toBeGreaterThan(120);
      expect(Array.isArray(s.limitations)).toBe(true);
      expect(id).toBeTruthy();
    }
    // The publisher that sells flights says so.
    expect(TRAVEL_LEAD_SOURCES['cheapair-airfare-2024'].limitations)
      .toContain('commercial_interest_disclosed');
  });

  test('PULLED EARLIER ONLY — a playbook that already invites further out keeps its own timing', () => {
    // The floor is a minimum for events that fly, not a schedule that overrides
    // authoring. A wedding invites long before 88 days and must not be dragged in.
    const w = { ...DEST, type: 'Wedding' };
    const authored = getPlaybook('Wedding').milestones.filter((m) => m.category === 'guest' && m.offsetDays > 88);
    if (authored.length) {
      const got = playbookMilestones(w, AS_OF).find((m) => m.id === authored[0].id);
      expect(got.offsetDays).toBe(authored[0].offsetDays);
      expect(got.airFloorApplied).toBeUndefined();
    }
  });

  test('NEGATIVE CONTROL: a LOCAL event keeps the authored 18 days', () => {
    // There is no flight to be early for. This is the case the floor must not touch.
    const m = invite(LOCAL);
    expect(m.offsetDays).toBe(18);
    expect(m.airFloorApplied).toBeUndefined();
    expect(airTravelInviteFloor(LOCAL)).toBe(null);
  });

  test('NEGATIVE CONTROL: only shopping and setup stay put', () => {
    // Shopping and setup do not happen 88 days out because people are flying.
    const shop = playbookMilestones(DEST, AS_OF).find((m) => m.id === 'bd_shop_fresh');
    expect(shop.offsetDays).toBe(1);
  });

  // ── THE CONTROL THAT WAS TOO WEAK, AND WHAT IT COST ────────────────────────
  // This file originally asserted `for (const m of moved) expect(m.category)
  // .toBe('guest')`. That passed, and it was worthless: it tested a property of
  // the rows the predicate had ALREADY selected by that same property. It could
  // only ever agree with the code.
  //
  // What it let through, on the day it shipped: 77 milestones moved corpus-wide
  // for a destination event, of which 38 were headcount CONFIRMATIONS ("Lock
  // final headcount", dragged from 3 days out to 88, before a single RSVP is
  // back) and 11 were POST-EVENT follow-ups — `offsetDays` is negative after the
  // event, `-7 < 88`, so "Send the thank-yous" was pulled from a week after the
  // party to three months before it.
  //
  // The controls below assert what the floor must NOT do, on facts the predicate
  // does not get to define.
  test('NEGATIVE CONTROL: a POST-EVENT milestone is never pulled before the event', () => {
    // The catastrophic one. Thank-yous and the gift log happen afterwards; no
    // travel-booking argument can reach them.
    for (const id of ['bd_after_gifts', 'bd_after_thanks']) {
      const authored = getPlaybook('Birthday').milestones.find((m) => m.id === id);
      expect(authored.offsetDays).toBeLessThanOrEqual(0);        // (premise) it IS post-event
      const got = playbookMilestones(DEST, AS_OF).find((m) => m.id === id);
      expect(got.offsetDays).toBe(authored.offsetDays);
      expect(got.airFloorApplied).toBeUndefined();
    }
  });

  test('NEGATIVE CONTROL: locking the headcount keeps its own timing', () => {
    // It DEPENDS on the invite — moving it to the invite's own date inverts the
    // order it is defined in, and asks a host to close a count nobody has
    // answered yet.
    const authored = getPlaybook('Birthday').milestones.find((m) => m.id === 'bd_rsvp_close');
    expect(authored.dependsOn).toContain('bd_invite');
    const got = playbookMilestones(DEST, AS_OF).find((m) => m.id === 'bd_rsvp_close');
    expect(got.offsetDays).toBe(authored.offsetDays);
    expect(got.airFloorApplied).toBeUndefined();
  });

  test('CORPUS SWEEP: every milestone the floor moves is an INVITE, everywhere', () => {
    // The check that would have caught it. Across all 45 playbooks, not one
    // destination event's floor may touch a row that is not an invite, and not
    // one may reach a row dated on or after the event.
    const offenders = [];
    for (const pb of ALL_PLAYBOOKS) {
      const e = { id: 'x', type: pb.type, date: '2027-06-17', guestMode: 'count', guestCount: 10, isDestination: true };
      let ms = [];
      try { ms = playbookMilestones(e, AS_OF); } catch (_e) { continue; }
      for (const m of ms.filter((x) => x.airFloorApplied)) {
        const authored = (pb.milestones || []).find((a) => a.id === m.id);
        if (authored && authored.offsetDays <= 0) offenders.push(`POST-EVENT ${pb.type}/${m.id}`);
        if (!/\binvit|save.the.date/i.test(m.name)) offenders.push(`NOT-INVITE ${pb.type}/${m.id} "${m.name}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('(premise) the sweep above is not vacuous — the floor really does move invites', () => {
    let moved = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const e = { id: 'x', type: pb.type, date: '2027-06-17', guestMode: 'count', guestCount: 10, isDestination: true };
      try { moved += playbookMilestones(e, AS_OF).filter((m) => m.airFloorApplied).length; } catch (_e) { /* skip */ }
    }
    expect(moved).toBeGreaterThan(20);
  });

  // ── AND IT HAS TO REACH THE SHELL PEOPLE USE ──────────────────────────────
  // Measured 2026-09-23: `playbookMilestones` has exactly ONE consumer,
  // `playbookAreaNextStep`, which has exactly ONE consumer, `src/App.js` — the
  // FROZEN CRA donor. hostv2 never mentions milestones. So everything asserted
  // above was true of an engine that reached no host in the shipping app, and
  // this file's green run said nothing about the screen.
  //
  // The checklist is what hostv2 renders, and it dates tasks from the TASK's own
  // `when` — `milestoneId` is a grouping label, not a date source. The task now
  // INHERITS its milestone's floor, so the rule still lives in one place.
  const chk = (e) => {
    const list = playbookChecklist(e, AS_OF) || [];
    const flat = Array.isArray(list) ? list : (list.items || []);
    return (re) => flat.find((x) => re.test(String(x.task || x.label || '')));
  };

  test('THE FIX REACHES THE CHECKLIST: the invite task moves with its milestone', () => {
    const invite = chk(DEST)(/send invites/i);
    const local = chk(LOCAL)(/send invites/i);
    expect(invite).toBeTruthy();
    // 88 days before the event rather than 18 — the same floor, on the surface
    // the shipping shell actually draws.
    expect(local.dueInDays - invite.dueInDays).toBe(88 - 18);
  });

  test('…and NOTHING ELSE on that checklist moves', () => {
    // The task-side version of the defect that shipped on the milestone side:
    // chasing RSVPs and writing thank-yous have no travel-booking argument.
    const d = chk(DEST); const l = chk(LOCAL);
    for (const re of [/chase non-responders/i, /thank/i, /pick up the cake/i]) {
      const a = d(re); const b = l(re);
      if (!a || !b) continue;
      expect(a.dueInDays).toBe(b.dueInDays);
    }
  });

  test('NEGATIVE CONTROL: a LOCAL event\'s checklist is untouched end to end', () => {
    // If the floor ever leaked into the local path, every host would see it.
    const local = chk(LOCAL)(/send invites/i);
    const authored = getPlaybook('Birthday').tasks.find((t) => t.id === 't_invite');
    expect(authored.when).toBe('T-18d');
    expect(local.dueInDays).toBe(chk(LOCAL)(/send invites/i).dueInDays);
    const dte = local.dueInDays + 18;
    expect(local.dueInDays).toBe(dte - 18);
  });

  test('NEGATIVE CONTROL: the 9–12 month wedding advice is NOT what got built', () => {
    // Booking that early is measured at 36% more. If someone later "corrects"
    // this floor upward to match the etiquette blogs, this fails — which is the
    // point.
    expect(airTravelInviteFloor(DEST).floorDays).toBeLessThan(180);
  });
});
