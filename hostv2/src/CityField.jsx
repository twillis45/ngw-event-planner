import { useMemo, useState } from 'react';

// City / ZIP field with its own key-less suggestion dropdown. V2 had autocomplete
// on the VENUE field but not on the CITY field beside it — so the moment the app
// BLOCKED the host for a missing town, it stopped helping them type one. Worse,
// saveCity() rejects a bare city outright ("Springfield" could be any state), so
// the host was blocked, unaided, and then refused. Suggestions emit "City, ST",
// which is exactly the shape saveCity accepts.
//
// Ported from the legacy CityField (App.js): the ~29.7k-entry US city list in
// lib/usCitiesFull, lazy-loaded so it never bloats the bundle, and a CUSTOM
// dropdown rather than a native <datalist> — the native one is unreliable on
// mobile (host report 2026-06-12: "autocomplete not working on mobile").
// A ZIP still passes through as free text; the parse/reject rule is unchanged.
export default function CityField({ value, onChange, onPick, onEnter, onBlur, placeholder, ariaLabel, style, inputStyle, className = 'field', id }) {
  const [cities, setCities] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => {
    if (cities) return;
    import('@app/lib/usCitiesFull').then(m => setCities(m.default || m)).catch(() => setCities([]));
  };
  const q = String(value || '').trim().toLowerCase();
  const matches = useMemo(() => {
    // 2-char floor: below that every list entry matches and the dropdown is noise.
    if (!cities || q.length < 2 || /^\d/.test(q)) return [];   // a ZIP needs no list
    const out = [];
    for (const c of cities) {
      if (c.toLowerCase().startsWith(q)) { out.push(c); if (out.length >= 8) break; }
    }
    // Fall back to substring so "annap" and "md" both find something.
    if (out.length < 8) {
      for (const c of cities) {
        if (out.length >= 8) break;
        if (!out.includes(c) && c.toLowerCase().includes(q)) out.push(c);
      }
    }
    return out;
  }, [cities, q]);
  const show = open && matches.length > 0 && matches[0].toLowerCase() !== q;
  return (
    <div style={{ position: 'relative', flex: 1, ...style }}>
      <input id={id} className={className} style={inputStyle} value={value} placeholder={placeholder}
        aria-label={ariaLabel} autoComplete="off" onBlur={onBlur}
        onFocus={() => { load(); setOpen(true); }}
        onChange={e => { load(); setOpen(true); onChange(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { setOpen(false); onEnter(e.target.value); } }} />
      {show && (
        <div style={{ marginTop: 6 }}>
          {matches.map((c, si) => (
            <button key={si} type="button" className="later-row"
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 2px' }}
              onClick={() => { setOpen(false); onPick ? onPick(c) : onChange(c); }}>
              <span className="t" style={{ color: 'var(--ink-soft)', fontWeight: 550 }}>{c}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
