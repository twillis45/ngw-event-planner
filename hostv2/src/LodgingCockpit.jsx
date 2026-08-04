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
import {
  lodgingIntel, lodgingStage, LODGING_STAGES, lodgingCompare, lodgingRecommendation,
  kitchenConsequence, lodgingSearchLinks, lodgingSearchBlocked,
  extractListingCandidates, normalizeLodgingOption, stayFromPick, looksLikeSearchUrl, unfurlListing, isUnfurlConfigured, rankCandidates,
  lodgingTitleFor, lodgingTrouble, lodgingProvenance, lodgingRankBasis, lodgingPriceHistory,
} from '@app/lib/lodgingIntel';
import { venueFor } from '@app/lib/venueFor';
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
    localStorage.setItem(LS_CUSTOMS, JSON.stringify([...without, { ...SANTA_FE_EXAMPLE }]));
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
      localStorage.setItem(LS_CUSTOMS, JSON.stringify(next));
      setTick((t) => t + 1);
      // FINISHING A STEP LANDS YOU ON THE NEXT ONE (host, 2026-08-04). The
      // stage is derived, so the data moving forward already moves the host —
      // EXCEPT while they are peeking at another step, where `viewing` pinned
      // them to the screen they had just finished with. Any real write clears
      // the peek, so completing an act always hands them wherever they now are.
      setViewing(null);
    } catch { /* storage full or blocked — the surface simply does not change */ }
  }, [eventId]);

  const intel = useMemo(() => { try { return event ? lodgingIntel(event) : null; } catch { return null; } }, [event]);
  const derived = useMemo(() => { try { return event ? lodgingStage(event, intel) : null; } catch { return null; } }, [event, intel]);

  // `viewing` changes only which stage you LOOK at — it never rewrites the
  // event, so this cannot lie about where the host actually is.
  const [viewing, setViewing] = useState(null);
  const stage = viewing || (derived && derived.stage) || null;
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
      <p className="lc-why">This cockpit only has a job when guests travel — the whole stack is gated on <code>isDestination</code>.</p>
      <EventPicker events={events} eventId={eventId} onPick={(id) => { setEventId(id); setViewing(null); }} />
    </Solo></Frame>
  );

  const copy = stageCopy(derived, stage);

  return (
    <Frame>
      <div className="lc-grid">
        <aside className="lc-rail-col">
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
          <h1 className="lc-h1">{copy.title}</h1>
          <p className="lc-why">{copy.why}</p>
          <Body stage={stage} event={event} intel={intel} patch={patch} />
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
    looking: { title: 'Go find some places.', why: 'Three doors, opened with your own answers already in them.' },
    weighing: { title: 'Weigh them side by side.', why: 'On the things you said matter — and nothing that was never said.' },
    picked: { title: 'Lock one in.', why: 'Choosing is not booking. This is where the pick becomes a reservation.' },
    booked: { title: 'On the books.', why: 'The refund window, the next payment, and who still needs a room.' },
  })[stage] || derived;
}

