// A NEW EVENT FROM HER SENTENCE (owner, 11/26/2026: "start Create").
// Moved out of hostv2's assemble() so hostv4's Create builds the same event
// from the same words. Two steps, both pure:
//   effectiveAnswers(parsed, said) — what the plan will use: her correction
//     first, then what her sentence said, then the playbook's typical;
//   eventFromSentence(...) — the event object, before any shell saves it.
// Saving, analytics, the reveal and the notices stay in each shell.
import { occasionShortName } from './occasionWords';
import { eventNameFrom } from './eventName';
import { hostNameFor } from './hostNameFor';
import { eventDatesPatch } from './eventDates';
import { startTimeFieldsToPersist } from './startTimeFieldsToPersist';
import { townFieldsToPersist } from './townFieldsToPersist';
import { travelFieldsToPersist } from './travelFieldsToPersist';
import { heardMustHaves, heardStayStyle } from './lodgingIntel';
import { heardAccessNeeds } from './accessNeeds';
import { potluckPickFor, byobPickFor, adultsOnlyPickFor, heardKidsCount, heardAllergyCounts, heardOvernightCount } from './heardFacts';
import { heardVendorIntents } from './heardClauses';
import { timeOfDayFor } from './knownFacts';
import { defaultStartTime } from './startTime';
import { timeAnchorFields } from './eventAnchor';
import { heardGameStyle } from './heardGameStyle';
import { getPlaybook, playbookChecklist, playbookFoodPlan, playbookTypicalGuests } from './playbooks';
import { celebrationFieldsToPersist } from './tripMeals';
import { celebrationApplies } from './tripFood';
import { heardFoods, uncoveredFoods } from './heardFoods';
import { passVerdictAtCreation } from './passGate';

