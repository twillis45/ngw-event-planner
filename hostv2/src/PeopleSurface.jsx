// ─── PEOPLE — the domain, composed to the art direction ────────────────────
//
// THIRD DRAFT. The first was built from the capability contract and read as
// documentation. The second fixed the register but had no art direction to work
// from. This one is composed against the owner's reference set, extracted in
// docs/architecture/redesign/ART_DIRECTION_GRAMMAR.md.
//
// THE GRAMMAR, in the order the references use it:
//
//   EDITORIAL OPENING   photographic field · domain eyebrow · SERIF statement · deck
//          ↓
//   ORIENTATION         what is true right now, and how certain we are
//          ↓
//   STILL UNKNOWN       truthful uncertainty as a LABELLED LIST, never prose
//          ↓
//   OPERATIONAL         the roster — quiet, fast, and not styled like this file
//
// WHY THE SERIF CARRIES THE DOMAIN STATEMENT. `styles.css:751` already rules
// that "the serif is the whole HUMAN voice — the event NAME (identity) joins the
// guide voice". A domain statement is identity, so it is the human voice, so it
// is serif. The references only change its SCALE and POSITION, not which family
// speaks — which is why this is an extension of the production doctrine rather
// than a second one.
//
// WHAT THE REFERENCES SHOW THAT THIS FILE DELIBERATELY DOES NOT COPY (owner
// ruling: art direction is authoritative, obsolete implementation detail is
// not): warm tan/brass accents → steel, because gold is on the locked palette's
// never-reintroduce list; a mobile bottom tab bar → Nav B; full-page domains
// under a horizontal top nav → composed inside the existing sheet. All recorded
// in ART_DIRECTION_GRAMMAR.md §7 with the conflict stated rather than hidden.
import React from 'react';
import { attendanceStatement } from '@app/lib/attendanceStatement';

/* ── THE EDITORIAL OPENING ────────────────────────────────────────────────
 *
 * PHOTOGRAPHY IS STRUCTURAL HERE, not decoration: it carries event identity and
 * the emotional register, and it hands off to operational truth immediately
 * beneath. Measured from the references, the field is ~38-45% of a 390x844
 * viewport — enough to establish the event, never enough to bury the headcount.
 *
 * ── WHERE THE IMAGE COMES FROM, AND WHAT THIS FILE MAY NOT DO ───────────
 *
 * The canonical source is HOST-SUPPLIED EVENT COVER MEDIA. That field does not
 * exist yet and the media pipeline is NOT authorized, so this component only
 * ever READS a forward-compatible `event.coverImageUrl` and NEVER writes one.
 *
 * `fixtureSrc` is a review-only override, passed from a URL parameter, used to
 * judge the image-present composition before the pipeline exists. It is never
 * persisted, never written to the event, and is marked on screen so it cannot
 * masquerade as production truth. No stock photography is bundled, and the
 * image-absent state is the DEFAULT rather than a fallback.
 */
