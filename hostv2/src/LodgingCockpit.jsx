// ─── WHERE EVERYONE STAYS — THE COCKPIT (reimagine, 2026-08-03) ────────────
//
// Host, after reading the live panel end to end: "not very readable... we need
// way more than folding."
//
// The live sheet is FIVE surfaces wearing one scroll — a search launcher, an
// intake, a comparison, a commitment and a record. A host is only ever in ONE
// of those moments, so stacking all five makes them work out which part is
// theirs every time. Folding hid four behind carets; it did not stop there
// being four.
//
// Same content, ONE STAGE AT A TIME — 02_STUDIO_MATTE's Detail View Rule
// ("operating cockpits… readiness, why it matters, next action, phase
// sections") and UX_04's "every view has exactly one dominant element".
//
// IT WRITES FOR REAL. Pasting adds options, picking writes `status: 'chosen'`
// AND fills the stay in the same patch (the outlet ruling, 2026-07-28: a pick
// that touches nothing is a toast that lies). Everything lands on the same
// localStorage the live app reads, so the two surfaces cannot disagree.
//
// NOTHING HERE INVENTS DATA. Every number comes from the engines the live sheet
// uses. A stage the data has not reached says so plainly.
import { useMemo, useState, useCallback, useEffect } from 'react';
// The published rungs of the lodging ladder. Rungs 1-2 are the host's own
// shortlist and this surface already shows those; 3 and 4 are what there is
// to say BEFORE they have one.
import { lodgingBasisFor, isOwnEvidence } from '@app/lib/knowledge/lodgingBasisLadder';
import { perHeadOf } from '@app/lib/perHead';
import { isListingPhoto } from '@app/lib/lodgingBookmarklet';
import {
  lodgingIntel, lodgingStage, LODGING_STAGES, lodgingCompare, lodgingRecommendation,
  kitchenConsequence, lodgingSearchLinks, appliedByEveryDoor, lodgingSearchBlocked,
  extractListingCandidates, normalizeLodgingOption, stayFromPick, looksLikeSearchUrl, looksLikeHotelsResultsPage, looksLikeHotelDetailPage, unfurlListing, lodgingResults, isUnfurlConfigured, unfurlOffNote, rankCandidates,
  lodgingTitleFor, lodgingTitleIsReal, lodgingTrouble, lodgingProvenance, lodgingRankBasis, lodgingPriceHistory,
  STAY_FROM_CONFIRMATION, STAY_FROM_PLAN,
} from '@app/lib/lodgingIntel';
import { buildTravelPlan, nextLodgingStatus, LODGING_STATUS_LABEL } from '@app/lib/travelPlan';
import { normalizeCvbContact } from '@app/lib/cvbIntel';
import { draftLodgingNote } from '@app/lib/doItForMe';
import { saveCustomEvents } from '@app/lib/customEventStore';
import { venueFor } from '@app/lib/venueFor';
import { settleChoicePatch } from '@app/lib/choiceProvenance';
import { spanNights } from '@app/lib/dates';
import { LS_CUSTOMS, LS_LAST_EVENT, loadCustomEvents } from './eventPool.js';

// ─── THE WORKED EXAMPLE (2026-08-04) ───────────────────────────────────────
// A fresh device has an empty store (localStorage is per origin), so a phone on
// the LAN starts with nothing to plan. This is the same Santa Fe 80th the whole
// workflow was built and driven against, offered as an EXPLICIT act rather than
// seeded silently — the host taps to load it, and it is labelled an example.
//
// It carries NO lodging options on purpose: the point of a phone drive is to
// walk the real path — doors, paste, review, pick — not to land mid-way through
// somebody else's shortlist.
//
// `demoSeed: true` marks it so it can never be mistaken for a real event the
// host made, by them or by us.
const SANTA_FE_EXAMPLE = {
  id: 'cust-demo-santafe',
  demoSeed: true,
  name: 'Mom’s 80th Birthday',
  type: 'Birthday',
  date: '2028-06-17',
  endDate: '2028-06-21',
  isDestination: true,
  venueCity: 'Santa Fe',
  venueState: 'NM',
  guestCount: 10,
  totalBudget: 4800,
  lodgingMustHaves: ['stepfree', 'laundry', 'parking'],
  lodgingOptions: [],
  budget: [],
  vendors: [],
  guests: [],
};

function seedExample() {
  try {
    const all = loadCustomEvents() || [];
    const without = all.filter((e) => e && e.id !== SANTA_FE_EXAMPLE.id);
    // Through the guard: this rebuilds the array, and a bare setItem of a
    // rebuilt array is exactly how a real event was lost on 2026-08-06. It
    // keeps `without`, so it drops nothing and is never refused.
    saveCustomEvents([...without, { ...SANTA_FE_EXAMPLE }], { reason: 'lodging:seed-example' });
    localStorage.setItem(LS_LAST_EVENT, SANTA_FE_EXAMPLE.id);
    window.location.reload();
  } catch { /* private mode — the planner link is still there */ }
}

const STEP_LABEL = {
  'no-town': 'The town', looking: 'Go look', weighing: 'Weigh them',
  picked: 'The pick', booked: 'On the books',
};

export default function LodgingCockpit() {
  const [tick, setTick] = useState(0);
  const events = useMemo(() => { try { return loadCustomEvents() || []; } catch { return []; } }, [tick]);
  const lastId = (() => { try { return localStorage.getItem(LS_LAST_EVENT); } catch { return null; } })();
  const [eventId, setEventId] = useState(() =>
    (events.find((e) => e && e.id === lastId) ? lastId : (events[0] && events[0].id)) || null);
  const event = events.find((e) => e && e.id === eventId) || null;

  // ONE write path. Everything on this surface goes through it, so the cockpit
  // and the live sheet can never hold different truths about the same event.
  const patch = useCallback((changes) => {
    try {
      const all = loadCustomEvents() || [];
      const next = all.map((e) => (e && e.id === eventId ? { ...e, ...changes } : e));
      // A map preserves every id, so this can never be refused — the guard is
      // here so no future edit to this line can quietly become a replacement.
      saveCustomEvents(next, { reason: 'lodging:patch' });
      setTick((t) => t + 1);
      // FINISHING A STEP LANDS YOU ON THE NEXT ONE (host, 2026-08-04). The
      // stage is derived, so the data moving forward already moves the host —
      // EXCEPT while they are peeking at another step, where `viewing` pinned
      // them to the screen they had just finished with. Any real write clears
      // the peek, so completing an act always hands them wherever they now are.
      setViewing(null);
      // The link has been answered. Same argument as the peek above: once the
      // host acts, the thing that sent them here stops steering.
      setFocus(null);
    } catch { /* storage full or blocked — the surface simply does not change */ }
  }, [eventId]);

  const intel = useMemo(() => { try { return event ? lodgingIntel(event) : null; } catch { return null; } }, [event]);
  const derived = useMemo(() => { try { return event ? lodgingStage(event, intel) : null; } catch { return null; } }, [event, intel]);

  // ── THE DEEP LINK THAT ARRIVED (2026-08-08) ────────────────────────────
  // HostShellV2's dispatcher now carries `focus` across the page load as a
  // query param (goToLodgingCockpit). Two shapes reach here, and they are the
  // two the router already emits: 'deadline' (routeResolver.js:98, from the
  // group-rate raise) and a guest id (routeResolver.js:96).
  //
  // It is READ ONCE and then owned by state, never re-read from the URL. A
  // param that kept asserting itself would drag the host back to the same row
  // every time the surface re-derived, which is the opposite of landing.
  const [focus, setFocus] = useState(() => {
    try {
      const f = new URLSearchParams(window.location.search).get('focus');
      return f && String(f).trim() ? String(f).trim() : null;
    } catch { return null; }
  });

  // `viewing` changes only which stage you LOOK at — it never rewrites the
  // event, so this cannot lie about where the host actually is.
  const [viewing, setViewing] = useState(null);
  // A FOCUS MAY NOT INVENT A STAGE. 'deadline' lives in `picked` and the roster
  // lives in `booked`, but neither screen is honest before a stay is chosen —
  // Picked renders "Nothing picked yet" and WhosBooked has no rate to chase. So
  // the focus moves the host only when the event is ALREADY at or past the
  // stage that holds the thing, and otherwise leaves them where they really
  // are. A link is allowed to point at a row; it is not allowed to claim the
  // host is further along than they are.
  const focusStage = (() => {
    const at = derived && derived.stage;
    if (!focus || (at !== 'picked' && at !== 'booked')) return null;
    return focus === 'deadline' ? 'picked' : 'booked';
  })();
  const stage = viewing || focusStage || (derived && derived.stage) || null;
  const isCurrent = !viewing || (derived && viewing === derived.stage);

  // ── AN EMPTY STORE IS A ROUTE, NOT A DEAD END ──────────────────────────
  // Hit on a phone over the LAN (2026-08-04): localStorage is PER ORIGIN, so a
  // handset on https://<lan-ip>:5210 has its own empty store even though the
  // laptop on localhost:5199 is full of events. That is correct behaviour and
  // it is exactly what a first-time device looks like.
  //
  // What was wrong is the copy: "Create one in the app first" names no route,
  // which is the same defect as every other CTA that describes an act without
  // offering it. The app IS on this origin — one link away.
  if (!event) return (
    <Frame><Solo>
      <p className="lc-eyebrow">WHERE EVERYONE STAYS</p>
      <h1 className="lc-h1">Nothing to plan yet.</h1>
      <p className="lc-why">
        Events live on the device that made them, so this one starts empty. Make an
        event here and this cockpit fills itself in.
      </p>
      <Panel label="START HERE">
        <div className="lc-ctas lc-ctas-wrap">
          <button className="cta" onClick={seedExample}>Load the Santa Fe example</button>
          <a className="cta soft" href="./" style={{ textDecoration: 'none' }}>Open the planner</a>
        </div>
        {/* DERIVED, never typed. The first cut of this read "five nights" while
            spanNights() put the same fixture at four — a hardcoded sentence
            describing data the engine already owns, drifting from it on the very
            screen that introduces the example. Read the fixture instead. */}
        <p className="lc-note">
          The example is {SANTA_FE_EXAMPLE.name} in {SANTA_FE_EXAMPLE.venueCity} —{' '}
          {spanNights(SANTA_FE_EXAMPLE)} nights, {SANTA_FE_EXAMPLE.guestCount} guests,
          no places weighed yet, so the whole path is still ahead of you. Make your own
          in the planner instead and come back with <code>?demo=lodging</code> on the end.
        </p>
      </Panel>
    </Solo></Frame>
  );
  if (!derived) return (
    <Frame><Solo>
      <p className="lc-eyebrow">WHERE EVERYONE STAYS</p>
      <h1 className="lc-h1">Not a destination event.</h1>
      {/* UX_06 planner-friendly-language: the raw internal field name was
          leaking straight into host-facing copy (found live, host-panel
          review 2026-08-05, repro'd independently by multiple reviewers).
          Say what it means, not what it's called in the code. */}
      <p className="lc-why">This cockpit only has a job when guests are traveling in for the event.</p>
      <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
    </Solo></Frame>
  );

  const copy = stageCopy(derived, stage);

  // The SAME predicate the `venueaddress` essential uses (phaseProgress) — a
  // named venue or a full address settles it; a town alone does not. Read
  // through `venueFor`, the one place reader, so this cannot drift from the
  // essential it mirrors.
  const addressUnsigned = (() => {
    try { const v = venueFor(event) || {}; return !(v.address || v.name); } catch { return false; }
  })();
  // Back to the host shell, landing ON the venue field rather than a tab top
  // (row-level CTA doctrine). `demo=lodging` is what put us in the cockpit, so
  // clearing it is what leaves.
  // ── THE WAY BACK (host, 2026-09-27) ──────────────────────────────────────
  // The cockpit is its own page — `?demo=lodging` — and it had no exit. Every
  // link on the looking stage went deeper or went OUT to Airbnb: five stage
  // tabs, three doors, a paste box, and "Add the venue address". A host who
  // opened "Where everyone stays" could reach the rest of their event only by
  // the browser's back button, which is not an affordance the app offers and
  // is gone entirely once a door has been opened in the same tab.
  //
  // Same mechanism as goAddVenue below and deliberately so: `demo=lodging` is
  // what put us here, so clearing it is what leaves. No focus target — this
  // one means "back to the whole plan", not to a row.
  const goBackToPlan = () => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('demo');
      u.searchParams.delete('focus');
      window.location.href = u.toString();
    } catch {
      window.location.href = window.location.pathname;
    }
  };
  const goAddVenue = () => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('demo');
      u.searchParams.delete('focus');
      u.searchParams.set('focus', 'event-venue');
      window.location.href = u.toString();
    } catch {
      window.location.href = window.location.pathname + '?focus=event-venue';
    }
  };

  return (
    <Frame>
      <div className="lc-grid">
        <aside className="lc-rail-col">
          {/* The exit sits ABOVE the title, where a back control is looked
              for, and it NAMES where it goes — "Back" alone would be the
              browser's job described twice. */}
          <button className="lc-back" onClick={goBackToPlan}>
            <span aria-hidden="true">‹</span> The rest of the plan
          </button>
          <p className="lc-eyebrow">
            WHERE EVERYONE STAYS
            {/* A seeded example must SAY it is one, everywhere it is on screen —
                otherwise the first honest-looking number a host reads is fiction. */}
            {event.demoSeed ? <span className="lc-demo"> · EXAMPLE</span> : null}
          </p>
          <nav className="lc-rail">
            {LODGING_STAGES.map((s) => {
              const st = derived.steps.find((x) => x.id === s) || {};
              const on = s === stage;
              return (
                <button key={s} onClick={() => setViewing(s === derived.stage ? null : s)}
                  className={'lc-step' + (on ? ' is-on' : st.done ? ' is-done' : '')}>{STEP_LABEL[s]}</button>
              );
            })}
          </nav>
        </aside>

        <main className="lc-main">
          {!isCurrent && (
            <p className="lc-peek">
              Looking ahead — you’re actually at <strong>{STEP_LABEL[derived.stage]}</strong>.
              <button onClick={() => setViewing(null)} className="lc-link">Back to now</button>
            </p>
          )}
          {/* ── THE SPEND GUARD (board ruling 2026-08-14) ───────────────────
              The operations seat was explicit about WHERE this belongs: "the
              warning belongs where the money leaves, not on a status pill 400
              pixels away." So it is not an interstitial on the way in — it is
              here, in view for the whole booking, rather than a dialog the host
              clicks past once and never sees again.

              Why it matters, in the pros' own terms: a hold costs nothing and
              can be released, a contracted block cannot. Rooms booked against a
              town can land forty minutes from the eventual venue, and most are
              non-refundable — the single money-losing ordering error on this
              surface, and the one the Grandmother seat said she would make
              because the app told her to.

              ONE ASK, and it is not "don't book". Booking may well be right —
              Santa Fe in June sells out. The guard names the cheaper order.
              Amber, not red: UX_02 gives amber to "needs attention, incomplete",
              and both event seats ruled that a red gate here is alarm the host
              learns to ignore. */}
          <h1 className="lc-h1">{copy.title}</h1>
          <p className="lc-why">{copy.why}</p>
          {/* ── THE HERO LEADS, THE CAUTION FOLLOWS (host, 2026-09-27) ──────
              The stage opened on a four-line warning about a venue address,
              and the thing the screen is actually FOR — "Go find some places."
              — came after it. UX_04 gives every view exactly one dominant
              element, and this cockpit exists to render one stage at a time;
              leading with the caution made the second-most-important thing on
              the screen the first thing read.

              The warning is not demoted in weight, only in ORDER: it still
              sits above the doors, where it can still stop a host booking a
              room an hour from an unsigned venue. It just no longer answers
              the question "what am I doing here?" before the headline does. */}
          {addressUnsigned && (
            <>{/* ── SHORT, BUT STILL THE WHOLE WARNING (host + board, 2026-09-27)
                Six lines, 109pt, the tallest block above the fold — warning
                about a venue address on the screen whose job is finding
                somewhere to stay. The host: she will not have a venue until
                she finishes this process.

                MY FIRST FIX WAS A FOLD, AND IT BROKE A BOARD RULING. The
                event pros' spend guard requires three facts above the fold —
                the gap, the money consequence, and the cheaper order (a hold
                is not a booking) — because "a warning below the buying
                controls is a warning the host meets after the money has
                gone." Collapsing it hid two of the three and the CTA, and
                lodgingSpendGuard.spec.mjs went red at desktop. The fold was
                density bought with a ruling.

                Shortening the SENTENCE costs neither: every fact the board
                named is here, the CTA is visible, and it is three lines
                instead of six. */}
            <p className="lc-venuegap">
              <strong>The venue address isn’t set yet.</strong>{' '}
              Rooms booked now can be an hour away, and most aren’t
              refundable — ask hotels to <em>hold</em> instead.
              <button type="button" className="lc-link" onClick={goAddVenue}>
                Add the venue address
              </button>
            </p></>
          )}
          <Body stage={stage} event={event} intel={intel} patch={patch} focus={focus} />
          <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
        </main>
      </div>
    </Frame>
  );
}

// Peeking must describe the stage you are LOOKING at, or the header would
// disagree with the body under it.
function stageCopy(derived, stage) {
  if (stage === derived.stage) return derived;
  return ({
    'no-town': { title: 'Name the town.', why: 'Every search needs a place before it can open.' },
    looking: { title: 'Go find some places.', why: 'Bring back a link — or the whole results page.' },
    weighing: { title: 'Weigh them side by side.', why: 'On the things you said matter — and nothing that was never said.' },
    picked: { title: 'Lock one in.', why: 'Choosing is not booking. This is where the pick becomes a reservation.' },
    booked: { title: 'On the books.', why: 'The refund window, the next payment, and who still needs a room.' },
  })[stage] || derived;
}

function Body({ stage, event, intel, patch, focus }) {
  if (stage === 'no-town') return <NoTown event={event} patch={patch} />;
  if (stage === 'looking') return <Looking event={event} patch={patch} />;
  if (stage === 'weighing') return <Weighing event={event} intel={intel} patch={patch} />;
  if (stage === 'picked') return <Picked event={event} intel={intel} patch={patch} focus={focus} />;
  return <Booked event={event} patch={patch} focus={focus} />;
}

function NoTown({ event, patch }) {
  // PROPOSE, DON'T ASK. A blank field here asks the host to re-type something
  // the app already holds: `venueCity` can be empty while `venue` carries
  // "Santa Fe, NM" verbatim (seen live — the old CTA wrote the wrong field, so
  // the town landed in `venue` and the searches stayed shut). Every source is
  // something the host typed; nothing is guessed, and the provenance is stated
  // so they can see WHERE it came from before accepting it.
  // venueFor is the ONE reader, and since 2026-08-03 it also reconciles a
  // `venue` field that is really a place ("Santa Fe, NM") into city/state. So
  // there is nothing left to fall back through — asking it is the whole answer.
  // (The first cut read the raw venue fields directly and venueSourceProof
  // failed it, correctly — raw venue reads are the bug class that gate exists
  // to catch, and it caught this file. Note the gate scans comments too, so
  // even naming those fields in prose counts against the budget.)
  const proposed = (() => {
    let vf = {}; try { vf = venueFor(event) || {}; } catch { vf = {}; }
    const value = [vf.city, vf.state].filter(Boolean).join(', ');
    return value ? { value, basis: 'from the location already on this event' } : null;
  })();
  const [town, setTown] = useState(proposed ? proposed.value : '');
  let b = null; try { b = lodgingSearchBlocked(event); } catch { b = null; }
  // Asked IN PLACE. The old route pointed at `event-venue`, which writes
  // `venue` — not `venueCity` — so the searches stayed shut (verified live).
  const save = () => {
    const t = town.trim();
    if (!t) { try { document.querySelector('.lc-field').focus(); } catch { /* no field */ } return; }
    const [city, state] = t.split(',').map((x) => x.trim());
    patch({ venueCity: city || t, ...(state ? { venueState: state } : null) });
  };
  return (
    <Panel label="THE ONE GAP">
      {/* The header already says WHY (lodgingStage reads the same
          lodgingSearchBlocked detail). Repeating it verbatim here was the same
          sentence twice on one short screen — this names what is held instead. */}
      <p className="lc-body">{proposed
        ? 'This is what the event already says — accept it or change it.'
        : 'Type the town or city. Everything else is already in hand.'}</p>
      <div className="lc-row-form">
        <input className="lc-field" placeholder="Santa Fe, NM" value={town}
          onChange={(e) => setTown(e.target.value)} aria-label="Town" />
        {/* NOT DISABLED. Reported as "not wired or working" — it was working;
            it was GREY, because the field was empty. A dimmed primary action
            with no stated reason reads as broken, so it stays live and focuses
            the field it needs instead of silently refusing. */}
        <button className="cta" onClick={save}>Use this town</button>
      </div>
      {proposed && <p className="lc-note">Proposed {proposed.basis} — nothing here was guessed.</p>}
    </Panel>
  );
}