// `said` holds her corrections on the create screen; any left out are unset.
export function effectiveAnswers(parsed, said = {}) {
  const { fType = null, fGuests = null, fDate = '', fEndDate = '', fName = '', fCity = '', fBudget = null, fIsDestination = null, fOvernight = null, fTravelMode = null } = said;
  // Effective values: manual correction wins, then the parse, then the
  // playbook's own typical (host-shell defaulting — never a blank form).
  const effType = fType || parsed.type || null;
  const pbTypical = effType ? playbookTypicalGuests(effType) : null;
  const effGuests = (fGuests ?? parsed.guests) ?? pbTypical;
  const effDate = fDate || parsed.date || '';
  // ── THE SPAN'S LAST DAY, AND WHY THE OLD RULE WAS A TRAPDOOR ─────────────
  //
  // R1 (span ruling, 2026-07-26) said the parsed end rides only while the
  // start it was heard with still stands, because "a manually corrected start
  // date can't keep a parsed end that no longer means anything". The reasoning
  // is right and the implementation had no floor under it.
  //
  // DRIVEN 2026-09-27, host report. Type "family reunion July 10-13 in
  // Charleston": the chip reads Jul 10 – Jul 13, correctly. Open the date
  // editor — it offers ONE date, because there was no `fEndDate` anywhere in
  // creation — and move the start to the 11th. The end date is gone, the chip
  // reads "Jul 11", and there is no field in which to put it back. The host's
  // own sentence still says July 10-13 on the screen above.
  //
  // TWO THINGS WERE WRONG.
  //
  //   1. `effDate === parsed.date` drops the end on ANY start edit, including
  //      one that leaves the span perfectly coherent. Moving 10 -> 11 with an
  //      end of the 13th is still a real three-day event. An end only stops
  //      meaning anything when it is no longer AFTER the start, and that is
  //      what this now tests.
  //   2. R1 presupposed somewhere to re-enter it. There wasn't one. A rule
  //      that discards a host's input is only safe if the host can give it
  //      again, so the input below exists now and this reads it first.
  const effEndDate = fEndDate || (parsed.endDate && parsed.endDate > effDate ? parsed.endDate : '');
  const effName = fName || parsed.honoree || '';
  // A real "in Santa Fe, New Mexico" match pre-fills the town field the same
  // way a typical guest count pre-fills — visible, editable, never silently
  // final until "Put my plan together."
  const effCityText = String(fCity || '').trim() || (parsed.venueCity ? (parsed.venueState ? parsed.venueCity + ', ' + parsed.venueState : parsed.venueCity) : '');
  const effBudget = fBudget ?? parsed.budget ?? null;
  // ── A GUESS IS NOT AN ANSWER (2026-09-17) ────────────────────────────────
  // With no home city on the profile, smartParseEvent fires isDestination for
  // ANY bare resolved city — deliberately, because a miss silently deletes the
  // whole travel stack. But "fire by default" also means a local party typed as
  // "in Greenbelt, MD" arrived pre-committed to a destination plan (lodging,
  // transport, a budget blended toward travel-led) that the host never asked
  // for and was never asked about.
  //
  // basis 'place-named' is exactly and only that guess — 'travel-language' is
  // the host's own words and 'place-differs-from-your-area' is grounded in her
  // profile, so both still commit. The guess becomes the THIRD state the
  // overnight chip already established: unanswered, which stays honest instead
  // of defaulting. Nothing downstream changes for the two grounded cases.
  const destinationIsGuess = parsed.destinationBasis === 'place-named';
  const effIsDestination = fIsDestination ?? (destinationIsGuess ? null : !!parsed.isDestination);
  // Host answer wins over the heard hint, which wins over nothing. Staying null
  // is a real state — it means "we have not been told", and the decisions that
  // depend on it stay out rather than being gated on a guess.
  // ── AND THE OVERNIGHT CLAIM CANNOT OUTLIVE THE SPAN IT CITES ─────────────
  //
  // `parsed` is a pure function of the TEXT, so `parsed.overnight` stayed true
  // after the span was dropped above — the text still said "July 10-13". The
  // chip went on rendering "Staying overnight · from your dates" while the
  // only date on screen was a single day: it cited dates it was no longer
  // showing. Not cosmetic — overnight is what turns on the lodging and travel
  // stack, so the plan was built for a multi-night stay on a one-day event.
  //
  // Said-so still beats derived, exactly as smartParseEvent decided on
  // 2026-08-06: a host who wrote "hotel" or "3 nights" told us, and that does
  // not depend on any date surviving. What is DERIVED from a span is now
  // derived from the EFFECTIVE span, so it falls away with it and the chip
  // honestly reverts to the unanswered "Staying over?".
  const saidOvernight = parsed.overnightBasis === 'said-so';
  const effOvernight = fOvernight ?? ((saidOvernight || !!effEndDate) ? true : null);
  const effTravelMode = fTravelMode ?? parsed.travelMode ?? null;
  return { effType, pbTypical, effGuests, effDate, effEndDate, effName, effCityText, effBudget, destinationIsGuess, effIsDestination, saidOvernight, effOvernight, effTravelMode };
}

