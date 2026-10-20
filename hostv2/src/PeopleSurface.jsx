// ─── PEOPLE — the attendance truth, in the hero register ───────────────────
//
// FIRST PRODUCTION SLICE of the NGW redesign. Rules live in
// `@app/lib/attendanceStatement` (pure, 16 tests, red-proofed); this file is
// composition only. See docs/architecture/redesign/.
//
// ── THE CORRECTION THIS FILE IS THE SECOND DRAFT OF (owner, 2026-10-20) ────
//
// The first draft was built from the capability contract and it showed: every
// piece of reasoning the engine holds arrived as prose on the first viewport,
// at body size, with no void. It read as documentation — "utilitarian web app,
// settings/detail screen, CRM guest list" — and the owner stopped it.
//
// THE DIAGNOSIS, from comparing it against the approved direction rather than
// against the old shell (review-shots/marketing/390x844/01-decision-hero.png):
//
//   · THE WRONG REGISTER. I composed with `BigValue` — the 44px ASK-SURFACE
//     atom, correct for a budget editor inside a sheet. The approved hero uses
//     `.mega`, clamp(52-68px)/800/-.045em, and surrounds it with ~450px of
//     void. A domain's first viewport is the hero register, not the ask one.
//   · THE AUDIT BECAME THE UI. `because`, the withholding sentence, the reach
//     sentence and the not-carried-into list all rendered at once. Every one
//     is true; none of them is the first thing a host needs.
//   · NOTHING WAS LOUD. Eight blocks at one size compete, so none wins.
//
// THE RULE THIS FILE NOW FOLLOWS: **preserve the truth, compress the
// explanation.** Nothing true was deleted — the detail moved behind a
// disclosure, which is where the approved direction puts reasoning.
import React from 'react';
import { CtaRow } from './parity/askKit';
import { attendanceStatement } from '@app/lib/attendanceStatement';

/** The quiet "tell me more" affordance — one shared treatment, not per-block. */
function More({ label, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {/* QUIET BY CONSTRUCTION. The first cut used `.mini`, and two bordered
          buttons stacked under the hero read as the primary actions on the
          screen — the opposite of what a disclosure is. This mirrors the
          approved hero's `.whytog`: 11px, steel-soft, no border, no surface. */}
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{
          marginTop: 'var(--sp-2)', background: 'none', border: 'none', padding: '6px 0',
          font: 'inherit', fontSize: 'var(--t-pill)', fontWeight: 650, letterSpacing: '.02em',
          color: 'var(--steel-soft)', cursor: 'pointer', textAlign: 'left',
        }}>
        {open ? 'Less' : label} {open ? '▴' : '▾'}
      </button>
      {open ? <div style={{ marginTop: 'var(--sp-2)' }}>{children}</div> : null}
    </>
  );
}

const Why = ({ children }) => (
  <p className="grounding" style={{ margin: '0 0 6px' }}>{children}</p>
);

/**
 * The attendance zone — People's dominant first viewport.
 *
 * ONE LOUD THING: the figure, in the hero register. The guide voice says how
 * it is going in a single line. Everything else waits.
 *
 * `solemn` carries the day-of 331:61 ruling outward — a repast drops
 * celebratory framing. The tone is read, never re-decided here.
 */
