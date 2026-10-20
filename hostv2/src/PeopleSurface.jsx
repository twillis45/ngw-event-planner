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
  return (
    <div style={{
      position: 'relative',
      margin: '0 calc(var(--sp-4) * -1)',          // bleed past the sheet gutter
      padding: hasImage ? '0' : 'var(--sp-7) var(--sp-4) var(--sp-6)',
      minHeight: hasImage ? '38vh' : 0,
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
          {/* THE SCRIM is what makes type over photography legible, and it is
              a composition element rather than a patch: it rises from the
              bottom so the statement sits in deep tone while the image stays
              readable above it. */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, var(--bg) 2%, rgba(0,0,0,.72) 38%, rgba(0,0,0,.28) 70%, rgba(0,0,0,.1) 100%)',
          }} />
          {fixture ? (
            /* NON-PRODUCTION, AND IT SAYS SO. A review fixture that could be
               mistaken for a host's own uploaded cover would be exactly the
               fabricated truth this project forbids. */
            <div style={{
              position: 'absolute', top: 8, right: 'var(--sp-4)', zIndex: 2,
              fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(0,0,0,.6)', color: 'var(--faint)',
            }}>DESIGN FIXTURE — NOT YOUR PHOTO</div>
          ) : null}
        </>
      ) : null}

      <div style={{
        position: 'relative', zIndex: 1, width: '100%',
        padding: hasImage ? 'var(--sp-7) var(--sp-4) var(--sp-5)' : 0,
      }}>
        <div className="of" style={{ letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--steel-soft)' }}>
          People
        </div>
        {/* THE DOMAIN STATEMENT — serif, light, two lines, sentence case,
            full stop. The references' most consistent single element. */}
        <h2 style={{
          margin: '6px 0 0',
          fontFamily: 'var(--serif-read)', fontOpticalSizing: 'auto',
          fontWeight: 500, fontSize: 'clamp(30px,9vw,40px)', lineHeight: 1.08,
          letterSpacing: '-.015em', color: 'var(--ink)', textWrap: 'balance',
        }}>
          Know who’s coming.
        </h2>
        <p style={{
          margin: '10px 0 0', maxWidth: '30ch',
          fontSize: 'var(--t-body-s)', lineHeight: 1.5, color: 'var(--ink-soft)',
        }}>
          {name ? `Replies, needs and who’s bringing whom for ${name}.`
            : 'Replies, needs and who’s bringing whom — in one place.'}
        </p>
      </div>
    </div>
  );
}

/* ── ORIENTATION: what is true, and how certain ───────────────────────────
 *
 * Directly beneath the editorial opening, so the host never scrolls a hero to
 * reach the number. The word for `confirmed` is chosen by
 * `attendanceStatement` from the BASIS, because on a settled headcount the
 * engine reports `confirmed: n` with nobody having replied.
 */
export function AttendanceTruth({ event, solemn, onConfirmCount }) {
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

  return (
    <div style={{ padding: 'var(--sp-6) 0 var(--sp-5)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="mega" style={{ margin: 0, ...(solemn ? { fontFamily: 'var(--serif-read)', fontWeight: 600 } : null) }}>
          {s.figure}
        </span>
        <span style={{ fontSize: 'var(--t-sub)', fontWeight: 600, color: 'var(--muted)' }}>{s.unit}</span>
      </div>
      <p style={{ margin: '4px 0 0', fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-sub)', color: 'var(--ink-soft)' }}>
        {s.headline}
      </p>

      {s.confirmable ? (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <span className="chip" style={{ background: 'var(--steel-tint)', color: 'var(--steel-soft)', border: 'none', fontSize: 'var(--t-pill)' }}>
            our estimate
          </span>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <button className="cta" onClick={() => onConfirmCount && onConfirmCount(s.confirmable)}>
              Yes, plan for {s.confirmable}
            </button>
            <button onClick={() => setWhy((o) => !o)} aria-expanded={why}
              style={{ background: 'none', border: 'none', padding: '6px 0', font: 'inherit', fontSize: 'var(--t-pill)', fontWeight: 650, color: 'var(--steel-soft)', cursor: 'pointer' }}>
              {why ? 'Less' : 'Why this number'}
            </button>
          </div>
          {why ? (
            <div style={{ marginTop: 'var(--sp-2)' }}>
              {s.because ? <p className="grounding" style={{ margin: '0 0 6px' }}>{s.because}</p> : null}
              <p className="grounding" style={{ margin: 0 }}>
                It stays out of anything we send — invites, vendor briefs, the caterer — until you confirm it.
              </p>
            </div>
          ) : null}
        </div>
      ) : (s.because || s.preparingFor) ? (
        <>
          <button onClick={() => setWhy((o) => !o)} aria-expanded={why}
            style={{ marginTop: 'var(--sp-2)', background: 'none', border: 'none', padding: '6px 0', font: 'inherit', fontSize: 'var(--t-pill)', fontWeight: 650, color: 'var(--steel-soft)', cursor: 'pointer' }}>
            {why ? 'Less' : 'How we got there'}
          </button>
          {why ? (
            <div style={{ marginTop: 'var(--sp-2)' }}>
              {s.because ? <p className="grounding" style={{ margin: '0 0 6px' }}>{s.because}</p> : null}
              {s.preparingFor ? (
                <p className="grounding" style={{ margin: 0 }}>
                  The plan buys for {s.preparingFor} — the larger of your yeses and the number you told us to expect.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
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

export default PeopleHero;