// The event itself. `id` and `rsvpCode` come from the shell (a correction keeps
// the ones it already has); `customs` is the events that existed before this
// one, which the pass verdict is judged against.
export function eventFromSentence({ text, parsed, said = {}, profile = null, customs = [], id, rsvpCode, arrivedFrom = null, now = new Date() }) {
  const smartText = text || '';
  const newId = id;
  const { fCity = '', fGuests = null, fIsDestination = null, fOvernight = null } = said;
  const { effType, effGuests, effDate, effEndDate, effName, effBudget, effIsDestination, effOvernight, effTravelMode } = effectiveAnswers(parsed, said);
  const short = occasionShortName(effType);   // "Cookout", "Watch Party" — not "The Cookout", "Watch"
  // A recognized milestone ("50th birthday") rides into the name — but it modifies the
  // OCCASION it belongs to (birthday/anniversary), NOT blindly the primary type (host
  // report: "50th ... retirement" was naming a "50th Retirement"). A DUAL event names
  // BOTH occasions ("Retirement & 50th Birthday") instead of dropping half.
  const secShort = parsed.secondaryType ? occasionShortName(parsed.secondaryType) : null;
  const occasions = [short, secShort].filter(Boolean);
  const cap = parsed.milestone ? parsed.milestone[0].toUpperCase() + parsed.milestone.slice(1) : null;
  const milestoneName = (cap
    ? occasions.map((o) => (/birthday|anniversary/i.test(o) ? cap + ' ' + o : o))
    : occasions).join(' & ');
  const ev = {
    id: newId, rsvpCode,
    // "Match my event" for NEW events only (owner, 11/24/2026): the invite's
    // colors follow the occasion and month (lib/inviteTone autoInvitePalette).
    // Events made before this keep a blank inviteStyle and today's stock.
    inviteStyle: 'auto',
    ...(arrivedFrom ? { acquisitionSource: { from: arrivedFrom.from, ...(arrivedFrom.kind ? { kind: arrivedFrom.kind } : {}), at: arrivedFrom.at } } : {}),
    createdAt: now.toISOString(), // overdue-on-creation fix: the board needs to know the runway existed
    // A HOST WHO NAMED HERSELF GETS HER NAME ON IT (owner acceptance run,
    // 11/5/2026): "Vida is hosting a girls' game night" saved as "My Game
    // Night". The honoree still wins when there is one; the host is kept on
    // `hostName`, never promoted to honoree — nobody is being celebrated.
    // NAMED FROM HER OWN WORDS (lib/eventName, six root causes cause 6): her
    // honoree or her own name when she gave one, else the occasion phrase
    // her sentence opens with — never "My <Type>". A bare occasion is a
    // placeholder that lib/outwardReady asks her to replace before a send.
    name: eventNameFrom({ sentence: smartText, honoree: effName, hostName: parsed.hostName, milestoneName }).name,
    honoree: effName || '',
    // …and when she did not name herself, the invitation is from the name
    // her profile already holds (hostNameFor), not a blank she is asked to fill.
    ...(hostNameFor({ hostName: parsed.hostName }, profile) ? { hostName: hostNameFor({ hostName: parsed.hostName }, profile) } : {}),
    // THE DATES, THROUGH THE ONE SETTER (lib/eventDates) the Date & time
    // editor and the date poll use, so creation stores the same shape.
    type: effType, date: '', ...(() => { const d = eventDatesPatch({}, { date: effDate, endDate: effEndDate }); return d ? (d.endDate ? d : { date: d.date }) : {}; })(),
    // HER SENTENCE MEANT MORE THAN ONE DAY AND DID NOT SAY WHICH (owner
    // report 11/21/2026): "a long weekend", "July 4th weekend", a trip with
    // only a start. Not a span and not a guess — the question the reveal and
    // Date & time ask ("Which dates?"), cleared by the first range she gives.
    ...(parsed.datesToConfirm && !effEndDate ? { datesToConfirm: true } : {}),
    venue: parsed.venue || '', venueKind: parsed.venueKind || '',
    // THE MONTH THE HOST NAMED, when they did not name a day ("in June of 2028",
    // "next month", "this fall"). It was heard at intake — the chip said
    // "Jun 2028 · pick a day" — and then dropped here, so the board answered
    // "No date" to someone who had just given one, the countdown had nothing to
    // stand on, and the date picker opened BLANK on a month already chosen.
    // Honest to persist: `monthYear` is null unless the host actually said it
    // (smartParseEvent ~229-260), and it is never a day — the day stays unset
    // until they pick one. Written only when there is no exact date.
    ...(!effDate && parsed.monthYear ? { targetMonth: parsed.monthYear } : {}),
    // "No kids." typed at create carries straight to the invite policy the
    // invite + DIFM copy already consume (parser 2026-07-27; never invented).
    ...(parsed.kidsPolicy ? { kidsPolicy: parsed.kidsPolicy } : {}),
    // ── A TIME SHE TYPED IS A TIME SHE OWNS (2026-09-17) ──────────────────
    // The parser now reads a spoken clock ("Sunday at 1pm"), which until now
    // was dropped so the app could propose an hour back to her on the very
    // next screen. startTimeSource:'host' is the whole point — startTimeIsConfirmed
    // gates the invite, the vendor brief and the ROS clock on NOT being
    // 'derived', and this hour is hers, not ours. The 15:00 bug was the app
    // inventing a time; writing down the one she gave is the opposite of it.
    // 2026-09-19: …FOR THE TWO GRADES WHERE SHE ACTUALLY SAID IT. This line
    // wrote startTimeSource:'host' for all THREE parser grades and dropped
    // `startTimeBasis` entirely — so "cookout at 5", which the parser marks
    // `said-hour-only` because IT chose the PM, was sent to her guests and
    // her caterer as a confirmed 5:00 PM. The rule now lives in
    // lib/startTimeFieldsToPersist.js where jest can run it.
    ...startTimeFieldsToPersist(parsed),
    // The street line she already typed, instead of asking for it again in a
    // separate field. venueAddress already feeds the invite and the rain note.
    ...(parsed.venueAddress ? { venueAddress: parsed.venueAddress } : {}),
    ...((() => {
      // Same strict city/state-or-ZIP gate as the other venueCity writers —
      // this is event CREATION, so a bare city typed here would otherwise
      // slip past every later check (needsCity only fires on an EMPTY city).
      //
      // THE GATE IS RIGHT; THE SILENCE WAS NOT (2026-09-18). The parser now
      // resolves a bare town against a curated whitelist, so "Reunion in
      // Asheville" pre-fills this field — and then this line ran it through the
      // commit gate, wrote `venueCity: ''` and said NOTHING. The host watched
      // their own word disappear. The manual path has always been honest about
      // this (~:1228 toasts "Add the state or ZIP too — a city name alone could
      // be in any state"); creation was the one door that swallowed it.
      // `_cityDropped` is read just after the write to say the same sentence.
      // The town the host typed is KEPT as heard (round 2, 11/16/2026), so the
      // lodging step proposes "Asheville" instead of asking from scratch. It is
      // never treated as a confirmed location. The rule, and the state she said
      // with no town ("Sandy Point State Park, MD", batch 11), live in
      // lib/townFieldsToPersist.js where jest runs them.
      return townFieldsToPersist(fCity, parsed);
    })()),
    guestMode: 'count',
    guestEstimate: effGuests || '',
    // WHOSE NUMBER IS THIS (2026-09-18). `effGuests` is
    // `(fGuests ?? parsed.guests) ?? pbTypical` (~:1370) — so when BOTH host
    // sources are null the app is substituting the playbook's typical, and the
    // chip a few lines up already says so out loud ("~40 · typical"). That fact
    // was on screen at creation and thrown away one line later at persist, which
    // is how an invented 40 reached a caterer as "for about 40 guests".
    // Same shape as startTimeSource directly above; lib/guestCountFor.js gates
    // the outward drafts on it, exactly as startTimeIsConfirmed does.
    ...(effGuests ? { guestCountSource: (fGuests ?? parsed.guests) != null ? 'host' : 'playbook-typical' } : {}),
    // THE PAIRING, NOT JUST THE HEADCOUNT (2026-10-03). "8 couples" became
    // `guests: 16` and nothing else, so lodgingIntel.bedroomsNeeded had to
    // ASSUME double occupancy to answer "how many bedrooms" — guessing, on
    // screen, exactly what the host had already said out loud. This is the
    // same class as guestCountSource directly above and isDestination below:
    // a fact that was on screen at creation and thrown away one line later.
    // Written only when heard; no pairing stays absent rather than a zero.
    ...(parsed.guestPairs ? { guestPairs: parsed.guestPairs } : {}),
    // ── AND THE THING THE HOST SAID ABOUT SOMEONE'S HEALTH ───────────────
    // Same class as guestPairs above, and the most expensive instance of it.
    // "the altitude is hard on her" was heard by the parse, printed back
    // under DIDN'T MAKE IT INTO THE PLAN, and dropped — while `dest_health`,
    // the question authored for exactly that and carrying a pacing task,
    // sat three taps away at its default. The fact existed on screen at
    // creation and was thrown away one line later, which is the shape this
    // file keeps finding.
    // Written only when heard. It carries the host's WORDS because the
    // recommendation quotes them back rather than asserting a health fact in
    // the app's own voice — and it PROPOSES, so the question stays theirs.
    ...(parsed.healthNoted ? { healthNoted: parsed.healthNoted } : {}),
    totalBudget: effBudget || '',
    // ── WHAT WE MAY WRITE DOWN ABOUT TRAVEL ─────────────────────────────
    // Four spreads lived here and encoded a rule jest could never run — which
    // is how `isDestination: false` survived on every event where the parser
    // simply heard NOTHING. The parser has no affirmative "this is local"
    // detector (smartParseEvent ~:524), so a derived false only ever meant "no
    // travel signal found", and persisting it deleted the travel, lodging and
    // transport stack on a claim the host never made.
    // The rule, its decision table and its reasoning now live in
    // lib/travelFieldsToPersist.js, where they are executed by real tests.
    ...travelFieldsToPersist({
      effIsDestination, manualIsDestination: fIsDestination,
      effOvernight, manualOvernight: fOvernight,
      destinationBasis: parsed.destinationBasis, overnightBasis: parsed.overnightBasis,
      travelMode: effTravelMode,
    }),
    // The coarse time-of-day the host said ("cookout in the afternoon"). Persisted so the
    // grounded start-time default below has a bucket to propose from — without this it was
    // dropped, and defaultStartTime had nothing to ground on for a brand-new event.
    ...(parsed.timeOfDay ? { timeOfDay: parsed.timeOfDay } : {}),
    // HOW LONG, WHEN THE DATES CANNOT SAY IT (host report 2026-09-29).
    // The parser has carried `nights` since 2026-09-25 and nothing wrote it
    // down. On the owner's own Disneyland seed — "nov 2027 … 5 nights" — the
    // month resolves and the day does not, so date→endDate has no start to
    // count from and the host's five nights were dropped on the floor at
    // persist. The reveal then said "Not picked yet." where the Santa Fe 80th,
    // one sentence away in the same drive, said "3 nights to cover."
    //
    // ONLY when `effEndDate` is empty. With real dates the span IS the
    // answer, and storing a second copy of it beside them is how two numbers
    // for one fact start to drift. Named `statedNights` so no reader can
    // mistake the host's own word for a derived span; lib/eventSpan ranks it
    // below the dates for the same reason.
    ...(!effEndDate && parsed.nights > 0 ? { statedNights: parsed.nights } : {}),
    // DUAL / compound event + theme (host report — parsed then dropped at build). secondaryType
    // makes it a real compound event; theme seeds the look. Only ever what the host actually said.
    ...(parsed.secondaryType ? { secondaryType: parsed.secondaryType } : {}),
    ...(parsed.theme ? { theme: parsed.theme } : {}),
    // WHAT SHE ASKED FOR IN THE PLACE ITSELF (host 2026-08-05: "did we add
    // that the 80th birthday was for resort spa?"). She typed "Santa Fe, NM
    // resort spa"; the town was kept and the rest dropped, so the lodging
    // requirement list proposed six things she never said and missed the one
    // she did — with a hot-tub filter sitting VERIFIED in lodgingIntel the
    // whole time. Matched against that file's own vocabulary, never invented,
    // and written only when her words actually matched something.
    ...(() => { const w = heardMustHaves(smartText); return w.length ? { lodgingWants: w } : {}; })(),
    // The KIND of place she named ("resort spa"), kept verbatim. It leads the
    // hotel search rather than being mapped onto an amenity filter we could
    // not honour — searching "hotels in Santa Fe" for a host who asked for a
    // resort spa hands back the wrong results.
    ...(() => { const st = heardStayStyle(smartText); return st ? { lodgingStyle: st } : {}; })(),
    // ── AN OPERATIONAL NEED SHE STATED (2026-10-18, Sprint 0 P1-2) ──────
    // The measured case this whole surface's "Didn't make it into the plan"
    // list was built for: "…sit-down lunch, she uses a walker" — both halves
    // vanished, and :9455 already records why mobility mattered for that
    // 80th. The need now has somewhere to live, matched against
    // accessNeeds.js's own vocabulary and written only when her words
    // actually matched — the same seam and the same rule as lodgingWants
    // directly above. NO DIAGNOSIS is derived, and "she" is never resolved
    // to a guest.
    ...(() => { const an = heardAccessNeeds(smartText); return an.length ? { accessNeeds: an } : {}; })(),
    // ── HER SENTENCE SURVIVES CREATION (2026-10-18, Sprint 0 P1-3) ──────
    // "Didn't make it into the plan" was computed live from the box and the
    // text was never kept, so the list vanished the instant the event
    // existed — shown once, while she was still typing the thing into
    // being, and never again. Keeping the sentence means the question stays
    // answerable, and means a clause leaves the list on its own the day a
    // consumer starts reading it, on every existing event, with nothing to
    // backfill. The LIST is deliberately not stored; see heardClauses.js.
    createdFromText: smartText,
    // WHAT SHE SAID, WRITTEN DOWN (owner, 11/21/2026: "Don't keep asking host
    // for the same information"). "including 8 kids", "one guest has a nut
    // allergy" and "3 staying overnight" were heard, listed as dropped, and
    // asked for again. lib/heardFacts.js reads them; only what she said.
    ...(() => { const n = heardKidsCount(smartText); return n ? { kidsCount: Math.min(n, Number(effGuests) || n) } : {}; })(),
    ...(() => { const dc = heardAllergyCounts(smartText); return dc ? { dietCounts: dc } : {}; })(),
    ...(() => { const n = heardOvernightCount(smartText); return n ? { overnightCount: n } : {}; })(),
    budget: [],
    guests: [], vendors: heardVendorIntents(smartText).map((v, i) => ({ ...v, id: 'v-' + newId + '-' + i })), timeline: [],
  };
  // HER CLOCK OUTRANKS HER WORD (owner, 11/21/2026). "Dinner at 4pm" stored
  // timeOfDay 'evening' (from "dinner") beside 4:00 PM, and the budget's
  // time-of-day factor read the bucket. A clock she said decides it.
  { const tod = timeOfDayFor(ev); if (tod) ev.timeOfDay = tod; }
  // AN EVENT ARRIVES WITH A GROUNDED START TIME (host directive, 2026-07-14).
  // Not the old invention — that was a bare 15:00, written as fact and indistinguishable
  // from a host decision. This one is DERIVED (a real sunset + the playbook's own run-length,
  // or failing that the host's own time-of-day word) and it carries its provenance:
  // startTimeSource:'derived' plus the sentence that justifies it. So the day runs on a real
  // clock from the first second, the host is told plainly that we picked it and why, and
  // nothing OUTWARD — a guest's invitation, a vendor's brief — states the hour until they
  // have confirmed it. An unconfirmed hour is ours, not theirs.
  const _hadTime = !!String(ev.startTime || '').trim();
  try { Object.assign(ev, defaultStartTime(ev, null) || {}); } catch (_e) { /* no grounding — the list asks */ }
  // WHAT HER TIME MEANS, stamped once (lib/eventAnchor, cause 5): for a
  // meal-centered playbook the time she typed is when dinner hits the table.
  try { Object.assign(ev, timeAnchorFields(ev, { defaultApplied: !_hadTime && !!String(ev.startTime || '').trim() })); } catch (_e) { /* an unstamped event keeps the arrival meaning */ }
  // Canonical checklist over the real event object (date-relative offsets,
  // choice/caterer gates). No date yet → honestly empty; drafts later.
  // THE GAMES SHE ASKED FOR ARE HER PICK (run 2, R2-15): "team-oriented games"
  // had no option. When the playbook offers the style she named, it is recorded
  // as answered BY HER (choiceSource 'host') — before the checklist is drawn, so
  // the team-split task is on it from the start.
  try {
    const style = heardGameStyle(smartText);
    const d = style && ((getPlaybook(ev.type) || {}).decisions || []).find((x) => x && x.id === 'game_type' && (x.options || []).includes(style));
    if (d) { ev.foodChoices = { ...(ev.foodChoices || {}), game_type: style }; ev.choiceSource = { ...(ev.choiceSource || {}), game_type: 'host' }; }
  } catch (_e) { /* the decision asks later */ }
  // "POTLUCK" AND "BYOB" ARE HER ANSWERS (owner, 11/21/2026). "Potluck
  // Thanksgiving" stored nothing, so who-cooks proposed host-cooks; "BYOB" was
  // listed as dropped while the drinks call proposed its default. Recorded the
  // way her game style is, before the checklist is drawn. "no kids" is her
  // audience answer the same way (audit lane B, 11/22/2026).
  try {
    const decs = (getPlaybook(ev.type) || {}).decisions || [];
    [potluckPickFor(decs, smartText), byobPickFor(decs, smartText), adultsOnlyPickFor(decs, ev.kidsPolicy)].filter(Boolean).forEach(({ id, pick }) => {
      ev.foodChoices = { ...(ev.foodChoices || {}), [id]: pick };
      ev.choiceSource = { ...(ev.choiceSource || {}), [id]: 'host' };
    });
  } catch (_e) { /* the decision asks later */ }
  // THE DINNER INSIDE THE TRIP (owner, 11/21/2026). "dinner at an adobe
  // courtyard" survived only in the sentence; it is now the celebration's
  // place (the kind of place, not a booked venue), shown on the dinner sheet
  // and never re-asked. A type with a celebration gets the record even with
  // no place said, so the invite knows the dinner is its own moment.
  // A night she named by its holiday ("New Year's Eve trip … Dec 30 – Jan 2",
  // owner 11/22/2026: "trip wins") is her pick, and it is what gives a Group
  // Trip its dinner — so it is read before asking whether one applies.
  try {
    const said = celebrationFieldsToPersist(smartText, parsed).celebration || {};
    if (celebrationApplies({ ...ev, celebration: said })) ev.celebration = said;
  } catch (_e) { /* the dinner sheet asks what it must */ }
  try { ev.timeline = (playbookChecklist(ev) || []).map(r => ({ id: r.id, week: r.week || '', leadDays: r.leadDays != null ? r.leadDays : null, task: r.task || '', done: false, owner: '', category: r.category || '' })); } catch {}
  // A FOOD SHE NAMED IS ON THE MENU (GOLD-05, 11/5/2026). One the playbook
  // already carries stays as it is; any other becomes a host-named line.
  try {
    const extra = uncoveredFoods(heardFoods(smartText), (playbookFoodPlan(ev) || {}).list);
    if (extra.length) ev.foodAdd = extra.map((f, i) => ({ id: 'add-heard-' + newId + '-' + i, name: f.name, cost: 0, group: 'Food', cat: 'other' }));
  } catch (_e) { /* no food plan — the menu asks later */ }
  // MODEL D — THE ONE STAMPING MOMENT (grandfather rule, board 2026-08-18):
  // the pass verdict is computed here, against the events that existed
  // before this one, and stored on the event forever. lib/passGate.js is
  // the ruling made executable; nothing downstream ever recomputes this.
  // Stamped even while billing is dormant, so pre-launch events carry an
  // honest verdict rather than getting a surprise one later — though note
  // passGate treats an UNSTAMPED event as grandfathered free regardless.
  try { Object.assign(ev, passVerdictAtCreation(ev, customs), { briefSharedVendorIds: [] }); } catch { /* engine absent — event stays unstamped, i.e. free */ }
  return ev;
}
