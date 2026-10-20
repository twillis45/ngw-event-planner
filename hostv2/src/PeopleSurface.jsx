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
export function PeopleHero({ event, src, fixture, statement }) {
  const name = String((event && event.name) || '').trim();
  const hasImage = !!src;

  // The domain statement. Fixed, because it is the domain's identity rather
  // than a status — the same way the references' "Right people. Right roles.
  // Less stress." does not change with the data.
  // §14: the band's HEIGHT and the statement's MEASURE are the two things that
  // must not simply scale with the viewport, so both are handed to CSS
  // (`.people-hero`, styles.css) where a media query can hold them. 38vh is the
  // references' mobile proportion and it is wrong at 1440x1024, where it buys a
  // 389px-tall photograph above a 40px line of type.
  return (
    <div className={'people-hero' + (hasImage ? ' people-hero--img' : '')} style={{
      position: 'relative',
      margin: '0 calc(var(--sp-4) * -1)',          // bleed past the sheet gutter
      padding: hasImage ? '0' : 'var(--sp-7) var(--sp-4) var(--sp-6)',
      display: 'flex', alignItems: 'flex-end',
      overflow: 'hidden',
      borderRadius: 0,
    }}>
      {hasImage ? (
        <>
          <img src={src} alt="" aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 40%',
          }} />
          {/* ── THE TRANSITION, IN TWO LAYERS (owner §12, 2026-10-20) ────────
              It was one gradient doing two incompatible jobs: making type
              legible over a photograph, and handing the photograph off to the
              page. In dark mode those jobs happen to agree, because the page is
              already near-black. IN LIGHT MODE THEY DO NOT — the single ramp
              went from rgba(0,0,0,.72) to a near-white `--bg` inside 2% of the
              band, which is not a transition but a seam, and the statement sat
              on it in `--ink`, i.e. near-black type on a near-black veil.

              So: the VEIL is for legibility and is the same in both themes,
              because type over a photograph is light type over a photograph —
              the image is its own surface and does not take the page's
              foreground. The HAND-OFF is a short, separate dissolve into
              `--bg` at the very bottom edge, long enough not to read as a cut
              and short enough not to grey out the lower third of the picture.
              The references do the same thing: a defined photographic band,
              then the operational surface. */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.52) 34%, rgba(0,0,0,.18) 66%, rgba(0,0,0,.04) 100%)',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', left: 0, right: 0, bottom: -1, height: 28,
            background: 'linear-gradient(to top, var(--bg), rgba(0,0,0,0))',
          }} />
          {fixture ? (
            /* NON-PRODUCTION, AND IT SAYS SO. A review fixture that could be
               mistaken for a host's own uploaded cover would be exactly the
               fabricated truth this project forbids. */
            <div style={{
              position: 'absolute', top: 8, right: 'var(--sp-4)', zIndex: 2,
              fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(0,0,0,.6)', color: 'rgba(255,255,255,.78)',
            }}>DESIGN FIXTURE — NOT YOUR PHOTO</div>
          ) : null}
        </>
      ) : null}

      <div className="people-hero-say" style={{
        position: 'relative', zIndex: 1, width: '100%',
        padding: hasImage ? 'var(--sp-7) var(--sp-4) var(--sp-5)' : 0,
      }}>
        {/* OVER A PHOTOGRAPH, THE FOREGROUND IS THE PHOTOGRAPH'S, NOT THE
            PAGE'S. `--ink` is near-black in light mode and would be invisible
            on the veil above; `--steel-soft` likewise loses the eyebrow. These
            three values are the only place in this file that steps outside the
            tokens, and the reason is structural rather than stylistic: the band
            has its own luminance regime. Measured against the veil's darkest
            stop (rgba(0,0,0,.78) over the fixture) all three clear AA. */}
        <div className="of" style={{ letterSpacing: '.14em', textTransform: 'uppercase', color: hasImage ? 'rgba(255,255,255,.76)' : 'var(--steel-soft)' }}>
          People
        </div>
        {/* THE DOMAIN STATEMENT — serif, light, two lines, sentence case,
            full stop. The references' most consistent single element. */}
        <h2 style={{
          margin: '6px 0 0',
          fontFamily: 'var(--serif-read)', fontOpticalSizing: 'auto',
          fontWeight: 500, fontSize: 'clamp(30px,9vw,40px)', lineHeight: 1.08,
          letterSpacing: '-.015em', color: hasImage ? '#FBF8F3' : 'var(--ink)', textWrap: 'balance',
        }}>
          Know who’s coming.
        </h2>
        <p style={{
          margin: '10px 0 0', maxWidth: '30ch',
          fontSize: 'var(--t-body-s)', lineHeight: 1.5,
          color: hasImage ? 'rgba(255,255,255,.82)' : 'var(--ink-soft)',
        }}>
          {name ? `Replies, needs and who’s bringing whom for ${name}.`
            : 'Replies, needs and who’s bringing whom — in one place.'}
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
export function AttendanceDecision({ event, solemn, onConfirmCount, onAdjust, adjusting, detail }) {
  const s = attendanceStatement(event);
  const [why, setWhy] = React.useState(false);
  if (!s.known) {
    return (
      <div style={{ padding: 'var(--sp-6) 0 var(--sp-5)' }}>
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
    <div style={{ padding: 'var(--sp-6) 0 var(--sp-5)' }}>
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
            <button className="mini" onClick={() => onAdjust && onAdjust(!adjusting)} aria-expanded={!!adjusting}>
              {adjusting ? 'Done' : 'Use a different number'}
            </button>
          </div>
          {adjusting ? <div style={{ marginTop: 'var(--sp-3)' }}>{detail}</div> : null}
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
          {(s.because || s.preparingFor) ? (
            <More label={s.standing === 'replied' ? 'What’s behind this' : 'How we got there'}>
              {s.because ? <p className="grounding" style={{ margin: '0 0 6px' }}>{s.because}</p> : null}
              {s.preparingFor ? (
                <p className="grounding" style={{ margin: '0 0 6px' }}>
                  The plan buys for {s.preparingFor} — the larger of your yeses and the number you told us to expect.
                </p>
              ) : null}
              {detail}
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
  const reqs = (needs && needs.requirements) || [];
  const open = reqs.filter((r) => r && !r.who);
  const known = reqs.filter((r) => r && r.who);
  if (!open.length && !known.length) return null;

  const Row = ({ mark, title, note }) => (
    <div style={{ display: 'flex', gap: 10, padding: '9px 0', alignItems: 'flex-start' }}>
      <span aria-hidden="true" style={{ color: 'var(--steel-soft)', fontSize: 13, lineHeight: '20px', flex: '0 0 auto' }}>{mark}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--t-row)', color: 'var(--ink)', lineHeight: 1.35 }}>{title}</div>
        {note ? (
          <div style={{ marginTop: 2, fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-body-s)', color: 'var(--ink-soft)' }}>
            {note}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0 0 var(--sp-6)' }}>
      {known.length ? (
        <>
          <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>Accounted for</div>
          {known.map((r, i) => (
            <Row key={'k' + i} mark="✓" title={`${r.who} needs ${String(r.label).toLowerCase()}`}
              note="Their seat and where they stay are both checked against it." />
          ))}
        </>
      ) : null}

      {open.length ? (
        <>
          <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase', marginTop: known.length ? 'var(--sp-4)' : 0 }}>
            Still unknown
          </div>
          {open.map((r, i) => (
            <Row key={'o' + i} mark="○"
              title={<>Who needs {String(r.label).toLowerCase()}</>}
              note={r.phrase ? `“${r.phrase}” — we won’t guess which person.` : 'We won’t guess which person.'} />
          ))}
        </>
      ) : null}
    </div>
  );
}

/* ── ONE MOVE ─────────────────────────────────────────────────────────────
 *
 * The references' "Why we're recommending this" register: ✦ glyph, short bold
 * title, ONE line, and the action beside it. One attention moment per screen.
 *
 * ── WHERE THE MOVE COMES FROM, AND WHERE IT MAY NOT ─────────────────────
 *
 * `eventPlan()` IS THE SOLE FINAL NEXT-ACTION AUTHORITY (owner §7). This
 * component ranks nothing. The shell hands it the FIRST item eventPlan already
 * ranked whose `domain` is 'guests' — a filter over an existing order, not a
 * second order — and if the engine has nothing for People, People shows nothing
 * rather than inventing a chore to fill the slot.
 *
 * Why a filter is not a ranking: changing `domain === 'guests'` to any other
 * predicate cannot REORDER what eventPlan returned, only shorten it. A
 * People-local engine would have to score, and scoring is what the one
 * prioritizer exists to prevent two of.
 */
export function OneMove({ move, onGo }) {
  if (!move) return null;
  const title = String(move.title || '').trim();
  if (!title) return null;
  const line = String(move.ask || move.why || move.consequence || '').trim();
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: 'var(--sp-4)', margin: '0 0 var(--sp-5)',
      background: 'var(--steel-tint)', borderRadius: 'var(--r-md)',
    }}>
      <span aria-hidden="true" style={{ color: 'var(--steel-soft)', fontSize: 13, lineHeight: '20px', flex: '0 0 auto' }}>✦</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 'var(--t-row)', fontWeight: 650, color: 'var(--ink)', lineHeight: 1.3 }}>{title}</div>
        {line && line !== title ? (
          <div style={{ marginTop: 3, fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-body-s)', color: 'var(--ink-soft)' }}>{line}</div>
        ) : null}
        {onGo ? (
          <button className="mini" style={{ marginTop: 'var(--sp-3)' }} onClick={onGo}>Take care of it</button>
        ) : null}
      </div>
    </div>
  );
}

/* ── GET RESPONSES ────────────────────────────────────────────────────────
 *
 * OWNER §10: *"the actions should be outcome-first… the outcome is GET
 * RESPONSES. Share link / QR / preview are mechanisms."*
 *
 * So the block states the outcome, then the reply-by as the outcome it buys
 * (§11: *"a reliable final headcount in time"* — not a date field), and the
 * six existing drafts and links sit underneath as what they are. Not one of
 * them changed behaviour: `children` is the shell's own `.pill-grid`, passed
 * through verbatim, because every one of those handlers is a real integration
 * whose truthfulness is already classified under UX_07.
 */
export function GetResponses({ invited, outstanding, replyBy, isPast, onSetReplyBy, deadlineOpen, children, editor }) {
  const n = Number(outstanding) || 0;
  const asked = Number(invited) || 0;
  const by = replyBy && replyBy.iso
    ? new Date(replyBy.iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  // THE OUTCOME, in host language. Never a count the host cannot move: when
  // everyone has answered there is no chasing to do and this says so.
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

  return (
    <div style={{ margin: 'var(--sp-6) 0 var(--sp-3)' }}>
      <div className="of" style={{ letterSpacing: '.1em', textTransform: 'uppercase' }}>
        {n > 0 || !asked ? 'Get responses' : 'Invites'}
      </div>
      <p style={{
        margin: '4px 0 var(--sp-3)', maxWidth: '34ch',
        fontFamily: 'var(--serif-read)', fontStyle: 'italic',
        fontSize: 'var(--t-sub)', lineHeight: 1.35, color: 'var(--ink-soft)',
      }}>{line}</p>
      {!isPast ? (
        <div style={{ margin: '0 0 var(--sp-3)' }}>
          {/* §11: the deadline is framed by what it BUYS, never as a field with
              a date in it. And it is still never invented — `replyBy.iso` is
              only read when the host actually set one, the same gate the guest
              invite has used since 2026-07-14. */}
          <button className="mini" onClick={onSetReplyBy} aria-expanded={!!deadlineOpen}>
            {deadlineOpen ? 'Done' : by ? `Replies close ${by} — change it` : 'Set a date you need the final number by'}
          </button>
          {deadlineOpen ? editor : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default PeopleHero;