function Body({ stage, event, intel, patch }) {
  if (stage === 'no-town') return <NoTown event={event} patch={patch} />;
  if (stage === 'looking') return <Looking event={event} patch={patch} />;
  if (stage === 'weighing') return <Weighing event={event} intel={intel} patch={patch} />;
  if (stage === 'picked') return <Picked event={event} intel={intel} patch={patch} />;
  return <Booked event={event} patch={patch} />;
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

function Looking({ event, patch }) {
  const [text, setText] = useState('');
  // Clicking a door means "I have gone looking". On return the next act is to
  // bring something back, so the surface says so instead of leaving the host to
  // work out that the textarea below is now the point.
  const [wentLooking, setWentLooking] = useState(false);
  const [readErr, setReadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState(null);
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
    let cands = (found.candidates || []).filter(Boolean);

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
    const known = new Set((event.lodgingOptions || []).map((o) => String((o && o.url) || '').split('?')[0]));
    const fresh = cands.filter((c) => c && !known.has(String(c.url || '').split('?')[0]));
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
    if (found.linksOnly && cands.length === 1 && isUnfurlConfigured()) {
      setReadErr('');
      setBusy(true);
      try {
        const r = await unfurlListing(cands[0].url);
        if (r && r.ok) {
          cands = [{ ...cands[0], name: r.title || cands[0].name, priceShown: r.price != null ? r.price : cands[0].priceShown, photo: r.photo || cands[0].photo }];
          found = { ...found, linksOnly: !(r.title) };
        } else if (r && r.reason) {
          setReadErr(r.reason);
        }
      } catch { /* fall through to the honest keep-it path */ }
      // FINALLY, not a trailing line. The spinner is the host's only signal that
      // the app is still theirs; any path that leaves it spinning has taken the
      // surface away from them. unfurlListing now bounds itself, but this makes
      // stranding impossible rather than merely unlikely.
      finally { setBusy(false); }
    }
    if (!cands.length) {
      // NAME WHAT THEY ACTUALLY PASTED. The generic "nothing readable" was
      // aimed at junk, and the commonest paste here is the search link this
      // app just handed them — which carries no listing facts at all, because
      // the platform renders those in the browser. Say that, and say the step.
      const door = looksLikeSearchUrl(src);
      const touch = typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(pointer:coarse)').matches;
      setReadErr(door
        ? `That’s the ${DOOR_SHORT[door] || 'search'} search link, not a house. Open it, then copy one place from the results and bring that back.`
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
      setStaged({ cands, dupes, pick: new Set(cands.map((c) => c.url)), linksOnly: !!found.linksOnly });
      setText('');
      setReadErr('');
      return;
    }

    const before = event.lodgingOptions || [];
    const next = cands.map((c, i) => normalizeLodgingOption({
      id: 'lodge-' + Math.random().toString(36).slice(2, 8),
      // Airbnb's type+place pattern rather than "Option 1" — the paste has to
      // visibly produce something, or the host has no reason to believe it worked.
      url: c.url, label: lodgingTitleFor(c), beds: c.beds, totalPrice: c.priceShown,
      photoUrl: c.photo, notes: [c.bedrooms ? `${c.bedrooms} bedrooms` : null,
        c.place ? `in ${c.place}` : null].filter(Boolean).join(' · '),
      status: 'option',
      // Provenance is captured HERE or not at all — reconstructing it later
      // would be a guess, and lodgingProvenance deliberately reports an
      // unrecorded source as unknown rather than crediting either side.
      sources: {
        ...(lodgingTitleFor(c) ? { label: 'read' } : null),
        ...(c.beds != null ? { beds: 'read' } : null),
        ...(c.priceShown != null ? { totalPrice: 'read' } : null),
        ...(c.photo ? { photoUrl: 'read' } : null),
        ...(c.bedrooms || c.place ? { notes: 'read' } : null),
      },
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
  // Commit only what is still ticked. Untick is the whole point of the review.
  const commitStaged = () => {
    const keep = staged.cands.filter((c) => staged.pick.has(c.url));
    if (!keep.length) { setStaged(null); return; }
    const before = event.lodgingOptions || [];
    const next = keep.map((c, i) => normalizeLodgingOption({
      id: 'lodge-' + Math.random().toString(36).slice(2, 8),
      url: c.url, label: lodgingTitleFor(c), beds: c.beds, totalPrice: c.priceShown,
      photoUrl: c.photo, notes: [c.bedrooms ? `${c.bedrooms} bedrooms` : null,
        c.place ? `in ${c.place}` : null].filter(Boolean).join(' · '),
      status: 'option',
      // Provenance is captured HERE or not at all — reconstructing it later
      // would be a guess, and lodgingProvenance deliberately reports an
      // unrecorded source as unknown rather than crediting either side.
      sources: {
        ...(lodgingTitleFor(c) ? { label: 'read' } : null),
        ...(c.beds != null ? { beds: 'read' } : null),
        ...(c.priceShown != null ? { totalPrice: 'read' } : null),
        ...(c.photo ? { photoUrl: 'read' } : null),
        ...(c.bedrooms || c.place ? { notes: 'read' } : null),
      },
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
        const on = staged.pick.has(c.url);
        return (
          <button key={c.url} className="lc-staged" aria-pressed={on}
            aria-label={`${lodgingTitleFor(c) || 'Unnamed place'} — ${on ? 'keeping' : 'not keeping'}`}
            onClick={() => setStaged((st) => {
              const pick = new Set(st.pick);
              if (pick.has(c.url)) pick.delete(c.url); else pick.add(c.url);
              return { ...st, pick };
            })}>
            <span className={'lc-tick' + (on ? ' is-on' : '')} aria-hidden="true" />
            <span className="lc-staged-main">
              <span className="lc-staged-name">{lodgingTitleFor(c) || 'Unnamed place'}</span>
              <span className="lc-staged-sub">
                {[c.bedrooms ? `${c.bedrooms} bedrooms` : null,
                  c.priceShown != null ? `$${Math.round(c.priceShown).toLocaleString()}` : null]
                  .filter(Boolean).join(' · ') || 'no details on the card'}
              </span>
            </span>
            {/* sleeps is never on a results card — say so rather than leave a
                blank the host reads as "it does not sleep anyone". */}
            <span className="lc-staged-fit">sleeps —</span>
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
      <p className="lc-note">
        “sleeps —” because the results page never carries it. Type it once and the fit count works.
        {staged.dupes ? ` ${staged.dupes} were already on your list.` : ''}
      </p>
      <div className="lc-ctas lc-ctas-wrap">
        <button className="cta" onClick={commitStaged}>Add {staged.pick.size} to the shortlist</button>
        <button className="cta soft" onClick={() => setStaged(null)}>Cancel</button>
      </div>
    </Panel>
  );

  return (
    <>
      <Panel label="THREE DOORS">
        <div className="lc-ctas">
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
        {links[0] && <p className="lc-note">Opens with your own answers already in it — {(links[0].applied || []).join(' · ')}.</p>}
        {!links.length && <p className="lc-note">No doors yet — the town is missing.</p>}
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
        {/* AUTO-READ ON PASTE. The host has already done the work of copying;
            making them press a second button to "read" it is a step that exists
            only because the code wanted one. The paste event fires the
            extraction directly, so the act is: copy, paste, done. The button
            stays for a typed/dragged value and for keyboards that bypass the
            paste event. */}
        <textarea className="lc-field lc-area" rows={4} value={text}
          onChange={(e) => { setText(e.target.value); if (readErr) setReadErr(''); }}
          onPaste={(e) => {
            const pasted = (e.clipboardData && e.clipboardData.getData('text')) || '';
            if (!pasted.trim()) return;
            e.preventDefault();
            setText(pasted);
            add(pasted);
          }}
          placeholder="…or paste it here" aria-label="Paste a listing link or a results page" />
        {/* TRUTHFUL ABOUT WHICH PATH TOUCHES A SERVER. This read "every card on
            it is read, with no server call" — true of a pasted PAGE, which is
            parsed here, and false of a bare LINK, which we fetch. One sentence
            covering both made the honest half carry the dishonest half. */}
        <p className="lc-note">
          Paste the whole results page and every card on it is read right here — nothing
          leaves your phone. A bare link has to be fetched, so it takes a moment.
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
    </>
  );
}

function Weighing({ event, intel, patch }) {
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
                onClick={() => patch({ foodChoices: { ...(event.foodChoices || {}), dest_lodging: a.pick } })}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </Panel>}
      {cmp ? <Transpose cmp={cmp} /> : <Panel label="SIDE BY SIDE">
        <p className="lc-note">One option is not a comparison — add a second and this fills in.</p>
      </Panel>}
      {rec && rec.line && <Panel label="WHAT THE PLAN WOULD PICK">
        <p className="lc-body">{rec.line}</p>
      </Panel>}
      <Panel label="MAKE THE CALL">
        {opts.map((o) => {
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
                    {[(() => { try { const h = lodgingPriceHistory(o); return h ? h.text : null; } catch { return null; } })(),
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
              <span className="lc-opt-main">
                <span className="lc-opt-name">{o.label}</span>
                {(() => {
                  const h = (() => { try { return lodgingPriceHistory(o); } catch { return null; } })();
                  const pv = (() => { try { return lodgingProvenance(o); } catch { return null; } })();
                  const bits = [
                    h ? h.text : null,
                    // Letting the row be pickable must not make it quiet about
                    // what is missing. A place with no picture says so wherever
                    // it appears — the rule was never "hide the gap".
                    noPhoto ? 'no picture yet' : null,
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
        {/* "Why these hotels?" — a plain button at the foot of the list; the
            curation explains itself ON DEMAND rather than preaching up front.
            Every line states what rankCandidates actually did. */}
        {(() => {
          const basis = (() => { try { return lodgingRankBasis(event, intel); } catch { return null; } })();
          if (!basis) return null;
          return (
            <details className="lc-why">
              <summary className="lc-why-sum">Why this order?</summary>
              <ul className="lc-why-list">
                {basis.lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
              <p className="lc-note">{basis.caveat}</p>
            </details>
          );
        })()}
      </Panel>
    </>
  );
}

function Picked({ event, intel, patch }) {
  const chosen = (intel && intel.chosen) || null;
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const [code, setCode] = useState(stay.bookingCode || '');
  if (!chosen) return <Panel label="THE PICK"><p className="lc-note">Nothing picked yet — this is what it will show once one is.</p></Panel>;
  const money = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? `$${Math.round(Number(n)).toLocaleString()}` : '—');
  return (
    <Panel label="THE PICK">
      <p className="lc-strong">{String(chosen.label || '').trim() || 'Your pick'}</p>
      <Rows rows={[
        ['All-in', money(chosen.allIn != null ? chosen.allIn : chosen.totalPrice)],
        ['Sleeps', chosen.sleeps != null ? String(chosen.sleeps) : '—'],
        ['Cancellation', String(chosen.cancellationTier || '').trim() || '—'],
      ]} />
      <p className="lc-note">Choosing is not booking. Book on the platform, then bring the confirmation back.</p>
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
      <div className="lc-row-form">
        <input className="lc-field" placeholder="Booking code" value={code}
          onChange={(e) => setCode(e.target.value)} aria-label="Booking code" />
        <button className="cta" disabled={!code.trim()}
          onClick={() => patch({ lodging: { ...stay, bookingCode: code.trim() } })}>Save the stay details</button>
      </div>
    </Panel>
  );
}

function Booked({ event, patch }) {
  const stay = (event.lodging && typeof event.lodging === 'object') ? event.lodging : {};
  const md = (event.moneyDates && typeof event.moneyDates === 'object') ? event.moneyDates : {};
  const setMd = (k) => (e) => patch({ moneyDates: { ...md, [k]: e.target.value } });
  return (
    <>
      <Panel label="ON THE BOOKS">
        <Rows rows={[
          ['The stay', String(stay.hotelName || '').trim() || '—'],
          ['Booking code', String(stay.bookingCode || '').trim() || '—'],
        ]} />
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
    </>
  );
}

function Transpose({ cmp }) {
  const grid = { gridTemplateColumns: `minmax(92px,1.3fr) repeat(${cmp.columns.length}, minmax(0,1fr))` };
  return (
    <Panel label={`SIDE BY SIDE${cmp.guests ? ` · YOUR ${cmp.guests}` : ''}`}>
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
    </Panel>
  );
}

const Rows = ({ rows }) => rows.map(([l, r]) => (
  <div key={l} className="lc-row"><span className="lc-row-label">{l}</span><span className="lc-row-val">{r}</span></div>
));

const Panel = ({ label, children }) => (
  <section className="lc-panel"><p className="lc-label">{label}</p>{children}</section>
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
  font:500 10px/1 Inter,sans-serif;letter-spacing:0;cursor:pointer;color:var(--faint);}
.lc-step.is-done{color:var(--muted);border-bottom-color:var(--steel-soft);}
.lc-step.is-on{color:var(--ink);border-bottom-color:var(--ok);font-weight:650;}
.lc-h1{font:700 clamp(27px,5.2vw,40px)/1.12 Inter,sans-serif;letter-spacing:-.03em;margin:26px 0 0;text-wrap:balance;}
.lc-why{font:italic 400 clamp(14px,1.9vw,17px)/1.5 Newsreader,Georgia,serif;color:var(--muted);margin:12px 0 0;max-width:52ch;}
.lc-peek{font:400 12px/1.5 Inter,sans-serif;color:var(--muted);margin:16px 0 0;}
.lc-peek strong{color:var(--ink-soft);}
.lc-link{background:none;border:none;color:var(--steel-soft);cursor:pointer;font:500 12px/1 Inter,sans-serif;padding:0 0 0 6px;text-decoration:underline;}
.lc-panel{margin-top:clamp(20px,3vw,30px);}
.lc-picker{border-top:1px solid var(--line);padding-top:14px;}
.lc-label{font:500 10px/1 Inter,sans-serif;letter-spacing:.09em;color:var(--faint);margin:0 0 8px;}
.lc-body{color:var(--ink-soft);margin:0 0 6px;}
.lc-strong{font:650 17px/1.3 Inter,sans-serif;margin:0 0 6px;}
.lc-note{font:400 11px/1.5 Inter,sans-serif;color:var(--faint);margin:10px 0 0;}
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
.lc-ctas .cta{font-size:14px;padding:7px 14px;min-height:34px;position:relative;}
.lc-ctas .cta::after{content:"";position:absolute;left:0;right:0;top:50%;
  height:44px;transform:translateY(-50%);}
/* A rail that must not scroll gets to spread; one that holds two actions wraps
   normally rather than clipping them. */
/* The ONE thing the atom does not say: a door LEAVES. A hairline marks it as
   outbound rather than a filled in-app key. Hover, press and focus all come
   from ".cta" and the global ring — restating them here (as the first cut did)
   was three duplicated rules and a second focus colour. */
.lc-door{border:1px solid var(--line);text-decoration:none;}
.lc-warn{color:var(--warn);}
.lc-demo{color:var(--warn);letter-spacing:.09em;}
.lc-ctas-wrap{flex-wrap:wrap;overflow:visible;-webkit-mask-image:none;mask-image:none;margin-top:12px;}
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
.lc-field{background:var(--card);border:1px solid var(--line);border-radius:10px;color:var(--ink);
  padding:12px 14px;font:400 15px/1.3 Inter,sans-serif;min-height:46px;width:100%;min-width:0;}
.lc-field-sm{max-width:190px;min-height:40px;}
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
.lc-t-head{display:grid;column-gap:8px;align-items:end;}
.lc-t-row{display:grid;column-gap:8px;border-top:1px solid var(--line);padding:10px 0;align-items:baseline;}
.lc-col{font:650 10px/1.2 Inter,sans-serif;letter-spacing:.04em;color:var(--faint);text-align:right;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lc-t-val{font:650 13px/1.35 Inter,sans-serif;text-align:right;color:var(--ink);}
.lc-t-val.is-gap{font-weight:400;color:var(--faint);}
/* GREY, NEVER RED (research rec #7): a house that is too small is
   disqualifying, not faulty. Red here would be a semantic lie under UX_02. */
.lc-t-val.is-short{color:var(--muted);font-weight:400;font-size:12px;}
@container (min-width:900px){
  .lc-grid{grid-template-columns:190px minmax(0,1fr);gap:clamp(28px,4vw,64px);}
  .lc-rail{flex-direction:column;align-items:flex-start;gap:0;position:sticky;top:clamp(20px,4vw,40px);
    overflow-x:visible;-webkit-mask-image:none;mask-image:none;}
  .lc-step{border-bottom:none;border-left:2px solid var(--line);padding:10px 0 10px 12px;width:100%;text-align:left;font-size:12px;letter-spacing:.02em;}
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
  <div className="stagewrap">
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
