// BringerPicker — "who's bringing it", picked from the guest list (owner,
// 11/18/2026: "For who's bringing it. Make those drop downs from guest list").
//
// A dropdown of the guests who haven't declined, plus "Someone not on the
// list…", which opens a text field — a dish can come from the church
// kitchen, a neighbor or "the family", and the list is never the only truth.
// With no guest names yet it is the plain text field it always was. A name
// already saved that isn't on the list opens in the text field, unchanged.
import { useRef, useState } from 'react';

export const OTHER = '__other__';

/** Guest names a host can pick from: named, not declined, each once. */
export function bringerNames(guests) {
  const seen = new Set(); const out = [];
  for (const g of Array.isArray(guests) ? guests : []) {
    const n = String((g && g.name) || '').trim();
    if (!n || (g && g.rsvp === 'No')) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(n);
  }
  return out;
}

export default function BringerPicker({ guests, value, onChange, onCommit, onCancel, id, label, autoFocus = false, placeholder = 'A name, as you were told it', style }) {
  const names = bringerNames(guests);
  const v = String(value || '');
  const onList = names.some((n) => n.toLowerCase() === v.trim().toLowerCase());
  const [typing, setTyping] = useState(() => !!v.trim() && !onList);
  const toOther = useRef(false);   // switching to typing is not a tap-away
  if (!names.length || typing) {
    return (
      <span style={{ display: 'inline-flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap', ...style }}>
        <input className="field" id={id} aria-label={label} autoFocus={autoFocus || typing} data-bringer-text
          placeholder={placeholder} value={v}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit && onCommit(v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit && onCommit(v); }
            if (e.key === 'Escape' && onCancel) onCancel();
          }} />
        {names.length > 0 && (
          <button type="button" className="mini" onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setTyping(false); onChange(''); }}>Pick from the guest list</button>
        )}
      </span>
    );
  }
  const current = onList ? names.find((n) => n.toLowerCase() === v.trim().toLowerCase()) : '';
  return (
    <select className="field" id={id} aria-label={label} autoFocus={autoFocus} data-bringer-pick style={style}
      value={current}
      onChange={(e) => {
        const next = e.target.value;
        if (next === OTHER) { toOther.current = true; setTyping(true); onChange(''); return; }
        onChange(next);
        if (onCommit) onCommit(next);
      }}
      onBlur={() => { if (!toOther.current && onCommit) onCommit(current); }}
      onKeyDown={(e) => { if (e.key === 'Escape' && onCancel) onCancel(); }}>
      <option value="">Not named yet</option>
      {names.map((n) => <option key={n} value={n}>{n}</option>)}
      <option value={OTHER}>Someone not on the list…</option>
    </select>
  );
}
