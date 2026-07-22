import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// PARITY KIT — the locked Studio-Matte ask-surface atoms.
//
// WHY THIS EXISTS: every propose/decision/ask surface was hand-rolling the same
// atoms (eyebrow, big value, grounded "why", accept/change CTA, tier rows) with
// inline spacing. When a Figma board moved, someone re-matched spacing/type on
// each surface BY EYE — that is the piecemeal treadmill (budget number drifted
// 40 vs 44; day-of pencilled its own gaps). This module is ONE definition of the
// type + structure, composed by every surface, so a Figma change lands in one
// place. Density (comfortable hero/sheet vs compact card) is a per-context prop,
// NOT a fork of the atom.
//
// Derived from the two Figma-matched surfaces: budget 344:61 (B1/B2/B3) and
// day-of 331:61 (propose banner). New ask surface → compose these, never
// hand-style. Governs the parity manifest in ./MANIFEST.md.
// ─────────────────────────────────────────────────────────────────────────────

// The locked comfortable rhythm (Figma 344:61 B1): eyebrow→value 6, value→why 14,
// why→cta 20, cta→foot 16. Compact card surfaces (day-of banner) pass smaller gaps.
export const ASK_RHYTHM = { eyebrowToValue: 6, valueToWhy: 14, whyToCta: 20, ctaToFoot: 16 };
export const ASK_COMPACT = { eyebrowToValue: 6, valueToWhy: 6, whyToCta: 8, ctaToFoot: 8 };

// Tone gate — the day-of ruling 331:61 state 3. `solemn` (repast/memorial) leans
// the value serif and mutes the eyebrow; consumers ALSO read tone to drop counts
// and soften verbs. `ok` = a settled/green confirm. Default = boss voice.
const TONE = {
  default: { eyebrow: null, value: 'var(--ink)', serifValue: false },
  ok: { eyebrow: 'var(--ok)', value: 'var(--ink)', serifValue: false },
  steel: { eyebrow: 'var(--steel-soft)', value: 'var(--ink)', serifValue: false },
  solemn: { eyebrow: 'var(--muted)', value: 'var(--ink)', serifValue: true },
};
const toneOf = (t) => TONE[t] || TONE.default;

export function AskColumn({ children, style }) {
  return (
    <div className="hc-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, ...style }}>
      {children}
    </div>
  );
}

// The small caps label above the value ("A number to plan around", "Now").
export function Eyebrow({ children, tone = 'default', style }) {
  const c = toneOf(tone).eyebrow;
  return <span className="of" style={{ ...(c ? { color: c } : null), ...style }}>{children}</span>;
}

// The big grounded value — budget number, day-of clock. One type scale (44/750/-.03em),
// serif-leaning under a solemn tone. Optional muted suffix ("Typical", "PM").
export function BigValue({ children, suffix, tone = 'default', gap = ASK_RHYTHM.eyebrowToValue, style }) {
  const t = toneOf(tone);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: gap }}>
      <span style={{
        fontSize: 44, fontWeight: t.serifValue ? 600 : 750, letterSpacing: '-.03em', lineHeight: 1,
        color: t.value, ...(t.serifValue ? { fontFamily: 'var(--serif-read)' } : null), ...style,
      }}>{children}</span>
      {suffix ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{suffix}</span> : null}
    </div>
  );
}

// The EDITABLE BigValue — the same locked scale (44/750/-.03em) as the display
// atom, as a number input for count steppers (host "feels unbalanced", 2026-07-22
// W6). Width tracks the digits; suffix matches BigValue's. The locked 44 is
// already guarded by check-parity's BigValue rule; keep the scale HERE only.
export function BigValueInput({ value, onChange, onFocus, onCommit, suffix, ariaLabel, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
      <input className="bigval-input" type="number" inputMode="numeric" min="1" aria-label={ariaLabel}
        value={value} onChange={onChange} onFocus={onFocus}
        onKeyDown={(e) => { if (e.key === 'Enter' && onCommit) onCommit(); }}
        onBlur={onCommit}
        style={{
          fontSize: 44, fontWeight: 750, letterSpacing: '-.03em', lineHeight: 1,
          color: 'var(--ink)', background: 'none', border: 'none', padding: 0,
          width: Math.max(2, String(value ?? '').length) + 'ch', textAlign: 'center',
          fontVariantNumeric: 'tabular-nums', ...style,
        }} />
      {suffix ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{suffix}</span> : null}
    </span>
  );
}

// The guide voice — Newsreader italic (Figma 344:61 B3). An instruction/reassurance,
// not a fact. Keep it honest: never promise capability the engine lacks.
export function GuideLine({ children, gap = ASK_RHYTHM.eyebrowToValue, style }) {
  return (
    <p style={{ margin: `${gap}px 0 0`, fontFamily: 'var(--serif-read)', fontStyle: 'italic', fontSize: 'var(--t-input)', color: 'var(--ink-soft)', ...style }}>
      {children}
    </p>
  );
}