// Platform name only; falls back to the authored label if a new door appears,
// so an unknown id degrades to the full text rather than to nothing.
const DOOR_SHORT = { airbnb: 'Airbnb', vrbo: 'Vrbo', hotels: 'Hotels' };
const shortDoor = (l) => DOOR_SHORT[l && l.id] || (l && l.label) || '';

// normalizeLodgingOption only knows a fixed field set (id/label/url/beds/
// sleeps/price/fees/cancellationTier/sources/notes/photos/status) — a hotel
// candidate's star class, rating and amenity tags aren't among them, and
// would be silently dropped the same way this file's own comment on
// normalizeLodgingOption warns about ("a normalizer that discards a field
// is a data loss no unit test on the engine can catch"). Folding them into
// `notes` — already the free-text home for exactly this kind of extra
// context (bedrooms, place) — keeps the real schema singular instead of
// growing it for one candidate shape.
const notesFor = (c) => [
  c.bedrooms ? `${c.bedrooms} bedrooms` : null,
  c.place ? `in ${c.place}` : null,
  c.starClass ? `${c.starClass}-star hotel` : null,
  c.rating != null ? `${c.rating}/5${c.ratingCount ? ` (${c.ratingCount})` : ''}` : null,
  Array.isArray(c.amenities) && c.amenities.length ? c.amenities.join(', ') : null,
].filter(Boolean).join(' · ');