export function PeopleHero({ event, src, fixture }) {
  const name = String((event && event.name) || '').trim();
  const hasImage = !!src;

  // ── THE PLATE, NOT A HERO (parity pass, measured 2026-10-20) ─────────────
  //
  // Measured off the reference sheets rather than recalled: across nine frames
  // (three sheets x three breakpoints x six Place states) the composition is
  // always DARK TOP PLATE -> hard edge -> operational field. The plate carries
  // the photograph AND the statement; it is dark in every frame, including the
  // frames whose body is ivory.
  //
  // What that corrected, in order of size:
  //
  //   1. THE PLATE IS A SURFACE, NOT A SCRIM. The previous cut dissolved the
  //      photograph into `--bg`, so in light mode the band faded to near-white
  //      and there was no plate at all — one surface from the top of the page
  //      to the bottom. The reference has a hard edge there, and that edge is
  //      what makes the thing read as a masthead over a body.
  //   2. THE PHOTOGRAPH WAS 2.5x TOO TALL. Measured on the phone frames the
  //      photograph is ~127px of 844 (~15%) with the statement BELOW it on the
  //      same dark ground, ~288px of plate in total (~34%). The previous cut
  //      ran 38vh (~321px) of photograph with the statement laid over it, so
  //      the first viewport ended at the deck and no operational content
  //      reached the screen at all.
  //   3. THE COMPOSITION TRANSFORMS, IT DOES NOT SHRINK. Mobile stacks
  //      (photograph, then statement on dark). Desktop overlays the statement
  //      on the LEFT of a full-bleed photograph behind a left-to-right
  //      gradient. Those are two compositions, not one scaled.
  //
  // The image-absent state is the DEFAULT — no host-supplied cover media
  // pipeline exists — and it is the plate without the photographic band, which
  // is a deliberate state rather than a fallback.
  return (
    <div className={'people-plate' + (hasImage ? ' people-plate--img' : '')}>
      {hasImage ? (
        <div className="people-plate-img">
          <img src={src} alt="" aria-hidden="true" />
          {/* On mobile this only has to keep the photograph from fighting the
              plate it sits on; on desktop it also has to carry type, so the
              gradient runs from the left there. Both are the photograph's own
              luminance regime, not the page's. */}
          <div className="people-plate-veil" aria-hidden="true" />
          {fixture ? (
            /* NON-PRODUCTION, AND IT SAYS SO. A review fixture that could be
               mistaken for a host's own uploaded cover would be exactly the
               fabricated truth this project forbids. */
            <div className="people-plate-fix">DESIGN FIXTURE — NOT YOUR PHOTO</div>
          ) : null}
        </div>
      ) : null}

      <div className="people-plate-say">
        <div className="people-plate-eyebrow">People</div>
        {/* THE DOMAIN STATEMENT — serif, light, sentence case, full stop. The
            reference set's most consistent single element, and the one piece of
            this surface that never changes with the data. */}
        <h2 className="people-plate-h">Know who’s coming.</h2>
        <p className="people-plate-deck">
          {name
            ? `Replies, needs and who’s bringing whom for ${name}. Everything about your guests in one place.`
            : 'Replies, needs and who’s bringing whom — everything about your guests in one place.'}
        </p>
      </div>
    </div>
  );
}

/* ── THE ATTENDANCE DECISION ──────────────────────────────────────────────
 *
 * ORIENTATION, in the references' three-movement structure: it sits directly
 * beneath the editorial opening so the host never scrolls a hero to reach the
 * number. The word for `confirmed` is chosen by `attendanceStatement` from the
 * BASIS, because on a settled headcount the engine reports `confirmed: n` with
 * nobody having replied — one field, two meanings.
 *
 * OWNER NOTE THAT DROVE THIS REWRITE: the estimate state "is semantically
 * valuable but visually becomes a configuration form… the decision is the
 * story. The controls support the decision."
 *
 * The previous cut led with a band and then handed over a stepper, a kids
 * stepper and three buttons — a form. The host's actual job in that state is
 * ONE decision: *what number am I planning around?* So the composition is
 *
 *     what we estimate   →   what we recommend   →   accept or adjust
 *
 * and the +/- controls only appear once she chooses to adjust.
 *
 * TWO STATES, DIFFERENT JOBS (§6). An estimate is a decision waiting to be
 * made; an active RSVP is a situation to read. They share the system and the
 * atoms, and they do NOT share emphasis:
 *
 *     basis 'estimate'  the recommendation is the hero, with one accept
 *     basis 'rsvp'      the standing is the hero, and what is still out
 *     basis 'count'     settled — quiet, with a way back in
 *
 * WHAT IS NOT EXPOSED BY DEFAULT (§4). +1s, kids and covers are real and the
 * engine knows them, but they are SUPPORTING EXPLANATION, not the decision.
 * They moved behind the same disclosure as the reasoning. Nothing was deleted
 * — `confirmedCovers` and `kidsTotal` still drive food and seating exactly as
 * before; they simply stopped narrating themselves on the primary surface.
 */
