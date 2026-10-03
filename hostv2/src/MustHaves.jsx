// ── WHAT THE HOUSE HAS TO HAVE, ON THE SCREEN THAT USES IT ────────────────
// Host, 2026-10-02: "how are the musts chosen and shouldn't the host be able
// to confirm or add musts before search?"
//
// They could — on a different surface. This control lived inline in
// HostShellV2 and LodgingCockpit had ZERO references to must-haves, while the
// cockpit's Go look tab is where the three search doors are. So the list that
// shapes the search was editable somewhere the host was not standing.
//
// Worse than a convenience gap, because three of these are REAL SEARCH
// PARAMETERS, not ranking hints:
//     hottub -> amenities[]=25 · pool -> amenities[]=7 · pets -> pets=1
// Those are baked into the Airbnb and Vrbo URLs the host opens. The rest have
// search: null and only steer the ranking afterwards. A host pressing a door
// was having their search narrowed by a list they had not been shown.
//
// Extracted rather than copied. CLAUDE.md forbids duplicate surfaces, and the
// req-* classes live in styles.css, which main.jsx loads for both trees — so
// one component renders identically in both places.
import {
  LODGING_MUST_HAVES, mustHaveBasis, mustHavesFor, suggestedMustHaves,
} from '@app/lib/lodgingIntel';

/**
 * @param event    the event, read for its own list or for what to suggest
 * @param onChange (nextIds) => void — each shell persists its own way
 * @param style    optional wrapper style, so each host keeps its spacing
 */
export default function MustHaves({ event, onChange, style }) {
  const basis = mustHaveBasis(event);
  const on = mustHavesFor(event).map((m) => m.id);
  const toggle = (id) => onChange(on.includes(id) ? on.filter((x) => x !== id) : [...on, id]);
  const chosen = LODGING_MUST_HAVES.filter((m) => on.includes(m.id));
  const rest = LODGING_MUST_HAVES.filter((m) => !on.includes(m.id));

  // The engine's reason for each item, read whether or not the host has since
  // edited the list — a requirement does not stop having a reason because the
  // host added one of their own next to it.
  const whyFor = {};
  try { for (const s of suggestedMustHaves(event)) whyFor[s.id] = s.why; } catch (_e) { /* rows still render */ }

  // Naming two of seven is an arbitrary pair that reads like the list only
  // half-loaded. The count is the honest one-line answer.
  const summary = chosen.length
    ? `${chosen.length} thing${chosen.length === 1 ? '' : 's'}`
    : 'anything';
  const filtering = chosen.filter((m) => m.search);

  return (
    <>
    {/* OPEN AT REST (host 2026-10-03, same breath as the property list).
        These are the requirements the search is about to be filtered BY, and
        two of them now change the Airbnb URL — so a host who never taps the
        fold books against criteria they were never shown. "8 things ▾" names
        a count, not the things, and a count cannot be disagreed with.
        The fold stays, because a host who has read them and wants the screen
        back can shut it. Only the default changed. */}
    <details className="lodge-req" open style={style || { margin: '2px 0 10px' }}>
      {/* centred, not baseline: the row now carries a real tap floor, and
          baseline would strand the text at the top of it. */}
      <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="of">Has to have{basis === 'suggested' ? ' · from your event' : ''}</span>
        <span className="v-meta" style={{ color: chosen.length ? 'var(--ink-soft)' : 'var(--muted)' }}>
          {summary} ▾
        </span>
      </summary>

      <ul className="req-list">
        {chosen.map((m) => (
          <li key={m.id}>
            <button type="button" className="req-row" aria-pressed="true"
              onClick={() => toggle(m.id)}
              aria-label={`${m.label} — asked for${m.search ? ', and it filters the search' : ''}. Tap to drop it.`}>
              <span className="req-tick" aria-hidden="true">✓</span>
              <span className="req-body">
                <span className="req-label">
                  {m.label}
                  {m.search && <span className="req-filters"> · filters the search</span>}
                </span>
                {whyFor[m.id] && <span className="req-why">{whyFor[m.id]}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {chosen.length === 0 && (
        <p className="grounding" style={{ margin: '8px 0 0' }}>
          Nothing required — every place will pass. Add what matters below.
        </p>
      )}

      {rest.length > 0 && (
        <>
          <div className="of" style={{ margin: '12px 0 6px' }}>Add if you want it</div>
          <div className="chips">
            {rest.map((m) => (
              <button key={m.id} type="button" className="chip" aria-pressed="false"
                onClick={() => toggle(m.id)}
                aria-label={`Add ${m.label} to what the house needs${m.search ? ' — it filters the search' : ''}`}>
                + {m.label}{m.search ? ' ·' : ''}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="grounding" style={{ margin: '10px 0 0', color: 'var(--muted)' }}>
        Yours to change. Sources under You &amp; settings → Grounding.
      </p>
    </details>

    {/* ── WHICH ONES ACTUALLY NARROW THE SEARCH ────────────────────────────
        OUTSIDE the <details>, and that is the whole point. The first cut put
        this inside it and the fold is shut by default, so the one sentence a
        host needs BEFORE pressing a door was the one sentence they could not
        see — I claimed it rendered at rest without opening the page to check.
        Named in words, never colour alone (UX_02). */}
    {filtering.length > 0 && (
      <p className="grounding lc-filters-note">
        {filtering.length === 1
          ? `${filtering[0].label} narrows the search itself — the doors below open already filtered to it.`
          : `${filtering.map((m) => m.label).join(' and ')} narrow the search itself — the doors below open already filtered to them.`}
        {' '}The rest sort what comes back; they do not hide anything.
      </p>
    )}
    </>
  );
}