function Looking({ event, patch }) {
  // Only the PUBLISHED rungs. Once the host has a shortlist, rungs 1-2 are
  // their own evidence and this surface already shows the real listings —
  // a regional average beside their own prices would be noise arguing with
  // something better.
  // ── RUNG 3 ONLY, AND RUNG 4 IS CUT ON PURPOSE (host, 2026-09-27) ────────
  // The first build of this showed the federal cap wherever Inside Airbnb had
  // no region — Santa Fe rendered "The federal cap here is $167 a night — for
  // ONE room". The host stopped it, and was right.
  //
  // GSA's figure is a reimbursement ceiling for a government traveller's
  // single hotel room. The person reading this is about to shop WHOLE HOUSES
  // for ten people. The number is precise, official-sounding, and answers a
  // question nobody asked — and a disclaimer does not undo an anchor. She
  // reads $167, opens Airbnb, sees $437 for a whole place, and concludes
  // either that the app is wrong or that she is overspending. Neither is
  // true.
  //
  // The ladder's own header already forbids this: "the worst thing this code
  // could do is let the weakest one wear the strongest one's authority", and
  // its bottom rung is null — "Not a zero, not a guess." Rung 4 in a place
  // where the host is shopping whole houses is rung 4 doing rung 3's job.
  //
  // So: the band speaks only when it can answer the question actually being
  // asked, in the unit being asked about. Everywhere else it says nothing,
  // and silence here is the design rather than a gap.
  //
  // OWN EVIDENCE ALSO SILENCES IT. Once the host has a shortlist, this
  // surface shows their real listing prices, and a regional average beside
  // them is noise arguing with something better. (Red-proofing caught that
  // this was untested: mutating the check to show own evidence too passed
  // all four tests. A gate that cannot fail on its own fault is not a gate.)
  const regionBand = useMemo(() => {
    try {
      const b = lodgingBasisFor(event);
      if (!b || isOwnEvidence(b)) return null;
      return b.rung === 'listings' ? b : null;
    } catch (_) { return null; }
  }, [event]);
  // ── AND WHEN THERE IS NO BAND, SAY SO (host, 2026-09-28) ─────────────────
  // Norman's dissent at the lodging board: "silence is also a claim", and a
  // host planning where we have no figure should not have to work out
  // whether we looked. It landed hardest on the corpus's own flagship — the
  // Disneyland 50th resolves to Anaheim, which Inside Airbnb does not cover,
  // so the whole band vanished with no explanation at all.
  //
  // This is NOT the federal fallback wearing a hedge. The cap stays cut; the
  // sentence says only that we have no regional figure, which is true and is
  // the one thing the host cannot otherwise tell.
  const noBandTown = useMemo(() => {
    if (regionBand) return null;
    try {
      const v = venueFor(event) || {};
      // The town alone is the condition: this stage only renders when the
      // cockpit is relevant at all, and `travel` lives in the parent scope.
      return String(v.city || '').trim() || null;
    } catch (_) { return null; }
  }, [regionBand, event]);
  const [text, setText] = useState('');
  // Clicking a door means "I have gone looking". On return the next act is to
  // bring something back, so the surface says so instead of leaving the host to
  // work out that the textarea below is now the point.
  const [wentLooking, setWentLooking] = useState(false);
  const [readErr, setReadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState(null);
  const [searchOffer, setSearchOffer] = useState(null);
  // ── HONEST FALLBACK ON RETURN ────────────────────────────────────────────
  // After a door, the host copies a listing and comes back. Reading the
  // clipboard for them needs `clipboard-read`, which most configurations only
  // grant behind a gesture — so this ASKS the Permissions API first and does
  // nothing at all unless the answer is already 'granted'. No prompt is
  // triggered, no read is attempted behind their back, and every failure path
  // is silent BY DESIGN: the one-tap button below is the floor, and this can
  // only ever save a tap, never become the thing the flow depends on.
  const [offer, setOffer] = useState('');
  useEffect(() => {
    if (!wentLooking) return undefined;
    let dead = false;
    const look = async () => {
      try {
        if (!navigator.permissions || !navigator.clipboard || !navigator.clipboard.readText) return;
        const st = await navigator.permissions.query({ name: 'clipboard-read' });
        if (st.state !== 'granted') return;
        const t = await navigator.clipboard.readText();
        if (dead || !t || !t.trim()) return;
        if (looksLikeSearchUrl(t)) return;          // our own door — not a find
        if (!/airbnb\.|vrbo\.com/i.test(t)) return; // not a lodging link
        setOffer(t.trim());
      } catch { /* denied, unsupported, or no gesture — the button stands */ }
    };
    window.addEventListener('focus', look);
    look();
    return () => { dead = true; window.removeEventListener('focus', look); };
  }, [wentLooking]);
  let links = []; try { links = lodgingSearchLinks(event) || []; } catch { links = []; }
  // One paste can carry a whole results page — extractListingCandidates reads
  // every card on it, with no server call.
  const add = async (raw) => {
    const src = typeof raw === 'string' ? raw : text;
    let found = { candidates: [] };
    try { found = extractListingCandidates(src) || found; } catch { /* unreadable paste */ }
    // A STABLE KEY THAT DOES NOT REQUIRE A URL (host, 2026-08-06: hotel
    // candidates have no url to key on — see extractHotelCandidates). Every
    // staging Set/React-key below used to read `c.url` directly, which
    // collapsed every hotel candidate in the SAME paste onto one shared key
    // ('' === ''): ticking one hotel's checkbox ticked or unticked all of
    // them. `_k` falls back to url when there is one (unchanged behavior for
    // Airbnb/Vrbo) and to a per-paste index otherwise.
    // ALWAYS index-prefixed (2026-08-06, review board). The `c.url ||` form
    // above still collided whenever two candidates in one paste shared a url —
    // the same '' === '' failure this key was invented to end, just needing two
    // identical hrefs instead of two empty ones. The index makes it unique by
    // construction. Nothing compares `_k` to a url: it is Set membership and a
    // React key, and nothing else (see 490, 536, 571-577).
    let cands = (found.candidates || []).filter(Boolean)
      .map((c, i) => ({ ...c, _k: `k${i}-${c.url || c.name || ''}` }));

    // ── PARITY WITH THE LIVE INTAKE (2026-08-03) ───────────────────────────
    // The live sheet's readPage does four things this did not, and each one is
    // the difference between a list you trust and a pile:
    //   · DEDUP against what is already on the shortlist, by url without query
    //     — the same house copied twice is one house.
    //   · RANK by fit against the event, so the ones that sleep the group come
    //     first instead of arriving in page order.
    //   · say WHAT WAS DROPPED, because silently discarding duplicates reads
    //     as the paste half-failing.
    //   · advise per DEVICE on failure — the live code carries a board finding
    //     that telling a host on a phone to press ⌘A was "the single documented
    //     abandonment point in the feature".
    // ── A URL-LESS ROW IS NOT EVERY OTHER URL-LESS ROW (2026-08-06) ─────────
    // Six seats of the review board arrived at this line independently, and two
    // reproduced it. `known` was built from EVERY stored option including the
    // url-less ones, so it contained ''. Hotel candidates are url-less by
    // design (extractHotelCandidates refuses Google's /aclk ad redirects), so
    // every one of them matched '' and was dropped as a duplicate. The host
    // read "All 9 of those are already on your list." about nine hotels she had
    // never seen — a confident, specific, FALSE claim, on the second paste,
    // exactly when she was starting to trust the surface.
    //
    // One typed or hand-added option was enough to poison every hotel paste
    // that followed, so this was never hotels-only.
    //
    // Dedup is a URL question. A candidate with no url cannot be answered by it
    // and must not be silently discarded by it — it goes to staging, where the
    // host can see it and untick it herself.
    const known = new Set(
      (event.lodgingOptions || [])
        .map((o) => String((o && o.url) || '').split('?')[0])
        .filter(Boolean),
    );
    const fresh = cands.filter((c) => {
      if (!c) return false;
      const u = String(c.url || '').split('?')[0];
      return u ? !known.has(u) : true;
    });
    const dupes = cands.length - fresh.length;
    try { const r = rankCandidates(fresh, event, { budget: Number(event.totalBudget || 0) || 0 });
      cands = (r && r.ranked && r.ranked.length) ? r.ranked : fresh; } catch { cands = fresh; }
    if (!cands.length && dupes > 0) {
      setReadErr(dupes === 1 ? 'That one is already on your list.' : `All ${dupes} of those are already on your list.`);
      return;
    }

    // ── A SINGLE LISTING URL IS A SUPPORTED PASTE, AND WAS HALF-HANDLED ─────
    // The instruction says "one link, or the whole results page", and one link
    // DOES parse — but it comes back linksOnly, with name, price and bedrooms
    // all empty, because a bare URL carries no facts. The extractor's own
    // docstring says the caller "must say so rather than presenting nameless
    // rows as a read"; this file was adding the blank row and saying nothing.
    //
    // Two honest outcomes now. If the unfurl backend is reachable, ONE link is
    // read server-side and comes back with its name and price filled. If it is
    // not, the link is still kept — losing it would be worse — and the surface
    // states exactly which parts are missing and who has to supply them.
    // ── AND MORE THAN ONE LINK IS STILL LINKS THE HOST CHOSE (2026-09-29) ──
    // Host: "do a paste of airbnb properties that DO fit the requirements."
    // Five real Santa Fe listings, every one of them sleeping 10-16 against a
    // party of 10, pasted together — and the screen said "7 places, 0 known to
    // fit". The listings were right. `cands.length === 1` was the gate: paste
    // two or more and NOTHING was read, so `sleeps` never arrived, and `sleeps`
    // is the field `fits` is computed from. The one number the comparison is
    // blocked on was reachable and never fetched.
    //
    // The restraint that produced that gate is real and is kept: a SEARCH page
    // is not crawled, and the searchOffer path below still asks first. But a
    // list of listing URLs is not a crawl — it is N reads the host explicitly
    // asked for by pasting them, and reading five is the same act as reading
    // one, five times. Capped at 8, the cap the older shell intake has always
    // used for exactly this.
    //
    // ── AND IT RUNS ON A RESULTS PAGE TOO (host, 2026-09-29) ──────────────
    // "pull from a path that will give us what we need ... combine the best of
    // both." Each paste path was giving half the record and neither half is
    // the one the surface needs:
    //
    //   results page HTML  names + a DATED price off the cards, never `sleeps`
    //   listing URLs       `sleeps`, amenities, rating, photo, never a price
    //
    // So a results paste could not compute `fits` (no sleeps) and a link paste
    // could not compute per-head (no total to divide). The gate was
    // `found.linksOnly`, which is exactly "only when the paste told us
    // nothing" — the one case where the two could never be combined.
    //
    // THE MERGE RULE IS ONE LINE: the unfurl FILLS GAPS and never overwrites
    // something the paste already read. The card's price is dated and the
    // host saw it on the page they copied; the listing's own record is where
    // sleeps lives. Neither read is silently replaced by the other.
    const UNFURL_MAX = 8;
    if (cands.length <= UNFURL_MAX && isUnfurlConfigured()) {
      setReadErr('');
      setBusy(true);
      try {
        const read = [];
        let anyTitle = false;
        let lastReason = '';
        for (const c of cands) {
          let r = null;
          // One bad link must not cost the host the other four.
          try { r = await unfurlListing(c.url); } catch { r = null; }
          if (!r || !r.ok) {
            if (r && r.reason) lastReason = r.reason;
            read.push(c);
            continue;
          }
          // ── THE UNFURL'S ANSWER WAS BEING THROWN ON THE FLOOR ────────────
          // Driven 2026-08-04. Three breaks stacked in one line: it read
          // `r.photo` (the endpoint returns `image`), it wrote `photo` (photoList
          // reads `photos`/`photoUrl`), and it ignored `facts` entirely. So a
          // picture could not arrive from an unfurl under ANY conditions, which
          // is why every read row still said "no picture yet".
          const facts = (r.facts && typeof r.facts === 'object') ? r.facts : {};
          // The unfurl's own image goes through the same question as a pasted
          // card's: safe to load is not the same as depicts the house.
          const shotRaw = String(r.image || '').trim();
          const shot = isListingPhoto(shotRaw) ? shotRaw : '';
          // GAPS ONLY. Every line reads "what the paste already had, else what
          // the listing says" — the reverse of what this block did when it
          // only ever ran on a paste that had nothing to protect.
          read.push({
            ...c,
            name: c.name || r.title,
            priceShown: c.priceShown != null ? c.priceShown : r.price,
            photo: c.photo || shot,
            // A COUNT OF BEDS, never mapped to `sleeps`: how many people a
            // place holds is not something a bed count settles.
            beds: c.beds != null ? c.beds : facts.beds,
            bedrooms: c.bedrooms != null ? c.bedrooms : facts.bedrooms,
            // ── THE FIELD THE COMPARISON WAS BLOCKED ON (2026-08-04) ──────
            // `sleeps` decides `fits`, and therefore "3 of 5 fit", the ranking
            // and the per-person split. A results card never carries it — D6/W3b
            // says so in its own copy — so it has always been a number the host
            // had to type. The LISTING page carries it, in the structured record
            // the unfurl reads. This is that number, not an inference from beds
            // or bedrooms.
            sleeps: c.sleeps != null ? c.sleeps : r.sleeps,
            rating: c.rating != null ? c.rating : r.rating,
            ratingCount: c.ratingCount != null ? c.ratingCount : r.ratingCount,
            // The listing's OWN amenity words. Every must-have row read "—"
            // without them, even where the page said yes (host, 2026-08-06).
            amenities: (Array.isArray(c.amenities) && c.amenities.length)
              ? c.amenities
              : (Array.isArray(r.amenities) && r.amenities.length ? r.amenities : c.amenities),
          });
          // WHICH SIDE ANSWERED (2026-09-29). Both sources are reads, so both
          // rendered as "read from the page you pasted" — and after the merge
          // that sentence was false for every field the LISTING supplied. On a
          // surface whose promise is per-field provenance, crediting the wrong
          // read is the same defect as crediting no read.
          //
          // Recorded here because this is the only place that knows: at commit
          // a filled field looks identical whichever side filled it.
          read[read.length - 1]._lookedUp = [
            !c.name && r.title ? 'label' : null,
            c.sleeps == null && r.sleeps != null ? 'sleeps' : null,
            c.beds == null && facts.beds != null ? 'beds' : null,
            c.bedrooms == null && facts.bedrooms != null ? 'bedrooms' : null,
            c.priceShown == null && r.price != null ? 'price' : null,
            !c.photo && shot ? 'photoUrl' : null,
            (!Array.isArray(c.amenities) || !c.amenities.length)
              && Array.isArray(r.amenities) && r.amenities.length ? 'amenities' : null,
            c.rating == null && r.rating != null ? 'rating' : null,
          ].filter(Boolean);
          if (r.title) anyTitle = true;
        }
        cands = read;
        // A results paste was never linksOnly; a link paste stops being one the
        // moment a title arrives.
        found = { ...found, linksOnly: found.linksOnly && !anyTitle };
        // Only when NOTHING came back — a reason shown beside four filled rows
        // would read as a failure the host can see is not one.
        if (lastReason && !anyTitle) setReadErr(lastReason);
      } catch { /* fall through to the honest keep-it path */ }
      // FINALLY, not a trailing line. The spinner is the host's only signal that
      // the app is still theirs; any path that leaves it spinning has taken the
      // surface away from them. unfurlListing bounds itself, but this makes
      // stranding impossible rather than merely unlikely.
      finally { setBusy(false); }
    }
    if (!cands.length) {
      // NAME WHAT THEY ACTUALLY PASTED. The generic "nothing readable" was
      // aimed at junk, and the commonest paste here is the search link this
      // app just handed them — which carries no listing facts at all, because
      // the platform renders those in the browser. Say that, and say the step.
      const door = looksLikeSearchUrl(src);
      // ── A SEARCH LINK IS NOT A DEAD END ANY MORE (2026-08-04) ───────────
      // It used to be: "that's the search link, not a house", and the host was
      // sent back to do the work by hand. The page DOES carry its listing ids,
      // so we can offer to read them. Offered, never automatic — this is one
      // fetch of one page the host is already looking at, and only the places
      // they KEEP are ever read individually. That line is what keeps this an
      // offer rather than a crawler.
      if (door && isUnfurlConfigured()) {
        setSearchOffer({ url: src, door });
        setReadErr('');
        return;
      }
      const touch = typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(pointer:coarse)').matches;
      // HONEST COPY, NOT A SILENT DEAD END (host, 2026-08-05: "honest copy").
      // door (from looksLikeSearchUrl) only catches a BARE search link with no
      // whitespace — a real "select all, copy" of the whole results page is a
      // different shape, checked separately.
      //
      // ── TWO SENTENCES CORRECTED 2026-08-06 (review board) ─────────────────
      // The line here used to read "Hotels can't be read back the way Airbnb
      // and Vrbo can yet — open the hotel's own booking page and add what it
      // says by hand below." Three seats flagged it. It was true when written
      // on 2026-08-05 and false the next morning: extractHotelCandidates
      // shipped, and a hotels results page IS read (name, price, rating, star
      // class, amenities, photo). It also pointed at an "add by hand below"
      // control that has never existed anywhere in this file. So the surface
      // was talking the host out of a feature it has, and sending her to a
      // form that isn't there.
      const detailPage = looksLikeHotelDetailPage(src);
      const hotelsPage = looksLikeHotelsResultsPage(src);
      setReadErr(door
        ? `That’s the ${DOOR_SHORT[door] || 'search'} search link, not a house. Open it, then copy one place from the results and bring that back.`
        : detailPage
          ? 'That’s one hotel’s page — go back to the list of hotels and copy that instead. It reads every hotel on it at once.'
          : hotelsPage
            ? 'I couldn’t find any hotels on that page — copy the whole list (⌘A then ⌘C) and paste it again.'
            : touch
              ? 'That didn’t have a link I could read — tap Share, then Copy Link, and try again.'
              : 'Nothing I could read on that — copy the listing page itself (⌘A then ⌘C) and paste it here.');
      return;
    }
    setReadErr('');
    // ── SEVERAL HOUSES IS A REAL CHOICE; ONE IS NOT ────────────────────────
    // The live sheet's rule, and it is the right one: "a results page with many
    // candidates still asks — that IS a real choice about which houses to keep",
    // while a single link means she already chose and a confirm just makes her
    // "tap twice more to agree with herself" (board, 2026-07-28).
    // So: many -> stage for review; one -> commit, after the unfurl fill above
    // has had its chance to make the row worth having.
    if (cands.length > 1) {
      setStaged({ cands, dupes, pick: new Set(cands.map((c) => c._k)), linksOnly: !!found.linksOnly });
      setText('');
      setReadErr('');
      return;
    }

    const before = event.lodgingOptions || [];
    const next = cands.map((c, i) => normalizeLodgingOption({
      id: 'lodge-' + Math.random().toString(36).slice(2, 8),
      // Airbnb's type+place pattern rather than "Option 1" — the paste has to
      // visibly produce something, or the host has no reason to believe it worked.
      url: c.url, label: lodgingTitleFor(c), beds: c.beds, sleeps: c.sleeps, amenities: c.amenities,
      // A hotel card's number is a NIGHTLY rate; an Airbnb/Vrbo card's is the
      // stay total. `priceBasis` says which, set by the extractor that read it
      // (see extractHotelCandidates). Storing a nightly rate as a stay total
      // made the per-person split divide one room-night across the whole party.
      ...(c.priceBasis === 'night'
        // A hotel card's rate buys ONE ROOM. `rateBasis` carries that through
        // so nothing downstream multiplies it into a whole-party stay total.
        ? { pricePerNight: c.priceShown, rateBasis: 'room' }
        : { totalPrice: c.priceShown }),
      photoUrl: c.photo, notes: notesFor(c),
      status: 'option',
      // Provenance is captured HERE or not at all — reconstructing it later
      // would be a guess, and lodgingProvenance deliberately reports an
      // unrecorded source as unknown rather than crediting either side.
      // 'read' means the page the host pasted; 'looked-up' means the listing's
      // own record, fetched because they pasted its link. Both are reads and
      // neither is a guess — but they are different pages, and the card now
      // names which one, per field.
      sources: sourcesFor(c),
      // The first number the host ever recorded, kept so the price can say
      // "was $X when you saved it" — our own history, never a market claim.
      ...(c.priceShown != null ? { priceFirstSeen: c.priceShown } : null),
    }, before.length + i));
    patch({ lodgingOptions: [...before, ...next] });
    setText('');
    // The link is kept either way; what is MISSING is named, never implied.
    const drop = dupes ? ` ${dupes} were already on your list.` : '';
    if (found.linksOnly) {
      setReadErr((next.length === 1
        ? 'Got the link — but a bare link carries no name, price or bed count, so those are yours to add.'
        : `Got ${next.length} links — a bare link carries no name or price, so those are yours to add.`) + drop);
    } else {
      setReadErr(next.length === 1
        ? `Added ${next[0].label || 'it'}.${drop}`
        : `Added ${next.length}.${drop}`);
    }
  };
  // ONE STAMPER FOR BOTH COMMIT PATHS. `add()` and `commitStaged()` each held
  // their own copy of this object; two copies of one rule is how the next
  // field gets its provenance recorded in one path and not the other.
  const sourcesFor = (c) => {
    const up = new Set(Array.isArray(c._lookedUp) ? c._lookedUp : []);
    const via = (k) => (up.has(k) ? 'looked-up' : 'read');
    return {
      ...(lodgingTitleIsReal(c) ? { label: via('label') } : null),
      ...(c.beds != null ? { beds: via('beds') } : null),
      ...(c.sleeps != null ? { sleeps: via('sleeps') } : null),
      ...(Array.isArray(c.amenities) && c.amenities.length ? { amenities: via('amenities') } : null),
      ...(c.priceShown != null
        ? (c.priceBasis === 'night' ? { pricePerNight: via('price') } : { totalPrice: via('price') })
        : null),
      ...(c.photo ? { photoUrl: via('photoUrl') } : null),
      // `notes` is ASSEMBLED from several fields, so it is looked-up only when
      // every part that is actually present came from the listing. `place` and
      // `starClass` only ever come off a pasted card, so either one present
      // settles it as 'read'.
      //
      // The first cut of this tested `c.bedrooms == null`, which was wrong the
      // moment the unfurl started supplying bedrooms: a links-only paste —
      // where every part genuinely IS looked-up — still recorded 'read'.
      // Caught by running the links-only case, not by reading the condition.
      ...(c.bedrooms || c.place || c.starClass || c.rating != null || (Array.isArray(c.amenities) && c.amenities.length)
        ? {
          notes: (!c.place && !c.starClass
            && (c.bedrooms == null || up.has('bedrooms'))
            && (c.rating == null || up.has('rating'))
            && (!Array.isArray(c.amenities) || !c.amenities.length || up.has('amenities')))
            ? 'looked-up' : 'read',
        }
        : null),
    };
  };

  // Commit only what is still ticked. Untick is the whole point of the review.
  const commitStaged = () => {
    const keep = staged.cands.filter((c) => staged.pick.has(c._k));
    if (!keep.length) { setStaged(null); return; }
    const before = event.lodgingOptions || [];
    const next = keep.map((c, i) => normalizeLodgingOption({
      id: 'lodge-' + Math.random().toString(36).slice(2, 8),
      url: c.url, label: lodgingTitleFor(c), beds: c.beds, sleeps: c.sleeps, amenities: c.amenities,
      // A hotel card's number is a NIGHTLY rate; an Airbnb/Vrbo card's is the
      // stay total. `priceBasis` says which, set by the extractor that read it
      // (see extractHotelCandidates). Storing a nightly rate as a stay total
      // made the per-person split divide one room-night across the whole party.
      ...(c.priceBasis === 'night'
        // A hotel card's rate buys ONE ROOM. `rateBasis` carries that through
        // so nothing downstream multiplies it into a whole-party stay total.
        ? { pricePerNight: c.priceShown, rateBasis: 'room' }
        : { totalPrice: c.priceShown }),
      photoUrl: c.photo, notes: notesFor(c),
      status: 'option',
      // Provenance is captured HERE or not at all — reconstructing it later
      // would be a guess, and lodgingProvenance deliberately reports an
      // unrecorded source as unknown rather than crediting either side.
      // 'read' means the page the host pasted; 'looked-up' means the listing's
      // own record, fetched because they pasted its link. Both are reads and
      // neither is a guess — but they are different pages, and the card now
      // names which one, per field.
      sources: sourcesFor(c),
      // The first number the host ever recorded, kept so the price can say
      // "was $X when you saved it" — our own history, never a market claim.
      ...(c.priceShown != null ? { priceFirstSeen: c.priceShown } : null),
    }, before.length + i));
    patch({ lodgingOptions: [...before, ...next] });
    setStaged(null);
    setReadErr(`Added ${next.length}.`);
  };

  if (staged) return (
    <Panel label="FROM THE PAGE YOU PASTED">
      <p className="lc-body">
        {staged.cands.length} found. Untick anything you were not really considering.
      </p>
      {staged.cands.map((c) => {
        const on = staged.pick.has(c._k);
        return (
          <button key={c._k} className="lc-staged" aria-pressed={on}
            aria-label={`${lodgingTitleFor(c) || 'Unnamed place'} — ${on ? 'keeping' : 'not keeping'}`}
            onClick={() => setStaged((st) => {
              const pick = new Set(st.pick);
              if (pick.has(c._k)) pick.delete(c._k); else pick.add(c._k);
              return { ...st, pick };
            })}>
            <span className={'lc-tick' + (on ? ' is-on' : '')} aria-hidden="true" />
            <span className="lc-staged-main">
              <span className="lc-staged-name">{lodgingTitleFor(c) || 'Unnamed place'}</span>
              <span className="lc-staged-sub">
                {/* A hotel card carries star class, rating and amenity tags
                    instead of bedrooms — extractHotelCandidates reads them
                    off the real Google card (host, 2026-08-06). */}
                {[c.starClass ? `${c.starClass}-star` : null,
                  c.bedrooms ? `${c.bedrooms} bedrooms` : null,
                  c.priceShown != null ? `$${Math.round(c.priceShown).toLocaleString()}` : null,
                  c.rating != null ? `${c.rating}/5${c.ratingCount ? ` (${c.ratingCount})` : ''}` : null,
                  Array.isArray(c.amenities) && c.amenities.length ? c.amenities.join(', ') : null]
                  .filter(Boolean).join(' · ') || 'no details on the card'}
              </span>
            </span>
            {/* sleeps is never on a results card — say so rather than leave a
                blank the host reads as "it does not sleep anyone". A hotel
                candidate (identified by carrying a rating) isn't measured in
                "sleeps N" the way a shared rental is, so this stays quiet
                for those instead of showing a confusing dash. */}
            {c.rating == null && <span className="lc-staged-fit">sleeps —</span>}
          </button>
        );
      })}
      {/* LINKS ARE NOT DETAILS. A prose paste (or a plain list of URLs) yields
          the links and nothing else, so every row reads "Airbnb listing" with
          no name or price. That is honest, but silent about WHY — and the host
          is one action away from the real thing. Device-aware, same as the
          failure path: ⌘A is not a key on a phone. */}
      {staged.linksOnly && (
        <p className="lc-note lc-warn">
          I got the links but not the details — that paste carried no names or prices.
          {typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer:coarse)').matches
            ? ' Open a listing and use Share → Copy Link for one with its facts.'
            : ' Copy the results page itself (⌘A then ⌘C) and the names, beds and prices come with it.'}
        </p>
      )}
      {/* ONLY WHEN IT IS STILL TRUE (2026-09-29). This line was unconditional,
          which was fine while a multi-link paste was never read: every row
          genuinely had no `sleeps` and the host genuinely had to type it. Now
          that every pasted link is unfurled, `sleeps` usually arrives — and an
          unconditional line tells the host to go and type a number the app
          fetched a second ago, sitting directly above rows that already show
          it. Advice that is wrong on the screen it appears on costs more than
          advice that is missing. */}
      {staged.cands.some((c) => c.sleeps == null) && (
        <p className="lc-note">
          “sleeps —” because the results page never carries it. Type it once and the fit count works.
        </p>
      )}
      {staged.dupes ? (
        <p className="lc-note">{staged.dupes} were already on your list.</p>
      ) : null}
      <div className="lc-ctas lc-ctas-wrap">
        <button className="cta" onClick={commitStaged}>Add {staged.pick.size} to the shortlist</button>
        <button className="cta soft" onClick={() => setStaged(null)}>Cancel</button>
      </div>
    </Panel>
  );

  return (
    <>
      <Panel label="THREE DOORS">
        <div className="lc-ctas lc-doors">
          {/* THREE ON ONE LINE. "Search Airbnb / Open Vrbo / Search hotels" cannot
              fit 361pt at a legible size — the third fell past the mask. The
              heading above already says these are doors and the ↗ says they
              leave, so the verb was doing the same job twice; the platform name
              is the part that distinguishes them. The full label rides on
              aria-label and title, so nothing is lost to a screen reader or a
              hover. Shortened HERE only — the live sheet's copy is untouched. */}
          {links.map((l) => (
            <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className="cta soft lc-door"
              aria-label={`${l.label} — opens in a new tab`} title={l.label}
              onClick={() => setWentLooking(true)}>{shortDoor(l)} <span aria-hidden="true">↗</span></a>
          ))}
        </div>
        {/* THIS LINE NEVER GOT THE 2026-08-05 CORRECTION the live sheet got, so
            the two surfaces disagreed: HostShellV2 said hotels open on the town
            alone, and this one — under the same three doors — said all three
            arrive pre-filled. It also rendered links[0].applied, which is
            AIRBNB'S list, putting its budget and must-have filters into a
            sentence covering doors that never took them. Both halves are fixed
            here from the same source the live sheet uses. */}
        {links[0] && (
          <p className="lc-note">
            {links.every((l) => l.carriesDates) ? 'These open' : 'Airbnb and Vrbo open'} with your own answers already in it — {appliedByEveryDoor(links).join(' · ')}.
          </p>
        )}
        {links.some((l) => l.id === 'hotels' && !l.carriesDates) && (
          <p className="lc-note">Hotels open at the town only — set the dates and guests once you’re there.</p>
        )}
        {!links.length && <p className="lc-note">No doors yet — the town is missing.</p>}
        {/* ── WHAT THE REGION ASKS, BEFORE THEY GO LOOKING ──────────────────
            Lodging board 2026-09-27, finding #2, and Don Norman's dissent in
            the same sitting: the board barred the published rungs from firing
            a budget warning, and he would not accept that NOTHING replaced
            it — "silence is also a claim", and a host planning in a region
            they cannot afford should not find out by walking into it.
            This is what replaces it, and it is deliberately here rather than
            in the budget: the question a regional band can honestly answer is
            "what will the rooms cost", which on a destination event is mostly
            a question about what GUESTS will pay. The lodging form models a
            room block — a rate, a code, a deadline — that guests book
            themselves, so this is their number more often than the host's.

            THE SENTENCE IS THE ENGINE'S, verbatim. It already says "asking
            prices, not what anyone paid, and BEFORE cleaning and service
            fees", which is the qualifier the board required. Writing a second
            copy here is how a test and a screen drift apart — the exact
            finding from the ice board hours earlier.

            NOTHING IS CONVERTED. A place-night is not a room-night is not a
            stay, and no rung is multiplied by nights to look like another. */}
        {!regionBand && noBandTown && (
          <p className="lc-note lc-noband">
            No regional figure for {noBandTown} — Inside Airbnb doesn’t publish
            one for here, so the doors above are the first real prices you’ll see.
          </p>
        )}
        {regionBand && (
          <div className="lc-band">
            <p className="lc-body">
              Whole places around here were asking ${regionBand.low}–${regionBand.high} a night.
            </p>
            {/* THE SHORT FORM. The full sentence ran five lines of grey on a
                390px phone, under a headline that already said the range and
                the city — the densest block on a stage built for one thing at
                a time. It still says what a host cannot infer (asking, before
                fees, when) and what the licence requires (Inside Airbnb,
                CC BY 4.0). Written in the engine, not here. */}
            <p className="lc-note">{regionBand.basisShort || regionBand.basis}</p>
          </div>
        )}
      </Panel>
      <Panel label={wentLooking ? 'NOW BRING ONE BACK' : 'BRING ONE BACK'}>
        {/* Offered, never applied on its own: the host still decides that the
            thing on their clipboard is the thing they meant. */}
        {offer && (
          <div className="lc-offer">
            <p className="lc-body">Looks like you copied a link.</p>
            <button className="cta" onClick={() => { setText(offer); add(offer); setOffer(''); }}>Read it</button>
            <button className="cta soft" onClick={() => setOffer('')}>Not that</button>
          </div>
        )}
        {searchOffer && (
          <div className="lc-offer">
            <p className="lc-body">
              That’s the {DOOR_SHORT[searchOffer.door] || 'search'} search, not one house.
              I can read the places on it — you’ll get the links, not names or prices,
              because a results page doesn’t carry those.
            </p>
            <button className="cta" onClick={async () => {
              setBusy(true);
              setReadErr('');
              try {
                const r = await lodgingResults(searchOffer.url);
                if (r && r.ok && Array.isArray(r.links) && r.links.length) {
                  const cands = r.links.map((u, i) => ({ url: u, name: '', kind: '', place: '', bedrooms: null, beds: null, priceShown: null, _k: u || `k${i}` }));
                  setSearchOffer(null);
                  setText('');
                  setStaged({ cands, dupes: [], pick: new Set(cands.map((c) => c._k)), linksOnly: true });
                } else {
                  setReadErr((r && r.reason) || 'Nothing readable on that search.');
                }
              } finally { setBusy(false); }
            }}>{busy ? 'Reading the search…' : 'Pull the places in'}</button>
            <button className="cta soft" onClick={() => {
              setSearchOffer(null);
              setReadErr(`Open it, then copy one place from the results and bring that back.`);
            }}>No, I’ll pick one</button>
          </div>
        )}
        {/* AUTO-READ ON PASTE. The host has already done the work of copying;
            making them press a second button to "read" it is a step that exists
            only because the code wanted one. The paste event fires the
            extraction directly, so the act is: copy, paste, done. The button
            stays for a typed/dragged value and for keyboards that bypass the
            paste event. */}
        {/* TWO ROWS, NOT FOUR. Nothing is typed here — the host PASTES, and a
            paste needs a target, not a page. 116px of empty field was the
            second-largest block on the stage. */}
        <textarea className="lc-field lc-area" rows={2} value={text}
          onChange={(e) => { setText(e.target.value); if (readErr) setReadErr(''); }}
          onPaste={(e) => {
            const pasted = (e.clipboardData && e.clipboardData.getData('text')) || '';
            if (!pasted.trim()) return;
            e.preventDefault();
            setText(pasted);
            add(pasted);
          }}
          placeholder="…or paste it here" aria-label="Paste a listing link or a results page"
          autoCapitalize="off" autoCorrect="off" spellCheck="false" />
        {/* TRUTHFUL ABOUT WHICH PATH TOUCHES A SERVER. This read "every card on
            it is read, with no server call" — true of a pasted PAGE, which is
            parsed here, and false of a bare LINK, which we fetch. One sentence
            covering both made the honest half carry the dishonest half.
            TRUTHFUL ABOUT WHICH DOOR (host, 2026-08-05: "honest copy") — this
            also read as a blanket promise across all three doors, but only
            Airbnb and Vrbo have a card reader; Hotels doesn't yet, and the
            error message that fires for it says so on its own. */}
        {/* THREE LINES FOR ONE IDEA (host, 2026-09-27). ~50pt of explanation
            under a box that is now 71. The privacy fact is the one a host
            cannot infer and is worth keeping; "a bare link has to be fetched,
            so it takes a moment" describes a delay they will simply
            experience, and the reader already says so when it happens. */}
        <p className="lc-note">
          A whole results page works — every card is read right here, and nothing
          leaves your phone.
        </p>
        {readErr && <p className={'lc-note' + (/^(Added|Got)/.test(readErr) ? '' : ' lc-warn')}>{readErr}</p>}
        {/* ONE BUTTON, TWO JOBS. Paste and read were two buttons side by side,
            which asked the host to work out which of them was theirs. They are
            the same act at two moments, so the label follows the box: empty and
            it fetches from the clipboard (a gesture is required, so it stays a
            button rather than a read behind their back); full and it reads what
            is there. Pasting into the box still fires the extraction on its own,
            so this is the fallback for typed or dragged text. */}
        <button className="cta" onClick={async () => {
          if (text.trim()) { add(); return; }
          try {
            const t = await navigator.clipboard.readText();
            if (!t || !t.trim()) { setReadErr('Nothing copied yet — copy a link first.'); return; }
            setText(t); add(t);
          } catch { setReadErr('I couldn’t read the clipboard — paste into the box instead.'); }
        }}>{busy ? 'Reading…' : (text.trim() ? 'Read what I pasted' : 'Paste what I copied')}</button>
      </Panel>
      <AlreadySorted event={event} patch={patch} />
    </>
  );
}