export function AttendanceZone({ event, solemn, onConfirmCount, onOpenRoster }) {
  const s = attendanceStatement(event);

  // VOID IS THE MATERIAL — the doctrine's "about 45 percent void", and the
  // single biggest difference between this and the approved decision hero,
  // which carries roughly 450px above its headline at 390px.
  const Frame = ({ children }) => (
    <div style={{ padding: 'var(--sp-7) 0 calc(var(--sp-7) * 2)' }}>{children}</div>
  );
  const Eyebrow = ({ children }) => (
    <div className="of" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>{children}</div>
  );

  // NOTHING HONEST TO SAY IS A REAL STATE — no figure, no placeholder zero.
  if (!s.known) {
    return (
      <Frame>
        <Eyebrow>Who’s coming</Eyebrow>
        <div className="mega" style={{ color: 'var(--faint)' }}>—</div>
        <p style={{ margin: 0, fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-sub)', color: 'var(--ink-soft)' }}>
          Nobody is counted yet.
        </p>
        {onOpenRoster ? (
          <CtaRow><button className="cta" onClick={onOpenRoster}>Start the guest list</button></CtaRow>
        ) : null}
      </Frame>
    );
  }

  return (
    <Frame>
      <Eyebrow>Who’s coming</Eyebrow>

      {/* THE LOUD THING. `.mega` is the system's display register — the same
          one the approved decision hero uses — and it already carries
          tabular-nums, which a range like "32–46" needs. */}
      <div className="mega" style={solemn ? { fontWeight: 700, fontFamily: 'var(--serif-read)' } : null}>
        {s.figure}
      </div>
      <div className="mega-sub" style={{ color: 'var(--muted)', fontWeight: 600 }}>{s.unit}</div>

      {/* THE GUIDE VOICE — one line, how it is going. Never an instruction. */}
      <p style={{ margin: '2px 0 0', fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-sub)', color: 'var(--ink-soft)' }}>
        {s.headline}
      </p>

      {/* PROVENANCE AS ONE MOMENT, not two paragraphs. The state reads as a
          chip because colour means state here; the full reasoning — including
          the engine's own `because` — waits behind the disclosure. */}
      {s.confirmable ? (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <span className="chip" style={{ background: 'var(--steel-tint)', color: 'var(--steel-soft)', border: 'none', fontSize: 'var(--t-pill)' }}>
            our estimate
          </span>
          <CtaRow>
            <button className="cta" onClick={() => onConfirmCount && onConfirmCount(s.confirmable)}>
              Yes, plan for {s.confirmable}
            </button>
          </CtaRow>
          <More label="Where this number came from">
            {s.because ? <Why>{s.because}</Why> : null}
            <Why>It stays out of anything we send — invites, vendor briefs, the caterer — until you confirm it.</Why>
          </More>
        </div>
      ) : (
        /* Her own number needs no defence on the first view; the reasoning is
           still one tap away for a host who wants it. */
        s.because || s.preparingFor ? (
          <More label="How we got there">
            {s.because ? <Why>{s.because}</Why> : null}
            {s.preparingFor ? (
              <Why>The plan buys for {s.preparingFor} — the larger of your yeses and the number you told us to expect.</Why>
            ) : null}
          </More>
        ) : null
      )}
    </Frame>
  );
}

/**
 * The needs zone — ONE attention moment, not a report.
 *
 * ── THE PRODUCT GAP THIS CLOSES ───────────────────────────────────────────
 *
 * P1-2 normalised "she uses a walker" and wired it to the domains that could
 * act on it. What no surface ever did was SAY SO: `accessNeedsFor` has carried
 * `who: null` — "we were told about a need, not about a person" — since the day
 * it was written.
 *
 * ── A RESOLUTION THIS SLICE DELIBERATELY DOES NOT OFFER ───────────────────
 *
 * The obvious control is "identify the guest", writing the need onto a roster
 * row. It is NOT built, and that was measured rather than assumed:
 * `lodgingIntel.js:2073` sizes the step-free line on
 * `accessNeedsFor(ev).requirements.length` and prints that count as prose —
 * "2 people asked about stairs". `accessNeedsFor` builds requirements from
 * `event.accessNeeds` AND from roster rows WITH NO DEDUPE, so assigning would
 * make the lodging sheet say two people asked about one person. Filling only
 * `who` would make `appliedTo` claim seating while `seatingPlan` — which reads
 * the GUEST ROW — still cannot see it, promising a check that never happens.
 *
 * So this states the unknown and stops. Declared as a bounded gap against all
 * eleven conditions in PEOPLE_ATTENDANCE_PRODUCT_CONTRACT.md §7. Closing it is
 * ENGINE work — a dedupe, or an owner field that does not duplicate the entry —
 * and the control arrives with it, not before.
 *
 * "she" is not a name and this zone never guesses which guest. No diagnosis is
 * inferred: a mobility aid is not evidence of a condition, and `healthNoted`
 * owns health as a separate question.
 */
export function NeedsZone({ needs }) {
  const reqs = (needs && needs.requirements) || [];
  if (!reqs.length) return null;

  // Host language for engine ids. An id with no host name is DROPPED rather
  // than guessed at — the first cut printed `the-day` raw and a capture caught
  // it on screen, which is the developer vocabulary the contract forbids.
  const say = {
    seating: 'who sits where',
    lodging: 'where everyone stays',
    place: 'the venue',
    ground: 'getting around',
    'the-day': 'the day-of plan',
  };
  const unreached = (needs.notYetApplied || []).map((d) => say[d]).filter(Boolean);

  return (
    <div style={{ paddingBottom: 'calc(var(--sp-7) * 2)' }}>
      {reqs.map((r, i) => {
        const named = !!r.who;
        return (
          <div key={i} style={{ marginTop: i ? 'var(--sp-6)' : 0 }}>
            <div className="of" style={{ letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {r.label}
            </div>
            {/* TWO LINES. The consequence, then the unknown — or who it is for.
                Everything else is behind the disclosure. */}
            <p style={{ margin: '6px 0 0', fontSize: 'var(--t-sub)', color: 'var(--ink)', lineHeight: 1.45 }}>
              {named
                ? <>{r.who} needs it.</>
                : <>Someone in your group needs it. We don’t know who yet.</>}
            </p>
            <More label={named ? 'What that changes' : 'What we do know'}>
              {r.phrase ? (
                <p style={{ margin: '0 0 6px', fontFamily: 'var(--serif-read)', fontStyle: 'italic', color: 'var(--ink-soft)', fontSize: 'var(--t-body-s)' }}>
                  “{r.phrase}”
                </p>
              ) : null}
              <Why>
                {named
                  ? 'Their seat and where they stay are both checked against this.'
                  : 'Where everyone stays is already planned around it. A specific seat can’t be until we know who — and we won’t guess.'}
              </Why>
              {unreached.length ? <Why>Not carried into {unreached.join(', ')} yet.</Why> : null}
            </More>
          </div>
        );
      })}
    </div>
  );
}

export default AttendanceZone;