// The grounded "why" — sans reasoning (`.grounding`). Configurable gap so a compact
// card can tighten it without forking the atom.
export function Grounding({ children, gap = ASK_RHYTHM.valueToWhy, style }) {
  return <p className="grounding" style={{ margin: `${gap}px 0 0`, ...style }}>{children}</p>;
}

// The accept/change row — primary CTA + optional secondary. `gap` = distance above.
export function CtaRow({ children, gap = ASK_RHYTHM.whyToCta, style }) {
  return <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginTop: gap, ...style }}>{children}</div>;
}

// SettledRow — the fold-behind-Change atom. A single SETTLED choice (one value,
// ≥3 options or wrapping chips) collapses to one hairline row: label left, the
// current value + chevron right; tapping (onOpen) reveals the real picker, which
// the consumer renders when its section flag is set. Binary toggles and active
// "decide it now" surfaces stay inline — see parity/MANIFEST "Fold-behind-Change".
// The chevron IS the change affordance (no redundant "Change" word), matching the
// budget/vendors/food disclosure rows already live. `tone='ok'` greens a resolved
// value. Composes the same .fstat hairline treatment those rows use.
export function SettledRow({ label, value, onOpen, tone = 'default', style }) {
  const vc = tone === 'ok' ? 'var(--ok)' : 'var(--steel-soft)';
  return (
    <button className="fstat" onClick={onOpen} style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', ...style }}>
      <span className="fstat-l">{label}</span>
      <span className="fstat-v" style={{ color: vc }}>{value}<span className="fstat-chev" aria-hidden="true">›</span></span>
    </button>
  );
}

// SettledCard — the section-level fold. Where SettledRow collapses a single
// settled value to one hairline row, SettledCard collapses a whole settled
// MULTI-FIELD section (a stay form, an airport pick, a transport call) into one
// two-line summary card: title (the chosen thing) over a muted detail line, with
// the change chevron on the right. Tapping (onOpen) reveals the real form, which
// the consumer renders when its section flag is set — same loop as SettledRow.
// Used by the travel roster sheets (lodging/air/ground): the settings fold, the
// roster stays. `tone='ok'` greens the title. See MANIFEST "Fold-behind-Change".
export function SettledCard({ title, sub, action, onOpen, tone = 'default', style }) {
  const tc = tone === 'ok' ? 'var(--ok)' : 'var(--ink)';
  return (
    <button className="settled-card" onClick={onOpen} style={style}>
      <span className="settled-card-main">
        <span className="settled-card-title" style={{ color: tc }}>{title}</span>
        {sub ? <span className="settled-card-sub">{sub}</span> : null}
      </span>
      <span className="settled-card-end">
        {action ? <span className="settled-card-action">{action}</span> : null}
        <span className="fstat-chev" aria-hidden="true">›</span>
      </span>
    </button>
  );
}

// OptionList — the calm OPEN-picker idiom. Where SettledRow/SettledCard fold a
// SETTLED choice to a value line, an OPEN single-value picker (or an active
// add-flow) renders as a quiet vertical radio-list: a hairline row per option,
// a dot that fills on the selected one, hairline dividers between. This replaces
// the horizontal `.chip`/`.pill-grid` pill clusters (the "wall of pills"). Each
// option is { label, value?, sub? } — value defaults to label. `onPick(value)`.
export function OptionList({ options, value, onPick, ariaLabel, style }) {
  return (
    <div className="optlist" role="radiogroup" aria-label={ariaLabel} style={style}>
      {(options || []).map((o) => {
        const val = o.value !== undefined ? o.value : o.label;
        const sel = val === value;
        return (
          <button key={String(val)} type="button" className={'optrow' + (sel ? ' on' : '')}
            role="radio" aria-checked={sel} onClick={() => onPick(val)}>
            <span className="optdot" aria-hidden="true" />
            <span className="optlabel">{o.label}</span>
            {o.sub ? <span className="optsub">{o.sub}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// A full-width selectable tier row (Figma 344:61 B3) — label left, amount right,
// selected highlight, our-pick dot. amount omitted → label-only row.
export function TierRow({ label, amount, selected, pick, onClick, ariaLabel }) {
  return (
    <button aria-pressed={!!selected} aria-label={ariaLabel} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '13px 16px', borderRadius: 'var(--r-md)', width: '100%', textAlign: 'left',
      border: '1px solid ' + (selected ? 'var(--steel-soft)' : 'var(--line)'),
      background: selected ? 'var(--steel-tint)' : 'transparent',
      color: 'var(--ink)', font: 'inherit', cursor: 'pointer',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {pick && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--steel-soft)', flexShrink: 0 }} />}
        <span style={{ fontWeight: 650 }}>{label}</span>
        {pick && <span className="of" style={{ color: 'var(--muted)' }}>· our pick</span>}
      </span>
      {amount != null && <span style={{ fontWeight: 750, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{amount}</span>}
    </button>
  );
}