// ─── THE FRONT DOOR FOR A ROOM BLOCK (2026-08-06, event-industry seat) ──────
// Her P0, and she was right: three of the four `dest_lodging` answers are room
// BLOCKS, and every room-block field on this surface sat behind a shortlist
// pick. A host who phoned the hotel, negotiated twelve rooms and got a code —
// the actual workflow — could not enter one character of it. Her only route was
// to paste a results page, find the hotel she had ALREADY BOOKED, and "pick" it,
// which is both absurd and a lie about what happened.
//
// This writes the one field the stage machine reads as a real booking:
// `hotelName` with `from` set to something other than the pick, which is
// precisely what lodgingIsHeld tests. That moves the stage to `booked` and
// everything the block needs — code, cutoff, backups, who to call, the roster,
// the guest note — is there. No new stage, no parallel intake: the same door
// the confirmation-typing host was always supposed to have.
function AlreadySorted({ event, patch }) {
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  if (String(stay.hotelName || '').trim()) return null;   // already sorted
  const n = Number(rate);
  // The rate is only a GROUP rate when the rooms are actually held — the guest
  // note reads `from` to decide exactly that.
  const save = (from) => patch({
    lodging: {
      ...stay, hotelName: name.trim(), from,
      ...(Number.isFinite(n) && n > 0 ? { rate: Math.round(n) } : null),
    },
  });
  return (
    <FoldPanel label="ALREADY SORTED IT YOURSELF?">
      {/* ── ASK, DO NOT ASSUME (2026-08-06, 3rd sitting) ──────────────────────
          The first cut of this panel invited BOTH "booked a block on the phone"
          and "know where everyone's staying" — then stamped every answer
          `typed off the confirmation`. So a host who had merely decided where
          she wanted everyone got "The stay is on the books" in the largest type
          on screen, lodging marked done on the command board, and a note
          telling her guests "We've lined up rooms at X."
          That is the same defect this board already killed twice: choosing is
          not booking, a listing price is not a group rate, and INTENDING IS NOT
          BOOKING. This one was the worst of the three because it asserted a
          provenance the host was never asked about. So it asks. */}
      <p className="lc-note">
        Already know where everyone’s staying? Put it here and skip the shopping.
      </p>
      <div className="lc-row-form">
        <input className="lc-field" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Hotel or place" aria-label="Where everyone is staying" />
        <input className="lc-field" value={rate} onChange={(e) => setRate(e.target.value)}
          placeholder="$ a night" inputMode="decimal" aria-label="Nightly rate you were quoted" />
      </div>
      <div className="lc-ctas lc-ctas-wrap">
        <button className="cta" disabled={!name.trim()}
          onClick={() => save(STAY_FROM_CONFIRMATION)}>The rooms are held</button>
        <button className="cta soft" disabled={!name.trim()}
          onClick={() => save(STAY_FROM_PLAN)}>That’s the plan, not booked</button>
      </div>
      <p className="lc-note">
        Only “held” counts as booked — it is what the rest of the plan reads when it says lodging is sorted.
      </p>
    </FoldPanel>
  );
}

// ── THE PICTURE, FINALLY ON SCREEN ─────────────────────────────────────────
// The unfurl has been returning `image` all along and the row had nowhere to
// put it — so a place the app could see stayed a line of text (driven
// 2026-08-04). A remote image can 404 or be blocked; when it does this removes
// itself rather than leaving a broken frame, which puts the row back in the
// honest "no picture yet" state instead of a grey box pretending to be a house.
function Thumb({ src, label, big }) {
  const [dead, setDead] = useState(false);
  if (!String(src || '').trim() || dead) return null;
  return (
    <img className={big ? 'lc-card-photo' : 'lc-thumb'} src={src} alt={`${label || 'The place'} — the listing's own photo`}
      loading="lazy" decoding="async" onError={() => setDead(true)} />
  );
}