export function AttendanceDecision({ event, solemn, onConfirmCount, onAdjust, adjusting }) {
  const s = attendanceStatement(event);
  const [why, setWhy] = React.useState(false);
  if (!s.known) {
    return (
      <div className="people-tight" style={{ padding: 'var(--sp-6) 0 var(--sp-5)' }}>
        <div className="mega" style={{ color: 'var(--faint)' }}>—</div>
        <p style={{ margin: 0, fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-sub)', color: 'var(--ink-soft)' }}>
          Nobody is counted yet.
        </p>
      </div>
    );
  }

  const estimate = s.standing === 'expected' && s.confirmable;
  const Fig = ({ children }) => (
    <span className="mega" style={{ margin: 0, ...(solemn ? { fontFamily: 'var(--serif-read)', fontWeight: 600 } : null) }}>{children}</span>
  );
  const Guide = ({ children }) => (
    <p style={{ margin: '4px 0 0', fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-sub)', color: 'var(--ink-soft)' }}>{children}</p>
  );
  const More = ({ label, children }) => (
    <>
      <button onClick={() => setWhy((o) => !o)} aria-expanded={why}
        style={{ marginTop: 'var(--sp-3)', background: 'none', border: 'none', padding: '6px 0', font: 'inherit', fontSize: 'var(--t-pill)', fontWeight: 650, color: 'var(--steel-soft)', cursor: 'pointer' }}>
        {why ? 'Less' : label}
      </button>
      {why ? <div style={{ marginTop: 'var(--sp-2)' }}>{children}</div> : null}
    </>
  );

  return (
    <div className="people-tight" style={{ padding: 'var(--sp-6) 0 var(--sp-5)' }}>
      {estimate ? (
        <>
          {/* THE DECISION, not the form. The recommended number is the hero;
              the band is its evidence, one line above. */}
          <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Plan around
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Fig>{s.confirmable}</Fig>
            <span style={{ fontSize: 'var(--t-sub)', fontWeight: 600, color: 'var(--muted)' }}>guests</span>
          </div>
          <Guide>We’d expect {s.figure} on the day. Nobody has replied yet.</Guide>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <button className="cta" onClick={() => onConfirmCount && onConfirmCount(s.confirmable)}>
              Plan for {s.confirmable}
            </button>
            {/* Rendered only where the control it reveals actually exists. */}
            {onAdjust ? (
              <button className="mini" onClick={() => onAdjust(!adjusting)} aria-expanded={!!adjusting}>
                {adjusting ? 'Done' : 'Use a different number'}
              </button>
            ) : null}
          </div>
          <More label="Why this number">
            {s.because ? <p className="grounding" style={{ margin: '0 0 6px' }}>{s.because}</p> : null}
            <p className="grounding" style={{ margin: 0 }}>
              It stays out of anything we send — invites, vendor briefs, the caterer — until you confirm it.
            </p>
          </More>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Fig>{s.figure}</Fig>
            <span style={{ fontSize: 'var(--t-sub)', fontWeight: 600, color: 'var(--muted)' }}>{s.unit}</span>
          </div>
          <Guide>{s.headline}</Guide>
          {/* §3: "What's behind this" was a label for NGW's reasoning, and
              sitting one line above the One Move card it read as that card's
              heading. These name what the disclosure actually CONTAINS — who is
              counted — so it attaches upward to the number instead of downward
              to the consequence. */}
          {(s.because || s.preparingFor) ? (
            <More label={s.standing === 'replied' ? 'Who’s counted' : 'How that’s counted'}>
              {s.because ? <p className="grounding" style={{ margin: '0 0 6px' }}>{s.because}</p> : null}
              {s.preparingFor ? (
                <p className="grounding" style={{ margin: '0 0 6px' }}>
                  The plan buys for {s.preparingFor} — the larger of your yeses and the number you told us to expect.
                </p>
              ) : null}
            </More>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ── STILL UNKNOWN ────────────────────────────────────────────────────────
 *
 * The references productize truthful uncertainty as a LABELLED LIST — the
 * Understanding step's "You want / Still unknown" columns — not as a paragraph
 * explaining the system's reasoning. That is the register an unowned access
 * need belongs in, and it is the single biggest compression available here:
 * the previous draft spent four sentences saying what one labelled row says.
 *
 * ── THE RESOLUTION THIS SLICE STILL DOES NOT OFFER ──────────────────────
 *
 * "Identify guest" is NOT built, measured rather than assumed:
 * `lodgingIntel.js:2073` sizes the step-free line on
 * `accessNeedsFor(ev).requirements.length` and prints that count as prose —
 * "2 people asked about stairs". `accessNeedsFor` builds requirements from
 * `event.accessNeeds` AND from roster rows WITH NO DEDUPE, so assigning a
 * host-stated need to a guest makes the lodging sheet say two people asked
 * about one person. Declared as a bounded gap against all eleven conditions in
 * PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md §7. Closing it is engine work, and the
 * control arrives with it — not before.
 *
 * No diagnosis is inferred. "she" is not a name, and no roster person is
 * attached to a need by proximity, order, or being the likely honoree.
 */
export function StillUnknown({ needs }) {
  const [openIds, setOpenIds] = React.useState({});
  const reqs = (needs && needs.requirements) || [];
  const open = reqs.filter((r) => r && !r.who);
  const known = reqs.filter((r) => r && r.who);
  if (!open.length && !known.length) return null;

  // ── FOUND IN A DESKTOP FRAME, NOT IN THE CODE ──────────────────────────
  // On a five-guest fixture this rendered one row per requirement and read
  // fine. On a 75-guest roster it rendered FIVE rows that each said "<name>
  // needs step-free access" over the identical sentence "Their seat and where
  // they stay are both checked against it." — a wall of prose claiming to be a
  // labelled list, which is the exact register §18 exists to protect.
  //
  // So accounted-for needs group by WHAT IS NEEDED, which is what the host is
  // actually scanning for, and the names come back on tap. One row per kind of
  // need, however many people share it. The grouping changes presentation only:
  // every requirement is still present, still named, still unguessed.
  const byLabel = (list) => {
    const m = new Map();
    for (const r of list) {
      const k = String(r.label || '').toLowerCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return [...m.entries()];
  };

  const Row = ({ mark, title, note, onToggle, expanded, children }) => (
    <div style={{ padding: '9px 0' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span aria-hidden="true" style={{ color: 'var(--steel-soft)', fontSize: 13, lineHeight: '20px', flex: '0 0 auto' }}>{mark}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 'var(--t-row)', color: 'var(--ink)', lineHeight: 1.35 }}>{title}</div>
          {note ? (
            <div style={{ marginTop: 2, fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-body-s)', color: 'var(--ink-soft)' }}>
              {note}
            </div>
          ) : null}
          {onToggle ? (
            <button className="pr-quiet" aria-expanded={!!expanded} onClick={onToggle}>
              {expanded ? 'Hide who' : 'Who'}
            </button>
          ) : null}
          {expanded ? children : null}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 0 var(--sp-4)' }}>
      {known.length ? (
        <>
          <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>Accounted for</div>
          {byLabel(known).map(([k, group]) => {
            const label = String(group[0].label || '').toLowerCase();
            const one = group.length === 1;
            return (
              <Row key={'k' + k} mark="✓"
                title={one ? `${group[0].who} needs ${label}` : `${group.length} people need ${label}`}
                note="Their seat and where they stay are both checked against it."
                onToggle={one ? null : () => setOpenIds((m) => ({ ...m, [k]: !m[k] }))}
                expanded={!one && !!openIds[k]}>
                <div style={{ marginTop: 4, fontSize: 'var(--t-body-s)', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {group.map((r) => r.who).join(' · ')}
                </div>
              </Row>
            );
          })}
        </>
      ) : null}

      {open.length ? (
        <>
          <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase', marginTop: known.length ? 'var(--sp-4)' : 0 }}>
            Still unknown
          </div>
          {byLabel(open).map(([k, group]) => {
            const label = String(group[0].label || '').toLowerCase();
            // The phrases are the host's OWN words and may differ between two
            // requirements of the same kind, so they are all kept — joined, not
            // dropped, and still never attached to a person.
            const phrases = group.map((r) => r.phrase).filter(Boolean);
            return (
              <Row key={'o' + k} mark="○"
                title={group.length === 1 ? `Who needs ${label}` : `Who needs ${label} (${group.length} mentions)`}
                note={phrases.length
                  ? `${phrases.map((x) => '\u201c' + x + '\u201d').join(' \u00b7 ')} — we won’t guess which person.`
                  : 'We won’t guess which person.'} />
            );
          })}
        </>
      ) : null}
    </div>
  );
}

/* ── ONE MOVE ─────────────────────────────────────────────────────────────
 *
 * OWNER §3, 2026-10-20: *"'What's behind this' is vague and makes the
 * intelligence sound like an explanation of the system… LEAD WITH THE HOST
 * CONSEQUENCE, NOT WITH A LABEL FOR NGW'S REASONING."*
 *
 * Two changes came out of that, and only one of them is here.
 *
 * The orphan label was NOT this component — it was `AttendanceDecision`'s
 * disclosure toggle sitting one line above, so "What's behind this" read as a
 * heading for the card below it. That is fixed at its source.
 *
 * Here, the consequence leads WITHOUT an extra heading. The owner offered
 * "NEEDS ATTENTION" as the alternative and I did not take it: this screen
 * already carries two eyebrows (PLAN AROUND, STILL UNKNOWN) and a third would
 * make it read as a stack of labelled sections rather than a composition. The
 * attention signal is carried by the steel rule and the tinted ground instead
 * of by a word, which is how the reference set marks its own
 * "Why we're recommending this" moments.
 *
 * ── WHERE THE MOVE COMES FROM, AND WHERE IT MAY NOT ─────────────────────
 *
 * `eventPlan()` IS THE SOLE FINAL NEXT-ACTION AUTHORITY (owner §7). This
 * component ranks nothing. The shell hands it the FIRST item eventPlan already
 * ranked whose `domain` is 'guests' — a filter over an existing order, not a
 * second order — and if the engine has nothing for People, People shows nothing
 * rather than inventing a chore to fill the slot.
 *
 * ── THE CTA (owner §12) ──────────────────────────────────────────────────
 *
 * *"CTA only when an exact, useful destination exists. Do not route the user
 * back to the surface they are already on. If no exact destination exists, no
 * fake CTA. Record the gap."*
 *
 * So `cta`/`onGo` arrive already resolved: the shell runs the engine item's
 * route through the production `resolveRoute()` and passes a handler ONLY when
 * that resolves to a real landing that is not this sheet. No route, an
 * unroutable one, or one that lands back on Guests → the consequence is stated
 * and nothing pretends to be a door.
 */
export function OneMove({ move, cta, onGo }) {
  if (!move) return null;
  const title = String(move.title || '').trim();
  if (!title) return null;
  const line = String(move.ask || move.why || move.consequence || '').trim();
  return (
    <div className="people-move">
      <span className="people-move-glyph" aria-hidden="true">✦</span>
      <div className="people-move-body">
        {/* THE CONSEQUENCE LEADS. The reference's band is captioned "Why we're
            recommending this" — which is precisely the label for NGW's own
            reasoning the owner ruled out ("LEAD WITH THE HOST CONSEQUENCE, NOT
            WITH A LABEL EXPLAINING NGW'S REASONING"). So this takes the
            reference's FORM — glyph, short bold title, one line, the action
            beside it rather than under it — and the owner's CONTENT rule. */}
        <div className="people-move-t">{title}</div>
        {line && line !== title ? <div className="people-move-l">{line}</div> : null}
      </div>
      {onGo && cta ? (
        <button className="cta people-move-cta" onClick={onGo}>{cta} →</button>
      ) : null}
    </div>
  );
}

/* ── THE SECTION HEADER ───────────────────────────────────────────────────
 * Measured from the reference: every operational section opens with a SERIF
 * heading on the left and its one action on the right — "Your team by
 * category / Add vendor →". The implementation had no section header at all,
 * so the roster began with a filter toolbar, which is how an operational
 * surface starts reading as a table rather than as a part of a page.
 */
export function SectionHead({ title, note, action }) {
  return (
    <div className="people-sechead">
      <div style={{ minWidth: 0 }}>
        <h3 className="people-sechead-h">{title}</h3>
        {note ? <div className="people-sechead-n">{note}</div> : null}
      </div>
      {action ? (
        <button className="mini people-sechead-a" onClick={action.onClick}>{action.label} →</button>
      ) : null}
    </div>
  );
}

/* ── GET RESPONSES ────────────────────────────────────────────────────────
 *
 * OWNER §24, 2026-10-20: *"The current full mobile view exposes too many peer
 * actions… Design around the OUTCOME: GET RESPONSES. Choose the highest-value /
 * current action as dominant. Move less-frequent mechanisms into secondary
 * actions, disclosure, overflow, contextual availability. Do NOT delete
 * capability. Do NOT bury capability so deeply that it becomes effectively
 * lost."*
 *
 * Seven equal `.mini` buttons in a 2-up grid is not a hierarchy, it is an
 * inventory. All seven survive, in three tiers:
 *
 *   DOMINANT    one full-width CTA, chosen by STATE, not by taste
 *   SECONDARY   the two a host reaches for in the same moment, quiet and inline
 *   DISCLOSURE  the rest, one tap away behind a labelled fold — not an overflow
 *               menu, because a labelled fold says what is inside it
 *
 * WHY THE TIERS ARE PASSED IN RATHER THAN DECIDED HERE: every one of these
 * labels is classified under UX_07 ("a CTA says exactly what happens when you
 * tap it") and wired to a real handler in the shell. This component decides
 * EMPHASIS. It never re-labels, re-points or re-classifies an action, and it
 * cannot drop one — `more` renders whatever it is given.
 *
 * ── §11 · THE DEADLINE IS FRAMED BY WHAT IT BUYS ─────────────────────────
 *
 * Not a date field with a Change button. `replyBy` arrives ONLY when the host
 * actually set one (`source === 'override'`); a derived `event.date − 7d` is
 * never spoken, which is the 2026-07-14 defect this surface reintroduced once
 * and is now pinned against.
 */
export function GetResponses({
  invited, outstanding, replyBy, isPast, onSetReplyBy, deadlineOpen, editor,
  primary, secondary, more,
}) {
  const [open, setOpen] = React.useState(false);
  const n = Number(outstanding) || 0;
  const asked = Number(invited) || 0;
  const by = replyBy && replyBy.iso
    ? new Date(replyBy.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  // NOBODY ASKED IS NOT EVERYONE ANSWERED. A host on a headcount has no roster
  // and no outstanding replies, and a block telling her "everyone has answered"
  // would be stating a fact about people who were never invited.
  const line = !asked
    ? 'Nobody has been invited yet — the link below is how they get asked.'
    : n > 0
      ? (by
        ? `A final headcount by ${by} means ${n === 1 ? 'one more reply' : n + ' more replies'}.`
        : `${n === 1 ? 'One person hasn’t' : n + ' people haven’t'} answered yet.`)
      : 'Everyone has answered.';

  const rest = (more || []).filter(Boolean);

  return (
    <div style={{ margin: 'var(--sp-6) 0 var(--sp-3)' }}>
      <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>
        {n > 0 || !asked ? 'Get responses' : 'Invites'}
      </div>
      <p style={{
        margin: '4px 0 var(--sp-4)', maxWidth: '34ch',
        fontFamily: 'var(--serif-read)', fontStyle: 'italic',
        fontSize: 'var(--t-sub)', lineHeight: 1.35, color: 'var(--ink-soft)',
      }}>{line}</p>

      {primary ? (
        <button className="cta" style={{ width: '100%', marginBottom: 'var(--sp-3)' }} onClick={primary.onClick}>
          {primary.label}
        </button>
      ) : null}

      {(secondary || []).filter(Boolean).length ? (
        <div className="pr-acts" style={{ marginBottom: 'var(--sp-3)' }}>
          {(secondary || []).filter(Boolean).map((a) => (
            <button key={a.label} className="mini" onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      ) : null}

      {!isPast ? (
        <div style={{ margin: '0 0 var(--sp-3)' }}>
          <button className="pr-quiet" onClick={onSetReplyBy} aria-expanded={!!deadlineOpen}>
            {deadlineOpen ? 'Done' : by ? `Replies close ${by} — change it` : 'Set a date you need the final number by'}
          </button>
          {deadlineOpen ? editor : null}
        </div>
      ) : null}

      {rest.length ? (
        <>
          <button className="fold-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            More ways to reach people
            <span className="chev" aria-hidden="true">{open ? '⌄' : '›'}</span>
          </button>
          {open ? (
            <div className="pr-acts" style={{ marginTop: 'var(--sp-2)' }}>
              {rest.map((a) => <button key={a.label} className="mini" onClick={a.onClick}>{a.label}</button>)}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ── §26 · THE DESKTOP CONTEXTUAL RAIL, STATE A ───────────────────────────
 *
 * OWNER: *"Use the existing ~340px desktop rail. Do NOT leave it as unexplained
 * empty acreage. Do NOT turn it into another dashboard. STATE A — nothing
 * selected: restrained People/event context… Do not duplicate the main
 * column."*
 *
 * STATE B is not this component. Selecting a guest renders the shell's OWN
 * `.gdetail` panel into the same grid track — the production detail surface,
 * unchanged, with its radiogroup, meal picker, contact fields and helper roles
 * intact. Rebuilding it here would have duplicated several hundred lines of
 * wired JSX to gain nothing, and would have created exactly the second source
 * of truth §33 forbids. The two states are mutually exclusive by construction:
 * the shell renders this only while nothing is open, so they can never both
 * claim `grid-column:2`.
 *
 * ── WHY THIS IS PERSISTENCE AND NOT DUPLICATION ─────────────────────────
 *
 * The rail is STICKY. Everything in it is already on screen at the top of the
 * page and gone by the time the host is forty rows into a 75-guest roster —
 * which is the precise moment she needs to remember whose event this is and how
 * many have answered. ART_DIRECTION_GRAMMAR §4 records the same reasoning from
 * the reference set: *"The event photograph lives here permanently — this is
 * how identity persists once the hero has scrolled away."*
 *
 * ── WHAT IS DELIBERATELY NOT IN IT ──────────────────────────────────────
 *
 * The One Move. It is listed as permitted rail content, but it derives from the
 * attendance truth it sits beneath and reads as a consequence of it; lifted
 * into the rail it becomes a floating notification, and left in both places it
 * is the duplication the owner ruled out. It stays in the main column at every
 * width. Recorded rather than silently decided.
 */
export function PeopleRail({ event, subtitle, counts, unknowns }) {
  const s = attendanceStatement(event);
  const name = String((event && event.name) || '').trim();
  const rows = (counts || []).filter((r) => r && Number(r.n) > 0);

  return (
    <aside className="people-rail" aria-label="Event context">
      {/* NO COVER IMAGE HERE, DELIBERATELY. The plate above spans the full
          width and carries the event's photography; repeating it 24px to the
          right put two photographic modules at the same height with no
          hierarchy between them. The reference's own desktop rail ("Team at a
          glance") carries no photograph either — it carries counts. */}
      <div style={{
        fontFamily: 'var(--serif-read)', fontWeight: 500,
        fontSize: 'var(--t-sub)', lineHeight: 1.2, color: 'var(--ink)',
      }}>{name || 'Your event'}</div>
      {subtitle ? (
        <div style={{ marginTop: 2, fontSize: 'var(--t-body-s)', color: 'var(--faint)' }}>{subtitle}</div>
      ) : null}

      {/* NO SECOND COPY OF THE FIGURE. The main column carries it at display
          size three inches to the left; repeating it here was the duplication
          §26 rules out, and it pushed the one thing the rail uniquely offers —
          the breakdown — further down. Identity and counts only. */}
      {/* The reply breakdown is the one thing here that is NOT on screen while
          the roster is scrolled: on mobile it lives in the lens chips above the
          list, which leave the viewport immediately. Counted over the WHOLE
          roster, not the filtered view — a pinned number that changed when you
          typed in the search box would be worse than no number. */}
      {rows.length ? (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          {rows.map((r) => (
            <div className="prl-row" key={r.label}>
              <span className="prl-k">{r.label}</span>
              <span className="prl-v">{r.n}</span>
            </div>
          ))}
        </div>
      ) : null}

      {unknowns > 0 ? (
        <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--line-soft)' }}>
          <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>Still unknown</div>
          <div style={{ marginTop: 2, fontSize: 'var(--t-body-s)', color: 'var(--ink-soft)' }}>
            {unknowns === 1 ? 'One need with no name on it.' : unknowns + ' needs with no name on them.'}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export default PeopleHero;