// ── ONE STAY, SHOWN LIKE IT MATTERS (host, 2026-08-05: "The Stay section is
//    underwhelming for the choices, wrapping, no image. This is where we are
//    all staying for our beautiful trip.") ──────────────────────────────────
// The Choices deck already renders a place's own photo hero-sized the moment
// it's a candidate — the exact photo then went missing the moment a host
// actually chose it. Not a rendering gap: stayFromPick() only ever wrote
// hotelName/rate/url/from, so the photo was never carried past the pick. Now
// that it is (lodgingIntel.js stayFromPick), Picked and Booked both get the
// SAME hero — a photo, a scrim, the name and facts overlaid — instead of a
// label/value row that wraps a long listing name into two narrow columns.
// Honest when there is no photo (typed-in bookings, off-confirmation): a
// plain identity block, same as the deck's own no-photo cards.
function StayHero({ photoUrl, label, sub }) {
  const name = String(label || '').trim() || 'Your stay';
  if (!photoUrl) {
    return (
      <div className="lc-stayhero-flat">
        <p className="lc-strong">{name}</p>
        {sub && <p className="lc-card-sub lc-stayhero-flat-sub">{sub}</p>}
      </div>
    );
  }
  return (
    <div className="lc-card-photo-wrap lc-stayhero">
      <Thumb src={photoUrl} label={name} big />
      <div className="lc-card-scrim" aria-hidden="true" />
      <div className="lc-card-overlay">
        <h3 className="lc-card-name">{name}</h3>
        {sub && <p className="lc-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── D6 · W9 · SWIPE THE ONES THAT FIT (983:136) ────────────────────────────
// The board's choice screen, built. Host, 2026-08-03: "we need to be able to
// swipe between the choices" — it was ruled, drawn, and never wired.
//
// One card per place, scroll-snapped so a thumb-flick moves one card and the
// next one peeks at the edge. No JS drag handler: native overflow scrolling is
// the real gesture on a phone, keeps momentum and rubber-banding, and works
// with a trackpad and a keyboard for free.
//
// EVERY LINE IS SOURCED. The design shows a type chip and "18 min away"; we
// hold neither — `kind` never survives the normalizer and no option carries a
// drive time — so they are simply absent rather than invented. What we do hold
// is rendered: the photo, the price, the nights it covers, the host's own
// must-have count, the amenity chips those musts produce, and the per-field
// provenance table, which is the point of the screen.
function Choices({ opts, event, intel, scores, recPick, basis, onPick, onGone, onPhoto }) {
  const [at, setAt] = useState(0);
  const unordered = opts.filter((o) => o.status !== 'gone');
  // ── THE BEST ONE FIRST (host, 2026-09-29: "default to most recommended
  // based on needs for the event") ────────────────────────────────────────
  // The deck opened on whichever place happened to be added first, so the
  // card a host saw — and on a phone, often the only card they saw — was an
  // accident of paste order. The ranking that answers "which of these suits
  // this event" already existed one component up and was used only to print a
  // sentence BELOW the deck, under the fold.
  //
  // `scores` arrives already ranked (lodgingRecommendation sorts eligible
  // first, then by score), so this is that order, not a second opinion. A
  // place the ranking never saw keeps its position at the end rather than
  // being dropped. On a TIE the engine returns no pick and this still orders
  // by score — which is honest, because the order is real even when the
  // winner is not.
  const live = (() => {
    if (!Array.isArray(scores) || !scores.length) return unordered;
    const rank = new Map(scores.map((x, i) => [x.id, i]));
    return [...unordered].sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER)
      - (rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER));
  })();
  // ONE PLACE GETS THE BIG CARD TOO (host, 2026-09-29: "big photo deck for
  // all"). This was `< 2`, so a host who brought back a single listing got the
  // compact row and never saw the photo, the scrim, the per-head line or the
  // provenance table — the whole point of the screen — until they added a
  // second. The first place is the one they are most likely to be looking at.
  //
  // The threshold is gone rather than lowered: "is there anything to show" is
  // the rule, and it cannot drift from the parent's `deckShown`, which now
  // asks the same question. Two copies of a NUMBER drift; two copies of
  // "any" cannot.
  if (!live.length) return null;
  const nights = intel && intel.nights ? intel.nights : 0;
  const money = (n) => (n == null ? null : `$${Math.round(n).toLocaleString()}`);

  // Plural only when it is plural — one place is "the one", and the deck now
  // renders for one. A label reading "the ones" over a single card is a small
  // lie of exactly the kind this surface exists not to tell.
  return (
    <Panel label={live.length === 1 ? 'THE ONE YOU BROUGHT BACK' : 'THE ONES THAT FIT'}>
      <p className="lc-deck-head">
        <span className="lc-deck-name">{live[at] ? live[at].label : ''}</span>
        <span className="lc-deck-count">{at + 1} of {live.length}</span>
      </p>
      <div className="lc-deck" onScroll={(e) => {
        const el = e.currentTarget;
        const i = Math.round(el.scrollLeft / (el.scrollWidth / live.length));
        if (i !== at && i >= 0 && i < live.length) setAt(i);
      }}>
        {live.map((o) => {
          const sc = (scores || []).find((x) => x.id === o.id) || null;
          const hist = (() => { try { return lodgingPriceHistory(o); } catch { return null; } })();
          const pv = (() => { try { return lodgingProvenance(o); } catch { return null; } })();
          const total = o.allIn != null ? o.allIn : o.totalPrice;
          // The GROUP's number, not the host's. Null whenever it cannot be
          // divided honestly — no total, or no headcount.
          const perHead = (() => { try { return perHeadOf(total, event); } catch (_) { return null; } })();
          // A per-room rate has no honest stay total (see the allIn block in
          // lodgingIntel — a party of ten needs rooms we have not been told
          // about). Suppressing the total must not also hide the one number we
          // DO know: show the rate, and say what it buys. "More honest but less
          // useful" was the Grandmother seat's explicit warning about this fix.
          const perRoomRate = (total == null && o.rateBasis === 'room' && o.pricePerNight != null)
            ? `${money(o.pricePerNight)} a night · one room` : null;
          return (
            <article className="lc-card" key={o.id}>
              {/* FLOAT ON THE PHOTO, NOT STACKED BELOW IT (host, 2026-08-05:
                  "innovative way to pull the CTAs into the viewport... they're
                  spilling out"). Moving the buttons up under the price line
                  helped but didn't fix it — the photo alone is
                  clamp(240px,44vh,440px), so on a short phone the buttons
                  still landed past the fold. Stacking adds height; overlaying
                  doesn't. Same pattern Airbnb's own card and every swipe-deck
                  UI (Tinder, Hinge) use: the hero image IS the card's frame,
                  and the name/price/act ride a gradient scrim anchored to its
                  bottom edge — inside the hero's own bounds, never below it.
                  The scrim is a real gradient, not a filled bar, so the photo
                  underneath still reads as the primary surface (one hero, one
                  accent — the "Pick" button is the one accent this card
                  spends). Secondary detail (musts fit, price history, chips,
                  the read/typed table) stays in normal flow below, for a host
                  who scrolls further; nothing here is missing, only ordered
                  by whether picking needs it FIRST. */}
              {(() => {
                const identityCaption = (
                  <>
                    {/* ── THE GROUP'S NUMBER LEADS (host, 2026-09-29: "per head
                        is a major thrust and needs more prominent attention") ──
                        This card led with the stay TOTAL and put per-head third,
                        below the musts line, in page-tokened grey. But the total
                        answers the host's question and the per-head answers the
                        one they are about to be asked by nine other people —
                        which is the moment this whole surface is built for.

                        A SWAP, NOT AN ADDITION. UX_01: one loud thing, and "if a
                        viewport shows two elements styled as page titles, one of
                        them is wrong." So per-head takes the lead slot and the
                        total steps down into the sub line — it is not lost, it
                        is ranked. With no price to divide there is no per-head,
                        and the total leads exactly as it used to. */}
                    <div className="lc-card-top">
                      <h3 className="lc-card-name">{o.label}</h3>
                      {perHead
                        ? (
                          <span className="lc-card-price lc-card-lead-each">
                            {money(perHead.each)}<span className="lc-lead-each-unit"> each</span>
                          </span>
                        )
                        : money(total)
                          ? <span className="lc-card-price">{money(total)}</span>
                          : perRoomRate ? <span className="lc-card-price lc-card-price-room">{perRoomRate}</span> : null}
                    </div>
                    {/* ── FITMENT READS AS A STATE, NOT AS RUNNING TEXT (host,
                        2026-09-29: "the fitment should be prominent as well") ──
                        "Fits 2 of your 3 musts" was one clause in a grey
                        sentence beside the nights, which is where a reader's eye
                        goes last. Whether a house holds the group is the FIRST
                        question this screen answers, and it is a STATE.
                        UX_02: a state gets a semantic colour and a label saying
                        why, never colour alone — so the chip carries the
                        engine's own reason ("sleeps 14, 4 spare" / "sleeps 5 of
                        your 10"), not a bare tick.
                        It does not become a second loud NUMBER: per-head keeps
                        the one lead slot, and this is ranked by colour.

                        DEVIATION, STATED: UX_02 specifies a 12-15% tint as the
                        chip's container. That assumes a page surface. These sit
                        on a photograph, where a 12% wash of anything is whatever
                        the photo underneath happens to be — so the container is
                        a dark pill and the status colour carries in the TEXT.
                        Same semantics, a ground that actually exists. */}
                    {(() => {
                      // FIT IS NOT A COMPARISON (found by driving it, 2026-09-29).
                      // This first read the chip off `sc`, the RANKING score —
                      // which only exists once there are places to rank. So the
                      // host's very first place, the one the deck now shows,
                      // had no fit state at all: `chips: 0` on a card whose
                      // whole job is to answer "does this hold my group".
                      // Whether one house sleeps ten is a fact about that house
                      // and this event, and needs nothing else on the shortlist.
                      const heads = perHead ? perHead.heads : (Number(event.guestCount) || 0);
                      const unknown = o.sleeps == null;
                      const fitsNow = !unknown && heads > 0 ? o.sleeps >= heads : null;
                      const state = unknown || fitsNow == null ? 'unknown' : (fitsNow ? 'yes' : 'no');
                      // The engine's own sentence when there IS a ranking; the
                      // same sentence built from the same two numbers when
                      // there is not. Never a third phrasing.
                      const spare = (!unknown && heads > 0) ? o.sleeps - heads : null;
                      const why = (sc && Array.isArray(sc.reasons)
                        ? sc.reasons.find((r) => /^sleeps/i.test(r)) : null)
                        || (unknown ? 'sleeps not known yet'
                          : heads > 0
                            ? (spare < 0 ? `sleeps ${o.sleeps} of your ${heads}`
                              : spare === 0 ? `sleeps exactly your ${heads}`
                                : `sleeps ${o.sleeps}, ${spare} spare`)
                            : `sleeps ${o.sleeps}`);
                      if (!why && !(sc && sc.mustsTotal)) return null;
                      return (
                        <p className="lc-card-fit">
                          {why && (
                            <span className={`lc-fitchip lc-fit-${state}`}>
                              {why.charAt(0).toUpperCase() + why.slice(1)}
                            </span>
                          )}
                          {sc && sc.mustsTotal ? (
                            <span className={`lc-fitchip ${sc.mustsMet === sc.mustsTotal ? 'lc-fit-yes' : 'lc-fit-part'}`}>
                              {sc.mustsMet} of {sc.mustsTotal} musts
                            </span>
                          ) : null}
                          {/* Says WHY it leads, so the order is a proposal the
                              host can disagree with rather than a mystery
                              ranking. Absent on a tie: the engine returns no
                              pick there, and a badge would invent one. */}
                          {recPick && recPick.id === o.id ? (
                            <span className="lc-fitchip lc-fit-pick">Best match for this event</span>
                          ) : null}
                        </p>
                      );
                    })()}
                  </>
                );
                // ── THE CAPTION RIDES ON A SOLID BAR (host, 2026-09-29: "B") ──
                // The overlay is back, on the host's call, but not the way it
                // was. The old one put every line straight onto the photograph
                // behind a gradient — measured 1.0-2.2:1 against the real
                // pixels, because a listing photo decides what is behind the
                // text and no fixed colour survives that.
                // A SOLID bar does survive it: the ground is opaque, so the
                // same tokens that work on the card work here, and the number
                // is checkable rather than hoped for. The gradient is what
                // failed, not the idea of a caption.
                // Only the caption rides up — name, the per-head lead, the fit
                // chips. The rest stays on the card, because a bar deep enough
                // to hold all of it would be a card with a photo behind it
                // rather than a photo with a caption.
                const identityRest = (
                  <>
                    <p className="lc-card-sub">
                      {[perHead && money(total) ? `${money(total)} in total` : null,
                        nights ? `for ${nights} night${nights === 1 ? '' : 's'}` : null]
                        .filter(Boolean).join(' · ')}
                    </p>
                    {/* ── WHAT IT IS EACH (host, 2026-09-28) ─────────────────
                        "per head to pass to group", and this is the moment
                        worth passing: a host comparing places is about to tell
                        people what it costs them. A total answers the host's
                        question; a per-person answers the group's.

                        Host-aware on purpose. perHeadOf divides by headsFor,
                        which knows whether the host said they are IN the
                        number — $4,200 is $263 across sixteen and $247 across
                        seventeen. Until somebody asks, the line says so rather
                        than picking one; that hedge is the whole reason the
                        reader exists, and dropping it here would put a settled
                        number on an unanswered question. */}
                    {/* The hedge stays WELDED to the number it qualifies. Moving
                        the figure up without this would leave a settled-looking
                        headline over an unanswered question — the exact thing
                        perHeadOf refuses to do when it declines to pick a
                        denominator. */}
                    {perHead && (
                      <p className="lc-card-each">
                        {`across ${perHead.heads}`}
                        {perHead.stated ? '' : ' — nobody said if you’re in that number'}
                      </p>
                    )}
                    <div className="lc-ctas lc-ctas-wrap" style={{ margin: '10px 0 0' }}>
                      <button className="cta" aria-label={`Pick ${o.label}`} onClick={() => onPick(o.id)}>Pick this place</button>
                      {String(o.url || '').trim() && (
                        <a className="cta soft" href={o.url} target="_blank" rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}>Open the listing ↗</a>
                      )}
                      <button className="cta soft" aria-label={`${o.label} is gone`} onClick={() => onGone(o.id)}>It’s gone</button>
                    </div>
                    {/* SAY IT, LIKE THE MISSING PHOTO ALREADY DOES (2026-08-06,
                        Grandmother seat, overriding two design stars). Twelve
                        lines below, a place with no photo says "no picture yet
                        — this one's still real". A place with no LINK rendered
                        nothing at all: the button was simply absent, with the
                        neighbouring row's button still there. UX_08:179 bans
                        exactly this ("hide the field entirely — user doesn't
                        know it exists"), and the seat reported the consequence
                        precisely: "I think I did it wrong" → she re-does the
                        whole copy for nothing → the identical result → and now
                        she distrusts the rows that DID work. The self-blame is
                        the damage; one sentence removes it and tells her this
                        is how hotels come back, not a failure she caused. */}
                    {!String(o.url || '').trim() && (
                      <p className="lc-note" style={{ margin: '6px 0 0' }}>
                        No link — Google’s hotel cards point at its advertisers, not the hotel. This one’s still real.
                      </p>
                    )}
                  </>
                );
                return o.photoUrl ? (
                  <>
                  {/* ── THE PHOTO IS INSET; THE COPY IS NOT ON IT (host,
                      2026-09-29: "make sure the copy ... is not transparent
                      too", then "do the images of the properties and inset") ──
                      Every line of this card used to sit on the photograph
                      behind a gradient scrim. Measured against the REAL pixels
                      — screenshot with the text, screenshot with it hidden,
                      same box — the worst-case contrast ran 1.0 to 2.2:1
                      against a 4.5 floor. Every one of them. A listing photo
                      has bright regions wherever it likes, so no fixed text
                      colour can be safe on it; the scrim only made the failure
                      look deliberate.
                      Contrast tuning cannot fix this — the ground is a
                      photograph. So the photo becomes an inset element and the
                      copy moves onto the card's own opaque surface, where a
                      token means what it says. */}
                  {/* ── THE PICTURE IS A DOOR (host, 2026-09-30: "click on image
                      should take host to listing") ──────────────────────────
                      Tapping a property photo to open the property is what
                      every listing app on the phone does, and this one made
                      the host find the text link underneath instead. The
                      "Open the listing" CTA stays — this is the same act, on
                      the affordance a thumb reaches for first.
                      Only when there IS a url: a hotel candidate has none
                      (extractHotelCandidates refuses Google's ad redirects),
                      and a picture that looks tappable and is not is worse
                      than one that never offered. */}
                  <div className="lc-card-shot">
                    {o.url ? (
                      <a className="lc-shot-link" href={o.url} target="_blank" rel="noopener noreferrer"
                        aria-label={`Open ${o.label || 'this listing'} on the listing site`}>
                        <Thumb src={o.photoUrl} label={o.label} big />
                      </a>
                    ) : <Thumb src={o.photoUrl} label={o.label} big />}
                    <div className="lc-card-caption">{identityCaption}</div>
                  </div>
                  <div className="lc-card-facts">{identityRest}</div>
                  </>
                ) : (
                  <>
                    {/* UX_08: missing data says "missing," never nothing — a
                        fabricated stock photo is not an option. The overlay
                        pattern only works ON a photo; with none, "+ Add a
                        picture" IS the hero act, and name/price/pick stay in
                        normal flow below it rather than fighting the same
                        space. */}
                    <button type="button" className="lc-card-nophoto" onClick={() => onPhoto(o)}
                      aria-label={`Add a picture for ${o.label}`}>
                      <span className="lc-card-nophoto-add">+ Add a picture</span>
                      <span className="lc-card-nophoto-sub">no picture yet — this one's still real</span>
                    </button>
                    <div className="lc-card-body lc-card-identity-noPhoto">{identityCaption}{identityRest}</div>
                  </>
                );
              })()}
              <div className="lc-card-body">
                {hist && <p className="lc-card-was">{hist.full}</p>}
                {sc && sc.met && sc.met.length > 0 && (
                  <div className="lc-chips">
                    {sc.met.slice(0, 3).map((m) => <span className="lc-chip" key={m}>{m}</span>)}
                  </div>
                )}
                {/* THE TABLE THAT WAS ALREADY COMPUTED. lodgingProvenance has
                    returned per-field rows since it shipped and the cockpit
                    rendered only the two counts — "4 read from the page" — so
                    the host could see HOW MANY facts came off the page but
                    never WHICH. This is that row set, unchanged. */}
                {/* SOURCED ROWS ONLY. Listing every field with "not recorded"
                    put three lines of noise in a seven-line table and buried
                    the four that carry information — the board's card shows
                    only rows with a real source. The unknowns are not hidden:
                    they are counted in one line underneath, which is what a
                    host can actually act on. */}
                {(() => {
                  const known = pv ? pv.rows.filter((r) => r.source === 'read' || r.source === 'typed') : [];
                  const unknown = pv ? pv.rows.length - known.length : 0;
                  if (!known.length && !unknown) return null;
                  return (
                    <>
                      <p className="lc-card-eyebrow">WHAT WE READ · WHAT YOU TYPED</p>
                      {known.map((r) => (
                        <div className="lc-pv" key={r.field}>
                          <span className="lc-pv-label">
                            {r.label}
                            {/* THE VALUE, which these rows never showed. The
                                card said "Total · read from the page you
                                pasted" and never the total — a citation with
                                no quote. Formatted in lodgingIntel so the
                                shell cannot drift from it. */}
                            {r.value ? <span className="lc-pv-val">{r.value}</span> : null}
                          </span>
                          <span className="lc-pv-src">
                            {/* "read from the link" sat two inches under "No link"
                                on the same hotel card — the card denying its own
                                link and citing it three times. The value really
                                was read; it was read off the PAGE she pasted, not
                                from a per-place link. Say that, and the card stops
                                contradicting itself. */}
                            {r.source === 'read' ? 'read from the page you pasted'
                              : r.source === 'looked-up' ? 'read from the listing itself'
                                : 'you typed it'}
                          </span>
                        </div>
                      ))}
                      {unknown > 0 && (
                        <p className="lc-card-was">
                          {unknown} other field{unknown === 1 ? '' : 's'} with no source recorded.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </article>
          );
        })}
      </div>
      <div className="lc-dots" aria-hidden="true">
        {live.map((o, i) => <span key={o.id} className={'lc-dot' + (i === at ? ' is-on' : '')} />)}
      </div>
      {/* Pick / open / gone now live INSIDE each card (2026-08-05) — a shared
          row here duplicated them a second time, this time detached from
          whichever card was actually snapped to. The "no picture yet" area
          is the add-a-picture act, same pattern. */}
      {/* The board footer states this as a rule, so the surface states it too. */}
      <p className="lc-note">Ranked by fit, then price. No countdowns, no deal badges — the only price claim here is your own.</p>
      {/* HotelTonight's "Why these hotels?": the curation explains itself ON
          DEMAND rather than preaching up front. It moved here with the chooser
          — it explains THIS order, and the list it used to sit under is now
          only the places that are gone. Every line states what rankCandidates
          actually did. */}
      {basis && (
        <details className="lc-why">
          <summary className="lc-why-sum">Why this order?</summary>
          <ul className="lc-why-list">
            {basis.lines.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <p className="lc-note">{basis.caveat}</p>
        </details>
      )}
    </Panel>
  );
}

function Weighing({ event, intel, patch }) {
  // ── THE SHORTLIST COULD NOT GROW (driven 2026-08-04) ─────────────────────
  // One component renders per stage, which is right — one moment at a time.
  // But the doors and the paste box live in <Looking>, and the moment a first
  // place exists the stage is 'weighing', so the ONLY route to a second place
  // disappeared. The screen said "add a second and this fills in" with nothing
  // to press, the transpose could never fill, and the W9 card deck could never
  // have two cards to swipe between.
  //
  // The same <Looking> is reused rather than a second intake built beside it:
  // identical component, identical render, so the two can never drift.
  const [adding, setAdding] = useState(false);
  // One prompt, two callers (the deck's card and the list row) — the duplicate
  // handler is exactly how the two would drift apart.
  const askPhoto = (o) => {
    const url = window.prompt('Paste the photo link for ' + o.label);
    const clean = String(url || '').trim();
    if (!/^https:\/\//i.test(clean)) return;
    patch({ lodgingOptions: (event.lodgingOptions || []).map((x) => (x && x.id === o.id
      ? { ...x, photoUrl: clean, sources: { ...(x.sources || {}), photoUrl: 'typed' } }
      : x)) });
  };
  // ONE definition of who is in the chooser, read by the deck and by the list
  // below it — two copies of this filter is precisely how they would disagree.
  const liveCount = (event.lodgingOptions || []).filter((o) => o && o.status !== 'gone').length;
  // Must ask the SAME question as Choices' own guard above — this is what
  // turns the list below from "make the call" (every option) into "no longer
  // on the table" (only the ones struck out). If the two disagree, the same
  // place renders twice: once as a card and once as a row.
  const deckShown = liveCount > 0;
  const basis = (() => { try { return lodgingRankBasis(event, intel); } catch { return null; } })();
  let cmp = null; try { cmp = lodgingCompare(event, intel); } catch { cmp = null; }
  const kc = (() => { try { return kitchenConsequence(event); } catch { return null; } })();
  const rec = (() => { try { return lodgingRecommendation(event, intel); } catch { return null; } })();
  const opts = (intel && intel.options) || [];

  // THE OUTLET (board ruling 2026-07-28): a pick writes the stay in the SAME
  // patch, so travelPlan reads it and hostSpending counts it. A pick that
  // touches nothing is a toast that lies.
  const pick = (id) => {
    const next = (event.lodgingOptions || []).map((o) =>
      ({ ...o, status: o && o.id === id ? 'chosen' : (o && o.status === 'chosen' ? 'option' : (o && o.status) || 'option') }));
    let stay = null;
    try { stay = stayFromPick({ ...event, lodgingOptions: next }); } catch { stay = null; }
    patch({ lodgingOptions: next, ...(stay ? { lodging: { ...(event.lodging || {}), ...stay } } : null) });
  };

  // "Report a Problem sits at the same level as Mark As Complete… reporting a
  // problem does not force the job to end" (Blink addendum). A house gets taken,
  // a rate lapses, a host is outbid — until now the only moves were forward, and
  // a surface that offers only resolve-or-ignore trains hosts to mark things done
  // that are not done. `gone` keeps the place and remembers whether it was the
  // pick, so the fall-through can be its own state rather than a silent revert.
  const markGone = (id) => {
    const next = (event.lodgingOptions || []).map((o) => (o && o.id === id
      ? { ...o, status: 'gone', wasChosen: o.status === 'chosen' }
      : o));
    const stay = next.some((o) => o && o.status === 'gone' && o.wasChosen)
      ? { lodging: { ...(event.lodging || {}), hotelName: '' } } : null;
    patch({ lodgingOptions: next, ...(stay || null) });
  };
  const trouble = (() => { try { return lodgingTrouble(event, intel); } catch { return null; } })();

  return (
    <>
      {trouble && <Panel label="WHAT WENT WRONG">
        <p className="lc-strong">{trouble.headline}</p>
        <p className="lc-body">{trouble.detail}</p>
      </Panel>}
      {/* ── THE DECK COMES FIRST (host, 2026-08-05: "layout has to capture
             swipe the ones that fit in the viewport. Copy is too dense
             above") — UX_03 rule 4: the primary CTA visible without
             scrolling. The deck IS the primary act on this stage (make the
             pick); the kitchen-consequence explainer and the side-by-side
             detail table are secondary reads that used to sit above it,
             pushing the one thing a host actually does off the first
             screen. They still exist, just after, not before. */}
      <Choices opts={opts} event={event} intel={intel}
        scores={rec && rec.scores ? rec.scores : null}
        recPick={rec && !rec.tie ? rec.pick : null} onPick={pick} onGone={markGone}
        onPhoto={askPhoto} basis={basis} />
      {/* THE PANEL THAT NEVER RENDERED (found 2026-08-05, single-threaded
          re-test of the review-board pass — "which is the recommended?").
          lodgingRecommendation() returns {pick, why, unweighed, scores, tie}
          — it has never had a `.line` field, so `rec.line` was always
          undefined and this whole panel was dead on every event, forever.
          Built here from the real fields instead: the pick's own name plus
          its strongest reason (why[0], the same reasons the deck's cards
          already show per-option — nothing new invented), a tie said
          honestly rather than an arbitrary winner, and `unweighed` surfaced
          as what the recommendation could NOT account for — this is the
          direct answer to "do the options fit our guest size?": if sleeps
          was never known, unweighed says so instead of the pick silently
          skipping the guest-fit question. */}
      {rec && (rec.tie ? (
        <Panel label="WHAT THE PLAN WOULD PICK">
          <p className="lc-body">Too close to call — your top places are tied on what you told us matters. This one's yours to make.</p>
        </Panel>
      ) : rec.pick && (
        <Panel label="WHAT THE PLAN WOULD PICK">
          <p className="lc-body">{rec.pick.label}</p>
          {/* ── IT SAYS WHY, ALL OF IT (host, 2026-09-29: "plan should tell
              why its recommended in what the plan would pick") ────────────
              This printed rec.why[0] and stopped — one clause out of a list
              the engine had already built. The ranking weighs the gate, the
              money, the cancellation terms, the host's own must-haves, step-
              free access and kids; a host reading a single clause cannot tell
              whether the pick won on price or on fit, and cannot disagree
              with a reason they were never shown.

              THE AGAINSTS STAY IN. reasons carries "doesn't mention step-free
              access" and "$400 over your budget" alongside the wins, and
              those are the lines that make this a recommendation rather than
              an advertisement — a pick whose drawbacks are hidden is the kind
              of claim this surface exists not to make. */}
          {Array.isArray(rec.why) && rec.why.length > 0 && (
            <ul className="lc-pickwhy">
              {rec.why.map((r) => (
                <li key={r} className={/doesn’t|doesn't|over your budget|total loss|of your/.test(r) ? 'lc-pickwhy-against' : undefined}>
                  {r}
                </li>
              ))}
            </ul>
          )}
          {rec.unweighed && rec.unweighed.length > 0 && (
            <p className="lc-note">Couldn't weigh {rec.unweighed.join(' or ')} — none of your places say.</p>
          )}
        </Panel>
      ))}
      {/* ── THE ANSWER, WHERE IT CAME FROM, AND A WAY TO CHANGE IT ──────────
          Two defects found by driving this on 2026-08-04:

          · The headline spoke an INFERENCE ("There is a kitchen", read off an
            Airbnb URL) in the same voice as a fact the host typed. It now says
            what it was taken from.
          · `kc.answers` had no render site at all, so the untold state put
            "Nobody has told us yet" on screen and offered nothing — a question
            naming an act without offering it, the same fault as every CTA we
            have rewritten this week.

          Both states now end in something the host can press. */}
      {kc && <Panel label="THE KITCHEN DECIDES THE FOOD PLAN">
        <p className="lc-strong">{kc.headline}</p>
        <p className="lc-body">{kc.detail}</p>
        {kc.basis && <p className="lc-note">{kc.basis}</p>}
        {kc.answers && kc.answers.length > 0 && (
          <div className="lc-ctas lc-ctas-wrap">
            {kc.answers.map((a) => (
              <button key={a.id} className="cta soft"
                onClick={() => patch(settleChoicePatch(event, 'dest_lodging', a.pick, 'host'))}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </Panel>}
      {cmp ? <Transpose cmp={cmp} /> : <Panel label="SIDE BY SIDE">
        {/* The sentence and the act that answers it, in one place. This panel
            named the need and a second panel repeated it — one moment, one
            ask. */}
        <p className="lc-note">One option is not a comparison — add a second and this fills in.</p>
        {!adding && (
          <button className="cta soft" onClick={() => setAdding(true)}>Add another place</button>
        )}
      </Panel>}
      {adding && <Panel label="ADD ANOTHER PLACE">
        <Looking event={event} patch={patch} />
      </Panel>}
      {/* With a comparison already on screen the ask is quieter — the host is
          weighing, not short of options — but it must still be reachable. */}
      {!adding && cmp && (
        <button className="cta soft" onClick={() => setAdding(true)}>Add another place</button>
      )}
      {/* ── ONE CHOOSER, NOT TWO (host, 2026-08-04: "the make the call section
             on the bottom of screen I believe will be redundant") ──────────
          It was. The deck above already carries every LIVE place — including
          ones with no picture, which get a placeholder card — with the same
          three acts. This list repeated all of it.

          So when the deck is showing, this keeps only what the deck cannot:
          places that are gone. They must stay visible — a lost place is work
          the host did and losing it silently would be worse — but they are not
          a choice, so they do not belong in the chooser.

          With fewer than two live places there is no deck, and this is the
          full list again. */}
      {(deckShown ? opts.filter((o) => o.status === 'gone') : opts).length > 0 && (
      <Panel label={deckShown ? 'NO LONGER ON THE TABLE' : 'MAKE THE CALL'}>
        {(deckShown ? opts.filter((o) => o.status === 'gone') : opts).map((o) => {
          const isGone = o.status === 'gone';
          // Is there anything to weigh this against? The thumbnail rule exists
          // to stop a host comparing houses they cannot see — its own copy says
          // "weigh it against the others". With no others there is no
          // comparison to protect, and holding the row back only dead-ends the
          // plan (see the thin branch below).
          const others = opts.filter((x) => x && x.id !== o.id && x.status !== 'gone').length;
          // ── A PLACE IS NOT A PLACE WITHOUT A PICTURE (host, 2026-08-04:
          //    "don't have the app reference properties without a thumbnail") ──
          // A row that is only a name asks the host to choose between houses
          // they cannot see, which is not a choice — and it is exactly the row
          // a thin paste produces. The place is NOT deleted and NOT hidden:
          // that would lose work the host did. It is held out of the chooser
          // and shown as what it actually is — a place still missing its
          // picture — with the one act that fixes it.
          const noPhoto = !String(o.photoUrl || '').trim() && !(Array.isArray(o.photos) && o.photos.length);
          // ── ...BUT A PICTURE GATES THE COMPARISON, NOT THE COMMITMENT ──────
          // Driving this on 2026-08-04, host: "where's the pick" / "I don't see
          // the listing". A bare link is the commonest paste on this surface and
          // it produced a row with no pick, no dismiss and no way to open the
          // place — the workflow simply stopped, and lodgingStage could never
          // reach 'picked'. Held out of the CHOOSER while there is something to
          // choose between; on its own it stays a full row.
          if (noPhoto && !isGone && others > 0) {
            return (
              <div key={o.id} className="lc-opt is-thin">
                <span className="lc-opt-main">
                  <span className="lc-opt-name">{o.label}</span>
                  {/* Held out of the chooser, but what we DO know about it
                      still shows: a price that moved is real information about
                      a place the host saved, and hiding it would punish them
                      twice for a thin paste. */}
                  <span className="lc-opt-sub">
                    {[(() => { try { const h = lodgingPriceHistory(o); return h ? h.full : null; } catch { return null; } })(),
                      'no picture yet — paste the listing’s photo link to weigh it against the others']
                      .filter(Boolean).join(' · ')}
                  </span>
                </span>
                {/* THE PLACE ITSELF. The host pasted a link and the row never
                    offered it back — "I don't see the listing" was literal.
                    This is also the route to the picture the row is asking for. */}
                {String(o.url || '').trim() && (
                  <a className="cta soft" href={o.url} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }} aria-label={`Open ${o.label}`}>Open it ↗</a>
                )}
                <button className="cta soft" onClick={() => {
                  const url = window.prompt('Paste the photo link for ' + o.label);
                  const clean = String(url || '').trim();
                  if (!/^https:\/\//i.test(clean)) return;
                  patch({ lodgingOptions: (event.lodgingOptions || []).map((x) => (x && x.id === o.id
                    ? { ...x, photoUrl: clean, sources: { ...(x.sources || {}), photoUrl: 'typed' } }
                    : x)) });
                }} aria-label={`Add a picture for ${o.label}`}>Add a picture</button>
              </div>
            );
          }
          return (
            <div key={o.id} className={'lc-opt' + (isGone ? ' is-gone' : '')}>
              <Thumb src={o.photoUrl} label={o.label} />
              <span className="lc-opt-main">
                <span className="lc-opt-name">{o.label}</span>
                {(() => {
                  const h = (() => { try { return lodgingPriceHistory(o); } catch { return null; } })();
                  const pv = (() => { try { return lodgingProvenance(o); } catch { return null; } })();
                  const bits = [
                    h ? h.full : null,
                    // Letting the row be pickable must not make it quiet about
                    // what is missing. A place with no picture says so wherever
                    // it appears — the rule was never "hide the gap".
                    noPhoto ? 'no picture yet' : null,
                    // WHY the row is bare, when the reason is the build and not
                    // the link. Without this the demo profile's unfilled row is
                    // indistinguishable from a paste that failed — which is
                    // exactly how it was reported.
                    unfurlOffNote(isUnfurlConfigured()),
                    // "our unfurl parses, normalises and infers, and says
                    // nothing" — it says something now.
                    pv && pv.read ? `${pv.read} read from the page` : null,
                    pv && pv.typed ? `${pv.typed} you typed` : null,
                  ].filter(Boolean);
                  return bits.length ? <span className="lc-opt-sub">{bits.join(' · ')}</span> : null;
                })()}
              </span>
              {isGone
                ? <span className="lc-note" style={{ margin: 0 }}>no longer available</span>
                : (
                  <span className="lc-opt-acts">
                    {String(o.url || '').trim() && (
                      <a className="cta soft" href={o.url} target="_blank" rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }} aria-label={`Open ${o.label}`}>Open it ↗</a>
                    )}
                    {noPhoto && (
                      <button className="cta soft" onClick={() => {
                        const url = window.prompt('Paste the photo link for ' + o.label);
                        const clean = String(url || '').trim();
                        if (!/^https:\/\//i.test(clean)) return;
                        patch({ lodgingOptions: (event.lodgingOptions || []).map((x) => (x && x.id === o.id
                          ? { ...x, photoUrl: clean, sources: { ...(x.sources || {}), photoUrl: 'typed' } }
                          : x)) });
                      }} aria-label={`Add a picture for ${o.label}`}>Add a picture</button>
                    )}
                    {/* NAME THE OBJECT. With two houses on screen both buttons
                        read "Make it the pick" — a screen reader announces the
                        same phrase twice with no way to tell which house, and
                        the accessibility tree collapsed them to one. The visible
                        label stays short; the accessible name carries the house. */}
                    <button className="cta" aria-label={`Make ${o.label} the pick`}
                      onClick={() => pick(o.id)}>Make it the pick</button>
                    {/* PEER, not a fallback — same row, same weight class. */}
                    <button className="cta soft" aria-label={`${o.label} is gone`}
                      onClick={() => markGone(o.id)}>It’s gone</button>
                  </span>
                )}
            </div>
          );
        })}
        {!opts.length && <p className="lc-note">Nothing on the list yet.</p>}
      </Panel>
      )}
    </>
  );
}

function Picked({ event, intel, patch, focus }) {
  const chosen = (intel && intel.chosen) || null;
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  // `code` is canonical (travelPlan and the guest note read it); `bookingCode`
  // is what this panel used to write alone, so it seeds from either.
  const [code, setCode] = useState(stay.code || stay.bookingCode || '');
  const [rateEnds, setRateEnds] = useState(stay.deadline || '');
  if (!chosen) return <Panel label="THE PICK"><p className="lc-note">Nothing picked yet — this is what it will show once one is.</p></Panel>;
  const money = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? `$${Math.round(Number(n)).toLocaleString()}` : '—');
  const pickSub = [
    money(chosen.allIn != null ? chosen.allIn : chosen.totalPrice) !== '—' ? money(chosen.allIn != null ? chosen.allIn : chosen.totalPrice) : null,
    chosen.sleeps != null ? `sleeps ${chosen.sleeps}` : null,
    String(chosen.cancellationTier || '').trim() || null,
  ].filter(Boolean).join(' · ');
  return (
    <Panel label="THE PICK">
      <StayHero photoUrl={chosen.photoUrl} label={chosen.label} sub={pickSub} />
      {/* ── DO NOT SEND HER TO A DOOR WE JUST SAID ISN'T THERE ───────────────
          Grandmother seat, third sitting, on the worst moment in the flow: "I've
          done everything right, I've picked the place, I'm holding my phone, and
          the app points me at a thing it has already told me doesn't exist. That
          is the moment I decide the app doesn't know what's going on."
          A hotel row has no url BY DESIGN — Google's cards point at advertisers.
          So when there is nothing to open, the honest next step is the phone,
          and the app already holds the number if she typed one. */}
      <p className="lc-note">
        {String(chosen.url || '').trim()
          ? 'Choosing is not booking. Book on the platform, then bring the confirmation back.'
          : 'Choosing is not booking — and this one came back without a link, so it’s a phone call.'}
      </p>
      {/* NAME THE ACT, THEN OFFER IT. This screen told the host to book it on
          the platform and did not hand them the platform — while holding the
          very URL they pasted to get here. Same defect as every CTA rewritten
          this week; found by walking to this stage on 2026-08-04. */}
      {String(chosen.url || '').trim() && (
        <a className="cta" href={chosen.url} target="_blank" rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
          aria-label={`Open ${String(chosen.label || '').trim() || 'your pick'} to book it`}>
          Open it to book ↗
        </a>
      )}
      {/* No link — offer the call instead of a dead instruction. Uses the number
          the host already typed into WHO TO CALL; when there is none, the same
          labelled search that panel uses, never an invented number. */}
      {!String(chosen.url || '').trim() && (() => {
        const c = normalizeCvbContact(stay.contact);
        const town = String(venueFor(event).city || '').trim();
        const place = String(chosen.label || '').trim();
        if (c && c.telHref) {
          return (
            <a className="cta" href={c.telHref} style={{ textDecoration: 'none' }}
              aria-label={`Call ${c.name || place} on ${c.phone} to book`}>
              Call {c.name || place} — {c.phone}
            </a>
          );
        }
        return (
          <a className="cta soft" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}
            href={`https://www.google.com/search?q=${encodeURIComponent(`${town} ${place} group sales room block`.trim())}`}>
            Find their number ↗
          </a>
        );
      })()}
      {/* ── THE CODE WAS BEING WRITTEN WHERE NOTHING READS IT (2026-08-06) ───
          Found tracing the review board's room-block ruling. This panel wrote
          `lodging.bookingCode`. Every engine downstream reads `lodging.code`:
          travelPlan.js:326 builds the group-rate obligation from it, and
          draftLodgingNote (doItForMe.js:995-997) is the guest note itself —
          "give them the code X when you book". So a host typed her booking code
          into the live surface, saw it echoed back on the next screen, and the
          note that goes to the guests silently omitted it. The one deliverable
          of a group stay went out empty, and nothing anywhere said so.

          Writes `code` — the key the engines read — and keeps `bookingCode` in
          step so events saved before today, and the hero line below, keep
          working. lodgingIsHeld accepts either.

          GROUP RATE ENDS is the other half of the same wire. travelPlan reads
          `lodging.deadline` and raises a real dated obligation from it
          (HostShellV2.jsx:1534, "Group rate ends — N of M have no room yet"),
          and the guest note says "Book by DATE — after that the group rate goes
          away." No reachable field had written it since the old sheet went dark
          on 2026-08-05, so the deadline the app warns about had no face. This
          is the narrow port; the backups list and the who's-booked roster are
          still dark and are a larger job. */}
      <div className="lc-row-form">
        <input className="lc-field" placeholder="Booking code" value={code}
          onChange={(e) => setCode(e.target.value)} aria-label="Booking code" />
        <label className="lc-field-label" htmlFor="lc-rate-ends">Group rate ends</label>
        <input className="lc-field" id="lc-rate-ends" type="date" value={rateEnds}
          onChange={(e) => setRateEnds(e.target.value)}
          aria-label="Last day to book at the group rate"
          /* THE LANDING. Same idiom the shell uses at every focus row —
             scrollIntoView, block:'center', no focus() call. Focusing a date
             input pops the picker on some platforms, which is a modal dialog
             the host did not ask for; the ask here is "show me the field", not
             "start editing it". */
          ref={(el) => { if (el && focus === 'deadline') el.scrollIntoView({ block: 'center' }); }} />
        <button className="cta" disabled={!code.trim() && !rateEnds}
          onClick={() => patch({
            lodging: {
              ...stay,
              ...(code.trim() ? { code: code.trim(), bookingCode: code.trim() } : null),
              ...(rateEnds ? { deadline: rateEnds } : null),
            },
          })}>Save the stay details</button>
      </div>
    </Panel>
  );
}

function Booked({ event, patch, focus }) {
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const md = (event.moneyDates && typeof event.moneyDates === 'object') ? event.moneyDates : {};
  const setMd = (k) => (e) => patch({ moneyDates: { ...md, [k]: e.target.value } });
  return (
    <>
      <Panel label="ON THE BOOKS">
        <StayHero photoUrl={stay.photoUrl} label={stay.hotelName}
          sub={String(stay.code || stay.bookingCode || '').trim()
            ? `Booking code ${String(stay.code || stay.bookingCode).trim()}`
            : 'No booking code on file'} />
      </Panel>
      <Panel label="THE MONEY-SAFE DATES">
        <p className="lc-note">Copy these off the booking confirmation — they are the ones with a deadline.</p>
        {[['refundDeadline', 'Refund window closes'], ['installmentDue', 'Next payment due'],
          ['headcountDue', 'Final headcount due']].map(([k, label]) => (
          <div key={k} className="lc-date">
            <span className="lc-row-label">{label}</span>
            <input className="lc-field lc-field-sm" type="date" value={md[k] || ''} onChange={setMd(k)} aria-label={label} />
          </div>
        ))}
      </Panel>
      <StayContact event={event} patch={patch} />
      <Backups event={event} patch={patch} />
      <WhosBooked event={event} patch={patch} focus={focus} />
      <GuestNote event={event} />
    </>
  );
}

// ─── A NUMBER SHE CAN PRESS (2026-08-06, both override seats) ───────────────
// The event-industry seat's strongest practical point, twice: "a number I can
// press at 4pm on a Tuesday beats a homepage every single time." A group stay
// is not a consumer booking flow — a hotel will not put twenty people through a
// web form, it hands you to group sales. And the Grandmother seat, on the same
// gap: "I am going to CALL them. I was always going to call them."
//
// Host-typed, never harvested: nothing in this repo may invent a phone number,
// and the one page that carries one is refused for good reasons elsewhere. The
// rendering runs through normalizeCvbContact so a real `tel:` is built by the
// same code the bureau panel already trusts, rather than a second guess at what
// a dialable number looks like.
function StayContact({ event, patch }) {
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const saved = (stay.contact && typeof stay.contact === 'object') ? stay.contact : {};
  const [name, setName] = useState(saved.name || '');
  const [phone, setPhone] = useState(saved.phone || '');
  const c = normalizeCvbContact({ name, phone });
  const town = String(venueFor(event).city || '').trim();
  const hotel = String(stay.hotelName || '').trim();
  return (
    <Panel label="WHO TO CALL">
      <p className="lc-note">A block is a phone call, not a checkout. Keep the desk’s number where the dates are.</p>
      <div className="lc-row-form">
        <input className="lc-field" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Group sales contact" aria-label="Group sales contact name" />
        <input className="lc-field" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone" inputMode="tel" aria-label="Group sales phone number" />
        <button className="cta" disabled={!name.trim() && !phone.trim()}
          onClick={() => patch({ lodging: { ...stay, contact: { name: name.trim(), phone: phone.trim() } } })}>
          Save who to call
        </button>
      </div>
      {c && c.telHref && (
        <a className="cta soft" href={c.telHref} style={{ textDecoration: 'none' }}
          aria-label={`Call ${c.name || hotel || 'the hotel'} on ${c.phone}`}>
          Call {c.name || hotel || 'the hotel'} — {c.phone}
        </a>
      )}
      {!(c && c.telHref) && (hotel || town) && (
        // No number yet. A LABELLED search is truthful; a fabricated number is
        // not. Same shape cvbIntel already uses for the bureau.
        <a className="cta soft" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}
          href={`https://www.google.com/search?q=${encodeURIComponent(`${town} ${hotel} group sales room block`.trim())}`}>
          Find their group sales desk ↗
        </a>
      )}
    </Panel>
  );
}

// ─── THE NOTE HAD NO BUTTON (2026-08-06, event-industry seat) ───────────────
// `draftLodgingNote` is the deliverable of group lodging — the hotel, the rate,
// the code, the cutoff and the backups, written for the guests. Its only render
// site was inside the sheet this cockpit navigates away from, which the file
// itself calls unreachable. So the wiring repaired earlier today (the code
// reaching `lodging.code` rather than dying in `bookingCode`) still ended in a
// engine with no outlet: a host could enter everything correctly and have no
// way to send it.
//
// Offered, never sent — UX_07 Level 5. The host reads it and sends it herself.
// The same store the shell writes (HostShellV2 keeps `ngw-profile`), read
// here because the cockpit is its own page and shares no React state with it.
// Read at render rather than cached: a host who fills in their name in
// settings and comes back should not have to reload to be on their own note.
function readProfile() {
  try { return JSON.parse(localStorage.getItem('ngw-profile')) || null; } catch { return null; }
}

function GuestNote({ event }) {
  const [copied, setCopied] = useState('');
  let note = null;
  // HOST CARRIED TO ANYTHING OUTGOING (host, 2026-09-28). This is the one
  // thing on this surface that leaves the app — a host copies it into the
  // group chat — and it was going out unsigned while every other draft in
  // doItForMe already ended with the host's name.
  try { note = draftLodgingNote(event, readProfile()); } catch { note = null; }
  if (!note || !String(note.body || '').trim()) return null;
  return (
    <Panel label="WHAT THE GROUP GETS TOLD">
      <p className="lc-note">Everything above, written out. Read it, change what you want, then send it yourself.</p>
      <pre className="lc-draft">{note.body}</pre>
      <button className="cta" onClick={() => {
        try {
          navigator.clipboard.writeText(`${note.subject}\n\n${note.body}`);
          setCopied('Copied — paste it wherever your group talks.');
        } catch { setCopied('Select the text above and copy it.'); }
      }}>Copy the note</button>
      {copied && <p className="lc-note">{copied}</p>}
    </Panel>
  );
}

// ─── THE TWO HALVES THAT WENT DARK ON 2026-08-05 ────────────────────────────
// `goToLodgingCockpit` (HostShellV2.jsx:3176) navigates away before the old
// sheet can open — the file says so itself at :10233, "This sheet is unreachable
// now." Two things went with it, and the review board's event-industry seat
// ruled them the real wound: three of four `dest_lodging` options are ROOM
// BLOCKS, and a block is a rate, a code, a cutoff, backups, and the chase.
//
// The code and the cutoff came back in the same commit as this. These are the
// other two. Nothing here is new intelligence — `travelPlan` has computed the
// roster and `notBookedCount` the whole time, and `draftLodgingNote` has always
// written the backups into the guest note. They had no reachable intake, so
// they read empty and the engines had nothing to say.

function Backups({ event, patch }) {
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const saved = Array.isArray(stay.backupOptions) ? stay.backupOptions : [];
  // ── A DRAFT ROW HAS TO SURVIVE BEING TYPED IN (2026-08-06, board) ─────────
  // This filtered `!b.name.trim()` out on EVERY KEYSTROKE and then re-rendered
  // from the filtered result. So typing into the note of a not-yet-named row
  // deleted the row mid-keystroke — the field bounced back to its placeholder
  // and the text was gone. "Add another backup" was inert for the same reason:
  // it appended an empty row that its own filter dropped before paint.
  //
  // The engine's contract is right — travelPlan keeps only NAMED backups — so
  // the filter belongs on what is PERSISTED, never on what is rendered. The
  // draft lives here; only named rows reach the event.
  const [rows, setRows] = useState(() => (saved.length ? saved : [{ name: '', note: '' }]));
  const commit = (next) => {
    setRows(next);
    patch({ lodging: { ...stay, backupOptions: next.filter((b) => String(b.name || '').trim()) } });
  };
  const setAt = (i, key) => (e) => commit(rows.map((b, j) => (j === i ? { ...b, [key]: e.target.value } : b)));
  const shown = rows;
  // Only offer another row once the last one has a name — otherwise there is
  // already an empty row on screen and the button would add a second.
  const canAdd = shown.length > 0 && String(shown[shown.length - 1].name || '').trim();
  return (
    <Panel label="IF THE FIRST ONE FILLS">
      {/* travelPlan keeps `{name, note}` and drops any row with no name
          (travelPlan.js:328-331); draftLodgingNote reads them into the guest
          note. Same field names, so what is typed here is what those read. */}
      <p className="lc-note">Rooms sell out. A second place, named now, is what the group gets told instead of nothing.</p>
      {shown.map((b, i) => (
        <div key={i} className="lc-row-form">
          <input className="lc-field" value={b.name || ''} onChange={setAt(i, 'name')}
            placeholder={i === 0 ? 'Backup place' : 'One more option'}
            aria-label={`Backup place ${i + 1}`} />
          <input className="lc-field" value={b.note || ''} onChange={setAt(i, 'note')}
            placeholder="Farther? Cheaper?" aria-label={`What to know about backup ${i + 1}`} />
        </div>
      ))}
      {canAdd && (
        <button className="cta soft" onClick={() => setRows([...rows, { name: '', note: '' }])}>
          Add another backup
        </button>
      )}
    </Panel>
  );
}

function WhosBooked({ event, patch, focus }) {
  let plan = null;
  try { plan = buildTravelPlan(event); } catch { plan = null; }
  const lg = (plan && plan.relevant && plan.lodging) ? plan.lodging : null;
  const roster = (lg && Array.isArray(lg.roster)) ? lg.roster : [];

  // HEADCOUNT MODE IS NOT ZERO. travelPlan returns notBookedCount:null when
  // there is no guest list, because it cannot know — and this must not render
  // "0 still need a room" over an absence. Same rule as everywhere else here.
  if (!lg) return null;
  if (!roster.length) {
    return (
      <Panel label="WHO’S BOOKED A ROOM">
        <p className="lc-note">
          {plan.rosterMode
            ? 'Everyone on the list has declined — nobody needs a room right now.'
            : 'Add the guest list and this tracks who still needs a room.'}
        </p>
      </Panel>
    );
  }

  const setStatus = (row, status) => {
    const gs = (event.guests || []).filter(Boolean).map((g) => ({ ...g }));
    const i = gs.findIndex((g) => (row.guestId != null && g.id === row.guestId)
      || (row.guestId == null && String(g.name || '').trim() === row.name));
    if (i < 0) return;
    const tr = (gs[i].travel && typeof gs[i].travel === 'object') ? gs[i].travel : {};
    const cur = (tr.lodging && typeof tr.lodging === 'object') ? tr.lodging : {};
    patch({ guests: gs.map((g, j) => (j === i
      ? { ...g, travel: { ...tr, lodging: { ...cur, status, updatedAt: Date.now() } } }
      : g)) });
  };

  const left = lg.notBookedCount;
  return (
    <Panel label="WHO’S BOOKED A ROOM">
      {/* THE CUTOFF IS WHY THIS EXISTS. A group rate expires, and the work it
          creates is chasing the people who have not booked yet — which is
          exactly what `notBookedCount` feeds (HostShellV2.jsx:1534 raises
          "Group rate ends — N of M have no room yet" from it). Without this
          list the deadline had nobody attached to it. */}
      <p className="lc-note">
        {left === 0
          ? 'Everyone has a room.'
          : `${left} of ${roster.length} still need a room${String(stayDeadline(event)).trim() ? ' before the rate ends' : ''}.`}
      </p>
      {roster.map((r, i) => (
        <button key={r.guestId != null ? r.guestId : `g${i}`} className="lc-staged"
          onClick={() => setStatus(r, nextLodgingStatus(r.status))}
          /* A guest-id deep link lands on that guest's row. String-compared
             because a route id survives a URL as text and the roster's may be
             a number — `5 === '5'` is false and would silently land nowhere,
             which is the failure this whole change is about. */
          ref={(el) => {
            if (el && focus != null && r.guestId != null && String(focus) === String(r.guestId)) {
              el.scrollIntoView({ block: 'center' });
            }
          }}
          aria-label={`${r.name} — ${LODGING_STATUS_LABEL[r.status]}. Tap to change.`}>
          <span className="lc-staged-main">
            <span className="lc-staged-name">{r.name}</span>
            {(r.roommate || r.accessibility) && (
              <span className="lc-staged-sub">
                {[r.roommate ? `rooming with ${r.roommate}` : null, r.accessibility].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
          <span className="lc-staged-fit">{LODGING_STATUS_LABEL[r.status]}</span>
        </button>
      ))}
    </Panel>
  );
}

const stayDeadline = (event) => {
  const stay = (event && event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  return stay.deadline || '';
};

// UX_03 MULTI-VIEWPORT DOCTRINE (rule 5: "No information-dense tables. Use
// stacked card layouts" — rule 6 sanctions horizontal scroll ONLY for image
// carousels / swipe lanes). A CSS-grid table with a row per attribute and a
// column per option is exactly the pattern rule 5 bans on a phone; the deck
// below (Choices — a scroll-snapped image carousel) is the doctrine-legal
// form of the SAME comparison. So the grid renders at tablet+ width, where a
// side-by-side table is the more legible read (host, in a client meeting,
// showing the screen — UX_03's own tablet framing); below that it steps
// aside for a one-line pointer at the swipe deck, which already carries every
// value this table does, just as stacked cards instead of dense rows.
function Transpose({ cmp }) {
  const grid = { gridTemplateColumns: `minmax(92px,1.3fr) repeat(${cmp.columns.length}, minmax(0,1fr))` };
  return (
    <Panel label={`SIDE BY SIDE${cmp.guests ? ` · YOUR ${cmp.guests}` : ''}`}>
      {/* "Below" was true when this table sat above the deck; the reorder
          that put the deck first (2026-08-05, "layout has to capture swipe
          the ones that fit in the viewport") left this pointing the wrong
          way — a host scrolling down from THE ONES THAT FIT into this note
          would be told to look below for something already behind them. On a
          phone the grid itself stays hidden (UX_03 rule 5), so there is
          nothing further to point at: the deck above already IS the
          comparison. */}
      <p className="lc-note lc-t-mobile-note">The places you swiped through above are this comparison — a wider screen shows it as one table instead.</p>
      <div className="lc-t-wide">
        <div className="lc-t-head" style={grid}>
          <span />
          {cmp.columns.map((c) => <span key={c.id} className="lc-col">{c.label}</span>)}
        </div>
        {cmp.rows.map((r) => (
          <div key={r.id} className="lc-t-row" style={grid}>
            <span className="lc-row-label">{r.label}</span>
            {r.values.map((v, i) => (
              <span key={i} className={'lc-t-val' + (v === '—' ? ' is-gap' : r.flags[i] === 'short' ? ' is-short' : '')}>{v}</span>
            ))}
          </div>
        ))}
        <p className="lc-note">{cmp.note}</p>
      </div>
    </Panel>
  );
}

const Rows = ({ rows }) => rows.map(([l, r]) => (
  <div key={l} className="lc-row"><span className="lc-row-label">{l}</span><span className="lc-row-val">{r}</span></div>
));

const Panel = ({ label, children }) => (
  <section className="lc-panel"><p className="lc-label">{label}</p>{children}</section>
);

// ── A PANEL FOR THE PATH THE HOST IS NOT ON (host, 2026-09-27) ─────────────
// Measured on the looking stage at 402pt: "ALREADY SORTED IT YOURSELF?" was
// 306pt — the largest block on a screen whose whole premise is one thing at a
// time, and it is an ESCAPE HATCH. It is for a host who is not doing this
// flow: she already booked, and wants to record it rather than search.
//
// That is worth offering and not worth 306pt of a stage about searching. It
// keeps its label, so a host who IS in that situation still finds it by
// reading the screen, and costs one line until she asks for it.
const FoldPanel = ({ label, children }) => (
  <section className="lc-panel">
    <details className="lc-fold">
      <summary className="lc-label">{label}</summary>
      <div className="lc-fold-body">{children}</div>
    </details>
  </section>
);

function EventPicker({ events, eventId, onPick }) {
  if (events.length < 2) return null;
  return (
    <section className="lc-panel lc-picker">
      <p className="lc-label">DRIVING WHICH EVENT</p>
      <div className="lc-ctas">
        {events.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)}
            className={'cta soft' + (e.id === eventId ? '' : ' is-off')}>{e.name || 'Untitled'}</button>
        ))}
      </div>
    </section>
  );
}

// ── RESPONSIVE TO THE DEVICE, NOT TO A PHONE FRAME ─────────────────────────
// 02_STUDIO_MATTE's Responsive Rule names six sizes and says "mobile is not an
// afterthought". The first cut of this pinned max-width:393 — a phone mock on
// every screen, which is the opposite. It now flows: fluid measure and clamped
// type on one column, and at >=900px the step rail moves to its own left column
// so the decision keeps the width instead of the rail stealing it.
const CSS = `
/* ground + bloom come from .app.app-elegant — not restated here */
.lc-wrap{color:var(--ink);font:400 15px/1.5 Inter,system-ui,sans-serif;
  padding:clamp(20px,4vw,40px) clamp(16px,5vw,48px) calc(48px + env(safe-area-inset-bottom,0px));}
.lc-grid{width:min(100%,1180px);margin:0 auto;display:grid;grid-template-columns:1fr;gap:0;}
.lc-main{min-width:0;max-width:68ch;}
.lc-eyebrow{font:650 11px/1 Inter,sans-serif;letter-spacing:.09em;color:var(--muted);margin:0;}
/* NOBODY WRAPS (multi-option research, 2026-08-01: "Eighteen apps. Zero
   wrapped pill rows"). This rail DID wrap — "On the books" fell to a second
   line, giving a ragged edge and a height that changes with the label set.
   It scrolls now, clipped mid-pill, with the right edge masked so a pill is
   CUT rather than ending flush: the clip IS the affordance that says there is
   more. */
.lc-rail{display:flex;gap:2px;margin:18px 0 0;flex-wrap:nowrap;overflow-x:auto;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;
  -webkit-mask-image:linear-gradient(to right,#000 88%,transparent);
  mask-image:linear-gradient(to right,#000 88%,transparent);}
.lc-rail::-webkit-scrollbar{display:none}
.lc-step{flex:0 0 auto;white-space:nowrap;}
/* Sized to FIT all five on a 393pt phone rather than scroll by default —
   five short labels are a map of the whole job, and a map you have to drag is
   a worse map. The scroll + edge mask above stays as the fallback for narrower
   handsets (320pt) and for longer labels later, so nothing wraps either way. */
.lc-step{background:none;border:none;border-bottom:2px solid var(--line);padding:6px 5px 7px;
  /* 10px was UNDER this repo's own floor — styles.css calls --t-caption-min
     (11px) "smallest legal type" and this was a raw 10. The >=1024 override
     further down already used 12px, so the phone had the smallest copy of the
     five words a host navigates this surface with. Tokenized to --t-overline,
     which is that 12px, so the two breakpoints stop disagreeing. */
  font:500 var(--t-overline)/1 Inter,sans-serif;letter-spacing:0;cursor:pointer;color:var(--faint);
  min-height:var(--tap-min);}
/* REAL HEIGHT, BECAUSE THE EXPANDER COULD NOT WORK HERE. First attempt gave
   these tabs the sanctioned ::after that .sheet-x uses — and re-probing with
   elementFromPoint showed 42 and 43 still, unchanged. The cause is one line
   up: .lc-rail sets overflow-x:auto, which computes overflow-y to auto as
   well, so the expander was clipped to the rail's own 25px. That is the
   "computed geometry is not a tap target" trap exactly — a 44px ::after
   clipped to nothing, invisible to every measurement except a real probe.
   A taller box cannot be clipped by its parent's scroll. */
.lc-step.is-done{color:var(--muted);border-bottom-color:var(--steel-soft);}
.lc-step.is-on{color:var(--ink);border-bottom-color:var(--ok);font-weight:650;}
/* ── THE STAGE HERO TAKES THE SCALE'S HERO TIER (2026-09-28) ──────────────
   These were bespoke clamps — 27/5.2vw/40 and 14/1.9vw/17 — and UX_01 names
   the --t-* tokens as the single source of truth, with a raw font-size as a
   review flag. Measured at 402pt the consequence was real, not academic: the
   h1 sat at its 27px floor because 5.2vw is 21px there, a third under the
   --t-display-l tier that renders 38px at the same width. The dominant
   element of the stage was smaller than the scale's hero. */
.lc-h1{font:700 var(--t-display-l)/1.12 Inter,sans-serif;letter-spacing:-.03em;margin:var(--sp-6) 0 0;text-wrap:balance;}
.lc-why{font:italic 400 var(--t-sub)/1.5 Newsreader,Georgia,serif;color:var(--muted);margin:var(--sp-3) 0 0;max-width:52ch;}
/* The spend guard. Amber per UX_02 ("needs attention, incomplete") — NOT crit:
   both event seats ruled a red gate here is alarm a host learns to ignore, and
   the colour budget allows one meaning per token. A hairline rule rather than a
   filled panel keeps it a note beside the work instead of a slab over it. */
.lc-venuegap{font:400 13px/1.6 Inter,sans-serif;color:var(--ink-soft);margin:16px 0 0;
  border-left:2px solid var(--warn); padding:2px 0 2px 12px; max-width:62ch;}
.lc-venuegap strong{color:var(--ink);font-weight:650;}

/* The folded panel: its label IS the control, so it gets the tap target and a
   caret. Closed it costs one line; open it is the panel it always was. */
.lc-fold summary{cursor:pointer;list-style:none;min-height:var(--tap-min);display:flex;
  align-items:center;gap:var(--sp-2);}
.lc-fold summary::-webkit-details-marker{display:none;}
.lc-fold summary::after{content:'▾';color:var(--steel-soft);font-size:11px;}
.lc-fold[open] summary::after{content:'▴';}
.lc-fold-body{margin-top:8px;}
/* The no-regional line: a plain note, never styled like the band it replaces
   — it is the absence of a number, not a quieter number. */
.lc-noband{margin:var(--sp-3) 0 0;}
.lc-venuegap em{font-style:italic;}
.lc-venuegap .lc-link{margin-left:0;display:inline-block;margin-top:6px;}
.lc-peek{font:400 12px/1.5 Inter,sans-serif;color:var(--muted);margin:16px 0 0;}
.lc-peek strong{color:var(--ink-soft);}
.lc-link{background:none;border:none;color:var(--steel-soft);cursor:pointer;font:500 12px/1 Inter,sans-serif;padding:0 0 0 6px;text-decoration:underline;}
.lc-panel{margin-top:clamp(20px,3vw,30px);}
.lc-picker{border-top:1px solid var(--line);padding-top:14px;}
/* ── AN OVERLINE IS A TITLE AND WAS LIT LIKE A FOOTNOTE (host, 2026-09-27)
   "THREE DOORS" and "BRING ONE BACK" name the sections of the stage, and at
   --faint they measured 4.85:1 — legal for AA and read as small print. The
   neutral text ramp has no middle step (#eef0f4, #9a9ca0, and a blue
   #849eb8), and --faint sits within 2% alpha of --muted, so the only real
   lift available without inventing a colour is the primary ink. */
.lc-label{font:600 var(--t-caption-min)/1 Inter,sans-serif;letter-spacing:.09em;color:var(--ink);margin:0 0 var(--sp-2);}
.lc-body{color:var(--ink-soft);margin:0 0 6px;}
.lc-strong{font:650 17px/1.3 Inter,sans-serif;margin:0 0 6px;}
.lc-note{font:400 11px/1.5 Inter,sans-serif;color:var(--faint);margin:10px 0 0;}
/* The regional band, before the host has a shortlist. Banded like the rest of
   this cockpit and deliberately QUIET: it is context for a search, not a
   verdict on one, and the published rungs must never out-shout the host's own
   listings when those arrive. */
.lc-band{margin:var(--sp-3) 0 0;padding:var(--sp-2) var(--sp-3);border:1px solid var(--line);border-radius:var(--r-row);background:var(--bg-band);}
.lc-band .lc-body{margin:0;color:var(--ink);}
.lc-band .lc-note{margin:6px 0 0;}
/* The search doors ride the same rule — inline, scrolled if they do not fit,
   never stacked into a ragged block. */
.lc-ctas{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;
  -webkit-overflow-scrolling:touch;padding-bottom:2px;
  -webkit-mask-image:linear-gradient(to right,#000 90%,transparent);
  mask-image:linear-gradient(to right,#000 90%,transparent);}
.lc-ctas::-webkit-scrollbar{display:none}
.lc-ctas > *{flex:0 0 auto;white-space:nowrap;}
/* Sized so all THREE doors sit on one 393pt line. At the full 15px/18px CTA the
   third ("Search hotels") fell entirely past the mask — and a clipped edge is
   only an affordance when you can SEE the clip. Hotels are one of the three
   real answers, so it earns its place on the line rather than behind a drag. */
/* SHORTER DOORS, LEGAL TARGETS. At the atom's 46px floor these read chunky —
   the labels are one word, so the box was mostly air. The VISUAL box drops to
   34px; the TOUCH target is restored to 44px by an ::after overlay, which is
   the trick styles.css names in the .cta comment ("a real min-height works
   where the ::after trick can't") — here it can, because these are inline
   links in a rail rather than a full-width primary key.
   The floor itself is not negotiable: 44px is the accessibility minimum, and
   shrinking the hit area to match the paint would fail it. */
/* 44, NOT 34 — the Shop-sheet ruling, arriving late (2026-09-26 -> 09-27).
   334896ad set min-height:44px on .food-act after finding it at 34: "ten
   pixels under, on three buttons a host reaches for on the way out of the
   door." The identical 34 lived here and did not get the pass, because this
   cockpit runs its own .lc-* CSS with, by its own header, zero overlap with
   styles.css. Every one of that redesign's five rulings stopped at that
   boundary. The ::after below stays: it is belt and braces, and the visual
   height is what the standard actually asks for. */
.lc-ctas .cta{font-size:14px;padding:7px 14px;min-height:var(--tap-min);position:relative;}
.lc-ctas .cta::after{content:"";position:absolute;left:0;right:0;top:50%;
  height:44px;transform:translateY(-50%);}
/* A rail that must not scroll gets to spread; one that holds two actions wraps
   normally rather than clipping them. */
/* The ONE thing the atom does not say: a door LEAVES. A hairline marks it as
   outbound rather than a filled in-app key. Hover, press and focus all come
   from ".cta" and the global ring — restating them here (as the first cut did)
   was three duplicated rules and a second focus colour. */
/* Balanced, not ragged (host, 2026-08-05): "Airbnb" / "Vrbo" / "Hotels" are
   three different lengths, and a plain flex row sizes each to its own text —
   three pills of visibly different widths reading as three separate weights
   instead of one row of three equal doors. flex:1 makes all three share the
   row evenly; text-align centers each label inside its share. */
.lc-door{border:1px solid var(--line);text-decoration:none;flex:1 1 0;text-align:center;
  justify-content:center;}
/* ── THREE DOORS ARE NOT A CHIP ROW (host, 2026-09-27) ────────────────────
   .lc-ctas is a masked horizontal SCROLLER — the right pattern for a long
   row of chips, and the wrong one for exactly three doors that all have to
   be visible and tappable. Its mask fades the last 10% of the row, so the
   third door sat under the fade and read as narrower than the other two.
   The host called it "different sizes", which is what it looks like: two
   whole doors and a dimmed sliver.

   I MEASURED THE WIDTHS AND CALLED IT NOT REPRODUCIBLE. They were
   115/115/115 in both Chromium and WebKit — correct, and beside the point.
   Layout width is not what is on screen. Only looking at the render found
   it, and the host had to say it twice first.

   NO BACKTICKS IN THIS BLOCK: it lives inside a JS template literal, and the
   first draft of this comment quoted a class name in backticks, which closed
   the string and broke the build.

   A grid of three equal columns cannot overflow or scroll, so there is
   nothing for a mask to fade: minmax(0,1fr) lets each door shrink below its
   content width instead of widening the row. */
.lc-doors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-2);
  overflow:visible;-webkit-mask-image:none;mask-image:none;align-items:center;}
/* AND EQUAL HEIGHTS, WHICH IS WHAT THE HOST ACTUALLY SAW. Measured in WebKit
   at 402pt: 45 / 37 / 37. Every door ended at the same y, so the tall one
   stuck UP and the row read ragged — "the buttons are different sizes". The
   cause was the label wrapping its arrow onto a second line in the widest
   word, not the box. nowrap stops the wrap; stretch makes the grid row give
   all three the same height whatever the label does next. */
.lc-doors .lc-door{min-width:0;white-space:nowrap;align-self:center;margin:0;
  height:var(--tap-min);box-sizing:border-box;justify-content:space-between;text-align:left;}
/* ── AND THE ROW HAS TO BE A STRAIGHT LINE (host, 2026-09-27) ─────────────
   THE CAUSE WAS A MARGIN, and it took four wrong fixes to find because I
   kept measuring the boxes instead of their offsets. Measured at last:
   margin-top is 0 on the first door and 8px on the other two — a sibling
   rule written for a VERTICAL stack of CTAs, doing exactly its job inside a
   horizontal row. The first door sat 8px high; centering the row halved it
   to 4 and hid the cause.
   Widths, heights, padding, white-space, overflow and alignment were all
   correct the whole time. Zeroing the margin is the fix; the rest of this
   rule earns its place for other reasons and stays. */
/* ── AND THE ROW HAS TO BE A STRAIGHT LINE (host, 2026-09-27) ─────────────
   Equal boxes were not enough. Measured: all three 44 tall, and the first
   sat 8px HIGHER than the other two — tops 321 / 329 / 329, bottoms
   365 / 373 / 373. The grid row is 52 tall; with an explicit height, stretch
   stops applying and the items fell back to different alignments inside it,
   one to the top and two to the bottom.
   Centering every door in the row makes the offset impossible whatever the
   row height turns out to be — which matters because nothing here controls
   that 52. */
/* ── CENTRED TEXT IS WHAT MADE THEM LOOK CROOKED (host, 2026-09-27) ───────
   The boxes were identical — 115 wide, 44 tall, 8px gaps, flush at both ends
   — and the host still read the row as misaligned. Measured inside each box:
   the labels were centred perfectly, insetL === insetR every time, but the
   insets DIFFERED between doors because the words differ in length —
   Airbnb 29, Vrbo 36, Hotels 30. Three labels starting at three different
   places across three identical boxes.

   Centring is the cause, not the cure. space-between anchors each label to
   its box's left edge and each arrow to the right, so the labels share one
   inset and the arrows share another: two straight columns instead of three
   floating words. */
/* THE HEIGHT IS STATED, NOT INHERITED. Measured in WebKit at 402pt the three
   doors came out 45 / 37 / 37 with identical computed padding, line-height,
   min-height, white-space and align-self, identical children, and one grid
   row — the first was simply 8px taller and the archaeology was not worth
   more of the host's evening. 44 is not a workaround number: it is the tap
   target this repo's own QA bar requires, so stating it fixes the raggedness
   and satisfies the rule at once. */
.lc-warn{color:var(--warn);}
.lc-demo{color:var(--warn);letter-spacing:.09em;}
/* Quiet and tertiary: leaving is always available and never the point of the
   screen. UX_05 — a navigation link is text, not a filled control. */
.lc-back{display:inline-flex;align-items:center;gap:var(--sp-1);margin:0 0 var(--sp-2);
  padding:var(--sp-1) 0;background:none;border:none;color:var(--steel-soft);
  font:600 12px/1 Inter,sans-serif;cursor:pointer;min-height:var(--tap-min);}
.lc-back:hover{color:var(--ink);}
/* ── THE LAST SHOP-SHEET RULING TO REACH THIS SURFACE (2026-09-28) ────────
   d9c3a10b: "every secondary action the same width, on a two-column grid."
   Its cause was flex — flex:1 1 auto grows a chip that wraps alone, so width
   encoded WRAP POSITION, which is nothing. Owner then: "email is one of the
   smallest words but is wider than send to instacart."
   This row was still flex-wrap. Measured at 402pt: two peer actions at 157
   and 212, the same defect one surface over. Four actions read 2x2, three
   read 2 + 1, and every action is identical either way — correct, because
   these are peers. Two columns and not three for the reason the ruling
   gave: it cannot clip. */
.lc-ctas-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-2);
  overflow:visible;-webkit-mask-image:none;mask-image:none;margin-top:var(--sp-3);}
.lc-ctas-wrap > *{margin:0;}
.lc-staged{display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;
  border-top:1px solid var(--line);padding:12px 0;cursor:pointer;text-align:left;}
.lc-tick{flex:0 0 auto;width:18px;height:18px;border-radius:4px;border:1px solid var(--line);background:var(--card);}
.lc-tick.is-on{background:var(--ok);border-color:var(--ok);}
.lc-staged-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;}
.lc-staged-name{font:500 15px/1.3 Inter,sans-serif;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lc-staged-sub{font:400 11px/1.3 Inter,sans-serif;color:var(--faint);}
.lc-staged-fit{flex:0 0 auto;font:400 12px/1 Inter,sans-serif;color:var(--faint);}
.lc-offer{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border:1px solid var(--line);
  border-radius:var(--r-md);padding:12px;margin-bottom:12px;}
.lc-offer .lc-body{margin:0;flex:1 1 100%;}
/* NO BUTTON IDENTITY HERE. The app already owns it: ".cta" (--cta-grad ground,
   --carbon-text label, --r-row radius, 46px floor, hover) and ".cta.soft"
   (--steel-tint ground, --ink label), with a GLOBAL :focus-visible ring at
   styles.css:106. This file used to restate all of it as ".lc-cta" — a second
   vocabulary that would drift the first time the atom changed. It now uses the
   real classes and styles only LAYOUT. */
.cta.is-off{opacity:.5;}
/* ── THE FIELD JOINS THE SHELL'S (2026-09-28) ─────────────────────────────
   Raw 10px radius against --r-md (12), raw 15px against the scale, raw
   padding against the spacing tokens. The 15px is the one that mattered:
   --t-input is 16px and the scale calls it "the iOS 16px no-zoom floor",
   because Safari zooms the page when a focused input is under it. Measured:
   all three fields on this surface were 15px, on the stage whose whole job
   is pasting a link from Airbnb — on a phone, with one hand.

   Height floored directly rather than with the ::after expander, for the
   reason styles.css gives at its own .field: pseudo-elements do not render
   on <input>. That is also why the floor GATE missed these — it queried
   buttons and links and never an input. Fixed there too. */
.lc-field{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);color:var(--ink);
  padding:var(--sp-3) var(--sp-4);font:650 var(--t-input)/1.3 Inter,sans-serif;
  min-height:var(--tap-min);width:100%;min-width:0;}
.lc-field-sm{max-width:190px;min-height:var(--tap-min);}
.lc-area{resize:vertical;line-height:1.5;}
.lc-row-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;}
.lc-row-form .lc-field{flex:1 1 200px;}
.lc-row,.lc-date{display:flex;justify-content:space-between;gap:18px;border-top:1px solid var(--line);
  padding:12px 0;align-items:center;}
.lc-row-label{font:500 13px/1.35 Inter,sans-serif;color:var(--ink-soft);min-width:0;}
.lc-row-val{font:400 13px/1.35 Inter,sans-serif;text-align:right;color:var(--ink);}
.lc-opt{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--line);padding:12px 0;flex-wrap:wrap;}
/* struck, not deleted — a place you already ruled out is worth remembering */
.lc-opt.is-gone .lc-opt-name{text-decoration:line-through;color:var(--faint);}
/* Held out of the chooser, not hidden: still legible, visibly not ready. */
.lc-opt.is-thin .lc-opt-name{color:var(--muted);}
.lc-opt-acts{display:flex;gap:8px;flex-wrap:wrap;}
.lc-opt-main{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 160px;}
.lc-opt-sub{font:400 11px/1.35 Inter,sans-serif;color:var(--faint);}
.lc-why{margin-top:14px;}
.lc-why-sum{cursor:pointer;list-style:none;font:500 12px/1 Inter,sans-serif;
  color:var(--steel-soft);padding:8px 0;}
.lc-why-list{margin:4px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px;
  font:400 12px/1.5 Inter,sans-serif;color:var(--ink-soft);}
.lc-opt-name{font:500 15px/1.3 Inter,sans-serif;min-width:0;}
/* ── D6 · W9 card deck ─────────────────────────────────────────────────── */
.lc-deck-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:0 0 10px;}
.lc-deck-name{font:500 15px/1.3 Inter,sans-serif;color:var(--ink);min-width:0;}
.lc-deck-count{font:400 13px/1.3 Inter,sans-serif;color:var(--muted);flex:0 0 auto;}
/* Native scroll-snap IS the swipe: real momentum on a phone, trackpad and
   keyboard for free, and no drag handler to fight the browser. */
.lc-deck{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px;}
.lc-deck::-webkit-scrollbar{display:none;}
.lc-card{scroll-snap-align:start;flex:0 0 88%;max-width:340px;min-width:0;
  background:var(--sheen);border:1px solid var(--hair);border-radius:14px;overflow:hidden;}
/* Hero-sized (host, 2026-08-05): 172px read as a strip, not the dominant
   element on the card the swipe deck's own comment calls the primary act.
   clamp() keeps it real-estate-dominant across phone heights without ever
   pushing the price/CTA row below the fold on a short device. */
.lc-card-photo-wrap{position:relative;height:clamp(240px,44vh,440px);width:100%;}
/* The inset shot: the photo is a picture OF the place, not the page the copy
   is written on. Shorter than the old full-bleed because the facts below it
   now need room that the scrim used to borrow. */
.lc-card-shot{margin:var(--sp-2);border-radius:var(--r-lg);overflow:hidden;
  height:clamp(190px,32vh,300px);position:relative;}
/* TRANSPARENT, BUT NOT BARE (host, 2026-09-30: "the BACKGROUND of overlay
   should be transparent").
   The photo shows through — that is the ask. What it does NOT go back to is
   the bare gradient that measured 1.0-2.2:1, because there the ground was
   whatever the listing photographed and no colour could be safe on it.
   A backdrop blur plus a tint keeps it see-through while making the ground
   PREDICTABLE: the blur flattens local extremes, so a bright window behind the
   text stops being a bright window. The tint sets the floor. Measured across
   all six listing photos, worst case is reported in the commit — if a photo
   ever beats it, the number moves, not the honesty.
   -webkit- first: this shell is driven and shipped on WebKit. */
.lc-card-caption{position:absolute;left:0;right:0;bottom:0;
  padding:var(--sp-2) var(--sp-3) var(--sp-3);isolation:isolate;}
/* The veil is a ::before, not a background on the caption, because opacity
   on the caption would fade the TEXT with it — the thing we are protecting.
   --card, so it follows the theme: a dark veil under light ink, a light veil
   under dark ink. A fixed dark tint would have made light mode unreadable,
   which is the same mistake the light-mode token sweep already paid for.
   0.70 is solved, not chosen: 0.65 is the lowest alpha where --ink still
   clears 4.5:1 in BOTH themes against the two worst photos there are, a
   blown-out white and a pitch black. 0.70 gives 5.33:1 and leaves margin for
   a future ink tweak. 30% of the photograph reads through. */
.lc-card-caption::before{content:'';position:absolute;inset:0;z-index:-1;
  background:var(--card);opacity:.70;
  -webkit-backdrop-filter:blur(16px) saturate(115%);
  backdrop-filter:blur(16px) saturate(115%);}
.lc-card-shot img{width:100%;height:100%;object-fit:cover;display:block;}
/* The link fills the shot so the whole picture is the target, not a strip of
   it. It sits UNDER the caption in the stack, so the caption's own controls
   keep their taps. */
.lc-shot-link{display:block;width:100%;height:100%;}
.lc-card-facts{padding:0 var(--sp-3) var(--sp-3);}
/* Standalone use (Picked/Booked — one stay, not a deck card): the rounding
   and clipping the deck got for free from .lc-card has to be stated here
   instead, and the height reads a touch calmer (36vh) since this is a
   settled fact on the screen, not the primary decision surface. */
.lc-stayhero{border-radius:14px;overflow:hidden;height:clamp(200px,36vh,360px);margin-bottom:14px;}
.lc-stayhero-flat{margin-bottom:14px;}
.lc-stayhero-flat-sub{margin-top:4px;}
.lc-card-photo{display:block;width:100%;height:100%;object-fit:cover;background:var(--hair);}
/* ── height:100% CLIPPED THE ONLY BUTTON THAT MATTERS (2026-08-06) ──────────
   Found by the board and reproduced by measurement. The photo branch overlays
   name/price/Pick ON the image (absolute, inside .lc-card-photo-wrap), so a
   full-bleed hero costs it nothing. This branch puts them in NORMAL FLOW below
   the placeholder — and "height:100%" against a stretch-sized card meant the
   placeholder consumed the entire card, pushing the body past "overflow:hidden"
   on .lc-card. Measured on a 3-hotel shortlist: card 372→731, placeholder 359px
   (the whole card), "Pick this place" at 822 — 91px BELOW the card's bottom
   edge, and document.elementFromPoint returned .lc-why-sum instead of the
   button. Not visible, not hit-testable.

   It became unreachable the moment hotel photos started being refused by
   isAllowedMedia earlier the same day: before that every hotel card HAD a photo
   and took the working branch, so the privacy fix — which is right — silently
   closed the hotel path. An all-hotel shortlist could not reach "picked" at all.

   Bounded so the placeholder is a hero and not the whole card. Gated by an e2e
   assertion that the button is hit-testable on a photo-less card. */
.lc-card-nophoto{height:clamp(120px,20vh,180px);width:100%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;background:var(--hair);border:none;cursor:pointer;
  padding:0;font:inherit;}
.lc-card-nophoto-add{font:600 16px/1.3 Inter,sans-serif;color:var(--steel-soft);}
.lc-card-nophoto-sub{font:400 12px/1.3 Inter,sans-serif;color:var(--muted);}
/* A real gradient, not a filled bar — the photo stays the primary surface;
   the scrim only exists to keep the overlaid name/price/CTA legible over
   whatever the photo happens to be. Height is generous (65%) because a
   light sky or wall behind white text is a real, common case, not an edge
   case to under-design for. */
.lc-card-scrim{position:absolute;left:0;right:0;bottom:0;height:65%;pointer-events:none;
  background:linear-gradient(to top, rgba(10,12,16,.92) 0%, rgba(10,12,16,.6) 45%, rgba(10,12,16,0) 100%);}
.lc-card-overlay{position:absolute;left:0;right:0;bottom:0;padding:14px;}
.lc-card-body{padding:14px;}
.lc-card-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
/* OFF THE PHOTO, ONTO A SURFACE. No shadow, no hardcoded #fff, no alpha: the
   ground is --card now, so --ink means what the token says it means. */
.lc-card-name{font:600 17px/1.25 Inter,sans-serif;color:var(--ink);margin:0;min-width:0;}
/* A room rate is a smaller claim than a stay total, and reads as one. */
.lc-card-price-room{font-size:13px;font-weight:500;white-space:nowrap;}
/* The guest note, shown as written. Wraps rather than scrolls sideways:
   UX_03 rule 6 sanctions horizontal scroll for carousels, not for prose. */
.lc-draft{white-space:pre-wrap;word-break:break-word;font:400 13px/1.55 Inter,sans-serif;
  color:var(--ink);background:var(--sheen);border:1px solid var(--hair);border-radius:10px;
  padding:12px;margin:0 0 10px;max-height:280px;overflow:auto;}
.lc-card-price{font:600 17px/1.25 Inter,sans-serif;color:var(--ink);flex:0 0 auto;
  font-variant-numeric:tabular-nums;text-shadow:0 1px 3px rgba(0,0,0,.5);}
.lc-card-sub{font:400 13px/1.4 Inter,sans-serif;color:var(--ink-soft);margin:6px 0 0;}
/* The no-photo card has no scrim to sit on — plain body text, not white on
   nothing. Same markup as the overlay identity block, different context. */
.lc-card-identity-noPhoto .lc-card-name,.lc-card-identity-noPhoto .lc-card-price{
  color:var(--ink);text-shadow:none;}
.lc-card-identity-noPhoto .lc-card-sub{color:var(--ink-soft);}
.lc-card-nophoto .lc-card-nophoto-add,.lc-card-nophoto .lc-card-nophoto-sub{position:relative;z-index:1;}
.lc-card-was{font:400 12px/1.4 Inter,sans-serif;color:var(--muted);margin:4px 0 0;}
.lc-chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0;}
.lc-chip{font:400 12px/1 Inter,sans-serif;color:var(--ink-soft);padding:7px 10px;
  border:1px solid var(--hair);border-radius:999px;}
.lc-card-eyebrow{font:500 11px/1.2 Inter,sans-serif;letter-spacing:.08em;color:var(--muted);
  margin:16px 0 2px;}
.lc-pv{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
  padding:10px 0;border-top:1px solid var(--hair);}
.lc-pv-label{font:400 14px/1.35 Inter,sans-serif;color:var(--ink);min-width:0;
  display:flex;gap:var(--sp-2);align-items:baseline;flex-wrap:wrap;}
/* The value leads; the field name labels it. Bolder than the label because
   the number is what a host came to read. */
.lc-pv-val{font-weight:650;color:var(--ink);}
/* The per-person line: the number carries the weight, the caveat does not.
   One line, so it never competes with the total above it. */
/* OVER A PHOTO, NOT ON THE PAGE (2026-09-29). This line used --ink and
   --muted, which are PAGE tokens, while every other line in this overlay
   carries an explicit white and a shadow because it sits on a photograph. On a
   bright listing photo the tail was effectively invisible — measured before
   the host asked, and the same class of fault as the light-mode tokens that
   never branched. Matches .lc-card-sub, which has always been correct. */
.lc-card-each{margin:var(--sp-1) 0 0;font:400 var(--t-meta)/1.4 Inter,sans-serif;
  color:var(--ink-soft);}
/* The lead number: same size as the name it sits beside, so the card still has
   ONE loud thing rather than two competing ones. "each" rides at the sub size
   so the figure reads first and the unit qualifies it. */
.lc-card-lead-each{white-space:nowrap;}
.lc-card-fit{display:flex;flex-wrap:wrap;gap:var(--sp-1);margin:var(--sp-2) 0 0;}
/* Back to the UX_02 chip: on a real surface the 12-15% tint IS the container,
   which is what the doctrine says. The dark pill existed only because the
   ground was a photograph. */
.lc-fitchip{font:650 var(--t-caption)/1.5 Inter,sans-serif;padding:2px var(--sp-2);
  border-radius:999px;background:var(--bg-band);white-space:nowrap;}
.lc-fit-yes{color:var(--ok);}
.lc-fit-no{color:var(--warn);}
.lc-fit-part{color:var(--warn);}
/* Not-told is not a state to colour. It is the absence of one. */
.lc-fit-unknown{color:var(--muted);}
/* The pick reads as SELECTION, which is what steel means in this system
   (UX_02: accent = structure, selection, the primary target) — not as a
   fourth status colour. */
.lc-fit-pick{color:var(--steel-soft);}
/* NAMED AWAY FROM AN EXISTING CLASS (2026-09-29). This was lc-why, which this
   file already used for three italic Newsreader paragraphs (:174, :204, :309)
   and a details block — so these list rules were silently restyling copy that
   had nothing to do with the recommendation, and a test looking for that class
   matched a paragraph with no items in it. The failing test is the only reason
   the collision was found.
   NO BACKTICKS IN HERE: this whole block is one JS template literal (see
   the CSS const and the style tag below). Quoting a class name the way I
   would in prose closes the literal — the build still succeeded and the app
   threw at runtime behind the error boundary, which is the worst of both. */
.lc-pickwhy{margin:var(--sp-2) 0 0;padding:0 0 0 var(--sp-4);list-style:disc;}
.lc-pickwhy li{font:400 var(--t-meta)/1.5 Inter,sans-serif;color:var(--ink-soft);margin:0 0 2px;}
/* A drawback reads as one. Amber is "needs attention" in this system, which is
   exactly what a reason-against is on a pick the host is about to make. */
.lc-pickwhy li.lc-pickwhy-against{color:var(--warn);}
/* --ink, not --ink-soft. The unit is the WEAKEST text in the caption and it
   set the floor: on a white photo --ink-soft needs the veil at .85 to clear
   4.5:1, which is not a transparent background any more. Size and weight
   carry the distinction instead of colour, so the veil can stay see-through. */
.lc-lead-each-unit{font:400 13px/1.25 Inter,sans-serif;color:var(--ink);opacity:.9;}
.lc-pv-src{font:400 12px/1.35 Inter,sans-serif;color:var(--muted);flex:0 0 auto;}
.lc-dots{display:flex;gap:6px;justify-content:center;margin:12px 0 4px;}
.lc-dot{width:6px;height:3px;border-radius:2px;background:var(--hair);transition:width .18s ease;}
.lc-dot.is-on{width:16px;background:var(--ink-soft);}
@media (prefers-reduced-motion:reduce){.lc-dot{transition:none;}.lc-deck{scroll-behavior:auto;}}
.lc-thumb{width:56px;height:56px;flex:0 0 auto;border-radius:10px;object-fit:cover;background:var(--sheen);border:1px solid var(--hair);}
.lc-t-head{display:grid;column-gap:8px;align-items:end;}
.lc-t-row{display:grid;column-gap:8px;border-top:1px solid var(--line);padding:10px 0;align-items:baseline;}
.lc-col{font:650 var(--t-caption-min)/1.2 Inter,sans-serif;letter-spacing:.04em;color:var(--faint);text-align:right;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lc-t-val{font:650 13px/1.35 Inter,sans-serif;text-align:right;color:var(--ink);}
.lc-t-val.is-gap{font-weight:400;color:var(--faint);}
/* GREY, NEVER RED (research rec #7): a house that is too small is
   disqualifying, not faulty. Red here would be a semantic lie under UX_02. */
.lc-t-val.is-short{color:var(--muted);font-weight:400;font-size:12px;}
/* UX_03 rule 5: no information-dense tables on a phone — the grid steps
   aside for the swipe deck below 640px. A real @media query, not
   @container: nothing in this file declares container-type on an ancestor,
   so the @container rule below (min-width:900px) never actually activates —
   a media query needs no such setup and is guaranteed to apply. */
.lc-t-mobile-note{display:none;}
.lc-t-wide{display:block;}
@media (max-width:639px){
  .lc-t-wide{display:none;}
  .lc-t-mobile-note{display:block;}
}
@container (min-width:900px){
  .lc-grid{grid-template-columns:190px minmax(0,1fr);gap:clamp(28px,4vw,64px);}
  .lc-rail{flex-direction:column;align-items:flex-start;gap:0;position:sticky;top:clamp(20px,4vw,40px);
    overflow-x:visible;-webkit-mask-image:none;mask-image:none;}
  /* Same token as the phone rule above, not a second raw 12 — the two
     breakpoints were already agreeing on the number by coincidence, which is
     the state a token exists to replace. */
  .lc-step{border-bottom:none;border-left:2px solid var(--line);padding:10px 0 10px 12px;width:100%;text-align:left;font-size:var(--t-overline);letter-spacing:.02em;}
  .lc-step.is-done{border-left-color:var(--steel-soft);}
  .lc-step.is-on{border-left-color:var(--ok);}
}
@media (prefers-reduced-motion:reduce){.lc-wrap *{animation:none!important;transition:none!important;}}
`;

// SAME FRAME AS THE APP. `.stagewrap > .app.app-elegant` is the host shell's own
// structure, so the demo inherits the phone silhouette on a desktop window for
// free (styles.css gates it at >=1280x700) and the --bg ground + top bloom come
// from `.app.app-elegant` rather than being restated here. Mobile is the hero:
// below that gate this is simply a full-bleed phone surface, which is the case
// being judged.
const Frame = ({ children }) => (
  <div className="stagewrap stagewrap--responsive-lodging">
    <div className="app app-elegant">
      <style>{CSS}</style>
      <div className="lc-wrap">{children}</div>
    </div>
  </div>
);
// The simple states (no event, not a destination) have no rail, so they get the
// single-column body directly.
const Solo = ({ children }) => (
  <div className="lc-grid"><div className="lc-main">{children}</div></div>
);
