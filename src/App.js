import { useState, useEffect, useRef, createContext, useContext, useMemo, Component, Fragment } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

// ─── Design tokens ────────────────────────────────────────────────────────────
// Themes — add new themes here; ThemeCtx distributes the active one.
const DARK = {
  bg:       '#0f0f11',
  surface:  '#18181c',
  surface2: '#1e1e24',
  border:   '#2a2a32',
  accent:   '#4a90d9',
  accent2:  '#14b8a6',
  text:     '#e8e8f0',
  muted:    '#9090a8',
  danger:   '#e63946',
  success:  '#22c55e',
  warn:     '#f59e0b',
};

const LIGHT = {
  bg:       '#f8f8fa',   // clean near-white — neutral, not tinted
  surface:  '#ffffff',   // pure white cards
  surface2: '#f1f1f5',   // neutral hover/secondary surface
  border:   '#e2e2ea',   // light neutral gray — NOT purple; lets accent pop
  accent:   '#1a6fba',   // steel blue — the primary accent
  accent2:  '#0891b2',   // cyan-600 — blue-leaning teal, clearly distinct from green and amber
  text:     '#111118',   // near-black
  muted:    '#71707e',   // neutral gray — clearly secondary, not competing with accent
  danger:   '#ef4444',   // red-500 — 4.6:1 on white, vivid alert-red (not maroon)
  success:  '#16a34a',   // green-600 — 3.3:1 on white, reads as green (not dark forest)
  warn:     '#f59e0b',   // amber-500 — vivid amber, same as dark theme, pops at large sizes
};

// Module-level C = DARK so every existing component referencing C directly
// gets correct tokens. When full per-component theme support is needed,
// swap each component to const C = useT() instead.
const C = DARK;

// Style factory — call makeS(C) inside components that need live theming.
// Module-level s = makeS(C) keeps backward compat for all existing components.
const makeS = (C) => {
  const isLight = C.surface === '#ffffff';
  return {
    app: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' },
    header: {
      padding: '28px 32px 0',
      borderBottom: `1px solid ${C.border}`,
      boxShadow: isLight ? '0 1px 0 #e2e2ea' : 'none',
    },
    tabs: { display: 'flex', gap: 2, overflowX: 'auto' },
    tab: (a) => ({
      padding: '10px 18px', cursor: 'pointer', fontSize: 13,
      fontWeight: a ? 600 : 500,
      borderRadius: '8px 8px 0 0', border: 'none',
      background: a ? (isLight ? C.accent + '14' : C.surface) : 'transparent',
      color: a ? (isLight ? C.accent : C.text) : C.muted,
      borderTop: a ? `2px solid ${C.accent}` : '2px solid transparent',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }),
    sideTab: (a) => ({
      display: 'block', width: '100%', padding: '10px 16px', cursor: 'pointer',
      fontSize: 13, fontWeight: a ? 700 : 500, border: 'none', borderRadius: 8, textAlign: 'left',
      background: a ? (isLight ? C.accent + '18' : C.accent + '18') : 'transparent',
      color: a ? C.accent : C.muted,
      borderLeft: a ? `3px solid ${C.accent}` : '3px solid transparent',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }),
    body: { padding: '28px 32px' },
    card: {
      background: isLight ? 'linear-gradient(175deg, #ffffff 0%, #f3f3f7 100%)' : C.surface,
      border: `1px solid ${isLight ? 'rgba(0,0,0,0.09)' : C.border}`,
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 16,
      // 4-layer shadow: hairline edge → contact → lift → ambient
      boxShadow: isLight
        ? '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06), 0 14px 32px rgba(0,0,0,0.04)'
        : 'none',
    },
    cardTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, margin: '0 0 14px' },
    input: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, padding: '7px 12px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, sans-serif" },
    btn: (v = 'default') => ({
      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif",
      background: v === 'primary' ? C.accent
        : v === 'danger'  ? (isLight ? C.danger  : C.danger  + '1e')   // light: solid red; dark: tinted
        : v === 'teal'    ? (isLight ? C.accent2 + '59' : C.accent2 + '1e')
        : v === 'success' ? (isLight ? C.success + '59' : C.success + '1e')
        : v === 'ghost'   ? 'transparent'
        : (isLight ? C.surface2 : C.border),
      color: v === 'primary' ? '#fff' : v === 'danger' ? (isLight ? '#fff' : C.danger) : v === 'teal' ? C.accent2 : v === 'success' ? C.success : v === 'ghost' ? C.muted : C.text,
    }),
    pill: (color) => ({
      display: 'inline-block', padding: '2px 9px', borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', lineHeight: '18px',
      // Cylindrical tube physics — both themes: solid color base, white specular at top, shadow at base
      background: isLight
        ? [`linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.10) 38%, rgba(0,0,0,0.00) 62%, rgba(0,0,0,0.10) 100%)`, color].join(', ')
        : color + '33',
      color: isLight ? '#fff' : color,
      border: isLight ? 'none' : `1px solid ${color}55`,
      boxShadow: isLight
        ? `inset 0 1.5px 0 rgba(255,255,255,0.50), inset 0 -1.5px 0 rgba(0,0,0,0.14), 0 1px 3px ${color}55, 0 3px 8px ${color}22`
        : `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 6px ${color}22`,
    }),
    statNum: (color) => {
      const c = color || C.text;
      const shadow = isLight
        ? (color ? `0 1px 3px ${color}2a, 0 2px 6px ${color}14` : '0 1px 2px rgba(0,0,0,0.07)')
        : (color ? `0 0 18px ${color}55` : 'none');
      return { fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: c, textShadow: shadow };
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px 10px 0', borderBottom: `1px solid ${C.border}` },
    td: { padding: '11px 10px 11px 0', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' },
  };
};
// Note: module-level s removed — all components use const s = makeS(C) inside their body.

// ─── 3D sphere helper ─────────────────────────────────────────────────────────
// Returns inline style for a matte 3D circle. Pass color as full hex string.
// textSz: font-size in px for initials (omit for dot-only use).
const mkSphere = (color, size, textSz = null) => ({
  width: size, height: size, borderRadius: '50%', flexShrink: 0,
  // 3-layer gradient stack (all solid-base so no background bleed on dark):
  //   1. Crisp elliptical specular highlight at upper-left
  //   2. Subtle rim light at lower-right (ambient bounce)
  //   3. Linear darkening toward bottom-right (shadow side)
  background: [
    `radial-gradient(ellipse 50% 28% at 33% 27%, rgba(255,255,255,0.65) 0%, transparent 100%)`,
    `radial-gradient(ellipse 30% 18% at 68% 75%, rgba(255,255,255,0.12) 0%, transparent 100%)`,
    `linear-gradient(145deg, ${color} 0%, ${color}bb 100%)`,
  ].join(', '),
  boxShadow: `0 2px 4px rgba(0,0,0,0.28), 0 6px 16px ${color}55, 0 1px 0 rgba(255,255,255,0.08) inset`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  ...(textSz ? { fontSize: textSz, fontWeight: 700, color: '#fff' } : {}),
});

// Dot version — small bullet circles (no text, no flex needed)
const mkDot = (color, size) => ({
  width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
  background: [
    `radial-gradient(ellipse 52% 30% at 33% 27%, rgba(255,255,255,0.70) 0%, transparent 100%)`,
    `linear-gradient(145deg, ${color} 0%, ${color}bb 100%)`,
  ].join(', '),
  boxShadow: `0 1px 3px rgba(0,0,0,0.26), 0 2px 6px ${color}55`,
});

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif", color: '#b91c1c' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#44447a', marginBottom: 20 }}>{this.state.error.message}</div>
          <button onClick={() => this.setState({ error: null })}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a6fba', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Theme + breakpoint context ───────────────────────────────────────────────
const ThemeCtx = createContext({ C: DARK, theme: 'dark', setTheme: () => {} });
const useT = () => useContext(ThemeCtx).C;

// ─── Toast notification ───────────────────────────────────────────────────────
// Usage inside any component: const showToast = useToast(); showToast('Done!');
const ToastCtx  = createContext({ showToast: () => {} });
const useToast  = () => useContext(ToastCtx).showToast;

// ─── Claude AI ────────────────────────────────────────────────────────────────
const AICtx = createContext(''); // stores the planner's Anthropic API key
const useAIKey = () => useContext(AICtx);

async function askClaude(apiKey, prompt, { maxTokens = 700, onChunk, signal } = {}) {
  if (!apiKey) throw new Error('no-key');
  const streaming = !!onChunk;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      stream: streaming,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`${res.status}: ${t}`); }
  if (streaming) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try { const d = JSON.parse(line.slice(6)); if (d.type === 'content_block_delta' && d.delta?.text) { full += d.delta.text; onChunk(full); } } catch {}
      }
    }
    return full;
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// Small reusable AI button — shows spinner while loading
function AIBtn({ onClick, loading, label = '✨ AI', style: xtra }) {
  const C = useT();
  const aiKey = useAIKey();
  if (!aiKey) return null; // hidden if no key configured
  return (
    <button onClick={onClick} disabled={loading} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, cursor: loading ? 'wait' : 'pointer', fontSize: 11, fontWeight: 600, color: C.muted, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: loading ? 0.6 : 1, flexShrink: 0, ...xtra }}>
      {loading ? <span style={{ display: 'inline-block', width: 10, height: 10, border: `2px solid ${C.muted}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : '✨'} {loading ? 'Working…' : label}
    </button>
  );
}

function GlobalStyles() {
  useEffect(() => {
    const id = 'ngw-ai-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(el);
  }, []);
  return null;
}

function Toast({ msg, variant = 'success', onDone }) {
  const C = useT();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  const clr = variant === 'danger' ? C.danger : variant === 'warn' ? C.warn : C.success;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 300,
      padding: '11px 18px', borderRadius: 10,
      background: C.surface2, border: `1px solid ${clr}66`,
      color: C.text, fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: C.surface === '#ffffff' ? '0 4px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)' : '0 4px 24px rgba(0,0,0,0.28)', pointerEvents: 'none',
    }}>
      <span style={{ color: clr, fontSize: 16, lineHeight: 1 }}>
        {variant === 'danger' ? '✕' : variant === 'warn' ? '⚠' : '✓'}
      </span>
      {msg}
    </div>
  );
}

// ─── Theme toggle button ───────────────────────────────────────────────────────
// Self-contained — reads ThemeCtx directly, no props needed.
// Cycles dark ↔ light; extend THEMES map to add more options.
function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeCtx);
  const C = useT();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: 'transparent', cursor: 'pointer',
        fontSize: 15, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: C.muted, flexShrink: 0,
        transition: 'border-color 0.15s, color 0.15s',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

const BpCtx = createContext('desktop');
function useBreakpoint() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  // mobile < 640 · tablet 640–1023 (portrait iPad included) · tablet-land 1024–1279 · desktop ≥ 1280
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : w < 1280 ? 'tablet-land' : 'desktop';
}

// ─── Utilities ───────────────────────────────────────────────────────────────
const fmtD     = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const uid      = () => Math.random().toString(36).slice(2, 8);
const getToday  = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daysUntil = (d) => d ? Math.ceil((new Date(d + 'T00:00:00') - getToday()) / 86400000) : null;
const parseMin  = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const fmtDur    = (m) => { if (!m || m <= 0) return ''; const h = Math.floor(m / 60); const r = m % 60; return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${r}m`; };
const fmtDate   = (d) => { if (!d) return '—'; const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
const fmtMon    = (ym) => { const [y, m] = ym.split('-'); return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); };
const today8601 = () => new Date().toISOString().slice(0, 10);

// Phase → days-before-event offset
const PHASE_OFFSET = {
  '12 Months Out': -365, '10 Months Out': -304, '8 Months Out': -243,
  '6 Months Out': -182,  '5 Months Out': -152,  '4 Months Out': -121,
  '3 Months Out': -91,   '2 Months Out': -61,   '1 Month Out':  -30,
  '2 Weeks Out':  -14,   'Week Of':      -7,
};

// Phase → primary workflow focus label (shown on stepper nodes)
const PHASE_FOCUS = {
  '12 Months Out': 'Budget & Venue',
  '10 Months Out': 'Key Vendors',
  '8 Months Out':  'Save the Dates',
  '6 Months Out':  'Invitations',
  '5 Months Out':  'Attire',
  '4 Months Out':  'RSVPs',
  '3 Months Out':  'Headcount',
  '2 Months Out':  'Final Details',
  '1 Month Out':   'Confirmations',
  '2 Weeks Out':   'Final Prep',
  'Week Of':       'Go Time',
};

const phaseDate = (week, eventDate) => {
  if (!eventDate || !(week in PHASE_OFFSET)) return null;
  const d = new Date(eventDate + 'T00:00:00');
  d.setDate(d.getDate() + PHASE_OFFSET[week]);
  return fmtDate(d.toISOString().slice(0, 10));
};

const isTaskOverdue = (task, eventDate) => {
  if (task.done || !eventDate || !(task.week in PHASE_OFFSET)) return false;
  const d = new Date(eventDate + 'T00:00:00');
  d.setDate(d.getDate() + PHASE_OFFSET[task.week]);
  return d < getToday();
};

const currentPhase = (days) => {
  if (days === null || days === undefined) return null;
  if (days > 330) return '12 Months Out';
  if (days > 270) return '10 Months Out';
  if (days > 210) return '8 Months Out';
  if (days > 150) return '6 Months Out';
  if (days > 120) return '5 Months Out';
  if (days > 90)  return '4 Months Out';
  if (days > 60)  return '3 Months Out';
  if (days > 30)  return '2 Months Out';
  if (days > 14)  return '1 Month Out';
  if (days >= 0)  return 'Week Of';
  return 'Post-Event';
};

const WORKFLOW_FOCUS = {
  Wedding: {
    '12 Months Out': { focus: 'Budget & Venue', tips: ['Lock in venue — Saturday dates book 12–18 months out', 'Set realistic budget with line items', 'Draft your guest list'] },
    '10 Months Out': { focus: 'Key Vendors',   tips: ['Book photographer — they fill up first', 'Interview and book caterer', 'Select wedding party'] },
    '8 Months Out':  { focus: 'Communication', tips: ['Mail save-the-dates now', 'Book florist and entertainment', 'Schedule engagement photos'] },
    '6 Months Out':  { focus: 'Logistics',     tips: ['Formal invitations should go out this month', 'Confirm officiant and ceremony details', 'Book hair & makeup trial'] },
    '4 Months Out':  { focus: 'RSVP Push',     tips: ['Follow up with non-responders', 'Start seating chart draft', 'Plan rehearsal dinner'] },
    '3 Months Out':  { focus: 'Vendor Sync',   tips: ['Give caterer your headcount estimate', 'Schedule venue walkthrough', 'Order cake'] },
    '2 Months Out':  { focus: 'Final Details', tips: ['Finalize seating chart', 'Prepare payment schedule for vendors', 'Finalize ceremony script'] },
    '1 Month Out':   { focus: 'Confirmation',  tips: ['Re-confirm every vendor', 'Prepare tip envelopes', 'Final fittings'] },
    'Week Of':       { focus: 'Final Prep',    tips: ['Deliver items to venue', 'Run rehearsal', 'Distribute call sheets to vendors'] },
  },
  Corporate: {
    '12 Months Out': { focus: 'Strategy',   tips: ['Define event goals and KPIs', 'Book venue and room block', 'Set registration strategy'] },
    '8 Months Out':  { focus: 'Content',    tips: ['Confirm keynote speakers', 'Outline agenda and sessions', 'Open early-bird registration'] },
    '6 Months Out':  { focus: 'Promotion',  tips: ['Launch main registration', 'Confirm sponsors', 'Finalize agenda'] },
    '3 Months Out':  { focus: 'Logistics',  tips: ['Confirm AV and tech setup', 'Finalize catering headcount tiers', 'Prep attendee communication cadence'] },
    '1 Month Out':   { focus: 'Execution',  tips: ['Confirm all vendors', 'Finalize run-of-show', 'Brief all staff'] },
    'Week Of':       { focus: 'Go Time',    tips: ['AV test and site walkthrough', 'Final headcount to catering', 'Brief day-of team'] },
  },
  Birthday: {
    '3 Months Out':  { focus: 'Booking',    tips: ['Book venue and catering', 'Finalize theme and guest list', 'Line up entertainment'] },
    '1 Month Out':   { focus: 'Invitations', tips: ['Send invitations — 3–4 weeks ahead', 'Order cake', 'Confirm activities and entertainment'] },
    'Week Of':       { focus: 'Final Push', tips: ['Final headcount to caterer', 'Prep decorations', 'Confirm all day-of logistics'] },
  },
  Anniversary: {
    '3 Months Out':  { focus: 'Planning',   tips: ['Book venue and any travel', 'Plan surprise elements if applicable', 'Order flowers and cake'] },
    '1 Month Out':   { focus: 'Details',    tips: ['Confirm reservations', 'Plan gift or keepsake', 'Coordinate with any guests'] },
    'Week Of':       { focus: 'Final Prep', tips: ['Confirm all bookings', 'Prepare any surprise logistics', 'Arrange transportation'] },
  },
  'Baby Shower': {
    '2 Months Out':  { focus: 'Planning',   tips: ['Set date 4–6 weeks before due date', 'Send invitations', 'Coordinate registry and games'] },
    '1 Month Out':   { focus: 'Details',    tips: ['Confirm headcount with venue/caterer', 'Order cake and favors', 'Prepare games and activities'] },
    'Week Of':       { focus: 'Final Push', tips: ['Final headcount to caterer', 'Prep decorations and gift table', 'Confirm RSVPs'] },
  },
  'Bridal Shower': {
    '3 Months Out':  { focus: 'Planning',    tips: ['Set date 2–4 weeks before the wedding', 'Finalize guest list with maid of honor', 'Choose venue and theme'] },
    '2 Months Out':  { focus: 'Invitations', tips: ['Send invitations 4–6 weeks out', 'Plan games and activities', 'Coordinate registry info'] },
    '1 Month Out':   { focus: 'Details',     tips: ['Confirm headcount with venue/caterer', 'Order cake and floral décor', 'Prepare favor bags'] },
    'Week Of':       { focus: 'Final Push',  tips: ['Confirm all RSVPs', 'Prep decorations and gift table', 'Confirm catering or food order'] },
  },
  Graduation: {
    '3 Months Out':  { focus: 'Planning',    tips: ['Set budget and confirm graduation date', 'Book venue or confirm host location', 'Finalize guest list'] },
    '2 Months Out':  { focus: 'Invitations', tips: ['Send invitations 4–6 weeks out', 'Book catering or arrange food', 'Plan any photo display or tribute'] },
    '1 Month Out':   { focus: 'Details',     tips: ['Follow up on RSVPs', 'Order cake and decorations', 'Confirm all vendors or food orders'] },
    'Week Of':       { focus: 'Final Push',  tips: ['Confirm final headcount', 'Set up photo display and decorations', 'Prepare any slideshow or tribute'] },
  },
  // ── Corporate subtypes ─────────────────────────────────────────────────────
  'Holiday Party': {
    '4 Months Out':  { focus: 'Budget & Approval', tips: ['Get budget approved by Finance or leadership', 'Book venue early — Dec dates sell out fast', 'Determine headcount: employees only, plus-ones, or all-company'] },
    '2 Months Out':  { focus: 'Coordination',      tips: ['Send save-the-date to all staff', 'Confirm catering headcount and dietary flags', 'Finalize entertainment and AV needs'] },
    '1 Month Out':   { focus: 'Details',           tips: ['Send formal invitation with RSVP link', 'Confirm all vendors and delivery windows', 'Brief any internal day-of volunteers'] },
    'Week Of':       { focus: 'Go Time',           tips: ['Final headcount to caterer', 'Prep run-of-show and staff assignments', 'Confirm venue setup and load-in window'] },
  },
  Conference: {
    '12 Months Out': { focus: 'Foundation',        tips: ['Secure venue and negotiate hotel room block', 'Define conference theme and target audience', 'Open call for speakers or presentations'] },
    '8 Months Out':  { focus: 'Programming',       tips: ['Confirm keynote speakers', 'Finalize agenda and session tracks', 'Open attendee registration'] },
    '4 Months Out':  { focus: 'Logistics',         tips: ['Confirm AV, production, and streaming setup', 'Finalize sponsor packages and deliverables', 'Send sponsor and exhibitor instructions'] },
    '1 Month Out':   { focus: 'Execution Prep',    tips: ['Finalize run-of-show and speaker briefings', 'Print badges, signage, and materials', 'Brief all staff and volunteers'] },
    'Week Of':       { focus: 'Go Time',           tips: ['AV test and full run-through', 'Confirm catering counts and timing', 'Distribute day-of roles and communication plan'] },
  },
  'Product Launch': {
    '3 Months Out':  { focus: 'Strategy',          tips: ['Align on launch goals with Marketing and Product teams', 'Book venue and confirm AV / production scope', 'Define media, press, and guest list strategy'] },
    '2 Months Out':  { focus: 'Production',        tips: ['Confirm AV, staging, and production design', 'Finalize press kit and assets with Marketing', 'Send invitations to press, partners, and stakeholders'] },
    '1 Month Out':   { focus: 'Rehearsal',         tips: ['Full run-through with presenters and AV team', 'Confirm all catering and hospitality', 'Finalize demo stations or product displays'] },
    'Week Of':       { focus: 'Go Time',           tips: ['Final presenter briefing and script review', 'Load in and full AV tech check', 'Confirm embargo timing with PR if applicable'] },
  },
  'Team Retreat': {
    '3 Months Out':  { focus: 'Planning',          tips: ['Get leadership approval on destination, dates, and budget', 'Book accommodations and any team activity vendors', 'Define retreat goals: team building, strategy, or both'] },
    '1 Month Out':   { focus: 'Coordination',      tips: ['Share detailed itinerary with all attendees', 'Confirm dietary needs with catering or restaurant', 'Arrange transportation or share drive/flight details'] },
    'Week Of':       { focus: 'Go Time',           tips: ['Confirm all bookings — hotel, meals, activities', 'Send final packing list and schedule to team', 'Brief any external facilitators on goals and format'] },
  },
  'Town Hall': {
    '4 Weeks Out':   { focus: 'Setup',             tips: ['Confirm date with Executive team and book space', 'Set agenda — what leadership is covering and in what order', 'Arrange for hybrid access if remote employees attend'] },
    '1 Week Out':    { focus: 'Prep',              tips: ['Send company-wide calendar invite and agenda preview', 'Confirm AV and streaming setup', 'Prep slide deck with leadership and comms team'] },
    'Week Of':       { focus: 'Go Time',           tips: ['AV tech check and Zoom/Teams link test', 'Brief presenters on timing and format', 'Have IT on standby for streaming issues'] },
  },
  'Training / Workshop': {
    '6 Weeks Out':   { focus: 'Setup',             tips: ['Book room or external venue with correct layout (classroom, roundtable, etc.)', 'Confirm facilitator or trainer and their AV needs', 'Set participant list and send invitations'] },
    '2 Weeks Out':   { focus: 'Logistics',         tips: ['Order printed materials or workbooks', 'Confirm catering for breaks or working lunch', 'Send pre-read or prep assignment to attendees'] },
    'Week Of':       { focus: 'Go Time',           tips: ['AV test — projector, screen share, materials loaded', 'Set up room: seating layout, notepads, printed materials at seats', 'Brief any internal co-facilitators on agenda timing'] },
  },
  'Award Ceremony': {
    '3 Months Out':  { focus: 'Foundation',        tips: ['Confirm award categories and nomination process', 'Book venue and AV / production', 'Coordinate with leadership on honoree list and approval'] },
    '1 Month Out':   { focus: 'Details',           tips: ['Finalize winner list (keep confidential)', 'Order trophies, plaques, or award gifts', 'Plan run-of-show: presenters, music cues, acceptance timing'] },
    'Week Of':       { focus: 'Go Time',           tips: ['Rehearsal with MC and presenters', 'Confirm AV: name slides, music, spotlight cues', 'Seal and deliver winner envelopes to MC'] },
  },
  'Client Dinner': {
    '3 Weeks Out':   { focus: 'Booking',           tips: ['Reserve restaurant or private dining room — confirm private space', 'Build guest list with account team — confirm who\'s bringing who', 'Note dietary restrictions for all attendees'] },
    '1 Week Out':    { focus: 'Details',           tips: ['Confirm reservation and headcount with venue', 'Arrange transportation if clients are traveling', 'Brief host on conversation topics and relationship context'] },
    'Week Of':       { focus: 'Go Time',           tips: ['Reconfirm reservation day of', 'Arrive early — greet clients before they arrive if possible', 'Have a plan for the check — pay discreetly in advance if possible'] },
  },
  // ── New celebration types ───────────────────────────────────────────────────
  'Engagement Party': {
    '3 Months Out':  { focus: 'Planning',    tips: ['Set date (ideally within 2–3 months of engagement)', 'Decide host and venue — home, restaurant, or venue', 'Create guest list — close friends and family first'] },
    '1 Month Out':   { focus: 'Details',    tips: ['Send invitations (paper or digital)', 'Arrange food and drinks — catered or hosted', 'Plan any toasts, photos, or activities'] },
    'Week Of':       { focus: 'Final Push', tips: ['Confirm headcount and catering', 'Prep decorations — photos of the couple, flowers', 'Confirm any photographers or videographers'] },
  },
  'Vow Renewal': {
    '6 Months Out':  { focus: 'Vision',     tips: ['Choose intimate or larger celebration format', 'Book venue and officiant', 'Decide whether to write new vows or use original'] },
    '2 Months Out':  { focus: 'Details',    tips: ['Send invitations', 'Book catering, florals, and any entertainment', 'Plan any photo or memory display'] },
    'Week Of':       { focus: 'Final Prep', tips: ['Confirm all vendors', 'Prepare any personal touches — vows, music, readings', 'Arrange any surprise elements for partner'] },
  },
  'Retirement Party': {
    '2 Months Out':  { focus: 'Planning',   tips: ['Confirm attendance goals — intimate or company-wide?', 'Book venue or arrange office space', 'Collect memories, photos, or tributes from colleagues'] },
    '1 Month Out':   { focus: 'Details',    tips: ['Send invitations', 'Arrange catering and cake', 'Plan program: speeches, tributes, photo slideshow'] },
    'Week Of':       { focus: 'Final Push', tips: ['Confirm headcount and food', 'Prepare any video tribute, memory book, or gift collection', 'Brief speakers and MC on timing'] },
  },
  'Sweet 16': {
    '3 Months Out':  { focus: 'Vision',     tips: ['Set theme, guest list, and budget', 'Book venue — popular venues book 3–6 months out', 'Book entertainment: DJ, photo booth, or performers'] },
    '2 Months Out':  { focus: 'Planning',   tips: ['Send invitations — formal paper or digital', 'Book caterer or arrange catering', 'Order custom cake and any specialty decor items'] },
    'Week Of':       { focus: 'Final Prep', tips: ['Confirm headcount and catering', 'Finalize decorations and any surprise elements', 'Confirm DJ set list and any special song requests'] },
  },
  Quinceañera: {
    '12 Months Out': { focus: 'Foundation', tips: ['Book church or ceremony venue and reception venue', 'Select court of honor: chambelanes and damas', 'Set overall budget — family contributions, sponsors, godparents'] },
    '8 Months Out':  { focus: 'Key Vendors', tips: ['Book photographer and videographer', 'Book DJ or live band', 'Book caterer and cake designer'] },
    '6 Months Out':  { focus: 'Details',    tips: ['Order gown and court dresses/suits', 'Choose décor theme and color palette', 'Begin choreography rehearsals for court waltz'] },
    '1 Month Out':   { focus: 'Final Prep', tips: ['Final dress fittings and alterations', 'Confirm all vendors and run-of-show', 'Prepare surprise dance or special moment choreography'] },
    'Week Of':       { focus: 'Go Time',    tips: ['Deliver decorations and centerpieces', 'Final rehearsal of ceremony and court waltz', 'Confirm vendor arrival times and access'] },
  },
  Reunion: {
    '6 Months Out':  { focus: 'Coordination', tips: ['Set date and confirm venue — parks, halls, or destination venues', 'Create contact list and outreach strategy', 'Designate a planning committee if family or class reunion'] },
    '3 Months Out':  { focus: 'Planning',     tips: ['Send save-the-dates and collect RSVPs', 'Plan activities: games, slideshow, memory tables', 'Arrange catering or potluck structure'] },
    'Week Of':       { focus: 'Final Push',   tips: ['Confirm headcount and food order', 'Prepare name tags, photo displays, and memory books', 'Set up any activity stations or games'] },
  },
  'Fundraiser / Gala': {
    '6 Months Out':  { focus: 'Foundation',   tips: ['Define fundraising goal and gala format', 'Secure venue — formal gala spaces book far out', 'Build sponsor and donor outreach strategy'] },
    '3 Months Out':  { focus: 'Programming',  tips: ['Confirm speakers, auctioneer, or entertainment', 'Set auction items and procurement with team', 'Launch ticket sales and table sponsorships'] },
    '1 Month Out':   { focus: 'Execution',    tips: ['Finalize run-of-show with MC and presenters', 'Confirm catering count and service style', 'Prepare auction paddles, bid sheets, or mobile bidding setup'] },
    'Week Of':       { focus: 'Go Time',      tips: ['Final AV test and decor walkthrough', 'Brief all volunteers and staff on their roles', 'Confirm donor/VIP seating and any special acknowledgments'] },
  },
  'Networking Event': {
    '4 Weeks Out':   { focus: 'Setup',        tips: ['Book venue with open-flow layout — mingling, not assigned seating', 'Set ticket price or guest list + invite strategy', 'Arrange light food and drinks — the fuel of good networking'] },
    '1 Week Out':    { focus: 'Prep',         tips: ['Confirm headcount and catering order', 'Prepare name badges and check-in process', 'Plan any structured activity: speed networking, speaker, icebreaker'] },
    'Week Of':       { focus: 'Go Time',      tips: ['Confirm venue setup and AV', 'Brief any sponsors or speakers', 'Arrive early — be ready before first guest'] },
  },
};

const getWorkflowGuidance = (eventType, days) => {
  if (days === null || days < 0) return null;
  const phase = currentPhase(days);
  if (!phase) return null;
  const typeGuide = WORKFLOW_FOCUS[eventType] || WORKFLOW_FOCUS.Birthday;
  if (typeGuide[phase]) return { phase, ...typeGuide[phase] };
  const phaseOrder = Object.keys(PHASE_OFFSET);
  const idx = phaseOrder.indexOf(phase);
  for (let i = Math.max(idx, 0); i < phaseOrder.length; i++) {
    if (typeGuide[phaseOrder[i]]) return { phase, ...typeGuide[phaseOrder[i]] };
  }
  const keys = Object.keys(typeGuide);
  return keys.length ? { phase, ...typeGuide[keys[keys.length - 1]] } : null;
};

const getPhaseActions = (eventType, days, { vendors, timeline, guests }) => {
  const phase = currentPhase(days);
  if (!phase || days === null || days < 0) return [];
  const items = [];

  const hasVenue     = vendors.find(v => v.category === 'Venue'       && STAGES.indexOf(v.status) >= 2);
  const hasCatering  = vendors.find(v => v.category === 'Catering'    && STAGES.indexOf(v.status) >= 2);
  const hasPhoto     = vendors.find(v => v.category === 'Photography' && STAGES.indexOf(v.status) >= 2);
  const invitesDone  = timeline.find(t => t.done && t.task.toLowerCase().includes('invitation'));
  const saveDatesDone = timeline.find(t => t.done && t.task.toLowerCase().includes('save'));
  const confirmed    = guests.filter(g => g.rsvp === 'Yes');
  const unseated     = confirmed.filter(g => !g.table).length;

  if (!hasVenue && ['12 Months Out','10 Months Out'].includes(phase))
    items.push({ level: 'critical', label: 'Venue not booked — Saturday dates fill 12–18 months out', tab: 'Vendors' });
  if (!hasVenue && ['8 Months Out','6 Months Out'].includes(phase))
    items.push({ level: 'warn', label: 'Still no venue — becoming urgent to lock in a date', tab: 'Vendors' });

  if (eventType === 'Wedding') {
    if (!hasPhoto && ['10 Months Out','8 Months Out'].includes(phase))
      items.push({ level: 'warn', label: 'Photographer not yet booked — they fill up fast', tab: 'Vendors' });
    if (!hasCatering && ['10 Months Out','8 Months Out'].includes(phase))
      items.push({ level: 'warn', label: 'No caterer booked — needed early for headcount planning', tab: 'Vendors' });
    if (!saveDatesDone && phase === '8 Months Out')
      items.push({ level: 'warn', label: 'Save-the-dates should go out at 8 months', tab: 'Planning Tasks' });
    if (!invitesDone && ['6 Months Out','4 Months Out'].includes(phase))
      items.push({ level: 'warn', label: 'Formal invitations go out at 6 months — check your timeline', tab: 'Planning Tasks' });
    if (unseated > 0 && ['2 Months Out','1 Month Out','Week Of'].includes(phase))
      items.push({ level: 'warn', label: `Finalize seating — ${unseated} confirmed guest${unseated > 1 ? 's' : ''} still unassigned`, tab: 'Seating' });
  }
  if (isCorporateType(eventType)) {
    const hasAV = vendors.find(v => v.category === 'AV / Tech' && STAGES.indexOf(v.status) >= 2);
    if (!hasAV && ['3 Months Out','2 Months Out'].includes(phase))
      items.push({ level: 'warn', label: 'AV / Tech vendor not booked — critical for corporate events', tab: 'Vendors' });
  }
  if (!hasCatering && phase === 'Week Of')
    items.push({ level: 'critical', label: 'No caterer confirmed for event day — escalate immediately', tab: 'Vendors' });

  return items;
};

// ─── Unicode-safe base64 (handles ✓, em-dashes, accents, emoji in brief data) ──
const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const b64decode = (b64) => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

// ─── Branded letterhead / footer for printed & exported client materials ──────
const brandAccent = (profile) => (profile?.brandColor && /^#[0-9a-fA-F]{3,8}$/.test(profile.brandColor)) ? profile.brandColor : '#1a6fba';
const brandLetterheadHTML = (profile) => {
  if (!profile) return '';
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const accent  = brandAccent(profile);
  const name    = esc(profile.businessName || profile.name || '');
  const logoImg = profile.logo ? `<img src="${profile.logo}" alt="" style="max-height:56px;max-width:190px;object-fit:contain"/>` : '';
  if (!name && !logoImg) return '';
  const contact = [profile.phone, profile.email, profile.website].filter(Boolean).map(esc);
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:3px solid ${accent};padding-bottom:14px;margin-bottom:22px;font-family:-apple-system,system-ui,Arial,sans-serif">
    <div style="display:flex;align-items:center;gap:14px">${logoImg}
      <div>${name ? `<div style="font-size:18px;font-weight:800;color:#111;letter-spacing:-0.01em">${name}</div>` : ''}
        ${profile.city ? `<div style="font-size:12px;color:#777;margin-top:2px">${esc(profile.city)}</div>` : ''}</div></div>
    ${contact.length ? `<div style="font-size:11px;color:#555;text-align:right;line-height:1.7">${contact.map(c => `<div>${c}</div>`).join('')}</div>` : ''}
  </div>`;
};
const brandPaymentFooterHTML = (profile) => {
  if (!profile) return '';
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const accent = brandAccent(profile);
  const parts = [];
  if (profile.venmo)  parts.push(`Venmo ${esc(profile.venmo)}`);
  if (profile.zelle)  parts.push(`Zelle ${esc(profile.zelle)}`);
  if (profile.paypal) parts.push(`PayPal ${esc(profile.paypal)}`);
  if (profile.acceptsCash)  parts.push('Cash');
  if (profile.acceptsCheck) parts.push('Check');
  if (parts.length === 0) return '';
  return `<div style="margin-top:28px;padding-top:14px;border-top:1px solid #ddd;font-family:-apple-system,system-ui,Arial,sans-serif">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accent};margin-bottom:5px">Payment Options</div>
    <div style="font-size:12px;color:#444">${parts.join('  ·  ')}</div>
  </div>`;
};

// ─── Field validation helpers ─────────────────────────────────────────────────
const isEmail   = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = v => !v || (() => { const d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 15; })();
const isUrl     = v => !v || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/.test(v.trim());

// Auto-format phone to (XXX) XXX-XXXX as the user types (US).
// Passes through non-US numbers (11+ raw digits keep their digits).
const formatPhone = (raw = '') => {
  const d = raw.replace(/\D/g, '').slice(0, 10); // strip non-digits, cap at 10
  if (!d)            return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`;
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
};
const isPosDollar = v => v === '' || v === undefined || v === null || (!isNaN(Number(v)) && Number(v) >= 0);


// ─── Constants ───────────────────────────────────────────────────────────────
const STAGES    = ['Considering', 'Quoted', 'Contracted', 'Deposit Paid', 'Confirmed'];
// Color maps are now functions so they react to the active theme token set.
// Usage inside components: const stageCLR = STAGE_CLR(C); stageCLR['Confirmed']
const STAGE_CLR = (C) => ({ Considering: C.muted, Quoted: C.warn, Contracted: C.accent2, 'Deposit Paid': C.accent, Confirmed: C.success });

// ─── Vendor-1: operational reliability (transparent, data-gated — never faked) ──
const _clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const _hasField = (v, k) => v && v[k] !== undefined && v[k] !== null && v[k] !== '';
const VENDOR_TIERS = ['Standard', 'Preferred', 'Elite', 'Certified'];
const VENDOR_TIER_META = {
  Standard:  { color: '#9090a8', icon: '○', label: 'Standard'  },
  Preferred: { color: '#60a5fa', icon: '◆', label: 'Preferred' },
  Elite:     { color: '#a78bfa', icon: '★', label: 'Elite'     },
  Certified: { color: '#34d399', icon: '✓', label: 'Certified' },
};

// Returns { sufficient, score (0–100 or null), reason }. Only scores with a real track record.
function vendorReliabilityScore(v = {}) {
  const ec = Number(v.eventsCompleted);
  const qualitySignals = ['onTimeRate', 'successfulEventCount', 'plannerRehireCount', 'avgResponseHours'].filter(k => _hasField(v, k));
  if (!_hasField(v, 'eventsCompleted') || !(ec > 0) || qualitySignals.length === 0) {
    return { sufficient: false, score: null, reason: 'Insufficient data' };
  }
  let pts = 0, max = 0;
  if (_hasField(v, 'onTimeRate'))         { max += 30; pts += _clamp(Number(v.onTimeRate), 0, 100) / 100 * 30; }
  if (_hasField(v, 'avgResponseHours'))   { max += 20; pts += _clamp((48 - Math.max(0, Number(v.avgResponseHours))) / 46, 0, 1) * 20; }
  max += 15; pts += _clamp(ec / 100, 0, 1) * 15; // experience (ec>0 guaranteed)
  if (_hasField(v, 'plannerRehireCount')) { max += 15; pts += _clamp(Number(v.plannerRehireCount) / 5, 0, 1) * 15; }
  if (_hasField(v, 'successfulEventCount')) { max += 10; pts += _clamp(Number(v.successfulEventCount) / ec, 0, 1) * 10; }
  let score = (pts / max) * 100;
  // Penalties scale with how often problems happen per event
  if (_hasField(v, 'cancellationCount')) score -= _clamp(Number(v.cancellationCount) / ec, 0, 1) * 30;
  if (_hasField(v, 'incidentCount'))     score -= _clamp(Number(v.incidentCount) / ec, 0, 1) * 30;
  return { sufficient: true, score: Math.round(_clamp(score, 0, 100)), reason: '' };
}

// Field-driven badges — never assigned without the underlying data.
function vendorBadges(v = {}) {
  const out = [];
  const ec = Number(v.eventsCompleted);
  const { sufficient, score } = vendorReliabilityScore(v);
  if (_hasField(v, 'avgResponseHours') && Number(v.avgResponseHours) <= 4)                         out.push('Fast Responder');
  if (_hasField(v, 'plannerRehireCount') && Number(v.plannerRehireCount) >= 2)                     out.push('Planner Trusted');
  if (sufficient && score >= 85)                                                                   out.push('High Reliability');
  if (_hasField(v, 'eventsCompleted') && ec >= 100)                                                out.push('100+ Events Completed');
  if (_hasField(v, 'onTimeRate') && Number(v.onTimeRate) >= 95)                                    out.push('Excellent Timeline Adherence');
  if (_hasField(v, 'cancellationCount') && Number(v.cancellationCount) === 0 && ec >= 5)           out.push('Zero Cancellation Vendor');
  if (_hasField(v, 'avgResponseHours') && Number(v.avgResponseHours) <= 8 && _hasField(v, 'onTimeRate') && Number(v.onTimeRate) >= 85) out.push('Strong Communication');
  if (_hasField(v, 'incidentCount') && Number(v.incidentCount) === 0 && _hasField(v, 'successfulEventCount') && Number(v.successfulEventCount) >= 10) out.push('Consistent Delivery');
  return out;
}

// Earned tier. Certified is manual-only (cannot be earned/bought in this phase).
function vendorTier(v = {}) {
  if (v.certified === true || v.preferredTier === 'Certified') return 'Certified';
  const { sufficient, score } = vendorReliabilityScore(v);
  if (!sufficient) return 'Standard';
  const ec = Number(v.eventsCompleted) || 0;
  const rehire = Number(v.plannerRehireCount) || 0;
  if (score >= 90 && rehire >= 3 && ec >= 50) return 'Elite';
  if (score >= 75 && ec >= 10)                return 'Preferred';
  return 'Standard';
}

// Cross-event vendor library: dedup by name+category, keep richest operational record, count repeat use.
function aggregateVendorLibrary(events = []) {
  const opFields = ['eventsCompleted', 'onTimeRate', 'avgResponseHours', 'cancellationCount', 'incidentCount', 'plannerRehireCount', 'successfulEventCount'];
  const countOp = (v) => opFields.filter(f => _hasField(v, f)).length;
  const map = new Map();
  (events || []).forEach(ev => (ev.vendors || []).forEach(v => {
    if (!v || !v.name) return;
    const key = `${v.name.trim().toLowerCase()}|${(v.category || '').toLowerCase()}`;
    const cur = map.get(key);
    if (!cur) map.set(key, { vendor: v, eventsLinked: 1 });
    else { cur.eventsLinked += 1; if (countOp(v) > countOp(cur.vendor)) cur.vendor = v; }
  }));
  return [...map.values()].map(({ vendor, eventsLinked }) => ({ ...vendor, eventsLinked }));
}

// ─── Vendor discovery tags (optional, planner-entered, never inferred) ─────────
// Identity tags are DISCOVERY CONTEXT only — they never affect reliability ranking.
const VENDOR_SPECIALTY_TAGS = ['Luxury Weddings', 'Editorial Photography', 'Outdoor Events', 'Destination Weddings', 'High Guest Count', 'Intimate / Micro Events', 'Natural Hair Expertise', 'Kosher Catering', 'Halal Catering', 'Vegan Catering', 'Corporate / Brand Events'];
const VENDOR_CULTURAL_TAGS  = ['Multicultural Ceremonies', 'South Asian Weddings', 'Nigerian Weddings', 'Hindu Ceremonies', 'Muslim Ceremonies', 'Jewish Ceremonies', 'Persian Weddings', 'Korean Weddings', 'Chinese Weddings', 'Quinceañera', 'Latino / Hispanic Events', 'West African Events'];
const VENDOR_LANGUAGE_TAGS  = ['Spanish', 'French', 'Mandarin', 'Cantonese', 'Hindi', 'Urdu', 'Arabic', 'Korean', 'Portuguese', 'Tagalog', 'ASL'];
const VENDOR_IDENTITY_TAGS  = ['Black-owned', 'Latina/o-owned', 'AAPI-owned', 'Woman-owned', 'LGBTQ-friendly', 'Veteran-owned', 'Indigenous-owned', 'Immigrant-owned', 'Disability-owned'];
// Group config — `tone` resolves to a theme token inside components.
const VENDOR_TAG_GROUPS = [
  { key: 'specialtyTags',          label: 'Specialties',         filterLabel: 'Specialty',           options: VENDOR_SPECIALTY_TAGS, tone: 'accent2' },
  { key: 'culturalExperienceTags', label: 'Cultural Experience', filterLabel: 'Cultural Experience', options: VENDOR_CULTURAL_TAGS,  tone: 'accent'  },
  { key: 'languageTags',           label: 'Languages',           filterLabel: 'Bilingual / Language', options: VENDOR_LANGUAGE_TAGS,  tone: 'accent'  },
  { key: 'identityTags',           label: 'Identity (optional)', filterLabel: 'Identity',            options: VENDOR_IDENTITY_TAGS,  tone: 'muted'   },
];

// ─── Communication Checklists ─────────────────────────────────────────────────
// Vendor: keyed by pipeline stage. Category-specific extras surface at current stage.
const VENDOR_COMMS = {
  Considering:    ['Researched and identified vendor options', 'Requested quote or pricing info', 'Confirmed availability for event date'],
  Quoted:         ['Received and reviewed the quote', 'Checked references or online reviews', 'Identified at least one backup vendor'],
  Contracted:     ['Contract reviewed and signed by both parties', 'Deposit amount and due date confirmed', 'Invoice or receipt received'],
  'Deposit Paid': ['Shared event date, venue, and expected guest count', 'Confirmed vendor arrival time', 'Sent venue access and load-in details', 'Communicated dietary, setup, or special requirements'],
  Confirmed:      ['Reconfirmation call completed (30 days out)', 'Final headcount and run of show shared', 'Vendor brief and contact sheet sent', 'Day-of point of contact confirmed on both sides'],
};
const VENDOR_CAT_COMMS = {
  Catering:        ['Menu tasting or review completed', 'Final dietary restrictions communicated to chef', 'Serving style, staffing count, and breakdown time confirmed'],
  Photography:     ['Shot list and must-have moments shared', 'Full event timeline and schedule sent', 'Backup equipment plan discussed'],
  Venue:           ['Site visit or walkthrough completed', 'Floor plan and room layout finalized', 'Vendor setup hours and access policy confirmed'],
  Entertainment:   ['Set list reviewed and do-not-play list shared', 'Sound check and setup window confirmed'],
  'AV / Tech':     ['Tech rider and equipment specs shared', 'On-site setup, test, and strike time confirmed'],
  Florals:         ['Floral design concept and color palette approved', 'Final arrangement counts and delivery window confirmed'],
  Transport:       ['Full pickup schedule and addresses sent', 'Driver contact shared with client and key guests'],
  Officiant:       ['Ceremony script reviewed and approved by couple', 'Rehearsal scheduled and confirmed'],
  'Hair & Makeup': ['Trial appointment completed', 'Day-of schedule and order of services confirmed'],
  Cake:            ['Design and flavor confirmed', 'Delivery window and setup instructions shared'],
};
// Client: keyed by CLIENT_STAGES pipeline stage.
const CLIENT_COMMS = {
  Inquiry:    ['Responded within 24 hours', 'Intro call or consultation scheduled', 'Sent intake form or discovery questionnaire'],
  Proposal:   ['Proposal or pricing sent', 'Walkthrough call completed with client', 'Follow-up sent (3–5 days after proposal)'],
  Contracted: ['Contract signed by both parties', 'Deposit or retainer received', 'Welcome packet and onboarding email sent', 'Planning kickoff call scheduled'],
  Active:     ['Planning timeline shared with client', 'Vendor roster overview provided', 'Check-in cadence established', 'Client knows best way to reach you'],
  Complete:   ['Final invoice sent and paid in full', 'Thank you note sent', 'Review or testimonial requested', 'Referral mentioned or incentive shared'],
};
const RSVP_CLR  = (C) => ({ Yes: C.success, No: C.danger, Maybe: C.warn });
const SPECIAL_NEEDS_OPTIONS = ['Nut allergy', 'Gluten-free', 'Dairy-free', 'Vegetarian', 'Vegan', 'Kosher', 'Halal', 'Wheelchair access', 'Kids meal'];
const CATS      = ['Venue', 'Catering', 'Photography', 'Florals', 'Entertainment', 'Invitations', 'AV / Tech', 'Transport', 'Hair & Makeup', 'Decor', 'Cake', 'Favors', 'Printing / Signage', 'Activities', 'Misc', 'Other'];
const EVT_CATEGORIES = {
  'Weddings & Celebrations': [
    'Wedding', 'Engagement Party', 'Vow Renewal', 'Anniversary',
    'Bridal Shower', 'Baby Shower', 'Birthday', 'Sweet 16',
    'Quinceañera', 'Graduation', 'Retirement Party', 'Reunion',
  ],
  'Corporate': [
    'Holiday Party', 'Board Meeting', 'Conference', 'Product Launch',
    'Team Retreat', 'Town Hall', 'Training / Workshop', 'Award Ceremony',
    'Client Dinner',
  ],
  'Social & Fundraising': [
    'Fundraiser / Gala', 'Networking Event', 'Other',
  ],
};
const EVT_TYPES  = Object.values(EVT_CATEGORIES).flat();
const EVT_PARENT = Object.entries(EVT_CATEGORIES).reduce((acc, [cat, types]) => {
  types.forEach(t => { acc[t] = cat; });
  return acc;
}, {});
const isCorporateType = (t) => EVT_PARENT[t] === 'Corporate' || t === 'Corporate';
// eslint-disable-next-line no-unused-vars
const isCelebration   = (t) => EVT_PARENT[t] === 'Weddings & Celebrations';
const ROS_CLR   = (C) => ({ vendor: C.accent2, prep: C.warn, event: C.accent });
const EVT_CLR   = (C) => {
  const isLight = C.surface === '#ffffff';
  return {
    // Celebrations
    Wedding:          C.accent,
    'Engagement Party': isLight ? '#db2777' : '#f472b6',
    'Vow Renewal':    isLight ? '#be185d' : '#f472b6',
    Anniversary:      isLight ? '#be185d' : '#f472b6',
    'Bridal Shower':  '#a78bfa',
    'Baby Shower':    '#34d399',
    Birthday:         C.warn,
    'Sweet 16':       isLight ? '#f59e0b' : '#fbbf24',
    'Quinceañera':    isLight ? '#ec4899' : '#f472b6',
    Graduation:       '#fb923c',
    'Retirement Party': isLight ? '#0891b2' : '#22d3ee',
    Reunion:          isLight ? '#0369a1' : '#38bdf8',
    // Corporate
    'Holiday Party':  C.accent2,
    'Board Meeting':  '#818cf8',
    Conference:       isLight ? '#4f46e5' : '#818cf8',
    'Product Launch': isLight ? '#7c3aed' : '#a78bfa',
    'Team Retreat':   isLight ? '#0369a1' : '#38bdf8',
    'Town Hall':      isLight ? '#0891b2' : '#22d3ee',
    'Training / Workshop': isLight ? '#0f766e' : '#2dd4bf',
    'Award Ceremony': isLight ? '#b45309' : '#fbbf24',
    'Client Dinner':  isLight ? '#166534' : '#34d399',
    // Social
    'Fundraiser / Gala': isLight ? '#9d174d' : '#f472b6',
    'Networking Event':  isLight ? '#1d4ed8' : '#60a5fa',
    Other:            C.muted,
  };
};

const TIMELINE_TEMPLATES = {
  Wedding: [
    { week: '12 Months Out', task: 'Set budget and guest count',              owner: 'Both' },
    { week: '12 Months Out', task: 'Book venue',                              owner: '' },
    { week: '10 Months Out', task: 'Book photographer',                       owner: '' },
    { week: '10 Months Out', task: 'Book caterer',                            owner: '' },
    { week: '8 Months Out',  task: 'Send save-the-dates',                    owner: '' },
    { week: '6 Months Out',  task: 'Book entertainment / DJ',                 owner: '' },
    { week: '6 Months Out',  task: 'Order florals — finalize vision',         owner: '' },
    { week: '4 Months Out',  task: 'Send formal invitations',                 owner: '' },
    { week: '4 Months Out',  task: 'Book hair & makeup',                      owner: '' },
    { week: '2 Months Out',  task: 'Confirm final guest count with caterer',  owner: '' },
    { week: '1 Month Out',   task: 'Final venue walkthrough',                 owner: '' },
    { week: '2 Weeks Out',   task: 'Finalize seating chart',                  owner: '' },
    { week: 'Week Of',       task: 'Confirm all vendors',                     owner: '' },
    { week: 'Week Of',       task: 'Prepare vendor tip envelopes',            owner: '' },
  ],
  Corporate: [
    { week: '6 Months Out', task: 'Select and book venue',                   owner: 'Events Team' },
    { week: '6 Months Out', task: 'Set budget and get approval',             owner: 'Finance' },
    { week: '5 Months Out', task: 'Book catering',                           owner: 'Events Team' },
    { week: '4 Months Out', task: 'Book AV / tech company',                  owner: 'Events Team' },
    { week: '3 Months Out', task: 'Send employee invitations',               owner: 'Events Team' },
    { week: '2 Months Out', task: 'Confirm headcount with caterer',          owner: 'Events Team' },
    { week: '1 Month Out',  task: 'Finalize entertainment / program',        owner: 'Events Team' },
    { week: '2 Weeks Out',  task: 'Confirm all vendors',                     owner: 'Events Team' },
    { week: 'Week Of',      task: 'Prepare run-of-show document',            owner: 'Events Team' },
  ],
  'Board Meeting': [
    { week: '3 Months Out', task: 'Confirm meeting date with board chair and executive team',         owner: 'Events Team' },
    { week: '3 Months Out', task: 'Reserve boardroom or executive conference space',                   owner: 'Events Team' },
    { week: '3 Months Out', task: 'Identify remote attendees — confirm video conferencing needs',     owner: 'Events Team' },
    { week: '2 Months Out', task: 'Collect agenda items from board chair and committee leads',        owner: 'Events Team' },
    { week: '2 Months Out', task: 'Book AV / tech support — hybrid meeting setup if needed',          owner: 'Events Team' },
    { week: '2 Months Out', task: 'Book catering — working meal or breaks appropriate to duration',   owner: 'Events Team' },
    { week: '1 Month Out',  task: 'Send formal meeting notice with agenda draft to all members',      owner: 'Events Team' },
    { week: '1 Month Out',  task: 'Confirm quorum — identify any proxy or remote voting needs',       owner: 'Events Team' },
    { week: '1 Month Out',  task: 'Collect board materials — reports, financials, resolutions',       owner: 'Events Team' },
    { week: '2 Weeks Out',  task: 'Distribute pre-read board packet to all members',                  owner: 'Events Team' },
    { week: '2 Weeks Out',  task: 'Confirm dietary restrictions for catering',                        owner: 'Events Team' },
    { week: '2 Weeks Out',  task: 'Arrange minutes-taker / secretary — confirm recording policy',    owner: 'Events Team' },
    { week: 'Week Of',      task: 'Final agenda confirmed and distributed',                           owner: 'Events Team' },
    { week: 'Week Of',      task: 'Test all AV — video conferencing, presentation display, mic',     owner: 'Events Team' },
    { week: 'Week Of',      task: 'Prepare name placards, voting materials, and printed agendas',    owner: 'Events Team' },
    { week: 'Week Of',      task: 'Confirm catering delivery window and setup requirements',          owner: 'Events Team' },
  ],
  Birthday: [
    { week: '3 Months Out', task: 'Set budget and guest count',              owner: '' },
    { week: '3 Months Out', task: 'Book venue or confirm location',          owner: '' },
    { week: '2 Months Out', task: 'Send invitations',                        owner: '' },
    { week: '2 Months Out', task: 'Book entertainment / activities',         owner: '' },
    { week: '1 Month Out',  task: 'Confirm caterer or order catering',       owner: '' },
    { week: '2 Weeks Out',  task: 'Follow up on RSVPs — confirm headcount',  owner: '' },
    { week: '2 Weeks Out',  task: 'Order cake',                              owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors',                     owner: '' },
    { week: 'Week Of',      task: 'Prepare playlist and decorations',        owner: '' },
  ],
  Anniversary: [
    { week: '6 Months Out', task: 'Set budget and create guest list',        owner: '' },
    { week: '6 Months Out', task: 'Book venue',                              owner: '' },
    { week: '4 Months Out', task: 'Book photographer / videographer',        owner: '' },
    { week: '4 Months Out', task: 'Book caterer',                            owner: '' },
    { week: '3 Months Out', task: 'Send save-the-dates',                     owner: '' },
    { week: '2 Months Out', task: 'Send formal invitations',                 owner: '' },
    { week: '1 Month Out',  task: 'Finalize program and tributes',           owner: '' },
    { week: '2 Weeks Out',  task: 'Prepare memory display / slideshow',      owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors',                     owner: '' },
  ],
  'Baby Shower': [
    { week: '2 Months Out', task: 'Set date and finalize guest list',        owner: '' },
    { week: '2 Months Out', task: 'Book venue or confirm host home',         owner: '' },
    { week: '1 Month Out',  task: 'Send invitations',                        owner: '' },
    { week: '1 Month Out',  task: 'Plan games and activity schedule',        owner: '' },
    { week: '1 Month Out',  task: 'Order cake and sweets',                   owner: '' },
    { week: '2 Weeks Out',  task: 'Confirm RSVPs and final headcount',       owner: '' },
    { week: '2 Weeks Out',  task: 'Prepare decorations and centerpieces',    owner: '' },
    { week: 'Week Of',      task: 'Prepare gift table and registry cards',   owner: '' },
    { week: 'Week Of',      task: 'Confirm catering / food order',           owner: '' },
  ],
  'Bridal Shower': [
    { week: '3 Months Out', task: 'Set date and create guest list',          owner: '' },
    { week: '3 Months Out', task: 'Choose and book venue',                   owner: '' },
    { week: '2 Months Out', task: 'Send invitations',                        owner: '' },
    { week: '2 Months Out', task: 'Plan activities and games',               owner: '' },
    { week: '1 Month Out',  task: 'Order cake and floral décor',             owner: '' },
    { week: '1 Month Out',  task: 'Book catering or arrange food',           owner: '' },
    { week: '2 Weeks Out',  task: 'Confirm RSVPs',                           owner: '' },
    { week: 'Week Of',      task: 'Prepare favors and gift table',           owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors',                     owner: '' },
  ],
  Graduation: [
    { week: '3 Months Out', task: 'Set budget and guest list',               owner: '' },
    { week: '2 Months Out', task: 'Book venue or confirm location',          owner: '' },
    { week: '2 Months Out', task: 'Send invitations',                        owner: '' },
    { week: '1 Month Out',  task: 'Book catering or order food',             owner: '' },
    { week: '2 Weeks Out',  task: 'Confirm RSVPs',                           owner: '' },
    { week: 'Week Of',      task: 'Set up photo display and decorations',    owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors',                     owner: '' },
  ],
  'Holiday Party': [
    { week: '4 Months Out', task: 'Get budget approved by Finance / leadership',       owner: 'HR / Events Team' },
    { week: '4 Months Out', task: 'Book venue — December dates fill fast',             owner: 'Events Team' },
    { week: '3 Months Out', task: 'Finalize guest list — employees, plus-ones, all',  owner: 'HR' },
    { week: '2 Months Out', task: 'Book catering and entertainment',                   owner: 'Events Team' },
    { week: '2 Months Out', task: 'Send save-the-date to all staff',                  owner: 'HR / Events Team' },
    { week: '1 Month Out',  task: 'Send formal invitation with RSVP link',             owner: 'HR' },
    { week: '2 Weeks Out',  task: 'Confirm final headcount with caterer',              owner: 'Events Team' },
    { week: 'Week Of',      task: 'Confirm all vendors and run-of-show',               owner: 'Events Team' },
  ],
  Conference: [
    { week: '12 Months Out', task: 'Secure venue and negotiate hotel room block',      owner: 'Events Team' },
    { week: '12 Months Out', task: 'Define theme, objectives, and target audience',    owner: 'Leadership / Marketing' },
    { week: '8 Months Out',  task: 'Confirm keynote speakers — send contracts',        owner: 'Events Team' },
    { week: '8 Months Out',  task: 'Open attendee registration',                       owner: 'Marketing' },
    { week: '6 Months Out',  task: 'Finalize agenda and session tracks',               owner: 'Events Team' },
    { week: '4 Months Out',  task: 'Confirm AV, production, and streaming setup',     owner: 'Events Team / IT' },
    { week: '4 Months Out',  task: 'Send speaker and exhibitor logistics packet',      owner: 'Events Team' },
    { week: '2 Months Out',  task: 'Finalize catering — headcount tiers and menus',   owner: 'Events Team' },
    { week: '1 Month Out',   task: 'Print badges, signage, and materials',             owner: 'Events Team' },
    { week: '1 Month Out',   task: 'Brief all staff and volunteers on roles',          owner: 'Events Team' },
    { week: 'Week Of',       task: 'Full AV run-through and load-in',                 owner: 'Events Team / AV' },
    { week: 'Week Of',       task: 'Final headcount to catering',                     owner: 'Events Team' },
  ],
  'Product Launch': [
    { week: '3 Months Out', task: 'Align on launch goals with Marketing and Product', owner: 'Marketing / Product' },
    { week: '3 Months Out', task: 'Book venue and confirm AV / production scope',     owner: 'Events Team / Marketing' },
    { week: '2 Months Out', task: 'Finalize press kit and invite list',                owner: 'PR / Marketing' },
    { week: '2 Months Out', task: 'Send invitations to press, partners, stakeholders', owner: 'PR / Events Team' },
    { week: '1 Month Out',  task: 'Full run-through with presenters and AV team',     owner: 'Events Team' },
    { week: '1 Month Out',  task: 'Confirm demo stations and product displays',        owner: 'Product Team' },
    { week: '2 Weeks Out',  task: 'Final presenter briefing and script lock',          owner: 'Marketing / Events Team' },
    { week: 'Week Of',      task: 'Load in and full AV tech check',                   owner: 'Events Team / AV' },
    { week: 'Week Of',      task: 'Confirm catering and hospitality setup',            owner: 'Events Team' },
  ],
  'Team Retreat': [
    { week: '3 Months Out', task: 'Get leadership approval on destination and budget', owner: 'HR / Leadership' },
    { week: '3 Months Out', task: 'Book accommodations and activity vendors',          owner: 'HR / Events Team' },
    { week: '2 Months Out', task: 'Share itinerary draft with leadership for approval', owner: 'HR / Events Team' },
    { week: '1 Month Out',  task: 'Send detailed itinerary to all attendees',          owner: 'HR / Events Team' },
    { week: '1 Month Out',  task: 'Confirm dietary needs with restaurant / caterer',   owner: 'Events Team' },
    { week: '2 Weeks Out',  task: 'Arrange transportation or share logistics details', owner: 'Events Team' },
    { week: 'Week Of',      task: 'Confirm all bookings — hotel, meals, activities',   owner: 'Events Team' },
    { week: 'Week Of',      task: 'Brief any external facilitators on goals and format', owner: 'HR / Leadership' },
  ],
  'Town Hall': [
    { week: '4 Weeks Out', task: 'Confirm date with Executive team and book space',   owner: 'Executive Office / HR' },
    { week: '4 Weeks Out', task: 'Set agenda — topics, presenters, and order',        owner: 'Executive Office' },
    { week: '3 Weeks Out', task: 'Confirm hybrid setup for remote employees',          owner: 'IT' },
    { week: '2 Weeks Out', task: 'Finalize slide deck with leadership and comms',      owner: 'Comms / Marketing' },
    { week: '1 Week Out',  task: 'Send company-wide calendar invite and agenda',       owner: 'HR / Comms' },
    { week: 'Week Of',     task: 'AV tech check and streaming link test',              owner: 'IT / Events Team' },
    { week: 'Week Of',     task: 'Brief all presenters on timing and format',          owner: 'Executive Office' },
  ],
  'Training / Workshop': [
    { week: '6 Weeks Out', task: 'Book venue or room — confirm correct layout',       owner: 'HR / Events Team' },
    { week: '6 Weeks Out', task: 'Confirm facilitator and their AV and material needs', owner: 'HR / Events Team' },
    { week: '6 Weeks Out', task: 'Send invitations and enrollment instructions',       owner: 'HR' },
    { week: '2 Weeks Out', task: 'Order printed materials, workbooks, or supplies',    owner: 'HR / Events Team' },
    { week: '2 Weeks Out', task: 'Send pre-read or prep assignment to attendees',      owner: 'HR / Facilitator' },
    { week: '1 Week Out',  task: 'Confirm catering for breaks or working lunch',       owner: 'Events Team' },
    { week: 'Week Of',     task: 'AV test — projector, screen share, materials loaded', owner: 'IT / Events Team' },
    { week: 'Week Of',     task: 'Set up room — seating, notepads, materials at seats', owner: 'Events Team' },
  ],
  'Award Ceremony': [
    { week: '3 Months Out', task: 'Confirm award categories and nomination process',   owner: 'Leadership / HR' },
    { week: '3 Months Out', task: 'Book venue and AV / production',                    owner: 'Events Team' },
    { week: '2 Months Out', task: 'Run nomination process and select finalists',        owner: 'Leadership / HR' },
    { week: '1 Month Out',  task: 'Finalize winner list — keep strictly confidential',  owner: 'Leadership / HR' },
    { week: '1 Month Out',  task: 'Order trophies, plaques, or award gifts',            owner: 'Events Team' },
    { week: '2 Weeks Out',  task: 'Plan run-of-show: presenters, music cues, timing',   owner: 'Events Team' },
    { week: 'Week Of',      task: 'Rehearsal with MC and presenters',                   owner: 'Events Team' },
    { week: 'Week Of',      task: 'Seal winner envelopes and deliver to MC',            owner: 'Events Team' },
  ],
  'Client Dinner': [
    { week: '3 Weeks Out', task: 'Reserve private dining room or restaurant',          owner: 'Events Team / Sales' },
    { week: '3 Weeks Out', task: 'Confirm guest list with account team',               owner: 'Sales / Account Team' },
    { week: '2 Weeks Out', task: 'Collect dietary restrictions for all guests',         owner: 'Events Team' },
    { week: '1 Week Out',  task: 'Brief host on conversation priorities and context',   owner: 'Sales / Account Team' },
    { week: '1 Week Out',  task: 'Arrange transportation if clients are traveling',    owner: 'Events Team' },
    { week: 'Week Of',     task: 'Reconfirm reservation and headcount',                owner: 'Events Team' },
    { week: 'Week Of',     task: 'Plan for check payment — pre-authorize or pay early', owner: 'Finance / Events Team' },
  ],
  'Engagement Party': [
    { week: '3 Months Out', task: 'Choose date and decide on host and venue',         owner: '' },
    { week: '2 Months Out', task: 'Create guest list — close family and friends',     owner: '' },
    { week: '2 Months Out', task: 'Send invitations — paper or digital',              owner: '' },
    { week: '1 Month Out',  task: 'Arrange catering, drinks, and any entertainment',  owner: '' },
    { week: 'Week Of',      task: 'Confirm headcount and prepare decorations',         owner: '' },
  ],
  'Vow Renewal': [
    { week: '6 Months Out', task: 'Choose format — intimate dinner or larger event',  owner: 'Both' },
    { week: '6 Months Out', task: 'Book venue and officiant',                         owner: '' },
    { week: '4 Months Out', task: 'Book photographer and any other vendors',          owner: '' },
    { week: '2 Months Out', task: 'Send invitations',                                 owner: '' },
    { week: '1 Month Out',  task: 'Finalize catering, florals, and music',            owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors — prepare new vows if writing', owner: 'Both' },
  ],
  'Retirement Party': [
    { week: '2 Months Out', task: 'Confirm event scope — intimate or company-wide',   owner: '' },
    { week: '2 Months Out', task: 'Book venue or arrange office space',               owner: '' },
    { week: '1 Month Out',  task: 'Send invitations — colleagues, family, friends',   owner: '' },
    { week: '1 Month Out',  task: 'Collect memory submissions from colleagues',       owner: '' },
    { week: '2 Weeks Out',  task: 'Order cake and arrange catering',                  owner: '' },
    { week: 'Week Of',      task: 'Prepare memory book, video tribute, or slideshow', owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors and brief speakers / MC',      owner: '' },
  ],
  'Sweet 16': [
    { week: '3 Months Out', task: 'Set theme, guest list, and budget',               owner: '' },
    { week: '3 Months Out', task: 'Book venue and entertainment — DJ, photo booth',   owner: '' },
    { week: '2 Months Out', task: 'Send invitations — paper or digital',              owner: '' },
    { week: '2 Months Out', task: 'Book caterer and order custom cake',               owner: '' },
    { week: '1 Month Out',  task: 'Order specialty décor items',                      owner: '' },
    { week: '2 Weeks Out',  task: 'Confirm RSVPs and final headcount',                owner: '' },
    { week: 'Week Of',      task: 'Confirm all vendors and finalize decorations',     owner: '' },
  ],
  Quinceañera: [
    { week: '12 Months Out', task: 'Book ceremony and reception venues',              owner: '' },
    { week: '12 Months Out', task: 'Select and confirm court of honor',               owner: '' },
    { week: '12 Months Out', task: 'Establish budget — family, padrinos, sponsors',  owner: 'Family' },
    { week: '8 Months Out',  task: 'Book photographer and videographer',              owner: '' },
    { week: '8 Months Out',  task: 'Book DJ or live band',                            owner: '' },
    { week: '8 Months Out',  task: 'Book caterer and cake designer',                  owner: '' },
    { week: '6 Months Out',  task: 'Order gown and court dresses and suits',          owner: '' },
    { week: '6 Months Out',  task: 'Finalize theme and décor vision',                 owner: '' },
    { week: '4 Months Out',  task: 'Begin court choreography rehearsals',             owner: '' },
    { week: '2 Months Out',  task: 'Send formal invitations',                         owner: '' },
    { week: '1 Month Out',   task: 'Final fittings — gown and court attire',          owner: '' },
    { week: '1 Month Out',   task: 'Confirm all vendors and run-of-show',             owner: '' },
    { week: 'Week Of',       task: 'Deliver decorations and final rehearsal',          owner: '' },
  ],
  Reunion: [
    { week: '6 Months Out', task: 'Set date and book venue',                         owner: '' },
    { week: '6 Months Out', task: 'Build or recover contact list',                   owner: '' },
    { week: '4 Months Out', task: 'Send save-the-dates and open RSVP collection',    owner: '' },
    { week: '3 Months Out', task: 'Plan activities, games, and memory displays',     owner: '' },
    { week: '2 Months Out', task: 'Arrange catering or potluck logistics',           owner: '' },
    { week: '1 Month Out',  task: 'Prepare memory book, photo slideshow, or video',  owner: '' },
    { week: 'Week Of',      task: 'Confirm headcount and finalize food order',        owner: '' },
    { week: 'Week Of',      task: 'Set up name tags, photo displays, and activities', owner: '' },
  ],
  'Fundraiser / Gala': [
    { week: '6 Months Out', task: 'Define fundraising goal and gala format',         owner: '' },
    { week: '6 Months Out', task: 'Secure venue — formal gala spaces book far out',  owner: '' },
    { week: '5 Months Out', task: 'Launch sponsor and table-captain outreach',       owner: '' },
    { week: '4 Months Out', task: 'Confirm auctioneer, MC, or entertainment',        owner: '' },
    { week: '4 Months Out', task: 'Open ticket sales',                               owner: '' },
    { week: '3 Months Out', task: 'Procure silent auction items with team',          owner: '' },
    { week: '2 Months Out', task: 'Finalize catering count and service style',       owner: '' },
    { week: '1 Month Out',  task: 'Finalize run-of-show with MC and presenters',     owner: '' },
    { week: '1 Month Out',  task: 'Set up mobile bidding or prepare bid sheets',     owner: '' },
    { week: 'Week Of',      task: 'Final AV test and décor walkthrough',              owner: '' },
    { week: 'Week Of',      task: 'Brief all volunteers on roles and timeline',       owner: '' },
  ],
  'Networking Event': [
    { week: '4 Weeks Out', task: 'Book venue with open-flow layout',                 owner: '' },
    { week: '4 Weeks Out', task: 'Set ticket price or guest list strategy',          owner: '' },
    { week: '3 Weeks Out', task: 'Launch invitations or ticket sales',               owner: '' },
    { week: '2 Weeks Out', task: 'Arrange light food and drink order',               owner: '' },
    { week: '1 Week Out',  task: 'Confirm headcount and catering',                   owner: '' },
    { week: 'Week Of',     task: 'Prepare name badges and check-in process',         owner: '' },
    { week: 'Week Of',     task: 'Brief any speakers or sponsor reps on format',     owner: '' },
  ],
};

// ─── Budget & vendor templates by event type ──────────────────────────────────

const BUDGET_TEMPLATES = {
  Wedding:        [{ c:'Venue',pct:.28 },{ c:'Catering',pct:.33 },{ c:'Photography',pct:.12 },{ c:'Florals',pct:.08 },{ c:'Entertainment',pct:.06 },{ c:'Hair & Makeup',pct:.04 },{ c:'Cake',pct:.02 },{ c:'Invitations',pct:.02 },{ c:'Transport',pct:.02 },{ c:'Misc',pct:.03 }],
  Corporate:      [{ c:'Venue',pct:.35 },{ c:'Catering',pct:.30 },{ c:'AV / Tech',pct:.16 },{ c:'Entertainment',pct:.10 },{ c:'Decor',pct:.06 },{ c:'Printing / Signage',pct:.03 }],
  'Board Meeting':[{ c:'Catering',pct:.38 },{ c:'AV / Tech',pct:.30 },{ c:'Venue',pct:.18 },{ c:'Printing / Signage',pct:.08 },{ c:'Misc',pct:.06 }],
  Birthday:       [{ c:'Venue',pct:.28 },{ c:'Catering',pct:.38 },{ c:'Entertainment',pct:.15 },{ c:'Decor',pct:.12 },{ c:'Cake',pct:.07 }],
  Anniversary:    [{ c:'Venue',pct:.30 },{ c:'Catering',pct:.35 },{ c:'Photography',pct:.15 },{ c:'Florals',pct:.08 },{ c:'Entertainment',pct:.08 },{ c:'Decor',pct:.04 }],
  'Baby Shower':  [{ c:'Venue',pct:.20 },{ c:'Catering',pct:.40 },{ c:'Decor',pct:.22 },{ c:'Cake',pct:.10 },{ c:'Favors',pct:.08 }],
  'Bridal Shower':[{ c:'Venue',pct:.20 },{ c:'Catering',pct:.40 },{ c:'Decor',pct:.20 },{ c:'Cake',pct:.10 },{ c:'Activities',pct:.10 }],
  Graduation:     [{ c:'Venue',pct:.25 },{ c:'Catering',pct:.50 },{ c:'Decor',pct:.15 },{ c:'Cake',pct:.10 }],
  Other:          [{ c:'Venue',pct:.35 },{ c:'Catering',pct:.40 },{ c:'Entertainment',pct:.15 },{ c:'Misc',pct:.10 }],
  'Engagement Party': [{ c:'Venue',pct:.30 },{ c:'Catering',pct:.50 },{ c:'Decor',pct:.12 },{ c:'Florals',pct:.08 }],
  'Vow Renewal':      [{ c:'Venue',pct:.28 },{ c:'Catering',pct:.35 },{ c:'Photography',pct:.15 },{ c:'Florals',pct:.12 },{ c:'Entertainment',pct:.10 }],
  'Retirement Party': [{ c:'Venue',pct:.25 },{ c:'Catering',pct:.45 },{ c:'Decor',pct:.15 },{ c:'Cake',pct:.10 },{ c:'Misc',pct:.05 }],
  'Sweet 16':         [{ c:'Venue',pct:.28 },{ c:'Catering',pct:.30 },{ c:'Entertainment',pct:.20 },{ c:'Decor',pct:.14 },{ c:'Cake',pct:.08 }],
  Quinceañera:        [{ c:'Venue',pct:.25 },{ c:'Catering',pct:.30 },{ c:'Photography',pct:.10 },{ c:'Florals',pct:.08 },{ c:'Entertainment',pct:.10 },{ c:'Attire',pct:.10 },{ c:'Cake',pct:.04 },{ c:'Misc',pct:.03 }],
  Reunion:            [{ c:'Venue',pct:.25 },{ c:'Catering',pct:.55 },{ c:'Decor',pct:.12 },{ c:'Activities',pct:.08 }],
  'Fundraiser / Gala':[{ c:'Venue',pct:.28 },{ c:'Catering',pct:.32 },{ c:'AV / Tech',pct:.12 },{ c:'Decor',pct:.10 },{ c:'Entertainment',pct:.10 },{ c:'Printing / Signage',pct:.08 }],
  'Networking Event': [{ c:'Venue',pct:.35 },{ c:'Catering',pct:.50 },{ c:'Decor',pct:.10 },{ c:'Printing / Signage',pct:.05 }],
  'Holiday Party':    [{ c:'Venue',pct:.30 },{ c:'Catering',pct:.35 },{ c:'Entertainment',pct:.15 },{ c:'Decor',pct:.12 },{ c:'AV / Tech',pct:.05 },{ c:'Misc',pct:.03 }],
  Conference:         [{ c:'Venue',pct:.35 },{ c:'Catering',pct:.22 },{ c:'AV / Tech',pct:.20 },{ c:'Entertainment',pct:.10 },{ c:'Printing / Signage',pct:.08 },{ c:'Misc',pct:.05 }],
  'Product Launch':   [{ c:'Venue',pct:.22 },{ c:'Catering',pct:.15 },{ c:'AV / Tech',pct:.30 },{ c:'Decor',pct:.12 },{ c:'Printing / Signage',pct:.12 },{ c:'Misc',pct:.09 }],
  'Team Retreat':     [{ c:'Venue',pct:.42 },{ c:'Catering',pct:.28 },{ c:'Activities',pct:.18 },{ c:'Transport',pct:.07 },{ c:'Misc',pct:.05 }],
  'Town Hall':        [{ c:'AV / Tech',pct:.40 },{ c:'Catering',pct:.30 },{ c:'Venue',pct:.18 },{ c:'Printing / Signage',pct:.12 }],
  'Training / Workshop':[{ c:'Venue',pct:.28 },{ c:'Catering',pct:.28 },{ c:'AV / Tech',pct:.22 },{ c:'Printing / Signage',pct:.15 },{ c:'Misc',pct:.07 }],
  'Award Ceremony':   [{ c:'Venue',pct:.28 },{ c:'Catering',pct:.35 },{ c:'AV / Tech',pct:.15 },{ c:'Decor',pct:.10 },{ c:'Printing / Signage',pct:.12 }],
  'Client Dinner':    [{ c:'Venue',pct:.40 },{ c:'Catering',pct:.45 },{ c:'Entertainment',pct:.10 },{ c:'Misc',pct:.05 }],
};

const VENDOR_STUBS = {
  Wedding:        ['Venue','Catering','Photography','Florals','Entertainment','Hair & Makeup','Transport'],
  Corporate:      ['Venue','Catering','AV / Tech','Entertainment'],
  'Board Meeting':['Venue','Catering','AV / Tech'],
  Birthday:       ['Venue','Catering','Entertainment'],
  Anniversary:    ['Venue','Catering','Photography','Florals'],
  'Baby Shower':  ['Venue','Catering'],
  'Bridal Shower':['Venue','Catering'],
  Graduation:     ['Venue','Catering'],
  Other:          ['Venue','Catering'],
  'Engagement Party': ['Venue','Catering'],
  'Vow Renewal':      ['Venue','Catering','Photography','Florals'],
  'Retirement Party': ['Venue','Catering'],
  'Sweet 16':         ['Venue','Catering','Entertainment'],
  Quinceañera:        ['Venue','Catering','Photography','Florals','Entertainment'],
  Reunion:            ['Venue','Catering'],
  'Fundraiser / Gala':['Venue','Catering','AV / Tech','Entertainment'],
  'Networking Event': ['Venue','Catering'],
  'Holiday Party':    ['Venue','Catering','Entertainment','AV / Tech'],
  Conference:         ['Venue','Catering','AV / Tech'],
  'Product Launch':   ['Venue','Catering','AV / Tech'],
  'Team Retreat':     ['Venue','Catering'],
  'Town Hall':        ['Venue','AV / Tech'],
  'Training / Workshop': ['Venue','Catering','AV / Tech'],
  'Award Ceremony':   ['Venue','Catering','AV / Tech'],
  'Client Dinner':    ['Venue','Catering'],
};

// Typical guests-per-table by event type
const TABLE_SIZE = { Wedding: 8, Corporate: 10, 'Board Meeting': 12, Birthday: 8, Anniversary: 8, 'Baby Shower': 6, 'Bridal Shower': 6, Graduation: 8, Other: 8,
  'Engagement Party': 6, 'Vow Renewal': 6, 'Retirement Party': 8, 'Sweet 16': 8, Quinceañera: 8, Reunion: 10,
  'Fundraiser / Gala': 8, 'Networking Event': 0, 'Holiday Party': 10, Conference: 10, 'Product Launch': 0,
  'Team Retreat': 8, 'Town Hall': 0, 'Training / Workshop': 0, 'Award Ceremony': 8, 'Client Dinner': 6,
};

// Event-planner language for good / better / best budget tiers
const TIER_META = {
  Wedding: {
    good:   { label: 'Classic',   tag: 'Complete and elegant — every essential covered' },
    better: { label: 'Elevated',  tag: 'Refined details, upgraded vendors, full florals' },
    best:   { label: 'Luxury',    tag: 'Full production, top-tier vendors, no compromises' },
  },
  Corporate: {
    good:   { label: 'Standard',  tag: 'Professional, functional, client-appropriate' },
    better: { label: 'Executive', tag: 'Polished experience, branded and guest-ready' },
    best:   { label: 'Premier',   tag: 'White-glove, fully produced, stakeholder-level' },
  },
  'Board Meeting': {
    good:   { label: 'Efficient', tag: 'Functional setup — all essentials, no excess' },
    better: { label: 'Executive', tag: 'Professional environment with catered service' },
    best:   { label: 'Premier',   tag: 'Production-grade, fully facilitated, off-site' },
  },
  Birthday: {
    good:   { label: 'Curated', tag: 'Warm, memorable celebration on a smart budget' },
    better: { label: 'Elevated',   tag: 'Styled, catered, and guest-ready' },
    best:   { label: 'Premium',    tag: 'Full-service party with entertainment and décor' },
  },
  Anniversary: {
    good:   { label: 'Classic',   tag: 'Intimate and heartfelt — beautifully done' },
    better: { label: 'Elevated',  tag: 'Curated dinner experience with personal touches' },
    best:   { label: 'Signature', tag: 'Luxury celebration — destination-worthy feel' },
  },
  'Baby Shower': {
    good:   { label: 'Sweet',    tag: 'Charming and personal — all the essentials' },
    better: { label: 'Styled',   tag: 'Florals, catering, and a cohesive aesthetic' },
    best:   { label: 'Luxury',   tag: 'Full styling, catered brunch, memorable details' },
  },
  'Bridal Shower': {
    good:   { label: 'Classic',  tag: 'Elegant and personal — tasteful and complete' },
    better: { label: 'Elevated', tag: 'Styled venue, catered menu, curated details' },
    best:   { label: 'Luxury',   tag: 'Full production — florals, catering, entertainment' },
  },
  Graduation: {
    good:   { label: 'Celebration', tag: 'Festive, fun, and within budget' },
    better: { label: 'Elevated',    tag: 'Styled party with catered food and décor' },
    best:   { label: 'Premium',     tag: 'Full-service event — live entertainment, full bar' },
  },
  Other: {
    good:   { label: 'Curated', tag: 'Covers every must-have, managed spend' },
    better: { label: 'Elevated',   tag: 'Upgraded experience with added polish' },
    best:   { label: 'Signature',  tag: 'Premium, full-service, fully produced' },
  },
  'Engagement Party': {
    good:   { label: 'Intimate',   tag: 'Home or casual venue — warm and personal' },
    better: { label: 'Hosted',     tag: 'Venue or restaurant with catering and florals' },
    best:   { label: 'Elevated',   tag: 'Styled venue, full catering, photographer' },
  },
  'Vow Renewal': {
    good:   { label: 'Intimate',   tag: 'Small gathering — heartfelt and personal' },
    better: { label: 'Curated',    tag: 'Venue with catering, florals, and photography' },
    best:   { label: 'Celebration', tag: 'Full event with entertainment and luxury touches' },
  },
  'Retirement Party': {
    good:   { label: 'Gathering',  tag: 'Casual, warm, and memorable on a budget' },
    better: { label: 'Celebration', tag: 'Catered venue with program and tributes' },
    best:   { label: 'Elevated',   tag: 'Full-service event, entertainment, and lasting keepsakes' },
  },
  'Sweet 16': {
    good:   { label: 'Party',      tag: 'Fun and festive — all the essentials' },
    better: { label: 'Elevated',   tag: 'Themed venue, catering, DJ, and décor' },
    best:   { label: 'Premier',    tag: 'Full production — photo booth, live entertainment, custom styling' },
  },
  Quinceañera: {
    good:   { label: 'Traditional', tag: 'Complete ceremony and reception on budget' },
    better: { label: 'Elevated',    tag: 'Full court, florals, and upgraded catering' },
    best:   { label: 'Luxury',      tag: 'Designer production — comparable to a luxury wedding' },
  },
  Reunion: {
    good:   { label: 'Gathering',  tag: 'Casual, fun, and budget-friendly' },
    better: { label: 'Organized',  tag: 'Venue, catered food, activities, and memory display' },
    best:   { label: 'Memorable',  tag: 'Full program — entertainment, slideshow, and full catering' },
  },
  'Fundraiser / Gala': {
    good:   { label: 'Functional', tag: 'Mission-focused, cost-conscious event that raises money' },
    better: { label: 'Polished',   tag: 'Formal gala with catering, AV, and live auction' },
    best:   { label: 'Premier',    tag: 'Full production gala — entertainment, premium catering, live bidding' },
  },
  'Networking Event': {
    good:   { label: 'Casual',     tag: 'Light food and drinks — emphasis on conversation' },
    better: { label: 'Organized',  tag: 'Venue, catering, and a structured icebreaker or speaker' },
    best:   { label: 'Branded',    tag: 'Premium experience — hosted bar, entertainment, sponsor presence' },
  },
  'Holiday Party': {
    good:   { label: 'Festive',    tag: 'Team celebrates — catering, venue, core entertainment' },
    better: { label: 'Executive',  tag: 'Polished venue, catered dinner, DJ or live music' },
    best:   { label: 'Premium',    tag: 'Full production party — open bar, entertainment, custom experience' },
  },
  Conference: {
    good:   { label: 'Professional', tag: 'Well-run conference — solid content, clean execution' },
    better: { label: 'Elevated',     tag: 'Production value, premium catering, breakout sessions' },
    best:   { label: 'Premier',      tag: 'Large-scale produced conference — keynote stage, sponsorships, full AV' },
  },
  'Product Launch': {
    good:   { label: 'Debut',     tag: 'Clean, on-brand, gets the story out' },
    better: { label: 'Produced',  tag: 'Stage, AV production, press-ready, media event' },
    best:   { label: 'Flagship',  tag: 'Full-scale launch event — broadcast quality, VIP experience' },
  },
  'Team Retreat': {
    good:   { label: 'Offsite',   tag: 'Change of scene — practical, productive, and team-building' },
    better: { label: 'Elevated',  tag: 'Destination accommodations, facilitated sessions, team activities' },
    best:   { label: 'Signature', tag: 'Premium destination retreat — full facilitation, curated experiences' },
  },
  'Town Hall': {
    good:   { label: 'Effective', tag: 'Message delivered clearly, all employees reached' },
    better: { label: 'Polished',  tag: 'Professional setup with hybrid access and engagement elements' },
    best:   { label: 'Produced',  tag: 'Full production — broadcast quality, live Q&A, catering' },
  },
  'Training / Workshop': {
    good:   { label: 'Focused',   tag: 'Learning objective met, room set up, materials ready' },
    better: { label: 'Organized', tag: 'Catered, professional facilitator, printed materials' },
    best:   { label: 'Premium',   tag: 'Off-site venue, expert facilitator, full catering, printed workbooks' },
  },
  'Award Ceremony': {
    good:   { label: 'Recognition', tag: 'Meaningful ceremony that celebrates your people' },
    better: { label: 'Polished',    tag: 'Formal venue, catering, production with music cues' },
    best:   { label: 'Gala',        tag: 'Full production award night — black tie, premium catering, entertainment' },
  },
  'Client Dinner': {
    good:   { label: 'Hosted',    tag: 'Great meal, great conversation, solid impression' },
    better: { label: 'Executive', tag: 'Private room, curated menu, thoughtful hospitality' },
    best:   { label: 'Premium',   tag: 'White-glove experience — Michelin-level dining, full evening program' },
  },
};

const PER_HEAD = {
  Wedding:         { good: 85,  better: 140, best: 220 },
  Corporate:       { good: 60,  better: 90,  best: 150 },
  'Board Meeting': { good: 45,  better: 80,  best: 140 },
  Birthday:        { good: 40,  better: 65,  best: 110 },
  Anniversary:     { good: 70,  better: 110, best: 180 },
  'Baby Shower':   { good: 30,  better: 50,  best: 85  },
  'Bridal Shower': { good: 35,  better: 55,  best: 90  },
  Graduation:      { good: 35,  better: 55,  best: 90  },
  Other:           { good: 50,  better: 80,  best: 130 },
  'Engagement Party':  { good: 25,  better: 45,  best: 75  },
  'Vow Renewal':       { good: 60,  better: 100, best: 160 },
  'Retirement Party':  { good: 30,  better: 50,  best: 80  },
  'Sweet 16':          { good: 40,  better: 65,  best: 105 },
  Quinceañera:         { good: 80,  better: 130, best: 200 },
  Reunion:             { good: 25,  better: 45,  best: 70  },
  'Fundraiser / Gala': { good: 75,  better: 120, best: 200 },
  'Networking Event':  { good: 20,  better: 35,  best: 60  },
  'Holiday Party':     { good: 55,  better: 85,  best: 140 },
  Conference:          { good: 65,  better: 100, best: 180 },
  'Product Launch':    { good: 80,  better: 130, best: 220 },
  'Team Retreat':      { good: 120, better: 200, best: 350 },
  'Town Hall':         { good: 20,  better: 40,  best: 70  },
  'Training / Workshop':{ good: 40, better: 70,  best: 120 },
  'Award Ceremony':    { good: 60,  better: 95,  best: 160 },
  'Client Dinner':     { good: 80,  better: 140, best: 250 },
};

const TIER_WHY = {
  Wedding: {
    good:   ['Buffet or food stations', 'DJ music', 'Budget-friendly venue', 'Simple florals', 'Photography only (no video)'],
    better: ['Plated dinner service', 'Upgraded venue with extras', 'Custom florals + centerpieces', 'Full-day photographer', 'Premium DJ or small band'],
    best:   ['Multi-course fine dining', 'Luxury venue + valet', 'Designer florals + décor', 'Photographer + videographer', 'Live band + premium open bar'],
  },
  Corporate: {
    good:   ['Box lunch or casual buffet', 'Basic in-house AV', 'Conference center or office space', 'Standard setup'],
    better: ['Buffet stations or sit-down service', 'Professional AV rental', 'Dedicated event space', 'Branded signage + materials'],
    best:   ['Full plated service + open bar', 'Premium AV + production team', 'Upscale hotel or venue', 'Entertainment + keynote production'],
  },
  'Board Meeting': {
    good:   ['In-office boardroom', 'Working breakfast or boxed lunch', 'Laptop + screen share AV', 'Printed agendas only'],
    better: ['Executive conference center', 'Catered working lunch with breaks', 'Pro AV with video conferencing', 'Printed board packets + nameplates'],
    best:   ['Premium hotel executive suite', 'Full catering — breakfast + lunch + dinner breaks', 'Production-grade hybrid AV', 'Minutes service + professional facilitation'],
  },
  Birthday: {
    good:   ['Backyard or community space', 'Buffet or pizza', 'Basic decorations', 'Background music playlist'],
    better: ['Rented venue', 'Catered food stations', 'Themed décor + florals', 'DJ or photo booth'],
    best:   ['Upscale venue', 'Catered plated dinner', 'Full styling + entertainment', 'Live music + premium bar'],
  },
  Anniversary: {
    good:   ['Restaurant buyout or private room', 'Set menu dinner', 'Simple florals', 'Personal playlist'],
    better: ['Boutique event venue', 'Custom catering', 'Florals + candles', 'Photographer + DJ'],
    best:   ['Luxury venue or destination', 'Chef-crafted dinner', 'Designer styling', 'Photographer + videographer + entertainment'],
  },
  'Baby Shower': {
    good:   ['Home or community space', 'Light food and drinks', 'DIY décor', 'Simple games + favors'],
    better: ['Rented venue or restaurant', 'Catered brunch or lunch', 'Florals + balloon arch', 'Games + favor bags'],
    best:   ['Upscale venue', 'Full catering + custom cake', 'Styled florals + backdrop', 'Photographer + premium favors'],
  },
  'Bridal Shower': {
    good:   ['Home or hosted venue', 'Light brunch or lunch', 'DIY décor + games', 'Simple favors'],
    better: ['Restaurant or event space', 'Catered brunch', 'Florals + styled table', 'Party favors + activities'],
    best:   ['Upscale venue', 'Full catering + open bar', 'Styled florals + photo wall', 'Photographer + premium experience'],
  },
  Graduation: {
    good:   ['Backyard or park', 'Catered BBQ or pizza', 'Basic decorations', 'Music + games'],
    better: ['Rented hall or venue', 'Catered buffet', 'Themed décor + photo wall', 'DJ or entertainment'],
    best:   ['Upscale venue', 'Full catering + bar', 'Custom styling + photographer', 'Premium entertainment'],
  },
  Other: {
    good:   ['Basic venue', 'Buffet or casual catering', 'Simple decorations', 'Minimal extras'],
    better: ['Mid-range venue', 'Catered service', 'Florals + décor', 'Photography + entertainment'],
    best:   ['Premium venue', 'Full plated service', 'Designer styling', 'Full production + entertainment'],
  },
  'Engagement Party': {
    good:   ['Home or backyard setting', 'DIY food or simple catering', 'Flowers from grocery store', 'Close family + friends only'],
    better: ['Restaurant private room or event space', 'Catered food and drinks', 'Florals + simple décor', 'Photographer or designated family photographer'],
    best:   ['Upscale venue or rooftop', 'Full catering + open bar', 'Professional photographer', 'Custom florals and styling'],
  },
  'Holiday Party': {
    good:   ['Office or rented event hall', 'Catered buffet or food stations', 'Basic DJ or playlist', 'Simple décor'],
    better: ['Dedicated event venue', 'Catered dinner with options', 'Professional DJ', 'Branded décor and photo ops'],
    best:   ['Upscale venue', 'Full plated dinner + premium open bar', 'Live entertainment or band', 'Custom experience with photo booth'],
  },
  Conference: {
    good:   ['Hotel ballroom or convention space', 'Box lunches or buffet', 'Standard rental AV', 'Printed agendas'],
    better: ['Dedicated conference center', 'Catered breaks + full lunches', 'Professional AV crew', 'Branded signage + speaker materials'],
    best:   ['Premier venue with production stage', 'Full catering all day + evening reception', 'Live streaming + broadcast AV', 'Custom app, branded materials, sponsor wall'],
  },
  'Product Launch': {
    good:   ['Rented event space', 'Light catering or cocktail reception', 'Basic AV + screen', 'Press release + invite list'],
    better: ['Custom-built stage or branded space', 'Hosted cocktail + catering', 'Pro AV + lighting', 'Live demo stations + press kit'],
    best:   ['Full-scale branded production', 'Gala-style catering', 'Broadcast-quality AV + live streaming', 'VIP media experience + post-event reception'],
  },
  'Team Retreat': {
    good:   ['Local venue or nearby hotel', 'Restaurant meals', 'One planned team activity', 'Self-facilitated agenda'],
    better: ['Regional destination', 'Included meals + snacks', '2–3 team activities + external facilitator', 'Full itinerary with downtime'],
    best:   ['Premium destination (resort or destination city)', 'All meals curated', 'Executive coach or external facilitator', 'Full multi-day program with evening events'],
  },
  'Fundraiser / Gala': {
    good:   ['Venue with in-house catering', 'Buffet or seated dinner', 'Silent auction + MC', 'Printed bid sheets'],
    better: ['Ballroom or formal venue', 'Plated dinner with bar', 'Live auctioneer + entertainment', 'Mobile bidding platform'],
    best:   ['Premier gala venue', 'Multi-course dinner + premium open bar', 'Celebrity MC or live performer', 'Full AV production + video tributes'],
  },
  Quinceañera: {
    good:   ['Community hall or church venue', 'Buffet catering', 'DJ + basic florals', 'Court of 8–10'],
    better: ['Event ballroom', 'Plated dinner', 'Live band or premium DJ + full florals', 'Court of 14 + choreography'],
    best:   ['Luxury venue', 'Multi-course dinner + premium bar', 'Live band + videographer + designer florals', 'Full court production + surprise dance'],
  },
  'Vow Renewal':  { good: ['Intimate home or restaurant', 'Dinner or buffet', 'Simple florals', 'Family officiant'], better: ['Boutique venue', 'Catered dinner', 'Florals + photographer', 'DJ or live musician'], best: ['Luxury venue or destination', 'Full catering + bar', 'Designer florals + videographer', 'Band + full guest experience'] },
  'Retirement Party': { good: ['Office or community space', 'Potluck or catered buffet', 'Slideshow tribute', 'Speeches'], better: ['Restaurant or event venue', 'Catered meal', 'Memory book + video tribute', 'DJ or background music'], best: ['Upscale venue', 'Full catering + bar', 'Professional videographer + custom keepsake', 'Entertainment'] },
  'Sweet 16': { good: ['Home or community venue', 'Catered food stations', 'DJ + basic décor', 'Birthday cake'], better: ['Rented event space', 'Full catering', 'DJ + photo booth + themed décor', 'Custom cake'], best: ['Upscale venue', 'Full catering + bar (for adults)', 'Live entertainment + photo booth + custom styling', 'Custom 3-tier cake'] },
  Reunion: { good: ['Park, community hall, or backyard', 'Potluck or simple catering', 'DIY games and activities', 'Name tags'], better: ['Rented venue', 'Catered food', 'Planned activities + photo slideshow', 'Memory table'], best: ['Resort or upscale venue', 'Full catering + bar', 'Photographer + video tribute', 'Full entertainment and activities program'] },
  'Networking Event': { good: ['Borrowed office space or bar', 'Light snacks + drinks', 'Name badges only', 'Organic networking'], better: ['Dedicated event venue', 'Hosted bar + catered appetizers', 'Structured icebreaker or speaker', 'Printed name badges'], best: ['Premium venue', 'Full hosted bar + heavy appetizers', 'Featured speaker or panel + entertainment', 'Branded materials + sponsor presence'] },
  'Town Hall': { good: ['Company meeting room or office space', 'No catering needed', 'Laptop + screen share AV', 'Zoom for remote attendees'], better: ['Larger company auditorium or rented space', 'Light catering or snacks', 'Pro AV + professional streaming setup', 'Live Q&A with moderation'], best: ['Conference center or hotel ballroom', 'Full catering for in-person attendees', 'Broadcast-grade AV + production team', 'Live polling, Q&A platform, multi-camera stream'] },
  'Training / Workshop': { good: ['Conference room', 'No catering or basic snacks', 'Laptop + projector', 'Printed materials'], better: ['External training room or hotel space', 'Catered working lunch + breaks', 'AV with interactive capabilities', 'Bound workbooks or tablets'], best: ['Off-site training center or resort', 'Full catering all day', 'Expert facilitator + pro AV', 'Custom workbooks + digital follow-up'] },
  'Award Ceremony': { good: ['Company meeting space or restaurant private room', 'Catered dinner or buffet', 'Basic AV', 'Trophies or plaques'], better: ['Event venue or hotel ballroom', 'Plated dinner + bar', 'Professional AV with music cues + MC', 'Custom awards + sponsor wall'], best: ['Gala venue', 'Full plated dinner + premium bar', 'Full production — lighting, video, live band', 'Custom trophies + gift bags + photographer'] },
  'Client Dinner': { good: ['Quality restaurant', 'Set menu dinner', 'Thoughtful conversation', 'Pick up the check'], better: ['Restaurant with private room', 'Chef\'s tasting menu or à la carte', 'Wine pairing + curated hospitality', 'Pre-dinner drinks or gift'], best: ['Michelin-level or exclusive restaurant', 'Full hosted evening with pre and post drinks', 'Custom experience — chef\'s table, private sommelier', 'Gift + follow-up surprise'] },
};

const PAY_METHODS = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Zelle', 'Venmo', 'PayPal', 'Wire', 'Other'];

// ─── Communication log types + quick-fill templates ───────────────────────────
const LOG_TYPES = [
  { type: 'Phone Call',  icon: '📞' },
  { type: 'Email',       icon: '📧' },
  { type: 'Text / SMS',  icon: '💬' },
  { type: 'Meeting',     icon: '🤝' },
  { type: 'Video Call',  icon: '📹' },
  { type: 'Contract',    icon: '📄' },
  { type: 'Payment',     icon: '💰' },
  { type: 'Confirmation',icon: '✅' },
  { type: 'Note',        icon: '📝' },
];
const LOG_TEMPLATES = {
  'Phone Call':  ['Called — discussed ', 'Left voicemail, awaiting callback.', 'Confirmed details by phone.', 'Called to follow up — no answer.'],
  'Email':       ['Sent inquiry email.', 'Sent proposal — awaiting response.', 'Followed up by email.', 'Received confirmation email.'],
  'Text / SMS':  ['Texted to confirm availability.', 'Received text reply — ', 'Sent reminder via text.'],
  'Meeting':     ['Initial consultation — ', 'Site visit completed — ', 'Final walkthrough — ', 'Contract signing meeting.'],
  'Video Call':  ['Video call — discussed ', 'Video consultation completed — ', 'Review call — '],
  'Contract':    ['Contract sent for signature.', 'Signed contract received.', 'Proposal / quote received — $', 'Amendment sent for review.'],
  'Payment':     ['Deposit paid — $', 'Balance payment sent — $', 'Invoice received — $', 'Partial payment — $'],
  'Confirmation':['Booking confirmed.', 'All details confirmed in writing.', 'Locked in — no further changes expected.'],
  'Note':        ['Important: ', 'Action needed — ', 'Reminder: ', 'FYI — '],
};

// Build a deep-link URL for digital payment methods so planners can tap and pay.
// Returns null when no link can be constructed (cash, check, wire, etc.).
function buildPayLink(method, vendor, amount) {
  const amt   = (amount || 0).toFixed(2);
  const note  = encodeURIComponent(vendor.name || 'Event balance');
  const pNote = vendor.paymentNote || '';

  if (method === 'Venmo') {
    const handle = (vendor.venmo || '').replace(/^@/, '')
      || (pNote.match(/venmo[:\s]+@?([A-Za-z0-9_.-]+)/i) || [])[1];
    if (handle) return `https://venmo.com/${handle}?txn=pay&amount=${amt}&note=${note}`;
  }
  if (method === 'PayPal') {
    const raw = (pNote.match(/paypal(?:\.me)?[:\s/]+([^\s,]+)/i) || [])[1];
    if (raw) {
      const slug = raw.replace(/^\//, '');
      return slug.includes('@')
        ? `https://www.paypal.com/paypalme/${encodeURIComponent(slug)}`
        : `https://paypal.me/${slug}/${amt}`;
    }
  }
  if (method === 'Cash App') {
    const handle = (pNote.match(/\$([A-Za-z0-9_-]+)/) || [])[1];
    if (handle) return `https://cash.app/$${handle}/${amt}`;
  }
  if (method === 'Zelle') {
    // No universal deep-link for Zelle — return info string so caller knows it's a text prompt
    const info = (pNote.match(/zelle[:\s]+([^\s,]+)/i) || [])[1];
    return info ? `zelle:${info}` : null;
  }
  return null;
}

const CONSULT_QUESTIONS = {
  Wedding: [
    { id: 'basics', title: 'The Couple', items: [
      { id: 'names',    q: 'Names and how you met (the short version)',      type: 'text'  },
      { id: 'date',     q: 'Target date — firm or flexible?',                type: 'radio', opts: ['Firm date in mind', 'Flexible ±2 weeks', 'Flexible by season', 'No preference yet'] },
      { id: 'venue',    q: 'Venue status',                                   type: 'radio', opts: ['Already booked', 'Have a few in mind', 'Starting from scratch'] },
    ]},
    { id: 'guests', title: 'Guests & Logistics', items: [
      { id: 'count',    q: 'Estimated guest count',                          type: 'number', hint: 'Total invited, including plus-ones' },
      { id: 'oot',      q: 'Out-of-town guests',                             type: 'radio', opts: ['Mostly local', 'About half travel', 'Mostly destination'] },
      { id: 'kids',     q: 'Children attending?',                            type: 'radio', opts: ['Yes, several', 'A few', 'Adults only'] },
      { id: 'outdoor',  q: 'Indoor vs outdoor',                              type: 'radio', opts: ['Must be outdoors', 'Prefer outdoor with backup', 'Prefer indoor', 'No preference'] },
    ]},
    { id: 'style', title: 'Style & Vibe', items: [
      { id: 'vibe',     q: 'Describe your ideal wedding in 3 words',         type: 'text'  },
      { id: 'formal',   q: 'Formality level',                                type: 'radio', opts: ['Black tie', 'Semi-formal', 'Cocktail casual', 'Relaxed / bohemian'] },
      { id: 'priority', q: 'What matters most?',                             type: 'radio', opts: ['Photography', 'Food & drink', 'Music & dancing', 'Floral & décor', 'Guest experience'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Ballpark budget range',                          type: 'radio', opts: ['Under $15k', '$15k–$30k', '$30k–$50k', '$50k–$75k', '$75k+', 'Not sure yet'] },
      { id: 'flex',     q: 'Is the budget fixed or flexible?',               type: 'radio', opts: ['Hard ceiling — do not exceed', 'Flexible for the right vendors', 'Open if we love it'] },
      { id: 'contrib',  q: 'Who is contributing to the budget?',             type: 'text'  },
    ]},
    { id: 'vendors', title: 'Vendors & Services', items: [
      { id: 'booked',   q: 'What have you already booked?',                  type: 'text'  },
      { id: 'music',    q: 'Music preference',                               type: 'radio', opts: ['Live band', 'DJ', 'Acoustic / ceremony only', 'Playlist / DIY'] },
      { id: 'catering', q: 'Catering style',                                 type: 'radio', opts: ['Plated dinner', 'Buffet / stations', 'Family-style', 'Cocktail / grazing'] },
      { id: 'photo',    q: 'Photography priority',                           type: 'radio', opts: ['Top priority — no compromise', 'Important', 'Nice to have'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'timeline', q: 'When do you need to make decisions by?',         type: 'text'  },
      { id: 'concerns', q: 'What are you most worried about?',               type: 'text'  },
      { id: 'others',   q: 'Speaking with other planners?',                  type: 'radio', opts: ['Yes, comparing a few', 'No — first call', 'Undecided'] },
    ]},
  ],
  'Board Meeting': [
    { id: 'meeting', title: 'Meeting Overview', items: [
      { id: 'purpose',  q: 'Primary meeting purpose',                         type: 'radio', opts: ['Annual strategic planning', 'Quarterly review', 'Budget approval', 'Special resolution / vote', 'Committee session', 'Retreat / offsite'] },
      { id: 'org',      q: 'Organization type',                               type: 'radio', opts: ['Non-profit / association', 'For-profit company', 'Government / public body', 'Foundation / endowment'] },
      { id: 'formal',   q: 'Formality level',                                 type: 'radio', opts: ['Formal — Roberts Rules of Order', 'Semi-formal — structured agenda', 'Working session — collaborative', 'Retreat — informal + facilitated'] },
    ]},
    { id: 'attendees', title: 'Attendees & Quorum', items: [
      { id: 'count',    q: 'Total board members',                             type: 'number', hint: 'Total voting members including remote' },
      { id: 'remote',   q: 'Remote / hybrid attendees?',                      type: 'radio', opts: ['All in person', 'A few remote', 'Fully hybrid (50/50)', 'Fully virtual'] },
      { id: 'quorum',   q: 'Quorum requirement',                              type: 'text', hint: 'e.g. simple majority, 2/3, specific number' },
      { id: 'observers',q: 'Non-voting observers / staff attending?',         type: 'radio', opts: ['Board only', 'Staff + leadership', 'Advisors / counsel present', 'Open to members / public'] },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'date',     q: 'Target date and time',                            type: 'text'  },
      { id: 'duration', q: 'Expected duration',                               type: 'radio', opts: ['2–3 hours', 'Half day (4 hrs)', 'Full day', 'Multi-day retreat'] },
      { id: 'venue',    q: 'Venue preference',                                type: 'radio', opts: ["Organization's own boardroom", 'Hotel executive conference', 'Law firm / professional office', 'Offsite retreat facility'] },
      { id: 'recording',q: 'Recording / minutes needs',                       type: 'radio', opts: ['Formal minutes by secretary', 'Audio/video recording', 'Professional minutes service', 'Notes only — no recording'] },
    ]},
    { id: 'content', title: 'Content & Materials', items: [
      { id: 'agenda',   q: 'Agenda status',                                   type: 'radio', opts: ['Draft in progress', 'Needs to be built', 'Already finalized', 'Template from prior meeting'] },
      { id: 'materials',q: 'Board packet / pre-read materials',               type: 'radio', opts: ['Digital only', 'Printed packets required', 'Both digital + printed', 'No packet — items presented live'] },
      { id: 'av',       q: 'AV and tech needs',                               type: 'radio', opts: ['Basic — screen + laptop', 'Video conferencing for remote members', 'Full AV + presentation support', 'Voting / polling system needed'] },
    ]},
    { id: 'catering', title: 'Catering', items: [
      { id: 'meals',    q: 'Meal coverage needed',                            type: 'radio', opts: ['Coffee / beverages only', 'Working breakfast', 'Working lunch', 'Breakfast + lunch', 'Full day + dinner'] },
      { id: 'style',    q: 'Catering style',                                  type: 'radio', opts: ['Box meals / individual', 'Buffet / food stations', 'Plated service', 'Heavy appetizers / grazing'] },
      { id: 'dietary',  q: 'Known dietary restrictions?',                     type: 'text', hint: 'e.g. vegetarian, Kosher, allergies — list them' },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'decide',   q: 'When does planning need to be finalized?',        type: 'text'  },
      { id: 'concerns', q: 'Biggest concern for this meeting?',               type: 'text'  },
      { id: 'approval', q: 'Budget approval process',                         type: 'radio', opts: ['Already approved', 'Executive director approval', 'Board committee approval', 'Finance department'] },
    ]},
  ],
  Corporate: [
    { id: 'goals', title: 'Event Goals', items: [
      { id: 'purpose',  q: 'Primary purpose',                                type: 'radio', opts: ['Team morale / celebration', 'Client entertainment', 'Product launch', 'Conference / training', 'Annual meeting', 'Other'] },
      { id: 'kpis',     q: 'How will you measure success?',                  type: 'text'  },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'count',    q: 'Expected attendee count',                        type: 'number', hint: 'Include staff + contractors if venue capacity matters' },
      { id: 'date',     q: 'Target date or window',                          type: 'text'  },
      { id: 'duration', q: 'Event duration',                                 type: 'radio', opts: ['2–3 hours', 'Half day', 'Full day', 'Multi-day'] },
      { id: 'location', q: 'Venue type preference',                          type: 'radio', opts: ['Office / HQ', 'Hotel / conference center', 'Unique / creative venue', 'Offsite / destination'] },
    ]},
    { id: 'content', title: 'Content & Experience', items: [
      { id: 'speakers', q: 'Speakers or presentations?',                     type: 'radio', opts: ['Keynotes + breakouts', 'One or two speakers', 'No formal presentations', 'TBD'] },
      { id: 'entertain',q: 'Entertainment or activities?',                   type: 'radio', opts: ['None needed', 'Background music', 'Team-building activity', 'Live entertainment'] },
      { id: 'av',       q: 'AV complexity',                                  type: 'radio', opts: ['Basic — projector + mic', 'Full AV with screens', 'Live streaming', 'Full production'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Approved budget range',                          type: 'radio', opts: ['Under $5k', '$5k–$15k', '$15k–$30k', '$30k–$60k', '$60k+', 'Not yet approved'] },
      { id: 'approval', q: 'Approval process',                               type: 'radio', opts: ['Single approver', 'Committee approval', 'Already approved', 'Needs PO / procurement'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'decide',   q: 'Decision timeline',                              type: 'text'  },
      { id: 'stakes',   q: 'Other stakeholders in the decision?',            type: 'text'  },
      { id: 'concerns', q: 'What is your biggest concern?',                  type: 'text'  },
    ]},
  ],
  Birthday: [
    { id: 'honor', title: 'The Guest of Honor', items: [
      { id: 'who',      q: 'Who is this party for?',                         type: 'text'  },
      { id: 'milestone',q: 'Age / milestone?',                               type: 'text'  },
      { id: 'surprise', q: 'Surprise party?',                                type: 'radio', opts: ['Full surprise', 'Semi-surprise', 'No'] },
      { id: 'vibe',     q: 'Describe their personality and what they love',  type: 'text'  },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'count',    q: 'Guest count',                                    type: 'number', hint: 'Total expected, including kids' },
      { id: 'ages',     q: 'Guest age range',                                type: 'radio', opts: ['All adults', 'Mixed adults + kids', 'Mostly kids'] },
      { id: 'date',     q: 'Target date',                                    type: 'text'  },
      { id: 'venue',    q: 'Venue type',                                     type: 'radio', opts: ['Home / backyard', 'Restaurant / private room', 'Rented venue / hall', 'Activity venue (bowling, escape room…)'] },
    ]},
    { id: 'experience', title: 'Theme & Experience', items: [
      { id: 'theme',    q: 'Theme or concept (if any)',                      type: 'text'  },
      { id: 'food',     q: 'Food style',                                     type: 'radio', opts: ['Casual / DIY', 'Catered buffet', 'Sit-down dinner', 'Appetizers / grazing'] },
      { id: 'entertain',q: 'Entertainment',                                  type: 'radio', opts: ['Free socializing', 'Music / DJ', 'Photo booth', 'Games / activities', 'Live performer'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Total budget range',                             type: 'radio', opts: ['Under $1k', '$1k–$3k', '$3k–$7k', '$7k–$15k', '$15k+'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'concerns', q: 'What are you most worried about?',               type: 'text'  },
      { id: 'decide',   q: 'When do you need to finalize?',                  type: 'text'  },
    ]},
  ],
  Anniversary: [
    { id: 'couple', title: 'The Couple', items: [
      { id: 'names',    q: 'Names and how long together?',                   type: 'text'  },
      { id: 'milestone',q: 'Which anniversary?',                             type: 'text'  },
      { id: 'surprise', q: 'Surprise party?',                                type: 'radio', opts: ['Full surprise', 'Semi-surprise', 'No — they know'] },
      { id: 'vibe',     q: 'Tone — intimate dinner, big party, or between?', type: 'radio', opts: ['Intimate — 20 or fewer', 'Mid-size — 20–60', 'Big celebration — 60+'] },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'count',    q: 'Guest count',                                    type: 'number' },
      { id: 'date',     q: 'Target date',                                    type: 'text'  },
      { id: 'venue',    q: 'Venue type',                                     type: 'radio', opts: ['Their home', 'Restaurant / private room', 'Venue / hall', 'Destination'] },
    ]},
    { id: 'experience', title: 'Style & Experience', items: [
      { id: 'catering', q: 'Food style',                                     type: 'radio', opts: ['Plated dinner', 'Buffet / stations', 'Cocktail reception', 'Catered at home'] },
      { id: 'music',    q: 'Entertainment',                                  type: 'radio', opts: ['Background playlist', 'Live acoustic', 'DJ', 'No music needed'] },
      { id: 'photo',    q: 'Photography?',                                   type: 'radio', opts: ['Yes — top priority', 'Nice to have', 'No'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Total budget range',                             type: 'radio', opts: ['Under $2k', '$2k–$5k', '$5k–$15k', '$15k+'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'concerns', q: 'Biggest concern or constraint?',                 type: 'text'  },
      { id: 'decide',   q: 'When do you need to decide?',                   type: 'text'  },
    ]},
  ],
  'Bridal Shower': [
    { id: 'honor', title: 'The Bride-to-Be', items: [
      { id: 'who',      q: 'Bride\'s name and wedding date?',                type: 'text'  },
      { id: 'vibe',     q: 'Her personality — how does she like to celebrate?', type: 'text' },
      { id: 'theme',    q: 'Theme or aesthetic',                             type: 'radio', opts: ['Garden party', 'Brunch / mimosas', 'Spa / relaxation', 'Elegant / classic', 'Her choice'] },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'count',    q: 'Guest count',                                    type: 'number', hint: 'Including the bridal party' },
      { id: 'date',     q: 'Target date (typically 2–4 weeks before wedding)', type: 'text' },
      { id: 'venue',    q: 'Venue type',                                     type: 'radio', opts: ['Host\'s home', 'Restaurant / private room', 'Rented venue', 'Outdoor / garden'] },
    ]},
    { id: 'experience', title: 'Food & Activities', items: [
      { id: 'catering', q: 'Food format',                                    type: 'radio', opts: ['Full brunch / lunch', 'Light bites / appetizers', 'Afternoon tea', 'Desserts only'] },
      { id: 'entertain',q: 'Activities',                                     type: 'radio', opts: ['Games only', 'Craft activity', 'Spa treatments', 'Just mingling', 'Mix of everything'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Total budget',                                   type: 'radio', opts: ['Under $500', '$500–$1,500', '$1,500–$3k', '$3k+'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'concerns', q: 'What needs to happen first?',                    type: 'text'  },
    ]},
  ],
  'Baby Shower': [
    { id: 'honor', title: 'The Parents-to-Be', items: [
      { id: 'who',      q: 'Name(s) and due date?',                          type: 'text'  },
      { id: 'gender',   q: 'Gender reveal at the shower?',                   type: 'radio', opts: ['Yes — they don\'t know', 'Yes — they know, guests don\'t', 'No — already revealed', 'No reveal planned'] },
      { id: 'theme',    q: 'Theme or color palette',                         type: 'text'  },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'count',    q: 'Guest count',                                    type: 'number' },
      { id: 'date',     q: 'Target date (typically 4–6 weeks before due date)', type: 'text' },
      { id: 'venue',    q: 'Venue type',                                     type: 'radio', opts: ['Home', 'Restaurant / private room', 'Community space', 'Outdoor'] },
    ]},
    { id: 'experience', title: 'Food & Activities', items: [
      { id: 'catering', q: 'Food style',                                     type: 'radio', opts: ['Brunch', 'Lunch', 'Light bites', 'Desserts + cake'] },
      { id: 'entertain',q: 'Games and activities',                           type: 'radio', opts: ['Classic shower games', 'Craft activity', 'Minimal — just visiting', 'Mix of both'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Total budget',                                   type: 'radio', opts: ['Under $500', '$500–$1,500', '$1,500–$3k', '$3k+'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'concerns', q: 'Any special needs or constraints?',              type: 'text'  },
    ]},
  ],
  Graduation: [
    { id: 'grad', title: 'The Graduate', items: [
      { id: 'who',      q: 'Graduate\'s name and degree / milestone?',        type: 'text'  },
      { id: 'vibe',     q: 'Tone — backyard party, dinner out, or big event?', type: 'radio', opts: ['Casual backyard / home', 'Restaurant celebration', 'Rented venue', 'Destination trip instead'] },
    ]},
    { id: 'logistics', title: 'Logistics', items: [
      { id: 'count',    q: 'Guest count',                                    type: 'number', hint: 'Family + close friends' },
      { id: 'date',     q: 'Target date',                                    type: 'text'  },
      { id: 'outdoor',  q: 'Indoor or outdoor?',                             type: 'radio', opts: ['Outdoor only', 'Prefer outdoor with backup', 'Indoor', 'No preference'] },
    ]},
    { id: 'experience', title: 'Food & Vibe', items: [
      { id: 'catering', q: 'Food style',                                     type: 'radio', opts: ['DIY / potluck', 'Catered buffet', 'BBQ / grill-out', 'Restaurant buyout'] },
      { id: 'entertain',q: 'Entertainment',                                  type: 'radio', opts: ['None — just mingling', 'Music / playlist', 'Games / activities', 'Slideshow / photo tribute'] },
    ]},
    { id: 'budget', title: 'Budget', items: [
      { id: 'range',    q: 'Total budget',                                   type: 'radio', opts: ['Under $500', '$500–$2k', '$2k–$5k', '$5k+'] },
    ]},
    { id: 'nextsteps', title: 'Next Steps', items: [
      { id: 'concerns', q: 'Biggest concern?',                               type: 'text'  },
      { id: 'decide',   q: 'When do you need everything finalized?',         type: 'text'  },
    ]},
  ],
};

const CLIENT_STAGES    = ['Inquiry', 'Proposal', 'Contracted', 'Active', 'Complete'];
const REFERRAL_OPTIONS = ['Instagram', 'Facebook', 'Google', 'The Knot', 'WeddingWire', 'Zola', 'Pinterest', 'Word of Mouth', 'Friend / Family', 'Venue Referral', 'Vendor Referral', 'LinkedIn', 'Yelp'];
const CLIENT_CLR    = (C) => ({ Inquiry: C.muted, Proposal: C.warn, Contracted: C.accent2, Active: C.accent, Complete: C.success });

// ─── Seed events ─────────────────────────────────────────────────────────────
const SEED_EVENTS = [
  {
    id: 'ev-wedding',
    rsvpCode: 'w9k2mx',
    name: "Todd & Sarah's Wedding",
    type: 'Wedding',
    date: '2026-09-12',
    venue: 'Bluebell Venue',
    catererCount: 8,
    budget: [
      { id: 'b1', category: 'Venue',         budgeted: 5000, actual: 4800, notes: 'Deposit paid' },
      { id: 'b2', category: 'Catering',      budgeted: 8000, actual: 6500, notes: 'Per-head $65' },
      { id: 'b3', category: 'Photography',   budgeted: 2500, actual: 2500, notes: 'Booked ✓' },
      { id: 'b4', category: 'Florals',       budgeted: 1800, actual: 900,  notes: 'Half deposit' },
      { id: 'b5', category: 'Entertainment', budgeted: 1200, actual: 0,    notes: '' },
      { id: 'b6', category: 'Invitations',   budgeted: 400,  actual: 385,  notes: 'Shipped' },
    ],
    guests: [
      { id: 'g1',  name: 'Sarah & James Chen',   group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 1,    plusOne: '',         plusOneMeal: '—', kids: 0, needs: '',               email: 'sarah.chen@email.com',    phone: '(615) 555-1101', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'g2',  name: 'Marcus Williams',       group: 'Friends', rsvp: 'Yes',   meal: 'Vegetarian',  table: 2,    plusOne: 'Jen Park', plusOneMeal: 'Vegetarian', kids: 0, needs: '',               email: 'mwilliams@gmail.com',     phone: '(615) 555-1102', address: '', giftReceived: true,  thankYouSent: true,  partyNotes: '' },
      { id: 'g3',  name: 'Dr. Patricia Okafor',  group: 'Work',    rsvp: 'No',    meal: '—',            table: null, plusOne: '',         plusOneMeal: '—', kids: 0, needs: '',               email: 'p.okafor@hospital.org',   phone: '(615) 555-1103', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Conflict with conference' },
      { id: 'g4',  name: 'The Rodriguez Family', group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 1,    plusOne: '',         plusOneMeal: '—', kids: 2, needs: '2 kids meals', email: 'rodriguez@family.net',    phone: '(615) 555-1104', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'g5',  name: 'Lily Huang',            group: 'Friends', rsvp: 'Maybe', meal: '—',            table: null, plusOne: '',         plusOneMeal: '—', kids: 0, needs: '',               email: 'lilyh@outlook.com',       phone: '(615) 555-1105', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Waiting on work schedule' },
      { id: 'g6',  name: 'Tom & Dana Bishop',    group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 2,    plusOne: '',         plusOneMeal: '—', kids: 0, needs: '',               email: 'tom.bishop@email.com',    phone: '(615) 555-1106', address: '', giftReceived: true,  thankYouSent: false, partyNotes: '' },
      { id: 'g7',  name: 'Priya Nair',            group: 'Friends', rsvp: 'Yes',   meal: 'Vegan',        table: null, plusOne: '',         plusOneMeal: '—', kids: 0, needs: 'Nut allergy',   email: 'priya.nair@work.com',     phone: '(615) 555-1107', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'g8',  name: 'Carlos Mendez',         group: 'Work',    rsvp: 'Yes',   meal: 'Gluten-Free', table: null, plusOne: '',         plusOneMeal: '—', kids: 0, needs: '',               email: 'carlosm@studio.io',       phone: '(615) 555-1108', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'g9',  name: 'Angela & Robert Park', group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 3,    plusOne: '',         plusOneMeal: '—', kids: 0, needs: 'Wheelchair access', email: 'apark@email.com',        phone: '(615) 555-1109', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'g10', name: 'Kenji Yamamoto',        group: 'Friends', rsvp: 'Yes',   meal: 'Standard',    table: 3,    plusOne: '',         plusOneMeal: '—', kids: 0, needs: '',               email: 'kenji.y@gmail.com',       phone: '(615) 555-1110', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
    ],
    vendors: [
      { id: 'v1', name: 'Bluebell Venue',         category: 'Venue',         budgetCategory: 'Venue',         serviceArea: 'Nashville, TN', insuranceStatus: 'Insured & verified', eventsCompleted: 120, onTimeRate: 98, avgResponseHours: 3, plannerRehireCount: 4, successfulEventCount: 118, cancellationCount: 0, incidentCount: 0, yearsActive: 9, status: 'Confirmed',    cost: 4800, depositAmt: 1000, depositPaid: true,  balancePaid: false, payDueDate: '2026-07-01', arrivalTime: '08:00', contact: 'hello@bluebell.co',     phone: '(615) 555-0101', fax: '(615) 555-0102', contractSigned: true,  website: 'bluebell.co', backup: '', notes: 'Deposit paid ✓',
        log: [
          { id: 'vl1', date: '2026-01-10', text: 'Toured venue — loved the garden ceremony space and bridal suite' },
          { id: 'vl2', date: '2026-01-20', text: 'Signed contract. $1,000 deposit paid. Balance $3,800 due Jul 1.' },
          { id: 'vl3', date: '2026-04-15', text: 'Confirmed floor plan and table arrangement. They handle chairs.' },
        ],
      },
      { id: 'v2', name: 'Fork & Flower Catering', category: 'Catering',      budgetCategory: 'Catering',      serviceArea: 'Nashville, TN', insuranceStatus: 'Insured', eventsCompleted: 45, onTimeRate: 92, avgResponseHours: 6, plannerRehireCount: 3, successfulEventCount: 42, cancellationCount: 0, incidentCount: 1, yearsActive: 6, status: 'Confirmed',    cost: 6500, depositAmt: 2000, depositPaid: true,  balancePaid: false, payDueDate: '2026-08-15', arrivalTime: '14:00', contact: 'events@ff.com',          phone: '(615) 555-0134', fax: '',          contractSigned: true,  website: 'forkandflower.com', whatsapp: '15550134', venmo: '@ForkFlowerEvents', paymentNote: '', backup: 'City Bites Co — (615) 555-7700', notes: 'Final count due 2 wks prior',
        log: [
          { id: 'vl4', date: '2026-02-01', text: 'Tasting session — selected the salmon + beef duo menu' },
          { id: 'vl5', date: '2026-02-15', text: 'Signed contract. 85 guest minimum. $2,000 deposit paid.' },
          { id: 'vl6', date: '2026-05-10', text: 'Confirmed current count: 8 guests. Need to update when final RSVPs close.' },
        ],
      },
      { id: 'v3', name: 'Lena Kim Photography',   category: 'Photography',   budgetCategory: 'Photography',   serviceArea: 'Nashville, TN', insuranceStatus: 'Insured', eventsCompleted: 60, onTimeRate: 90, avgResponseHours: 8, plannerRehireCount: 2, successfulEventCount: 55, cancellationCount: 1, incidentCount: 0, yearsActive: 7, status: 'Confirmed',    cost: 2500, depositAmt: 2500, depositPaid: true,  balancePaid: false, payDueDate: null,         arrivalTime: '12:00', contact: 'lena@lenakimphoto.com', phone: '(615) 555-0188', website: 'lenakimphoto.com', zoomUrl: 'https://zoom.us/j/95512340000', backup: '', notes: 'Paid in full ✓',
        log: [
          { id: 'vl7', date: '2026-01-25', text: 'Reviewed portfolio. Booked. Paid in full upfront for 5% discount.' },
        ],
      },
      { id: 'v4', name: 'Petal & Stem',           category: 'Florals',       budgetCategory: 'Florals',       status: 'Deposit Paid', cost: 1800, depositAmt: 900,  depositPaid: true,  balancePaid: false, payDueDate: '2026-06-01', arrivalTime: '13:00', contact: 'info@petalstem.com',    phone: '(615) 555-0210', website: '', backup: 'Bloom & Co — (615) 555-4433', notes: 'Balance due Jun 1',
        log: [
          { id: 'vl8',  date: '2026-03-15', text: 'Initial consultation — discussed arch design and dusty rose + eucalyptus palette' },
          { id: 'vl9',  date: '2026-04-02', text: 'Confirmed centerpiece style — garden-style low arrangements, 5 tables' },
          { id: 'vl10', date: '2026-05-01', text: 'Deposit $900 paid. Balance $900 due Jun 1. She needs access at 1pm.' },
        ],
      },
      { id: 'v5', name: 'Sound Wave DJ',          category: 'Entertainment', budgetCategory: 'Entertainment', status: 'Considering',  cost: 1200, depositAmt: 0,    depositPaid: false, balancePaid: false, payDueDate: null,         arrivalTime: '16:00', contact: '',                      phone: '(615) 555-0299', website: '', backup: '', notes: '',
        log: [],
      },
    ],
    timeline: [
      { id: 't1',  week: '12 Months Out', task: 'Set budget and guest count',             done: true,  owner: 'Both' },
      { id: 't2',  week: '12 Months Out', task: 'Book venue',                             done: true,  owner: 'Todd' },
      { id: 't3',  week: '10 Months Out', task: 'Choose and book caterer',               done: true,  owner: 'Both' },
      { id: 't4',  week: '10 Months Out', task: 'Book photographer',                     done: true,  owner: 'Both' },
      { id: 't5',  week: '8 Months Out',  task: 'Send save-the-dates',                  done: true,  owner: 'Todd' },
      { id: 't6',  week: '6 Months Out',  task: 'Order florals — finalize vision',       done: false, owner: 'Both' },
      { id: 't7',  week: '6 Months Out',  task: 'Book DJ / entertainment',               done: false, owner: 'Todd' },
      { id: 't8',  week: '4 Months Out',  task: 'Send formal invitations',               done: false, owner: 'Todd' },
      { id: 't9',  week: '2 Months Out',  task: 'Confirm final guest count with caterer',done: false, owner: 'Both' },
      { id: 't10', week: '1 Month Out',   task: 'Final venue walkthrough',               done: false, owner: 'Both' },
      { id: 't11', week: '2 Weeks Out',   task: 'Finalize seating chart',                done: false, owner: 'Todd' },
      { id: 't12', week: 'Week Of',       task: 'Confirm all vendors',                   done: false, owner: 'Both' },
    ],
    ros: [
      { id: 'r1',  time: '08:00', segment: 'Venue opens — setup begins',   location: 'Main Hall',      type: 'vendor', owner: 'Venue Staff',   confirmed: true,  vendorName: 'Bluebell Venue',         notes: 'Tables, linens, bar setup' },
      { id: 'r2',  time: '10:00', segment: 'Hair & makeup — bridal suite', location: 'Bridal Suite',   type: 'prep',   owner: 'Bridal Party',  confirmed: true,  vendorName: '',                       notes: '4 people, allow 2.5 hrs' },
      { id: 'r3',  time: '12:00', segment: 'Photographer arrives',          location: 'Bridal Suite',   type: 'vendor', owner: 'Lena Kim',      confirmed: true,  vendorName: 'Lena Kim Photography',   notes: 'Getting-ready shots' },
      { id: 'r4',  time: '13:00', segment: 'Florist delivery & setup',      location: 'Main Hall',      type: 'vendor', owner: 'Petal & Stem',  confirmed: false, vendorName: 'Petal & Stem',           notes: 'Arch, centerpieces, bouquets' },
      { id: 'r5',  time: '14:00', segment: 'Catering crew arrives',         location: 'Kitchen',        type: 'vendor', owner: 'Catering Lead', confirmed: true,  vendorName: 'Fork & Flower Catering', notes: 'Kitchen setup + coordinator walkthrough' },
      { id: 'r6',  time: '15:00', segment: 'Ceremony begins',               location: 'Garden',         type: 'event',  owner: 'Officiant',     confirmed: true,  vendorName: '',                       notes: 'Guests seated by 2:45. Music cue 3:00 sharp.' },
      { id: 'r7',  time: '15:30', segment: 'Cocktail hour',                 location: 'Terrace',        type: 'event',  owner: 'Both',          confirmed: true,  vendorName: '',                       notes: 'Bar open, passed apps, photo ops' },
      { id: 'r8',  time: '16:00', segment: 'DJ arrives & soundchecks',      location: 'Reception Hall', type: 'vendor', owner: 'DJ',            confirmed: false, vendorName: 'Sound Wave DJ',          notes: 'Must finish before 5pm' },
      { id: 'r9',  time: '17:00', segment: 'Reception doors open',          location: 'Reception Hall', type: 'event',  owner: 'Both',          confirmed: true,  vendorName: '',                       notes: 'Guests find seats, ambient music' },
      { id: 'r10', time: '17:30', segment: 'Grand entrance & first dance',  location: 'Reception Hall', type: 'event',  owner: 'DJ',            confirmed: true,  vendorName: '',                       notes: "Cue: Can't Help Falling in Love" },
      { id: 'r11', time: '18:00', segment: 'Dinner service — first course', location: 'Reception Hall', type: 'event',  owner: 'Catering Lead', confirmed: true,  vendorName: 'Fork & Flower Catering', notes: 'Dietary flags: tables 2, 3' },
      { id: 'r12', time: '20:00', segment: 'Cake cutting',                  location: 'Reception Hall', type: 'event',  owner: 'Both',          confirmed: true,  vendorName: '',                       notes: 'Photo portraits immediately after' },
      { id: 'r13', time: '22:00', segment: 'Last song — sparkler exit',     location: 'Front Drive',    type: 'event',  owner: 'DJ',            confirmed: true,  vendorName: 'Sound Wave DJ',          notes: 'Weather backup: ribbon wands' },
    ],
  },
  {
    id: 'ev-corp',
    rsvpCode: 'tc7np4',
    name: 'TechCorp Holiday Party',
    type: 'Holiday Party',
    date: '2026-12-18',
    venue: 'Skyline Event Center',
    catererCount: 5,
    budget: [
      { id: 'cb1', category: 'Venue',         budgeted: 8000, actual: 2000, notes: 'Deposit paid' },
      { id: 'cb2', category: 'Catering',      budgeted: 5000, actual: 1500, notes: 'Per-head $75' },
      { id: 'cb3', category: 'AV / Tech',     budgeted: 3000, actual: 0,    notes: '' },
      { id: 'cb4', category: 'Entertainment', budgeted: 2500, actual: 0,    notes: '' },
      { id: 'cb5', category: 'Decor',         budgeted: 1500, actual: 0,    notes: '' },
    ],
    guests: [
      { id: 'cg1', name: 'James Liu',     group: 'Work', rsvp: 'Yes',   meal: 'Standard',    table: 1,    plusOne: '',          kids: 0, needs: '' },
      { id: 'cg2', name: 'Maria Torres',  group: 'Work', rsvp: 'Yes',   meal: 'Vegetarian',  table: 1,    plusOne: '',          kids: 0, needs: '' },
      { id: 'cg3', name: 'Kevin Park',    group: 'Work', rsvp: 'Yes',   meal: 'Standard',    table: 2,    plusOne: 'Amy Park',  kids: 0, needs: '' },
      { id: 'cg4', name: 'Amy Chen',      group: 'Work', rsvp: 'Maybe', meal: '—',            table: null, plusOne: '',          kids: 0, needs: '' },
      { id: 'cg5', name: 'David Kim',     group: 'Work', rsvp: 'Yes',   meal: 'Standard',    table: 2,    plusOne: '',          kids: 0, needs: '' },
      { id: 'cg6', name: 'Priya Singh',   group: 'Work', rsvp: 'No',    meal: '—',            table: null, plusOne: '',          kids: 0, needs: '' },
      { id: 'cg7', name: 'Robert Walsh',  group: 'Work', rsvp: 'Yes',   meal: 'Gluten-Free', table: 1,    plusOne: '',          kids: 0, needs: '' },
    ],
    vendors: [
      { id: 'cv1', name: 'Skyline Event Center', category: 'Venue',         budgetCategory: 'Venue',         status: 'Confirmed',  cost: 8000, depositAmt: 2000, depositPaid: true,  balancePaid: false, payDueDate: '2026-10-01', arrivalTime: '14:00', contact: 'events@skyline.com',    phone: '(615) 555-2001', website: 'skyline.com', backup: '', notes: 'Full venue rental', log: [
        { id: 'cl1', date: '2026-06-01', text: 'Site visit completed. Confirmed capacity of 200.' },
        { id: 'cl2', date: '2026-06-15', text: 'Contract signed. $2,000 deposit paid. Balance due Oct 1.' },
      ]},
      { id: 'cv2', name: 'Premier AV Solutions', category: 'AV / Tech',     budgetCategory: 'AV / Tech',     status: 'Contracted', cost: 3000, depositAmt: 500,  depositPaid: false, balancePaid: false, payDueDate: '2026-11-15', arrivalTime: '15:00', contact: 'book@premierav.com',    phone: '(615) 555-2002', website: '',            backup: 'TechSound Rentals — (615) 555-8811', notes: 'Full sound + lighting', log: [
        { id: 'cl3', date: '2026-07-10', text: 'Contract signed. Need to pay $500 deposit by Aug 1.' },
      ]},
      { id: 'cv3', name: 'City Catering Co',     category: 'Catering',      budgetCategory: 'Catering',      status: 'Confirmed',  cost: 5000, depositAmt: 1500, depositPaid: true,  balancePaid: false, payDueDate: '2026-11-01', arrivalTime: '16:00', contact: 'info@citycatering.com', phone: '(615) 555-2003', website: '',            backup: '', notes: 'Final count due Oct 15', log: [
        { id: 'cl4', date: '2026-05-20', text: 'Tasting done. Chose the holiday buffet package.' },
        { id: 'cl5', date: '2026-06-01', text: 'Signed. $1,500 deposit paid. Count given: 5 confirmed.' },
      ]},
      { id: 'cv4', name: 'DJ Night Moves',       category: 'Entertainment', budgetCategory: 'Entertainment', status: 'Quoted',     cost: 2500, depositAmt: 0,    depositPaid: false, balancePaid: false, payDueDate: null,         arrivalTime: '21:00', contact: '',                     phone: '(615) 555-2099', website: '',            backup: '', notes: 'Quote good for 30 days', log: []},
    ],
    timeline: [
      { id: 'ct1', week: '6 Months Out', task: 'Select and book venue',            done: true,  owner: 'Events Team' },
      { id: 'ct2', week: '6 Months Out', task: 'Set budget and approval',          done: true,  owner: 'Finance' },
      { id: 'ct3', week: '5 Months Out', task: 'Book catering',                    done: true,  owner: 'Events Team' },
      { id: 'ct4', week: '4 Months Out', task: 'Book AV company',                  done: false, owner: 'Events Team' },
      { id: 'ct5', week: '3 Months Out', task: 'Send employee invitations',        done: false, owner: 'Events Team' },
      { id: 'ct6', week: '2 Months Out', task: 'Confirm headcount with caterer',   done: false, owner: 'Events Team' },
      { id: 'ct7', week: '1 Month Out',  task: 'Finalize menu selections',         done: false, owner: 'Events Team' },
      { id: 'ct8', week: 'Week Of',      task: 'Confirm all vendors',              done: false, owner: 'Events Team' },
    ],
    ros: [
      { id: 'cr1',  time: '14:00', segment: 'Venue setup begins',             location: 'Main Hall',    type: 'vendor', owner: 'Venue Staff',   confirmed: true,  vendorName: 'Skyline Event Center', notes: 'Tables, chairs, decor setup' },
      { id: 'cr2',  time: '15:00', segment: 'AV setup & soundcheck',          location: 'Main Hall',    type: 'vendor', owner: 'AV Team',       confirmed: false, vendorName: 'Premier AV Solutions', notes: 'Mic test, projector, lighting cues' },
      { id: 'cr3',  time: '16:00', segment: 'Catering arrives',               location: 'Kitchen',      type: 'vendor', owner: 'Catering Lead', confirmed: true,  vendorName: 'City Catering Co',     notes: 'Kitchen setup + walk-through' },
      { id: 'cr4',  time: '17:00', segment: 'Final decor & table check',      location: 'Main Hall',    type: 'prep',   owner: 'Events Team',   confirmed: true,  vendorName: '',                     notes: 'Centerpieces, signage, name cards' },
      { id: 'cr5',  time: '18:00', segment: 'Doors open — cocktail hour',     location: 'Foyer',        type: 'event',  owner: 'Events Team',   confirmed: true,  vendorName: '',                     notes: 'Bar open, passed appetizers' },
      { id: 'cr6',  time: '18:30', segment: 'Welcome remarks by CEO',         location: 'Main Hall',    type: 'event',  owner: 'CEO',           confirmed: true,  vendorName: '',                     notes: '5 min, keep brief' },
      { id: 'cr7',  time: '19:00', segment: 'Dinner service — first course',  location: 'Main Hall',    type: 'event',  owner: 'Catering Lead', confirmed: true,  vendorName: 'City Catering Co',     notes: 'Dietary flags: table 1 has veg + GF' },
      { id: 'cr8',  time: '20:30', segment: 'Awards ceremony',                location: 'Main Hall',    type: 'event',  owner: 'Events Team',   confirmed: true,  vendorName: '',                     notes: '5 awards, slides queued on projector' },
      { id: 'cr9',  time: '21:00', segment: 'DJ set begins',                  location: 'Main Hall',    type: 'vendor', owner: 'DJ',            confirmed: false, vendorName: 'DJ Night Moves',       notes: 'Dance floor opens' },
      { id: 'cr10', time: '23:00', segment: 'Last song — event wraps',        location: 'Main Hall',    type: 'event',  owner: 'Events Team',   confirmed: true,  vendorName: '',                     notes: 'Bar closes at 22:45' },
    ],
  },
  {
    id: 'ev-chaos',
    rsvpCode: 'rx9ot7',
    name: 'Rivera & Okafor Wedding',
    type: 'Wedding',
    date: '2026-10-25',
    venue: 'The Grand Magnolia Estate',
    catererCount: 8,
    budget: [
      { id: 'xb1', category: 'Venue',           budgeted: 6000,  actual: 3000,  notes: 'Upgraded to grand ballroom — $2,500 over budget' },
      { id: 'xb2', category: 'Catering',        budgeted: 8000,  actual: 5500,  notes: 'Guest count grew from 80 to 130 — wildly over budget' },
      { id: 'xb3', category: 'Photography',     budgeted: 2500,  actual: 4200,  notes: 'Added video package — already spent 68% over budget' },
      { id: 'xb4', category: 'Florals',         budgeted: 2000,  actual: 2400,  notes: 'Arch, 14 centerpieces, bridal party — over by $1,800' },
      { id: 'xb5', category: 'Entertainment',   budgeted: 1500,  actual: 2800,  notes: 'Upgraded to live band — nearly double budget' },
      { id: 'xb6', category: 'Hair & Makeup',   budgeted: 1200,  actual: 800,   notes: 'Bridal party added — close to committed' },
      { id: 'xb7', category: 'Cake & Desserts', budgeted: 800,   actual: 300,   notes: 'Custom 5-tier — balance due' },
    ],
    guests: [
      { id: 'xg1',  name: 'Camila & Rafa Rivera',    group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 1,    plusOne: '',            plusOneMeal: '—', kids: 2, needs: '2 kids meals',    email: 'camila.r@gmail.com',       phone: '(615) 555-3101', address: '', giftReceived: false, thankYouSent: false, partyNotes: "Groom's parents — very involved" },
      { id: 'xg2',  name: 'Dr. Ada Okafor',           group: 'Family',  rsvp: 'Yes',   meal: 'Vegetarian',  table: 1,    plusOne: 'Dr. Emeka Okafor', plusOneMeal: 'Standard', kids: 0, needs: '',            email: 'ada.okafor@hospital.org',  phone: '(615) 555-3102', address: '', giftReceived: false, thankYouSent: false, partyNotes: "Bride's mother — wants to approve all florals" },
      { id: 'xg3',  name: 'Tomás Rivera',             group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 2,    plusOne: 'Lucia Rivera', plusOneMeal: 'Standard', kids: 0, needs: '',            email: 'tomas.r@family.net',       phone: '(615) 555-3103', address: '', giftReceived: false, thankYouSent: false, partyNotes: "Groom's brother — best man" },
      { id: 'xg4',  name: 'Simone Abara',             group: 'Friends', rsvp: 'Yes',   meal: 'Vegan',       table: 2,    plusOne: '',            plusOneMeal: '—', kids: 0, needs: 'Nut allergy',      email: 'simone.a@outlook.com',     phone: '(615) 555-3104', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Maid of honor' },
      { id: 'xg5',  name: 'Jordan & Casey Bell',      group: 'Friends', rsvp: 'Yes',   meal: 'Standard',    table: 3,    plusOne: '',            plusOneMeal: '—', kids: 0, needs: '',                 email: 'jbell@work.com',           phone: '(615) 555-3105', address: '', giftReceived: true,  thankYouSent: false, partyNotes: '' },
      { id: 'xg6',  name: 'Fatima Diallo',            group: 'Family',  rsvp: 'Yes',   meal: 'Halal',       table: 3,    plusOne: 'Omar Diallo', plusOneMeal: 'Halal', kids: 0, needs: 'Halal only',    email: 'fdiallo@gmail.com',        phone: '(615) 555-3106', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'xg7',  name: 'Marcus Chen',              group: 'Work',    rsvp: 'Maybe', meal: '—',            table: null, plusOne: '',            plusOneMeal: '—', kids: 0, needs: '',                 email: 'mchen@corp.io',            phone: '(615) 555-3107', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Waiting on travel approval' },
      { id: 'xg8',  name: 'Priscilla & Wade Young',   group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 4,    plusOne: '',            plusOneMeal: '—', kids: 1, needs: '1 high chair',    email: 'priscilla.y@email.com',    phone: '(615) 555-3108', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'xg9',  name: 'Dev Patel',                group: 'Friends', rsvp: 'Yes',   meal: 'Vegetarian',  table: 4,    plusOne: 'Anjali Patel', plusOneMeal: 'Vegetarian', kids: 0, needs: '',       email: 'dev.p@studio.co',          phone: '(615) 555-3109', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'xg10', name: 'Nkechi Williams',          group: 'Friends', rsvp: 'Yes',   meal: 'Gluten-Free', table: 5,    plusOne: '',            plusOneMeal: '—', kids: 0, needs: 'Celiac — strict', email: 'nkechi.w@gmail.com',       phone: '(615) 555-3110', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'xg11', name: 'Bayo & Funke Okafor',      group: 'Family',  rsvp: 'Yes',   meal: 'Standard',    table: 5,    plusOne: '',            plusOneMeal: '—', kids: 3, needs: '3 kids meals',    email: 'bayo.okafor@email.com',    phone: '(615) 555-3111', address: '', giftReceived: false, thankYouSent: false, partyNotes: "Bride's uncle — flying in from Houston" },
      { id: 'xg12', name: 'Valentina Cruz',           group: 'Friends', rsvp: 'No',    meal: '—',            table: null, plusOne: '',            plusOneMeal: '—', kids: 0, needs: '',                 email: 'v.cruz@design.co',         phone: '(615) 555-3112', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Declined — prior engagement' },
    ],
    vendors: [
      { id: 'xv1', name: 'The Grand Magnolia Estate', category: 'Venue',         budgetCategory: 'Venue',           serviceArea: 'Nashville, TN', insuranceStatus: 'Insured & verified', eventsCompleted: 90, onTimeRate: 98, avgResponseHours: 3, plannerRehireCount: 4, successfulEventCount: 89, cancellationCount: 0, incidentCount: 0, yearsActive: 12, status: 'Confirmed',    cost: 8500, depositAmt: 3000, depositPaid: true,  balancePaid: false, payDueDate: '2026-09-01', arrivalTime: '08:00', contact: 'events@grandmagnolia.com', phone: '(615) 555-4001', website: 'grandmagnolia.com', contractSigned: true, backup: '', notes: 'Upgraded from garden room to grand ballroom — cost increase negotiated late.',
        log: [
          { id: 'xvl1', date: '2026-02-10', text: 'Originally booked garden room at $5,500. Bride requested upgrade to grand ballroom.' },
          { id: 'xvl2', date: '2026-03-01', text: 'Upgrade confirmed — grand ballroom $8,500. $3,000 deposit paid. $5,500 balance due Sep 1.' },
          { id: 'xvl3', date: '2026-05-15', text: 'Venue requires minimum 130 guest count for ballroom — we are right at the edge.' },
        ],
      },
      { id: 'xv2', name: 'Harvest Table Catering',   category: 'Catering',      budgetCategory: 'Catering',        serviceArea: 'Nashville, TN', insuranceStatus: 'Insured', eventsCompleted: 25, onTimeRate: 82, avgResponseHours: 12, plannerRehireCount: 1, successfulEventCount: 22, cancellationCount: 1, incidentCount: 2, yearsActive: 4, status: 'Confirmed',    cost: 11200, depositAmt: 3500, depositPaid: true, balancePaid: false, payDueDate: '2026-09-15', arrivalTime: '14:00', contact: 'book@harvesttable.com',    phone: '(615) 555-4002', website: 'harvesttable.com',   contractSigned: true, backup: '', notes: 'Count grew from 80 to 130. Per-head jumped from $75 to $86 for halal + vegan accommodations.',
        log: [
          { id: 'xvl4', date: '2026-01-20', text: 'Signed at 80 guests × $75/head = $6,000. Deposit $2,000 paid.' },
          { id: 'xvl5', date: '2026-04-01', text: 'Guest count revised up to 110. Contract amended — new total $8,250.' },
          { id: 'xvl6', date: '2026-05-30', text: 'Count revised again to 130. Halal + vegan upgrades required. Final contract $11,200. Additional deposit $1,500 paid.' },
          { id: 'xvl7', date: '2026-06-15', text: 'Balance $7,700 due Sep 15. Planner flagged this as critical — 40% over category budget.' },
        ],
      },
      { id: 'xv3', name: 'Clarity Films & Photo',    category: 'Photography',   budgetCategory: 'Photography',     status: 'Confirmed',    cost: 4200, depositAmt: 4200, depositPaid: true,  balancePaid: true,  payDueDate: null,         arrivalTime: '11:00', contact: 'hello@clarityfilms.co',    phone: '(615) 555-4003', website: 'clarityfilms.co',    contractSigned: true, backup: '', notes: 'Paid in full. Original scope was photo only at $2,500. Videography package added by client.',
        log: [
          { id: 'xvl8',  date: '2026-02-01', text: 'Booked for photography only — $2,500. Paid in full for 5% discount.' },
          { id: 'xvl9',  date: '2026-04-10', text: 'Clients requested to add cinematic video package — $1,700 add-on. Paid in full same day.' },
          { id: 'xvl10', date: '2026-06-01', text: 'Total $4,200 paid. 68% over original photography budget.' },
        ],
      },
      { id: 'xv4', name: 'Wild Bloom Florals',       category: 'Florals',       budgetCategory: 'Florals',         status: 'Deposit Paid', cost: 3800, depositAmt: 1200, depositPaid: true,  balancePaid: false, payDueDate: '2026-09-01', arrivalTime: '10:00', contact: 'studio@wildbloom.co',      phone: '(615) 555-4004', website: '',             contractSigned: true, backup: '', notes: 'Arch, 14 centerpieces, 6 bridesmaids bouquets, flower crown. Scope crept far beyond original.',
        log: [
          { id: 'xvl11', date: '2026-03-15', text: 'Original scope: arch + 8 centerpieces = $1,600. Signed and paid deposit $600.' },
          { id: 'xvl12', date: '2026-05-01', text: 'Bride added 6 more centerpieces + 6 bouquets + flower crown. New total $3,800. Deposit revised — paid $1,200 total.' },
          { id: 'xvl13', date: '2026-06-10', text: 'Balance $2,600 due Sep 1. Category is $1,800 over budget.' },
        ],
      },
      { id: 'xv5', name: 'The Meridian Band',        category: 'Entertainment', budgetCategory: 'Entertainment',   status: 'Contracted',   cost: 2800, depositAmt: 800,  depositPaid: true,  balancePaid: false, payDueDate: '2026-08-15', arrivalTime: '15:30', contact: 'book@meridianband.com',     phone: '(615) 555-4005', website: 'meridianband.com',   contractSigned: true, backup: '', notes: 'Upgraded from DJ ($1,200) to live 5-piece band ($2,800) at client request. Balance due Aug 15.',
        log: [
          { id: 'xvl14', date: '2026-01-15', text: 'Originally selected Sound Wave DJ at $1,200 quote.' },
          { id: 'xvl15', date: '2026-04-20', text: 'Clients visited Meridian Band showcase and insisted on booking. $2,800 — $1,600 over entertainment budget.' },
          { id: 'xvl16', date: '2026-04-25', text: 'Contracted Meridian Band. $800 deposit paid. Balance $2,000 due Aug 15.' },
        ],
      },
      { id: 'xv6', name: 'Glow Beauty Collective',  category: 'Hair & Makeup', budgetCategory: 'Hair & Makeup',   status: 'Confirmed',    cost: 800,  depositAmt: 800,  depositPaid: true,  balancePaid: true,  payDueDate: null,         arrivalTime: '09:00', contact: 'hello@glowbeauty.co',      phone: '(615) 555-4006', website: '',             contractSigned: true, backup: '', notes: 'Bride only paid in full. 4 additional bridal party members want full glam — not yet contracted.',
        log: [
          { id: 'xvl17', date: '2026-03-01', text: 'Booked for bride only — $800 paid in full.' },
          { id: 'xvl18', date: '2026-05-15', text: 'Bridal party now wants 4 additional hair + makeup slots — ~$600 more. Not yet contracted but expected.' },
        ],
      },
      { id: 'xv7', name: 'Sugar & Flour Cakery',    category: 'Cake & Desserts', budgetCategory: 'Cake & Desserts', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, balancePaid: false, payDueDate: '2026-10-01', arrivalTime: '13:00', contact: 'orders@sugarflour.com',    phone: '(615) 555-4007', website: '',             contractSigned: true, backup: '', notes: '5-tier custom cake, 130 servings. Balance $600 due Oct 1.',
        log: [
          { id: 'xvl19', date: '2026-04-05', text: 'Tasting done. 5-tier custom fondant cake, 130 servings, $900 total. $300 deposit paid.' },
          { id: 'xvl20', date: '2026-06-20', text: 'Balance $600 due Oct 1. Slight bump from original $800 estimate due to extra tier.' },
        ],
      },
    ],
    timeline: [
      { id: 'xt1',  week: '12 Months Out', task: 'Set budget and guest count (80 guests, $22k)', done: true,  owner: 'Both' },
      { id: 'xt2',  week: '12 Months Out', task: 'Book venue — garden room',                     done: true,  owner: 'Planner' },
      { id: 'xt3',  week: '10 Months Out', task: 'Book photographer',                            done: true,  owner: 'Both' },
      { id: 'xt4',  week: '10 Months Out', task: 'Book catering — 80-guest count',               done: true,  owner: 'Both' },
      { id: 'xt5',  week: '8 Months Out',  task: 'Book entertainment — DJ',                      done: true,  owner: 'Planner' },
      { id: 'xt6',  week: '8 Months Out',  task: 'Book florals — original scope',                done: true,  owner: 'Both' },
      { id: 'xt7',  week: '6 Months Out',  task: 'Upgrade venue to grand ballroom (scope creep)',done: true,  owner: 'Both' },
      { id: 'xt8',  week: '6 Months Out',  task: 'Upgrade entertainment to live band',           done: true,  owner: 'Both' },
      { id: 'xt9',  week: '6 Months Out',  task: 'Add videography package',                      done: true,  owner: 'Both' },
      { id: 'xt10', week: '5 Months Out',  task: 'Revise guest count to 130 — update catering',  done: true,  owner: 'Planner' },
      { id: 'xt11', week: '5 Months Out',  task: 'Expand florals — 14 centerpieces + bouquets', done: true,  owner: 'Both' },
      { id: 'xt12', week: '4 Months Out',  task: 'Budget review with clients — present overages', done: false, owner: 'Planner' },
      { id: 'xt13', week: '4 Months Out',  task: 'Negotiate vendor payment plans where possible', done: false, owner: 'Planner' },
      { id: 'xt14', week: '3 Months Out',  task: 'Send formal invitations',                      done: false, owner: 'Planner' },
      { id: 'xt15', week: '2 Months Out',  task: 'Confirm final guest count with caterer',        done: false, owner: 'Both' },
      { id: 'xt16', week: '1 Month Out',   task: 'Final venue walkthrough',                       done: false, owner: 'Both' },
      { id: 'xt17', week: '2 Weeks Out',   task: 'Finalize seating for 130',                     done: false, owner: 'Planner' },
      { id: 'xt18', week: 'Week Of',       task: 'Confirm all vendors — check balance due status', done: false, owner: 'Planner' },
    ],
    ros: [
      { id: 'xr1',  time: '08:00', segment: 'Estate opens — venue setup begins',     location: 'Grand Ballroom',  type: 'vendor', owner: 'Venue Staff',          confirmed: true,  vendorName: 'The Grand Magnolia Estate', notes: 'Tables, linens, lighting — 130 capacity setup' },
      { id: 'xr2',  time: '09:00', segment: 'Wild Bloom Florals — setup',            location: 'Grand Ballroom',  type: 'vendor', owner: 'Wild Bloom Florals',   confirmed: true,  vendorName: 'Wild Bloom Florals',        notes: 'Arch, 14 centerpieces, entrance arrangements' },
      { id: 'xr3',  time: '09:00', segment: 'Hair & makeup — bridal suite',          location: 'Bridal Suite',    type: 'prep',   owner: 'Bridal Party',         confirmed: true,  vendorName: 'Glow Beauty Collective',    notes: 'Bride + 4 bridal party members — allow 3 hrs' },
      { id: 'xr4',  time: '11:00', segment: 'Clarity Films arrives — getting ready', location: 'Bridal Suite',    type: 'vendor', owner: 'Clarity Films',        confirmed: true,  vendorName: 'Clarity Films & Photo',     notes: 'B-roll of getting ready, detail shots, ring shot' },
      { id: 'xr5',  time: '14:00', segment: 'Catering crew arrives',                 location: 'Kitchen',         type: 'vendor', owner: 'Catering Lead',        confirmed: true,  vendorName: 'Harvest Table Catering',    notes: 'Setup for 130 — halal + vegan flagged at tables 3, 5' },
      { id: 'xr6',  time: '15:30', segment: 'Band soundcheck',                       location: 'Grand Ballroom',  type: 'vendor', owner: 'Meridian Band',        confirmed: false, vendorName: 'The Meridian Band',         notes: 'Must wrap by 16:45 before guests arrive' },
      { id: 'xr7',  time: '16:00', segment: 'Ceremony begins',                       location: 'Garden Terrace',  type: 'event',  owner: 'Officiant',            confirmed: true,  vendorName: '',                          notes: 'Guests seated by 15:45. Processional music cued.' },
      { id: 'xr8',  time: '16:45', segment: 'Cocktail hour',                         location: 'Verandah',        type: 'event',  owner: 'Both',                 confirmed: true,  vendorName: '',                          notes: 'Bar opens, passed apps, photo ops with Clarity Films' },
      { id: 'xr9',  time: '17:30', segment: 'Cake delivery — Sugar & Flour',         location: 'Grand Ballroom',  type: 'vendor', owner: 'Bakery',               confirmed: false, vendorName: 'Sugar & Flour Cakery',      notes: '5-tier cake — coordinate placement with venue' },
      { id: 'xr10', time: '18:00', segment: 'Reception — grand entrance & first dance', location: 'Grand Ballroom', type: 'event', owner: 'DJ/Band',             confirmed: true,  vendorName: 'The Meridian Band',         notes: "Cue: 'At Last' — Etta James" },
      { id: 'xr11', time: '18:30', segment: 'Dinner service begins',                 location: 'Grand Ballroom',  type: 'event',  owner: 'Catering Lead',        confirmed: true,  vendorName: 'Harvest Table Catering',    notes: 'Halal table 6, Vegan/GF table 5, kids meals tables 1 & 5' },
      { id: 'xr12', time: '20:00', segment: 'Toasts & speeches',                     location: 'Grand Ballroom',  type: 'event',  owner: 'Best Man',             confirmed: true,  vendorName: '',                          notes: 'Best man + maid of honor — 5 min each max' },
      { id: 'xr13', time: '20:30', segment: 'Cake cutting',                          location: 'Grand Ballroom',  type: 'event',  owner: 'Both',                 confirmed: true,  vendorName: '',                          notes: 'Photo right after' },
      { id: 'xr14', time: '22:30', segment: 'Last dance — sparkler send-off',        location: 'Main Entrance',   type: 'event',  owner: 'Band',                 confirmed: false, vendorName: 'The Meridian Band',         notes: 'Weather backup: ribbon wands. Coordinate with venue security.' },
    ],
  },
  {
    id: 'ev-board',
    rsvpCode: 'hw4brd',
    name: 'Annual Strategic Planning Session',
    type: 'Board Meeting',
    date: '2026-08-14',
    venue: 'Hartwell Legal Aid — Main Conference Room',
    catererCount: 2,
    budget: [
      { id: 'bb1', category: 'Catering',          budgeted: 1330, actual: 1330, notes: 'Working lunch + AM break confirmed' },
      { id: 'bb2', category: 'AV / Tech',          budgeted: 1050, actual: 500,  notes: 'Deposit paid' },
      { id: 'bb3', category: 'Venue',               budgeted: 0,    actual: 0,    notes: 'In-house — no charge' },
      { id: 'bb4', category: 'Printing / Signage', budgeted: 280,  actual: 245,  notes: 'Board packets printed' },
      { id: 'bb5', category: 'Misc',               budgeted: 210,  actual: 0,    notes: '' },
    ],
    guests: [
      { id: 'hg1',  name: 'Eleanor Vance',     group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'evance@hartwelllegal.org',   phone: '(615) 555-0401', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Board Chair — opens and closes session' },
      { id: 'hg2',  name: 'Marcus Webb',       group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'mwebb@hartwelllegal.org',    phone: '(615) 555-0402', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Vice Chair' },
      { id: 'hg3',  name: 'Diane Okonkwo',     group: 'Board',    rsvp: 'Yes',   meal: 'Vegetarian',  table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'dokonkwo@hartwelllegal.org', phone: '(615) 555-0403', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Treasurer — budget report item on agenda' },
      { id: 'hg4',  name: 'Stephen Lao',       group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: 'Nut allergy',    email: 'slao@hartwelllegal.org',     phone: '(615) 555-0404', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Secretary — taking minutes' },
      { id: 'hg5',  name: 'Patricia Huang',    group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'phuang@hartwelllegal.org',   phone: '(615) 555-0405', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'hg6',  name: 'Rev. James Osei',   group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'josei@community.org',        phone: '(615) 555-0406', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Community stakeholder member' },
      { id: 'hg7',  name: 'Carla Reyes',       group: 'Board',    rsvp: 'Yes',   meal: 'Gluten-Free', table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'creyes@hartwelllegal.org',   phone: '(615) 555-0407', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'hg8',  name: 'Thomas Whitfield',  group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'twhitfield@lawfirm.net',     phone: '(615) 555-0408', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Attorney liaison' },
      { id: 'hg9',  name: 'Naomi Fletcher',    group: 'Board',    rsvp: 'Maybe', meal: '—',            table: null, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',             email: 'nfletcher@hartwelllegal.org',phone: '(615) 555-0409', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Travel TBD — confirm by Aug 1' },
      { id: 'hg10', name: 'David Park',         group: 'Board',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'dpark@hartwelllegal.org',    phone: '(615) 555-0410', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' },
      { id: 'hg11', name: 'Sandra Collins',    group: 'Staff',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'scollins@hartwelllegal.org', phone: '(615) 555-0411', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Executive Director — presenting strategic plan' },
      { id: 'hg12', name: 'Ray Nguyen',         group: 'Staff',    rsvp: 'Yes',   meal: 'Standard',    table: 1, plusOne: '', plusOneMeal: '—', kids: 0, needs: '',                email: 'rnguyen@hartwelllegal.org',  phone: '(615) 555-0412', address: '', giftReceived: false, thankYouSent: false, partyNotes: 'Finance Director — budget presentation' },
    ],
    vendors: [
      { id: 'hv1', name: 'Clear Signal AV',      category: 'AV / Tech', budgetCategory: 'AV / Tech', status: 'Deposit Paid', cost: 1050, depositAmt: 500,  depositPaid: true,  depositMethod: 'Check', balancePaid: false, balanceMethod: '', payDueDate: '2026-08-07', arrivalTime: '07:30', contact: 'book@clearsignalav.com', phone: '(615) 555-0501', fax: '', website: 'clearsignalav.com', zoomUrl: '', backup: 'Nashville AV Pros — (615) 555-0599', contractSigned: true,  paymentNote: 'Invoice #CS-2047', notes: 'Hybrid setup — in-room + Zoom bridge. Arriving 07:30 for 2-hr setup. Balance $550 due Aug 7.',
        log: [
          { id: 'hvl1', date: '2026-06-10', text: 'Confirmed hybrid AV package: 1 display screen, 2 table mics, Zoom bridge for up to 5 remote attendees.' },
          { id: 'hvl2', date: '2026-06-20', text: 'Contract signed. $500 deposit paid by check (Invoice #CS-2047). Balance $550 due Aug 7.' },
          { id: 'hvl3', date: '2026-07-15', text: 'Confirmed 07:30 arrival. Asked them to test Zoom bridge before board arrives at 08:30.' },
        ],
      },
      { id: 'hv2', name: 'Nourish Box Catering', category: 'Catering',           budgetCategory: 'Catering',           status: 'Confirmed',    cost: 1330, depositAmt: 1330, depositPaid: true,  depositMethod: 'Check', balancePaid: true,  balanceMethod: 'Check',  payDueDate: null,         arrivalTime: '07:45', contact: 'orders@nourishbox.com',    phone: '(615) 555-0502', fax: '', website: 'nourishbox.com',          zoomUrl: '', backup: '', contractSigned: true,  paymentNote: 'Invoice #NB-0918', notes: 'AM pastry/coffee break + 12 boxed working lunches. Paid in full.',
        log: [
          { id: 'hvl4', date: '2026-06-15', text: 'Order placed: AM pastry + coffee break (12 pax) + boxed working lunch (12 pax). Invoice #NB-0918. Paid in full by check.' },
          { id: 'hvl5', date: '2026-07-01', text: 'Dietary flags confirmed: nut-free AM items for Stephen Lao, GF lunch box for Carla Reyes. Both accommodated.' },
          { id: 'hvl6', date: '2026-07-20', text: 'Final delivery window confirmed for 07:45. Setup on side credenza — do not block projector screen sight line.' },
        ],
      },
      { id: 'hv3', name: 'Hartwell Legal Aid — Facilities', category: 'Venue',  budgetCategory: 'Venue',              status: 'Confirmed',    cost: 0,    depositAmt: 0,    depositPaid: false, depositMethod: '',      balancePaid: false, balanceMethod: '',       payDueDate: null,         arrivalTime: '07:00', contact: 'facilities@hartwelllegal.org', phone: '(615) 555-0301', fax: '', website: 'hartwelllegal.org',        zoomUrl: '', backup: '', contractSigned: false, paymentNote: '', notes: 'In-house venue — no charge. Main Conference Room, 3rd floor. Capacity 20. Includes whiteboard, built-in projector (backup to AV vendor). Parking validated in attached garage.',
        log: [
          { id: 'hvl7', date: '2026-05-15', text: 'Conference room reserved for Aug 14, 07:00–15:30. Confirmed with Ray Nguyen (Finance Director).' },
          { id: 'hvl8', date: '2026-06-10', text: 'Confirmed room has built-in projector (backup) and whiteboard. Requested parking validation for AV vendor and catering delivery.' },
          { id: 'hvl9', date: '2026-07-15', text: 'Requested early access at 07:00 for setup. Facilities confirmed — key code will be sent 1 week prior.' },
        ],
      },
      { id: 'hv4', name: 'FedEx Office — Green Hills',      category: 'Printing / Signage', budgetCategory: 'Printing / Signage', status: 'Confirmed',    cost: 245,  depositAmt: 245,  depositPaid: true,  depositMethod: 'Credit Card', balancePaid: true, balanceMethod: 'Credit Card', payDueDate: null, arrivalTime: '',      contact: 'store4182@fedex.com',      phone: '(615) 555-0601', fax: '', website: 'fedex.com/office',          zoomUrl: '', backup: '', contractSigned: false, paymentNote: 'Order #FX-4182-0814', notes: '12 board packets (spiral-bound, color cover), 12 name tent cards, 2 printed agendas for wall display. Pickup Aug 12.',
        log: [
          { id: 'hvl10', date: '2026-07-28', text: 'Order placed: 12 spiral-bound board packets (48 pp each, color cover), 12 name tent cards, 2 large-format agenda prints. Order #FX-4182-0814.' },
          { id: 'hvl11', date: '2026-07-28', text: 'Paid in full by credit card at order placement — $245. Pickup scheduled Aug 12 (2 days before meeting).' },
          { id: 'hvl12', date: '2026-08-01', text: 'Confirmed packet contents with Sandra Collins: finalized agenda, financial statements, strategic plan draft, prior meeting minutes, board roster.' },
        ],
      },
    ],
    timeline: [
      { id: 'ht1',  week: '3 Months Out', task: 'Confirm meeting purpose and agenda scope with Executive Director', done: true,  owner: 'Sandra Collins' },
      { id: 'ht2',  week: '3 Months Out', task: 'Reserve conference room and test AV system',                      done: true,  owner: 'Ray Nguyen' },
      { id: 'ht3',  week: '3 Months Out', task: 'Send save-the-date to all board members',                         done: true,  owner: 'Stephen Lao' },
      { id: 'ht4',  week: '2 Months Out', task: 'Book AV vendor for hybrid setup',                                 done: true,  owner: 'Planner' },
      { id: 'ht5',  week: '2 Months Out', task: 'Book catering — AM break + working lunch',                        done: true,  owner: 'Planner' },
      { id: 'ht6',  week: '6 Weeks Out',  task: 'Distribute draft agenda for board review',                        done: true,  owner: 'Sandra Collins' },
      { id: 'ht7',  week: '6 Weeks Out',  task: 'Collect RSVP confirmations — confirm quorum',                    done: false, owner: 'Stephen Lao' },
      { id: 'ht8',  week: '1 Month Out',  task: 'Finalize agenda and presentation materials',                      done: false, owner: 'Sandra Collins' },
      { id: 'ht9',  week: '1 Month Out',  task: 'Confirm dietary needs with caterer',                              done: false, owner: 'Planner' },
      { id: 'ht10', week: '2 Weeks Out',  task: 'Print and assemble board packets',                                done: false, owner: 'Planner' },
      { id: 'ht11', week: '2 Weeks Out',  task: 'Test Zoom bridge and remote attendee access',                     done: false, owner: 'Ray Nguyen' },
      { id: 'ht12', week: '1 Week Out',   task: 'Send final agenda + Zoom link to all attendees',                  done: false, owner: 'Stephen Lao' },
      { id: 'ht13', week: 'Day Before',   task: 'Prepare room — name placards, water, printed packets at seats',  done: false, owner: 'Planner' },
      { id: 'ht14', week: 'Day Before',   task: 'Confirm AV arrival time and catering delivery window',            done: false, owner: 'Planner' },
      { id: 'ht15', week: 'Week Of',      task: 'Final AV and Zoom test with remote participants',                 done: false, owner: 'Ray Nguyen' },
      { id: 'ht16', week: 'Week Of',      task: 'Confirm quorum — all voting members responding',                  done: false, owner: 'Stephen Lao' },
    ],
    ros: [
      { id: 'hr1', time: '07:30', segment: 'AV vendor arrives — setup & Zoom bridge test',  location: 'Conference Room', type: 'vendor', owner: 'Clear Signal AV',      confirmed: true,  vendorName: 'Clear Signal AV',      notes: 'Hybrid screen, 2 mics, Zoom link tested with remote attendees' },
      { id: 'hr2', time: '07:45', segment: 'Catering delivery — AM break setup',            location: 'Conference Room', type: 'vendor', owner: 'Nourish Box Catering', confirmed: true,  vendorName: 'Nourish Box Catering', notes: 'Pastries, coffee, water. Nut-free items labeled. Set on side credenza.' },
      { id: 'hr3', time: '08:00', segment: 'Room ready — board packets at seats',            location: 'Conference Room', type: 'prep',   owner: 'Planner',              confirmed: false, vendorName: '',                     notes: 'Packets, name placards, pens, water at each seat' },
      { id: 'hr4', time: '08:30', segment: 'Board members arrive — AM networking',           location: 'Conference Room', type: 'event',  owner: 'Eleanor Vance',        confirmed: true,  vendorName: '',                     notes: 'Informal. Remote attendees join Zoom at 8:45.' },
      { id: 'hr5', time: '09:00', segment: 'Call to order — roll call & quorum confirm',    location: 'Conference Room', type: 'event',  owner: 'Eleanor Vance',        confirmed: true,  vendorName: '',                     notes: 'Secretary confirms quorum on record' },
      { id: 'hr6', time: '09:10', segment: "Approval of prior meeting minutes",              location: 'Conference Room', type: 'event',  owner: 'Stephen Lao',          confirmed: true,  vendorName: '',                     notes: 'Motion, second, vote' },
      { id: 'hr7', time: '09:20', segment: "Executive Director's report",                   location: 'Conference Room', type: 'event',  owner: 'Sandra Collins',       confirmed: true,  vendorName: '',                     notes: 'FY2025 recap, program outcomes, community impact' },
      { id: 'hr8', time: '09:50', segment: 'Finance report & budget review',                location: 'Conference Room', type: 'event',  owner: 'Diane Okonkwo',        confirmed: true,  vendorName: '',                     notes: 'YTD financials, reserve fund status, audit update' },
      { id: 'hr9', time: '10:20', segment: 'Break — AM refreshments',                       location: 'Conference Room', type: 'event',  owner: 'Planner',              confirmed: true,  vendorName: '',                     notes: '15 min. Remote attendees on hold.' },
      { id: 'hr10', time: '10:35', segment: 'Strategic plan presentation — FY2027',         location: 'Conference Room', type: 'event',  owner: 'Sandra Collins',       confirmed: true,  vendorName: '',                     notes: 'Slides on screen. Remote attendees share view.' },
      { id: 'hr11', time: '11:30', segment: 'Board discussion & working groups',            location: 'Conference Room', type: 'event',  owner: 'Eleanor Vance',        confirmed: true,  vendorName: '',                     notes: 'Break into 2 working groups — reconvene at 12:15' },
      { id: 'hr12', time: '12:15', segment: 'Working lunch — group reports',                location: 'Conference Room', type: 'event',  owner: 'Planner',              confirmed: true,  vendorName: 'Nourish Box Catering', notes: 'Boxed lunches served. GF for Carla. Each group presents findings.' },
      { id: 'hr13', time: '13:15', segment: 'Voting items — resolutions & motions',         location: 'Conference Room', type: 'event',  owner: 'Eleanor Vance',        confirmed: true,  vendorName: '',                     notes: 'Robert\'s Rules of Order. Secretary records votes.' },
      { id: 'hr14', time: '14:00', segment: 'Announcements & next meeting date',            location: 'Conference Room', type: 'event',  owner: 'Eleanor Vance',        confirmed: true,  vendorName: '',                     notes: 'Next board meeting: Nov 2026 — date TBD' },
      { id: 'hr15', time: '14:15', segment: 'Adjournment',                                  location: 'Conference Room', type: 'event',  owner: 'Eleanor Vance',        confirmed: true,  vendorName: '',                     notes: 'Motion to adjourn, second, unanimous vote' },
    ],
  },
];

// ─── Seed clients ────────────────────────────────────────────────────────────
const SEED_CLIENTS = [
  {
    id: 'cl-1',
    name: 'Sarah & Todd Chen',
    email: 'sarah.chen@email.com',
    phone: '(615) 555-0100',
    referral: 'Instagram',
    status: 'Active',
    plannerFee: 4500,
    feeSchedule: [
      { id: 'fp1', label: 'Booking retainer', amount: 1500, due: '2025-11-01', paid: true,  paymentMethod: 'Zelle' },
      { id: 'fp2', label: 'Midpoint payment',  amount: 1500, due: '2026-06-01', paid: false, paymentMethod: '' },
      { id: 'fp3', label: 'Final payment',     amount: 1500, due: '2026-08-01', paid: false, paymentMethod: '' },
    ],
    style: 'Garden-romantic. Dusty rose + eucalyptus palette.',
    notes: 'Referred by Marcus & Jen. Mother of bride (Carol) is very involved.',
    log: [
      { id: 'cll1', date: '2025-10-15', text: 'Initial consultation — 90 min call. Budget: $18k. 80–100 guests.' },
      { id: 'cll2', date: '2025-11-01', text: 'Contract signed. Retainer paid.' },
      { id: 'cll3', date: '2026-03-20', text: 'Venue walkthrough at Bluebell. Florals consult with Petal & Stem.' },
    ],
    eventIds: ['ev-wedding'],
  },
  {
    id: 'cl-chaos',
    name: 'Rivera & Okafor',
    email: 'isabella.rivera@gmail.com',
    phone: '(615) 555-0450',
    referral: 'Word of Mouth',
    status: 'Active',
    plannerFee: 5200,
    feeSchedule: [
      { id: 'xp1', label: 'Booking retainer',    amount: 1800, due: '2026-01-15', paid: true,  paymentMethod: 'Zelle' },
      { id: 'xp2', label: 'Midpoint payment',    amount: 1700, due: '2026-06-01', paid: false, paymentMethod: '' },
      { id: 'xp3', label: 'Final payment',        amount: 1700, due: '2026-09-15', paid: false, paymentMethod: '' },
    ],
    style: 'Lush garden romance meets bold tropical. Deep coral, ivory, greenery. Client vision has expanded significantly beyond original scope.',
    notes: 'Budget has grown from $22k to $32k+ committed. Clients enthusiastic but have not fully processed the overage. Budget review meeting is critical and overdue. Groom\'s parents (Camila & Rafa) are co-funding but amount TBD. Bride\'s mother (Dr. Ada Okafor) must approve all floral arrangements before final payment.',
    log: [
      { id: 'xcl1', date: '2026-01-10', text: 'Initial consultation. Budget $22k. Guest count 80. Classic garden wedding vision.' },
      { id: 'xcl2', date: '2026-01-15', text: 'Contract signed. $1,800 retainer paid.' },
      { id: 'xcl3', date: '2026-03-01', text: 'Clients requested venue upgrade to grand ballroom — +$3,000 over category budget. Approved by both clients.' },
      { id: 'xcl4', date: '2026-04-20', text: 'Isabella saw The Meridian Band at a friend\'s wedding. Insisted on booking — $2,800 vs $1,200 DJ quote. Committed.' },
      { id: 'xcl5', date: '2026-04-10', text: 'Added videography package to photography — $1,700 extra. Client paid in full same day.' },
      { id: 'xcl6', date: '2026-05-30', text: 'Guest count revised to 130. Catering renegotiated — new total $11,200. Budget is now critically over on 4 of 7 categories.' },
      { id: 'xcl7', date: '2026-06-10', text: 'Total committed now $32,200 vs $22,000 budget — $10,200 overcommitted. Budget review meeting requested but not yet scheduled.' },
      { id: 'xcl8', date: '2026-06-20', text: 'Midpoint payment of $1,700 now overdue. Sent follow-up — clients say they are waiting on contribution from groom\'s parents.' },
    ],
    eventIds: ['ev-chaos'],
  },
  {
    id: 'cl-2',
    name: 'TechCorp Inc.',
    email: 'events@techcorp.com',
    phone: '(615) 555-0200',
    referral: 'LinkedIn',
    status: 'Active',
    plannerFee: 3500,
    feeSchedule: [
      { id: 'cp1', label: 'Booking retainer', amount: 1750, due: '2026-05-01', paid: true,  paymentMethod: 'Wire' },
      { id: 'cp2', label: 'Final payment',    amount: 1750, due: '2026-11-01', paid: false, paymentMethod: '' },
    ],
    style: 'Modern corporate. Dark green + gold accent. Black tie optional.',
    notes: 'Contact: James Liu (Head of HR). Budget approved through Finance.',
    log: [
      { id: 'cll4', date: '2026-04-10', text: 'Initial call with James Liu. 150–200 guests. Budget: $25k.' },
      { id: 'cll5', date: '2026-05-01', text: 'Contract signed. $1,750 retainer paid.' },
    ],
    eventIds: ['ev-corp'],
  },
  {
    id: 'cl-3',
    name: 'Hartwell Legal Aid Society',
    email: 'director@hartwelllegal.org',
    phone: '(615) 555-0300',
    referral: 'Word of Mouth',
    status: 'Active',
    plannerFee: 1200,
    feeSchedule: [
      { id: 'hw1', label: 'Booking retainer', amount: 600, due: '2026-05-15', paid: true,  paymentMethod: 'Check' },
      { id: 'hw2', label: 'Final payment',    amount: 600, due: '2026-08-07', paid: false, paymentMethod: '' },
    ],
    style: 'Professional and understated. Functionality over formality — this is a working session, not a gala.',
    notes: 'Non-profit law firm. Contact: Sandra Collins (Executive Director). Budget is tight — board approved $3,500 max including planner fee. They have their own conference room; no venue cost. Remote board members need Zoom access confirmed at least 2 weeks out.',
    log: [
      { id: 'hwl1', date: '2026-05-02', text: 'Initial call with Sandra Collins. Annual board meeting, Aug 14. 10 board members + 2 staff. Budget: $3,500 all-in including planner fee.' },
      { id: 'hwl2', date: '2026-05-15', text: 'Contract signed. $600 retainer paid. Confirmed in-house venue (no charge). Need hybrid AV for ~3 remote board members.' },
      { id: 'hwl3', date: '2026-06-10', text: 'Booked Clear Signal AV for hybrid setup. $500 deposit paid from client budget.' },
      { id: 'hwl4', date: '2026-06-15', text: 'Confirmed Nourish Box Catering for AM break + boxed working lunch. Paid in full — $1,330.' },
      { id: 'hwl5', date: '2026-07-01', text: 'Dietary flags confirmed: Stephen Lao (nut allergy), Carla Reyes (gluten-free). Caterer notified — both accommodated.' },
    ],
    eventIds: ['ev-board'],
  },
];

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, onClick }) {
  const C       = useT();
  const s       = makeS(C);
  const bp      = useContext(BpCtx);
  const isLight = C.surface === '#ffffff';
  const cardShadow = isLight ? '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06), 0 14px 32px rgba(0,0,0,0.04)' : 'none';
  const hoverColor = color || C.accent;
  return (
    <div onClick={onClick}
      style={{ ...s.card, flex: 1, minWidth: (bp === 'mobile' || bp === 'tablet') ? 0 : 140, flexBasis: (bp === 'mobile' || bp === 'tablet') ? 'calc(50% - 8px)' : 'auto', marginBottom: 0, cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box' }}
      onMouseEnter={onClick ? (e => { e.currentTarget.style.borderColor = hoverColor; e.currentTarget.style.boxShadow = `0 0 0 1.5px ${hoverColor}${isLight ? `, 0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)` : ''}`; }) : undefined}
      onMouseLeave={onClick ? (e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = cardShadow; }) : undefined}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ ...s.statNum(color), fontSize: 28 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{sub}</div>}
      {onClick && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>View →</div>}
    </div>
  );
}

// Fixed-height KPI cell that lists rows internally (desktop "inbox" KPIs:
// Task Inbox, Payments Due, Action Required). Header + scrollable body.
function KpiInboxPanel({ label, headerRight, hasItems, empty, children }) {
  const C = useT();
  const s = makeS(C);
  return (
    <div style={{ ...s.card, marginBottom: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 150 }}>
      <div style={{ padding: '13px 16px 10px', borderBottom: hasItems ? `1px solid ${C.border}` : 'none', flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {headerRight}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {hasItems ? children : <div style={{ padding: '16px', fontSize: 13, color: C.muted }}>{empty}</div>}
      </div>
    </div>
  );
}

function budgetBarColor(pct, C) {
  if (pct > 100)  return C.danger;  // over budget — crimson
  if (pct >= 90)  return C.warn;    // at/nearly budget — amber (theme-aware)
  if (pct >= 75)  return C.warn;    // getting close — amber
  return C.success;                 // on track — green
}
function ProgressBar({ pct, color }) {
  const C          = useT();
  const isLight    = C.surface === '#ffffff';
  const clampedPct = Math.min(pct, 100);
  const fill       = color || budgetBarColor(pct, C);
  return (
    <div style={{
      height: 8, borderRadius: 99, minWidth: 80, overflow: 'hidden', position: 'relative',
      // Inset groove — top-heavy dark overlay makes it read as a carved channel
      background: isLight
        ? `linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 55%), ${C.surface2}`
        : `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 55%, transparent 100%), ${C.surface2}`,
      boxShadow: isLight
        ? 'inset 0 1px 3px rgba(0,0,0,0.14), inset 0 1px 1px rgba(0,0,0,0.08)'
        : 'inset 0 2px 4px rgba(0,0,0,0.40), inset 0 1px 2px rgba(0,0,0,0.25)',
    }}>
      <div style={{
        height: '100%', width: clampedPct + '%', borderRadius: 99, transition: 'width 0.4s ease',
        // Convex cylinder — white specular cap at top, shadow-side at base
        background: [
          'linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.10) 40%, rgba(0,0,0,0.00) 55%, rgba(0,0,0,0.12) 100%)',
          fill,
        ].join(', '),
      }} />
    </div>
  );
}

// ─── Voice Button ─────────────────────────────────────────────────────────────

// Evaluated once at module load — avoids per-render property lookup
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function VoiceButton({ onResult, style }) {
  const C = useT();
  const [active, setActive] = useState(false);
  const recRef = useRef(null);
  if (!SR) return null;

  const toggle = () => {
    if (active) {
      recRef.current?.stop();
      setActive(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript || '';
      if (t) onResult(t);
      setActive(false);
    };
    rec.onerror = () => setActive(false);
    rec.onend   = () => setActive(false);
    rec.start();
    recRef.current = rec;
    setActive(true);
  };

  return (
    <button type="button" onClick={toggle} title={active ? 'Stop recording' : 'Dictate note'}
      style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1,
        background: active ? C.danger + '22' : C.border, color: active ? C.danger : C.muted,
        transition: 'all 0.15s', ...style }}>
      {active ? '⏹' : '🎤'}
    </button>
  );
}

// ─── Operational communication — message types for client + internal channels ──
const CLIENT_MSG_TYPES = [
  { type: 'note',             icon: '📝', label: 'Note'              },
  { type: 'update',           icon: '📋', label: 'Operational Update' },
  { type: 'decision',         icon: '📌', label: 'Decision'           },
  { type: 'approval_request', icon: '✋', label: 'Approval Request'   },
];
const INTERNAL_MSG_TYPES = [
  { type: 'note',       icon: '📝', label: 'Note'              },
  { type: 'concern',    icon: '⚠️',  label: 'Concern'           },
  { type: 'escalation', icon: '🚨', label: 'Escalation'        },
  { type: 'decision',   icon: '📌', label: 'Internal Decision'  },
];
// Returns border color, background tint, icon and label for a msg type
const msgTypeStyle = (type, C) => ({
  note:             { border: C.border,  bg: 'transparent',     icon: '📝', label: 'Note'              },
  update:           { border: C.accent,  bg: C.accent  + '10',  icon: '📋', label: 'Operational Update' },
  decision:         { border: C.accent2, bg: C.accent2 + '10',  icon: '📌', label: 'Decision'           },
  approval_request: { border: C.warn,    bg: C.warn    + '10',  icon: '✋', label: 'Approval Request'   },
  concern:          { border: C.warn,    bg: C.warn    + '10',  icon: '⚠️',  label: 'Concern'            },
  escalation:       { border: C.danger,  bg: C.danger  + '10',  icon: '🚨', label: 'Escalation'         },
}[type] || { border: C.border, bg: 'transparent', icon: '📝', label: 'Note' });

// Pending comms needing planner attention: unresolved approval requests (split by who's the blocker)
function clientPendingComms(client) {
  const log = (client && client.log) || [];
  const approvals = log.filter(e => e.type === 'approval_request' && (!e.approvalStatus || e.approvalStatus === 'pending'));
  const needsSend = approvals.filter(e => !e.requestSentAt); // planner must still send it
  const awaiting  = approvals.filter(e => e.requestSentAt);  // sent — waiting on client
  return { approvals, needsSend, awaiting, count: approvals.length };
}

// ─── CommLogInput — type picker + quick-fill templates + free-text entry ──────
function CommLogInput({ value, onChange, onAdd }) {
  const C = useT();
  const s = makeS(C);
  const [logType, setLogType] = useState('');

  const templates = logType ? (LOG_TEMPLATES[logType] || []) : [];
  const prefix    = logType ? `${LOG_TYPES.find(t => t.type === logType)?.icon || ''} ${logType} — ` : '';

  const applyTemplate = (tpl) => {
    onChange(prefix + tpl);
  };

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd();
    setLogType('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Row 1: type dropdown + text input + add */}
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          style={{ ...s.input, width: 'auto', minWidth: 140, fontSize: 12, flexShrink: 0 }}
          value={logType}
          onChange={e => {
            const t = e.target.value;
            setLogType(t);
            // If the input is empty or only had a prior prefix, reset so user can pick a template
            if (!value.trim() || LOG_TYPES.some(lt => value.startsWith(`${lt.icon} ${lt.type} — `))) {
              onChange('');
            }
          }}
        >
          <option value="">Type…</option>
          {LOG_TYPES.map(({ type, icon }) => (
            <option key={type} value={type}>{icon} {type}</option>
          ))}
        </select>
        <input
          style={{ ...s.input, flex: 1 }}
          value={value}
          placeholder={logType ? `Add detail…` : 'Log a call, email, meeting, decision…'}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button style={s.btn('primary')} onClick={handleAdd}>Add</button>
      </div>
      {/* Row 2: quick-fill template chips — only when a type is selected */}
      {templates.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {templates.map((tpl, i) => (
            <button key={i} onClick={() => applyTemplate(tpl)}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; e.currentTarget.style.background = C.accent + '12'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}
            >
              {tpl.length > 36 ? tpl.slice(0, 34) + '…' : tpl}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Brand connection icons ────────────────────────────────────────────────────

const IconWA = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink: 0, display: 'block' }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const IconZoom = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" fill="#2D8CFF" style={{ flexShrink: 0, display: 'block' }}>
    <rect x="2" y="16" width="46" height="40" rx="8"/>
    <path d="M52 28l18-12v40L52 44V28z"/>
  </svg>
);

const IconSMS = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, display: 'block' }}>
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
  </svg>
);

const IconFaceTime = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
    <rect x="2" y="6" width="13" height="12" rx="2.5" fill="#34C759"/>
    <path d="M15 10.2l6-3.8v11.2l-6-3.8v-3.6z" fill="#2AAF4D"/>
  </svg>
);

const IconMeet = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
    <rect x="2" y="6" width="13" height="12" rx="2.5" fill="#1A73E8"/>
    <path d="M15 10.2l6-3.8v11.2l-6-3.8v-3.6z" fill="#1557B0"/>
    <path d="M7 12h4M9 10v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconTeams = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
    <rect x="2" y="4" width="20" height="16" rx="3" fill="#6264A7"/>
    <path d="M8.5 8.5h7M12 8.5v7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconEmail = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, display: 'block' }}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const IconGlobe = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, display: 'block' }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

const wsHref = (url) => url && !url.startsWith('http') ? `https://${url}` : url;

// wa.me helper — accepts a number string or +intl format
const waHref = (val) => val.startsWith('http') ? val : `https://wa.me/${val.replace(/\D/g, '')}`;

// ─── Vendor Modal ─────────────────────────────────────────────────────────────

function VendorModal({ vendor, budgetCategories, onClose, onChange, onDelete, event, ros, profile }) {
  const C          = useT();
  const s          = makeS(C);
  const stageCLR   = STAGE_CLR(C);
  const showToast  = useToast();
  const aiKey      = useAIKey();
  const [newLog,         setNewLog]        = useState('');
  const [copied,         setCopied]        = useState(false);
  const [showBrief,      setShowBrief]     = useState(false);
  const [confirmDel,     setConfirmDel]    = useState(false);
  const [showCommsCheck, setShowCommsCheck] = useState(true);
  const [showLog,        setShowLog]        = useState(false);
  const [logSumm,        setLogSumm]        = useState('');
  const [logSummLoad,    setLogSummLoad]    = useState(false);
  const [notesDraftLoad, setNotesDraftLoad] = useState(false);
  const [showOps,        setShowOps]        = useState(false);
  const [showPNotes,     setShowPNotes]     = useState(false);
  const [newPNote,       setNewPNote]       = useState('');
  const [newRiskFlag,    setNewRiskFlag]    = useState('');
  const [showTags,       setShowTags]       = useState(false);
  const [customTag,      setCustomTag]      = useState({}); // { [groupKey]: draft }
  const toggleTag = (field, val) => {
    const cur = vendor[field] || [];
    onChange(field, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  };
  const addCustomTag = (field) => {
    const v = (customTag[field] || '').trim();
    if (!v) return;
    const cur = vendor[field] || [];
    if (!cur.includes(v)) onChange(field, [...cur, v]);
    setCustomTag(c => ({ ...c, [field]: '' }));
  };
  const tagCount = VENDOR_TAG_GROUPS.reduce((n, g) => n + (vendor[g.key] || []).length, 0);
  const stageIdx = STAGES.indexOf(vendor.status);

  // Vendor-1: planner-only note + risk-flag mutators (internal arrays, never exported)
  const addPlannerNote = () => {
    if (!newPNote.trim()) return;
    onChange('plannerNotes', [...(vendor.plannerNotes || []), { id: uid(), note: newPNote.trim(), createdAt: today8601(), visibility: 'internal_only' }]);
    setNewPNote('');
  };
  const addRiskFlag = () => {
    if (!newRiskFlag.trim()) return;
    onChange('privateRiskFlags', [...(vendor.privateRiskFlags || []), { id: uid(), flag: newRiskFlag.trim(), createdAt: today8601() }]);
    setNewRiskFlag('');
  };
  const opsNum = (k, val) => onChange(k, val === '' ? '' : Number(val));
  const rel = vendorReliabilityScore(vendor);
  const tier = vendorTier(vendor);
  const badges = vendorBadges(vendor);
  // Auto-expand secondary contact fields if any already have a value
  const hasSecondaryContact = !!(vendor.fax || vendor.whatsapp || vendor.zoomUrl || vendor.meetUrl || vendor.teamsUrl);
  const [showMoreContact, setShowMoreContact] = useState(hasSecondaryContact);

  // Field-level validation (null = ok, string = error message)
  const vErr = {
    contact:    !isEmail(vendor.contact)     ? 'Enter a valid email address' : null,
    phone:      !isPhone(vendor.phone)       ? 'Enter a valid phone number'  : null,
    website:    !isUrl(vendor.website)       ? 'Enter a valid URL'           : null,
    cost:       !isPosDollar(vendor.cost)    ? 'Must be a positive number'   : null,
    depositAmt: vendor.depositAmt > vendor.cost ? 'Deposit can\'t exceed total cost' : null,
  };

  const copyContact = () => {
    const lines = [`${vendor.name || 'Vendor'} (${vendor.category})`];
    if (vendor.contactName) lines.push(`👤 ${vendor.contactName}`);
    if (vendor.phone)    lines.push(`📞 ${vendor.phone}`);
    if (vendor.fax)      lines.push(`📠 Fax: ${vendor.fax}`);
    if (vendor.contact)  lines.push(`✉️ ${vendor.contact}`);
    if (vendor.whatsapp) lines.push(`💬 WhatsApp: ${vendor.whatsapp}`);
    if (vendor.website) lines.push(`🌐 ${vendor.website}`);
    if (vendor.zoomUrl)  lines.push(`📹 Zoom: ${vendor.zoomUrl}`);
    if (vendor.meetUrl)  lines.push(`📹 Meet: ${vendor.meetUrl}`);
    if (vendor.teamsUrl) lines.push(`📹 Teams: ${vendor.teamsUrl}`);
    navigator.clipboard?.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const balance   = vendor.balancePaid ? 0 : vendor.cost - vendor.depositAmt;
  const daysLeft  = daysUntil(vendor.payDueDate);

  const addLog = () => {
    if (!newLog.trim()) return;
    const entry = { id: uid(), date: today8601(), text: newLog.trim() };
    onChange('log', [...(vendor.log || []), entry]);
    setNewLog('');
  };

  const markPaid = () => {
    const entry = { id: uid(), date: today8601(), text: `Balance of ${fmtD(balance)} marked as paid.` };
    onChange('balancePaid', true);
    onChange('log', [...(vendor.log || []), entry]);
  };

  const genLogSumm = async () => {
    if (!aiKey) return;
    setLogSummLoad(true); setLogSumm('');
    const logText = [...(vendor.log||[])].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`${e.date}: ${e.text}`).join('\n');
    const prompt = `Summarize this vendor relationship in 2-3 sentences for an event planner. Include stage, key commitments (deposits, contracts, amounts), and any outstanding items. Use specific numbers/dates from the log.\n\nVendor: ${vendor.name} (${vendor.category})\nStage: ${vendor.status}\nCost: $${(vendor.cost||0).toLocaleString()}, Deposit paid: ${vendor.depositPaid?'Yes':'No'}\n\nLog:\n${logText}\n\nSummary:`;
    try { await askClaude(aiKey, prompt, { maxTokens: 120, onChunk: t => setLogSumm(t) }); }
    catch(e) { setLogSumm('⚠ Check API key in Profile.'); }
    setLogSummLoad(false);
  };

  const genNotesDraft = async () => {
    if (!aiKey) return;
    setNotesDraftLoad(true);
    const logText = [...(vendor.log||[])].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`${e.date}: ${e.text}`).join('\n');
    const prompt = `Extract the key operational notes for this vendor into a short, scannable paragraph. Include: contract terms, payment amounts/dates, headcount requirements, dietary flags, special instructions, and any day-of logistics mentioned. Only include facts from the log — no filler.\n\nVendor: ${vendor.name} (${vendor.category})\nStage: ${vendor.status}\nCost: $${(vendor.cost||0).toLocaleString()}\nDeposit paid: ${vendor.depositPaid?'Yes':'No'}\n\nLog:\n${logText || '(none)'}\nExisting notes: ${vendor.notes || '(none)'}\n\nDraft notes:`;
    try {
      await askClaude(aiKey, prompt, { maxTokens: 200, onChunk: t => onChange('notes', t) });
    } catch(e) { /* silent */ }
    setNotesDraftLoad(false);
  };

  return (
    <>
      {showBrief && <VendorBriefModal vendor={vendor} event={event} ros={ros} profile={profile} onClose={() => setShowBrief(false)} />}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(440px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <input style={{ ...s.input, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', flex: 1, padding: '5px 8px' }} value={vendor.name} onChange={e => onChange('name', e.target.value.replace(/(^\w|\s\w)/g, c => c.toUpperCase()))} />
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px', flexShrink: 0 }}>✕</button>
          </div>
          <select style={{ ...s.input, fontSize: 12 }} value={vendor.category} onChange={e => {
            onChange('category', e.target.value);
            if (!vendor.budgetCategory || vendor.budgetCategory === vendor.category) onChange('budgetCategory', e.target.value);
          }}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Pipeline */}
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={s.cardTitle}>Pipeline</div>
          <div style={{ display: 'flex', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 11, left: '10%', right: '10%', height: 2, background: C.border, zIndex: 0 }} />
            {STAGES.map((stage, i) => {
              const isPast = i < stageIdx, isCurrent = i === stageIdx;
              const clr = stageCLR[stage];
              return (
                <div key={stage} onClick={() => onChange('status', stage)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, cursor: 'pointer' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', marginBottom: 5, background: isCurrent ? clr : isPast ? clr + '33' : C.bg, border: `2px solid ${isCurrent ? clr : isPast ? clr + '88' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: isCurrent ? '#fff' : isPast ? clr : C.muted, transition: 'all 0.15s' }}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 9, color: isCurrent ? clr : isPast ? clr + 'bb' : C.muted, textAlign: 'center', lineHeight: 1.3, fontWeight: isCurrent ? 700 : 400, maxWidth: 56 }}>{stage}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* Contact */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* ── Contact person name ── */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Contact Name</label>
                <input style={s.input} value={vendor.contactName || ''} placeholder="Person you deal with (e.g. Sarah Johnson)" onChange={e => onChange('contactName', e.target.value)} />
              </div>

              {/* ── Primary: always visible ── */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Email</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...s.input, flex: 1, borderColor: vErr.contact ? C.danger : undefined }} value={vendor.contact || ''} placeholder="email@vendor.com" onChange={e => onChange('contact', e.target.value)} />
                  {vendor.contact && !vErr.contact && (
                    <a href={`mailto:${vendor.contact}`} onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.accent, textDecoration: 'none', whiteSpace: 'nowrap', border: `1px solid ${C.accent}44`, borderRadius: 8, padding: '5px 10px' }}>
                      <IconEmail size={14} /> Email
                    </a>
                  )}
                </div>
                {vErr.contact && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{vErr.contact}</div>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Phone</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={{ ...s.input, flex: 1, minWidth: 120, borderColor: vErr.phone ? C.danger : undefined }} value={vendor.phone || ''} placeholder="(555) 555-0100" onChange={e => onChange('phone', formatPhone(e.target.value))} />
                  {vendor.phone && !vErr.phone && (<>
                    <a href={`sms:${vendor.phone}`} onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.accent2, textDecoration: 'none', whiteSpace: 'nowrap', border: `1px solid ${C.accent2}44`, borderRadius: 8, padding: '5px 10px' }}>
                      <IconSMS size={14} /> Text
                    </a>
                    <a href={`facetime:${vendor.phone}`} onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.success, textDecoration: 'none', whiteSpace: 'nowrap', border: `1px solid ${C.success}44`, borderRadius: 8, padding: '5px 10px' }}>
                      <IconFaceTime size={14} /> FaceTime
                    </a>
                  </>)}
                </div>
                {vErr.phone && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{vErr.phone}</div>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Website</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...s.input, flex: 1, borderColor: vErr.website ? C.danger : undefined }} value={vendor.website || ''} placeholder="vendor.com" onChange={e => onChange('website', e.target.value)} />
                  {vendor.website && !vErr.website && <a href={wsHref(vendor.website)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.muted, textDecoration: 'none', whiteSpace: 'nowrap', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px' }}><IconGlobe size={14} /> Visit</a>}
                </div>
                {vErr.website && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{vErr.website}</div>}
              </div>

              {/* ── Secondary: Fax / WhatsApp / video calls — collapsed by default ── */}
              <button
                onClick={() => setShowMoreContact(v => !v)}
                style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 0', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ color: C.muted }}>{showMoreContact ? '▾' : '▸'}</span>
                <span style={{ color: C.muted }}>{showMoreContact ? 'Fewer options' : 'More contact options'}</span>
                {hasSecondaryContact && !showMoreContact && (
                  <span style={{ ...s.pill(C.accent), fontSize: 10 }}>saved</span>
                )}
              </button>

              {showMoreContact && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Fax</label>
                    <input style={s.input} value={vendor.fax || ''} placeholder="555-0001" onChange={e => onChange('fax', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>WhatsApp</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input style={{ ...s.input, flex: 1 }} value={vendor.whatsapp || ''} placeholder="+1 555-0000" onChange={e => onChange('whatsapp', e.target.value)} />
                      {vendor.whatsapp && (
                        <a href={waHref(vendor.whatsapp)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#25D366', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #25D36644', borderRadius: 8, padding: '5px 10px' }}>
                          <IconWA size={14} /> Chat
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Zoom</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input style={{ ...s.input, flex: 1 }} value={vendor.zoomUrl || ''} placeholder="https://zoom.us/j/…" onChange={e => onChange('zoomUrl', e.target.value)} />
                      {vendor.zoomUrl && (
                        <a href={vendor.zoomUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#2D8CFF', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #2D8CFF44', borderRadius: 8, padding: '5px 10px' }}>
                          <IconZoom size={14} /> Join
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Google Meet</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input style={{ ...s.input, flex: 1 }} value={vendor.meetUrl || ''} placeholder="https://meet.google.com/…" onChange={e => onChange('meetUrl', e.target.value)} />
                      {vendor.meetUrl && (
                        <a href={vendor.meetUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#1A73E8', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #1A73E844', borderRadius: 8, padding: '5px 10px' }}>
                          <IconMeet size={14} /> Join
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Microsoft Teams</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input style={{ ...s.input, flex: 1 }} value={vendor.teamsUrl || ''} placeholder="https://teams.microsoft.com/…" onChange={e => onChange('teamsUrl', e.target.value)} />
                      {vendor.teamsUrl && (
                        <a href={vendor.teamsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#6264A7', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #6264A744', borderRadius: 8, padding: '5px 10px' }}>
                          <IconTeams size={14} /> Join
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Arrival Time</label>
                <input style={{ ...s.input }} type="time" value={vendor.arrivalTime || ''} onChange={e => onChange('arrivalTime', e.target.value)} />
              </div>
              <button onClick={copyContact} style={{ ...s.btn(copied ? 'success' : 'default'), fontSize: 11, flex: 2 }}>
                {copied ? '✓ Copied' : '⎘ Copy contact info'}
              </button>
            </div>
          </div>

          {/* ── Communication Checklist (collapsible) ── */}
          {(() => {
            const checklist   = vendor.commsChecklist || {};
            const totalItems  = STAGES.flatMap(st => [...(VENDOR_COMMS[st] || []), ...(st === STAGES[stageIdx] ? (VENDOR_CAT_COMMS[vendor.category] || []) : [])]);
            const totalDone   = totalItems.filter(it => checklist[it]).length;
            const currentClr  = stageCLR[STAGES[stageIdx]] || C.muted;
            return (
              <div style={{ marginBottom: 20, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setShowCommsCheck(v => !v)} style={{ width: '100%', background: showCommsCheck ? C.surface2 : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flex: 1 }}>Comms Checklist</span>
                  <span style={{ fontSize: 11, color: totalDone === totalItems.length && totalItems.length > 0 ? C.success : currentClr, fontWeight: 600 }}>{totalDone}/{totalItems.length}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{showCommsCheck ? '▾' : '▸'}</span>
                </button>
                {showCommsCheck && (
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {STAGES.map((stage, si) => {
                      const clr       = stageCLR[stage];
                      const isPast    = si < stageIdx;
                      const isCurrent = si === stageIdx;
                      const isFuture  = si > stageIdx;
                      const baseItems = VENDOR_COMMS[stage] || [];
                      const catItems  = isCurrent ? (VENDOR_CAT_COMMS[vendor.category] || []) : [];
                      const allItems  = [...baseItems, ...catItems];
                      if (allItems.length === 0) return null;
                      const doneCount = allItems.filter(it => checklist[it]).length;
                      const allDone   = doneCount === allItems.length;
                      return (
                        <div key={stage} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, padding: isCurrent ? '3px 8px' : '2px 0', borderRadius: isCurrent ? 6 : 0, background: isCurrent ? clr + '12' : 'transparent' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: allDone ? C.success : isCurrent ? clr : isPast ? clr + '77' : C.border, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isCurrent ? clr : C.muted, flex: 1 }}>{stage}</span>
                            <span style={{ fontSize: 10, color: allDone ? C.success : isCurrent ? clr : C.muted, fontWeight: 600 }}>{doneCount}/{allItems.length}</span>
                          </div>
                          <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {allItems.map(item => {
                              const checked = !!checklist[item];
                              return (
                                <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, padding: '2px 0' }}>
                                  <input type="checkbox" checked={checked}
                                    onChange={() => onChange('commsChecklist', { ...checklist, [item]: !checked })}
                                    style={{ accentColor: clr, marginTop: 2, flexShrink: 0, width: 13, height: 13 }}
                                  />
                                  <span style={{ color: checked ? C.muted : C.text, textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.45 }}>{item}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Pricing Structure */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Pricing Structure</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Per-head pricing — caterers + venues */}
              {['Catering', 'Venue'].includes(vendor.category) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Price Per Head ($)</label>
                    <input style={s.input} type="number" min="0" value={vendor.pricePerHead || ''} placeholder="0" onChange={e => onChange('pricePerHead', Number(e.target.value) || 0)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Min. Guests</label>
                    <input style={s.input} type="number" min="0" value={vendor.minGuests || ''} placeholder="0" onChange={e => onChange('minGuests', Number(e.target.value) || 0)} />
                  </div>
                </div>
              )}
              {vendor.category === 'Catering' && (
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Service Style</label>
                  <select style={s.input} value={vendor.serviceStyle || ''} onChange={e => onChange('serviceStyle', e.target.value)}>
                    <option value="">— Select —</option>
                    {['Plated', 'Buffet', 'Food Stations', 'Family Style', 'Cocktail', 'Custom'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}
              {/* Hourly rate — DJ, Photo, Video, Officiant, Hair & Makeup */}
              {['Photography', 'Videography', 'DJ / Band', 'Entertainment', 'Officiant', 'Hair & Makeup', 'Florist', 'Other'].includes(vendor.category) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Hourly Rate ($)</label>
                    <input style={s.input} type="number" min="0" value={vendor.hourlyRate || ''} placeholder="0" onChange={e => onChange('hourlyRate', Number(e.target.value) || 0)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Hours Included</label>
                    <input style={s.input} type="number" min="0" value={vendor.hoursIncluded || ''} placeholder="0" onChange={e => onChange('hoursIncluded', Number(e.target.value) || 0)} />
                  </div>
                </div>
              )}
              {/* Venue-specific */}
              {vendor.category === 'Venue' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 110 }}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Capacity (max)</label>
                    <input style={s.input} type="number" min="0" value={vendor.capacity || ''} placeholder="0" onChange={e => onChange('capacity', Number(e.target.value) || 0)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Rental Type</label>
                    <select style={s.input} value={vendor.rentalType || ''} onChange={e => onChange('rentalType', e.target.value)}>
                      <option value="">— Select —</option>
                      {['Hourly', 'Half Day', 'Full Day', 'Weekend', 'Custom'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {/* Package name */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Package / Tier Name</label>
                <input style={s.input} value={vendor.packageName || ''} placeholder="e.g. Gold Package, 8hr Full Day…" onChange={e => onChange('packageName', e.target.value)} />
              </div>
              {/* Travel fee */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Travel / Delivery Fee ($)</label>
                <input style={s.input} type="number" min="0" value={vendor.travelFee || ''} placeholder="0" onChange={e => onChange('travelFee', Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Payment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Budget Category</label>
                <select style={s.input} value={vendor.budgetCategory || ''} onChange={e => onChange('budgetCategory', e.target.value)}>
                  <option value="">— None —</option>
                  {(budgetCategories || CATS).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Contract Value</label>
                  <input style={{ ...s.input, borderColor: vErr.cost ? C.danger : undefined }} type="number" value={vendor.cost} onChange={e => onChange('cost', Number(e.target.value) || 0)} />
                  {vErr.cost && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{vErr.cost}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Deposit Amount</label>
                  <input style={{ ...s.input, borderColor: vErr.depositAmt ? C.danger : undefined }} type="number" value={vendor.depositAmt} onChange={e => onChange('depositAmt', Number(e.target.value) || 0)} />
                  {vErr.depositAmt && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{vErr.depositAmt}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={vendor.depositPaid} onChange={e => onChange('depositPaid', e.target.checked)} style={{ accentColor: C.success, cursor: 'pointer', width: 14, height: 14 }} />
                  Deposit paid
                </label>
                {vendor.depositPaid && (
                  <select style={{ ...s.input, fontSize: 12, flex: 1, minWidth: 120 }} value={vendor.depositMethod || ''} onChange={e => onChange('depositMethod', e.target.value)}>
                    <option value="">Method…</option>
                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                )}
                {!vendor.depositPaid && vendor.depositAmt > 0 && (() => {
                  // Suggest a pay link for the deposit using venmo or paymentNote
                  const venmoLink = vendor.venmo
                    ? buildPayLink('Venmo', vendor, vendor.depositAmt)
                    : null;
                  if (!venmoLink) return null;
                  return (
                    <a href={venmoLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ fontSize: 11, fontWeight: 700, color: '#3D95CE', textDecoration: 'none', border: '1px solid #3D95CE', borderRadius: 6, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                      Pay deposit {fmtD(vendor.depositAmt)} →
                    </a>
                  );
                })()}
              </div>

              {!vendor.balancePaid && balance > 0 ? (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Balance Owed</div>
                      <div style={{ ...s.statNum(C.danger), fontSize: 22 }}>{fmtD(balance)}</div>
                      {vendor.payDueDate && daysLeft !== null && (
                        <div style={{ fontSize: 11, marginTop: 2, color: daysLeft <= 14 ? C.danger : daysLeft <= 30 ? C.warn : C.muted }}>
                          {daysLeft > 0 ? `Due in ${daysLeft} days` : daysLeft === 0 ? 'Due today!' : 'Overdue'}
                        </div>
                      )}
                    </div>
                    <button style={s.btn('success')} onClick={markPaid}>Mark Paid</button>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Balance Due Date</label>
                      <input style={s.input} type="date" value={vendor.payDueDate || ''} onChange={e => onChange('payDueDate', e.target.value)} onClick={e => { try { e.target.showPicker(); } catch {} }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Payment Method</label>
                      <select style={s.input} value={vendor.balanceMethod || ''} onChange={e => onChange('balanceMethod', e.target.value)}>
                        <option value="">— not set —</option>
                        {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Pay Now deep-link */}
                  {(() => {
                    const link = buildPayLink(vendor.balanceMethod, vendor, balance);
                    if (!link) return null;
                    if (link.startsWith('zelle:')) {
                      const zelleInfo = link.slice(6);
                      return (
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#6c4ef210', border: '1px solid #6c4ef240', fontSize: 12, color: C.muted }}>
                          <span style={{ fontWeight: 600, color: C.text }}>Zelle to:</span> {zelleInfo}
                        </div>
                      );
                    }
                    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
                    const appLink  = isMobile ? link.replace('https://venmo.com/', 'venmo://paycharge?').replace('https://cash.app/', 'cashme://') : link;
                    const btnColor = vendor.balanceMethod === 'Venmo' ? '#3D95CE' : vendor.balanceMethod === 'PayPal' ? '#0070ba' : vendor.balanceMethod === 'Cash App' ? '#00c244' : C.accent;
                    return (
                      <div style={{ marginTop: 10 }}>
                        <a href={appLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: btnColor, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.01em' }}>
                          Pay {fmtD(balance)} via {vendor.balanceMethod} →
                        </a>
                      </div>
                    );
                  })()}
                </div>
              ) : vendor.cost > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>
                    ✓ Paid in full{vendor.balanceMethod ? ` · ${vendor.balanceMethod}` : ''}
                  </div>
                  <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '3px 10px', color: C.muted }}
                    onClick={() => onChange('balancePaid', false)}
                    title="Unmark as paid">
                    Unmark
                  </button>
                </div>
              ) : null}

              {/* How to pay this vendor — Venmo / Zelle / other */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Venmo</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input style={{ ...s.input, flex: 1 }} value={vendor.venmo || ''} placeholder="@handle" onChange={e => onChange('venmo', e.target.value)} />
                    {vendor.venmo && (
                      <a href={`https://venmo.com/${vendor.venmo.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: 12, fontWeight: 600, color: '#3D95CE', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #3D95CE44', borderRadius: 8, padding: '5px 10px' }}>
                        Pay
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ flex: 2, minWidth: 140 }}>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Zelle / PayPal / Other</label>
                  <input style={s.input} value={vendor.paymentNote || ''} placeholder="zelle: 555-0100, paypal: …" onChange={e => onChange('paymentNote', e.target.value)} />
                </div>
              </div>

              {/* Contract — folded into Payment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
                <label onClick={() => onChange('contractSigned', !vendor.contractSigned)} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${vendor.contractSigned ? C.success : C.border}`, background: vendor.contractSigned ? C.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                    {vendor.contractSigned && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: vendor.contractSigned ? C.success : C.muted }}>Contract signed</span>
                </label>
                <input style={{ ...s.input, flex: 1, minWidth: 160, fontSize: 12 }} value={vendor.contractUrl || ''} placeholder="Contract URL or file path…" onChange={e => onChange('contractUrl', e.target.value)} />
                {vendor.contractUrl && (
                  <a href={vendor.contractUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accent, textDecoration: 'none', whiteSpace: 'nowrap' }}>Open →</a>
                )}
              </div>
            </div>
          </div>

          {/* ── Operational & Reliability (collapsible) ── */}
          <div style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowOps(v => !v)} style={{ width: '100%', background: showOps ? C.surface2 : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flex: 1 }}>Operational & Reliability</span>
              {rel.sufficient
                ? <span style={{ fontSize: 11, fontWeight: 700, color: VENDOR_TIER_META[tier].color }}>{VENDOR_TIER_META[tier].icon} {tier} · {rel.score}</span>
                : <span style={{ fontSize: 11, color: C.muted }}>Insufficient data</span>}
              <span style={{ fontSize: 10, color: C.muted, transform: showOps ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {showOps && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Score readout */}
                <div style={{ padding: '10px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  {rel.sufficient ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: VENDOR_TIER_META[tier].color }}>{rel.score}</span>
                        <span style={{ fontSize: 12, color: C.muted }}>/ 100 reliability · {VENDOR_TIER_META[tier].icon} {tier}</span>
                      </div>
                      {badges.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                          {badges.map(b => <span key={b} style={{ fontSize: 10, fontWeight: 600, color: C.accent2, background: C.accent2 + '14', border: `1px solid ${C.accent2}33`, borderRadius: 12, padding: '2px 8px' }}>{b}</span>)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: C.muted }}>⚠ Insufficient data — add events completed plus at least one quality metric (on-time rate, response time, rehires, or successful events) to compute a score.</div>
                  )}
                </div>
                {/* Operational metric inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['eventsCompleted',     'Events completed',   'e.g. 45'],
                    ['onTimeRate',          'On-time rate (%)',   '0–100'],
                    ['avgResponseHours',    'Avg response (hrs)', 'e.g. 4'],
                    ['plannerRehireCount',  'Times you rehired',  'e.g. 3'],
                    ['successfulEventCount','Successful events',  'e.g. 42'],
                    ['cancellationCount',   'Cancellations',      'e.g. 0'],
                    ['incidentCount',       'Incidents',          'e.g. 0'],
                    ['yearsActive',         'Years active',       'e.g. 8'],
                  ].map(([k, label, ph]) => (
                    <div key={k}>
                      <label style={{ fontSize: 10, color: C.muted, display: 'block', marginBottom: 3 }}>{label}</label>
                      <input style={{ ...s.input, fontSize: 13 }} type="number" min="0" value={vendor[k] ?? ''} placeholder={ph} onChange={e => opsNum(k, e.target.value)} />
                    </div>
                  ))}
                </div>
                {/* Service profile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: C.muted, display: 'block', marginBottom: 3 }}>Service area</label>
                    <input style={{ ...s.input, fontSize: 13 }} value={vendor.serviceArea || ''} placeholder="e.g. Nashville, TN" onChange={e => onChange('serviceArea', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: C.muted, display: 'block', marginBottom: 3 }}>Insurance status</label>
                    <select style={{ ...s.input, fontSize: 13 }} value={vendor.insuranceStatus || ''} onChange={e => onChange('insuranceStatus', e.target.value)}>
                      <option value="">— Not set —</option>
                      {['Insured & verified', 'Insured', 'Not insured', 'Unknown'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                {/* Manual tier override */}
                <div>
                  <label style={{ fontSize: 10, color: C.muted, display: 'block', marginBottom: 3 }}>Tier override <span style={{ fontWeight: 400 }}>(Certified is manual-only)</span></label>
                  <select style={{ ...s.input, fontSize: 13 }} value={vendor.preferredTier || ''} onChange={e => onChange('preferredTier', e.target.value)}>
                    <option value="">Auto — earned tier ({tier})</option>
                    {VENDOR_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── Specialties & Tags (collapsible) — discovery context ── */}
          <div style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowTags(v => !v)} style={{ width: '100%', background: showTags ? C.surface2 : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flex: 1 }}>Specialties & Tags</span>
              {tagCount > 0 && <span style={{ fontSize: 11, color: C.muted }}>{tagCount}</span>}
              <span style={{ fontSize: 10, color: C.muted, transform: showTags ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {showTags && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 11, color: C.muted }}>Optional, vendor-described. Specialties &amp; cultural experience are high-value for matching. Identity tags are discovery context only — never ranked above reliability.</div>
                {VENDOR_TAG_GROUPS.map(g => {
                  const tone = C[g.tone] || C.muted;
                  const selected = vendor[g.key] || [];
                  return (
                    <div key={g.key}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: g.key === 'identityTags' ? C.muted : tone, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>{g.label}</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[...new Set([...g.options, ...selected])].map(opt => {
                          const on = selected.includes(opt);
                          return (
                            <button key={opt} type="button" onClick={() => toggleTag(g.key, opt)}
                              style={{ padding: '5px 11px', borderRadius: 16, fontSize: 11, cursor: 'pointer', minHeight: 30, border: `1.5px solid ${on ? tone : C.border}`, background: on ? tone + '1a' : 'transparent', color: on ? tone : C.muted, fontWeight: on ? 700 : 400 }}>
                              {on ? '✓ ' : ''}{opt}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                        <input style={{ ...s.input, flex: 1, fontSize: 12 }} value={customTag[g.key] || ''} placeholder={`Add custom ${g.filterLabel.toLowerCase()}…`}
                          onChange={e => setCustomTag(c => ({ ...c, [g.key]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addCustomTag(g.key)} />
                        <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 10px' }} onClick={() => addCustomTag(g.key)}>Add</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Planner-Only Notes (collapsible, internal — never exported) ── */}
          <div style={{ marginBottom: 16, border: `1px solid ${C.warn}44`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowPNotes(v => !v)} style={{ width: '100%', background: showPNotes ? C.warn + '12' : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.warn, flex: 1 }}>🔒 Planner-Only Notes</span>
              {((vendor.plannerNotes || []).length + (vendor.privateRiskFlags || []).length) > 0 && <span style={{ fontSize: 11, color: C.muted }}>{(vendor.plannerNotes || []).length + (vendor.privateRiskFlags || []).length}</span>}
              <span style={{ fontSize: 10, color: C.muted, transform: showPNotes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {showPNotes && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, color: C.warn, fontWeight: 600 }}>Internal only — never shown to the vendor, client, or in any export.</div>
                {/* Private notes */}
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input style={{ ...s.input, flex: 1, fontSize: 13 }} value={newPNote} placeholder="Private assessment, e.g. 'Great on big events, slow to email'" onChange={e => setNewPNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlannerNote()} />
                    <button style={s.btn('primary')} onClick={addPlannerNote}>Add</button>
                  </div>
                  {(vendor.plannerNotes || []).length === 0
                    ? <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No private notes yet.</div>
                    : [...(vendor.plannerNotes || [])].reverse().map(n => (
                        <div key={n.id} style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 10, marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: C.muted }}>{fmtDate(n.createdAt)}</div>
                          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{n.note}</div>
                        </div>
                      ))}
                </div>
                {/* Risk flags */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Private Risk Flags</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input style={{ ...s.input, flex: 1, fontSize: 13 }} value={newRiskFlag} placeholder="e.g. 'Double-booked us once — confirm dates in writing'" onChange={e => setNewRiskFlag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRiskFlag()} />
                    <button style={{ ...s.btn(), fontSize: 12 }} onClick={addRiskFlag}>Flag</button>
                  </div>
                  {(vendor.privateRiskFlags || []).map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: C.danger + '11', border: `1px solid ${C.danger}33`, borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: C.danger, flex: 1 }}>⚠ {f.flag}</span>
                      <button onClick={() => onChange('privateRiskFlags', (vendor.privateRiskFlags || []).filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes + Backup vendor */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={s.cardTitle}>Notes</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AIBtn onClick={genNotesDraft} loading={notesDraftLoad} label="Draft from log" />
                <VoiceButton onResult={t => onChange('notes', (vendor.notes ? vendor.notes + ' ' : '') + t)} />
              </div>
            </div>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} value={vendor.notes || ''} placeholder="Contract terms, requirements, special instructions..." onChange={e => onChange('notes', e.target.value)} />
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Backup vendor (if this falls through)</label>
              <input style={s.input} value={vendor.backup || ''} placeholder="Name — phone number" onChange={e => onChange('backup', e.target.value)} />
            </div>
          </div>

          {/* Communication Log */}
          <div style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowLog(v => !v)} style={{ width: '100%', background: showLog ? C.surface2 : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flex: 1 }}>Comm Log</span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                {(vendor.log || []).length > 0 ? `${(vendor.log || []).length} entr${(vendor.log || []).length === 1 ? 'y' : 'ies'}` : 'no entries'}
              </span>
              <span style={{ color: C.muted, fontSize: 12 }}>{showLog ? '▾' : '▸'}</span>
            </button>
            {showLog && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
                {(vendor.log||[]).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {logSumm ? (
                      <div style={{ background: C.accent+'12', border:`1px solid ${C.accent}33`, borderRadius:8, padding:'10px 12px', marginBottom:8, fontSize:12, lineHeight:1.6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontWeight:700, color:C.accent, fontSize:11 }}>✨ AI Summary</span>
                          <button onClick={()=>setLogSumm('')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:C.muted }}>✕</button>
                        </div>
                        {logSumm}
                      </div>
                    ) : <AIBtn onClick={genLogSumm} loading={logSummLoad} label="Summarize log" />}
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <CommLogInput value={newLog} onChange={setNewLog} onAdd={addLog} />
                </div>
                {(vendor.log || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No notes yet — log calls, emails, and decisions here.</div>
                ) : [...(vendor.log || [])].reverse().map(entry => (
                  <div key={entry.id} style={{ borderLeft: `2px solid ${C.accent}`, paddingLeft: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{fmtDate(entry.date)}</div>
                    <div style={{ fontSize: 13 }}>{entry.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          {confirmDel ? (
            <>
              <span style={{ fontSize: 12, color: C.muted }}>Remove vendor?</span>
              <button style={s.btn('danger')} onClick={() => { showToast('Vendor removed'); onDelete(); onClose(); }}>Yes, remove</button>
              <button style={s.btn()} onClick={() => setConfirmDel(false)}>Cancel</button>
            </>
          ) : (
            <button style={s.btn('danger')} onClick={() => setConfirmDel(true)}>Delete</button>
          )}
          <button style={{ ...s.btn('primary'), marginLeft: 'auto' }} onClick={() => setShowBrief(true)}>🔗 Share Brief</button>
        </div>
      </div>
    </>
  );
}

// ─── Vendor Brief View (public page for vendors) ──────────────────────────────

function VendorBriefView({ brief }) {
  const [copied, setCopied] = useState(false);
  // Brand accent — planner's brandColor drives the whole page, falls back to steel blue
  const accent = (brief.brandColor && /^#[0-9a-fA-F]{3,8}$/.test(brief.brandColor)) ? brief.brandColor : '#1a6fba';
  const LC = { bg: '#f6f6f9', surface: '#ffffff', border: '#e7e7ef', accent, text: '#18181c', muted: '#6b6b80', success: '#16a34a' };
  const brandName = brief.plannerBusiness || brief.plannerName || '';
  const initials  = (brandName || 'P').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const fmtTime12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  };

  const textBrief = [
    brandName ? `${brandName} — Vendor Brief` : 'VENDOR BRIEF',
    `Event: ${brief.eventName || 'Event'}`,
    brief.eventDate ? fmtDate(brief.eventDate) : '',
    brief.venue     ? `Venue: ${brief.venue}`  : '',
    '',
    `${brief.vendorName} — ${brief.category}`,
    brief.arrivalTime ? `Arrival: ${fmtTime12(brief.arrivalTime)}` : '',
    '',
    ...(brief.ros || []).map(r => `${fmtTime12(r.time)}  ${r.segment}${r.location ? ` — ${r.location}` : ''}${r.notes ? `\n  ${r.notes}` : ''}`),
    '',
    brief.notes ? `Notes: ${brief.notes}` : '',
    '',
    brief.plannerName  ? `Planner: ${brief.plannerName}` : '',
    brief.plannerPhone ? `Phone: ${brief.plannerPhone}` : '',
    brief.plannerEmail ? `Email: ${brief.plannerEmail}` : '',
    brief.plannerWebsite ? `Web: ${brief.plannerWebsite}` : '',
  ].filter(l => l !== undefined && l !== null).join('\n').trim();

  const copyBrief = () => navigator.clipboard?.writeText(textBrief).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  const cardStyle = { background: LC.surface, borderRadius: 14, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)' };
  const eyebrow   = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: LC.muted, marginBottom: 12 };

  return (
    <div style={{ minHeight: '100vh', background: LC.bg, fontFamily: "'Inter', system-ui, sans-serif", color: LC.text, padding: '0 0 64px' }}>
      {/* ── Brand bar ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${LC.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {brief.plannerLogo
            ? <div style={{ height: 40, maxWidth: 140, display: 'flex', alignItems: 'center', flexShrink: 0 }}><img src={brief.plannerLogo} alt={brandName} style={{ maxHeight: 40, maxWidth: 140, objectFit: 'contain' }} /></div>
            : <div style={{ width: 36, height: 36, borderRadius: 9, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0, letterSpacing: '0.02em' }}>{initials}</div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1, color: LC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandName || 'Event Planner'}</div>
            {(brief.plannerCity || brief.plannerName) && brandName !== brief.plannerName && (
              <div style={{ fontSize: 12, color: LC.muted, marginTop: 1 }}>{[brief.plannerName, brief.plannerCity].filter(Boolean).join(' · ')}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyBrief} style={{ background: LC.bg, border: `1px solid ${LC.border}`, borderRadius: 8, color: LC.text, fontSize: 12, fontWeight: 700, padding: '7px 14px', cursor: 'pointer' }}>{copied ? '✓ Copied' : '⎘ Copy'}</button>
          <button onClick={() => window.print()} style={{ background: LC.bg, border: `1px solid ${LC.border}`, borderRadius: 8, color: LC.text, fontSize: 12, fontWeight: 700, padding: '7px 14px', cursor: 'pointer' }}>🖨 Print</button>
        </div>
      </div>

      {/* ── Hero band (brand accent) ── */}
      <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}d9 100%)`, color: '#fff', padding: '28px 24px 30px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.85 }}>VENDOR BRIEF</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{brief.eventName || 'Event'}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', fontSize: 13, fontWeight: 500, opacity: 0.95 }}>
            {brief.eventDate && <span>📅 {fmtDate(brief.eventDate)}</span>}
            {brief.venue     && <span>📍 {brief.venue}</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px' }}>
        {/* ── Vendor identity + arrival (hero card) ── */}
        <div style={{ ...cardStyle, borderTop: `3px solid ${accent}` }}>
          {brief.contactName && (
            <div style={{ fontSize: 14, color: LC.muted, marginBottom: 8 }}>Hi {brief.contactName},</div>
          )}
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>{brief.vendorName}</div>
          <div style={{ fontSize: 13, color: LC.muted, marginBottom: brief.arrivalTime ? 16 : 0 }}>{brief.category}</div>
          {brief.arrivalTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: accent + '12', border: `1.5px solid ${accent}33`, borderRadius: 12, padding: '14px 18px' }}>
              <span style={{ fontSize: 26 }}>🕐</span>
              <div>
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: '0.08em' }}>YOUR ARRIVAL TIME</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1.1, marginTop: 2 }}>{fmtTime12(brief.arrivalTime)}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Day-of schedule ── */}
        {brief.ros && brief.ros.length > 0 && (
          <div style={cardStyle}>
            <div style={eyebrow}>Your Day-of Schedule</div>
            {brief.ros.map((r, i) => (
              <div key={r.id || i} style={{ display: 'flex', gap: 14, paddingBottom: i < brief.ros.length - 1 ? 14 : 0, borderBottom: i < brief.ros.length - 1 ? `1px solid ${LC.border}` : 'none', marginBottom: i < brief.ros.length - 1 ? 14 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: accent, minWidth: 64, flexShrink: 0 }}>{fmtTime12(r.time)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.segment}</div>
                  {r.location && <div style={{ fontSize: 12, color: LC.muted }}>{r.location}</div>}
                  {r.notes    && <div style={{ fontSize: 12, color: LC.text, marginTop: 4, lineHeight: 1.5 }}>{r.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Notes ── */}
        {brief.notes && (
          <div style={cardStyle}>
            <div style={eyebrow}>Notes</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{brief.notes}</div>
          </div>
        )}

        {/* ── Planner contact (branded) ── */}
        {(brief.plannerName || brief.plannerPhone || brief.plannerEmail || brandName) && (
          <div style={{ ...cardStyle, marginBottom: 0, background: '#fff' }}>
            <div style={eyebrow}>Your Day-of Contact</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
              <div>
                {brief.plannerName && <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{brief.plannerName}</div>}
                {brandName && brandName !== brief.plannerName && <div style={{ fontSize: 13, color: LC.muted }}>{brandName}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {brief.plannerPhone && <a href={`tel:${brief.plannerPhone}`} style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 600 }}>📞 {brief.plannerPhone}</a>}
              {brief.plannerEmail && <a href={`mailto:${brief.plannerEmail}`} style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 600 }}>✉️ {brief.plannerEmail}</a>}
              {brief.plannerWebsite && <a href={wsHref(brief.plannerWebsite)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: accent, textDecoration: 'none', fontWeight: 600 }}>🌐 {brief.plannerWebsite}</a>}
              {brief.plannerIG && <span style={{ fontSize: 14, color: LC.muted }}>📷 {brief.plannerIG}</span>}
            </div>
          </div>
        )}

        {/* ── Brand footer ── */}
        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: LC.muted }}>
          {brandName ? `Coordinated by ${brandName}` : 'Coordinated by your event planner'}
        </div>
      </div>
    </div>
  );
}

// ─── Vendor Brief Modal (planner-facing share panel) ──────────────────────────

function VendorBriefModal({ vendor, event, ros, profile, onClose }) {
  const C = useT();
  const s = makeS(C);
  const [copied, setCopied] = useState(false);

  const vendorRos = (ros || []).filter(r => r.vendorName === vendor.name || r.owner === vendor.name).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const brief = {
    vendorId:     vendor.id,
    vendorName:   vendor.name,
    contactName:  vendor.contactName || '',
    category:     vendor.category,
    arrivalTime:  vendor.arrivalTime,
    notes:        vendor.notes,
    eventId:      event?.id,
    eventName:    event?.name,
    eventDate:    event?.date,
    venue:        event?.venue,
    plannerName:     profile?.name  || '',
    plannerPhone:    profile?.phone || '',
    plannerEmail:    profile?.email || '',
    plannerBusiness: profile?.businessName || '',
    plannerWebsite:  profile?.website   || '',
    plannerIG:       profile?.instagram || '',
    plannerCity:     profile?.city      || '',
    plannerLogo:     profile?.logo      || '',
    brandColor:      profile?.brandColor || '',
    ros:          vendorRos.map(r => ({ time: r.time, segment: r.segment, location: r.location, notes: r.notes })),
  };

  const token    = b64encode(JSON.stringify(brief));
  const briefUrl = `${window.location.origin}${window.location.pathname}?vendor=${token}`;

  const copyUrl  = () => navigator.clipboard?.writeText(briefUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  // QR code — generated client-side from the brief URL
  const [qrUrl, setQrUrl]     = useState('');
  const [qrErr, setQrErr]     = useState(false);
  const isLongUrl             = briefUrl.length > 1200; // dense QRs get hard to scan when printed small
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(briefUrl, { width: 480, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } })
      .then(url => { if (!cancelled) { setQrUrl(url); setQrErr(false); } })
      .catch(() => { if (!cancelled) setQrErr(true); });
    return () => { cancelled = true; };
  }, [briefUrl]);

  const downloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `${(vendor.name || 'vendor').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-brief-qr.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const fmtTime12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(480px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 60, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Vendor Brief</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{vendor.name} sees only what's in this view</div>
          </div>
          <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* What the vendor sees */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 12 }}>Vendor sees</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ ...s.card, padding: '12px 16px', marginBottom: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{vendor.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{vendor.category}</div>
                {vendor.arrivalTime && <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginTop: 8 }}>Arrives {fmtTime12(vendor.arrivalTime)}</div>}
              </div>
              {vendorRos.map((r, i) => (
                <div key={r.id || i} style={{ display: 'flex', gap: 12, padding: '8px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent2, minWidth: 52 }}>{fmtTime12(r.time)}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.segment}</div>
                    {r.location && <div style={{ fontSize: 11, color: C.muted }}>{r.location}</div>}
                    {r.notes    && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{r.notes}</div>}
                  </div>
                </div>
              ))}
              {vendor.notes && <div style={{ fontSize: 12, color: C.text, padding: '10px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>{vendor.notes}</div>}
            </div>
          </div>

          {/* What they do NOT see */}
          <div style={{ padding: '10px 14px', background: C.danger + '11', border: `1px solid ${C.danger}33`, borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.danger, marginBottom: 4 }}>NOT shared with vendor</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>Budget, payments, other vendors, guest list, notes from other tabs</div>
          </div>

          {/* Share link */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 8 }}>Share link</div>
            <div style={{ fontSize: 10, color: C.muted, wordBreak: 'break-all', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5 }}>{briefUrl}</div>
            <button onClick={copyUrl} style={{ ...s.btn(copied ? 'success' : 'primary'), width: '100%', fontSize: 13 }}>
              {copied ? '✓ Link copied to clipboard' : '⎘ Copy Vendor Brief Link'}
            </button>
            <button onClick={() => window.open(briefUrl, '_blank')} style={{ ...s.btn(), width: '100%', fontSize: 12, marginTop: 8 }}>Preview in new tab →</button>
          </div>

          {/* QR code — for printed materials */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 12 }}>QR code <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— print on call sheets or day-of signage</span></div>
            {qrErr ? (
              <div style={{ fontSize: 12, color: C.danger, padding: '10px 12px', background: C.danger + '11', borderRadius: 8 }}>Couldn't generate QR code for this brief.</div>
            ) : (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ background: '#ffffff', padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                  {qrUrl
                    ? <img src={qrUrl} alt="Vendor brief QR code" style={{ width: 132, height: 132, display: 'block' }} />
                    : <div style={{ width: 132, height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 11 }}>Generating…</div>}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 10 }}>{vendor.name} can scan this to open their brief — no link to type.</div>
                  <button onClick={downloadQr} disabled={!qrUrl} style={{ ...s.btn(), width: '100%', fontSize: 12, opacity: qrUrl ? 1 : 0.5 }}>⬇ Download PNG</button>
                  {isLongUrl && <div style={{ fontSize: 10, color: C.warn, marginTop: 8, lineHeight: 1.4 }}>⚠ This brief has a lot of detail, so the QR is dense — print it at least 1.5″ wide for reliable scanning.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Invite Composer Modal ────────────────────────────────────────────────────

function InviteComposer({ event, guests, onClose }) {
  const C = useT();
  const s = makeS(C);
  const eventName  = event?.name  || 'Our Event';
  const eventDate  = event?.date  ? fmtDate(event.date) : '';
  const eventVenue = event?.venue || '';

  const defaultText = [
    `You're invited to ${eventName}!`,
    eventDate  ? `📅 ${eventDate}` : '',
    eventVenue ? `📍 ${eventVenue}` : '',
    '',
    'Please RSVP at your earliest convenience.',
    '',
    'We look forward to celebrating with you!',
  ].filter(Boolean).join('\n');

  const [msgText,  setMsgText]  = useState(defaultText);
  const [copied,   setCopied]   = useState(false);
  const [sentIds,  setSentIds]  = useState(new Set());
  const [emailsCopied, setEmailsCopied] = useState(false);

  const needsInvite = guests.filter(g => !g.rsvp || g.rsvp === 'Maybe');

  const copyText = () => {
    navigator.clipboard?.writeText(msgText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const markSent = (id) => setSentIds(s => new Set([...s, id]));

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(480px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Send Invitations</div>
          <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Invitation message editor */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invitation Message</label>
              <button onClick={copyText} style={{ ...s.btn(copied ? 'success' : 'ghost'), fontSize: 11, padding: '3px 10px' }}>
                {copied ? '✓ Copied' : '⎘ Copy All'}
              </button>
            </div>
            <textarea
              style={{ ...s.input, minHeight: 160, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 13 }}
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
            />
          </div>

          {/* Guest send list */}
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Send To ({needsInvite.length} need{needsInvite.length !== 1 ? '' : 's'} invitation)
            </div>
            {needsInvite.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '24px 0' }}>All guests have responded ✓</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {needsInvite.map(g => {
                  const sent = sentIds.has(g.id);
                  const emailLink = g.email ? `mailto:${g.email}?subject=${encodeURIComponent(`You're invited to ${eventName}`)}&body=${encodeURIComponent(msgText)}` : null;
                  const smsLink   = g.phone  ? `sms:${g.phone}?body=${encodeURIComponent(msgText)}` : null;
                  return (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: sent ? C.success + '11' : C.bg, border: `1px solid ${sent ? C.success + '44' : C.border}`, transition: 'all 0.2s' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{g.group}{g.rsvp === 'Maybe' ? ' · Maybe' : ' · No response'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        {sent && <span style={{ fontSize: 11, color: C.success }}>Sent ✓</span>}
                        {emailLink && (
                          <a href={emailLink} onClick={() => markSent(g.id)} style={{ ...s.btn(), fontSize: 11, padding: '4px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconEmail size={12} /> Email
                          </a>
                        )}
                        {smsLink && (
                          <a href={smsLink} onClick={() => markSent(g.id)} style={{ ...s.btn(), fontSize: 11, padding: '4px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconSMS size={12} /> Text
                          </a>
                        )}
                        {!emailLink && !smsLink && (
                          <span style={{ fontSize: 11, color: C.muted }}>No contact info</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            const withEmail = needsInvite.filter(g => g.email);
            if (withEmail.length === 0) return (
              <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>Add guest email addresses to enable batch send</div>
            );
            const allEmails = withEmail.map(g => g.email).join(', ');
            const bccHref = `mailto:?bcc=${encodeURIComponent(allEmails)}&subject=${encodeURIComponent(`You're invited to ${eventName}`)}&body=${encodeURIComponent(msgText)}`;
            return (
              <>
                <a href={bccHref} style={{ ...s.btn('primary'), textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}>
                  ✉ Open in Email Client ({withEmail.length} BCC'd)
                </a>
                <button
                  onClick={() => { navigator.clipboard?.writeText(allEmails); setEmailsCopied(true); setTimeout(() => setEmailsCopied(false), 2000); }}
                  style={{ ...s.btn(emailsCopied ? 'success' : 'ghost'), fontSize: 11, width: '100%' }}
                >
                  {emailsCopied ? '✓ Copied!' : `⎘ Copy all email addresses (${withEmail.length})`}
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}

// ─── Guest Modal ─────────────────────────────────────────────────────────────

function GuestModal({ guest, tables, onClose, onChange, onDelete }) {
  const C          = useT();
  const s          = makeS(C);
  const rsvpCLR    = RSVP_CLR(C);
  const showToast  = useToast();
  const [confirmDel, setConfirmDel] = useState(false);
  const rsvpColor = rsvpCLR[guest.rsvp] || C.text;
  const mealOpts  = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', '—'];
  // Field validation
  const gErr = {
    email: !isEmail(guest.email) ? 'Enter a valid email address' : null,
    phone: !isPhone(guest.phone) ? 'Enter a valid phone number'  : null,
  };

  // Expand special needs panel if guest already has needs, otherwise keep collapsed
  const [showNeeds, setShowNeeds] = useState(!!(guest.needs));
  const [showCustomNeeds, setShowCustomNeeds] = useState(() => {
    const parts = (guest.needs || '').split(',').map(s => s.trim()).filter(Boolean);
    return parts.some(p => !SPECIAL_NEEDS_OPTIONS.includes(p));
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(420px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <input style={{ ...s.input, fontSize: 17, fontWeight: 700, flex: 1, padding: '5px 8px' }} value={guest.name} placeholder="Guest name" onChange={e => onChange('name', e.target.value)} />
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px', flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...s.input, flex: 1 }} value={guest.group} onChange={e => onChange('group', e.target.value)}>
              {['Family', 'Friends', 'Work', 'Other'].map(o => <option key={o}>{o}</option>)}
            </select>
            <select style={{ ...s.input, flex: 1, color: rsvpColor }} value={guest.rsvp} onChange={e => onChange('rsvp', e.target.value)}>
              {['Yes', 'No', 'Maybe'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* Meal */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Meal Preference</div>
            <select style={s.input} value={guest.meal} onChange={e => onChange('meal', e.target.value)}>
              {mealOpts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Special needs — collapsed by default, auto-opens when guest has needs */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showNeeds ? 8 : 0 }}>
              <div style={s.cardTitle}>Special Needs / Accessibility</div>
              <button onClick={() => setShowNeeds(v => !v)} style={{ ...s.btn('ghost'), fontSize: 11, padding: '2px 8px' }}>
                {showNeeds ? 'hide' : (guest.needs ? `${guest.needs.split(',').filter(Boolean).length} set ▸` : '+ Add')}
              </button>
            </div>
            {showNeeds && (() => {
              const needsParts = (guest.needs || '').split(',').map(s => s.trim()).filter(Boolean);
              const togglePreset = (opt) => {
                const active = needsParts.includes(opt);
                const next = active ? needsParts.filter(p => p !== opt) : [...needsParts, opt];
                onChange('needs', next.join(', '));
              };
              const customText = needsParts.filter(p => !SPECIAL_NEEDS_OPTIONS.includes(p)).join(', ');
              return (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: showCustomNeeds ? 8 : 0 }}>
                    {SPECIAL_NEEDS_OPTIONS.map(opt => {
                      const active = needsParts.includes(opt);
                      return (
                        <button key={opt} onClick={() => togglePreset(opt)} style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                          border: `1px solid ${active ? C.accent : C.border}`,
                          background: active ? C.accent + '18' : C.bg,
                          color: active ? C.accent : C.muted, fontWeight: active ? 600 : 400,
                        }}>{opt}</button>
                      );
                    })}
                    <button onClick={() => setShowCustomNeeds(v => !v)} style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${showCustomNeeds ? C.accent2 : C.border}`,
                      background: showCustomNeeds ? C.accent2 + '18' : C.bg,
                      color: showCustomNeeds ? C.accent2 : C.muted, fontWeight: showCustomNeeds ? 600 : 400,
                    }}>Other</button>
                  </div>
                  {showCustomNeeds && (
                    <input style={s.input} value={customText} placeholder="Describe additional needs..."
                      onChange={e => {
                        const presets = needsParts.filter(p => SPECIAL_NEEDS_OPTIONS.includes(p));
                        const custom = e.target.value.trim();
                        onChange('needs', [...presets, ...(custom ? [custom] : [])].join(', '));
                      }} />
                  )}
                </>
              );
            })()}
          </div>

          {/* Plus-one / party */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Plus-One / Party</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Plus-One Name</label>
                <input style={s.input} value={guest.plusOne || ''} placeholder="Name" onChange={e => onChange('plusOne', e.target.value)} />
              </div>
              {guest.plusOne && (
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Plus-One Meal</label>
                  <select style={s.input} value={guest.plusOneMeal || '—'} onChange={e => onChange('plusOneMeal', e.target.value)}>
                    {mealOpts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Children in Party</label>
                <input style={{ ...s.input, width: 80 }} type="number" min="0" value={guest.kids || 0} onChange={e => onChange('kids', Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
          </div>

          {/* Seating */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Seating</div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Table Number</label>
            <input style={{ ...s.input, width: 100, opacity: guest.rsvp === 'Yes' ? 1 : 0.4 }}
              type="number" min="1" max={tables || undefined}
              value={guest.table || ''} placeholder="—"
              disabled={guest.rsvp !== 'Yes'}
              title={guest.rsvp !== 'Yes' ? 'Confirm RSVP first to assign a table' : ''}
              onChange={e => onChange('table', Number(e.target.value) || null)} />
            {guest.rsvp !== 'Yes' && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Set RSVP to Yes first</div>}
          </div>

          {/* Contact */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Email</label>
                <input style={{ ...s.input, borderColor: gErr.email ? C.danger : undefined }} value={guest.email || ''} placeholder="guest@example.com" onChange={e => onChange('email', e.target.value)} />
                {gErr.email && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{gErr.email}</div>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Phone</label>
                <input style={{ ...s.input, borderColor: gErr.phone ? C.danger : undefined }} value={guest.phone || ''} placeholder="(555) 555-0100" onChange={e => onChange('phone', formatPhone(e.target.value))} />
                {gErr.phone && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{gErr.phone}</div>}
              </div>
              {(guest.phone || guest.email) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {guest.phone && !gErr.phone && (
                    <a href={`sms:${guest.phone}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.accent2, textDecoration: 'none', border: `1px solid ${C.accent2}44`, borderRadius: 8, padding: '5px 10px' }}>
                      <IconSMS size={14} /> Text
                    </a>
                  )}
                  {guest.email && !gErr.email && (
                    <a href={`mailto:${guest.email}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.accent, textDecoration: 'none', border: `1px solid ${C.accent}44`, borderRadius: 8, padding: '5px 10px' }}>
                      <IconEmail size={14} /> Email
                    </a>
                  )}
                  {guest.phone && !gErr.phone && (
                    <a href={waHref(guest.phone)} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#25D366', textDecoration: 'none', border: '1px solid #25D36644', borderRadius: 8, padding: '5px 10px' }}>
                      <IconWA size={14} /> WhatsApp
                    </a>
                  )}
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Mailing Address</label>
                <textarea style={{ ...s.input, minHeight: 58, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} value={guest.address || ''} placeholder="For invitations, save-the-dates, thank-you cards..." onChange={e => onChange('address', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Post-event */}
          <div style={{ marginBottom: 20 }}>
            <div style={s.cardTitle}>Post-Event</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['giftReceived', 'Gift received'], ['thankYouSent', 'Thank-you note sent']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={guest[key] || false} onChange={e => onChange(key, e.target.checked)} style={{ accentColor: C.success, cursor: 'pointer', width: 14, height: 14 }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Party notes */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={s.cardTitle}>Party Notes</div>
              <VoiceButton onResult={t => onChange('partyNotes', (guest.partyNotes ? guest.partyNotes + ' ' : '') + t)} />
            </div>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} value={guest.partyNotes || ''} placeholder="Relationship context, gift notes, special considerations..." onChange={e => onChange('partyNotes', e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          {confirmDel ? (
            <>
              <span style={{ fontSize: 12, color: C.muted }}>Remove this guest?</span>
              <button style={s.btn('danger')} onClick={() => { showToast('Guest removed'); onDelete(); onClose(); }}>Yes, remove</button>
              <button style={s.btn()} onClick={() => setConfirmDel(false)}>Cancel</button>
            </>
          ) : (
            <button style={s.btn('danger')} onClick={() => setConfirmDel(true)}>Remove Guest</button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── New Event Modal ──────────────────────────────────────────────────────────

// ─── Task Modal ───────────────────────────────────────────────────────────────

function TaskModal({ task, eventDate, onClose, onChange, onDelete }) {
  const C          = useT();
  const s          = makeS(C);
  const showToast  = useToast();
  const aiKey      = useAIKey();
  const [confirmDel, setConfirmDel] = useState(false);
  const [taskNotesLoad, setTaskNotesLoad] = useState(false);
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  const genTaskNotes = async () => {
    if (!aiKey) return;
    setTaskNotesLoad(true);
    const prompt = `You are an event planning assistant. Write a brief, practical note (2-4 sentences) for this planning task. Include: who should own it, how to execute it, and any key questions to answer. Be specific and actionable.\n\nTask: "${task.task}"\nPhase: ${task.week}\nCurrent owner: ${task.owner || 'not set'}\nCurrent notes: ${task.notes || '(none)'}\n\nWrite the note:`;
    try { await askClaude(aiKey, prompt, { maxTokens: 120, onChunk: t => onChange('notes', t) }); }
    catch(e) { /* silent */ }
    setTaskNotesLoad(false);
  };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <button onClick={() => onChange('done', !task.done)} style={{ flexShrink: 0, marginTop: 3, width: 24, height: 24, borderRadius: '50%', border: `2px solid ${task.done ? C.success : C.border}`, background: task.done ? C.success + '22' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.success, fontSize: 12 }}>
              {task.done ? '✓' : ''}
            </button>
            <input style={{ ...s.input, fontSize: 16, fontWeight: 700, flex: 1, textDecoration: task.done ? 'line-through' : 'none', color: task.done ? C.muted : C.text }} value={task.task} onChange={e => onChange('task', e.target.value)} placeholder="Task name" />
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px', flexShrink: 0 }}>✕</button>
          </div>
          {task.done && <div style={{ fontSize: 11, color: C.success, fontWeight: 600, paddingLeft: 34 }}>Completed ✓</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Planning Phase</label>
            <select style={s.input} value={task.week} onChange={e => onChange('week', e.target.value)}>
              {[...Object.keys(PHASE_OFFSET), 'Custom'].map(p => {
                const pd = eventDate ? phaseDate(p, eventDate) : null;
                return <option key={p} value={p}>{pd ? `${pd} — ${p}` : p}</option>;
              })}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Owner / Responsible</label>
            <input style={s.input} value={task.owner || ''} placeholder="Planner, Couple, Vendor…" onChange={e => onChange('owner', e.target.value)} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <label style={{ fontSize: 11, color: C.muted }}>Notes</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AIBtn onClick={genTaskNotes} loading={taskNotesLoad} label="Fill in details" />
                <VoiceButton onResult={t => onChange('notes', (task.notes ? task.notes + ' ' : '') + t)} />
              </div>
            </div>
            <textarea style={{ ...s.input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={task.notes || ''} placeholder="Details, links, follow-up actions…" onChange={e => onChange('notes', e.target.value)} />
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {confirmDel ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Delete this task?</span>
              <button style={s.btn('danger')} onClick={() => { showToast('Task deleted'); onDelete(); onClose(); }}>Yes, delete</button>
              <button style={s.btn()} onClick={() => setConfirmDel(false)}>Cancel</button>
            </div>
          ) : (
            <button style={{ ...s.btn('danger'), width: '100%' }} onClick={() => setConfirmDel(true)}>Delete Task</button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Budget Modal ─────────────────────────────────────────────────────────────

function BudgetModal({ row, committed, categoryVendors, onClose, onChange, onDelete }) {
  const C          = useT();
  const s          = makeS(C);
  const stageCLR   = STAGE_CLR(C);
  const showToast  = useToast();
  const fileRef    = useRef(null);
  const cameraRef  = useRef(null);
  const isPaid     = !!row.paid;
  const [confirmDel, setConfirmDel] = useState(false);
  const [synced, setSynced] = useState(false);

  // Local state for numeric inputs so user can clear the field and retype
  const [localActual,   setLocalActual]   = useState(() => String(row.actual));
  const [localBudgeted, setLocalBudgeted] = useState(() => String(row.budgeted));

  // Keep local in sync if parent updates row (e.g. new modal opened).
  // Intentionally keyed to row.id only — we reset when switching rows, not on every value change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalActual(String(row.actual));   }, [row.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalBudgeted(String(row.budgeted)); }, [row.id]);

  const previewActual   = Number(localActual)   || 0;
  const previewBudgeted = Number(localBudgeted) || 0;
  const balDue = committed - previewActual;

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange('receiptPhoto', ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(380px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
            <input style={{ ...s.input, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', flex: 1, padding: '5px 8px' }} value={row.category} onChange={e => onChange('category', e.target.value)} />
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px', flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Balance Due</div>
              <div style={{ ...s.statNum(committed === 0 ? C.muted : balDue <= 0 ? C.success : C.warn), fontSize: 26 }}>
                {committed === 0 ? '—' : balDue <= 0 ? 'Paid' : fmtD(balDue)}
              </div>
            </div>
            {committed > 0 && (
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Committed</div>
                <div style={{ ...s.statNum(committed > row.budgeted ? C.danger : C.accent2), fontSize: 26 }}>{fmtD(committed)}</div>
              </div>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => { onChange('paid', !isPaid); if (!isPaid && !row.paymentMethod) onChange('paymentMethod', 'Credit Card'); }}
                style={{ ...s.btn(isPaid ? 'success' : 'default'), fontSize: 12, padding: '6px 14px', fontWeight: 700 }}
              >
                {isPaid ? '✓ Paid' : '○ Unpaid'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Budgeted</label>
              <input style={s.input} type="number" value={localBudgeted}
                onChange={e => setLocalBudgeted(e.target.value)}
                onBlur={e => { const v = Number(e.target.value) || 0; setLocalBudgeted(String(v)); onChange('budgeted', v); }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Spent</label>
              <input style={{ ...s.input, borderColor: previewActual > previewBudgeted && previewBudgeted > 0 ? C.danger + '88' : undefined }} type="number" value={localActual}
                onChange={e => setLocalActual(e.target.value)}
                onBlur={e => { const v = Number(e.target.value) || 0; setLocalActual(String(v)); onChange('actual', v); }}
              />
            </div>
          </div>
          {categoryVendors?.length === 1 && categoryVendors[0].cost > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, marginBottom: 12 }}>
              <button
                onClick={() => {
                  const v = categoryVendors[0];
                  onChange('budgeted', v.cost);
                  setLocalBudgeted(String(v.cost));
                  onChange('actual', v.depositPaid ? (v.balancePaid ? v.cost : v.depositAmt) : 0);
                  setLocalActual(String(v.depositPaid ? (v.balancePaid ? v.cost : v.depositAmt) : 0));
                  onChange('notes', v.name);
                  setSynced(true);
                  setTimeout(() => setSynced(false), 2000);
                }}
                style={{ ...s.btn(synced ? 'success' : 'ghost'), fontSize: 11, padding: '3px 10px' }}
              >
                {synced ? '✓ Synced' : `⇄ Sync from ${categoryVendors[0].name}`}
              </button>
              <span style={{ fontSize: 11, color: C.muted }}>${categoryVendors[0].cost.toLocaleString()} total · ${categoryVendors[0].depositAmt.toLocaleString()} deposit</span>
            </div>
          )}

          {/* Payment method — shown always so you can pre-set it */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Payment Method</label>
            <select style={s.input} value={row.paymentMethod || ''} onChange={e => onChange('paymentMethod', e.target.value)}>
              <option value="">— not set —</option>
              {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Notes</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} value={row.notes} placeholder="Vendor name, invoice #, details…" onChange={e => onChange('notes', e.target.value)} />
          </div>

          {/* Receipt photo */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: C.muted }}>Receipt</label>
              {row.receiptPhoto && (
                <button style={{ ...s.btn('danger'), fontSize: 10, padding: '2px 8px' }} onClick={() => onChange('receiptPhoto', null)}>Remove</button>
              )}
            </div>
            {row.receiptPhoto ? (
              <img src={row.receiptPhoto} alt="Receipt" style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 300, objectFit: 'contain', background: C.bg }} />
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ ...s.btn(), flex: 1, padding: '9px 6px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={() => cameraRef.current?.click()}>📷 Camera</button>
                <button style={{ ...s.btn(), flex: 1, padding: '9px 6px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={() => fileRef.current?.click()}>🖼 Choose File</button>
              </div>
            )}
            <input ref={fileRef}   type="file" accept="image/*"                       style={{ display: 'none' }} onChange={handlePhoto} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          <ProgressBar pct={previewBudgeted > 0 ? (previewActual / previewBudgeted) * 100 : 0} color={previewActual > previewBudgeted && previewBudgeted > 0 ? C.danger : undefined} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 4 }}>
            <span style={{ color: previewActual > previewBudgeted && previewBudgeted > 0 ? C.danger : C.text, fontWeight: 600 }}>{fmtD(previewActual)} spent</span>
            <span>{fmtD(previewBudgeted)} budgeted</span>
          </div>

          {/* Linked vendors in this budget category */}
          {categoryVendors && categoryVendors.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 10 }}>Vendors in this category</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categoryVendors.map(v => {
                  const bal = v.balancePaid ? 0 : v.cost - v.depositAmt;
                  return (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v.name}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{v.status}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{fmtD(v.cost)}</div>
                        {bal > 0 && <div style={{ fontSize: 10, color: C.warn }}>{fmtD(bal)} due</div>}
                        {v.balancePaid && <div style={{ fontSize: 10, color: C.success }}>Paid ✓</div>}
                      </div>
                      <span style={s.pill(stageCLR[v.status] || C.muted)}>{v.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {confirmDel ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Delete this budget line?</span>
              <button style={s.btn('danger')} onClick={() => { showToast('Budget line deleted'); onDelete(); onClose(); }}>Yes, delete</button>
              <button style={s.btn()} onClick={() => setConfirmDel(false)}>Cancel</button>
            </div>
          ) : (
            <button style={{ ...s.btn('danger'), width: '100%' }} onClick={() => setConfirmDel(true)}>Delete Budget Line</button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ROS Modal ────────────────────────────────────────────────────────────────

function ROSModal({ entry, onClose, onChange, onDelete }) {
  const C          = useT();
  const s          = makeS(C);
  const rosCLR     = ROS_CLR(C);
  const showToast  = useToast();
  const typeClr    = rosCLR[entry.type] || C.muted;
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(420px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, borderRadius: 99, background: typeClr, alignSelf: 'stretch', flexShrink: 0 }} />
            <input style={{ ...s.input, fontSize: 16, fontWeight: 700, flex: 1 }} value={entry.segment} placeholder="Segment name" onChange={e => onChange('segment', e.target.value)} />
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px', flexShrink: 0 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 130 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Time</label>
              <input style={s.input} type="time" value={entry.time} onChange={e => onChange('time', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Type</label>
              <select style={{ ...s.input, color: typeClr }} value={entry.type} onChange={e => onChange('type', e.target.value)}>
                <option value="event">Event</option>
                <option value="vendor">Vendor</option>
                <option value="prep">Prep</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Location</label>
            <input style={s.input} value={entry.location || ''} placeholder="Room, area, or address" onChange={e => onChange('location', e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Owner / Responsible</label>
            <input style={s.input} value={entry.owner} placeholder="Name or role" onChange={e => onChange('owner', e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Notes / Cues</label>
            <textarea style={{ ...s.input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={entry.notes} placeholder="Instructions, cues, reminders…" onChange={e => onChange('notes', e.target.value)} />
          </div>
          {entry.type === 'vendor' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={entry.confirmed || false} onChange={e => onChange('confirmed', e.target.checked)} style={{ accentColor: C.success, cursor: 'pointer', width: 14, height: 14 }} />
              Vendor confirmed
              {entry.confirmed && <span style={{ color: C.success, fontWeight: 600 }}>✓</span>}
            </label>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {confirmDel ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Remove from schedule?</span>
              <button style={s.btn('danger')} onClick={() => { showToast('Entry removed'); onDelete(); onClose(); }}>Yes, remove</button>
              <button style={s.btn()} onClick={() => setConfirmDel(false)}>Cancel</button>
            </div>
          ) : (
            <button style={{ ...s.btn('danger'), width: '100%' }} onClick={() => setConfirmDel(true)}>Remove from Schedule</button>
          )}
        </div>
      </div>
    </>
  );
}

function NewEventModal({ onClose, onCreate, clients = [], profile = null }) {
  const C      = useT();
  const s      = makeS(C);
  const evtCLR = EVT_CLR(C);
  const [form,             setForm]            = useState({ name: '', type: 'Wedding', date: '', venue: '', guestCount: '', totalBudget: '' });
  const [useTimeline,      setUseTimeline]     = useState(true);
  const [useBudget,        setUseBudget]       = useState(true);
  const [useVendors,       setUseVendors]      = useState(true);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [activeCat,        setActiveCat]       = useState('Weddings & Celebrations');
  const tmpl       = TIMELINE_TEMPLATES[form.type];
  const budgetTmpl = BUDGET_TEMPLATES[form.type] || BUDGET_TEMPLATES.Other;
  const vendorCats = VENDOR_STUBS[form.type]     || VENDOR_STUBS.Other;

  const [kitExpanded,      setKitExpanded]     = useState({ timeline: false, budget: false, vendors: false });
  const [timelineChecked,  setTimelineChecked] = useState(() => tmpl ? tmpl.map(() => true) : []);
  const [budgetChecked,    setBudgetChecked]   = useState(() => budgetTmpl.map(() => true));
  const [budgetAmounts,    setBudgetAmounts]   = useState({});
  const [vendorChecked,    setVendorChecked]   = useState(() => vendorCats.map(() => true));

  // Reset item-level state whenever event type changes
  useEffect(() => {
    const newTmpl    = TIMELINE_TEMPLATES[form.type];
    const newBudget  = BUDGET_TEMPLATES[form.type]  || BUDGET_TEMPLATES.Other;
    const newVendors = VENDOR_STUBS[form.type]       || VENDOR_STUBS.Other;
    setTimelineChecked(newTmpl ? newTmpl.map(() => true) : []);
    setBudgetChecked(newBudget.map(() => true));
    setBudgetAmounts({});
    setVendorChecked(newVendors.map(() => true));
    setKitExpanded({ timeline: false, budget: false, vendors: false });
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleKit = (key) => setKitExpanded(p => ({ ...p, [key]: !p[key] }));
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const budgetAmt  = Number(form.totalBudget) || 0;
  const guestCt    = Number(form.guestCount)  || 0;
  const tableCount = guestCt ? Math.max(1, Math.ceil(guestCt / (TABLE_SIZE[form.type] || 8))) : 5;
  const typeColor  = evtCLR[form.type] || C.muted;

  const submit = () => {
    if (!form.name.trim()) return;

    const timeline = useTimeline && tmpl
      ? tmpl.filter((_, i) => timelineChecked[i] !== false).map(t => ({ ...t, id: uid(), done: false }))
      : [];

    const budget = useBudget && budgetAmt > 0
      ? budgetTmpl
          .filter((_, i) => budgetChecked[i] !== false)
          .map(item => ({
            id: uid(), category: item.c, actual: 0, notes: '',
            budgeted: budgetAmounts[item.c] !== undefined
              ? Number(budgetAmounts[item.c])
              : Math.round(budgetAmt * item.pct),
          }))
      : [];

    const vendors = useVendors
      ? vendorCats
          .filter((_, i) => vendorChecked[i] !== false)
          .map(cat => ({ id: uid(), name: '', category: cat, budgetCategory: cat, status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '', arrivalTime: '', contact: '', phone: '', website: '', backup: '', notes: '', log: [] }))
      : [];

    onCreate({ id: uid(), rsvpCode: uid(), name: form.name, type: form.type, date: form.date, venue: form.venue, tables: tableCount, catererCount: 0, budget, guests: [], vendors, timeline, ros: [] }, selectedClientId || null);
    onClose();
  };

  const TemplateRow = ({ checked, onChange, title, sub, color }) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${checked ? (color || C.accent) : C.border}`, transition: 'border-color 0.15s' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: color || C.accent, cursor: 'pointer', width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
    </label>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, zIndex: 50, width: 460, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>New Event</h2>
            {form.type && <span style={{ ...s.pill(typeColor), fontSize: 12 }}>{form.type}</span>}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

          {/* ── Event Type — category tabs + subtype grid ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 8 }}>Event Type</label>

            {/* Category tab row */}
            {(() => {
              const CAT_META = {
                'Weddings & Celebrations': { icon: '🎊', color: C.accent },
                'Corporate':               { icon: '🏢', color: C.accent2 },
                'Social & Fundraising':    { icon: '🤝', color: C.success },
              };
              return (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {Object.keys(EVT_CATEGORIES).map(cat => {
                    const meta   = CAT_META[cat];
                    const active = activeCat === cat;
                    return (
                      <button key={cat} onClick={() => setActiveCat(cat)}
                        style={{
                          flex: 1, padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${active ? meta.color : C.border}`,
                          background: active ? meta.color + '18' : C.bg,
                          transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        }}>
                        <span style={{ fontSize: 18 }}>{meta.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? meta.color : C.muted, lineHeight: 1.2, textAlign: 'center' }}>
                          {cat === 'Weddings & Celebrations' ? 'Celebrations' : cat === 'Social & Fundraising' ? 'Social' : cat}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Subtype pills for active category */}
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.bg,
              display: 'flex', flexWrap: 'wrap', gap: 6,
            }}>
              {(EVT_CATEGORIES[activeCat] || []).map(t => {
                const clr     = evtCLR[t] || C.accent;
                const selected = form.type === t;
                return (
                  <button key={t} onClick={() => upd('type', t)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                      border: `1.5px solid ${selected ? clr : C.border}`,
                      background: selected ? clr + '20' : 'transparent',
                      color: selected ? clr : C.muted,
                      fontSize: 12, fontWeight: selected ? 700 : 400,
                      transition: 'all 0.12s', whiteSpace: 'nowrap',
                    }}>
                    {t}
                  </button>
                );
              })}
            </div>

            {/* If selected type is in a different category, show a note */}
            {EVT_PARENT[form.type] && EVT_PARENT[form.type] !== activeCat && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                Selected: <span style={{ color: evtCLR[form.type] || C.accent, fontWeight: 600 }}>{form.type}</span>
              </div>
            )}
          </div>

          {/* Core details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Event Name</label>
              <input style={s.input} value={form.name} placeholder={
                form.type === 'Wedding' ? "e.g. Sarah & Todd's Wedding" :
                form.type === 'Birthday' || form.type === 'Sweet 16' ? "e.g. Maria's 40th" :
                isCorporateType(form.type) ? `e.g. ${form.type} — Company Name` :
                form.type === 'Quinceañera' ? "e.g. Isabella's Quinceañera" :
                'Event name'
              } autoFocus onChange={e => upd('name', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Date</label>
                <input style={s.input} type="date" value={form.date} onChange={e => upd('date', e.target.value)} onClick={e => { try { e.target.showPicker(); } catch {} }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Venue</label>
                <input style={s.input} value={form.venue} placeholder="Venue name" onChange={e => upd('venue', e.target.value.replace(/(^\w|\s\w)/g, c => c.toUpperCase()))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Est. Guest Count</label>
                <input style={s.input} type="number" min="0" value={form.guestCount} placeholder="e.g. 120" onChange={e => upd('guestCount', e.target.value)} />
                {guestCt > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>→ {tableCount} tables @ {TABLE_SIZE[form.type] || 8}/table</div>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Total Budget</label>
                <input style={s.input} type="number" min="0" value={form.totalBudget} placeholder="e.g. 25000" onChange={e => upd('totalBudget', e.target.value)} />
                {budgetAmt > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>→ distributed across {budgetTmpl.length} categories</div>}
              </div>
            </div>

            {/* Budget estimator — shows when guest count is set */}
            {guestCt > 0 && (() => {
              const ph         = PER_HEAD[form.type] || PER_HEAD.Other;
              const mFactor    = getMetroFactor(profile);
              const mkt        = profile?.metroMarket ? METRO_MARKETS.find(m => m.id === profile.metroMarket) : null;
              const mktTier    = mkt ? METRO_TIER_LABEL[mkt.tier] : null;
              const tierMeta   = TIER_META[form.type] || TIER_META.Other;
              const tiers = [
                { key: 'good',   label: tierMeta.good.label,   color: C.success },
                { key: 'better', label: tierMeta.better.label, color: C.accent2 },
                { key: 'best',   label: tierMeta.best.label,   color: C.accent },
              ];
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Budget Estimator — {guestCt} guests</div>
                    {mkt && <span style={{ fontSize: 10, fontWeight: 700, color: mktTier?.color || C.muted, background: (mktTier?.color || C.muted) + '15', border: `1px solid ${(mktTier?.color || C.muted) + '40'}`, borderRadius: 10, padding: '1px 7px' }}>{mktTier?.icon} {mkt.label}{mFactor !== 1.0 ? ` · ${mFactor > 1 ? '+' : ''}${Math.round((mFactor - 1) * 100)}%` : ''}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {tiers.map(({ key, label, color }) => {
                      const total = Math.round(ph[key] * mFactor * guestCt / 100) * 100;
                      const active = Number(form.totalBudget) === total;
                      return (
                        <button key={key} onClick={() => upd('totalBudget', String(total))}
                          style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${active ? color : C.border}`, background: active ? color + '1a' : 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? color : C.muted }}>{label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: active ? color : C.text, marginTop: 2 }}>{fmtD(total)}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{fmtD(Math.round(ph[key] * mFactor))}/head</div>
                        </button>
                      );
                    })}
                  </div>
                  {TIER_WHY[form.type] && form.totalBudget && PER_HEAD[form.type] && (() => {
                    const selectedKey = ['good','better','best'].find(k => Number(form.totalBudget) === Math.round(ph[k] * mFactor * guestCt / 100) * 100);
                    if (!selectedKey) return null;
                    return (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>What this typically includes:</div>
                        {TIER_WHY[form.type][selectedKey].slice(0, 3).map((item, i) => (
                          <div key={i} style={{ fontSize: 11, color: C.text, display: 'flex', gap: 6, marginBottom: 2 }}>
                            <span style={{ color: C.accent2 }}>·</span>{item}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>

          {/* Starter Kit */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 8 }}>Starter Kit</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

            {/* ── Timeline ── */}
            {tmpl && (() => {
              const enabledCt = timelineChecked.filter(Boolean).length;
              return (
                <div style={{ border: `1px solid ${useTimeline ? typeColor : C.border}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: C.bg, cursor: 'pointer' }}
                    onClick={() => useTimeline && toggleKit('timeline')}>
                    <input type="checkbox" checked={useTimeline} onChange={e => { setUseTimeline(e.target.checked); if (!e.target.checked) setKitExpanded(p => ({ ...p, timeline: false })); }}
                      style={{ accentColor: typeColor, cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }}
                      onClick={e => e.stopPropagation()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{form.type} Timeline</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{enabledCt} of {tmpl.length} tasks · auto-dated from event date</div>
                    </div>
                    {useTimeline && (
                      <span style={{ fontSize: 10, color: C.muted, transform: kitExpanded.timeline ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                    )}
                  </div>
                  {/* Expanded items */}
                  {useTimeline && kitExpanded.timeline && (
                    <div style={{ borderTop: `1px solid ${C.border}`, maxHeight: 220, overflowY: 'auto' }}>
                      {tmpl.map((task, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 12px', borderBottom: i < tmpl.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', background: timelineChecked[i] ? 'transparent' : C.bg + '88' }}>
                          <input type="checkbox" checked={!!timelineChecked[i]} style={{ accentColor: typeColor, cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                            onChange={e => setTimelineChecked(arr => arr.map((v, j) => j === i ? e.target.checked : v))} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: timelineChecked[i] ? C.text : C.muted, lineHeight: 1.3 }}>{task.task}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{task.week}{task.owner ? ` · ${task.owner}` : ''}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Budget ── */}
            {(() => {
              const enabledCt = budgetChecked.filter(Boolean).length;
              const totalAllocated = budgetTmpl.reduce((sum, item, i) => {
                if (!budgetChecked[i]) return sum;
                const amt = budgetAmounts[item.c] !== undefined ? Number(budgetAmounts[item.c]) : Math.round(budgetAmt * item.pct);
                return sum + amt;
              }, 0);
              return (
                <div style={{ border: `1px solid ${useBudget ? C.success : C.border}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: C.bg, cursor: 'pointer' }}
                    onClick={() => useBudget && toggleKit('budget')}>
                    <input type="checkbox" checked={useBudget} onChange={e => { setUseBudget(e.target.checked); if (!e.target.checked) setKitExpanded(p => ({ ...p, budget: false })); }}
                      style={{ accentColor: C.success, cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }}
                      onClick={e => e.stopPropagation()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Budget Categories</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {enabledCt} of {budgetTmpl.length} categories
                        {budgetAmt > 0 && totalAllocated > 0 ? ` · ${fmtD(totalAllocated)} allocated` : ' · enter a budget total to see amounts'}
                      </div>
                    </div>
                    {useBudget && (
                      <span style={{ fontSize: 10, color: C.muted, transform: kitExpanded.budget ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                    )}
                  </div>
                  {useBudget && kitExpanded.budget && (
                    <div style={{ borderTop: `1px solid ${C.border}`, maxHeight: 240, overflowY: 'auto' }}>
                      {budgetTmpl.map((item, i) => {
                        const defaultAmt = Math.round(budgetAmt * item.pct);
                        const amt = budgetAmounts[item.c] !== undefined ? budgetAmounts[item.c] : (budgetAmt > 0 ? defaultAmt : '');
                        return (
                          <div key={item.c} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: i < budgetTmpl.length - 1 ? `1px solid ${C.border}` : 'none', background: budgetChecked[i] ? 'transparent' : C.bg + '88' }}>
                            <input type="checkbox" checked={!!budgetChecked[i]} style={{ accentColor: C.success, cursor: 'pointer', flexShrink: 0 }}
                              onChange={e => setBudgetChecked(arr => arr.map((v, j) => j === i ? e.target.checked : v))} />
                            <span style={{ fontSize: 12, flex: 1, color: budgetChecked[i] ? C.text : C.muted }}>{item.c}</span>
                            <span style={{ fontSize: 10, color: C.muted, width: 32, textAlign: 'right' }}>{Math.round(item.pct * 100)}%</span>
                            <input
                              type="number" min="0"
                              value={amt}
                              placeholder={budgetAmt > 0 ? String(defaultAmt) : '—'}
                              disabled={!budgetChecked[i]}
                              onChange={e => setBudgetAmounts(m => ({ ...m, [item.c]: e.target.value }))}
                              style={{ ...s.input, width: 80, fontSize: 12, padding: '3px 6px', textAlign: 'right', opacity: budgetChecked[i] ? 1 : 0.4 }}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Vendor Slots ── */}
            {(() => {
              const enabledCt = vendorChecked.filter(Boolean).length;
              return (
                <div style={{ border: `1px solid ${useVendors ? C.accent2 : C.border}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: C.bg, cursor: 'pointer' }}
                    onClick={() => useVendors && toggleKit('vendors')}>
                    <input type="checkbox" checked={useVendors} onChange={e => { setUseVendors(e.target.checked); if (!e.target.checked) setKitExpanded(p => ({ ...p, vendors: false })); }}
                      style={{ accentColor: C.accent2, cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }}
                      onClick={e => e.stopPropagation()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Vendor Slots</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{enabledCt} empty vendor records to fill in later</div>
                    </div>
                    {useVendors && (
                      <span style={{ fontSize: 10, color: C.muted, transform: kitExpanded.vendors ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                    )}
                  </div>
                  {useVendors && kitExpanded.vendors && (
                    <div style={{ borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px' }}>
                      {vendorCats.map((cat, i) => (
                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 16, border: `1px solid ${vendorChecked[i] ? C.accent2 : C.border}`, background: vendorChecked[i] ? C.accent2 + '15' : 'transparent', cursor: 'pointer', fontSize: 11, color: vendorChecked[i] ? C.accent2 : C.muted, transition: 'all 0.12s' }}>
                          <input type="checkbox" checked={!!vendorChecked[i]} style={{ accentColor: C.accent2, cursor: 'pointer' }}
                            onChange={e => setVendorChecked(arr => arr.map((v, j) => j === i ? e.target.checked : v))} />
                          {cat}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Client link */}
          {clients.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>
                Link to Client <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <select style={s.input} value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                <option value="">No client — standalone event</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={s.btn()} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btn('primary'), opacity: form.name.trim() ? 1 : 0.5 }} onClick={submit}>Create Event</button>
        </div>
      </div>
    </>
  );
}

// ─── Client Consult Script ────────────────────────────────────────────────────

// Parse a budget-range string like "$15k–$30k" → midpoint in dollars
function parseBudgetMidpoint(str) {
  if (!str) return null;
  const range = str.match(/\$(\d+)k[–-]\$(\d+)k/i);
  if (range) return ((parseInt(range[1]) + parseInt(range[2])) / 2) * 1000;
  const under = str.match(/Under \$(\d+)k/i);
  if (under) return parseInt(under[1]) * 900; // ~90% of ceiling
  const plus  = str.match(/\$(\d+)k\+/i);
  if (plus)  return parseInt(plus[1]) * 1250;
  return null;
}

// Vendor category implied by a music/entertainment intake answer
function vendorCatForMusic(answer) {
  if (!answer) return null;
  if (answer.includes('band') || answer.includes('Band')) return 'Entertainment';
  if (answer.includes('DJ') || answer.includes('dj')) return 'DJ';
  if (answer.includes('Acoustic')) return 'Entertainment';
  return null;
}

function ConsultScriptModal({ event, setEvent, onClose }) {
  const C      = useT();
  const s      = makeS(C);
  const evtCLR = EVT_CLR(C);
  const aiKey  = useAIKey();
  const [sectionIdx,  setSectionIdx]  = useState(0);
  const [answers,     setAnswers]     = useState(() => event.intake?.draft || event.intake?.answers || {});
  const [showSummary, setShowSummary] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  // which smart-apply suggestions the planner wants to apply
  const [applyFlags,  setApplyFlags]  = useState({});
  const [checklistDone, setChecklistDone] = useState(false);
  const [checklistCount, setChecklistCount] = useState(0);
  const [proposalDraft, setProposalDraft] = useState('');
  const [proposalLoad,  setProposalLoad]  = useState(false);
  const [showProposal,  setShowProposal]  = useState(false);

  const questions     = CONSULT_QUESTIONS[event.type] || CONSULT_QUESTIONS.Birthday;
  const section       = questions[sectionIdx];
  const totalSections = questions.length;
  const isLast        = sectionIdx === totalSections - 1;
  const typeColor     = evtCLR[event.type] || C.accent;

  const setAnswer = (id, val) => {
    setAnswers(a => ({ ...a, [id]: val }));
    if (setEvent) setEvent(e => ({ ...e, intake: { ...e.intake, draft: { ...(e.intake?.draft || {}), [id]: val } } }));
  };
  const toggleFlag = (id) => setApplyFlags(f => ({ ...f, [id]: f[id] !== false ? false : true }));

  const genProposal = async () => {
    if (!aiKey) return;
    setProposalLoad(true); setProposalDraft(''); setShowProposal(true);
    const answerLines = Object.entries(answers).map(([k,v])=>`${k}: ${v}`).join('\n');
    const prompt = `Write a short, professional event planning proposal (3-4 paragraphs) based on these intake answers. Address the client by the event name. Cover: what you'll do, how it addresses their specific needs, why it'll be great. End with clear next steps. Use a warm, confident tone.\n\nEvent type: ${event.type}\nEvent name: ${event.name}\nDate: ${event.date||'TBD'}\nVenue: ${event.venue||'TBD'}\nBudget: ${event.budget||'TBD'}\nPlanner: ${event.profile?.name||'Your Planner'}, ${event.profile?.businessName||''}\n\nIntake answers:\n${answerLines}\n\nProposal:`;
    try { await askClaude(aiKey, prompt, { maxTokens: 500, onChunk: t => setProposalDraft(t) }); }
    catch(e) { setProposalDraft('⚠ Check your API key in Profile.'); }
    setProposalLoad(false);
  };

  // ── Smart suggestions derived from answers ───────────────────────────────
  const suggestions = (() => {
    const list = [];

    // Guest count
    const rawCount = answers['count'];
    const guestN   = rawCount ? parseInt(rawCount, 10) : NaN;
    const confirmedCount = event.guests.filter(g => g.rsvp === 'Yes').length;
    if (!isNaN(guestN) && guestN > 0) {
      const current = event.guestEstimate || confirmedCount;
      if (guestN !== current) {
        list.push({
          id: 'guestEstimate',
          label: `Set guest estimate to ${guestN}`,
          sub: current ? `Currently: ${current} (${confirmedCount} confirmed RSVP)` : `${confirmedCount} confirmed RSVP so far`,
          apply: (e) => ({ ...e, guestEstimate: guestN }),
        });
      }
    }

    // Budget range → scale budget lines
    const budgetAns = answers['range'];
    const midpoint  = parseBudgetMidpoint(budgetAns);
    if (midpoint) {
      const currentTotal = event.budget.reduce((s, r) => s + r.budgeted, 0);
      if (currentTotal === 0 || Math.abs(currentTotal - midpoint) / midpoint > 0.25) {
        list.push({
          id: 'budgetScale',
          label: `Scale budget to ${fmtD(midpoint)} (midpoint of "${budgetAns}")`,
          sub: currentTotal > 0 ? `Currently budgeted: ${fmtD(currentTotal)}` : 'No budget set yet — distribute evenly across categories',
          apply: (e) => {
            if (e.budget.length === 0) return e;
            const oldTotal = e.budget.reduce((s, r) => s + r.budgeted, 0) || 1;
            const ratio    = midpoint / oldTotal;
            return {
              ...e,
              budget: e.budget.map(r => ({ ...r, budgeted: Math.round(r.budgeted * ratio) })),
            };
          },
        });
      }
    }

    // Catering style → update catering vendor notes
    const cateringAns = answers['catering'];
    if (cateringAns) {
      const catVendor = event.vendors.find(v => v.category === 'Catering');
      if (catVendor && !catVendor.notes?.includes(cateringAns)) {
        list.push({
          id: 'cateringNote',
          label: `Note catering style: "${cateringAns}"`,
          sub: `Adds to ${catVendor.name || 'Catering vendor'} notes`,
          apply: (e) => ({
            ...e,
            vendors: e.vendors.map(v =>
              v.id === catVendor.id ? { ...v, notes: [v.notes, cateringAns].filter(Boolean).join(' · ') } : v
            ),
          }),
        });
      }
    }

    // Music → add vendor slot if missing
    const musicAns = answers['music'];
    const museCat  = vendorCatForMusic(musicAns);
    if (museCat && musicAns && musicAns !== 'Playlist / DIY') {
      const hasSlot = event.vendors.some(v => v.category === museCat || v.category === 'Entertainment');
      if (!hasSlot) {
        list.push({
          id: 'musicVendor',
          label: `Add ${museCat} vendor slot`,
          sub: `Client prefers "${musicAns}" — no ${museCat} vendor added yet`,
          apply: (e) => ({
            ...e,
            vendors: [...e.vendors, { id: uid(), name: '', category: museCat, status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '', contact: '', phone: '', email: '', notes: musicAns }],
          }),
        });
      }
    }

    // Photography priority
    const photoAns = answers['photo'];
    if (photoAns === 'Top priority — no compromise') {
      const hasPhoto = event.vendors.some(v => v.category === 'Photography');
      if (!hasPhoto) {
        list.push({
          id: 'photoVendor',
          label: 'Add Photography vendor slot',
          sub: 'Client flagged photography as top priority — no photographer added yet',
          apply: (e) => ({
            ...e,
            vendors: [...e.vendors, { id: uid(), name: '', category: 'Photography', status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '', contact: '', phone: '', email: '', notes: 'Top priority per intake' }],
          }),
        });
      }
    }

    // Entertainment activity for corporate / birthday
    const entertainAns = answers['entertain'];
    if (entertainAns && entertainAns !== 'None needed' && entertainAns !== 'Free socializing') {
      const hasEnt = event.vendors.some(v => v.category === 'Entertainment');
      if (!hasEnt) {
        list.push({
          id: 'entertainVendor',
          label: 'Add Entertainment vendor slot',
          sub: `Client wants "${entertainAns}"`,
          apply: (e) => ({
            ...e,
            vendors: [...e.vendors, { id: uid(), name: '', category: 'Entertainment', status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '', contact: '', phone: '', email: '', notes: entertainAns }],
          }),
        });
      }
    }

    return list;
  })();

  // ── Checklist generator ───────────────────────────────────────────────────
  const generateChecklist = () => {
    const tasks = [];
    const mk = (week, task, notes = '') => tasks.push({ id: uid(), week, task, done: false, owner: '', notes });

    const isWedding    = event.type === 'Wedding';
    const isCorporate  = isCorporateType(event.type);
    const isBoard      = event.type === 'Board Meeting';
    const guestN       = parseInt(answers['count'] || '0', 10);
    const cateringAns  = answers['catering'] || answers['style'] || '';
    const musicAns     = answers['music']    || '';
    const photoAns     = answers['photo']    || '';
    const budgetAns    = answers['range']    || '';
    const entertAns    = answers['entertain'] || '';
    const venueAns     = answers['venue']    || '';
    const avAns        = answers['av']       || '';
    const mealAns      = answers['meals']    || '';
    const materialAns  = answers['materials'] || '';
    const agendaAns    = answers['agenda']   || '';

    if (isBoard) {
      // ── Board Meeting checklist ─────────────────────────────────────────────
      mk('3 Months Out', 'Confirm meeting date with board chair and executive team');
      if (venueAns) mk('3 Months Out', `Reserve meeting space — preference: ${venueAns}`);
      else mk('3 Months Out', 'Reserve boardroom or executive conference space');
      if (avAns && avAns !== 'Basic — screen + laptop') mk('3 Months Out', `Book AV / tech support — needs: ${avAns}`);
      if (guestN > 0) mk('3 Months Out', `Identify all ${guestN} board members — confirm attendance method (in-person vs. remote)`);

      mk('2 Months Out', 'Collect agenda items from board chair and committee leads');
      if (agendaAns && agendaAns !== 'Already finalized') mk('2 Months Out', 'Build agenda draft — circulate to chair for review');
      if (mealAns && mealAns !== 'Coffee / beverages only') mk('2 Months Out', `Book catering — ${mealAns}`);
      if (materialAns && materialAns !== 'No packet — items presented live') mk('2 Months Out', `Plan board packet format: ${materialAns}`);
      mk('2 Months Out', 'Confirm quorum requirements — identify proxy or remote voting needs');

      mk('1 Month Out', 'Send formal meeting notice with agenda draft to all members');
      mk('1 Month Out', 'Collect board materials — reports, financials, resolutions');
      mk('1 Month Out', 'Confirm minutes-taker / secretary — clarify recording policy');

      mk('2 Weeks Out', 'Distribute pre-read board packet to all members');
      mk('2 Weeks Out', 'Collect dietary restrictions for catering');
      mk('2 Weeks Out', 'Confirm remote attendees have Zoom / video conferencing link');

      mk('1 Week Out', 'Finalize agenda — confirm with chair that all items are set');
      mk('1 Week Out', 'Send final agenda + login links to all attendees');
      mk('1 Week Out', 'Confirm quorum — follow up with any non-responding members');

      mk('Week Of', 'Test all AV — video conferencing, presentation display, microphone');
      mk('Week Of', 'Prepare name placards, voting materials, and printed agendas');
      mk('Week Of', 'Confirm catering delivery window and setup requirements');
      mk('Day Before', 'Set up room — confirm seating arrangement and technology');
      mk('Day Before', 'Send reminder to all attendees with parking / access instructions');
    } else {
      // ── General / Wedding / Corporate / Social event checklist ──────────────

      // 12 Months Out — Budget & Venue
      mk('12 Months Out', 'Finalize event date and lock it in with family / key attendees');
      if (budgetAns) mk('12 Months Out', `Set total budget (client indicated: ${budgetAns})`, 'Distribute across categories');
      if (venueAns && venueAns !== "Haven't started looking") mk('12 Months Out', `Research and visit venue options — client preference: ${venueAns}`);
      else mk('12 Months Out', 'Begin venue search and schedule site visits');

      // 10 Months Out — Key Vendors
      mk('10 Months Out', 'Book photographer / videographer');
      if (photoAns === 'Top priority — no compromise') mk('10 Months Out', 'Photographer is TOP PRIORITY — book immediately, they fill fast', 'Client flag: no compromise');
      mk('10 Months Out', 'Book caterer and discuss menu concept');
      if (cateringAns) mk('10 Months Out', `Confirm catering style with caterer: ${cateringAns}`);
      if (isWedding) mk('10 Months Out', 'Book officiant / ceremony site');

      // 8 Months Out — Save the Dates
      if (isWedding || isCorporate) mk('8 Months Out', 'Send save-the-dates');
      if (musicAns && musicAns !== 'Playlist / DIY') mk('8 Months Out', `Book ${musicAns.includes('Band') ? 'band' : 'DJ'} — client preference: ${musicAns}`);
      mk('8 Months Out', 'Book florist / decorator');
      mk('8 Months Out', 'Create initial guest list');

      // 6 Months Out — Invitations
      mk('6 Months Out', 'Send formal invitations');
      mk('6 Months Out', 'Confirm transportation / valet if needed');
      if (isWedding) mk('6 Months Out', 'Schedule cake tasting and book baker');
      if (isCorporate) mk('6 Months Out', 'Finalize speaker / presenter lineup');

      // 5 Months Out — Attire
      if (isWedding) {
        mk('5 Months Out', 'Purchase wedding dress / suits — allow time for alterations');
        mk('5 Months Out', 'Choose and outfit wedding party');
      } else {
        mk('5 Months Out', 'Confirm dress code and communicate to guests');
      }

      // 4 Months Out — RSVPs
      mk('4 Months Out', 'Chase RSVPs — track who has and hasn\'t responded');
      mk('4 Months Out', 'Set up seating chart draft');
      if (entertAns && entertAns !== 'None needed' && entertAns !== 'Free socializing') mk('4 Months Out', `Book entertainment: ${entertAns}`);

      // 3 Months Out — Headcount
      if (guestN > 0) mk('3 Months Out', `Confirm headcount with caterer — target: ${guestN} guests`);
      else mk('3 Months Out', 'Confirm headcount with caterer');
      mk('3 Months Out', 'Submit final food and dietary restriction list to caterer');
      mk('3 Months Out', 'Finalize seating chart');

      // 2 Months Out — Final Details
      mk('2 Months Out', 'Confirm all vendor contracts and payment schedules');
      mk('2 Months Out', 'Order event favors / gifts if applicable');
      mk('2 Months Out', 'Plan ceremony / program run of show');
      mk('2 Months Out', 'Create detailed day-of timeline (ROS)');

      // 1 Month Out — Confirmations
      mk('1 Month Out', 'Call every vendor to reconfirm details and arrival times');
      mk('1 Month Out', 'Final venue walkthrough');
      mk('1 Month Out', 'Distribute final headcount to all vendors');
      if (isWedding) mk('1 Month Out', 'Final dress fitting / alterations pickup');

      // 2 Weeks Out
      mk('2 Weeks Out', 'Prepare final payments and tips in envelopes');
      mk('2 Weeks Out', 'Delegate day-of tasks to trusted team members');
      mk('2 Weeks Out', 'Share final ROS with all vendors');
      mk('2 Weeks Out', 'Confirm accommodation / transportation for out-of-town guests');

      // Week Of
      mk('Week Of', 'Confirm venue setup and delivery windows');
      mk('Week Of', 'Charge all tech equipment (mics, batteries, etc.)');
      mk('Week Of', 'Prepare day-of emergency kit (sewing kit, pain reliever, stain pen, etc.)');
      mk('Week Of', 'Final briefing call with lead vendor / coordinator');
      mk('Week Of', 'Relax and trust the plan');
    }

    // Filter out tasks already on the timeline to avoid duplication
    const existing = new Set((event.timeline || []).map(t => t.task.trim().toLowerCase()));
    const newTasks = tasks.filter(t => !existing.has(t.task.trim().toLowerCase()));

    if (setEvent) {
      setEvent(e => ({ ...e, timeline: [...(e.timeline || []), ...newTasks] }));
    }
    setChecklistCount(newTasks.length);
    setChecklistDone(true);
    setTimeout(() => setChecklistDone(false), 6000);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const getSummaryText = () =>
    `CLIENT INTAKE — ${event.name || 'New Event'}\nType: ${event.type}\n` +
    (event.intake?.savedAt ? `Saved: ${event.intake.savedAt}\n` : '') + '\n' +
    questions.map(sec =>
      `━━ ${sec.title} ━━\n` +
      sec.items.map(i => `${i.q}\n→ ${answers[i.id] || '—'}`).join('\n\n')
    ).join('\n\n');

  const copyNotes = () => {
    navigator.clipboard.writeText(getSummaryText()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const saveToEvent = () => {
    let updater = (e) => {
      const intakeNotes = [
        answers['names']    ? `Names: ${answers['names']}`         : '',
        answers['vibe']     ? `Vibe: ${answers['vibe']}`           : '',
        answers['formal']   ? `Formality: ${answers['formal']}`    : '',
        answers['priority'] ? `Priority: ${answers['priority']}`   : '',
        answers['venue']    ? `Venue status: ${answers['venue']}`  : '',
        answers['flex']     ? `Budget: ${answers['flex']}`         : '',
        answers['booked']   ? `Already booked: ${answers['booked']}` : '',
        answers['concerns'] ? `Concern: ${answers['concerns']}`    : '',
        answers['purpose']  ? `Purpose: ${answers['purpose']}`     : '',
        answers['kpis']     ? `KPIs: ${answers['kpis']}`           : '',
        answers['who']      ? `Guest of honor: ${answers['who']}`  : '',
      ].filter(Boolean).join('\n');
      return { ...e, intake: { answers, savedAt: today8601(), notes: intakeNotes } };
    };
    suggestions.forEach(sg => {
      if (applyFlags[sg.id]) {
        const prev = updater;
        updater = (e) => sg.apply(prev(e));
      }
    });
    setEvent(updater);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const confirmedCount = event.guests.filter(g => g.rsvp === 'Yes').length;
  const hasSaved       = !!event.intake?.savedAt;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, zIndex: 70, width: 560, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.muted, marginBottom: 4 }}>
                Client Intake
                {hasSaved && <span style={{ marginLeft: 8, color: C.success, fontWeight: 400 }}>· Saved {event.intake.savedAt}</span>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{event.name || event.type + ' Event'}</div>
            </div>
            <button style={{ ...s.btn('ghost'), padding: '4px 8px', color: C.muted, fontSize: 16 }} onClick={onClose}>✕</button>
          </div>
          {!showSummary && (
            <>
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {questions.map((q, i) => (
                  <div key={q.id} title={q.title} onClick={() => setSectionIdx(i)}
                    style={{ flex: 1, height: 4, borderRadius: 2, cursor: 'pointer', transition: 'background 0.2s',
                      background: i < sectionIdx ? typeColor : i === sectionIdx ? typeColor + 'aa' : C.border }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                {section.title} · {sectionIdx + 1} of {totalSections}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {showSummary && (
            <div>
              {/* Smart Apply panel */}
              {suggestions.length > 0 && (
                <div style={{ ...s.card, borderColor: C.accent + '44', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.accent, marginBottom: 12 }}>
                    Smart Apply — {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                    Check what to apply when you save. Unchecked items are saved as notes only.
                  </div>
                  {suggestions.map(sg => {
                    const on = applyFlags[sg.id] !== false;
                    return (
                      <div key={sg.id} onClick={() => toggleFlag(sg.id)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                          border: `1px solid ${on ? C.accent + '66' : C.border}`, background: on ? C.accent + '0e' : 'transparent', transition: 'all 0.12s' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${on ? C.accent : C.border}`, background: on ? C.accent : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                          {on && <span style={{ fontSize: 10, color: '#fff', lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{sg.label}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sg.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Answer review */}
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 14 }}>
                All Answers
              </div>
              {questions.map(sec => (
                <div key={sec.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: typeColor, marginBottom: 8 }}>{sec.title}</div>
                  {sec.items.map(item => (
                    <div key={item.id} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid ${answers[item.id] ? typeColor + '44' : C.border}` }}>
                      <div style={{ fontSize: 11, color: C.muted }}>{item.q}</div>
                      <div style={{ fontSize: 13, color: answers[item.id] ? C.text : C.muted, marginTop: 2, fontStyle: answers[item.id] ? 'normal' : 'italic' }}>
                        {answers[item.id] || 'Not answered'}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {showSummary && showProposal && (
            <div style={{ padding: '0 0 20px' }}>
              <div style={{ border:`1px solid ${C.accent}44`, borderRadius:10, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', background:C.accent+'12', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.accent }}>✨ Draft Proposal</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {proposalDraft && <button onClick={()=>navigator.clipboard?.writeText(proposalDraft)} style={{ ...makeS(C).btn(), fontSize:10, padding:'3px 8px' }}>Copy</button>}
                    <button onClick={()=>setShowProposal(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:C.muted }}>✕</button>
                  </div>
                </div>
                <div style={{ padding:'14px 16px', fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                  {proposalDraft || (proposalLoad ? <span style={{ color:C.muted, fontStyle:'italic' }}>Drafting…</span> : '')}
                </div>
              </div>
            </div>
          )}
          {!showSummary && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{section.title}</div>
              {section.items.map(item => (
                <div key={item.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: C.text }}>{item.q}</div>
                  {item.type === 'radio' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {item.opts.map(opt => {
                        const active = answers[item.id] === opt;
                        return (
                          <label key={opt} onClick={() => setAnswer(item.id, opt)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, border: `1px solid ${active ? typeColor : C.border}`, background: active ? typeColor + '14' : 'transparent', transition: 'all 0.12s' }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? typeColor : C.border}`, background: active ? typeColor : 'transparent', flexShrink: 0, transition: 'all 0.12s' }} />
                            <span style={{ fontSize: 13, color: active ? C.text : C.muted }}>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : item.type === 'number' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number"
                          min="0"
                          style={{ ...s.input, width: 120, fontSize: 20, fontWeight: 700, textAlign: 'center', padding: '10px 12px' }}
                          value={answers[item.id] || ''}
                          placeholder="0"
                          onChange={e => setAnswer(item.id, e.target.value)}
                        />
                        {confirmedCount > 0 && (
                          <div style={{ fontSize: 12, color: C.muted }}>
                            <span style={{ color: C.success, fontWeight: 600 }}>{confirmedCount}</span> confirmed RSVP so far
                          </div>
                        )}
                      </div>
                      {item.hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{item.hint}</div>}
                    </div>
                  ) : (
                    <input
                      style={{ ...s.input, fontSize: 13 }}
                      value={answers[item.id] || ''}
                      placeholder="Your answer…"
                      onChange={e => setAnswer(item.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {showSummary ? (
            <>
              <button style={s.btn()} onClick={() => setShowSummary(false)}>← Edit</button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {checklistDone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...s.btn('success'), pointerEvents: 'none' }}>✓ {checklistCount} task{checklistCount !== 1 ? 's' : ''} added</span>
                    <button style={{ ...s.btn('ghost'), fontSize: 11 }} onClick={onClose}>View in Planning Tasks →</button>
                  </div>
                ) : (
                  <button style={s.btn('teal')} onClick={generateChecklist} title="Generate phase-based planning tasks from intake answers">
                    📋 Generate Checklist
                  </button>
                )}
                <AIBtn onClick={genProposal} loading={proposalLoad} label="Draft Proposal" />
                <button style={s.btn(copied ? 'success' : '')} onClick={copyNotes}>
                  {copied ? '✓ Copied!' : 'Copy Notes'}
                </button>
                <button style={s.btn(saved ? 'success' : 'primary')} onClick={saveToEvent}>
                  {saved ? '✓ Saved!' : 'Save to Event'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button style={{ ...s.btn(), opacity: sectionIdx === 0 ? 0.3 : 1 }}
                onClick={() => setSectionIdx(i => Math.max(0, i - 1))} disabled={sectionIdx === 0}>← Back</button>
              {isLast
                ? <button style={s.btn('primary')} onClick={() => setShowSummary(true)}>Review & Save →</button>
                : <button style={s.btn('primary')} onClick={() => setSectionIdx(i => i + 1)}>Next →</button>
              }
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onClick }) {
  const C      = useT();
  const s      = makeS(C);
  const evtCLR = EVT_CLR(C);
  const [hov, setHov] = useState(false);
  const days             = daysUntil(event.date);
  const statusLabel = !event.date ? null : days === null ? null : days > 0 ? null : days > -30 ? 'Just wrapped' : 'Past';
  const isArchived  = event.archived;
  const totalBudgeted    = event.budget.reduce((s, r) => s + r.budgeted, 0);
  const totalActual      = event.budget.reduce((s, r) => s + r.actual, 0);
  const budgetPct        = totalBudgeted ? Math.round((totalActual / totalBudgeted) * 100) : 0;
  const confirmedGuests  = event.guests.filter(g => g.rsvp === 'Yes').length;
  const confirmedVendors = event.vendors.filter(v => v.status === 'Confirmed').length;
  const doneTasks        = event.timeline.filter(t => t.done).length;
  const taskPct          = event.timeline.length ? Math.round((doneTasks / event.timeline.length) * 100) : 0;
  const color            = evtCLR[event.type] || C.muted;

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...s.card, cursor: 'pointer', marginBottom: 0, borderColor: hov ? color : C.border, transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: hov ? `0 4px 20px rgba(0,0,0,${C.surface === '#ffffff' ? '0.08' : '0.18'})` : 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', flex: 1, paddingRight: 8 }}>{event.name}</h3>
        <span style={{ ...s.pill(color), flexShrink: 0 }}>{event.type}</span>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{event.venue || '—'} · {fmtDate(event.date)}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {days !== null && <span style={s.pill(days < 0 ? C.muted : days <= 30 ? C.danger : days <= 90 ? C.warn : C.accent)}>{days > 0 ? `${days} days away` : days === 0 ? 'Today!' : `${Math.abs(days)} days ago`}</span>}
        {statusLabel && <span style={s.pill(C.muted)}>{statusLabel}</span>}
        {isArchived  && <span style={s.pill(C.muted)}>Archived</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Budget Used</div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>{budgetPct}%</div><ProgressBar pct={budgetPct} /></div>
        <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Tasks Done</div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>{doneTasks}/{event.timeline.length}</div><ProgressBar pct={taskPct} color={C.accent2} /></div>
        <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Guests Confirmed</div><div style={{ fontSize: 15, fontWeight: 600 }}>{confirmedGuests}<span style={{ color: C.muted, fontWeight: 400 }}>/{event.guests.length}</span></div></div>
        <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Vendors Confirmed</div><div style={{ fontSize: 15, fontWeight: 600 }}>{confirmedVendors}<span style={{ color: C.muted, fontWeight: 400 }}>/{event.vendors.length}</span></div></div>
      </div>
    </div>
  );
}

// ─── Events Dashboard ─────────────────────────────────────────────────────────
// Kept for potential future standalone use (events-only view).
// eslint-disable-next-line no-unused-vars
function EventsDashboard({ events, onSelect, onNew }) {
  const C = useT();
  const s = makeS(C);
  return (
    <div style={s.app}>
      <div style={{ padding: '36px 36px 28px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>Your Events</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Budget · Guests · Vendors · Day-of — all connected, zero friction.</p>
          </div>
          <button style={{ ...s.btn('primary'), fontSize: 13, padding: '10px 20px' }} onClick={onNew}>+ New Event</button>
        </div>
      </div>
      <div style={{ padding: '28px 36px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No events yet</div>
            <button style={s.btn('primary')} onClick={onNew}>+ New Event</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {events.map(ev => <EventCard key={ev.id} event={ev} onClick={() => onSelect(ev.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client Modal ─────────────────────────────────────────────────────────────

function ClientModal({ client, onClose, onChange, onDelete }) {
  const C         = useT();
  const s         = makeS(C);
  const clientCLR = CLIENT_CLR(C);
  const bp        = useContext(BpCtx);
  const [newLog,         setNewLog]        = useState('');
  const [touched,        setTouch]         = useState({});
  const [showCommsCheck, setShowCommsCheck] = useState(true);
  const [showLog,        setShowLog]        = useState(false);
  const [confirmClientDel, setConfirmClientDel] = useState(false);

  const stageIdx    = CLIENT_STAGES.indexOf(client.status);
  const collected   = (client.feeSchedule || []).reduce((acc, f) => acc + (f.paid ? f.amount : (f.paidAmount || 0)), 0);
  const outstanding = (client.plannerFee || 0) - collected;

  const touch  = (k) => setTouch(t => ({ ...t, [k]: true }));
  const errEmail = touched.email && !isEmail(client.email) ? 'Enter a valid email address' : null;
  const errPhone = touched.phone && !isPhone(client.phone) ? 'Enter a valid phone number (10–15 digits)' : null;

  const addLog = () => {
    if (!newLog.trim()) return;
    onChange('log', [...(client.log || []), { id: uid(), date: today8601(), text: newLog.trim() }]);
    setNewLog('');
  };
  const updateInstallment = (id, key, val) =>
    onChange('feeSchedule', (client.feeSchedule || []).map(f => f.id === id ? { ...f, [key]: val } : f));
  const addInstallment = () =>
    onChange('feeSchedule', [...(client.feeSchedule || []), { id: uid(), label: 'Payment', amount: 0, due: '', paid: false, paymentMethod: '' }]);
  const removeInstallment = (id) =>
    onChange('feeSchedule', (client.feeSchedule || []).filter(f => f.id !== id));

  const panelW = bp === 'mobile' || bp === 'tablet' ? '100vw' : 480;

  // ── Reusable section divider ──────────────────────────────────────────────────
  const Divider = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: panelW, maxWidth: '100vw', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>

        {/* ── Header: name + pipeline ───────────────────────────────────────── */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
            <input
              style={{ ...s.input, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', flex: 1, padding: '6px 10px' }}
              value={client.name} placeholder="Client Name"
              onChange={e => onChange('name', e.target.value)}
            />
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px', flexShrink: 0 }}>✕</button>
          </div>

          {/* Pipeline stepper */}
          <div style={{ display: 'flex', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 11, left: '10%', right: '10%', height: 2, background: C.border, zIndex: 0 }} />
            {CLIENT_STAGES.map((stage, i) => {
              const isPast = i < stageIdx, isCurrent = i === stageIdx;
              const clr    = clientCLR[stage];
              return (
                <div key={stage} onClick={() => onChange('status', stage)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, cursor: 'pointer' }}
                  title={`Set status: ${stage}`}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', marginBottom: 5,
                    background: isCurrent ? clr : isPast ? clr + '33' : C.bg,
                    border: `2px solid ${isCurrent ? clr : isPast ? clr + '88' : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: isCurrent ? '#fff' : isPast ? clr : C.muted, transition: 'all 0.15s' }}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 9, color: isCurrent ? clr : isPast ? clr + 'bb' : C.muted,
                    textAlign: 'center', lineHeight: 1.3, fontWeight: isCurrent ? 700 : 400, maxWidth: 60 }}>{stage}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* ── 1. Contact ── */}
          <Divider label="Contact" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Email</label>
              <input
                style={{ ...s.input, borderColor: errEmail ? C.danger : undefined }}
                type="email" value={client.email || ''} placeholder="client@email.com"
                onChange={e => onChange('email', e.target.value)}
                onBlur={() => touch('email')}
              />
              {errEmail && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{errEmail}</div>}
            </div>
            {/* Phone */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Phone</label>
              <input
                style={{ ...s.input, borderColor: errPhone ? C.danger : undefined }}
                type="tel" value={client.phone || ''} placeholder="(555) 555-0100"
                onChange={e => onChange('phone', formatPhone(e.target.value))}
                onBlur={() => touch('phone')}
              />
              {errPhone && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{errPhone}</div>}
            </div>
            {/* Referral */}
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>How They Found You</label>
              <input style={s.input} value={client.referral || ''} placeholder="Instagram, The Knot, Word of mouth…"
                onChange={e => onChange('referral', e.target.value)} />
            </div>
          </div>

          {/* ── 2. Communication Checklist (collapsible) ── */}
          {(() => {
            const checklist  = client.commsChecklist || {};
            const totalItems = CLIENT_STAGES.flatMap(st => CLIENT_COMMS[st] || []);
            const totalDone  = totalItems.filter(it => checklist[it]).length;
            const currentClr = clientCLR[CLIENT_STAGES[stageIdx]] || C.muted;
            return (
              <div style={{ marginBottom: 20, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setShowCommsCheck(v => !v)} style={{ width: '100%', background: showCommsCheck ? C.surface2 : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flex: 1 }}>Comms Checklist</span>
                  <span style={{ fontSize: 11, color: totalDone === totalItems.length && totalItems.length > 0 ? C.success : currentClr, fontWeight: 600 }}>{totalDone}/{totalItems.length}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{showCommsCheck ? '▾' : '▸'}</span>
                </button>
                {showCommsCheck && (
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {CLIENT_STAGES.map((stage, si) => {
                      const clr       = clientCLR[stage];
                      const isPast    = si < stageIdx;
                      const isCurrent = si === stageIdx;
                      const isFuture  = si > stageIdx;
                      const allItems  = CLIENT_COMMS[stage] || [];
                      if (allItems.length === 0) return null;
                      const doneCount = allItems.filter(it => checklist[it]).length;
                      const allDone   = doneCount === allItems.length;
                      return (
                        <div key={stage} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, padding: isCurrent ? '3px 8px' : '2px 0', borderRadius: isCurrent ? 6 : 0, background: isCurrent ? clr + '12' : 'transparent' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: allDone ? C.success : isCurrent ? clr : isPast ? clr + '77' : C.border, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isCurrent ? clr : C.muted, flex: 1 }}>{stage}</span>
                            <span style={{ fontSize: 10, color: allDone ? C.success : isCurrent ? clr : C.muted, fontWeight: 600 }}>{doneCount}/{allItems.length}</span>
                          </div>
                          <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {allItems.map(item => {
                              const checked = !!checklist[item];
                              return (
                                <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, padding: '2px 0' }}>
                                  <input type="checkbox" checked={checked}
                                    onChange={() => onChange('commsChecklist', { ...checklist, [item]: !checked })}
                                    style={{ accentColor: clr, marginTop: 2, flexShrink: 0, width: 13, height: 13 }}
                                  />
                                  <span style={{ color: checked ? C.muted : C.text, textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.45 }}>{item}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 3. Planner Fee ── */}
          <Divider label="Planner Fee" />
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Total Fee</label>
                <input style={{ ...s.input }} type="number" value={client.plannerFee || 0}
                  onChange={e => onChange('plannerFee', Number(e.target.value) || 0)} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Collected</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.success }}>{fmtD(collected)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Outstanding</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: outstanding > 0 ? C.warn : C.muted }}>{fmtD(outstanding)}</div>
              </div>
            </div>

            {/* Installments */}
            {(client.feeSchedule || []).map(f => (
              <div key={f.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input style={{ ...s.input, flex: 2 }} value={f.label} placeholder="Label (e.g. Deposit)"
                    onChange={e => updateInstallment(f.id, 'label', e.target.value)} />
                  <input style={{ ...s.input, flex: 1 }} type="number" value={f.amount} placeholder="0"
                    onChange={e => updateInstallment(f.id, 'amount', Number(e.target.value) || 0)} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={{ ...s.input, flex: 1, minWidth: 110 }} type="date" value={f.due || ''}
                    onChange={e => updateInstallment(f.id, 'due', e.target.value)} onClick={e => { try { e.target.showPicker(); } catch {} }} />
                  <select style={{ ...s.input, flex: 1, minWidth: 100, fontSize: 12 }} value={f.paymentMethod || ''} onChange={e => updateInstallment(f.id, 'paymentMethod', e.target.value)}>
                    <option value="">Method…</option>
                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <input type="checkbox" checked={f.paid} onChange={e => updateInstallment(f.id, 'paid', e.target.checked)}
                      style={{ accentColor: C.success, width: 14, height: 14 }} />
                    <span style={{ color: f.paid ? C.success : C.text }}>{f.paid ? 'Paid ✓' : 'Paid?'}</span>
                  </label>
                  <button style={{ ...s.btn('danger'), padding: '4px 8px', fontSize: 11 }}
                    onClick={() => removeInstallment(f.id)} title="Remove installment">✕</button>
                </div>
              </div>
            ))}
            <button style={{ ...s.btn(), fontSize: 11, marginTop: 4 }} onClick={addInstallment}>+ Add Installment</button>
          </div>

          {/* ── 3. Style & Vision ── */}
          <Divider label="Style & Vision" />
          <div style={{ marginBottom: 24 }}>
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              value={client.style || ''} placeholder="Palette, vibe, aesthetic references, must-haves…"
              onChange={e => onChange('style', e.target.value)} />
          </div>

          {/* ── 4. Internal Notes ── */}
          <Divider label="Internal Notes" />
          <div style={{ marginBottom: 24 }}>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              value={client.notes || ''} placeholder="Family dynamics, key contacts, decision makers, anything to remember…"
              onChange={e => onChange('notes', e.target.value)} />
          </div>

          {/* ── 5. Communication Log ── */}
          <div style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowLog(v => !v)} style={{ width: '100%', background: showLog ? C.surface2 : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, flex: 1 }}>Comm Log</span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                {(client.log || []).length > 0 ? `${(client.log || []).length} entr${(client.log || []).length === 1 ? 'y' : 'ies'}` : 'no entries'}
              </span>
              <span style={{ color: C.muted, fontSize: 12 }}>{showLog ? '▾' : '▸'}</span>
            </button>
            {showLog && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ marginBottom: 12 }}>
                  <CommLogInput value={newLog} onChange={setNewLog} onAdd={addLog} />
                </div>
                {(client.log || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No entries yet.</div>
                ) : [...(client.log || [])].reverse().map(entry => (
                  <div key={entry.id} style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{fmtDate(entry.date)}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{entry.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {confirmClientDel ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>Remove client and all their data?</span>
              <button style={s.btn('danger')} onClick={onDelete}>Yes, remove</button>
              <button style={s.btn()} onClick={() => setConfirmClientDel(false)}>Cancel</button>
            </div>
          ) : (
            <button style={{ ...s.btn('danger'), width: '100%', fontSize: 12 }}
              onClick={() => setConfirmClientDel(true)}>
              Remove Client
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Client Portal ────────────────────────────────────────────────────────────

function ClientPortal({ client, events, onClose, onUpdateGuests }) {
  const C = useT();
  const s = makeS(C);
  const [newGuestName, setNewGuestName] = useState('');
  const [importMsg,    setImportMsg]    = useState(null); // { evId, text, ok }
  const importRef = useRef(null);
  const [importEvId,   setImportEvId]   = useState(null); // which event the pending import targets
  const [msHover,      setMsHover]      = useState(null); // { phase, evType } — hovered milestone
  const [msMouse,      setMsMouse]      = useState({ x: 0, y: 0 });
  const clientEvents = events.filter(e => (client.eventIds || []).includes(e.id));

  const handlePortalImport = (e, evId) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) { setImportMsg({ evId, text: 'No rows found in file.', ok: false }); return; }

        const col = (row, ...keys) => {
          const found = Object.keys(row).find(k => keys.some(key => k.toLowerCase().replace(/[\s_-]/g,'') === key.toLowerCase().replace(/[\s_-]/g,'')));
          return found ? String(row[found]).trim() : '';
        };
        const normRsvp = (r) => {
          const v = r.toLowerCase();
          if (v === 'yes' || v === 'y' || v === 'confirmed' || v === 'attending') return 'Yes';
          if (v === 'no'  || v === 'n' || v === 'declined'  || v === 'not attending') return 'No';
          if (v === 'maybe' || v === 'm' || v === 'possibly') return 'Maybe';
          return r || '';
        };

        let added = 0, updated = 0;
        onUpdateGuests(evId, gs => {
          let next = [...gs];
          rows.forEach(row => {
            const name = col(row, 'name', 'fullname', 'guestname', 'guest');
            if (!name) return;
            const rsvp  = col(row, 'rsvp', 'response', 'attending', 'status');
            const email = col(row, 'email', 'emailaddress');
            const phone = col(row, 'phone', 'phonenumber', 'mobile', 'cell');
            const group = col(row, 'group', 'party', 'side');
            const meal  = col(row, 'meal', 'mealchoice', 'entree', 'food');
            const needs = col(row, 'needs', 'dietary', 'restrictions', 'allergies');
            const existing = next.find(g => g.name.toLowerCase() === name.toLowerCase());
            if (existing) {
              next = next.map(g => g.id === existing.id ? {
                ...g,
                ...(rsvp  && { rsvp: normRsvp(rsvp) }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(group && { group }),
                ...(meal  && { meal }),
                ...(needs && { needs }),
              } : g);
              updated++;
            } else {
              next.push({ id: uid(), name, group: group || 'Friends', rsvp: normRsvp(rsvp), meal: meal || '—', needs: needs || '', email: email || '', phone: phone || '', address: '', table: null, plusOne: '', plusOneMeal: '—', kids: 0, giftReceived: false, thankYouSent: false, partyNotes: '' });
              added++;
            }
          });
          return next;
        });
        setImportMsg({ evId, text: `Imported: ${added} added, ${updated} updated.`, ok: true });
        setTimeout(() => setImportMsg(null), 5000);
      } catch (err) {
        setImportMsg({ evId, text: `Import failed: ${err.message}`, ok: false });
      }
      e.target.value = '';
      setImportEvId(null);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 60 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', inset: '5%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, zIndex: 70, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 12px', background: C.accent + '22', border: `1px solid ${C.accent}44`, borderRadius: 20, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: '0.06em' }}>CLIENT VIEW</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{client.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>This is what your client sees — no budget figures, no internal notes.</div>
          </div>
          <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 20, padding: '6px 12px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── Updates from your planner — curated CLIENT channel (no raw notes, no internal) ── */}
          {(() => {
            const feed = (client.log || []).filter(e => ['update', 'decision', 'approval_request'].includes(e.type)).reverse();
            if (feed.length === 0) return null;
            const pendingApprovals = feed.filter(e => e.type === 'approval_request' && (!e.approvalStatus || e.approvalStatus === 'pending')).length;
            return (
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={s.cardTitle}>Updates from your planner</div>
                  {pendingApprovals > 0 && <span style={{ ...s.pill(C.warn), fontSize: 11 }}>{pendingApprovals} awaiting your approval</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {feed.map(e => {
                    const isApproval = e.type === 'approval_request';
                    const isDecision = e.type === 'decision';
                    const clr   = isApproval ? C.warn : isDecision ? C.accent2 : C.accent;
                    const label = isApproval ? '✋ Approval Needed' : isDecision ? '📌 Decision' : '📋 Update';
                    const status = isApproval
                      ? (e.approvalStatus === 'approved' ? { t: '✓ You approved', c: C.success }
                        : e.approvalStatus === 'declined' ? { t: '✗ You declined',  c: C.danger }
                        : { t: '⏳ Awaiting your approval', c: C.warn })
                      : null;
                    return (
                      <div key={e.id} style={{ borderLeft: `3px solid ${clr}`, padding: '8px 12px', background: clr + '0d', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: clr, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                          <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(e.date)}</span>
                          {status && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: status.c }}>{status.t}</span>}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, color: C.text }}>{e.text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {clientEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>No events linked yet.</div>
          ) : clientEvents.map(ev => {
            const days = daysUntil(ev.date);
            const confirmedVendors = (ev.vendors || []).filter(v => v.status === 'Confirmed');
            const confirmedGuests  = (ev.guests  || []).filter(g => g.rsvp === 'Yes');
            const collected    = (client.feeSchedule || []).reduce((s, f) => s + (f.paid ? f.amount : (f.paidAmount || 0)), 0);
            const outstanding  = (client.plannerFee || 0) - collected;

            return (
              <div key={ev.id}>
                {/* Event summary */}
                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{ev.name}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>
                        {ev.venue && <span>{ev.venue} · </span>}
                        {fmtDate(ev.date)}
                      </div>
                    </div>
                    {days !== null && ev.date && (
                      <span style={s.pill(days <= 30 ? C.danger : days <= 90 ? C.warn : C.accent2)}>
                        {days > 0 ? `${days} days away` : days === 0 ? 'Today!' : 'Complete'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 24, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Confirmed Guests</div>
                      <div style={{ ...s.statNum(C.accent), fontSize: 22 }}>{confirmedGuests.length}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Vendors Confirmed</div>
                      <div style={{ ...s.statNum(C.accent2), fontSize: 22 }}>{confirmedVendors.length}</div>
                    </div>
                  </div>
                </div>

                {/* Confirmed Vendors — category + name, no pricing */}
                {confirmedVendors.length > 0 && (
                  <div style={s.card}>
                    <div style={s.cardTitle}>Your Confirmed Vendors</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {confirmedVendors.map(v => (
                        <div key={v.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px' }}>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{v.category}</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
                          {v.arrivalTime && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Arrives {v.arrivalTime}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Planning milestones */}
                {ev.date && (() => {
                  const phases = Object.entries(PHASE_OFFSET)
                    .map(([phase, offset]) => {
                      const d = new Date(ev.date + 'T00:00:00');
                      d.setDate(d.getDate() + offset);
                      const dLeft = Math.ceil((d - getToday()) / 86400000);
                      return { phase, date: d, dLeft, focus: PHASE_FOCUS[phase] || phase };
                    })
                    .filter(m => m.dLeft > -7)          // exclude past milestones (more than 7 days ago)
                    .sort((a, b) => a.dLeft - b.dLeft)
                    .slice(0, 6);
                  if (phases.length === 0) return null;
                  return (
                    <div style={s.card}>
                      <div style={s.cardTitle}>Planning Milestones</div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Key dates in your planning timeline — hover any milestone for action tips.</div>
                      {phases.map(({ phase, date, dLeft, focus }) => {
                        const isPast    = dLeft <= 0;
                        const isUrgent  = dLeft > 0 && dLeft <= 30;
                        const dotClr    = isPast ? C.success : isUrgent ? C.warn : C.accent;
                        const isHov     = msHover?.phase === phase && msHover?.evId === ev.id;
                        const guideEntry = (WORKFLOW_FOCUS[ev.type] || WORKFLOW_FOCUS.Birthday || {})[phase];
                        const firstTip   = guideEntry?.tips?.[0] || null;
                        return (
                          <div
                            key={phase}
                            onMouseEnter={e => { setMsHover({ phase, evId: ev.id, evType: ev.type }); setMsMouse({ x: e.clientX, y: e.clientY }); }}
                            onMouseMove={e  => setMsMouse({ x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setMsHover(null)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'default', borderRadius: 6, padding: '8px 10px', marginBottom: 4, background: isHov ? C.accent + '11' : 'transparent', transition: 'background 0.15s' }}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotClr, flexShrink: 0, marginTop: 5 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span style={{ fontSize: 11, color: isPast ? C.success : isUrgent ? C.warn : C.muted, fontWeight: 600 }}>
                                  {isPast ? `✓ ${Math.abs(dLeft)}d ago` : dLeft === 0 ? 'Today' : `${dLeft}d away`}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{phase} · {focus}</div>
                              {firstTip && <div style={{ fontSize: 11, color: isPast ? C.success : isUrgent ? C.warn : C.muted, marginTop: 3, opacity: 0.8 }}>→ {firstTip}</div>}
                            </div>
                          </div>
                        );
                      })}
                      {/* Cursor-following milestone tooltip */}
                      {msHover?.evId === ev.id && (() => {
                        const guide   = WORKFLOW_FOCUS[msHover.evType] || WORKFLOW_FOCUS.Birthday || {};
                        const entry   = guide[msHover.phase] || Object.values(guide)[0];
                        if (!entry) return null;
                        const TIP_W = 270; const TIP_H = 130;
                        const flipX = msMouse.x + TIP_W + 20 > window.innerWidth;
                        const flipY = msMouse.y + TIP_H + 20 > window.innerHeight;
                        return (
                          <div style={{ position: 'fixed', top: flipY ? msMouse.y - TIP_H - 8 : msMouse.y + 16, left: flipX ? msMouse.x - TIP_W - 8 : msMouse.x + 12, zIndex: 9999, width: TIP_W, background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.28)', pointerEvents: 'none' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: '0.07em', marginBottom: 5, textTransform: 'uppercase' }}>{msHover.phase}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 7 }}>{entry.focus}</div>
                            <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {(entry.tips || []).map((tip, i) => (
                                <li key={i} style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Guest List — client can view, add, import, and remove guests */}
                {onUpdateGuests && (
                  <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={s.cardTitle}>Guest List</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>{(ev.guests || []).length} total · {(ev.guests || []).filter(g => g.rsvp === 'Yes').length} confirmed</span>
                        <button style={{ ...s.btn(), fontSize: 11, padding: '4px 10px' }} onClick={() => { setImportEvId(ev.id); setTimeout(() => importRef.current?.click(), 0); }}>⬆ Import</button>
                        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handlePortalImport(e, importEvId)} />
                      </div>
                    </div>
                    {importMsg && importMsg.evId === ev.id && (
                      <div style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, marginBottom: 10, background: importMsg.ok ? C.success + '22' : C.danger + '22', color: importMsg.ok ? C.success : C.danger, border: `1px solid ${importMsg.ok ? C.success : C.danger}44` }}>
                        {importMsg.text}
                      </div>
                    )}
                    {/* Add guest row */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <input
                        style={{ ...s.input, flex: 1, fontSize: 13 }}
                        placeholder="Guest name…"
                        value={newGuestName}
                        onChange={e => setNewGuestName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newGuestName.trim()) {
                            onUpdateGuests(ev.id, gs => [...gs, { id: uid(), name: newGuestName.trim(), group: 'Friends', rsvp: '', meal: '—', needs: '', email: '', phone: '', address: '', table: null, plusOne: '', plusOneMeal: '—', kids: 0, giftReceived: false, thankYouSent: false, partyNotes: '' }]);
                            setNewGuestName('');
                          }
                        }}
                      />
                      <button style={s.btn('primary')} onClick={() => {
                        if (!newGuestName.trim()) return;
                        onUpdateGuests(ev.id, gs => [...gs, { id: uid(), name: newGuestName.trim(), group: 'Friends', rsvp: '', meal: '—', needs: '', email: '', phone: '', address: '', table: null, plusOne: '', plusOneMeal: '—', kids: 0, giftReceived: false, thankYouSent: false, partyNotes: '' }]);
                        setNewGuestName('');
                      }}>+ Add</button>
                    </div>
                    {/* Guest rows */}
                    {(ev.guests || []).length === 0 ? (
                      <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '16px 0' }}>No guests added yet.</div>
                    ) : (
                      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {[...(ev.guests || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(g => {
                          const rsvpClr = g.rsvp === 'Yes' ? C.success : g.rsvp === 'No' ? C.danger : g.rsvp === 'Maybe' ? C.warn : C.muted;
                          return (
                            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                              <div style={{ flex: 1, fontSize: 13 }}>{g.name}</div>
                              {g.rsvp && <span style={{ fontSize: 11, color: rsvpClr, fontWeight: 600 }}>{g.rsvp}</span>}
                              {!g.rsvp && <span style={{ fontSize: 11, color: C.muted }}>Pending</span>}
                              <button
                                onClick={() => onUpdateGuests(ev.id, gs => gs.filter(x => x.id !== g.id))}
                                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                                title="Remove guest"
                              >✕</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Downloads */}
                <DownloadsCard event={ev} client={client} />

                {/* Planning fee schedule */}
                {(client.feeSchedule || []).length > 0 && (
                  <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={s.cardTitle}>Planning Fee Schedule</div>
                      <div style={{ fontSize: 12, color: C.muted }}>Total: {fmtD(client.plannerFee || 0)}</div>
                    </div>
                    {(client.feeSchedule || []).map(f => {
                      const dLeft = daysUntil(f.due);
                      return (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
                            {f.due && <div style={{ fontSize: 11, color: C.muted }}>Due {fmtDate(f.due)}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtD(f.amount)}</span>
                            {f.paid
                              ? <span style={s.pill(C.success)}>Paid</span>
                              : <span style={s.pill(dLeft !== null && dLeft <= 14 ? C.danger : C.warn)}>Due</span>
                            }
                          </div>
                        </div>
                      );
                    })}
                    {outstanding > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Outstanding balance</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.warn }}>{fmtD(outstanding)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────
// Kept for potential future use in grid/card layout mode.
// eslint-disable-next-line no-unused-vars
function ClientCard({ client, events, onClick }) {
  const C         = useT();
  const s         = makeS(C);
  const isLight   = C.surface === '#ffffff';
  const cardShadow = isLight ? '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06), 0 14px 32px rgba(0,0,0,0.04)' : 'none';
  const clientCLR = CLIENT_CLR(C);
  const evtCLR    = EVT_CLR(C);
  const clientEvents = events.filter(e => (client.eventIds || []).includes(e.id));
  const nextEvent    = [...clientEvents].sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
  const collected    = (client.feeSchedule || []).reduce((s, f) => s + (f.paid ? f.amount : (f.paidAmount || 0)), 0);
  const clr          = clientCLR[client.status] || C.muted;

  return (
    <div onClick={onClick}
      style={{ ...s.card, cursor: 'pointer', transition: 'transform 0.1s, border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = clr; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 0 1.5px ${clr}${isLight ? ', 0 4px 16px rgba(0,0,0,0.08)' : ''}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = cardShadow; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{client.name}</div>
        {nextEvent
          ? <span style={s.pill(evtCLR[nextEvent.type] || C.muted)}>{nextEvent.type}</span>
          : <span style={s.pill(clr)}>{client.status}</span>}
      </div>

      {nextEvent ? (
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
          <span style={{ marginLeft: 0 }}>{nextEvent.name}</span>
          {nextEvent.date && <span> · {fmtDate(nextEvent.date)}</span>}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>No events yet</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, color: C.muted }}>{clientEvents.length} event{clientEvents.length !== 1 ? 's' : ''}</div>
        <div style={{ fontSize: 12 }}>
          <span style={{ color: C.success, fontWeight: 600 }}>{fmtD(collected)}</span>
          <span style={{ color: C.muted }}> / {fmtD(client.plannerFee || 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── New Client Modal ─────────────────────────────────────────────────────────

// ─── Fee structure market data ────────────────────────────────────────────────
// Based on industry research: Wedding Wire, The Knot Pro, ILEA, PCMA benchmarks
const FEE_STRUCTURES = [
  { id: 'flat',       label: 'Flat Fee',      sub: 'Fixed price for defined scope',         icon: '💵' },
  { id: 'percentage', label: '% of Budget',   sub: '10–20% of total event budget',          icon: '📊' },
  { id: 'hourly',     label: 'Hourly Rate',   sub: 'Billed per hour of planning time',      icon: '⏱' },
  { id: 'day_rate',   label: 'Day Rate',      sub: 'Per event or consultation day',         icon: '📅' },
  { id: 'none',       label: 'No External Fee', sub: 'Internal/employee-managed',           icon: '🏢' },
];

// Suggested fee ranges by event type — sourced from industry averages
// Full-service / coordinator / day-of tiers
const FEE_RANGES = {
  Wedding:           { low: 2500, high: 8500, note: 'Full-service avg $4,500 · Day-of $800–$2,500 · 10–20% of budget common' },
  'Engagement Party':{ low: 400,  high: 1500, note: 'Often bundled with wedding package' },
  'Vow Renewal':     { low: 1200, high: 4500, note: 'Similar scope to intimate wedding' },
  Anniversary:       { low: 800,  high: 3500, note: 'Scale with guest count and formality' },
  'Bridal Shower':   { low: 300,  high: 1200, note: 'Often bundled with wedding or hourly' },
  'Baby Shower':     { low: 300,  high: 1000, note: 'Typically hourly or flat small-event fee' },
  Birthday:          { low: 400,  high: 2000, note: 'Milestone birthdays (40th, 50th+) on high end' },
  'Sweet 16':        { low: 800,  high: 3000, note: 'Production-heavy events approach wedding range' },
  Quinceañera:       { low: 1500, high: 5500, note: 'Complex logistics — often wedding-comparable' },
  Graduation:        { low: 300,  high: 1200, note: 'Typically flat fee for small events' },
  'Retirement Party':{ low: 400,  high: 1500, note: 'Scale with guest count and venue complexity' },
  Reunion:           { low: 500,  high: 2000, note: 'Flat fee most common — varies by size' },
  'Fundraiser / Gala':{ low: 2000, high: 8000, note: '10–15% of event budget common for large galas' },
  'Networking Event':{ low: 400,  high: 2000, note: 'Day rate or flat fee typical' },
  Other:             { low: 500,  high: 3000, note: 'Varies by scope — flat fee recommended' },
};

// Default fee schedule splits by structure type
const defaultFeeSchedule = (total, structure) => {
  if (!total || structure === 'none') return [];
  if (structure === 'hourly' || structure === 'day_rate') return [
    { id: uid(), label: 'Retainer / deposit', amount: Math.round(total * 0.5), due: '', paid: false, paymentMethod: '' },
    { id: uid(), label: 'Final payment',       amount: Math.round(total * 0.5), due: '', paid: false, paymentMethod: '' },
  ];
  // flat / percentage — 3-part for larger amounts, 2-part for small
  if (total >= 2000) return [
    { id: uid(), label: 'Booking retainer (33%)', amount: Math.round(total * 0.33), due: '', paid: false, paymentMethod: '' },
    { id: uid(), label: 'Midpoint payment (33%)', amount: Math.round(total * 0.33), due: '', paid: false, paymentMethod: '' },
    { id: uid(), label: 'Final payment (34%)',     amount: total - Math.round(total * 0.33) * 2, due: '', paid: false, paymentMethod: '' },
  ];
  return [
    { id: uid(), label: 'Retainer (50%)', amount: Math.round(total * 0.5), due: '', paid: false, paymentMethod: '' },
    { id: uid(), label: 'Final payment (50%)', amount: total - Math.round(total * 0.5), due: '', paid: false, paymentMethod: '' },
  ];
};

function NewClientModal({ onClose, onCreate, events = [], profile = null }) {
  const C = useT();
  const s = makeS(C);
  const [form, setForm] = useState({ name: '', email: '', phone: '', referral: '', status: 'Inquiry', plannerFee: '', feeStructure: 'flat', contactPref: '', guestEstimate: '', venueStatus: '', styleNotes: '', initNotes: '' });
  const [referralChoice,   setReferralChoice]   = useState('');
  const [touched,          setTouch]            = useState({});
  const [selectedEventId,  setSelectedEventId]  = useState('');
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const touch = (k)    => setTouch(t => ({ ...t, [k]: true }));
  const isOtherReferral = referralChoice === 'Other';

  const linkedEvent  = events.find(ev => ev.id === selectedEventId) || null;
  const linkedType   = linkedEvent?.type || null;
  const isInternal   = linkedType ? isCorporateType(linkedType) : false;
  const feeRange     = linkedType ? (FEE_RANGES[linkedType] || null) : null;
  const evtBudget    = linkedEvent ? (linkedEvent.budget || []).reduce((s, r) => s + (r.budgeted || 0), 0) : 0;
  const metroFactor  = getMetroFactor(profile);
  const adjLow       = feeRange ? Math.round(feeRange.low  * metroFactor) : 0;
  const adjHigh      = feeRange ? Math.round(feeRange.high * metroFactor) : 0;
  const metroMkt     = profile?.metroMarket ? METRO_MARKETS.find(m => m.id === profile.metroMarket) : null;
  const metroTier    = metroMkt ? METRO_TIER_LABEL[metroMkt.tier] : null;

  // Auto-switch to 'none' for internal corporate events, back to 'flat' otherwise
  useEffect(() => {
    set('feeStructure', isInternal ? 'none' : 'flat');
    if (isInternal) set('plannerFee', '');
  }, [isInternal]); // eslint-disable-line react-hooks/exhaustive-deps

  const feeAmt = Number(form.plannerFee) || 0;

  // For % of budget structure: compute fee from event budget
  const computedPctFee = form.feeStructure === 'percentage' && evtBudget > 0
    ? Math.round(evtBudget * 0.15)
    : 0;

  const errEmail = touched.email && !isEmail(form.email)  ? 'Enter a valid email address' : null;
  const errPhone = touched.phone && !isPhone(form.phone)  ? 'Enter a valid phone number (10–15 digits)' : null;
  const canSubmit = form.name.trim() && !errEmail && !errPhone;

  const submit = () => {
    if (!canSubmit) return;
    const finalFee = form.feeStructure === 'none' ? 0
      : form.feeStructure === 'percentage' && computedPctFee ? computedPctFee
      : feeAmt;
    const initLogLines = ['Client created.'];
    if (form.contactPref)   initLogLines.push(`Preferred contact: ${form.contactPref}.`);
    if (form.guestEstimate) initLogLines.push(`Est. guest count: ${form.guestEstimate}.`);
    if (form.venueStatus)   initLogLines.push(`Venue status: ${form.venueStatus}.`);
    if (form.initNotes)     initLogLines.push(form.initNotes.trim());
    onCreate({
      id: 'cl-' + uid(),
      name: form.name.trim(),
      email: form.email,
      phone: form.phone,
      referral: form.referral,
      status: form.status,
      contactPref: form.contactPref,
      guestEstimate: form.guestEstimate,
      venueStatus: form.venueStatus,
      plannerFee: finalFee,
      feeStructure: form.feeStructure,
      feeSchedule: defaultFeeSchedule(finalFee, form.feeStructure),
      style: form.styleNotes.trim(),
      notes: '',
      log: [{ id: uid(), date: today8601(), text: initLogLines.join(' ') }],
      eventIds: selectedEventId ? [selectedEventId] : [],
    }, selectedEventId || null);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(460px, calc(100vw - 24px))', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, zIndex: 50, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.muted, marginBottom: 4 }}>New Client</div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Add to your roster</h2>
            </div>
            <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 'calc(90vh - 130px)' }}>

          {/* ── Link to Event first — drives fee logic ── */}
          {events.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>
                Link to Event <span style={{ fontWeight: 400 }}>(optional — drives fee suggestions)</span>
              </label>
              <select style={s.input} value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                <option value="">No event — add later</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}{ev.date ? ` · ${fmtDate(ev.date)}` : ''}{ev.type ? ` · ${ev.type}` : ''}</option>
                ))}
              </select>
              {/* Linked event summary card */}
              {linkedEvent && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: EVT_CLR(C)[linkedType] || C.text, marginTop: 2 }}>{linkedType}</div>
                  </div>
                  {linkedEvent.date && (
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 2 }}>{fmtDate(linkedEvent.date)}</div>
                    </div>
                  )}
                  {evtBudget > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Event Budget</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.success, marginTop: 2 }}>{fmtD(evtBudget)}</div>
                    </div>
                  )}
                  {linkedEvent.guests && (
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Guests</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 2 }}>{linkedEvent.guests.length}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Client Name ── */}
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Client / Couple Name *</label>
            <input style={s.input} value={form.name}
              placeholder={isInternal ? 'e.g. Acme Corp — Events Team' : 'e.g. Sarah & Todd Chen'}
              autoFocus onChange={e => set('name', e.target.value)} />
          </div>

          {/* ── Email + Phone ── */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Email</label>
              <input style={{ ...s.input, borderColor: errEmail ? C.danger : undefined }}
                type="email" value={form.email} placeholder="client@email.com"
                onChange={e => set('email', e.target.value)} onBlur={() => touch('email')} />
              {errEmail && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{errEmail}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Phone</label>
              <input style={{ ...s.input, borderColor: errPhone ? C.danger : undefined }}
                type="tel" value={form.phone} placeholder="(555) 555-0100"
                onChange={e => set('phone', formatPhone(e.target.value))} onBlur={() => touch('phone')} />
              {errPhone && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{errPhone}</div>}
            </div>
          </div>

          {/* ── Source + Status ── */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>How They Found You</label>
              <select style={s.input} value={referralChoice} onChange={e => {
                const v = e.target.value;
                setReferralChoice(v);
                if (v !== 'Other') set('referral', v);
                else set('referral', '');
              }}>
                <option value="">Select source…</option>
                {REFERRAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                <option value="Other">Other…</option>
              </select>
              {isOtherReferral && (
                <input style={{ ...s.input, marginTop: 6 }} value={form.referral} placeholder="Specify…"
                  onChange={e => set('referral', e.target.value)} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Starting Status</label>
              <select style={s.input} value={form.status} onChange={e => set('status', e.target.value)}>
                {CLIENT_STAGES.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
          </div>

          {/* ── Intake details ── */}
          <div style={{ paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 12 }}>Quick Intake</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Row: contact pref + guest estimate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Preferred Contact</label>
                  <select style={s.input} value={form.contactPref} onChange={e => set('contactPref', e.target.value)}>
                    <option value="">— Not asked —</option>
                    {['Email', 'Text / SMS', 'Phone Call', 'WhatsApp', 'Any'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Est. Guest Count</label>
                  <input style={s.input} type="number" placeholder="e.g. 150" value={form.guestEstimate} onChange={e => set('guestEstimate', e.target.value)} />
                </div>
              </div>
              {/* Venue status */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 6 }}>Venue Status</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['No venue yet', 'In talks with venue', 'Venue booked'].map(opt => {
                    const active = form.venueStatus === opt;
                    return (
                      <button key={opt} type="button" onClick={() => set('venueStatus', active ? '' : opt)} style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? C.accent + '18' : 'transparent', color: active ? C.accent : C.muted, fontWeight: active ? 700 : 400 }}>
                        {opt === 'No venue yet' ? '🔍 ' : opt === 'In talks with venue' ? '💬 ' : '✅ '}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Style/Vision */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Style / Vision <span style={{ fontWeight: 400 }}>(keywords)</span></label>
                <input style={s.input} placeholder={isInternal ? 'e.g. Modern, branded, all-hands…' : 'e.g. Garden-romantic, boho, black-tie…'} value={form.styleNotes} onChange={e => set('styleNotes', e.target.value)} />
              </div>
              {/* Initial notes */}
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>First Impression / Notes</label>
                <textarea style={{ ...s.input, minHeight: 56, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, fontSize: 13 }} placeholder="Quick notes from first call or inquiry…" value={form.initNotes} onChange={e => set('initNotes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Planner Fee section ── */}
          <div style={{ paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Planner Fee</label>
              {feeRange && !isInternal && (
                <span style={{ fontSize: 10, color: C.muted }}>
                  {metroMkt ? <>{metroTier?.icon} {metroMkt.label}: </> : 'Industry range: '}
                  <span style={{ color: C.accent2, fontWeight: 600 }}>{fmtD(adjLow)}–{fmtD(adjHigh)}</span>
                  {metroMkt && metroFactor !== 1.0 && (
                    <span style={{ color: C.muted, marginLeft: 3 }}>({metroFactor > 1 ? '+' : ''}{Math.round((metroFactor - 1) * 100)}% vs. national avg)</span>
                  )}
                </span>
              )}
            </div>

            {/* Internal corporate banner */}
            {isInternal ? (
              <div style={{ padding: '12px 14px', background: C.accent2 + '12', border: `1px solid ${C.accent2}44`, borderRadius: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.accent2, marginBottom: 4 }}>🏢 Internal Employee-Managed Event</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  {linkedType} events are typically planned by an employee or internal team — no external planner fee applies.
                </div>
                <button
                  style={{ ...s.btn('ghost'), fontSize: 11, marginTop: 10, padding: '4px 10px' }}
                  onClick={() => set('feeStructure', 'flat')}>
                  Add external fee anyway →
                </button>
              </div>
            ) : (
              <>
                {/* Fee structure picker */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {FEE_STRUCTURES.filter(f => f.id !== 'none').map(({ id, label, icon }) => {
                    const active = form.feeStructure === id;
                    return (
                      <button key={id} onClick={() => set('feeStructure', id)}
                        style={{
                          padding: '5px 11px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                          border: `1.5px solid ${active ? C.accent : C.border}`,
                          background: active ? C.accent + '18' : 'transparent',
                          color: active ? C.accent : C.muted,
                          fontWeight: active ? 700 : 400, transition: 'all 0.12s',
                        }}>
                        {icon} {label}
                      </button>
                    );
                  })}
                </div>

                {/* Fee input */}
                {form.feeStructure === 'percentage' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                        {[10, 12, 15, 18, 20].map(pct => {
                          const amt = Math.round(evtBudget * (pct / 100));
                          const active = form.plannerFee === String(amt) || (!form.plannerFee && pct === 15);
                          return (
                            <button key={pct} onClick={() => set('plannerFee', evtBudget ? String(amt) : '')}
                              style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 10, cursor: 'pointer', textAlign: 'center',
                                border: `1.5px solid ${active ? C.accent : C.border}`,
                                background: active ? C.accent + '18' : 'transparent',
                                color: active ? C.accent : C.muted, fontWeight: active ? 700 : 400 }}>
                              <div style={{ fontWeight: 700 }}>{pct}%</div>
                              {evtBudget > 0 && <div style={{ marginTop: 1 }}>{fmtD(amt)}</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {!evtBudget && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Link an event with a budget to see dollar amounts</div>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: C.muted }}>$</span>
                    <input style={{ ...s.input, maxWidth: 160 }} type="number" value={form.plannerFee} placeholder="0"
                      onChange={e => set('plannerFee', e.target.value)} />
                    {feeRange && form.plannerFee && (
                      <span style={{ fontSize: 11, color: feeAmt < adjLow ? C.warn : feeAmt > adjHigh ? C.accent2 : C.success }}>
                        {feeAmt < adjLow ? '↓ below market' : feeAmt > adjHigh ? '↑ above market' : '✓ market rate'}
                      </span>
                    )}
                  </div>
                )}

                {/* Fee range note */}
                {feeRange && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{feeRange.note}</div>
                )}

                {/* Fee schedule preview */}
                {feeAmt > 0 && form.feeStructure !== 'hourly' && form.feeStructure !== 'day_rate' && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Auto-generated payment schedule</div>
                    {defaultFeeSchedule(feeAmt, form.feeStructure).map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text, marginBottom: 3 }}>
                        <span>{p.label}</span>
                        <span style={{ fontWeight: 600 }}>{fmtD(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
          <button style={{ ...s.btn(), flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btn('primary'), flex: 2 }} onClick={submit} disabled={!canSubmit}>
            Create Client →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Metro Market cost-index data ─────────────────────────────────────────────
const METRO_MARKETS = [
  // Tier 1 — Premium (1.4–1.65×)
  { id: 'nyc',   label: 'New York / New Jersey',    region: 'Northeast',    tier: 1, factor: 1.65 },
  { id: 'sf',    label: 'San Francisco / Bay Area',  region: 'West Coast',   tier: 1, factor: 1.60 },
  { id: 'la',    label: 'Los Angeles',               region: 'West Coast',   tier: 1, factor: 1.50 },
  { id: 'bos',   label: 'Boston',                    region: 'Northeast',    tier: 1, factor: 1.45 },
  { id: 'dc',    label: 'Washington DC / NoVA',      region: 'Mid-Atlantic', tier: 1, factor: 1.45 },
  { id: 'sea',   label: 'Seattle',                   region: 'West Coast',   tier: 1, factor: 1.40 },
  // Tier 2 — Above Average (1.10–1.35×)
  { id: 'chi',   label: 'Chicago',                   region: 'Midwest',      tier: 2, factor: 1.35 },
  { id: 'mia',   label: 'Miami / Fort Lauderdale',   region: 'Southeast',    tier: 2, factor: 1.30 },
  { id: 'sd',    label: 'San Diego',                 region: 'West Coast',   tier: 2, factor: 1.25 },
  { id: 'den',   label: 'Denver',                    region: 'Mountain',     tier: 2, factor: 1.20 },
  { id: 'aus',   label: 'Austin',                    region: 'South',        tier: 2, factor: 1.20 },
  { id: 'dal',   label: 'Dallas / Fort Worth',       region: 'South',        tier: 2, factor: 1.15 },
  { id: 'atl',   label: 'Atlanta',                   region: 'Southeast',    tier: 2, factor: 1.15 },
  { id: 'phi',   label: 'Philadelphia',              region: 'Mid-Atlantic', tier: 2, factor: 1.15 },
  { id: 'por',   label: 'Portland',                  region: 'West Coast',   tier: 2, factor: 1.15 },
  { id: 'nas',   label: 'Nashville',                 region: 'South',        tier: 2, factor: 1.15 },
  { id: 'min',   label: 'Minneapolis',               region: 'Midwest',      tier: 2, factor: 1.10 },
  { id: 'phx',   label: 'Phoenix',                   region: 'Mountain',     tier: 2, factor: 1.10 },
  // Tier 3 — Market Rate (0.88–1.05×)
  { id: 'hou',   label: 'Houston',                   region: 'South',        tier: 3, factor: 1.05 },
  { id: 'tam',   label: 'Tampa / Orlando',           region: 'Southeast',    tier: 3, factor: 1.00 },
  { id: 'cha',   label: 'Charlotte',                 region: 'Southeast',    tier: 3, factor: 1.00 },
  { id: 'slc',   label: 'Salt Lake City',            region: 'Mountain',     tier: 3, factor: 0.95 },
  { id: 'col',   label: 'Columbus',                  region: 'Midwest',      tier: 3, factor: 0.95 },
  { id: 'pit',   label: 'Pittsburgh',                region: 'Northeast',    tier: 3, factor: 0.90 },
  { id: 'ind',   label: 'Indianapolis',              region: 'Midwest',      tier: 3, factor: 0.90 },
  { id: 'kc',    label: 'Kansas City',               region: 'Midwest',      tier: 3, factor: 0.90 },
  { id: 'stl',   label: 'St. Louis',                 region: 'Midwest',      tier: 3, factor: 0.88 },
  // Tier 4 — Value / Small Market (0.75–0.82×)
  { id: 'rural', label: 'Rural / Small Market',      region: 'Other',        tier: 4, factor: 0.80 },
  { id: 'other', label: 'Other / International',     region: 'Other',        tier: 4, factor: 1.00 },
];

const METRO_TIER_LABEL = {
  1: { icon: '💎', label: 'Premium Market',       color: '#a78bfa' },
  2: { icon: '📈', label: 'Above-Average Market', color: '#60a5fa' },
  3: { icon: '✓',  label: 'Market Rate',          color: '#34d399' },
  4: { icon: '💡', label: 'Value Market',          color: '#fbbf24' },
};

// Helper: look up the metro factor from a profile
const getMetroFactor = (profile) => {
  if (!profile?.metroMarket) return 1.0;
  return METRO_MARKETS.find(m => m.id === profile.metroMarket)?.factor || 1.0;
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function ProfileModal({ profile, onClose, onChange }) {
  const C = useT();
  const s = makeS(C);
  const [copied,       setCopied]       = useState(false);
  const [showPay,      setShowPay]      = useState(!!(profile?.venmo || profile?.zelle || profile?.paypal || profile?.acceptsCash || profile?.acceptsCheck || profile?.paymentNote));
  const [showAI,       setShowAI]       = useState(false);
  const [specCat,      setSpecCat]      = useState(Object.keys(EVT_CATEGORIES)[0]);

  const hasPayData = !!(profile?.venmo || profile?.zelle || profile?.paypal || profile?.acceptsCash || profile?.acceptsCheck || profile?.paymentNote);

  const validateVenmo  = v => !v || /^@[\w.]{1,30}$/.test(v.trim())             ? null : 'Use @handle format (letters, numbers, . _)';
  const validateZelle  = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || (() => { const d = v.replace(/\D/g,''); return d.length >= 10 && d.length <= 15; })() ? null : 'Enter a valid email or 10-digit phone';
  const validatePaypal = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Enter a valid email address';
  const payErrors = { venmo: validateVenmo(profile?.venmo), zelle: validateZelle(profile?.zelle), paypal: validatePaypal(profile?.paypal) };

  const initials   = (profile?.name || 'P').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const hasContact = profile?.phone || profile?.email || profile?.website;
  const metroObj   = METRO_MARKETS.find(m => m.id === profile?.metroMarket) || null;
  const tierInfo   = metroObj ? METRO_TIER_LABEL[metroObj.tier] : null;

  // Logo upload — downscale to ≤400px (PNG, keeps transparency) so it stays small in localStorage
  const logoInputRef = useRef(null);
  const [logoErr, setLogoErr] = useState('');
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLogoErr('Please choose an image file.'); return; }
    setLogoErr('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const max = 400;
        let { width, height } = img;
        if (width > max || height > max) { const sc = max / Math.max(width, height); width = Math.round(width * sc); height = Math.round(height * sc); }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        try { onChange('logo', canvas.toDataURL('image/png')); }
        catch { setLogoErr('That image is too large to save. Try a smaller file.'); }
      };
      img.onerror = () => setLogoErr('Could not read that image.');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Section header helper
  const SectionHead = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );

  const copyContact = () => {
    const lines = [];
    if (profile?.name)         lines.push(profile.name);
    if (profile?.businessName) lines.push(profile.businessName);
    if (profile?.phone)        lines.push(`📞 ${profile.phone}`);
    if (profile?.email)        lines.push(`✉️ ${profile.email}`);
    if (profile?.city)         lines.push(`📍 ${profile.city}`);
    if (profile?.website)      lines.push(`🌐 ${profile.website}`);
    const text = lines.join('\n');
    const finish = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(finish).catch(() => { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); try { document.execCommand('copy'); finish(); } catch {} document.body.removeChild(el); });
    } else { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); try { document.execCommand('copy'); finish(); } catch {} document.body.removeChild(el); }
  };

  // 2-column field pair helper
  const Row2 = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
  );
  const Field = ({ fkey, label, type = 'text', ph }) => {
    const err = fkey === 'email' ? (!profile?.[fkey] || isEmail(profile?.[fkey]) ? null : 'Invalid email')
              : fkey === 'phone' ? (!profile?.[fkey] || isPhone(profile?.[fkey]) ? null : 'Invalid phone')
              : null;
    return (
      <div>
        <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>{label}</label>
        <input style={{ ...s.input, borderColor: err ? C.danger : undefined }} type={type} value={profile?.[fkey] || ''} placeholder={ph} onChange={e => onChange(fkey, e.target.value)} />
        {err && <div style={{ fontSize: 11, color: C.danger, marginTop: 2 }}>{err}</div>}
      </div>
    );
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(420px, 100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Planner Profile</div>
          <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 18, padding: '4px 10px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 32px' }}>

          {/* ── Identity card ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 4 }}>
            {profile?.logo
              ? <div style={{ width: 56, height: 56, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: `1px solid ${C.border}` }}><img src={profile.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>
              : <div style={mkSphere(profile?.brandColor || C.accent, 56, 20)}>{initials}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{profile?.name || 'Your Name'}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{profile?.businessName || 'Event Planner'}</div>
              {(profile?.city || metroObj) && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {profile?.city || ''}
                  {metroObj && <span style={{ color: tierInfo?.color || C.accent, marginLeft: profile?.city ? ' · ' : '' }}>{tierInfo?.icon} {metroObj.label}</span>}
                </div>
              )}
            </div>
            {hasContact && (
              <button onClick={copyContact} title="Copy contact card" style={{ ...s.btn(copied ? 'success' : 'ghost'), fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>
                {copied ? '✓' : '⎘'}
              </button>
            )}
          </div>

          {/* Quick contact links */}
          {hasContact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 2 }}>
              {profile?.phone && <>
                <a href={`tel:${profile.phone}`} title="Call" style={{ display: 'flex', color: C.accent }}><svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg></a>
                <a href={`sms:${profile.phone}`} title="Text" style={{ display: 'flex', color: C.accent2 }}><IconSMS size={14} /></a>
                <a href={`facetime:${profile.phone}`} title="FaceTime" style={{ display: 'flex', color: C.muted }}><IconFaceTime size={14} /></a>
              </>}
              {profile?.email   && <a href={`mailto:${profile.email}`} title="Email" style={{ display: 'flex', color: C.accent }}><IconEmail size={14} /></a>}
              {profile?.website && <a href={wsHref(profile.website)} target="_blank" rel="noopener noreferrer" title="Website" style={{ display: 'flex', color: C.muted }}><IconGlobe size={14} /></a>}
              {profile?.instagram && <span style={{ fontSize: 11, color: C.muted }}>{profile.instagram}</span>}
            </div>
          )}

          {/* ── IDENTITY ── */}
          <SectionHead label="Identity" />
          <Row2>
            <Field fkey="name"         label="Your Name"      ph="Jane Planner" />
            <Field fkey="businessName" label="Business Name"  ph="Planner Co."  />
          </Row2>

          {/* Logo upload */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Business Logo <span style={{ fontWeight: 400 }}>— appears on vendor briefs, client pages & materials</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, border: `1px dashed ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {profile?.logo
                  ? <img src={profile.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 20, color: C.muted }}>🏷</span>}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => logoInputRef.current?.click()} style={{ ...s.btn(), fontSize: 12, padding: '6px 12px' }}>{profile?.logo ? 'Replace' : '⬆ Upload Logo'}</button>
                  {profile?.logo && <button onClick={() => onChange('logo', '')} style={{ ...s.btn('ghost'), fontSize: 12, padding: '6px 12px' }}>Remove</button>}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>PNG with transparency works best. Auto-resized to 400px.</div>
                {logoErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>{logoErr}</div>}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Bio</label>
            <textarea style={{ ...s.input, minHeight: 64, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, fontSize: 13 }} value={profile?.bio || ''} placeholder="Your planning style, specialties, and what makes you different…" onChange={e => onChange('bio', e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 5 }}>Brand Color <span style={{ fontWeight: 400 }}>— accents your vendor briefs & shared pages</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input type="color" value={profile?.brandColor || '#1a6fba'} onChange={e => onChange('brandColor', e.target.value)}
                style={{ width: 44, height: 36, padding: 2, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', flexShrink: 0 }} />
              <input value={profile?.brandColor || ''} placeholder="#1a6fba" onChange={e => onChange('brandColor', e.target.value)}
                style={{ ...s.input, width: 120, fontFamily: 'monospace', fontSize: 13 }} />
              {['#1a6fba', '#14b8a6', '#b45309', '#9333ea', '#db2777', '#0f766e', '#1e293b'].map(c => (
                <button key={c} onClick={() => onChange('brandColor', c)} title={c}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: profile?.brandColor === c ? `2px solid ${C.text}` : `1px solid ${C.border}`, cursor: 'pointer', flexShrink: 0 }} />
              ))}
              {profile?.brandColor && (
                <button onClick={() => onChange('brandColor', '')} style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 8px' }}>Reset</button>
              )}
            </div>
          </div>

          {/* ── CONTACT & REACH ── */}
          <SectionHead label="Contact & Reach" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row2>
              <Field fkey="email"     label="Email"     type="email" ph="you@planner.com"  />
              <Field fkey="phone"     label="Phone"     type="tel"   ph="(555) 555-0100"   />
            </Row2>
            <Row2>
              <Field fkey="website"   label="Website"              ph="yoursite.com"  />
              <Field fkey="instagram" label="Instagram"            ph="@yourhandle"   />
            </Row2>
          </div>

          {/* ── SERVICE AREA ── */}
          <SectionHead label="Service Area & Market" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field fkey="city" label="City / Region" ph="Nashville, TN" />
            <div>
              <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Primary Metro Market</label>
              <select
                value={profile?.metroMarket || ''}
                onChange={e => onChange('metroMarket', e.target.value)}
                style={{ ...s.input, cursor: 'pointer' }}
              >
                <option value="">— Not set —</option>
                {[1,2,3,4].map(tier => (
                  <optgroup key={tier} label={`${METRO_TIER_LABEL[tier].icon} Tier ${tier} — ${METRO_TIER_LABEL[tier].label}`}>
                    {METRO_MARKETS.filter(m => m.tier === tier).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {metroObj && tierInfo && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: tierInfo.color + '18', border: `1px solid ${tierInfo.color}44`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{tierInfo.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tierInfo.color }}>{tierInfo.label} · {metroObj.factor.toFixed(2)}× cost index</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                      Budget estimates will reflect {metroObj.label} typical rates
                      {metroObj.factor !== 1.0 && ` (${metroObj.factor > 1 ? '+' : ''}${Math.round((metroObj.factor - 1) * 100)}% vs. national avg)`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── EVENT SPECIALTIES ── */}
          <SectionHead label="Event Specialties" />
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {Object.keys(EVT_CATEGORIES).map(cat => {
              const catTypes    = EVT_CATEGORIES[cat] || [];
              const selectedInCat = catTypes.filter(t => (profile?.specialties || '').split(',').map(x => x.trim()).includes(t)).length;
              return (
                <button key={cat} onClick={() => setSpecCat(cat)} style={{ ...s.btn(specCat === cat ? 'primary' : 'ghost'), fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {cat === 'Weddings & Celebrations' ? '🎊' : cat === 'Corporate' ? '🏢' : '🤝'}
                  {cat === 'Weddings & Celebrations' ? 'Celebrations' : cat === 'Corporate' ? 'Corporate' : 'Social'}
                  {selectedInCat > 0 && <span style={{ background: C.accent, color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{selectedInCat}</span>}
                </button>
              );
            })}
          </div>
          {/* Compact checkbox grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {(EVT_CATEGORIES[specCat] || []).map(t => {
              const active = (profile?.specialties || '').split(',').map(x => x.trim()).includes(t);
              return (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: active ? C.accent + '14' : 'transparent', color: active ? C.accent : C.text, fontSize: 12, transition: 'background 0.12s', userSelect: 'none' }}>
                  <input type="checkbox" checked={active} onChange={() => {
                    const current = (profile?.specialties || '').split(',').map(x => x.trim()).filter(Boolean);
                    const next = active ? current.filter(x => x !== t) : [...current, t];
                    onChange('specialties', next.join(', '));
                  }} style={{ accentColor: C.accent, width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }} />
                  {t}
                </label>
              );
            })}
          </div>
          {(profile?.specialties || '').split(',').filter(Boolean).length > 0 && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>{(profile?.specialties || '').split(',').filter(Boolean).length} specialties selected</span>
              <button onClick={() => onChange('specialties', '')} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 11, padding: 0 }}>clear all</button>
            </div>
          )}

          {/* ── HOW CLIENTS PAY ── collapsible */}
          <SectionHead label="How Clients Pay" />
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowPay(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.text }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Payment methods you accept</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {hasPayData && !showPay && <span style={{ ...s.pill(C.success), fontSize: 10 }}>saved</span>}
                <span style={{ color: C.muted, fontSize: 12 }}>{showPay ? '▾' : '▸'}</span>
              </span>
            </button>
            {showPay && (
              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                {[['venmo','Venmo','@YourVenmo',payErrors.venmo],['zelle','Zelle','Phone or email registered with Zelle',payErrors.zelle],['paypal','PayPal','PayPal email address',payErrors.paypal]].map(([key, label, ph, err]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>{label}</label>
                    <input style={{ ...s.input, borderColor: err ? C.danger : undefined }} value={profile?.[key] || ''} placeholder={ph} onChange={e => onChange(key, e.target.value)} />
                    {err && <div style={{ fontSize: 11, color: C.danger, marginTop: 2 }}>{err}</div>}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 16 }}>
                  {[['acceptsCash','Cash'],['acceptsCheck','Check / Money Order']].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: C.text }}>
                      <input type="checkbox" checked={!!(profile?.[key])} onChange={e => onChange(key, e.target.checked)} style={{ accentColor: C.accent, width: 14, height: 14, cursor: 'pointer' }} />
                      {label}
                    </label>
                  ))}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Other / Notes</label>
                  <input style={s.input} value={profile?.paymentNote || ''} placeholder="e.g. Wire transfer, Apple Pay…" onChange={e => onChange('paymentNote', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* ── CLAUDE AI ── collapsible */}
          <SectionHead label="Integrations" />
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setShowAI(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.text }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Claude AI — drafting &amp; suggestions</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {profile?.anthropicKey ? <span style={{ ...s.pill(C.success), fontSize: 10 }}>✓ Active</span> : <span style={{ fontSize: 11, color: C.muted }}>not set</span>}
                <span style={{ color: C.muted, fontSize: 12 }}>{showAI ? '▾' : '▸'}</span>
              </span>
            </button>
            {showAI && (
              <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Anthropic API Key</label>
                <input style={s.input} type="password" value={profile?.anthropicKey || ''} placeholder="sk-ant-…" onChange={e => onChange('anthropicKey', e.target.value)} />
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Stored locally. Never sent anywhere except api.anthropic.com.</div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Dashboard week-at-a-glance: mini month + line-by-line week agenda ─────────
function DashWeekView({ events, onSelectEvent, sidebar = false, calNotes = [], onAddCalNote, onToggleCalNote, onDeleteCalNote }) {
  const C = useT();
  const s = makeS(C);
  const bp = useContext(BpCtx);
  const evtCLR = EVT_CLR(C);
  // Horizontal (month | week) only when wide AND not in a narrow sidebar column.
  const isWide = (bp === 'desktop' || bp === 'tablet-land') && !sidebar;
  const [monthOffset, setMonthOffset] = useState(0);

  // Aggregate calendar items by date string across all events
  const items = {};
  const add = (ds, it) => { if (ds) { (items[ds] = items[ds] || []).push(it); } };
  events.forEach(ev => {
    const color = evtCLR[ev.type] || C.muted;
    if (ev.date) add(ev.date, { kind: 'event', label: ev.name, color, eventId: ev.id });
    const groups = {};
    (ev.timeline || []).forEach(t => {
      if (!(t.week in PHASE_OFFSET) || !ev.date) return;
      const d = new Date(ev.date + 'T00:00:00'); d.setDate(d.getDate() + PHASE_OFFSET[t.week]);
      const ds = d.toISOString().slice(0, 10);
      (groups[ds] = groups[ds] || { week: t.week, tasks: [] }).tasks.push(t);
    });
    Object.entries(groups).forEach(([ds, g]) => {
      const open = g.tasks.filter(t => !t.done).length;
      if (open > 0) add(ds, { kind: 'task', label: `${ev.name}: ${g.week}`, color: C.accent, eventId: ev.id });
    });
    (ev.vendors || []).forEach(v => {
      if (v.payDueDate && !v.balancePaid && v.name) add(v.payDueDate, { kind: 'payment', label: `Pay ${v.name}`, color: C.warn, eventId: ev.id });
    });
  });
  // Standalone day items the planner pins from the calendar (note / task / event).
  const NOTE_KIND_COLOR = { event: C.accent2, task: C.accent, note: C.muted };
  (calNotes || []).forEach(n => {
    add(n.date, { kind: 'note', noteKind: n.kind, label: n.text, color: NOTE_KIND_COLOR[n.kind] || C.muted, noteId: n.id, done: n.done });
  });

  const todayStr = today8601();
  const [selDay, setSelDay] = useState(todayStr); // drives the week shown on the right
  const [addDay, setAddDay] = useState(null);     // ds whose add-modal is open (null = closed)
  const viewMonth = new Date(getToday().getFullYear(), getToday().getMonth() + monthOffset, 1);
  const year = viewMonth.getFullYear(), month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Selected week = Sun→Sat containing selDay (aligns with the calendar rows)
  const sel = new Date(selDay + 'T00:00:00');
  const weekStart = new Date(sel); weekStart.setDate(sel.getDate() - sel.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    return { d, ds, isToday: ds === todayStr, dayItems: items[ds] || [] };
  });
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: weekStart.getMonth() === weekEnd.getMonth() ? undefined : 'short', day: 'numeric' })}`;

  return (
    <div style={{ ...s.card, marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isWide ? '190px 1fr' : '1fr', gap: 22, alignItems: 'start' }}>

        {/* ── Compact mini month — tap a day to change the week ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={() => setMonthOffset(o => o - 1)} style={{ ...s.btn('ghost'), fontSize: 12, padding: '1px 7px' }}>‹</button>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{monthLabel}</div>
            <button onClick={() => setMonthOffset(o => o + 1)} style={{ ...s.btn('ghost'), fontSize: 12, padding: '1px 7px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ fontSize: 8, fontWeight: 700, color: C.muted, textAlign: 'center', paddingBottom: 2 }}>{d}</div>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dObj = new Date(year, month, dayNum);
              const ds = dObj.toISOString().slice(0, 10);
              const dayItems = items[ds] || [];
              const isToday = ds === todayStr;
              const isSel = ds === selDay;
              // is this day inside the selected week?
              const inWeek = ds >= weekStartStr && ds <= weekEnd.toISOString().slice(0, 10);
              const dot = dayItems.some(x => x.kind === 'payment') ? C.warn : dayItems.some(x => x.kind === 'event') ? dayItems.find(x => x.kind === 'event').color : dayItems.length ? C.accent : null;
              return (
                <button key={dayNum} onClick={() => setSelDay(ds)}
                  style={{ height: 24, border: 'none', cursor: 'pointer', borderRadius: 5, position: 'relative',
                    background: isSel ? C.accent : inWeek ? C.accent + '1f' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10.5, fontWeight: isToday || isSel ? 800 : 500, color: isSel ? '#fff' : isToday ? C.accent : C.text }}>{dayNum}</span>
                  {dot && <span style={{ position: 'absolute', bottom: 2, width: 3, height: 3, borderRadius: '50%', background: isSel ? '#fff' : dot }} />}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 6, textAlign: 'center' }}>Tap a day to view its week · use “+ add” to pin a note, task or event</div>
        </div>

        {/* ── Line-by-line week agenda (driven by selected day) ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
              {weekStartStr === new Date(getToday().getFullYear(), getToday().getMonth(), getToday().getDate() - getToday().getDay()).toISOString().slice(0, 10) ? 'This Week' : 'Week'}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{weekLabel}</div>
          </div>
          <div>
            {week.map(({ d, ds, isToday, dayItems }, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', alignItems: 'flex-start', background: ds === selDay ? C.accent + '0c' : 'transparent', borderRadius: 6 }}
                onMouseEnter={e => { const a = e.currentTarget.querySelector('[data-addbtn]'); if (a) a.style.opacity = 1; }}
                onMouseLeave={e => { const a = e.currentTarget.querySelector('[data-addbtn]'); if (a && addDay !== ds) a.style.opacity = 0.45; }}>
                <div style={{ width: 50, flexShrink: 0, textAlign: 'center', paddingLeft: ds === selDay ? 4 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? C.accent : C.muted, textTransform: 'uppercase' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? C.accent : C.text, lineHeight: 1.1 }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  {dayItems.length === 0 && (
                    <div style={{ fontSize: 12, color: C.border }}>—</div>
                  )}
                  {dayItems.map((it, j) => (
                    <div key={j}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: it.done ? C.muted : C.text, padding: '2px 0' }}>
                      {it.noteId && it.noteKind === 'task' ? (
                        <input type="checkbox" checked={!!it.done} onChange={() => onToggleCalNote && onToggleCalNote(it.noteId)}
                          style={{ width: 13, height: 13, flexShrink: 0, cursor: 'pointer', accentColor: C.accent }} />
                      ) : (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
                      )}
                      <span onClick={() => it.eventId && onSelectEvent && onSelectEvent(it.eventId)}
                        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: it.eventId ? 'pointer' : 'default', textDecoration: it.done ? 'line-through' : 'none' }}>
                        {it.label}
                      </span>
                      {it.noteId && onDeleteCalNote && (
                        <span onClick={() => onDeleteCalNote(it.noteId)} title="Remove"
                          style={{ flexShrink: 0, color: C.muted, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px' }}>×</span>
                      )}
                    </div>
                  ))}
                  <button data-addbtn onClick={() => { setSelDay(ds); setAddDay(ds); }}
                    style={{ marginTop: 3, fontSize: 11, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0', opacity: 0.45, transition: 'opacity .12s' }}>
                    + add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      {addDay && (
        <DayAddModal date={addDay} onClose={() => setAddDay(null)}
          onAdd={(date, text, kind) => { if (onAddCalNote) onAddCalNote(date, text, kind); }} />
      )}
    </div>
  );
}

// Quick-add modal for pinning a note / task / event to a specific calendar day.
// The "type of addition" lives here (not when simply selecting a day).
function DayAddModal({ date, onClose, onAdd }) {
  const C = useT();
  const s = makeS(C);
  const [kind, setKind] = useState('note');
  const [text, setText] = useState('');
  const KIND_COLOR = { note: C.muted, task: C.accent, event: C.accent2 };
  const KIND_HINT  = { note: 'Reminder, idea, or note for this day', task: 'A to-do you can check off', event: 'Something happening on this day' };
  const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const submit = () => { if (text.trim()) { onAdd(date, text, kind); onClose(); } };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70 }} />
      <div onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(400px, 92vw)', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, zIndex: 80, padding: 22, boxShadow: '0 18px 60px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>Add to calendar</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{dayLabel}</div>
          </div>
          <button onClick={onClose} style={{ ...s.btn('ghost'), fontSize: 16, padding: '4px 10px', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 7 }}>Type</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {['note', 'task', 'event'].map(k => (
              <button key={k} onClick={() => setKind(k)}
                style={{ flex: 1, fontSize: 12.5, fontWeight: 700, textTransform: 'capitalize', padding: '8px 0', borderRadius: 9, cursor: 'pointer',
                  border: `1.5px solid ${kind === k ? KIND_COLOR[k] : C.border}`,
                  background: kind === k ? KIND_COLOR[k] + '22' : 'transparent',
                  color: kind === k ? (KIND_COLOR[k] === C.muted ? C.text : KIND_COLOR[k]) : C.muted }}>{k}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{KIND_HINT[kind]}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 7 }}>Details</div>
          <input autoFocus value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder={`Add a ${kind}…`} style={{ ...s.input }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ ...s.btn('ghost') }}>Cancel</button>
          <button onClick={submit} disabled={!text.trim()} style={{ ...s.btn('primary'), opacity: text.trim() ? 1 : 0.5 }}>Add {kind}</button>
        </div>
      </div>
    </>
  );
}

function MainDashboard({ clients, events, onSelectClient, onSelectEvent, onNew, onNewClient, profile, onProfile, calNotes = [], onAddCalNote, onToggleCalNote, onDeleteCalNote }) {
  const C      = useT();
  const s      = makeS(C);
  const evtCLR = EVT_CLR(C);
  const bp = useContext(BpCtx);
  const isWide = bp === 'desktop' || bp === 'tablet-land';
  const [search, setSearch] = useState('');
  const [dashView, setDashView] = useState('dashboard');
  const eventsRef  = useRef(null);
  // Slim screens: tap a KPI to reveal its rows inline below the KPI row.
  const [showTasksMobile,    setShowTasksMobile]    = useState(false);
  const [showPaymentsMobile, setShowPaymentsMobile] = useState(false);
  const [showActionMobile,   setShowActionMobile]   = useState(false);

  // Total event value = sum of every event's budgeted total (what clients are spending overall).
  const totalEventValue  = useMemo(() => events.reduce((s, ev) => s + (ev.budget || []).reduce((b, r) => b + (r.budgeted || 0), 0), 0), [events]);
  // Vendor outstanding = balance still owed to committed (Contracted+) vendors across all events.
  const vendorOutstanding = useMemo(() => events.reduce((s, ev) => s + (ev.vendors || [])
    .filter(v => STAGES.indexOf(v.status) >= 2 && !v.balancePaid)
    .reduce((b, v) => b + Math.max(0, (v.cost || 0) - (v.depositAmt || 0)), 0), 0), [events]);

  const enrichedEvents = useMemo(() => events
    .map(e => ({ ...e, client: clients.find(c => (c.eventIds || []).includes(e.id)) }))
    .filter(e => !e.archived)
    .filter(e => {
      if (!search) return true;
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || (e.client?.name || '').toLowerCase().includes(q) || (e.venue || '').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [events, clients, search]);

  const filteredClients = useMemo(() => clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  }), [clients, search]);

  const urgentTasks = useMemo(() => events.flatMap(ev =>
    (ev.timeline || [])
      .filter(t => !t.done && isTaskOverdue(t, ev.date))
      .map(t => ({ ...t, eventId: ev.id, eventName: ev.name, eventType: ev.type }))
  ), [events]);

  const soonTasks = useMemo(() => events.flatMap(ev => {
    const days = daysUntil(ev.date);
    if (days === null || days < 0) return [];
    const phase = currentPhase(days);
    const phaseOrder = Object.keys(PHASE_OFFSET);
    const phaseIdx = phaseOrder.indexOf(phase);
    return (ev.timeline || [])
      .filter(t => !t.done && !isTaskOverdue(t, ev.date) && phaseOrder.indexOf(t.week) <= phaseIdx + 1 && phaseOrder.indexOf(t.week) >= 0)
      .map(t => ({ ...t, eventId: ev.id, eventName: ev.name, eventType: ev.type }));
  }), [events]);

  const taskInboxItems = useMemo(() => [...urgentTasks, ...soonTasks].slice(0, 12), [urgentTasks, soonTasks]);

  // Cross-event payment alerts — vendor balances due (or overdue) across all events
  const paymentAlerts = useMemo(() => events.flatMap(ev =>
    (ev.vendors || [])
      .filter(v => v.payDueDate && !v.balancePaid && (v.cost - v.depositAmt) > 0)
      .map(v => ({
        id: v.id, eventId: ev.id, eventName: ev.name, eventType: ev.type,
        vendorName: v.name, balance: v.cost - v.depositAmt,
        dueDate: v.payDueDate, daysLeft: daysUntil(v.payDueDate),
      }))
      .filter(v => v.daysLeft !== null && v.daysLeft <= 45)
  ).sort((a, b) => a.daysLeft - b.daysLeft), [events]);

  const overduePayCount = paymentAlerts.filter(p => p.daysLeft < 0).length;
  const totalDueSoon    = paymentAlerts.reduce((s, p) => s + p.balance, 0);

  // Cross-client comms needing attention — unresolved approval requests
  const commAlerts = useMemo(() => clients.flatMap(c => {
    const p = clientPendingComms(c);
    return p.approvals.map(e => ({ clientId: c.id, clientName: c.name, text: e.text || '', sent: !!e.requestSentAt, date: e.requestSentAt || e.date }));
  }).sort((a, b) => (a.sent - b.sent)), [clients]); // not-yet-sent (planner's move) first
  const needsSendCount = commAlerts.filter(a => !a.sent).length;

  // ── Shared row renderers — reused by both the desktop KPI panels and the
  //    slim-screen inline expansions so the markup stays in one place. ──
  const taskRows = () => taskInboxItems.map((t, i) => {
    const overdue = urgentTasks.some(u => u.id === t.id && u.eventId === t.eventId);
    const clr = evtCLR[t.eventType] || C.muted;
    return (
      <div key={`${t.eventId}-${t.id}`}
        onClick={() => onSelectEvent(t.eventId, { tab: 'Planning Tasks', taskId: t.id })}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < taskInboxItems.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
      >
        <div style={mkDot(overdue ? C.danger : C.warn, 7)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: overdue ? C.danger : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.task || 'Untitled task'}</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: clr }}>{t.eventName}</span>
            {t.week !== 'Custom' && <span> · {t.week}</span>}
            {t.owner && <span> · {t.owner}</span>}
          </div>
        </div>
        {overdue && <span style={{ ...s.pill(C.danger), fontSize: 9, flexShrink: 0 }}>Overdue</span>}
        <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>›</span>
      </div>
    );
  });

  const paymentRows = () => paymentAlerts.slice(0, 10).map((p, i) => {
    const overdue = p.daysLeft < 0;
    const urgent  = p.daysLeft >= 0 && p.daysLeft <= 14;
    const clr     = overdue ? C.danger : urgent ? C.warn : C.accent2;
    const dueLabel = overdue ? `${Math.abs(p.daysLeft)}d overdue` : p.daysLeft === 0 ? 'Due today' : `${p.daysLeft}d`;
    return (
      <div key={`${p.eventId}-${p.id}`}
        onClick={() => onSelectEvent(p.eventId, { tab: 'Vendors', vendorId: p.id })}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < Math.min(paymentAlerts.length, 10) - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
      >
        <div style={mkDot(clr, 7)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: overdue ? C.danger : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.vendorName} <span style={{ color: C.muted }}>— {fmtD(p.balance)}</span></div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: evtCLR[p.eventType] || C.muted }}>{p.eventName}</span>
            <span> · due {fmtDate(p.dueDate)}</span>
          </div>
        </div>
        <span style={{ ...s.pill(clr), fontSize: 9, flexShrink: 0 }}>{dueLabel}</span>
        <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>›</span>
      </div>
    );
  });

  const commRows = () => commAlerts.slice(0, 10).map((a, i) => {
    const clr = a.sent ? C.warn : C.danger;
    return (
      <div key={`${a.clientId}-${i}`}
        onClick={() => onSelectClient(a.clientId)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < Math.min(commAlerts.length, 10) - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
      >
        <div style={mkDot(clr, 7)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✋ {a.text || 'Approval request'}</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.clientName}</div>
        </div>
        <span style={{ ...s.pill(clr), fontSize: 9, flexShrink: 0 }}>{a.sent ? 'Awaiting client' : 'Send to client'}</span>
        <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>›</span>
      </div>
    );
  });

  const pad   = bp === 'mobile' ? '20px 14px' : bp === 'tablet' ? '20px 20px' : '28px 36px';
  const inner = { maxWidth: 1200, margin: '0 auto' };
  return (
    <div style={s.app}>
      <div style={{ padding: pad, borderBottom: `1px solid ${C.border}` }}>
        <div style={inner}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: bp === 'mobile' ? 22 : 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>NGW Event Boss</h1>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Your events and what needs attention.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
                {[['dashboard','Overview'],['calendar','Calendar']].map(([id, label]) => (
                  <button key={id} onClick={() => setDashView(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: dashView === id ? 700 : 400, color: dashView === id ? C.text : C.muted, borderBottom: dashView === id ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom: -1 }}>{label}</button>
                ))}
              </div>
              <button style={{ ...s.btn(), fontSize: 13, padding: '7px 14px' }} onClick={onNewClient}>+ Client</button>
              <button style={{ ...s.btn('primary'), fontSize: 13, padding: '7px 14px' }} onClick={onNew}>+ Event</button>
              <ThemeToggle />
              {onProfile && <button onClick={onProfile} style={{ ...mkSphere(C.accent, 34, 13), border: 'none', cursor: 'pointer' }}>{(profile?.name || 'P').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</button>}
            </div>
          </div>

          {dashView === 'dashboard' && (clients.length > 0 || events.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: isWide ? 'repeat(auto-fit, minmax(190px, 1fr))' : 'repeat(2, 1fr)', gap: 14, marginBottom: 20, alignItems: 'stretch' }}>
              <StatCard label="Contracted Value" value={fmtD(totalEventValue)}    sub="total event budgets"  color={C.accent2}                                                                               onClick={() => setDashView('events')} />
              <StatCard label="Vendor Outstanding" value={fmtD(vendorOutstanding)} sub="balance due to vendors" color={vendorOutstanding > 0 ? C.warn : C.muted}                                            onClick={() => setDashView('events')} />

              {/* Task Inbox */}
              {isWide ? (
                <KpiInboxPanel
                  label={`Task Inbox${taskInboxItems.length ? ` (${taskInboxItems.length}${urgentTasks.length ? ` · ${urgentTasks.length} overdue` : ''})` : ''}`}
                  hasItems={taskInboxItems.length > 0} empty="All caught up — no open tasks.">
                  {taskRows()}
                </KpiInboxPanel>
              ) : (
                <StatCard label="Task Inbox" value={urgentTasks.length + soonTasks.length} sub={showTasksMobile ? 'tap to hide' : (urgentTasks.length > 0 ? `${urgentTasks.length} overdue` : 'on track')} color={urgentTasks.length > 0 ? C.danger : C.accent} onClick={() => setShowTasksMobile(v => !v)} />
              )}

              {/* Payments Due */}
              {paymentAlerts.length > 0 && (isWide ? (
                <KpiInboxPanel
                  label={`Payments Due (${paymentAlerts.length}${overduePayCount > 0 ? ` · ${overduePayCount} overdue` : ''})`}
                  headerRight={<span style={{ fontSize: 11, fontWeight: 700, color: overduePayCount > 0 ? C.danger : C.warn, flexShrink: 0 }}>{fmtD(totalDueSoon)}</span>}
                  hasItems empty="">
                  {paymentRows()}
                </KpiInboxPanel>
              ) : (
                <StatCard label="Payments Due" value={paymentAlerts.length} sub={showPaymentsMobile ? 'tap to hide' : `${fmtD(totalDueSoon)} due${overduePayCount > 0 ? ` · ${overduePayCount} overdue` : ''}`} color={overduePayCount > 0 ? C.danger : C.warn} onClick={() => setShowPaymentsMobile(v => !v)} />
              ))}

              {/* Action Required */}
              {commAlerts.length > 0 && (isWide ? (
                <KpiInboxPanel
                  label={`Action Required (${commAlerts.length})`}
                  headerRight={needsSendCount > 0 ? <span style={{ ...s.pill(C.danger), fontSize: 9, flexShrink: 0 }}>{needsSendCount} to send</span> : null}
                  hasItems empty="">
                  {commRows()}
                </KpiInboxPanel>
              ) : (
                <StatCard label="Action Required" value={commAlerts.length} sub={showActionMobile ? 'tap to hide' : (needsSendCount > 0 ? `${needsSendCount} to send` : 'awaiting client')} color={needsSendCount > 0 ? C.danger : C.warn} onClick={() => setShowActionMobile(v => !v)} />
              ))}
            </div>
          )}

          {/* Slim screens: tapping a KPI reveals its rows here, inline. */}
          {dashView === 'dashboard' && !isWide && showTasksMobile && taskInboxItems.length > 0 && (
            <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>{taskRows()}</div>
          )}
          {dashView === 'dashboard' && !isWide && showPaymentsMobile && paymentAlerts.length > 0 && (
            <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>{paymentRows()}</div>
          )}
          {dashView === 'dashboard' && !isWide && showActionMobile && commAlerts.length > 0 && (
            <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>{commRows()}</div>
          )}

          {dashView === 'dashboard' && (
            <input
              style={{ ...s.input, maxWidth: 420 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients, events, venues…"
            />
          )}
        </div>
      </div>

      {dashView === 'calendar' && (
        <MasterCalendarView events={events} onSelectEvent={onSelectEvent} />
      )}

      {dashView === 'dashboard' && <div style={{ padding: bp === 'mobile' ? '14px' : bp === 'tablet' ? '16px 20px' : '28px 36px' }}>
        <div style={inner}>

        {/* ── Dashboard body: events + what needs attention (clients live on their own view) ── */}
        <div>

          {/* Desktop: events (left) + calendar (right). Mobile: events only (calendar below). */}
          <div>
            {enrichedEvents.length > 0 && (
              <div style={{ display: isWide ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', marginBottom: 32 }}>
                <div ref={eventsRef}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 14 }}>
                  Upcoming Events ({enrichedEvents.length})
                </div>
                <div style={{ ...s.card, padding: 0, overflow: 'hidden', marginBottom: 0 }}>
                  {enrichedEvents.map((ev, i) => {
                    const days  = daysUntil(ev.date);
                    const color = evtCLR[ev.type] || C.muted;
                    const conf  = (ev.guests || []).filter(g => g.rsvp === 'Yes').length;
                    const vConf = (ev.vendors || []).filter(v => v.status === 'Confirmed').length;
                    const tasksDone = (ev.timeline || []).filter(t => t.done).length;
                    const tasksTot  = (ev.timeline || []).length;
                    return (
                      <div key={ev.id} onClick={() => onSelectEvent(ev.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 16px', borderBottom: i < enrichedEvents.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                      >
                        <div style={mkDot(color, 9)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                            <span style={{ ...s.pill(color), flexShrink: 0 }}>{ev.type}</span>
                            {days !== null && <span style={{ ...s.pill(days <= 30 ? C.danger : days <= 90 ? C.warn : C.muted), fontSize: 10, flexShrink: 0 }}>{days > 0 ? `${days}d` : days === 0 ? 'Today' : `${Math.abs(days)}d ago`}</span>}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[ev.client?.name, ev.date && fmtDate(ev.date), `${conf} conf`, `${vConf}/${(ev.vendors || []).length} vend`, `${tasksDone}/${tasksTot} tasks`].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>›</span>
                      </div>
                    );
                  })}
                </div>
                </div>{/* /events column */}
                {isWide && <DashWeekView events={events} onSelectEvent={onSelectEvent} calNotes={calNotes} onAddCalNote={onAddCalNote} onToggleCalNote={onToggleCalNote} onDeleteCalNote={onDeleteCalNote} />}
              </div>
            )}

            {/* Mobile/tablet: calendar below events */}
            {!isWide && events.length > 0 && <DashWeekView events={events} onSelectEvent={onSelectEvent} calNotes={calNotes} onAddCalNote={onAddCalNote} onToggleCalNote={onToggleCalNote} onDeleteCalNote={onDeleteCalNote} />}
          </div>

        </div>{/* /dashboard body */}

        {clients.length === 0 && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Start planning</div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>Add your first client or event to get started.</p>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>
              <strong style={{ color: C.accent }}>Tip:</strong> Create a Client first — it connects the RSVP page, thank-you tracker, and planner fee collection to every event automatically.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={s.btn('primary')} onClick={onNewClient}>+ New Client</button>
              <button style={s.btn()} onClick={onNew}>+ New Event</button>
            </div>
          </div>
        )}
        </div>{/* /inner */}
      </div>}

      {/* ── Clients list page ── */}
      {dashView === 'clients' && (
        <div style={{ padding: bp === 'mobile' ? '14px' : bp === 'tablet' ? '16px 20px' : '28px 36px' }}>
          <div style={inner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setDashView('dashboard')} style={{ ...s.btn('ghost'), fontSize: 12, padding: '4px 10px' }}>← Overview</button>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>All Clients ({clients.length})</h2>
              <button style={{ ...s.btn('primary'), marginLeft: 'auto' }} onClick={onNewClient}>+ New Client</button>
            </div>
            {filteredClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>No clients yet — add your first client to get started.</div>
            ) : (
              <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                {filteredClients.map((c, i) => {
                  const clientEvents = events.filter(e => (c.eventIds || []).includes(e.id));
                  const collected    = (c.feeSchedule || []).reduce((s, f) => s + (f.paid ? f.amount : (f.paidAmount || 0)), 0);
                  const outstanding  = (c.plannerFee || 0) - collected;
                  const initials     = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const nextEvt      = [...clientEvents].sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
                  const clrDot       = (nextEvt ? evtCLR[nextEvt.type] : null) || CLIENT_CLR(C)[c.status] || C.muted;
                  return (
                    <div key={c.id} onClick={() => onSelectClient(c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < filteredClients.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <div style={mkSphere(clrDot, 40, 13)}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                          <span style={s.pill(clrDot)}>{c.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>· {c.phone}</span>}
                          {clientEvents.length > 0 && <span>· {clientEvents.length} event{clientEvents.length !== 1 ? 's' : ''}</span>}
                        </div>
                        <div style={{ marginTop: 5, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {clientEvents.map(e => (
                            <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <span style={mkDot(evtCLR[e.type] || C.muted, 5)} />
                              <span style={{ color: C.muted }}>{e.name}{e.date ? ` · ${fmtDate(e.date)}` : ''}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmtD(c.plannerFee || 0)}</div>
                        <div style={{ fontSize: 11, color: outstanding > 0 ? C.warn : C.muted }}>{outstanding > 0 ? `${fmtD(outstanding)} outstanding` : 'Paid in full'}</div>
                      </div>
                      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Events list page ── */}
      {dashView === 'events' && (
        <div style={{ padding: bp === 'mobile' ? '14px' : bp === 'tablet' ? '16px 20px' : '28px 36px' }}>
          <div style={inner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setDashView('dashboard')} style={{ ...s.btn('ghost'), fontSize: 12, padding: '4px 10px' }}>← Overview</button>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>All Events ({enrichedEvents.length})</h2>
              <button style={{ ...s.btn('primary'), marginLeft: 'auto' }} onClick={onNew}>+ New Event</button>
            </div>
            {enrichedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>No events yet — add your first event to get started.</div>
            ) : (
              <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                {enrichedEvents.map((ev, i) => {
                  const days  = daysUntil(ev.date);
                  const color = evtCLR[ev.type] || C.muted;
                  const conf  = (ev.guests || []).filter(g => g.rsvp === 'Yes').length;
                  const vConf = (ev.vendors || []).filter(v => v.status === 'Confirmed').length;
                  const done  = (ev.timeline || []).filter(t => t.done).length;
                  const total = (ev.timeline || []).length;
                  const evCommitted = (ev.vendors || []).filter(v => STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0);
                  const evSpent     = (ev.budget  || []).reduce((s, r) => s + r.actual, 0);
                  const balanceDue  = Math.max(0, evCommitted - evSpent);
                  return (
                    <div key={ev.id} onClick={() => onSelectEvent(ev.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < enrichedEvents.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <div style={mkDot(color, 10)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{ev.name}</span>
                          <span style={s.pill(color)}>{ev.type}</span>
                          {days !== null && <span style={{ ...s.pill(days <= 30 ? C.danger : days <= 90 ? C.warn : C.muted), fontSize: 10 }}>{days > 0 ? `${days}d away` : days === 0 ? 'Today' : `${Math.abs(days)}d ago`}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {ev.client && <span>{ev.client.name}</span>}
                          {ev.venue && <span>· {ev.venue}</span>}
                          {ev.date && <span>· {fmtDate(ev.date)}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 14, marginTop: 5, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
                          <span>{conf} confirmed guests</span>
                          <span>·</span>
                          <span>{vConf}/{(ev.vendors || []).length} vendors</span>
                          <span>·</span>
                          <span style={{ color: done === total && total > 0 ? C.success : C.muted }}>{done}/{total} tasks</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: evCommitted === 0 ? C.muted : balanceDue === 0 ? C.success : C.warn }}>
                          {evCommitted === 0 ? '—' : balanceDue === 0 ? 'Paid' : fmtD(balanceDue)}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>balance due</div>
                      </div>
                      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Client Detail ────────────────────────────────────────────────────────────

function ClientDetail({ client, events, setClient, profile, onSelectEvent, onAddEvent, onBack, onDelete, onUpdateEventGuests, onLinkEvent }) {
  const C         = useT();
  const s         = makeS(C);
  const clientCLR = CLIENT_CLR(C);
  const evtCLR    = EVT_CLR(C);
  const bp        = useContext(BpCtx);
  const isWide    = bp === 'desktop' || bp === 'tablet-land';
  const [showModal,       setShowModal]       = useState(false);
  const [showPortal,      setShowPortal]      = useState(false);
  const [newLog,          setNewLog]          = useState('');
  const [newLogType,      setNewLogType]      = useState('note');
  const [newInternalLog,  setNewInternalLog]  = useState('');
  const [newInternalType, setNewInternalType] = useState('note');
  const [commTab,         setCommTab]         = useState('client');
  const [logSearch,       setLogSearch]       = useState('');
  const [showLinkEvent,   setShowLinkEvent]   = useState(false);
  const [linkEventId,     setLinkEventId]     = useState('');
  const [showDownloads,   setShowDownloads]   = useState(false);

  const clientEvents = events.filter(e => (client.eventIds || []).includes(e.id));
  const collected    = (client.feeSchedule || []).reduce((s, f) => s + (f.paid ? f.amount : (f.paidAmount || 0)), 0);
  const outstanding  = (client.plannerFee || 0) - collected;
  const clr          = clientCLR[client.status] || C.muted;

  const onChange = (key, val) => setClient(c => ({ ...c, [key]: val }));

  const addLog = () => {
    if (!newLog.trim()) return;
    const entry = { id: uid(), date: today8601(), text: newLog.trim(), type: newLogType, channel: 'client' };
    if (newLogType === 'approval_request') entry.approvalStatus = 'pending';
    onChange('log', [...(client.log || []), entry]);
    setNewLog('');
    setNewLogType('note');
  };

  const addInternalLog = () => {
    if (!newInternalLog.trim()) return;
    onChange('internalLog', [...(client.internalLog || []), { id: uid(), date: today8601(), text: newInternalLog.trim(), type: newInternalType, channel: 'internal' }]);
    setNewInternalLog('');
    setNewInternalType('note');
  };

  const setApprovalStatus = (entryId, status) => {
    onChange('log', (client.log || []).map(e => e.id === entryId ? { ...e, approvalStatus: status } : e));
  };

  // Approval request → outbound message to the client (opens their email/SMS draft — never auto-sends)
  const markRequestSent = (entryId) => {
    onChange('log', (client.log || []).map(e => e.id === entryId ? { ...e, requestSentAt: today8601() } : e));
  };
  const buildApprovalMessage = (entry) => {
    const planner = profile?.businessName || profile?.name || 'your event planner';
    const signoff = [profile?.name, profile?.businessName, profile?.phone].filter(Boolean).join('\n');
    const subject = `Approval needed — ${planner}`;
    const body = `Hi ${client?.name || 'there'},\n\nQuick approval needed before I move forward:\n\n"${entry.text}"\n\nJust reply to confirm and I'll take it from there. Thank you!\n\n${signoff || planner}`;
    return { subject, body };
  };

  // ── Shared card sections so they can be reordered per breakpoint ─────────────
  const feeCard = (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={s.cardTitle}>Planner Fee</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtD(client.plannerFee || 0)}</div>
      </div>
      <div style={{ display: 'flex', gap: 28, marginBottom: (client.feeSchedule || []).length > 0 ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Collected</div>
          <div style={{ ...s.statNum(C.success), fontSize: 22 }}>{fmtD(collected)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Outstanding</div>
          <div style={{ ...s.statNum(outstanding > 0 ? C.warn : C.muted), fontSize: 22 }}>{fmtD(outstanding)}</div>
        </div>
      </div>
      {(client.feeSchedule || []).length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted }}>No installments — click Edit Client to add a fee schedule.</div>
      ) : (client.feeSchedule || []).map(f => {
        const dLeft    = daysUntil(f.due);
        const urgent   = !f.paid && dLeft !== null && dLeft <= 14;
        const partial  = !f.paid && (f.paidAmount || 0) > 0;
        const updateF  = (key, val) => onChange('feeSchedule', (client.feeSchedule || []).map(x => x.id === f.id ? { ...x, [key]: val } : x));
        return (
          <div key={f.id} style={{ padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
                {f.due && <div style={{ fontSize: 11, color: urgent ? C.danger : C.muted }}>Due {fmtDate(f.due)}{urgent ? ' — URGENT' : ''}</div>}
                {f.paid && f.paymentMethod && <div style={{ fontSize: 11, color: C.success }}>Paid via {f.paymentMethod}</div>}
                {partial && <div style={{ fontSize: 11, color: C.warn }}>{fmtD(f.paidAmount)} received · {fmtD(f.amount - f.paidAmount)} balance due</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtD(f.amount)}</span>
                <button
                  style={{ ...s.btn(f.paid ? 'success' : partial ? 'teal' : 'default'), fontSize: 11, padding: '4px 10px' }}
                  onClick={() => {
                    if (f.paid) {
                      // toggle unpaid — clear paidAmount too
                      onChange('feeSchedule', (client.feeSchedule || []).map(x => x.id === f.id ? { ...x, paid: false, paidAmount: 0 } : x));
                    } else {
                      // mark fully paid
                      onChange('feeSchedule', (client.feeSchedule || []).map(x => x.id === f.id ? { ...x, paid: true, paidAmount: f.amount } : x));
                    }
                  }}
                  title={f.paid ? 'Click to mark unpaid' : 'Click to mark fully paid'}
                >
                  {f.paid ? '✓ Paid' : partial ? '⟳ Mark Full' : 'Mark Paid'}
                </button>
              </div>
            </div>
            {!f.paid && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select style={{ ...s.input, fontSize: 11, flex: '0 0 auto', width: 'auto', minWidth: 130 }}
                  value={f.paymentMethod || ''}
                  onChange={e => updateF('paymentMethod', e.target.value)}>
                  <option value="">Payment method…</option>
                  {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', flex: '0 0 auto' }}>
                  <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>Partial: $</span>
                  <input
                    type="number"
                    min="0"
                    max={f.amount}
                    step="0.01"
                    placeholder="0"
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: (f.paidAmount || 0) > 0 ? C.warn : C.text, width: 64, fontFamily: "'Inter', system-ui, sans-serif" }}
                    value={f.paidAmount || ''}
                    onChange={e => updateF('paidAmount', Math.min(Number(e.target.value) || 0, f.amount))}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const notesCard = (client.style || client.notes) ? (
    <div style={s.card}>
      {client.style && (
        <div style={{ marginBottom: client.notes ? 16 : 0 }}>
          <div style={s.cardTitle}>Style & Vision</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{client.style}</div>
        </div>
      )}
      {client.notes && (
        <div>
          <div style={s.cardTitle}>Internal Notes</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.muted }}>{client.notes}</div>
        </div>
      )}
    </div>
  ) : null;

  // Events not yet linked to this client
  const unlinkableEvents = events.filter(ev => !(client.eventIds || []).includes(ev.id));

  const eventsSection = (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showLinkEvent ? 8 : 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Events ({clientEvents.length})</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {onLinkEvent && unlinkableEvents.length > 0 && (
            <button style={{ ...s.btn(), fontSize: 11, padding: '5px 10px' }} onClick={() => { setShowLinkEvent(v => !v); setLinkEventId(''); }}>
              ⊕ Link Existing
            </button>
          )}
          <button style={s.btn()} onClick={onAddEvent}>+ New Event</button>
        </div>
      </div>
      {showLinkEvent && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', padding: '10px 14px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <select style={{ ...s.input, flex: 1, fontSize: 12 }} value={linkEventId} onChange={e => setLinkEventId(e.target.value)}>
            <option value="">Select an event to link…</option>
            {unlinkableEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}{ev.date ? ` · ${fmtDate(ev.date)}` : ''}{ev.type ? ` (${ev.type})` : ''}</option>
            ))}
          </select>
          <button style={{ ...s.btn('primary'), fontSize: 12, padding: '6px 14px' }}
            disabled={!linkEventId}
            onClick={() => { if (linkEventId) { onLinkEvent(linkEventId); setShowLinkEvent(false); setLinkEventId(''); } }}>
            Link
          </button>
          <button style={{ ...s.btn(), fontSize: 12, padding: '6px 10px' }} onClick={() => { setShowLinkEvent(false); setLinkEventId(''); }}>Cancel</button>
        </div>
      )}
      {clientEvents.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>No events yet</div>
          <button style={s.btn('primary')} onClick={onAddEvent}>+ Add First Event</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clientEvents.map(ev => {
            const days  = daysUntil(ev.date);
            const evClr = evtCLR[ev.type] || C.muted;
            const vConf = (ev.vendors || []).filter(v => v.status === 'Confirmed').length;
            const gConf = (ev.guests  || []).filter(g => g.rsvp === 'Yes').length;
            const tDone = (ev.timeline || []).filter(t => t.done).length;
            const tTot  = (ev.timeline || []).length;
            return (
              <div key={ev.id} onClick={() => onSelectEvent(ev.id)}
                style={{ ...s.card, cursor: 'pointer', marginBottom: 0, borderLeft: `3px solid ${evClr}`, transition: 'background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.surface; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{ev.type}{ev.venue ? ` · ${ev.venue}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {days !== null && <span style={s.pill(days <= 30 ? C.danger : days <= 90 ? C.warn : evClr)}>{days > 0 ? `${days}d` : days === 0 ? 'Today' : 'Done'}</span>}
                    {ev.date && <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(ev.date)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.muted, flexWrap: 'wrap' }}>
                  <span>{gConf} confirmed guests</span>
                  <span>·</span>
                  <span>{vConf} vendors confirmed</span>
                  {tTot > 0 && <><span>·</span><span style={{ color: tDone === tTot ? C.success : C.muted }}>{tDone}/{tTot} tasks</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const logCard = (() => {
    const isClient    = commTab === 'client';
    const activeLog   = isClient ? (client.log || []) : (client.internalLog || []);
    const msgTypes    = isClient ? CLIENT_MSG_TYPES : INTERNAL_MSG_TYPES;
    const activeType  = isClient ? newLogType : newInternalType;
    const setType     = isClient ? setNewLogType : setNewInternalType;
    const activeInput = isClient ? newLog : newInternalLog;
    const setInput    = isClient ? setNewLog : setNewInternalLog;
    const handleAdd   = isClient ? addLog : addInternalLog;
    const internalCount = (client.internalLog || []).length;

    const q = logSearch.trim().toLowerCase();
    const sorted = [...activeLog].reverse();
    const filtered = sorted.filter(e =>
      !q || e.text.toLowerCase().includes(q) || fmtDate(e.date).toLowerCase().includes(q)
    );

    return (
      <div style={s.card}>
        {/* ── Channel tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, rowGap: 8, marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Channel</div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {[['client', '💬 Client', null], ['internal', '🔒 Internal', internalCount || null]].map(([key, label, badge]) => {
              const active = commTab === key;
              return (
                <button key={key} onClick={() => { setCommTab(key); setLogSearch(''); }}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: active ? 700 : 500, border: `1.5px solid ${active ? (key === 'internal' ? C.warn : C.accent) : C.border}`, background: active ? (key === 'internal' ? C.warn + '14' : C.accent + '14') : 'transparent', color: active ? (key === 'internal' ? C.warn : C.accent) : C.muted, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s' }}>
                  {label}
                  {badge && <span style={{ background: key === 'internal' ? C.warn : C.accent, color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{badge}</span>}
                </button>
              );
            })}
          </div>
          {activeLog.length > 2 && (
            <div style={{ position: 'relative', flex: '1 1 130px', minWidth: 130 }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.muted, pointerEvents: 'none' }}>🔍</span>
              <input style={{ ...s.input, padding: '4px 8px 4px 24px', fontSize: 11, width: '100%' }} placeholder="Search…" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
            </div>
          )}
        </div>

        {/* ── Internal channel notice ── */}
        {!isClient && (
          <div style={{ padding: '8px 12px', background: C.warn + '10', border: `1px solid ${C.warn}30`, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.warn, fontWeight: 600 }}>🔒 Planner-only — never visible to client</div>
          </div>
        )}

        {/* ── Message type selector ── */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {msgTypes.map(({ type, icon, label }) => {
            const ts = msgTypeStyle(type, C);
            const active = activeType === type;
            return (
              <button key={type} onClick={() => setType(type)}
                style={{ padding: '3px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${active ? ts.border : C.border}`, background: active ? ts.bg : 'transparent', color: active ? ts.border : C.muted, fontWeight: active ? 700 : 400, transition: 'all 0.1s', display: 'flex', alignItems: 'center', gap: 4 }}>
                {icon} {label}
              </button>
            );
          })}
        </div>

        {/* ── Input ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            style={{ ...s.input, flex: 1, fontSize: 13 }}
            value={activeInput}
            placeholder={
              activeType === 'approval_request' ? 'Describe what needs approval…'
              : activeType === 'decision' ? 'Record the decision…'
              : activeType === 'update' ? 'Operational update…'
              : activeType === 'concern' ? 'Describe the concern…'
              : activeType === 'escalation' ? 'Describe the escalation…'
              : isClient ? 'Log a call, email, meeting, decision…'
              : 'Internal planner note…'
            }
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button style={s.btn('primary')} onClick={handleAdd}>Add</button>
        </div>

        {/* ── Entries ── */}
        {activeLog.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
            {isClient ? 'No client communication yet.' : 'No internal notes yet.'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No entries match "{logSearch}".</div>
        ) : filtered.map(entry => {
          const ts = msgTypeStyle(entry.type, C);
          const isApproval = entry.type === 'approval_request';
          const statusColor = entry.approvalStatus === 'approved' ? C.success : entry.approvalStatus === 'declined' ? C.danger : C.warn;
          return (
            <div key={entry.id} style={{ borderLeft: `3px solid ${ts.border}`, paddingLeft: 12, marginBottom: 14, background: ts.bg, borderRadius: '0 6px 6px 0', padding: '8px 10px 8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: ts.border || C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {ts.icon} {ts.label}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(entry.date)}</span>
                {isApproval && entry.approvalStatus && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {entry.approvalStatus === 'pending' ? '⏳ Pending' : entry.approvalStatus === 'approved' ? '✓ Approved' : '✗ Declined'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: C.text }}>{entry.text}</div>
              {isApproval && (!entry.approvalStatus || entry.approvalStatus === 'pending') && (() => {
                const { subject, body } = buildApprovalMessage(entry);
                const mailto = client?.email ? `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
                const sms    = client?.phone ? `sms:${client.phone}?body=${encodeURIComponent(body)}` : null;
                return (
                  <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Send the request to the client */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', width: 56 }}>Request</span>
                      {mailto && <a href={mailto} onClick={() => markRequestSent(entry.id)} style={{ ...s.btn(), fontSize: 11, padding: '3px 10px', textDecoration: 'none' }}>✉ Email</a>}
                      {sms    && <a href={sms}    onClick={() => markRequestSent(entry.id)} style={{ ...s.btn(), fontSize: 11, padding: '3px 10px', textDecoration: 'none' }}>💬 Text</a>}
                      <button onClick={() => { navigator.clipboard?.writeText(body).catch(() => {}); markRequestSent(entry.id); }} style={{ ...s.btn('ghost'), fontSize: 11, padding: '3px 10px' }}>⎘ Copy</button>
                      {entry.requestSentAt && <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>Sent ✓ {fmtDate(entry.requestSentAt)}</span>}
                      {!mailto && !sms && !entry.requestSentAt && <span style={{ fontSize: 10, color: C.muted }}>Add client email/phone to send directly</span>}
                    </div>
                    {/* Record the client's response */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', width: 56 }}>Response</span>
                      <button onClick={() => setApprovalStatus(entry.id, 'approved')}
                        style={{ padding: '3px 12px', borderRadius: 16, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${C.success}`, background: C.success + '14', color: C.success, fontWeight: 700 }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => setApprovalStatus(entry.id, 'declined')}
                        style={{ padding: '3px 12px', borderRadius: 16, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${C.danger}`, background: C.danger + '14', color: C.danger, fontWeight: 700 }}>
                        ✗ Decline
                      </button>
                    </div>
                  </div>
                );
              })()}
              {isApproval && entry.requestSentAt && entry.approvalStatus && entry.approvalStatus !== 'pending' && (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Requested {fmtDate(entry.requestSentAt)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  })();

  const bodyPad  = bp === 'mobile' ? '16px 14px' : bp === 'tablet' ? '20px 20px' : '28px 36px';
  const maxW     = 1200;

  return (
    <div style={s.app} onClick={() => showDownloads && setShowDownloads(false)}>
      {/* Header */}
      <div style={{ ...s.header, padding: bp === 'mobile' ? '16px 14px 0' : '28px 32px 0', paddingBottom: isWide ? 20 : 14 }}>
        <div style={{ maxWidth: maxW, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={{ ...s.btn('ghost'), fontSize: 12, padding: '4px 10px' }}>← Clients</button>
            <span style={{ color: C.border, fontSize: 18 }}>|</span>
            <div style={{ fontSize: bp === 'mobile' ? 17 : 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{client.name}</div>
            <span style={s.pill(clr)}>{client.status}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
              {isWide && <button style={s.btn('teal')} onClick={() => setShowPortal(true)}>Client Portal</button>}
              <button style={s.btn()} onClick={() => setShowModal(true)}>Edit</button>
              {!isWide && <button style={s.btn('teal')} onClick={() => setShowPortal(true)}>Portal</button>}
              <button style={{ ...s.btn('ghost'), display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => setShowDownloads(v => !v)}>⬇ Downloads</button>
              {showDownloads && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 200,
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 16,
                  minWidth: 320,
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Downloads</div>
                  {clientEvents.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.muted }}>Link an event to enable downloads.</div>
                  ) : clientEvents.map(ev => (
                    <div key={ev.id} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>{ev.name}</div>
                      <DownloadsCard event={ev} client={client} compact />
                    </div>
                  ))}
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Template (no event)</div>
                    <DownloadsCard event={{ name: client.name, guests: [] }} client={client} compact />
                  </div>
                  <button onClick={() => setShowDownloads(false)}
                    style={{ marginTop: 10, width: '100%', ...s.btn('ghost'), fontSize: 11 }}>Close</button>
                </div>
              )}
            </div>
          </div>
          {/* Clickable contact line */}
          {(client.email || client.phone || client.referral) && (
            <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {client.email && (
                <a href={`mailto:${client.email}`} style={{ color: C.accent, textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  ✉ {client.email}
                </a>
              )}
              {client.email && client.phone && <span>·</span>}
              {client.phone && (
                <a href={`tel:${client.phone}`} style={{ color: C.accent2, textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  📞 {client.phone}
                </a>
              )}
              {client.referral && <><span>·</span><span>Via {client.referral}</span></>}
            </div>
          )}
        </div>
      </div>

      {/* Body — desktop: 2-col fixed; mobile/tablet: stacked */}
      <div style={{ padding: bodyPad }}>
        <div style={{ maxWidth: maxW, margin: '0 auto' }}>

          {/* ── At-a-glance status strip: what needs attention for this client ── */}
          {(() => {
            const pc = clientPendingComms(client);
            const nextEvt = [...clientEvents].filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date))[0];
            const chips = [];
            if (pc.needsSend.length) chips.push({ t: `✋ ${pc.needsSend.length} approval${pc.needsSend.length > 1 ? 's' : ''} to send`, c: C.danger });
            if (pc.awaiting.length)  chips.push({ t: `⏳ ${pc.awaiting.length} awaiting client`, c: C.warn });
            if (outstanding > 0)     chips.push({ t: `${fmtD(outstanding)} outstanding`, c: C.warn });
            else if ((client.plannerFee || 0) > 0) chips.push({ t: '✓ Paid in full', c: C.success });
            if (nextEvt) chips.push({ t: `Next: ${nextEvt.name} · ${fmtDate(nextEvt.date)}`, c: C.accent });
            if (chips.length === 0) return null;
            return (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                {chips.map((ch, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, color: ch.c, background: ch.c + '14', border: `1px solid ${ch.c}33`, borderRadius: 20, padding: '5px 12px' }}>{ch.t}</span>
                ))}
              </div>
            );
          })()}

          {isWide ? (
            /* ── Desktop / tablet-land: fixed 2-col ── */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>
              {/* Left — primary activity */}
              <div>
                {eventsSection}
                {logCard}
              </div>
              {/* Right — fee + meta */}
              <div>
                {feeCard}
                {notesCard}
              </div>
            </div>
          ) : (
            /* ── Mobile / tablet portrait: stacked ── */
            <div>
              {eventsSection}
              {feeCard}
              {logCard}
              {notesCard}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ClientModal client={client} onClose={() => setShowModal(false)} onChange={onChange} onDelete={() => { setShowModal(false); onDelete(); }} />
      )}
      {showPortal && (
        <ClientPortal client={client} events={events} onClose={() => setShowPortal(false)} onUpdateGuests={onUpdateEventGuests} />
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ budget, guests, vendors, timeline, catererCount, onCatererUpdate, onUpdateVendorLog, onTabChange, setTimeline, eventDate, eventType, onOpenConsult, guestEstimate, intakeSavedAt, client, onOpenComms }) {
  const C  = useT();
  const s  = makeS(C);
  const bp = useContext(BpCtx);
  const isWide = bp === 'desktop' || bp === 'tablet-land';
  const totalBudgeted   = budget.reduce((s, r) => s + r.budgeted, 0);
  const totalActual     = budget.reduce((s, r) => s + r.actual, 0);
  const vendorTotal     = vendors.filter(v => STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0);
  const balanceDue      = Math.max(0, vendorTotal - totalActual);
  const confirmed       = guests.filter(g => g.rsvp === 'Yes');
  const vendorConf      = vendors.filter(v => v.status === 'Confirmed').length;
  const done            = timeline.filter(t => t.done).length;

  const addQuickTask = () => {
    if (!setTimeline) return;
    const ng = { id: uid(), week: 'Custom', task: '', done: false, owner: '', notes: '' };
    setTimeline(t => [...t, ng]);
    if (onTabChange) onTabChange('Planning Tasks');
  };

  const paymentsDue = vendors
    .filter(v => v.payDueDate && !v.balancePaid && (v.cost - v.depositAmt) > 0)
    .map(v => ({ ...v, daysLeft: daysUntil(v.payDueDate), balance: v.cost - v.depositAmt }))
    .filter(v => v.daysLeft !== null && v.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const mealCounts = confirmed.reduce((acc, g) => {
    if (g.meal && g.meal !== '—') acc[g.meal] = (acc[g.meal] || 0) + 1;
    if (g.plusOne && g.plusOneMeal && g.plusOneMeal !== '—') acc[g.plusOneMeal] = (acc[g.plusOneMeal] || 0) + 1;
    return acc;
  }, {});

  const totalKids = confirmed.reduce((s, g) => s + (g.kids || 0), 0);

  const seated            = confirmed.filter(g => g.table).length;
  const confirmedCount    = confirmed.length;
  const cateringVendor    = vendors.find(v => v.category === 'Catering' && STAGES.indexOf(v.status) >= 2);
  const catererDrift      = cateringVendor && catererCount !== undefined && catererCount !== confirmedCount;

  // Urgency: build prioritized action list
  const overdueTasks      = timeline.filter(t => isTaskOverdue(t, eventDate));
  const urgentPayments    = paymentsDue.filter(v => v.daysLeft <= 14);
  const soonPayments      = paymentsDue.filter(v => v.daysLeft > 14 && v.daysLeft <= 30);
  const unconfirmedVendors = vendors.filter(v => v.name && v.status !== 'Confirmed' && v.status !== 'Considering');
  const maybeGuests       = guests.filter(g => g.rsvp === 'Maybe');
  const unseated          = confirmedCount > 0 && seated < confirmedCount ? confirmedCount - seated : 0;

  const phaseActions = getPhaseActions(eventType, daysUntil(eventDate), { vendors, timeline, guests });

  // Comms awaiting the planner — approval requests not yet resolved
  const pendingComms = clientPendingComms(client);
  const commActions = [
    ...pendingComms.needsSend.map(e => ({ level: 'critical', label: `Approval not sent yet: "${(e.text || '').slice(0, 50)}${(e.text||'').length > 50 ? '…' : ''}"`, onClick: onOpenComms, hint: 'Client comms' })),
    ...pendingComms.awaiting.map(e => ({ level: 'warn', label: `Awaiting client approval: "${(e.text || '').slice(0, 50)}${(e.text||'').length > 50 ? '…' : ''}"`, onClick: onOpenComms, hint: 'Client comms' })),
  ];

  const actionItems = [
    ...overdueTasks.map(t => ({ level: 'critical', label: `"${t.task || 'Untitled task'}" is overdue`, tab: 'Planning Tasks', itemId: t.id })),
    ...commActions.filter(a => a.level === 'critical'),
    ...urgentPayments.map(v => ({ level: 'critical', label: `${v.name} payment due in ${v.daysLeft}d — ${fmtD(v.balance)}`, tab: 'Vendors', itemId: v.id })),
    ...phaseActions.filter(a => a.level === 'critical'),
    ...commActions.filter(a => a.level === 'warn'),
    ...soonPayments.map(v => ({ level: 'warn', label: `${v.name} payment due in ${v.daysLeft}d — ${fmtD(v.balance)}`, tab: 'Vendors', itemId: v.id })),
    ...(catererDrift ? [{ level: 'warn', label: `Caterer has old headcount (${catererCount}) — now ${confirmedCount} confirmed`, tab: 'Vendors' }] : []),
    ...phaseActions.filter(a => a.level === 'warn'),
    ...unconfirmedVendors.slice(0, 3).map(v => ({ level: 'info', label: `${v.name} not yet confirmed (${v.status})`, tab: 'Vendors' })),
    ...(maybeGuests.length > 0 ? [{ level: 'info', label: `${maybeGuests.length} guest${maybeGuests.length > 1 ? 's' : ''} still undecided on RSVP`, tab: 'Guests' }] : []),
    ...(unseated > 0 ? [{ level: 'info', label: `${unseated} confirmed guest${unseated > 1 ? 's' : ''} not yet seated`, tab: 'Seating' }] : []),
  ];

  const days = daysUntil(eventDate);
  const guidance = getWorkflowGuidance(eventType, days);

  // ── AI summary ──────────────────────────────────────────────────────────────
  const aiKey = useAIKey();
  const [aiSummary, setAISummary] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const genSummary = async () => {
    if (!aiKey) return;
    setAILoading(true); setAISummary('');
    const overdueCount = overdueTasks.length;
    const urgentPay = urgentPayments.map(v => `${v.name} ($${v.balance.toLocaleString()} due in ${v.daysLeft}d)`).join(', ');
    const nonResp = guests.filter(g => !g.rsvp || g.rsvp === 'Maybe').length;
    const prompt = `You are a concise event planning assistant. Write a 2-3 sentence plain-English status summary for an event planner. Be direct and specific. No fluff.

Event: ${eventType || 'Event'}, ${daysUntil(eventDate) ?? '?'} days away
Confirmed guests: ${guests.filter(g=>g.rsvp==='Yes').length} of ${guests.length} invited
Non-responders/maybe: ${nonResp}
Overdue planning tasks: ${overdueCount}
Urgent payments (due ≤14d): ${urgentPay || 'none'}
Action items total: ${actionItems.length}

Write the summary now:`;
    try {
      await askClaude(aiKey, prompt, { maxTokens: 120, onChunk: t => setAISummary(t) });
    } catch(e) { setAISummary(e.message === 'no-key' ? '' : '⚠ Could not reach Claude. Check your API key in Profile.'); }
    setAILoading(false);
  };

  // ── Shared sub-components (used in both layout modes) ──────────────────────

  const priorityCard = actionItems.length > 0 && (
    <div style={{ ...s.card, borderColor: actionItems[0].level === 'critical' ? C.danger + '88' : C.warn + '77', background: actionItems[0].level === 'critical' ? C.danger + '08' : C.warn + '08', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={mkDot(actionItems[0].level === 'critical' ? C.danger : C.warn, 8)} />
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: actionItems[0].level === 'critical' ? C.danger : C.warn }}>
          Priority Actions · {actionItems.length} item{actionItems.length > 1 ? 's' : ''}
        </div>
      </div>
      {actionItems.slice(0, isWide ? 8 : 6).map((item, i) => {
        const clr = item.level === 'critical' ? C.danger : item.level === 'warn' ? C.warn : C.accent2;
        const handler = item.onClick ? item.onClick : (onTabChange && item.tab ? () => onTabChange(item.tab, item.itemId) : undefined);
        const arrow   = item.hint || (item.tab ? item.tab : null);
        return (
          <div key={i}
            onClick={handler}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, cursor: handler ? 'pointer' : 'default', padding: '6px 8px', borderRadius: 6, borderLeft: `3px solid ${clr}44` }}
            onMouseEnter={handler ? e => { e.currentTarget.style.background = clr + '12'; } : undefined}
            onMouseLeave={handler ? e => { e.currentTarget.style.background = ''; } : undefined}
          >
            <span style={{ ...mkDot(clr, 7), marginTop: 4 }} />
            <span style={{ fontSize: 13, flex: 1, color: C.text }}>{item.label}</span>
            {handler && arrow && <span style={{ fontSize: 11, color: clr, opacity: 0.7, flexShrink: 0 }}>{arrow} →</span>}
          </div>);
      })}
      {actionItems.length > (isWide ? 8 : 6) && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, paddingLeft: 18 }}>+{actionItems.length - (isWide ? 8 : 6)} more</div>
      )}
    </div>
  );

  const guidanceCard = guidance && (
    <div style={{ ...s.card, borderColor: C.accent + '66', background: C.accent + '0c', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.accent }}>{guidance.phase} · Focus: {guidance.focus}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {days !== null && <span style={{ fontSize: 11, color: C.muted }}>{days > 0 ? `${days} days to go` : 'Event day!'}</span>}
          {onOpenConsult && <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '3px 8px', color: C.accent2, border: `1px solid ${C.accent2 + '44'}` }} onClick={onOpenConsult}>Client Intake →</button>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {guidance.tips.map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
            <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>→</span>
            <span style={{ color: C.text }}>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const catererCard = catererDrift && (
    <div style={{ ...s.card, borderColor: C.warn + 'aa', background: C.warn + '10', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.warn, marginBottom: 2 }}>Guest count changed — update caterer</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            <strong style={{ color: C.text }}>{confirmedCount} confirmed</strong> · Last given: <strong style={{ color: C.text }}>{catererCount}</strong>
          </div>
        </div>
        <button style={s.btn('teal')} onClick={() => {
          onCatererUpdate(confirmedCount);
          if (cateringVendor && onUpdateVendorLog) onUpdateVendorLog(cateringVendor.id, `Headcount updated to ${confirmedCount} confirmed guests.`);
        }}>Mark Updated ({confirmedCount})</button>
      </div>
    </div>
  );

  const statCards = (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isWide ? 3 : 2}, 1fr)`, gap: 12, marginBottom: 16 }}>
      <StatCard label="Budgeted"           value={fmtD(totalBudgeted)} sub={`${fmtD(totalActual)} spent · ${fmtD(vendorTotal)} committed`}                      onClick={onTabChange ? () => onTabChange('Budget')         : undefined} />
      <StatCard label="Balance Due"        value={fmtD(balanceDue)}    sub={`Committed not yet paid · ${Math.round((totalActual / (totalBudgeted || 1)) * 100)}% spent`} color={balanceDue > 0 ? C.warn : C.success} onClick={onTabChange ? () => onTabChange('Budget') : undefined} />
      <StatCard label="Attending"         value={confirmed.length}    sub={guestEstimate ? `est. ${guestEstimate} · ${guests.length} invited` : `of ${guests.length} invited`} color={C.accent}  onClick={onTabChange ? () => onTabChange('Guests')   : undefined} />
      <StatCard label="Vendors Confirmed" value={`${vendorConf}/${vendors.length}`} sub={`${fmtD(vendorTotal)} committed`} color={C.accent2}                       onClick={onTabChange ? () => onTabChange('Vendors')        : undefined} />
      <StatCard label="Tasks Complete"    value={`${done}/${timeline.length}`} sub={`${Math.round((done / (timeline.length || 1)) * 100)}% done`}                  onClick={onTabChange ? () => onTabChange('Planning Tasks') : undefined} />
      <StatCard label="Guests Seated"     value={`${seated}/${confirmed.length}`} sub="seating chart" color={seated === confirmed.length && confirmed.length > 0 ? C.success : C.warn} onClick={onTabChange ? () => onTabChange('Seating')  : undefined} />
    </div>
  );

  const paymentsCard = paymentsDue.length > 0 && (
    <div style={{ ...s.card, borderColor: paymentsDue[0].daysLeft <= 14 ? C.danger + '66' : C.warn + '55', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>Upcoming Payments</div>
        {onTabChange && <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '3px 8px', color: C.accent }} onClick={() => onTabChange('Budget')}>View all →</button>}
      </div>
      {paymentsDue.map(v => {
        const urgent = v.daysLeft <= 14;
        return (
          <div key={v.id}
            onClick={onTabChange ? () => onTabChange('Vendors', v.id) : undefined}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: onTabChange ? 'pointer' : 'default', padding: '4px 0', borderRadius: 6 }}
            onMouseEnter={onTabChange ? (e => { e.currentTarget.style.background = C.surface2; }) : undefined}
            onMouseLeave={onTabChange ? (e => { e.currentTarget.style.background = ''; }) : undefined}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</span>
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{v.category}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={s.pill(urgent ? C.danger : C.warn)}>{v.daysLeft}d left</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtD(v.balance)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const budgetBarsCard = (
    <div style={{ ...s.card, flex: 1, minWidth: 0, marginBottom: 0 }}>
      <div style={s.cardTitle}>Budget by Category</div>
      {budget.map(r => {
        const pct = r.budgeted > 0 ? (r.actual / r.budgeted) * 100 : 0;
        return (
          <div key={r.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13 }}>{r.category}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{fmtD(r.actual)} / {fmtD(r.budgeted)}</span>
            </div>
            <ProgressBar pct={pct} />
          </div>
        );
      })}
      {vendors.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: C.muted }}>Vendor commitments</span>
          <span style={{ fontWeight: 600, color: vendorTotal > totalBudgeted ? C.danger : C.accent2 }}>{fmtD(vendorTotal)}</span>
        </div>
      )}
    </div>
  );

  const mealCountsCard = (
    <div style={{ ...s.card, marginBottom: 0 }}>
      <div style={s.cardTitle}>Meal Counts — {confirmed.length} attending{totalKids > 0 ? ` + ${totalKids} kids` : ''}</div>
      {Object.entries(mealCounts).map(([meal, count]) => (
        <div key={meal} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>{meal}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProgressBar pct={(count / (confirmed.length || 1)) * 100} color={C.accent2} />
            <span style={{ fontSize: 12, color: C.muted, minWidth: 20, textAlign: 'right' }}>{count}</span>
          </div>
        </div>
      ))}
      {totalKids > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, color: C.muted }}>Kids meals</span>
          <span style={{ fontSize: 12, color: C.muted }}>{totalKids}</span>
        </div>
      )}
      {Object.keys(mealCounts).length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No confirmed guests yet</div>}
    </div>
  );

  const tasksCard = (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>Upcoming Tasks</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {setTimeline && <button style={{ ...s.btn('primary'), fontSize: 10, padding: '3px 8px' }} onClick={addQuickTask}>+ Task</button>}
          {onTabChange  && <button style={{ ...s.btn('ghost'),  fontSize: 11, padding: '3px 8px', color: C.accent }} onClick={() => onTabChange('Planning Tasks')}>All →</button>}
        </div>
      </div>
      {timeline.filter(t => !t.done).slice(0, isWide ? 8 : 5).map(t => (
        <div key={t.id}
          onClick={onTabChange ? () => onTabChange('Planning Tasks', t.id) : undefined}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: onTabChange ? 'pointer' : 'default', padding: '4px 0', borderRadius: 6 }}
          onMouseEnter={onTabChange ? (e => { e.currentTarget.style.background = C.surface2; }) : undefined}
          onMouseLeave={onTabChange ? (e => { e.currentTarget.style.background = ''; }) : undefined}
        >
          <span style={{ color: C.border, fontSize: 16, flexShrink: 0, marginTop: 1 }}>○</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.task || <em style={{ color: C.muted }}>Untitled task</em>}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t.week}{t.owner ? ` · ${t.owner}` : ''}</div>
          </div>
        </div>
      ))}
      {timeline.filter(t => !t.done).length === 0 && <div style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>All tasks complete!</div>}
    </div>
  );

  // ── Desktop: 2-column grid layout ─────────────────────────────────────────
  if (isWide) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Left: actions + stats + budget breakdown */}
        <div>
          {/* AI health summary */}
          {(aiSummary || aiLoading) ? (
            <div style={{ ...s.card, marginBottom: 16, padding: '14px 18px', borderColor: C.accent + '44' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: aiSummary ? 8 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>✨ AI Summary</span>
                <button onClick={() => { setAISummary(''); setAILoading(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, marginLeft: 'auto' }}>✕</button>
              </div>
              {aiSummary && <div style={{ fontSize: 13, lineHeight: 1.6, color: C.text }}>{aiSummary}</div>}
              {aiLoading && !aiSummary && <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Generating…</div>}
            </div>
          ) : (
            aiKey && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <AIBtn onClick={genSummary} loading={aiLoading} label="Summarize event status" />
            </div>
          )}
          {priorityCard}
          {statCards}
          {paymentsCard}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {budgetBarsCard}
            {mealCountsCard}
          </div>
        </div>
        {/* Right sidebar: guidance + caterer + tasks */}
        <div>
          {guidanceCard}
          {catererCard}
          {tasksCard}
        </div>
      </div>
    );
  }

  // ── Mobile / tablet: single column ────────────────────────────────────────
  return (
    <div>
      {/* AI health summary */}
      {(aiSummary || aiLoading) ? (
        <div style={{ ...s.card, marginBottom: 16, padding: '14px 18px', borderColor: C.accent + '44' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: aiSummary ? 8 : 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>✨ AI Summary</span>
            <button onClick={() => { setAISummary(''); setAILoading(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, marginLeft: 'auto' }}>✕</button>
          </div>
          {aiSummary && <div style={{ fontSize: 13, lineHeight: 1.6, color: C.text }}>{aiSummary}</div>}
          {aiLoading && !aiSummary && <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Generating…</div>}
        </div>
      ) : (
        aiKey && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <AIBtn onClick={genSummary} loading={aiLoading} label="Summarize event status" />
        </div>
      )}
      {priorityCard}
      {guidanceCard}
      {catererCard}
      {statCards}
      {paymentsCard}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {budgetBarsCard}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, minWidth: 220 }}>
          {mealCountsCard}
          {tasksCard}
        </div>
      </div>
    </div>
  );
}

// ─── Budget Health Bar ────────────────────────────────────────────────────────

function BudgetHealthBar({ totalBudgeted, totalActual, totalCommitted }) {
  const C = useT();
  const [hovered,  setHovered]  = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const spentPct      = Math.min(100, (totalActual    / totalBudgeted) * 100);
  const committedPct  = Math.min(100, (totalCommitted / totalBudgeted) * 100);
  const balanceDue    = Math.max(0, totalCommitted - totalActual);
  const uncontracted  = Math.max(0, totalBudgeted  - totalCommitted);
  const isOverBudget  = totalCommitted > totalBudgeted;
  const isOverSpent   = totalActual    > totalBudgeted;

  const healthLabel = isOverSpent       ? { text: 'Over Budget',      color: C.danger  }
                    : isOverBudget      ? { text: 'Overcommitted',    color: C.danger  }
                    : spentPct > 90     ? { text: 'Nearly Spent',     color: C.warn    }
                    : committedPct > 90 ? { text: 'Fully Committed',  color: C.accent2 }
                    : spentPct > 0      ? { text: 'On Track',         color: C.success }
                    : totalCommitted > 0? { text: 'In Progress',      color: C.accent2 }
                    :                    { text: 'Not Started',       color: C.muted   };

  const rows = [
    { label: 'Total Budget',   value: fmtD(totalBudgeted),  color: C.text,    pct: 100 },
    { label: 'Spent',          value: fmtD(totalActual),    color: C.success, pct: spentPct,     bar: true, barColor: isOverSpent ? C.danger : C.success },
    { label: 'Committed',      value: fmtD(totalCommitted), color: C.accent2, pct: committedPct, bar: true, barColor: C.accent2 },
    { label: 'Balance Due',    value: fmtD(balanceDue),     color: balanceDue > 0 ? C.warn : C.success },
    { label: 'Uncontracted',   value: fmtD(uncontracted),   color: C.muted },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Bar ── */}
      <div
        role="button"
        aria-label="Budget health — hover for breakdown"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
        style={{
          height: 12, borderRadius: 8, background: C.border, display: 'flex',
          marginBottom: 8, cursor: 'default', overflow: 'hidden',
          transition: 'box-shadow 0.15s',
          boxShadow: hovered ? `0 0 0 2px ${C.accent}55` : 'none',
        }}>
        {spentPct > 0 && (
          <div style={{ width: `${spentPct}%`, background: isOverSpent ? C.danger : C.success, transition: 'width 0.4s', flexShrink: 0 }} />
        )}
        {committedPct > spentPct && (
          <div style={{
            width: `${committedPct - spentPct}%`, flexShrink: 0,
            background: `repeating-linear-gradient(45deg, ${C.accent2}66, ${C.accent2}66 3px, ${C.accent2}22 3px, ${C.accent2}22 6px)`,
          }} />
        )}
      </div>

      {/* ── Tooltip ── follows cursor via fixed positioning */}
      {hovered && (() => {
        const TIP_W = 268;
        const TIP_H = 220; // approx
        const flipX = mousePos.x + TIP_W + 18 > window.innerWidth;
        const flipY = mousePos.y + TIP_H + 16 > window.innerHeight;
        return (
        <div style={{
          position: 'fixed',
          top:  flipY ? mousePos.y - TIP_H - 8  : mousePos.y + 16,
          left: flipX ? mousePos.x - TIP_W - 8  : mousePos.x + 12,
          zIndex: 9999,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '14px 16px', minWidth: TIP_W,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
        }}>
          {/* Health badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthLabel.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: healthLabel.color }}>{healthLabel.text}</span>
          </div>

          {/* Breakdown rows */}
          {rows.map(({ label, value, color, pct, bar, barColor }) => (
            <div key={label} style={{ marginBottom: bar ? 10 : 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: bar ? 4 : 0 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
              </div>
              {bar && (
                <div style={{ height: 4, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              )}
              {bar && (
                <div style={{ fontSize: 10, color: C.muted, textAlign: 'right', marginTop: 1 }}>{Math.round(pct)}% of budget</div>
              )}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, color: C.success, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 4, borderRadius: 2, background: C.success, display: 'inline-block' }} /> Spent
            </span>
            <span style={{ fontSize: 10, color: C.accent2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 4, borderRadius: 2, background: C.accent2, display: 'inline-block', opacity: 0.5 }} /> Committed
            </span>
            <span style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 4, borderRadius: 2, background: C.border, display: 'inline-block' }} /> Uncontracted
            </span>
          </div>
        </div>
        );
      })()}

      {/* ── Status row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: healthLabel.color }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: healthLabel.color, display: 'inline-block' }} />
          {healthLabel.text}
        </span>
        <span style={{ color: C.success, fontWeight: 500 }}>{fmtD(totalActual)} spent</span>
        {totalCommitted > 0 && <span style={{ color: C.accent2, fontWeight: 500 }}>{fmtD(totalCommitted)} committed</span>}
        {balanceDue > 0 && <span style={{ color: C.warn, fontWeight: 500 }}>{fmtD(balanceDue)} balance due</span>}
        {uncontracted > 0 && !isOverBudget && <span style={{ color: C.muted }}>{fmtD(uncontracted)} uncontracted</span>}
        <span style={{ color: C.muted, marginLeft: 'auto' }}>
          {Math.round(spentPct)}% spent{committedPct > 0 ? ` · ${Math.round(committedPct)}% committed` : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Budget ───────────────────────────────────────────────────────────────────

function Budget({ budget, setBudget, vendors, client, setClient, eventType, confirmedCount, profile }) {
  const C  = useT();
  const s  = makeS(C);
  const bp = useContext(BpCtx);
  const aiKey = useAIKey();
  const [modalId, setModalId] = useState(null);
  const [pendingTier, setPendingTier] = useState(null);
  const [budgetAILoad, setBudgetAILoad] = useState(false);
  const suggestBudget = async () => {
    if (!aiKey) return;
    setBudgetAILoad(true);
    const total = budget.reduce ? budget.reduce((s,r)=>s+(r.budgeted||0),0) : 0;
    const prompt = `Generate a realistic event budget breakdown as a JSON array. Each item: { category (string), planned (number in dollars), notes (string, 1 short sentence) }. Base allocations on industry norms for this event type and guest count. Return ONLY the JSON array.\n\nEvent type: ${eventType}\nGuest count: ${confirmedCount||'unknown'}\nTotal budget: $${total||'unknown'}\n\nJSON:`;
    try {
      const raw = await askClaude(aiKey, prompt, { maxTokens: 600 });
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        items.forEach(item => {
          setBudget(b => [...b, { id: uid(), category: item.category, budgeted: item.planned||0, actual: 0, notes: item.notes||'' }]);
        });
      }
    } catch(e) { /* silent */ }
    setBudgetAILoad(false);
  };
  // Estimator auto-collapses once line items exist — open on first visit
  const [showEstimator, setShowEstimator] = useState(budget.length === 0);

  const totalBudgeted  = budget.reduce((s, r) => s + r.budgeted, 0);
  const totalActual    = budget.reduce((s, r) => s + r.actual, 0);

  const getCommitted   = (cat) => (vendors || []).filter(v => (v.budgetCategory || v.category) === cat && STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0);
  // Sum per-row committed (keeps total row consistent with what each category row shows)
  const totalCommitted = budget.reduce((s, r) => s + getCommitted(r.category), 0);

  const add = () => {
    const nr = { id: uid(), category: 'New Item', budgeted: 0, actual: 0, notes: '' };
    setBudget(b => [...b, nr]);
    setModalId(nr.id);
  };
  const del = (id) => { setBudget(b => b.filter(r => r.id !== id)); setModalId(null); };
  const upd = (id, key, val) => setBudget(b => b.map(r => r.id === id ? { ...r, [key]: key === 'budgeted' || key === 'actual' ? Number(val) || 0 : val } : r));
  const modalRow = budget.find(r => r.id === modalId);

  const [est, setEst] = useState({ guests: confirmedCount > 0 ? String(confirmedCount) : '', eventType: eventType || 'Wedding' });
  const metroFactor  = getMetroFactor(profile);
  const metroMkt     = profile?.metroMarket ? METRO_MARKETS.find(m => m.id === profile.metroMarket) : null;
  const metroTierLbl = metroMkt ? METRO_TIER_LABEL[metroMkt.tier] : null;
  const tiers = est.guests && Number(est.guests) > 0 && PER_HEAD[est.eventType]
    ? (['good', 'better', 'best']).map(t => ({
        tier: t,
        total: Math.round(Number(est.guests) * PER_HEAD[est.eventType][t] * metroFactor / 100) * 100,
        perHead: Math.round(PER_HEAD[est.eventType][t] * metroFactor),
      }))
    : null;

  // Cash flow: group upcoming vendor balance payments by month
  const cashFlow = (vendors || [])
    .filter(v => v.payDueDate && !v.balancePaid && (v.cost - v.depositAmt) > 0)
    .sort((a, b) => a.payDueDate.localeCompare(b.payDueDate))
    .reduce((acc, v) => {
      const mon = v.payDueDate.slice(0, 7);
      if (!acc[mon]) acc[mon] = [];
      acc[mon].push(v);
      return acc;
    }, {});

  // Upcoming payment alerts: vendors with balance due within 30 days
  const today = new Date(); today.setHours(0,0,0,0);
  const upcomingPayments = (vendors || [])
    .filter(v => v.payDueDate && !v.balancePaid && (v.cost - (v.depositAmt || 0)) > 0)
    .map(v => {
      const due = new Date(v.payDueDate + 'T00:00:00');
      const days = Math.round((due - today) / 86400000);
      return { ...v, daysUntilDue: days, balanceAmt: (v.cost || 0) - (v.depositAmt || 0) };
    })
    .filter(v => v.daysUntilDue <= 30)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return (
    <div>
      {modalRow && (
        <BudgetModal
          row={modalRow}
          committed={getCommitted(modalRow.category)}
          categoryVendors={(vendors || []).filter(v => v.budgetCategory === modalRow.category)}
          onClose={() => setModalId(null)}
          onChange={(key, val) => upd(modalId, key, val)}
          onDelete={() => del(modalId)}
        />
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Budgeted"    value={fmtD(totalBudgeted)}  sub="Planned spend across all categories" />
        <StatCard label="Committed"   value={fmtD(totalCommitted)} sub="On contract or deposit" color={totalCommitted > totalBudgeted ? C.danger : C.accent2} />
        <StatCard label="Balance Due"   value={fmtD(Math.max(0, totalCommitted - totalActual))} sub="Committed not yet paid" color={totalCommitted > totalActual ? C.warn : C.success} />
        <StatCard label="Uncontracted"  value={fmtD(Math.max(0, totalBudgeted - totalCommitted))} sub="Budget not yet committed" color={totalCommitted > totalBudgeted ? C.danger : C.success} />
      </div>

      {/* Upcoming Payment Alerts */}
      {upcomingPayments.length > 0 && (
        <div style={{ ...s.card, marginBottom: 16, borderColor: upcomingPayments[0].daysUntilDue <= 14 ? C.danger + '88' : C.warn + '88', background: upcomingPayments[0].daysUntilDue <= 14 ? C.danger + '0d' : C.warn + '0d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: upcomingPayments[0].daysUntilDue <= 14 ? C.danger : C.warn }}>
              Upcoming Payments — {upcomingPayments.length} due within 30 days
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingPayments.map(v => {
              const urgent = v.daysUntilDue <= 14;
              const overdue = v.daysUntilDue < 0;
              const clr = overdue ? C.danger : urgent ? C.danger : C.warn;
              const label = overdue
                ? `${Math.abs(v.daysUntilDue)} days overdue`
                : v.daysUntilDue === 0
                  ? 'Due TODAY'
                  : v.daysUntilDue === 1
                    ? 'Due tomorrow'
                    : `Due in ${v.daysUntilDue} days`;
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: C.surface, border: `1px solid ${clr}44` }}>
                  <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', background: clr, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v.name || 'Vendor'}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{v.budgetCategory || v.category || '—'} · Balance due {v.payDueDate}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: clr }}>{fmtD(v.balanceAmt)}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: clr, marginTop: 1 }}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget Estimator — collapses when line items already exist */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowEstimator(v => !v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.cardTitle}>Budget Estimator</div>
            {metroMkt && (
              <span style={{ fontSize: 10, fontWeight: 700, color: metroTierLbl?.color || C.muted, background: (metroTierLbl?.color || C.muted) + '15', border: `1px solid ${(metroTierLbl?.color || C.muted) + '40'}`, borderRadius: 12, padding: '2px 8px', letterSpacing: '0.04em' }}>
                {metroTierLbl?.icon} {metroMkt.label} {metroFactor !== 1.0 ? `· ${metroFactor > 1 ? '+' : ''}${Math.round((metroFactor - 1) * 100)}%` : ''}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: C.muted }}>{showEstimator ? '▾ collapse' : '▸ expand'}</span>
        </div>
        {showEstimator && (
          <>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, marginBottom: tiers ? 16 : 0, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Guest Count</label>
                <input style={s.input} type="number" min="1" value={est.guests} onChange={e => setEst(v => ({ ...v, guests: e.target.value }))} placeholder="e.g. 100" />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 3 }}>Event Type</label>
                <select style={s.input} value={est.eventType} onChange={e => setEst(v => ({ ...v, eventType: e.target.value }))}>
                  {EVT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {tiers && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {tiers.map(({ tier, total, perHead }) => {
                  const clr  = tier === 'good' ? C.success : tier === 'better' ? C.accent2 : C.accent;
                  const why  = (TIER_WHY[est.eventType] || TIER_WHY.Other)[tier] || [];
                  const meta = (TIER_META[est.eventType] || TIER_META.Other)[tier];
                  return (
                    <div key={tier} style={{ ...s.card, flex: 1, minWidth: 180, marginBottom: 0, borderColor: clr + '55', background: pendingTier === tier ? clr + '18' : clr + '08', cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation();
                        if (pendingTier === tier) {
                          const tmpl = BUDGET_TEMPLATES[est.eventType] || BUDGET_TEMPLATES.Other;
                          setBudget(b => {
                            const existing = new Map(b.map(r => [r.category, r]));
                            return tmpl.map(({ c, pct }) => ({ ...(existing.get(c) || { id: uid(), category: c, actual: 0, notes: '' }), budgeted: Math.round(total * pct) }));
                          });
                          setPendingTier(null);
                          setShowEstimator(false);
                        } else {
                          setPendingTier(tier);
                          setTimeout(() => setPendingTier(t => t === tier ? null : t), 4000);
                        }
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: clr, marginBottom: 2 }}>{meta.label}</div>
                      <div style={{ ...s.statNum(clr), fontSize: 22 }}>{fmtD(total)}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtD(perHead)} / person</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic', lineHeight: 1.4 }}>{meta.tag}</div>
                      {why.length > 0 && (
                        <ul style={{ margin: '10px 0 4px', padding: '0 0 0 14px', listStyle: 'disc' }}>
                          {why.map((w, i) => <li key={i} style={{ fontSize: 11, color: C.muted, marginBottom: 2, lineHeight: 1.4 }}>{w}</li>)}
                        </ul>
                      )}
                      <div style={{ fontSize: 10, color: clr, marginTop: 8, fontWeight: 600 }}>{pendingTier === tier ? '⚠ Click again to confirm' : 'Apply this budget →'}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {!tiers && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Enter a guest count to see budget scenarios for your event type.</div>}
          </>
        )}
      </div>

      <div style={s.card}>
        {/* ── Budget health header ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={s.cardTitle}>Budget</div>
              {totalBudgeted > 0 && (
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: C.text, lineHeight: 1.1, marginTop: 2 }}>
                  {fmtD(totalBudgeted)}
                  <span style={{ fontSize: 13, fontWeight: 400, color: C.muted, marginLeft: 8, letterSpacing: 0 }}>total budget</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <AIBtn onClick={suggestBudget} loading={budgetAILoad} label="Suggest budget split" />
              <button style={s.btn('primary')} onClick={add}>+ Add Row</button>
            </div>
          </div>

          {totalBudgeted > 0 && (
            <BudgetHealthBar
              totalBudgeted={totalBudgeted}
              totalActual={totalActual}
              totalCommitted={totalCommitted}
            />
          )}

          {totalBudgeted === 0 && budget.length > 0 && (
            <div style={{ fontSize: 12, color: C.muted }}>Add budgeted amounts to each category to see health.</div>
          )}
          {bp !== 'mobile' && budget.length > 0 && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Click any row to edit</div>
          )}
        </div>

        {budget.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>No budget categories yet</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Add categories like Venue, Catering, and Florals to track your spending.</div>
            <button style={s.btn('primary')} onClick={add}>+ Add First Category</button>
          </div>
        )}

        {(bp === 'mobile' || bp === 'tablet') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {budget.map(r => {
              const committed    = getCommitted(r.category);
              const uncontracted = r.budgeted - committed;
              const balDue       = committed - r.actual;
              const spendPct     = r.budgeted > 0 ? (r.actual    / r.budgeted) * 100 : 0;
              const sharePct     = totalBudgeted > 0 ? Math.round((r.budgeted / totalBudgeted) * 100) : 0;
              return (
                <div key={r.id} onClick={() => setModalId(r.id)}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.category}</span>
                      {sharePct > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, background: C.border + '88', borderRadius: 10, padding: '1px 7px' }}>{sharePct}%</span>}
                    </div>
                    {committed > 0
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: balDue <= 0 ? C.success : C.warn }}>
                          {balDue <= 0 ? 'Paid' : `${fmtD(balDue)} due`}
                        </span>
                      : <span style={{ fontSize: 12, color: C.muted }}>Uncontracted</span>}
                  </div>
                  {/* Share-of-total bar behind spend bar */}
                  {totalBudgeted > 0 && (
                    <div style={{ position: 'relative', height: 6, borderRadius: 4, background: C.border, marginBottom: 4, overflow: 'visible' }}>
                      {/* Category share of total — ghost track */}
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${sharePct}%`, background: C.accent + '28', borderRadius: 4 }} />
                      {/* Spend within this category */}
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(spendPct * sharePct / 100, sharePct)}%`, background: C.success, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  )}
                  <ProgressBar pct={spendPct} />
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
                    <span>Spent: {fmtD(r.actual)} / {fmtD(r.budgeted)}</span>
                    {committed > 0 && <span style={{ color: C.accent2 }}>Committed: {fmtD(committed)}</span>}
                    {r.budgeted > 0 && <span style={{ color: uncontracted < 0 ? C.danger : C.muted }}>Uncontracted: {fmtD(uncontracted)}</span>}
                    {r.notes && <span>{r.notes}</span>}
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 4px', fontWeight: 700, fontSize: 13, borderTop: `1px solid ${C.border}` }}>
              <span>Balance Due</span>
              <span style={{ color: totalCommitted - totalActual <= 0 ? C.success : C.warn }}>{totalCommitted - totalActual <= 0 ? 'Paid' : fmtD(totalCommitted - totalActual)}</span>
            </div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  { h: 'Category',      tip: null },
                  { h: 'Budgeted',      tip: 'Your planned spend for this category' },
                  { h: 'Committed',     tip: 'Total cost of vendors you\'ve contracted or deposited (from Vendor tab)' },
                  { h: 'Uncontracted',  tip: 'Budgeted minus Committed — budget not yet tied to a vendor' },
                  { h: 'Spent',         tip: 'Actual payments recorded in this budget row' },
                  { h: 'Balance Due',   tip: 'Committed minus Spent — what you still owe contracted vendors in this category' },
                  { h: 'Notes',     tip: null },
                  { h: '',          tip: null },
                ].map(({ h, tip }) => (
                  <th key={h} style={s.th} title={tip || undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budget.map(r => {
                const committed    = getCommitted(r.category);
                const uncontracted = r.budgeted - committed;
                const balDue       = committed - r.actual;
                const sharePct     = totalBudgeted > 0 ? (r.budgeted / totalBudgeted) * 100 : 0;
                return (
                  <tr key={r.id} onClick={() => setModalId(r.id)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                    <td style={{ ...s.td, fontWeight: 500, minWidth: 160 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.category}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 3, background: C.border, overflow: 'hidden', maxWidth: 100 }}>
                          <div style={{ height: '100%', width: `${sharePct}%`, background: C.accent + '99', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {sharePct > 0 ? `${Math.round(sharePct)}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums' }}>{fmtD(r.budgeted)}</td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums', color: committed > r.budgeted ? C.danger : C.accent2, fontWeight: committed > 0 ? 600 : 400 }}>
                      {committed > 0 ? fmtD(committed) : <span style={{ color: C.muted }}>—</span>}
                    </td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums', color: uncontracted < 0 ? C.danger : uncontracted === 0 ? C.warn : C.muted }}>
                      {r.budgeted === 0 ? <span style={{ color: C.muted }}>—</span> : uncontracted < 0
                        ? <span style={{ color: C.danger }}>−{fmtD(Math.abs(uncontracted))} over</span>
                        : fmtD(uncontracted)}
                    </td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums' }}>{fmtD(r.actual)}</td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {committed === 0
                        ? <span style={{ color: C.muted }}>—</span>
                        : balDue <= 0
                          ? <span style={{ color: C.success }}>Paid</span>
                          : <span style={{ color: C.warn }}>{fmtD(balDue)}</span>}
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12, maxWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {r.paid && <span style={{ ...s.pill(C.success), fontSize: 10 }}>✓ Paid{r.paymentMethod ? ` · ${r.paymentMethod}` : ''}</span>}
                        {r.receiptPhoto && <span style={{ fontSize: 12 }} title="Receipt attached">🧾</span>}
                        <span style={{ color: C.muted }}>{r.notes || ''}</span>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 16 }}>›</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: `2px solid ${C.border}` }}>
                <td style={{ ...s.td, fontWeight: 700 }}>Total</td>
                <td style={{ ...s.td, fontWeight: 700 }}>{fmtD(totalBudgeted)}</td>
                <td style={{ ...s.td, fontWeight: 700, color: C.accent2 }}>{fmtD(totalCommitted)}</td>
                <td style={{ ...s.td, fontWeight: 700, color: totalBudgeted - totalCommitted < 0 ? C.danger : C.muted }}>{fmtD(Math.max(0, totalBudgeted - totalCommitted))}</td>
                <td style={{ ...s.td, fontWeight: 700 }}>{fmtD(totalActual)}</td>
                <td style={{ ...s.td, fontWeight: 700, color: totalCommitted - totalActual <= 0 ? C.success : C.warn }}>{totalCommitted - totalActual <= 0 ? 'Paid' : fmtD(totalCommitted - totalActual)}</td>
                <td /><td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Cash flow */}
      {Object.keys(cashFlow).length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Payment Schedule — Cash Out by Month</div>
          {Object.entries(cashFlow).map(([mon, vs]) => {
            const monthTotal = vs.reduce((s, v) => s + (v.cost - v.depositAmt), 0);
            const d = daysUntil(mon + '-01');
            return (
              <div key={mon} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtMon(mon)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: d !== null && d <= 30 ? C.danger : C.text }}>{fmtD(monthTotal)}</span>
                </div>
                {vs.map(v => {
                  const days = daysUntil(v.payDueDate);
                  return (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 12, marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{v.name} — due {fmtDate(v.payDueDate)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {days !== null && days <= 30 && <span style={s.pill(days <= 14 ? C.danger : C.warn)}>{days}d</span>}
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtD(v.cost - v.depositAmt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Client Payments — planner fee from/to client */}
      {client && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={s.cardTitle}>Client Payments — {client.name}</div>
            {setClient && (
              <button style={s.btn('ghost')} onClick={() => setClient(c => ({
                ...c,
                feeSchedule: [...(c.feeSchedule || []), { id: uid(), label: 'Payment', amount: 0, due: '', paid: false }],
              }))}>+ Milestone</button>
            )}
          </div>
          {(() => {
            const fee        = client.plannerFee || 0;
            const collected  = (client.feeSchedule || []).reduce((s, f) => s + (f.paid ? f.amount : (f.paidAmount || 0)), 0);
            const outstanding = fee - collected;
            return (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  <StatCard label="Total Fee"   value={fmtD(fee)} />
                  <StatCard label="Collected"   value={fmtD(collected)}   color={collected > 0 ? C.success : C.text} />
                  <StatCard label="Outstanding" value={fmtD(outstanding)} color={outstanding > 0 ? C.warn : C.success} />
                </div>
                {(client.feeSchedule || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No milestones yet — add payment milestones to track deposits and installments from your client.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(client.feeSchedule || []).map(f => {
                      const days = daysUntil(f.due || f.dueDate);
                      const dueVal = f.due || f.dueDate || '';
                      return (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.bg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${f.paid ? C.success + '44' : days !== null && days <= 14 ? C.danger + '44' : C.border}` }}>
                          <div style={{ flex: 1 }}>
                            {setClient ? (
                              <input style={{ ...s.input, fontSize: 13, fontWeight: 600, marginBottom: 3 }} value={f.label} onChange={e => setClient(c => ({ ...c, feeSchedule: c.feeSchedule.map(x => x.id === f.id ? { ...x, label: e.target.value } : x) }))} />
                            ) : (
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: f.paid ? C.success : C.text }}>{fmtD(f.amount)}</span>
                              {dueVal && <span style={{ fontSize: 11, color: f.paid ? C.success : days !== null && days <= 14 ? C.danger : C.muted }}>
                                {f.paid ? 'Paid ✓' : days !== null ? (days === 0 ? 'Due today!' : days < 0 ? 'Overdue' : `Due in ${days}d`) : fmtDate(dueVal)}
                              </span>}
                            </div>
                          </div>
                          {setClient && (
                            <button
                              style={{ ...s.btn(f.paid ? 'success' : 'default'), fontSize: 11, padding: '4px 10px' }}
                              title={f.paid ? 'Click to mark unpaid' : 'Mark as paid'}
                              onClick={() => setClient(c => ({ ...c, feeSchedule: c.feeSchedule.map(x => x.id === f.id ? { ...x, paid: !x.paid } : x) }))}>
                              {f.paid ? '✓ Paid' : 'Mark Paid'}
                            </button>
                          )}
                          {setClient && (
                            <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 8px', color: C.danger }}
                              onClick={() => setClient(c => ({ ...c, feeSchedule: c.feeSchedule.filter(x => x.id !== f.id) }))}>✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── RSVP Form View ──────────────────────────────────────────────────────────

function RSVPFormView({ event, onSubmit, onClose, guestMode = false }) {
  const [name,        setName]        = useState('');
  const [rsvp,        setRsvp]        = useState('');
  const [meal,        setMeal]        = useState('Standard');
  const [needs,       setNeeds]       = useState('');
  const [showNeedsCustom, setShowNeedsCustom] = useState(false);
  const [hasPlusOne,  setHasPlusOne]  = useState(false);
  const [plusOne,     setPlusOne]     = useState('');
  const [plusOneMeal, setPlusOneMeal] = useState('Standard');
  const [kids,        setKids]        = useState(0);
  const [submitted,   setSubmitted]   = useState(false);

  const mealOpts = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free'];

  const LC = {
    bg: '#f4f4f8', surface: '#ffffff', border: '#e0e0ea',
    accent: '#1a6fba', text: '#18181c', muted: '#6b6b80',
    success: '#16a34a', danger: '#dc2626',
  };

  const lInput = {
    background: '#fff', border: `1.5px solid ${LC.border}`, borderRadius: 10,
    color: LC.text, fontSize: 16, padding: '12px 14px', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, sans-serif",
  };

  const submit = () => {
    if (!name.trim() || !rsvp) return;
    onSubmit({ name: name.trim(), rsvp, meal: rsvp === 'Yes' ? meal : '—', needs, plusOne: hasPlusOne ? plusOne : '', plusOneMeal: hasPlusOne ? plusOneMeal : '—', kids: rsvp === 'Yes' ? kids : 0 });
    setSubmitted(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: LC.bg, overflowY: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!guestMode && (
        <div style={{ background: C.accent, color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '7px 16px', letterSpacing: '0.06em', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          GUEST PREVIEW — this is what your RSVP link looks like
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, padding: '3px 12px', cursor: 'pointer', fontWeight: 700 }}>Exit Preview ✕</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px 60px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: LC.muted, marginBottom: 8 }}>You're invited</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: LC.text, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{event.name || 'Our Event'}</h1>
            {(event.date || event.venue) && (
              <div style={{ fontSize: 15, color: LC.muted }}>
                {event.date && fmtDate(event.date)}{event.venue ? ` · ${event.venue}` : ''}
              </div>
            )}
          </div>

          {submitted ? (
            <div style={{ background: LC.surface, borderRadius: 20, padding: '40px 28px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>{rsvp === 'Yes' ? '🎉' : '💌'}</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: LC.text, margin: '0 0 10px' }}>Thanks, {name.split(' ')[0]}!</h2>
              <p style={{ color: LC.muted, fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
                {rsvp === 'Yes' ? "We can't wait to celebrate with you." : rsvp === 'No' ? "We'll miss you — thank you for letting us know." : "We'll keep you updated."}
              </p>
              {!guestMode && (
                <button onClick={onClose} style={{ background: LC.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  ← Back to planner
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: LC.surface, borderRadius: 20, padding: '28px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: LC.text, display: 'block', marginBottom: 8 }}>Your name</label>
                <input style={lInput} value={name} onChange={e => setName(e.target.value)} placeholder="First & last name" autoFocus />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: LC.text, display: 'block', marginBottom: 10 }}>Will you be attending?</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['Yes', '🎉  Attending', LC.success], ['No', "😢  Can't make it", LC.danger], ['Maybe', '🤔  Maybe', LC.muted]].map(([val, label, clr]) => (
                    <button key={val} onClick={() => setRsvp(val)} style={{
                      flex: 1, padding: '14px 6px', borderRadius: 12,
                      border: `2px solid ${rsvp === val ? clr : LC.border}`,
                      background: rsvp === val ? clr + '22' : '#fff',
                      color: rsvp === val ? clr : LC.muted,
                      cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s', lineHeight: 1.4,
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {rsvp === 'Yes' && (
                <>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: LC.text, display: 'block', marginBottom: 10 }}>Meal preference</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {mealOpts.map(m => (
                        <button key={m} onClick={() => setMeal(m)} style={{
                          padding: '9px 16px', borderRadius: 10, border: `2px solid ${meal === m ? LC.accent : LC.border}`,
                          background: meal === m ? LC.accent + '15' : '#fff', color: meal === m ? LC.accent : LC.text,
                          cursor: 'pointer', fontSize: 14, fontWeight: meal === m ? 700 : 400, transition: 'all 0.12s',
                        }}>{m}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: LC.text, display: 'block', marginBottom: 10 }}>Dietary restrictions or allergies</label>
                    {(() => {
                      const needsParts = needs.split(',').map(s => s.trim()).filter(Boolean);
                      const togglePreset = (opt) => {
                        const active = needsParts.includes(opt);
                        const next = active ? needsParts.filter(p => p !== opt) : [...needsParts, opt];
                        setNeeds(next.join(', '));
                      };
                      const customText = needsParts.filter(p => !SPECIAL_NEEDS_OPTIONS.includes(p)).join(', ');
                      return (
                        <>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: showNeedsCustom ? 10 : 0 }}>
                            {SPECIAL_NEEDS_OPTIONS.map(opt => {
                              const active = needsParts.includes(opt);
                              return (
                                <button key={opt} onClick={() => togglePreset(opt)} style={{
                                  padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                  border: `2px solid ${active ? LC.accent : LC.border}`,
                                  background: active ? LC.accent + '15' : '#fff',
                                  color: active ? LC.accent : LC.text, fontWeight: active ? 700 : 400,
                                }}>{opt}</button>
                              );
                            })}
                            <button onClick={() => setShowNeedsCustom(v => !v)} style={{
                              padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                              border: `2px solid ${showNeedsCustom ? LC.accent : LC.border}`,
                              background: showNeedsCustom ? LC.accent + '15' : '#fff',
                              color: showNeedsCustom ? LC.accent : LC.text, fontWeight: showNeedsCustom ? 700 : 400,
                            }}>Other</button>
                          </div>
                          {showNeedsCustom && (
                            <input style={lInput} value={customText} placeholder="Describe additional needs..."
                              onChange={e => {
                                const presets = needsParts.filter(p => SPECIAL_NEEDS_OPTIONS.includes(p));
                                const custom = e.target.value;
                                setNeeds([...presets, ...(custom.trim() ? [custom.trim()] : [])].join(', '));
                              }} />
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label onClick={() => setHasPlusOne(!hasPlusOne)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 7, border: `2px solid ${hasPlusOne ? LC.accent : LC.border}`,
                        background: hasPlusOne ? LC.accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, flexShrink: 0, transition: 'all 0.12s',
                      }}>{hasPlusOne ? '✓' : ''}</div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: LC.text }}>I'm bringing a plus-one</span>
                    </label>
                    {hasPlusOne && (
                      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 36 }}>
                        <input style={lInput} value={plusOne} onChange={e => setPlusOne(e.target.value)} placeholder="Their name" />
                        <div>
                          <div style={{ fontSize: 12, color: LC.muted, marginBottom: 8 }}>Their meal preference</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {mealOpts.map(m => (
                              <button key={m} onClick={() => setPlusOneMeal(m)} style={{
                                padding: '7px 14px', borderRadius: 10, border: `2px solid ${plusOneMeal === m ? LC.accent : LC.border}`,
                                background: plusOneMeal === m ? LC.accent + '15' : '#fff', color: plusOneMeal === m ? LC.accent : LC.text,
                                cursor: 'pointer', fontSize: 13, fontWeight: plusOneMeal === m ? 700 : 400, transition: 'all 0.12s',
                              }}>{m}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: LC.text, display: 'block', marginBottom: 10 }}>Children in your party</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button onClick={() => setKids(Math.max(0, kids - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${LC.border}`, background: '#fff', color: LC.text, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                      <span style={{ fontSize: 24, fontWeight: 800, color: LC.text, minWidth: 28, textAlign: 'center' }}>{kids}</span>
                      <button onClick={() => setKids(kids + 1)} style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${LC.border}`, background: '#fff', color: LC.text, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                    </div>
                  </div>
                </>
              )}

              {rsvp === 'No' && (
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: LC.text, display: 'block', marginBottom: 8 }}>Message (optional)</label>
                  <textarea style={{ ...lInput, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} value={needs} onChange={e => setNeeds(e.target.value)} placeholder="We'll miss you! Anything you'd like to share…" />
                </div>
              )}

              <button
                onClick={submit}
                disabled={!name.trim() || !rsvp}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  background: name.trim() && rsvp ? LC.accent : LC.border,
                  color: '#fff', fontSize: 16, fontWeight: 800,
                  cursor: name.trim() && rsvp ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s', opacity: name.trim() && rsvp ? 1 : 0.5, letterSpacing: '-0.01em',
                }}
              >
                {rsvp === 'No' ? 'Send my regrets' : 'Submit RSVP →'}
              </button>
            </div>
          )}

          {!submitted && (
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9999aa' }}>
              Powered by <strong style={{ color: LC.accent }}>ngw</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Guests ───────────────────────────────────────────────────────────────────

function Guests({ guests, setGuests, event = {} }) {
  const C      = useT();
  const s      = makeS(C);
  const rsvpCLR = RSVP_CLR(C);
  const bp = useContext(BpCtx);
  const [modalId,    setModalId]  = useState(null);
  const [copied,     setCopied]   = useState(false);
  const [showRsvp,   setShowRsvp] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [gFilter,    setGFilter]  = useState('all');
  const [gSort,      setGSort]    = useState('name');
  const [gSearch,    setGSearch]  = useState('');
  const [importMsg,  setImportMsg] = useState(null); // { added, updated, text }
  const importRef = useRef(null);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) { setImportMsg({ text: 'No rows found in file.' }); return; }

        // Flexible column matching — case-insensitive, common variations
        const col = (row, ...keys) => {
          const found = Object.keys(row).find(k => keys.some(key => k.toLowerCase().replace(/[\s_-]/g,'') === key.toLowerCase().replace(/[\s_-]/g,'')));
          return found ? String(row[found]).trim() : '';
        };

        let added = 0, updated = 0;
        setGuests(gs => {
          let next = [...gs];
          rows.forEach(row => {
            const name = col(row, 'name', 'fullname', 'guestname', 'guest');
            if (!name) return;
            const rsvp  = col(row, 'rsvp', 'response', 'attending', 'status');
            const email = col(row, 'email', 'emailaddress');
            const phone = col(row, 'phone', 'phonenumber', 'mobile', 'cell');
            const group = col(row, 'group', 'party', 'side', 'table group');
            const meal  = col(row, 'meal', 'mealchoice', 'entree', 'food');
            const needs = col(row, 'needs', 'dietary', 'restrictions', 'allergies');

            const normRsvp = (r) => {
              const v = r.toLowerCase();
              if (v === 'yes' || v === 'y' || v === 'confirmed' || v === 'attending') return 'Yes';
              if (v === 'no'  || v === 'n' || v === 'declined'  || v === 'not attending') return 'No';
              if (v === 'maybe' || v === 'm' || v === 'possibly') return 'Maybe';
              return r || '';
            };

            const existing = next.find(g => g.name.toLowerCase() === name.toLowerCase());
            if (existing) {
              next = next.map(g => g.id === existing.id ? {
                ...g,
                ...(rsvp  && { rsvp: normRsvp(rsvp) }),
                ...(email  && { email }),
                ...(phone  && { phone }),
                ...(group  && { group }),
                ...(meal   && { meal }),
                ...(needs  && { needs }),
              } : g);
              updated++;
            } else {
              next.push({ id: uid(), name, group: group || 'Friends', rsvp: normRsvp(rsvp), meal: meal || '—', needs: needs || '', email: email || '', phone: phone || '', address: '', table: null, plusOne: '', plusOneMeal: '—', kids: 0, giftReceived: false, thankYouSent: false, partyNotes: '' });
              added++;
            }
          });
          return next;
        });
        setImportMsg({ added, updated, text: `Imported: ${added} added, ${updated} updated.` });
        setTimeout(() => setImportMsg(null), 5000);
      } catch (err) {
        setImportMsg({ text: `Import failed: ${err.message}` });
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // Merge any queued RSVPs submitted via the public RSVP link.
  // setGuests is stable (from useState), so omitting it is safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!event?.id) return;
    const key = `ngw-rsvp-queue-${event.id}`;
    try {
      const queued = JSON.parse(localStorage.getItem(key) || '[]');
      if (!queued.length) return;
      queued.forEach(data => {
        setGuests(gs => {
          const nameParts = (data.name || '').toLowerCase().split(' ').filter(Boolean);
          const first = nameParts[0] || '';
          const last  = nameParts[nameParts.length - 1] || '';
          // Match on full name first, then last+first, then exact first name only (≥4 chars to avoid short collisions)
          const match = gs.find(g => {
            const gn = g.name.toLowerCase();
            const gParts = gn.split(' ').filter(Boolean);
            const gFirst = gParts[0] || '';
            const gLast  = gParts[gParts.length - 1] || '';
            if (data.name && gn === (data.name || '').toLowerCase()) return true;
            if (last && last.length >= 3 && gLast === last && gFirst === first) return true;
            if (first.length >= 4 && gFirst === first) return true;
            return false;
          });
          if (match) return gs.map(g => g.id === match.id ? { ...g, rsvp: data.rsvp, meal: data.rsvp === 'Yes' ? (data.meal || g.meal) : g.meal, needs: data.needs || g.needs, plusOne: data.plusOne || g.plusOne, plusOneMeal: data.plusOneMeal || g.plusOneMeal, kids: data.kids || g.kids } : g);
          return [...gs, { id: uid(), name: data.name, group: 'Friends', rsvp: data.rsvp, meal: data.meal || '—', needs: data.needs || '', plusOne: data.plusOne || '', plusOneMeal: data.plusOneMeal || '—', kids: data.kids || 0, table: null, email: '', phone: '', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' }];
        });
      });
      localStorage.removeItem(key);
    } catch {}
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const yes   = guests.filter(g => g.rsvp === 'Yes').length;
  const no    = guests.filter(g => g.rsvp === 'No').length;
  const maybe = guests.filter(g => g.rsvp === 'Maybe').length;
  const kids  = guests.filter(g => g.rsvp === 'Yes').reduce((s, g) => s + (g.kids || 0), 0);

  const modalGuest = guests.find(g => g.id === modalId);
  const confirmed  = guests.filter(g => g.rsvp === 'Yes');
  const needsFlag  = confirmed.filter(g => g.needs);

  const add = () => {
    const ng = { id: uid(), name: '', group: 'Friends', rsvp: '', meal: '—', table: null, plusOne: '', plusOneMeal: '—', kids: 0, needs: '', email: '', phone: '', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' };
    setGuests(g => [...g, ng]);
    setModalId(ng.id);
  };
  const del = (id) => { setGuests(g => g.filter(r => r.id !== id)); setModalId(null); };
  const upd = (id, key, val) => setGuests(g => g.map(r => r.id === id ? { ...r, [key]: val } : r));

  const handleRsvpSubmit = (data) => {
    const first = data.name.toLowerCase().split(' ')[0];
    const existing = guests.find(g => {
      const gFirst = g.name.toLowerCase().split(' ')[0];
      return g.name.toLowerCase().includes(first) || first.includes(gFirst);
    });
    if (existing) {
      setGuests(gs => gs.map(g => g.id === existing.id
        ? { ...g, rsvp: data.rsvp, meal: data.meal, needs: data.needs || g.needs, plusOne: data.plusOne || g.plusOne, plusOneMeal: data.plusOneMeal || g.plusOneMeal, kids: data.kids || g.kids }
        : g
      ));
    } else {
      setGuests(gs => [...gs, { id: uid(), name: data.name, group: 'Friends', rsvp: data.rsvp, meal: data.meal, needs: data.needs, plusOne: data.plusOne, plusOneMeal: data.plusOneMeal, kids: data.kids, table: null, email: '', phone: '', address: '', giftReceived: false, thankYouSent: false, partyNotes: '' }]);
    }
  };

  const mealCounts = confirmed.reduce((acc, g) => {
    if (g.meal && g.meal !== '—') acc[g.meal] = (acc[g.meal] || 0) + 1;
    if (g.plusOne && g.plusOneMeal && g.plusOneMeal !== '—') acc[g.plusOneMeal] = (acc[g.plusOneMeal] || 0) + 1;
    return acc;
  }, {});

  const thankYouPending = confirmed.filter(g => g.giftReceived && !g.thankYouSent).length;

  const visibleGuests = guests
    .filter(g => {
      if (gFilter === 'Yes' || gFilter === 'No' || gFilter === 'Maybe') return g.rsvp === gFilter;
      return true;
    })
    .filter(g => {
      if (!gSearch) return true;
      const q = gSearch.toLowerCase();
      return g.name.toLowerCase().includes(q) || (g.group || '').toLowerCase().includes(q) || (g.meal || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (gSort === 'group') return (a.group || '').localeCompare(b.group || '');
      if (gSort === 'rsvp')  return (a.rsvp || '').localeCompare(b.rsvp || '');
      if (gSort === 'table') return (a.table || 999) - (b.table || 999);
      if (gSort === 'meal')  return (a.meal || '').localeCompare(b.meal || '');
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <div>
      {showRsvp && (
        <RSVPFormView
          event={event}
          onSubmit={handleRsvpSubmit}
          onClose={() => setShowRsvp(false)}
        />
      )}
      {modalGuest && (
        <GuestModal
          guest={modalGuest}
          tables={event.tables || 5}
          onClose={() => setModalId(null)}
          onChange={(key, val) => upd(modalId, key, val)}
          onDelete={() => del(modalId)}
        />
      )}
      {showInvite && (
        <InviteComposer event={event} guests={guests} onClose={() => setShowInvite(false)} />
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Invited"  value={guests.length} />
        <StatCard label="Confirmed"      value={yes}   color={C.success} />
        <StatCard label="Declined"       value={no}    color={C.danger} />
        <StatCard label="Awaiting"       value={maybe} color={C.warn} />
        {kids > 0 && <StatCard label="Kids Meals" value={kids} color={C.accent2} />}
        {thankYouPending > 0 && <StatCard label="Thank-Yous Due" value={thankYouPending} color={C.accent} sub="gifts received, note unsent" />}
      </div>

      {(() => {
        const rsvpCode = event?.rsvpCode || event?.id || '';
        const rsvpUrl  = rsvpCode ? `${window.location.origin}${window.location.pathname}?rsvp=${rsvpCode}` : '';
        const copyRsvp = () => {
          if (rsvpUrl) navigator.clipboard?.writeText(rsvpUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
        };
        return (
          <div style={{ ...s.card, padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>RSVP Collection Link</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, wordBreak: 'break-all' }}>{rsvpUrl || '—'}</div>
                <div style={{ fontSize: 11, color: C.accent2, marginTop: 2 }}>Responses feed directly into this list</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button style={s.btn('teal')} onClick={() => setShowRsvp(true)}>Preview →</button>
                <button style={s.btn(copied ? 'teal' : 'default')} onClick={copyRsvp}>{copied ? '✓ Copied!' : 'Copy Link'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {needsFlag.length > 0 && (
        <div style={{ ...s.card, borderColor: C.warn + '55' }}>
          <div style={s.cardTitle}>Special Needs — {needsFlag.length} guest{needsFlag.length !== 1 ? 's' : ''} confirmed</div>
          {needsFlag.map(g => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{g.name}</span>
              <span style={{ fontSize: 12, color: C.warn }}>{g.needs}</span>
            </div>
          ))}
        </div>
      )}

      {/* Non-responder follow-up alert */}
      {(() => {
        const nonResponders = guests.filter(g => !g.rsvp || g.rsvp === 'Maybe');
        const daysLeft = event?.date ? daysUntil(event.date) : null;
        if (!nonResponders.length || daysLeft === null || daysLeft > 90) return null;
        return (
          <div style={{ ...s.card, borderColor: C.warn + '66', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.warn }}>{nonResponders.length} guest{nonResponders.length !== 1 ? 's' : ''} haven't responded — {daysLeft}d to go</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nonResponders.map(g => {
                const emailLink = g.email ? `mailto:${g.email}?subject=${encodeURIComponent('RSVP Reminder')}&body=${encodeURIComponent(`Hi ${g.name.split(' ')[0]},\n\nJust a friendly reminder to RSVP for ${event?.name || 'our event'}!\n\nWe'd love to know if you'll be joining us.`)}` : null;
                const smsLink   = g.phone  ? `sms:${g.phone}?body=${encodeURIComponent(`Hi ${g.name.split(' ')[0]}! Just checking in — did you get a chance to RSVP for ${event?.name || 'our event'}?`)}` : null;
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, fontSize: 13 }}>{g.name} <span style={{ color: C.muted, fontSize: 11 }}>{g.rsvp === 'Maybe' ? '· Maybe' : '· No response'}</span></div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {emailLink && <a href={emailLink} style={{ ...s.btn(), fontSize: 10, padding: '3px 8px', textDecoration: 'none' }}>Email</a>}
                      {smsLink   && <a href={smsLink}   style={{ ...s.btn(), fontSize: 10, padding: '3px 8px', textDecoration: 'none' }}>Text</a>}
                      {!emailLink && !smsLink && <span style={{ fontSize: 10, color: C.muted }}>No contact</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={s.cardTitle}>Guest List ({visibleGuests.length}{visibleGuests.length !== guests.length ? ` of ${guests.length}` : ''})</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btn()} onClick={() => setShowInvite(true)}>✉ Send Invitations</button>
            <button style={s.btn()} onClick={() => importRef.current?.click()}>⬆ Import</button>
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImport} />
            <button style={s.btn('primary')} onClick={add}>+ Add Guest</button>
          </div>
        </div>
        {importMsg && (
          <div style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, marginBottom: 10, background: importMsg.text?.startsWith('Import failed') ? C.danger + '22' : C.success + '22', color: importMsg.text?.startsWith('Import failed') ? C.danger : C.success, border: `1px solid ${importMsg.text?.startsWith('Import failed') ? C.danger : C.success}44` }}>
            {importMsg.text}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...s.input, flex: 1, minWidth: 130, maxWidth: 220 }} value={gSearch} onChange={e => setGSearch(e.target.value)} placeholder="Search name, group, meal…" />
          {['all', 'Yes', 'No', 'Maybe'].map(f => (
            <button key={f} onClick={() => setGFilter(f)}
              style={{ ...s.btn(gFilter === f ? 'primary' : 'ghost'), fontSize: 11, padding: '5px 10px' }}>
              {f === 'all' ? 'All' : f === 'Yes' ? 'Confirmed' : f === 'No' ? 'Declined' : 'Awaiting'}
            </button>
          ))}
          <select style={{ ...s.input, width: 'auto', padding: '5px 10px', fontSize: 11 }} value={gSort} onChange={e => setGSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="group">Sort: Group</option>
            <option value="rsvp">Sort: RSVP</option>
            <option value="table">Sort: Table</option>
            <option value="meal">Sort: Meal</option>
          </select>
        </div>
        {(bp === 'mobile' || bp === 'tablet') ? (
          <div>
            {visibleGuests.map(g => (
              <div key={g.id} onClick={() => setModalId(g.id)}
                style={{ padding: '12px 0', borderTop: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name || <span style={{ color: C.muted }}>—</span>}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: C.muted }}>{g.group}</span>
                    {g.meal && g.meal !== '—' && <span style={s.pill(C.accent2)}>{g.meal}</span>}
                    {g.table && <span style={{ fontSize: 11, color: C.muted }}>Table {g.table}</span>}
                    {g.needs && <span style={{ fontSize: 11, color: C.warn }}>⚠ {g.needs}</span>}
                    {g.plusOne && <span style={{ fontSize: 11, color: C.muted }}>+{g.plusOne}</span>}
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...s.pill(rsvpCLR[g.rsvp] || C.muted), cursor: 'pointer' }} title="Click to change RSVP" onClick={e => { e.stopPropagation(); const cycle = { 'Yes': 'No', 'No': 'Maybe', 'Maybe': '', '': 'Yes', undefined: 'Yes' }; setGuests(gs => gs.map(x => x.id === g.id ? { ...x, rsvp: cycle[g.rsvp] ?? 'Yes' } : x)); }}>{g.rsvp}</span>
                  <span style={{ color: C.muted, fontSize: 16 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['Name', 'Group', 'RSVP', 'Meal', 'Table', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visibleGuests.map(g => (
                <tr key={g.id} onClick={() => setModalId(g.id)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 500 }}>{g.name || <span style={{ color: C.muted }}>—</span>}</div>
                    {g.needs && <div style={{ fontSize: 10, color: C.warn, marginTop: 2 }}>⚠ {g.needs}</div>}
                    {g.plusOne && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>+1 {g.plusOne}</div>}
                  </td>
                  <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{g.group}</td>
                  <td style={s.td}><span style={{ ...s.pill(rsvpCLR[g.rsvp] || C.muted), cursor: 'pointer' }} title="Click to change RSVP" onClick={e => { e.stopPropagation(); const cycle = { 'Yes': 'No', 'No': 'Maybe', 'Maybe': '', '': 'Yes', undefined: 'Yes' }; setGuests(gs => gs.map(x => x.id === g.id ? { ...x, rsvp: cycle[g.rsvp] ?? 'Yes' } : x)); }}>{g.rsvp}</span></td>
                  <td style={{ ...s.td, fontSize: 12, color: g.meal === '—' ? C.muted : C.text }}>{g.meal}</td>
                  <td style={{ ...s.td, color: g.table ? C.text : C.muted, fontSize: 12 }}>{g.table || '—'}</td>
                  <td style={{ ...s.td, color: C.muted, fontSize: 18, lineHeight: 1 }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {confirmed.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: C.muted }}>Meal breakdown ({confirmed.length} confirmed):</span>
            {Object.entries(mealCounts).map(([meal, count]) => <span key={meal} style={s.pill(C.accent2)}>{meal}: {count}</span>)}
            {kids > 0 && <span style={s.pill(C.warn)}>Kids meals: {kids}</span>}
          </div>
        )}
      </div>

      {/* ── Thank-You Tracker ── */}
      {confirmed.length > 0 && (() => {
        const thanked   = confirmed.filter(g => g.thankYouSent).length;
        const gifted    = confirmed.filter(g => g.giftReceived).length;
        const pending   = confirmed.filter(g => g.giftReceived && !g.thankYouSent);
        const ordered   = confirmed; // stable order — rows don't jump when toggled
        const pct       = confirmed.length > 0 ? Math.round((thanked / confirmed.length) * 100) : 0;

        const toggle = (gId, key) => setGuests(gs => gs.map(g => g.id === gId ? { ...g, [key]: !g[key] } : g));

        const giftPct     = confirmed.length > 0 ? Math.round((gifted / confirmed.length) * 100) : 0;
        const TH_STYLE    = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, padding: '0 8px 8px', textAlign: 'center', borderBottom: `1px solid ${C.border}` };
        const TH_L_STYLE  = { ...TH_STYLE, textAlign: 'left', paddingLeft: 0 };

        return (
          <div style={s.card}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={s.cardTitle}>Thank-You Tracker</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {pending.length > 0 && <span style={s.pill(C.warn)}>{pending.length} pending</span>}
                <span style={{ fontSize: 12, color: C.muted }}>{gifted} received · {thanked}/{confirmed.length} sent</span>
              </div>
            </div>

            {/* Two-stage progress bar */}
            {(() => {
              const isLight = C.surface === '#ffffff';
              const fillGrad = (clr) => [`linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.10) 40%, rgba(0,0,0,0.00) 55%, rgba(0,0,0,0.12) 100%)`, clr].join(', ');
              return (
                <div style={{
                  height: 8, borderRadius: 99, position: 'relative', marginBottom: 14, overflow: 'hidden',
                  background: isLight ? `linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 55%), ${C.surface2}` : `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 55%, transparent 100%), ${C.surface2}`,
                  boxShadow: isLight ? 'inset 0 1px 3px rgba(0,0,0,0.14)' : 'inset 0 2px 4px rgba(0,0,0,0.40)',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${giftPct}%`, background: fillGrad(C.warn + 'bb'), borderRadius: 99, transition: 'width 0.4s ease' }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: fillGrad(pct === 100 ? C.success : C.accent2), borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
              );
            })()}

            {/* Table — guaranteed column alignment */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH_L_STYLE}>Guest</th>
                  <th style={TH_STYLE}>Gift</th>
                  <th style={TH_STYLE}>Thank-You</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map(g => {
                  const isPending = g.giftReceived && !g.thankYouSent;
                  const isDone    = g.thankYouSent;
                  return (
                    <tr key={g.id} style={{
                      background: isPending ? C.warn + '09' : isDone ? C.success + '08' : 'transparent',
                      opacity: isDone ? 0.6 : 1,
                    }}>
                      <td style={{ padding: '8px 8px 8px 0', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' }}>
                        <div style={{ fontSize: 13, fontWeight: isDone ? 400 : 500, color: C.text }}>{g.name}</div>
                        {g.partyNotes && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{g.partyNotes}</div>}
                      </td>
                      <td style={{ padding: '8px', borderBottom: `1px solid ${C.border}`, textAlign: 'center', verticalAlign: 'middle', width: 110 }}>
                        <button onClick={() => toggle(g.id, 'giftReceived')} style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                          border: `1px solid ${g.giftReceived ? C.success : C.border}`,
                          background: g.giftReceived ? C.success + '18' : C.bg,
                          color: g.giftReceived ? C.success : C.muted,
                        }}>{g.giftReceived ? '✓ Received' : 'Mark'}</button>
                      </td>
                      <td style={{ padding: '8px', borderBottom: `1px solid ${C.border}`, textAlign: 'center', verticalAlign: 'middle', width: 110 }}>
                        <button onClick={() => {
                          if (!g.thankYouSent) {
                            const msg = `Hi ${g.name.split(' ')[0]}, thank you so much for the gift and for celebrating with us! It means the world. 💛`;
                            navigator.clipboard?.writeText(msg).catch(() => {});
                          }
                          toggle(g.id, 'thankYouSent');
                        }} style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                          border: `1px solid ${g.thankYouSent ? C.accent2 : g.giftReceived ? C.warn + '88' : C.border}`,
                          background: g.thankYouSent ? C.accent2 + '18' : g.giftReceived ? C.warn + '12' : C.bg,
                          color: g.thankYouSent ? C.accent2 : g.giftReceived ? C.warn : C.muted,
                          opacity: g.giftReceived ? 1 : 0.4,
                          title: !g.thankYouSent ? 'Copies a thank-you message to your clipboard' : '',
                        }}>{g.thankYouSent ? '✓ Sent' : 'Mark Sent'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pct === 100 && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: C.success }}>All thank-you notes sent!</div>
            )}
          </div>
        );
      })()}

      {/* ── Vendor Impact Summaries ── */}
      {(() => {
        if (confirmed.length === 0) return null;

        // F&B data
        const mealBreakdown = Object.entries(mealCounts).sort((a, b) => b[1] - a[1]);
        const totalKids     = confirmed.reduce((sum, g) => sum + (g.kids || 0), 0);
        const allNeeds      = confirmed.flatMap(g => (g.needs || '').split(',').map(n => n.trim()).filter(Boolean));
        const needsCounts   = allNeeds.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});
        const totalPlusOnes = confirmed.filter(g => g.plusOne).length;
        const fbHeadcount   = confirmed.length + totalPlusOnes;

        // Venue / logistics data
        const accessible   = confirmed.filter(g => (g.needs || '').toLowerCase().includes('wheelchair')).length;
        const maybeCount   = guests.filter(g => g.rsvp === 'Maybe').length;
        const noResponse   = guests.filter(g => !g.rsvp).length;
        const tablesUsed   = [...new Set(confirmed.map(g => g.table).filter(Boolean))].length;

        const copyText = (text) => navigator.clipboard?.writeText(text).catch(() => {});

        const fbText = [
          `F&B Summary — ${event.name || 'Event'}`,
          `Confirmed headcount: ${fbHeadcount} (${confirmed.length} primary + ${totalPlusOnes} plus-one${totalPlusOnes !== 1 ? 's' : ''})`,
          totalKids > 0 ? `Children: ${totalKids} (require kids meals)` : null,
          mealBreakdown.length > 0 ? `Meal selections: ${mealBreakdown.map(([m, c]) => `${m} ×${c}`).join(', ')}` : null,
          Object.keys(needsCounts).length > 0 ? `Dietary/special needs: ${Object.entries(needsCounts).map(([n, c]) => `${n}${c > 1 ? ` ×${c}` : ''}`).join(', ')}` : null,
        ].filter(Boolean).join('\n');

        const venueText = [
          `Venue/Logistics Summary — ${event.name || 'Event'}`,
          `Confirmed attendance: ${fbHeadcount}`,
          tablesUsed > 0 ? `Tables assigned: ${tablesUsed}` : null,
          accessible > 0 ? `Accessibility needs: ${accessible} guest${accessible > 1 ? 's' : ''} require wheelchair access` : null,
          maybeCount > 0 ? `Undecided (Maybe): ${maybeCount}` : null,
          noResponse > 0 ? `No response yet: ${noResponse}` : null,
        ].filter(Boolean).join('\n');

        return (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendor Impact Summaries</div>
              <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>Copy and send manually — planner-reviewed before sharing</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

              {/* F&B Summary */}
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent2 }}>🍽 Food & Beverage</div>
                  <button onClick={() => copyText(fbText)}
                    style={{ ...makeS(C).btn('ghost'), fontSize: 10, padding: '3px 8px' }}>Copy</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: C.muted }}>Confirmed headcount</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{fbHeadcount}</span>
                  </div>
                  {totalPlusOnes > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Plus-ones</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{totalPlusOnes}</span>
                    </div>
                  )}
                  {totalKids > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Kids meals needed</span>
                      <span style={{ fontWeight: 600, color: C.warn }}>{totalKids}</span>
                    </div>
                  )}
                  {mealBreakdown.length > 0 && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Meal selections</div>
                      {mealBreakdown.map(([meal, count]) => (
                        <div key={meal} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                          <span style={{ color: C.text }}>{meal}</span>
                          <span style={{ fontWeight: 700, color: C.accent }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {Object.keys(needsCounts).length > 0 && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Dietary / Special Needs</div>
                      {Object.entries(needsCounts).map(([need, count]) => (
                        <div key={need} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                          <span style={{ color: C.text }}>{need}</span>
                          {count > 1 && <span style={{ fontWeight: 700, color: C.warn }}>×{count}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {Object.keys(needsCounts).length === 0 && mealBreakdown.length === 0 && (
                    <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>No meal selections or dietary needs recorded.</div>
                  )}
                </div>
              </div>

              {/* Venue / Logistics Summary */}
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>🏛 Venue & Logistics</div>
                  <button onClick={() => copyText(venueText)}
                    style={{ ...makeS(C).btn('ghost'), fontSize: 10, padding: '3px 8px' }}>Copy</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: C.muted }}>Confirmed attendance</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{fbHeadcount}</span>
                  </div>
                  {tablesUsed > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Tables assigned</span>
                      <span style={{ fontWeight: 600, color: C.text }}>{tablesUsed}</span>
                    </div>
                  )}
                  {accessible > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Wheelchair access needed</span>
                      <span style={{ fontWeight: 700, color: C.warn }}>{accessible}</span>
                    </div>
                  )}
                  {maybeCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Still undecided</span>
                      <span style={{ fontWeight: 600, color: C.muted }}>{maybeCount}</span>
                    </div>
                  )}
                  {noResponse > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: C.muted }}>No response yet</span>
                      <span style={{ fontWeight: 600, color: C.danger }}>{noResponse}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Seating ──────────────────────────────────────────────────────────────────

function Seating({ guests, setGuests, tables, onTablesChange, tableNames, onTableNamesChange }) {
  const C = useT();
  const s = makeS(C);
  const bp = useContext(BpCtx);
  const [selected,      setSelected]      = useState(null);
  const [search,        setSearch]         = useState('');
  const [guestModalId,  setGuestModalId]   = useState(null);
  const [editingTable,  setEditingTable]   = useState(null);
  const [editName,      setEditName]       = useState('');
  const tableCount    = tables || 5;
  const confirmed     = guests.filter(g => g.rsvp === 'Yes');
  const searchLower   = search.toLowerCase();
  const unassigned    = confirmed.filter(g => !g.table && (search === '' || g.name.toLowerCase().includes(searchLower)));
  const guestForModal = guests.find(g => g.id === guestModalId);
  const seated        = confirmed.filter(g => g.table).length;
  const assign        = (gid, t) => { setGuests(g => g.map(r => r.id === gid ? { ...r, table: t } : r)); setSelected(null); };
  const unassign      = (gid) => setGuests(g => g.map(r => r.id === gid ? { ...r, table: null } : r));
  const pickUp        = (g) => { unassign(g.id); setSelected(g.id); };
  const autoAssignByGroup = () => {
    const groups = [...new Set(confirmed.map(g => g.group).filter(Boolean))];
    const tableNums = Array.from({ length: tableCount }, (_, i) => i + 1);
    let tableIdx = 0;
    const updates = {};
    groups.forEach(group => {
      const members = confirmed.filter(g => g.group === group && !g.table);
      members.forEach(g => {
        updates[g.id] = tableNums[tableIdx % tableCount];
        tableIdx++;
      });
    });
    setGuests(gs => gs.map(g => updates[g.id] ? { ...g, table: updates[g.id] } : g));
  };
  const mealShort     = { Standard: 'Std', Vegetarian: 'Veg', Vegan: 'Vgn', 'Gluten-Free': 'GF', '—': '' };
  const selectedGuest = selected ? guests.find(g => g.id === selected) : null;
  const isMobile = bp === 'mobile' || bp === 'tablet';

  return (
    <div>
      {guestForModal && (
        <GuestModal
          guest={guestForModal}
          tables={tableCount}
          onClose={() => setGuestModalId(null)}
          onChange={(key, val) => setGuests(gs => gs.map(g => g.id === guestModalId ? { ...g, [key]: val } : g))}
          onDelete={() => { setGuests(gs => gs.filter(g => g.id !== guestModalId)); setGuestModalId(null); }}
        />
      )}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <StatCard label="Confirmed" value={confirmed.length} color={C.accent} />
        <StatCard label="Seated" value={seated} color={seated === confirmed.length && confirmed.length > 0 ? C.success : C.warn} sub={`${unassigned.length} unassigned`} />
        <div style={{ ...s.card, flex: 1, minWidth: 110, marginBottom: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 8 }}>Tables</div>
          <input type="number" min="1" max="50" value={tableCount} onChange={e => onTablesChange && onTablesChange(Math.max(1, Number(e.target.value) || 1))} style={{ ...s.statNum(), fontSize: 28, border: 'none', background: 'transparent', outline: 'none', width: 64, padding: 0, fontFamily: "'Inter', system-ui, sans-serif" }} />
        </div>
        <StatCard label="Avg / Table" value={confirmed.length ? Math.round(confirmed.length / tableCount) : '—'} />
      </div>

      {/* Search + instruction / status banner */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <input style={{ ...s.input, flex: 1, maxWidth: 300 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests…" />
        {search && <button style={s.btn('ghost')} onClick={() => setSearch('')}>✕</button>}
      </div>
      <div style={{ ...s.card, background: selected ? C.accent + '14' : C.bg, borderColor: selected ? C.accent + '88' : C.border, marginBottom: 16, padding: '10px 16px', transition: 'all 0.2s' }}>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, flexShrink: 0, animation: 'pulse 1.2s infinite' }} />
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Seating <strong>{selectedGuest?.name}</strong> — tap any table below to assign their seat</span>
            <button style={{ ...s.btn('ghost'), marginLeft: 'auto', fontSize: 11, color: C.muted }} onClick={() => setSelected(null)}>Cancel</button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.muted }}>
            {unassigned.length === 0 && confirmed.length > 0
              ? <span style={{ color: C.success, fontWeight: 600 }}>All confirmed guests are seated.</span>
              : confirmed.length === 0
              ? <span>No confirmed guests yet. Mark guests as Attending in the Guests tab first.</span>
              : <span>Tap an unassigned guest to select them, then tap a table to assign their seat. Use ⇄ to move a seated guest.</span>
            }
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Unassigned panel */}
        {unassigned.length > 0 && (
          <div style={{ width: isMobile ? '100%' : 220, flexShrink: 0 }}>
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={s.cardTitle}>Unassigned ({unassigned.length})</div>
                <button onClick={autoAssignByGroup} style={{ ...s.btn('ghost'), fontSize: 11, padding: '3px 10px', marginLeft: 'auto' }}>
                  Auto-assign by group
                </button>
              </div>
              {unassigned.map(g => (
                <div key={g.id} onClick={() => setSelected(selected === g.id ? null : g.id)}
                  style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6, cursor: 'pointer', border: `1px solid ${selected === g.id ? C.accent : C.border}`, background: selected === g.id ? C.accent + '18' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.12s' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: selected === g.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    {g.needs && <div style={{ fontSize: 10, color: C.warn, marginTop: 1 }}>{g.needs}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                    {g.meal !== '—' && g.meal !== 'Standard' && <span style={{ ...s.pill(C.accent2), fontSize: 10 }}>{mealShort[g.meal]}</span>}
                    <button title="View guest info" onClick={e => { e.stopPropagation(); setGuestModalId(g.id); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: '1px 4px' }}>ⓘ</button>
                    <span style={{ fontSize: 12, color: selected === g.id ? C.accent : C.muted, fontWeight: selected === g.id ? 700 : 400 }}>{selected === g.id ? 'Assign →' : '→'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tables grid */}
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            {Array.from({ length: tableCount }, (_, i) => i + 1).map(tableNum => {
              const tg    = confirmed.filter(g => g.table === tableNum);
              const meals = tg.reduce((acc, g) => { if (g.meal !== '—') acc[g.meal] = (acc[g.meal] || 0) + 1; return acc; }, {});
              const tKids = tg.reduce((sum, g) => sum + (g.kids || 0), 0);
              const clickable = !!selected;
              return (
                <div key={tableNum} onClick={() => clickable && assign(selected, tableNum)}
                  style={{ ...s.card, cursor: clickable ? 'pointer' : 'default', borderColor: clickable ? C.accent + '99' : C.border, marginBottom: 0, background: clickable ? C.accent + '08' : C.surface, transition: 'all 0.15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    {editingTable === tableNum ? (
                      <input autoFocus value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => {
                          const names = [...(tableNames || [])];
                          names[tableNum - 1] = editName.trim();
                          onTableNamesChange && onTableNamesChange(names);
                          setEditingTable(null);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingTable(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'none', border: 'none', outline: `1px solid ${C.accent}`, borderRadius: 4, fontSize: 13, fontWeight: 700, color: C.text, width: '100%', padding: '1px 4px', minWidth: 0 }}
                      />
                    ) : (
                      <span title="Click to rename" style={{ fontSize: 13, fontWeight: 700, cursor: 'text', userSelect: 'none' }}
                        onClick={e => { e.stopPropagation(); setEditingTable(tableNum); setEditName((tableNames || [])[tableNum - 1] || ''); }}>
                        {(tableNames || [])[tableNum - 1] || `Table ${tableNum}`}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: C.muted }}>{tg.length}{tKids > 0 ? ` +${tKids}k` : ''}</span>
                  </div>
                  {clickable && tg.length === 0 && <div style={{ fontSize: 11, color: C.accent, fontStyle: 'italic', marginBottom: 4 }}>Tap to seat here</div>}
                  {!clickable && tg.length === 0 && <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>Empty</div>}
                  {tg.map(g => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setGuestModalId(g.id); }}>
                        <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.accent2 }}>{g.name}</div>
                        {g.needs && <div style={{ fontSize: 9, color: C.warn }}>{g.needs}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 4 }}>
                        {g.meal !== '—' && g.meal !== 'Standard' && <span style={{ ...s.pill(C.accent2), fontSize: 9 }}>{mealShort[g.meal]}</span>}
                        <button title="Move to another table" onClick={e => { e.stopPropagation(); pickUp(g); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: '1px 3px' }}>⇄</button>
                        <button title="Remove from table" onClick={e => { e.stopPropagation(); unassign(g.id); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
                      </div>
                    </div>
                  ))}
                  {Object.keys(meals).length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {Object.entries(meals).map(([meal, count]) => <span key={meal} style={{ ...s.pill(C.muted), fontSize: 9 }}>{mealShort[meal]} ×{count}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

// ─── Vendor Outreach Script Templates ────────────────────────────────────────
// eventTypes that prioritize each vendor type (first match wins for sort)
const SCRIPT_PRIORITY = {
  Photographer:    ['Wedding', 'Bridal Shower', 'Anniversary', 'Graduation', 'Birthday', 'Engagement Party', 'Vow Renewal', 'Quinceañera', 'Sweet 16', 'Retirement Party'],
  Caterer:         ['Wedding', 'Corporate', 'Board Meeting', 'Birthday', 'Anniversary', 'Graduation', 'Holiday Party', 'Conference', 'Product Launch', 'Team Retreat', 'Town Hall', 'Training / Workshop', 'Award Ceremony', 'Client Dinner', 'Engagement Party', 'Vow Renewal', 'Retirement Party', 'Sweet 16', 'Quinceañera', 'Reunion', 'Fundraiser / Gala', 'Networking Event'],
  Florist:         ['Wedding', 'Bridal Shower', 'Anniversary', 'Baby Shower', 'Engagement Party', 'Vow Renewal', 'Quinceañera', 'Fundraiser / Gala'],
  Venue:           ['Wedding', 'Corporate', 'Board Meeting', 'Birthday', 'Anniversary', 'Graduation', 'Holiday Party', 'Conference', 'Fundraiser / Gala', 'Networking Event', 'Team Retreat'],
  'DJ / Band':     ['Wedding', 'Birthday', 'Anniversary', 'Corporate', 'Holiday Party', 'Sweet 16', 'Quinceañera', 'Fundraiser / Gala'],
  Officiant:       ['Wedding', 'Anniversary'],
  'Hair & Makeup': ['Wedding', 'Bridal Shower', 'Anniversary'],
  Transportation:  ['Wedding', 'Corporate', 'Board Meeting', 'Graduation'],
};

const VENDOR_SCRIPTS = [
  {
    type: 'Photographer',
    emoji: '📷',
    subject: 'Potential collaboration — [Event type] events in [City]',
    body: `Hi [Name],

I'm [Your Name] with [Business Name], an event planning business in [City] specializing in [Event type] events.

I'm actively building a trusted vendor list I can recommend to clients without hesitation — and I'm looking for a photographer whose work and communication style I can personally stand behind.

I've seen your work and think there could be a natural fit here. I typically coordinate several events per year and I place photography at the top of the priority list for my clients.

Would you be open to a quick 15-minute call this week to get acquainted?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi, is this [Name]? Great — I'm [Your Name] with [Business Name], an event planning business in [City]. I hope this is an okay time to reach out."

Intro:
"I'm actively building a preferred vendor list for [Event type] events, and photography is one of the first things I nail down for my clients. I came across your work and wanted to introduce myself."

Key questions to ask:
• "How far out are you typically booking right now?"
• "Do you have experience working alongside a day-of coordinator?"
• "What does your communication with the planner usually look like leading up to the event?"
• "Are you open to being on a preferred vendor list?"

Closing:
"I'd love to keep you in mind for upcoming clients. Can I send you a quick email so we stay connected? And is this the best number to reach you?"`,
  },
  {
    type: 'Caterer',
    emoji: '🍽️',
    subject: 'Building a preferred caterer list — would love to connect',
    body: `Hi [Name],

I'm [Your Name], an event planner in [City] working on [Event type] events throughout the year.

Catering is one of the most important decisions my clients make — and I place a premium on caterers who are organized, communicative, and deliver consistently on event day.

I'd love to learn more about your team, your minimums, and how you typically work with planners. Could we schedule a brief call or a quick tasting visit?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi, is this [Name]? I'm [Your Name] with [Business Name] in [City]. I coordinate [Event type] events and I'm building my preferred caterer list — do you have a minute?"

Key questions:
• "What's your typical guest count range and minimum?"
• "How do you handle day-of communication with the event coordinator?"
• "Do you bring your own staff for setup and breakdown, or is that a separate arrangement?"
• "Are you currently booking [season/timeframe]?"

Closing:
"I'd love to learn more — can I send you a follow-up email? And do you do tastings for planners, or is that something I'd schedule with a client present?"`,
  },
  {
    type: 'Florist',
    emoji: '💐',
    subject: 'Floral collaboration inquiry — [City] weddings & events',
    body: `Hi [Name],

I'm [Your Name] with [Business Name]. I coordinate [Event type] events in the [City] area and I'm always looking for talented floral designers I can recommend with confidence.

What I look for in a floral partner: reliability, clear communication on delivery windows, and willingness to work within a coordinated vendor team on the day.

I'd love to see your current availability and discuss how we might collaborate. Open for a brief call?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi [Name], I'm [Your Name] — I'm an event planner in [City] and I coordinate [Event type] events. I've been looking at your work and I wanted to reach out directly."

Key questions:
• "What's your typical lead time for a new client booking?"
• "How do you handle delivery windows — do you coordinate directly with the venue?"
• "Do you work with planners who have a preferred vendor list, or do you prefer direct client relationships?"
• "Is there a minimum budget for the types of events you take on?"

Closing:
"I'd love to refer clients your way when there's a fit. Can I grab your email so I can keep you on my radar? And is this the best number for future calls?"`,
  },
  {
    type: 'Venue',
    emoji: '🏛️',
    subject: 'Planner inquiry — working with your venue team',
    body: `Hi [Name],

I'm [Your Name], an event planner in [City]. I frequently place clients at venues and coordinate closely with venue teams throughout the planning process.

I'd love to do a walkthrough of your space and understand your preferred vendor policies, catering partnerships, and event-day logistics. I want to make sure I'm recommending your venue accurately and setting my clients' expectations correctly from the start.

Would you have 30 minutes for a site visit this month?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi, is this [Name]? I'm [Your Name] with [Business Name] — I'm an event planner in [City] and I place clients at venues for [Event type] events. I wanted to introduce myself."

Key questions:
• "Do you have a preferred vendor list, or are planners free to bring their own team?"
• "What's the typical setup window before an event?"
• "Who's the main point of contact for coordinators on event day?"
• "Are you currently booking [season/timeframe]? What does availability look like?"

Closing:
"A walkthrough would be really valuable — I want to recommend your space accurately and set client expectations right. Do you have 30 minutes for a site visit this month?"`,
  },
  {
    type: 'DJ / Band',
    emoji: '🎵',
    subject: 'Entertainment partnership inquiry — [City] events',
    body: `Hi [Name],

I'm [Your Name] with [Business Name], coordinating [Event type] events in the [City] area.

Music and entertainment make or break the energy of an event — so I'm selective about who I recommend. I'm looking for entertainment partners who read the room, communicate well with the MC / coordinator, and treat event-day logistics seriously.

I'd love to chat and learn more about how you work with planners. Available for a quick call?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hey [Name], this is [Your Name] with [Business Name] in [City]. I coordinate [Event type] events and I'm building a short list of entertainment partners I can recommend — got a minute?"

Key questions:
• "How do you typically coordinate with the event planner in the lead-up to the date?"
• "Do you handle MC duties, or is that a separate arrangement?"
• "What's your process for timeline handoffs — ceremony, cocktail hour, reception?"
• "How far out are you booking and what's your availability looking like?"

Closing:
"I want entertainment partners who treat day-of logistics seriously — it sounds like you'd be a good fit. Can I send you an email and keep you on my list?"`,
  },
  {
    type: 'Officiant',
    emoji: '💍',
    subject: 'Officiant collaboration — wedding planning in [City]',
    body: `Hi [Name],

I'm [Your Name], a wedding planner in [City]. I'm building a short list of officiants I can recommend with confidence — people who are warm, professional, and punctual on the day.

I'd love to learn more about your ceremony style, your process with couples, and how you like to coordinate with planners on the run of show. Open for a quick intro call?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi [Name], I'm [Your Name] — I'm a wedding planner in [City] and I'm putting together a short list of officiants I can recommend to couples with confidence. Is now an okay time?"

Key questions:
• "What ceremony styles do you specialize in — religious, secular, interfaith?"
• "How early do you typically meet with the couple before the wedding date?"
• "Do you work with the planner on the run of show, or do you prefer to go off your own script?"
• "What's your policy on rehearsal attendance?"

Closing:
"I like to know the officiants I recommend personally — it sounds like you'd be a strong fit for the couples I work with. Can we set up a brief intro call?"`,
  },
  {
    type: 'Hair & Makeup',
    emoji: '💄',
    subject: 'Preferred vendor inquiry — [City] wedding planning',
    body: `Hi [Name],

I'm [Your Name] with [Business Name], a wedding and event planning business in [City].

Getting-ready timing is one of the most frequently derailed parts of a wedding day — so I work hard to connect my clients with beauty teams who build realistic timelines and communicate clearly when things shift.

Would you be open to a quick call to talk about how you work with planners and coordinators?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi [Name], I'm [Your Name] with [Business Name] in [City]. I'm a wedding planner and I'm building a list of hair and makeup artists I can trust — do you have a few minutes?"

Key questions:
• "How many people can your team handle in a typical getting-ready window?"
• "How do you build out your timeline — do you work with the planner, or do you create it independently?"
• "What's your policy if the getting-ready schedule starts running late?"
• "Do you travel to the venue, or do clients come to you?"

Closing:
"Getting-ready timing is one of the biggest pressure points on a wedding day — I want vendors who take the timeline seriously. Can I send you a follow-up email to stay connected?"`,
  },
  {
    type: 'Transportation',
    emoji: '🚌',
    subject: 'Shuttle / transportation inquiry — [City] events',
    body: `Hi [Name],

I'm [Your Name], an event planner in [City]. Transportation logistics — shuttle timing, pickup windows, and driver coordination — often fall to me to manage on event day.

I'm looking for a transportation partner who is reliable, has experience with [Event type] logistics, and communicates proactively with the coordinator when schedules shift.

Could we schedule a quick call to discuss your fleet, typical event packages, and how you handle day-of communication?

[Your Name]
[Business Name]
[Phone] · [Email]`,
    phoneScript: `Opening:
"Hi [Name], I'm [Your Name] with [Business Name] in [City]. I coordinate [Event type] events and I'm building a list of transportation partners — is this an okay time?"

Key questions:
• "What types of vehicles do you run — shuttles, limos, sprinters?"
• "How do you handle pickup window adjustments on the day of the event?"
• "Do your drivers communicate directly with the coordinator, or does everything go through your dispatch?"
• "What's your minimum booking and how far out are you typically booked?"

Closing:
"Transportation logistics are one of the trickiest day-of moving pieces — I want a partner who communicates proactively when things shift. Can I send a follow-up email?"`,
  },
];

function VendorScriptsPanel({ profile, event }) {
  const C   = useT();
  const s   = makeS(C);
  const aiKey = useAIKey();
  const [openIdx,  setOpenIdx]  = useState(null);
  const [copied,   setCopied]   = useState(null);
  const [mode,     setMode]     = useState('email'); // 'email' | 'phone'
  const showToast = useToast();
  const [personalizedIdx,  setPersonalizedIdx]  = useState(null);
  const [personalizedText, setPersonalizedText] = useState('');
  const [personalizing,    setPersonalizing]    = useState(false);

  const plannerName  = profile?.name         || '[Your Name]';
  const businessName = profile?.businessName || '[Business Name]';
  const plannerPhone = profile?.phone        || '[Phone]';
  const plannerEmail = profile?.email        || '[Email]';
  const plannerCity  = profile?.city         || '[City]';
  const eventType    = event?.type           || null;

  const fillScript = (raw) =>
    raw
      .replace(/\[Your Name\]/g,      plannerName)
      .replace(/\[Business Name\]/g,  businessName)
      .replace(/\[Phone\]/g,          plannerPhone)
      .replace(/\[Email\]/g,          plannerEmail)
      .replace(/\[City\]/g,           plannerCity)
      .replace(/\[Event type\]/g,     eventType || 'social');

  const copyText = (idx, text) => {
    const finish = () => {
      setCopied(idx);
      showToast('Script copied to clipboard');
      setTimeout(() => setCopied(c => c === idx ? null : c), 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); finish();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta); finish();
    }
  };

  const personalize = async (script, filled) => {
    if (!aiKey) return;
    setPersonalizing(true); setPersonalizedText('');
    const prompt = `Personalize this vendor outreach ${mode} for the specific event. Fill in all placeholders with realistic specifics. Keep the same professional tone. Return only the personalized text, no explanation.\n\nTemplate:\n${filled}\n\nEvent details:\n- Type: ${eventType||'social event'}\n- Venue: ${event?.venue||'TBD'}\n- Date: ${event?.date||'TBD'}\n- Est. guests: ${event?.guestEstimate||event?.guests?.length||'TBD'}\n- Planner: ${plannerName}, ${businessName}\n\nPersonalized version:`;
    try { await askClaude(aiKey, prompt, { maxTokens: 400, onChunk: t => setPersonalizedText(t) }); }
    catch(e) { setPersonalizedText('⚠ Check API key in Profile.'); }
    setPersonalizing(false);
  };

  const [showAll, setShowAll] = useState(false);

  // When event type is known: only show scripts relevant to that event type,
  // sorted by priority rank. "Show all" toggle reveals the rest.
  const { relevant, others } = useMemo(() => {
    if (!eventType) return { relevant: VENDOR_SCRIPTS, others: [] };
    const rel = [];
    const oth = [];
    [...VENDOR_SCRIPTS].forEach(s => {
      const idx = (SCRIPT_PRIORITY[s.type] || []).indexOf(eventType);
      if (idx !== -1) rel.push({ ...s, _rank: idx });
      else oth.push(s);
    });
    rel.sort((a, b) => a._rank - b._rank);
    return { relevant: rel, others: oth };
  }, [eventType]);

  const sorted = showAll ? [...relevant, ...others] : relevant;

  const isPriority = (scriptType) => eventType && (SCRIPT_PRIORITY[scriptType] || [])[0] === eventType;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Vendor Outreach Scripts</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {eventType
              ? `${relevant.length} script${relevant.length !== 1 ? 's' : ''} for ${eventType} events.`
              : 'Ready-to-send templates for email or phone outreach.'}
            {eventType && others.length > 0 && !showAll && (
              <button onClick={() => setShowAll(true)}
                style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                +{others.length} more types
              </button>
            )}
            {showAll && (
              <button onClick={() => setShowAll(false)}
                style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Show relevant only
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setMode('email')} style={{ ...s.btn(mode === 'email' ? 'primary' : 'ghost'), fontSize: 11, padding: '5px 12px' }}>✉ Email</button>
          <button onClick={() => setMode('phone')} style={{ ...s.btn(mode === 'phone' ? 'primary' : 'ghost'), fontSize: 11, padding: '5px 12px' }}>📞 Phone</button>
        </div>
      </div>
      {!profile?.name && (
        <div style={{ padding: '10px 14px', background: C.warn + '18', border: `1px solid ${C.warn}55`, borderRadius: 8, marginBottom: 14, fontSize: 12, color: C.warn }}>
          ⚡ Set your name and business info in your Profile to auto-fill these scripts.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((script, idx) => {
          const isOpen    = openIdx === idx;
          const priority  = isPriority(script.type);
          const filled    = fillScript(mode === 'email' ? script.body : script.phoneScript);
          const accentClr = priority ? C.accent : C.border;
          return (
            <div key={script.type} style={{ border: `1px solid ${isOpen ? C.accent + '88' : accentClr + (priority ? 'aa' : '')}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: isOpen ? C.accent + '0c' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
              >
                <span style={{ fontSize: 18 }}>{script.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{script.type}</span>
                    {priority && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accent + '18', borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</span>}
                  </div>
                  {mode === 'email' && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Subject: {script.subject}</div>}
                  {mode === 'phone' && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Phone talking points</div>}
                </div>
                <span style={{ color: C.muted, fontSize: 14, flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  {mode === 'email' && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 6 }}>Subject line</div>
                      <div style={{ fontSize: 12, padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 12, color: C.text, fontFamily: 'monospace' }}>{script.subject}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 6 }}>Email body</div>
                    </>
                  )}
                  {mode === 'phone' && (
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 6 }}>Phone talking points</div>
                  )}
                  <pre style={{ fontSize: 12, lineHeight: 1.7, padding: '12px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: C.text, fontFamily: "'Inter', system-ui, sans-serif", margin: 0, marginBottom: 12 }}>{filled}</pre>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {mode === 'email' ? (
                      <>
                        <button onClick={() => copyText(idx, `Subject: ${script.subject}\n\n${filled}`)} style={{ ...s.btn('primary'), fontSize: 12 }}>
                          {copied === idx ? '✓ Copied!' : 'Copy Email'}
                        </button>
                        <button onClick={() => copyText(idx, filled)} style={{ ...s.btn(), fontSize: 12 }}>Body only</button>
                      </>
                    ) : (
                      <button onClick={() => copyText(idx, filled)} style={{ ...s.btn('primary'), fontSize: 12 }}>
                        {copied === idx ? '✓ Copied!' : 'Copy Talking Points'}
                      </button>
                    )}
                  </div>
                  {aiKey && (
                    <div style={{ marginTop: 8 }}>
                      {personalizedText && personalizedIdx === idx ? (
                        <div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:C.accent }}>✨ Personalized</span>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={()=>{ navigator.clipboard?.writeText(personalizedText); copyText(-1, personalizedText); }} style={{ ...s.btn(), fontSize:10, padding:'3px 8px' }}>Copy</button>
                              <button onClick={()=>{ setPersonalizedText(''); setPersonalizedIdx(null); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:C.muted }}>✕</button>
                            </div>
                          </div>
                          <pre style={{ fontSize:12, lineHeight:1.6, whiteSpace:'pre-wrap', fontFamily:'inherit', background:C.surface, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'12px 14px', margin:0 }}>{personalizedText}</pre>
                        </div>
                      ) : (
                        <AIBtn onClick={()=>{ setPersonalizedIdx(idx); personalize(script, fillScript(mode==='email'?script.body:script.phoneScript)); }} loading={personalizing && personalizedIdx===idx} label="Personalize for this event" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Vendors({ vendors, setVendors, budget, openId, event, ros, profile, allEvents = [] }) {
  const C        = useT();
  const s        = makeS(C);
  const stageCLR = STAGE_CLR(C);
  const bp = useContext(BpCtx);
  const [modalId,      setModalId]      = useState(openId || null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [vendorMode,   setVendorMode]   = useState('roster'); // 'roster' | 'prospects' | 'comms' | 'proven' | 'scripts'

  // Vendor-1: cross-event "Operationally Proven Vendors" library, ranked by reliability
  const provenLibrary = useMemo(() => {
    const lib = aggregateVendorLibrary(allEvents.length ? allEvents : (event ? [event] : []));
    const inThisEvent = new Set((vendors || []).map(v => `${(v.name||'').trim().toLowerCase()}|${(v.category||'').toLowerCase()}`));
    return lib
      .map(v => {
        const rel = vendorReliabilityScore(v);
        return { ...v, _rel: rel, _tier: vendorTier(v), _badges: vendorBadges(v),
          _inEvent: inThisEvent.has(`${(v.name||'').trim().toLowerCase()}|${(v.category||'').toLowerCase()}`),
          _fit: event?.type && (v.eventTypesSupported || '').toLowerCase().includes((event.type||'').toLowerCase()) };
      })
      // sort: sufficient-data first, then score desc, then repeat-use desc
      .sort((a, b) => (b._rel.sufficient - a._rel.sufficient) || ((b._rel.score || 0) - (a._rel.score || 0)) || (b.eventsLinked - a.eventsLinked));
  }, [allEvents, event, vendors]);
  const provenCount = provenLibrary.filter(v => v._rel.sufficient).length;

  // Discovery filters (filter only — never reorder; reliability sort is preserved)
  const [showFilters, setShowFilters] = useState(false);
  const [pf, setPf] = useState({ category: '', area: '', tier: '', specialtyTags: [], culturalExperienceTags: [], languageTags: [], identityTags: [] });
  const togglePf = (key, val) => setPf(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val] }));
  const clearPf  = () => setPf({ category: '', area: '', tier: '', specialtyTags: [], culturalExperienceTags: [], languageTags: [], identityTags: [] });
  const pfActive = (pf.category ? 1 : 0) + (pf.area ? 1 : 0) + (pf.tier ? 1 : 0) + VENDOR_TAG_GROUPS.reduce((n, g) => n + pf[g.key].length, 0);
  // Only offer filter values that actually exist in the library
  const availCategories = [...new Set(provenLibrary.map(v => v.category).filter(Boolean))].sort();
  const availTagValues  = (key) => [...new Set(provenLibrary.flatMap(v => v[key] || []))].sort();
  const filteredProven  = provenLibrary.filter(v => {
    if (pf.category && v.category !== pf.category) return false;
    if (pf.tier && v._tier !== pf.tier) return false;
    if (pf.area && !(v.serviceArea || '').toLowerCase().includes(pf.area.toLowerCase())) return false;
    for (const g of VENDOR_TAG_GROUPS) {
      if (pf[g.key].length && !pf[g.key].every(t => (v[g.key] || []).includes(t))) return false;
    }
    return true;
  });

  const total          = vendors.reduce((s, v) => s + (v.cost || 0), 0);
  const committed      = vendors.filter(v => STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0);
  const confirmedCount = vendors.filter(v => v.status === 'Confirmed').length;
  const paid           = vendors.filter(v => v.depositPaid).reduce((s, v) => s + v.depositAmt, 0);
  const modalVendor    = vendors.find(v => v.id === modalId);
  const budgetCats     = (budget || []).map(b => b.category);

  // Prospects: vendors in Considering/Quoted, grouped by category
  const prospectVendors = vendors.filter(v => ['Considering', 'Quoted'].includes(v.status));
  const prospectGroups  = {};
  prospectVendors.forEach(v => {
    prospectGroups[v.category] = prospectGroups[v.category] || [];
    prospectGroups[v.category].push(v);
  });
  const prospectCats = Object.keys(prospectGroups).sort();

  const VFILTER = {
    all:       () => true,
    pending:   v => ['Considering', 'Quoted'].includes(v.status),
    active:    v => ['Contracted', 'Deposit Paid'].includes(v.status),
    confirmed: v => v.status === 'Confirmed',
  };
  const filteredVendors = vendors.filter(VFILTER[vendorFilter] || VFILTER.all);

  const add = () => {
    const nv = { id: uid(), name: 'New Vendor', category: 'Other', budgetCategory: 'Other', status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '', arrivalTime: '', contact: '', phone: '', website: '', whatsapp: '', zoomUrl: '', meetUrl: '', teamsUrl: '', venmo: '', paymentNote: '', backup: '', notes: '', log: [] };
    setVendors(v => [...v, nv]);
    setModalId(nv.id);
  };
  const del = (id) => { setVendors(v => v.filter(r => r.id !== id)); setModalId(null); };
  const upd = (id, key, val) => setVendors(v => v.map(r => r.id === id ? { ...r, [key]: val } : r));

  // Click-through from a Proven (cross-event library) card → open its detail in THIS event.
  // If the vendor is already on the event, open it; otherwise pull a copy in, then open.
  const openProvenVendor = (lib) => {
    const key = `${(lib.name || '').trim().toLowerCase()}|${(lib.category || '').toLowerCase()}`;
    const existing = vendors.find(v => `${(v.name || '').trim().toLowerCase()}|${(v.category || '').toLowerCase()}` === key);
    if (existing) { setModalId(existing.id); return; }
    // Pull the proven vendor into this event (carry profile/operational/tags; reset event-specific + internal fields)
    const nv = {
      id: uid(), name: lib.name || 'Vendor', category: lib.category || 'Other', budgetCategory: lib.category || 'Other',
      status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '', arrivalTime: '',
      contact: lib.contact || '', phone: lib.phone || '', website: lib.website || '', backup: '', notes: '', log: [],
      serviceArea: lib.serviceArea, insuranceStatus: lib.insuranceStatus, yearsActive: lib.yearsActive,
      eventsCompleted: lib.eventsCompleted, onTimeRate: lib.onTimeRate, avgResponseHours: lib.avgResponseHours,
      plannerRehireCount: lib.plannerRehireCount, successfulEventCount: lib.successfulEventCount,
      cancellationCount: lib.cancellationCount, incidentCount: lib.incidentCount, preferredTier: lib.preferredTier,
      specialtyTags: lib.specialtyTags || [], culturalExperienceTags: lib.culturalExperienceTags || [],
      languageTags: lib.languageTags || [], identityTags: lib.identityTags || [],
      // NOTE: planner-private notes/risk flags are intentionally NOT copied across events.
    };
    setVendors(v => [...v, nv]);
    setModalId(nv.id);
  };
  const allLogs = useMemo(() =>
    vendors.flatMap(v => (v.log || []).map(e => ({ ...e, vendorId: v.id, vendorName: v.name, vendorCategory: v.category })))
           .sort((a, b) => b.date.localeCompare(a.date)),
    [vendors]);

  return (
    <div>
      {modalVendor && (
        <VendorModal
          vendor={modalVendor}
          budgetCategories={budgetCats}
          onClose={() => setModalId(null)}
          onChange={(key, val) => upd(modalId, key, val)}
          onDelete={() => del(modalId)}
          event={event}
          ros={ros}
          profile={profile}
        />
      )}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Vendors" value={vendors.length} />
        <StatCard label="Confirmed"     value={confirmedCount}   color={C.success} />
        <StatCard label="Contracted+"   value={fmtD(committed)}  sub="contracted or beyond" color={C.accent2} />
        <StatCard label="Paid to Date"  value={fmtD(paid)}       color={C.accent} />
      </div>

      {/* Mode toggle */}
      {(() => {
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                {[['roster', 'Roster'], ['prospects', `Prospects${prospectVendors.length > 0 ? ` (${prospectVendors.length})` : ''}`], ['proven', `★ Proven${provenCount > 0 ? ` (${provenCount})` : ''}`], ['comms', `Comms${allLogs.length > 0 ? ` (${allLogs.length})` : ''}`], ['scripts', '✉ Outreach Scripts']].map(([id, label]) => (
                  <button key={id} onClick={() => setVendorMode(id)} style={{
                    padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: vendorMode === id ? C.accent : 'transparent',
                    color: vendorMode === id ? C.bg : C.muted,
                    transition: 'all 0.15s',
                  }}>{label}</button>
                ))}
              </div>
              {vendorMode === 'roster'    && <button style={s.btn('primary')} onClick={add}>+ Add Vendor</button>}
              {vendorMode === 'prospects' && <button style={s.btn()} onClick={() => { add(); setVendorMode('roster'); }}>+ Add Prospect</button>}
            </div>

            {/* ── Comms timeline view ── */}
            {vendorMode === 'comms' && (
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={s.cardTitle}>Communication Timeline</div>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— all vendors, newest first</span>
                </div>
                {allLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No communication logged yet</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Open a vendor and add notes in the Communication Log section.</div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 28 }}>
                    {/* Vertical line */}
                    <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: C.border, borderRadius: 1 }} />
                    {allLogs.map((entry, i) => {
                      const prev = allLogs[i - 1];
                      const showDateHeader = !prev || prev.date.slice(0, 7) !== entry.date.slice(0, 7);
                      return (
                        <div key={entry.id}>
                          {showDateHeader && (
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, marginBottom: 8, marginTop: i === 0 ? 0 : 20, marginLeft: -20 }}>
                              {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, position: 'relative' }}>
                            {/* Dot */}
                            <div style={{ position: 'absolute', left: -23, top: 4, width: 10, height: 10, borderRadius: '50%', background: C.accent, border: `2px solid ${C.bg}`, flexShrink: 0 }} />
                            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button onClick={() => setModalId(entry.vendorId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 700, color: C.accent }}>{entry.vendorName || 'Vendor'}</button>
                                  <span style={s.pill(C.muted)}>{entry.vendorCategory}</span>
                                </div>
                                <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(entry.date)}</span>
                              </div>
                              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{entry.text}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* ── Operationally Proven Vendors (cross-event) ── */}
      {vendorMode === 'proven' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Operationally Proven Vendors</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Ranked by operational reliability from your real event history — not popularity. Filters narrow the list; they never change the ranking.</div>
            </div>
            {provenLibrary.length > 0 && (
              <button onClick={() => setShowFilters(v => !v)} style={{ ...s.btn(pfActive > 0 ? 'primary' : 'ghost'), fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
                ⚙ Filters{pfActive > 0 ? ` (${pfActive})` : ''}
              </button>
            )}
          </div>

          {/* Discovery filter panel — collapsible */}
          {provenLibrary.length > 0 && showFilters && (
            <div style={{ ...s.card, marginBottom: 14, padding: 16 }}>
              {(() => {
                const chip = (active, label, onClick, tone) => (
                  <button key={label} onClick={onClick} style={{ padding: '5px 11px', borderRadius: 16, fontSize: 11, cursor: 'pointer', minHeight: 30, border: `1.5px solid ${active ? tone : C.border}`, background: active ? tone + '1a' : 'transparent', color: active ? tone : C.muted, fontWeight: active ? 700 : 400 }}>{active ? '✓ ' : ''}{label}</button>
                );
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Category + tier + area */}
                    <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr' : '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Category</label>
                        <select style={{ ...s.input, fontSize: 13 }} value={pf.category} onChange={e => setPf(p => ({ ...p, category: e.target.value }))}>
                          <option value="">All categories</option>
                          {availCategories.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Service area</label>
                        <input style={{ ...s.input, fontSize: 13 }} value={pf.area} placeholder="e.g. Nashville" onChange={e => setPf(p => ({ ...p, area: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Tier</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {VENDOR_TIERS.map(t => chip(pf.tier === t, `${VENDOR_TIER_META[t].icon} ${t}`, () => setPf(p => ({ ...p, tier: p.tier === t ? '' : t })), VENDOR_TIER_META[t].color))}
                      </div>
                    </div>
                    {/* Tag groups — only values present in the library */}
                    {VENDOR_TAG_GROUPS.map(g => {
                      const vals = availTagValues(g.key);
                      if (vals.length === 0) return null;
                      const tone = g.key === 'identityTags' ? C.muted : (C[g.tone] || C.muted);
                      return (
                        <div key={g.key}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: tone, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{g.filterLabel}</label>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {vals.map(val => chip(pf[g.key].includes(val), val, () => togglePf(g.key, val), tone))}
                          </div>
                        </div>
                      );
                    })}
                    {pfActive > 0 && (
                      <div><button onClick={clearPf} style={{ ...s.btn('ghost'), fontSize: 11, padding: '5px 12px' }}>Clear all filters</button></div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {provenLibrary.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No vendor history yet</div>
              <div style={{ fontSize: 12, color: C.muted }}>As you add vendors across events and log their operational metrics, your proven vendors surface here.</div>
            </div>
          ) : filteredProven.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: 13, color: C.muted }}>No vendors match these filters.</div>
              <button onClick={clearPf} style={{ ...s.btn('ghost'), fontSize: 11, padding: '5px 12px', marginTop: 10 }}>Clear filters</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr' : bp === 'tablet' ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filteredProven.map((v, i) => {
                const tm = VENDOR_TIER_META[v._tier];
                const suff = v._rel.sufficient;
                const metric = (label, val) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                    <span style={{ color: C.muted }}>{label}</span>
                    <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
                  </div>
                );
                return (
                  <div key={`${v.name}-${i}`} onClick={() => openProvenVendor(v)} title={v._inEvent ? 'Open vendor details' : 'Add to this event & open'}
                    style={{ ...s.card, marginBottom: 0, padding: 16, borderColor: suff ? tm.color + '55' : C.border, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = tm.color; e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,${C.surface === '#ffffff' ? '0.08' : '0.22'})`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = suff ? tm.color + '55' : C.border; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{v.category}{v.serviceArea ? ` · ${v.serviceArea}` : ''}</div>
                      </div>
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: tm.color, background: tm.color + '18', border: `1px solid ${tm.color}44`, borderRadius: 12, padding: '3px 9px' }}>{tm.icon} {v._tier}</span>
                    </div>

                    {/* Reliability */}
                    {suff ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: tm.color }}>{v._rel.score}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>/ 100 reliability</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic', margin: '4px 0 8px' }}>Insufficient data to score</div>
                    )}

                    {/* Metrics — only show ones with real data */}
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      {_hasField(v, 'onTimeRate')      && metric('On-time', `${v.onTimeRate}%`)}
                      {_hasField(v, 'avgResponseHours')&& metric('Responds in', `${v.avgResponseHours}h`)}
                      {_hasField(v, 'eventsCompleted') && metric('Events done', v.eventsCompleted)}
                      {_hasField(v, 'plannerRehireCount') && metric('You rehired', `${v.plannerRehireCount}×`)}
                      {v.eventsLinked > 1 && metric('In your events', `${v.eventsLinked}`)}
                      {!_hasField(v, 'onTimeRate') && !_hasField(v, 'avgResponseHours') && !_hasField(v, 'eventsCompleted') && (
                        <div style={{ fontSize: 11, color: C.muted }}>No operational metrics logged yet.</div>
                      )}
                    </div>

                    {/* Badges */}
                    {v._badges.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                        {v._badges.map(b => <span key={b} style={{ fontSize: 9, fontWeight: 600, color: C.accent2, background: C.accent2 + '14', border: `1px solid ${C.accent2}33`, borderRadius: 10, padding: '2px 7px' }}>{b}</span>)}
                      </div>
                    )}

                    {/* Specialty + cultural experience — operational discovery context */}
                    {((v.specialtyTags || []).length > 0 || (v.culturalExperienceTags || []).length > 0 || (v.languageTags || []).length > 0) && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                        {[...(v.specialtyTags || []), ...(v.culturalExperienceTags || [])].map(t => (
                          <span key={t} style={{ fontSize: 10, color: C.accent, background: C.accent + '12', border: `1px solid ${C.accent}30`, borderRadius: 10, padding: '2px 8px' }}>{t}</span>
                        ))}
                        {(v.languageTags || []).map(t => (
                          <span key={t} style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '2px 8px' }}>🗣 {t}</span>
                        ))}
                      </div>
                    )}

                    {/* Identity — intentionally subtle / secondary, never dominant */}
                    {(v.identityTags || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {(v.identityTags || []).map(t => (
                          <span key={t} style={{ fontSize: 10, color: C.muted, opacity: 0.85 }}>{t}{(v.identityTags || []).indexOf(t) < (v.identityTags || []).length - 1 ? ' ·' : ''}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      {v._inEvent
                        ? <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>✓ On this event</span>
                        : <span style={{ fontSize: 10, color: C.muted }}>{v.eventsLinked > 1 ? `In ${v.eventsLinked} of your events` : 'From your vendor history'}</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, color: tm.color }}>{v._inEvent ? 'View details →' : '+ Add to this event →'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Prospects view ── */}
      {vendorMode === 'prospects' && (
        <div>
          {prospectVendors.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No prospects yet</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Vendors in <strong>Considering</strong> or <strong>Quoted</strong> status appear here for side-by-side comparison.</div>
              <button style={s.btn('primary')} onClick={() => { add(); setVendorMode('roster'); }}>+ Add First Prospect</button>
            </div>
          ) : prospectCats.map(cat => {
            const group = prospectGroups[cat];
            const isCompare = group.length >= 2;
            return (
              <div key={cat} style={{ ...s.card, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={s.cardTitle}>{cat}</div>
                  {isCompare && <span style={s.pill(C.accent2)}>Compare {group.length}</span>}
                </div>
                {isCompare ? (
                  /* Side-by-side comparison grid */
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${group.length}, 1fr)`, gap: 0, minWidth: group.length * 180 + 120 }}>
                      {/* Header row — vendor names */}
                      <div style={{ padding: '8px 10px', fontSize: 10, color: C.border }} />
                      {group.map(v => (
                        <div key={v.id} style={{ padding: '8px 10px', borderLeft: `1px solid ${C.border}` }}>
                          <button onClick={() => setModalId(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v.name}</div>
                            <span style={s.pill(stageCLR[v.status] || C.muted)}>{v.status}</span>
                          </button>
                        </div>
                      ))}
                      {/* Comparison rows */}
                      {[
                        { label: 'Cost',    render: v => <span style={{ fontWeight: 700 }}>{v.cost ? fmtD(v.cost) : '—'}</span> },
                        { label: 'Tier',    render: v => { const tm = VENDOR_TIER_META[vendorTier(v)]; return <span style={{ fontSize: 11, fontWeight: 700, color: tm.color }}>{tm.icon} {vendorTier(v)}</span>; } },
                        { label: 'Reliability', render: v => { const r = vendorReliabilityScore(v); return r.sufficient ? <span style={{ fontSize: 12, fontWeight: 700, color: VENDOR_TIER_META[vendorTier(v)].color }}>{r.score}/100</span> : <span style={{ fontSize: 10, color: C.muted }}>Insufficient data</span>; } },
                        { label: 'On-time',  render: v => _hasField(v, 'onTimeRate') ? <span style={{ fontSize: 11 }}>{v.onTimeRate}%</span> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Response', render: v => _hasField(v, 'avgResponseHours') ? <span style={{ fontSize: 11 }}>{v.avgResponseHours}h</span> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Events',   render: v => _hasField(v, 'eventsCompleted') ? <span style={{ fontSize: 11 }}>{v.eventsCompleted}</span> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Contact', render: v => v.contact ? <a href={`mailto:${v.contact}`} style={{ color: C.accent, textDecoration: 'none', fontSize: 11 }}>{v.contact}</a> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Phone',   render: v => v.phone ? <a href={`tel:${v.phone}`} style={{ color: C.accent2, textDecoration: 'none', fontSize: 11 }}>{v.phone}</a> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Website', render: v => v.website ? <a href={wsHref(v.website)} target="_blank" rel="noopener noreferrer" style={{ color: C.accent2, textDecoration: 'none', fontSize: 11 }}>↗ Visit</a> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Pkg / Rate', render: v => v.packageName ? <span style={{ fontSize: 11 }}>{v.packageName}</span> : v.hourlyRate ? <span style={{ fontSize: 11 }}>{fmtD(v.hourlyRate)}/hr × {v.hoursIncluded || '?'}h</span> : v.pricePerHead ? <span style={{ fontSize: 11 }}>{fmtD(v.pricePerHead)}/head</span> : <span style={{ color: C.muted }}>—</span> },
                        { label: 'Notes',   render: v => v.notes ? <span style={{ fontSize: 11, color: C.muted }}>{v.notes.slice(0, 80)}{v.notes.length > 80 ? '…' : ''}</span> : <span style={{ color: C.border }}>—</span> },
                      ].map(({ label, render }) => [
                        <div key={`lbl-${label}`} style={{ padding: '9px 10px', borderTop: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, display: 'flex', alignItems: 'center' }}>{label}</div>,
                        ...group.map(v => (
                          <div key={`${label}-${v.id}`} style={{ padding: '9px 10px', borderTop: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}`, fontSize: 12, color: C.text, verticalAlign: 'middle' }}>
                            {render(v)}
                          </div>
                        )),
                      ])}
                      {/* Action row */}
                      <div style={{ padding: '10px 10px', borderTop: `1px solid ${C.border}` }} />
                      {group.map(v => (
                        <div key={v.id} style={{ padding: '10px 10px', borderTop: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}`, display: 'flex', gap: 6 }}>
                          <button style={{ ...s.btn('primary'), fontSize: 10, padding: '4px 10px' }} onClick={() => { upd(v.id, 'status', 'Contracted'); setVendorMode('roster'); }}>Book</button>
                          <button style={{ ...s.btn(), fontSize: 10, padding: '4px 8px' }} onClick={() => setModalId(v.id)}>Edit</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Single prospect card */
                  <div onClick={() => setModalId(group[0].id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', cursor: 'pointer', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{group[0].name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{group[0].contact || group[0].phone || group[0].website || 'No contact info'}</div>
                    </div>
                    <span style={{ fontWeight: 700 }}>{group[0].cost ? fmtD(group[0].cost) : '—'}</span>
                    <span style={s.pill(stageCLR[group[0].status] || C.muted)}>{group[0].status}</span>
                    <span style={{ color: C.muted }}>›</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Scripts view ── */}
      {vendorMode === 'scripts' && (
        <div style={s.card}>
          <VendorScriptsPanel profile={profile} event={event} />
        </div>
      )}

      {/* ── Roster view ── */}
      {vendorMode === 'roster' && <div style={s.card}>
        <div style={{ marginBottom: 12 }}>
          <div style={s.cardTitle}>Vendor Directory</div>
        </div>

        {vendors.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {[['all','All'], ['pending','Pending'], ['active','Active'], ['confirmed','Confirmed']].map(([id, label]) => (
              <button key={id} style={{ ...s.btn(vendorFilter === id ? 'primary' : 'ghost'), fontSize: 11, padding: '4px 10px' }} onClick={() => setVendorFilter(id)}>{label}</button>
            ))}
            {vendorFilter !== 'all' && <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>{filteredVendors.length} of {vendors.length}</span>}
          </div>
        )}

        {vendors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No vendors yet</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Add your venue, photographer, caterer, and more.<br />Track pipeline, payments, and contact info in one place.</div>
            <button style={s.btn('primary')} onClick={add}>+ Add First Vendor</button>
          </div>
        )}

        {bp === 'mobile' ? (
          <div>
            {filteredVendors.map(v => {
              const balance = v.balancePaid ? 0 : v.cost - v.depositAmt;
              const days    = daysUntil(v.payDueDate);
              const urgent  = days !== null && days <= 14;
              const warn    = days !== null && days > 14 && days <= 30;
              return (
                <div key={v.id} onClick={() => setModalId(v.id)}
                  style={{ padding: '12px 0', borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name || <span style={{ color: C.muted }}>New Vendor</span>}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{v.category}{v.contactName ? <span style={{ color: C.text }}> · {v.contactName}</span> : ''}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3, flexWrap: 'wrap' }}>
                        {v.phone && <a href={`tel:${v.phone}`} style={{ fontSize: 11, color: C.accent, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{v.phone}</a>}
                        {v.phone && <a href={`sms:${v.phone}`} title="Text" style={{ display: 'flex', color: C.accent2 }} onClick={e => e.stopPropagation()}><IconSMS size={15} /></a>}
                        {v.contact && <a href={`mailto:${v.contact}`} title="Email" style={{ display: 'flex', color: C.accent }} onClick={e => e.stopPropagation()}><IconEmail size={15} /></a>}
                        {v.whatsapp && <a href={waHref(v.whatsapp)} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconWA size={15} /></a>}
                        {v.phone && <a href={`facetime:${v.phone}`} title="FaceTime" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconFaceTime size={15} /></a>}
                        {v.zoomUrl && <a href={v.zoomUrl} target="_blank" rel="noopener noreferrer" title="Zoom" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconZoom size={15} /></a>}
                        {v.meetUrl && <a href={v.meetUrl} target="_blank" rel="noopener noreferrer" title="Google Meet" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconMeet size={15} /></a>}
                        {v.teamsUrl && <a href={v.teamsUrl} target="_blank" rel="noopener noreferrer" title="Teams" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconTeams size={15} /></a>}
                        {v.website && <a href={wsHref(v.website)} target="_blank" rel="noopener noreferrer" title="Website" style={{ display: 'flex', color: C.muted }} onClick={e => e.stopPropagation()}><IconGlobe size={15} /></a>}
                      </div>
                    </div>
                    <span style={{ ...s.pill(stageCLR[v.status] || C.muted), cursor: 'pointer', userSelect: 'none' }} title="Tap to advance stage" onClick={e => { e.stopPropagation(); upd(v.id, 'status', STAGES[(STAGES.indexOf(v.status) + 1) % STAGES.length]); }}>{v.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmtD(v.cost)}</span>
                    {balance <= 0
                      ? <span style={{ color: C.success }}>Paid ✓</span>
                      : <span style={{ color: urgent ? C.danger : warn ? C.warn : C.muted }}>{fmtD(balance)} due{days !== null ? ` · ${days}d` : ''}</span>
                    }
                    {(v.log || []).length > 0 && <span style={{ color: C.accent2 }}>{v.log.length} note{v.log.length !== 1 ? 's' : ''}</span>}
                    {v.contractSigned
                      ? <span style={{ color: C.success, fontSize: 11 }}>✓ Contract</span>
                      : <span style={{ color: C.warn, fontSize: 11 }}>⚠ No contract</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>{['Vendor', 'Category', 'Pipeline', 'Total', 'Balance', 'Due', 'Notes', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredVendors.map(v => {
                const balance = v.balancePaid ? 0 : v.cost - v.depositAmt;
                const days    = daysUntil(v.payDueDate);
                const urgent  = days !== null && days <= 14;
                const warn    = days !== null && days > 14 && days <= 30;
                return (
                  <tr key={v.id} onClick={() => setModalId(v.id)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                    <td style={{ ...s.td, fontWeight: 500 }}>
                      <div>{v.name || <span style={{ color: C.muted }}>—</span>}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        {v.phone && <a href={`tel:${v.phone}`} style={{ fontSize: 11, color: C.accent, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{v.phone}</a>}
                        {v.phone && <a href={`sms:${v.phone}`} title="Text" style={{ display: 'flex', color: C.accent2 }} onClick={e => e.stopPropagation()}><IconSMS size={13} /></a>}
                        {v.contact && <a href={`mailto:${v.contact}`} title="Email" style={{ display: 'flex', color: C.accent }} onClick={e => e.stopPropagation()}><IconEmail size={13} /></a>}
                        {v.whatsapp && <a href={waHref(v.whatsapp)} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconWA size={13} /></a>}
                        {v.phone && <a href={`facetime:${v.phone}`} title="FaceTime" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconFaceTime size={13} /></a>}
                        {v.zoomUrl && <a href={v.zoomUrl} target="_blank" rel="noopener noreferrer" title="Zoom" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconZoom size={13} /></a>}
                        {v.meetUrl && <a href={v.meetUrl} target="_blank" rel="noopener noreferrer" title="Google Meet" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconMeet size={13} /></a>}
                        {v.teamsUrl && <a href={v.teamsUrl} target="_blank" rel="noopener noreferrer" title="Teams" style={{ display: 'flex' }} onClick={e => e.stopPropagation()}><IconTeams size={13} /></a>}
                        {v.website && <a href={wsHref(v.website)} target="_blank" rel="noopener noreferrer" title="Website" style={{ display: 'flex', color: C.muted }} onClick={e => e.stopPropagation()}><IconGlobe size={13} /></a>}
                      </div>
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{v.category}</td>
                    <td style={s.td}><span style={{ ...s.pill(stageCLR[v.status] || C.muted), cursor: 'pointer', userSelect: 'none' }} title="Click to advance stage" onClick={e => { e.stopPropagation(); upd(v.id, 'status', STAGES[(STAGES.indexOf(v.status) + 1) % STAGES.length]); }}>{v.status}</span></td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums' }}>{fmtD(v.cost)}</td>
                    <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums' }}>
                      {balance <= 0 ? <span style={{ color: C.success, fontSize: 12 }}>Paid ✓</span> : fmtD(balance)}
                    </td>
                    <td style={s.td}>
                      {v.payDueDate && balance > 0
                        ? <span style={{ fontSize: 12, color: urgent ? C.danger : warn ? C.warn : C.muted }}>{(urgent || warn) ? `${days}d` : fmtDate(v.payDueDate)}</span>
                        : <span style={{ color: C.muted }}>—</span>}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {v.contractSigned
                          ? <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>✓ Signed</span>
                          : <span style={{ fontSize: 11, color: C.warn }}>⚠ No contract</span>
                        }
                        {(v.log || []).length > 0 && <span style={{ fontSize: 11, color: C.accent2 }}>{(v.log || []).length} note{v.log.length !== 1 ? 's' : ''}</span>}
                        {v.contractUrl && <a href={v.contractUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.accent, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>📄 Contract</a>}
                        {!(v.log || []).length && !v.contractUrl && <span style={{ color: C.muted, fontSize: 11 }}></span>}
                      </div>
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 18, lineHeight: 1 }}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {vendors.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: C.muted }}>Total contracted value</span>
            <span style={{ fontWeight: 700 }}>{fmtD(total)}</span>
          </div>
        )}
      </div>}
    </div>
  );
}

// TaskRow hoisted to module scope so React never creates a new component type
// across Timeline re-renders (avoids full unmount/remount of every row).
function TaskRow({ t, C, s, bp, isOverdue, toggle, setModalId }) {
  const overdue = isOverdue(t);
  return (
    <div onClick={() => setModalId(t.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
      <button onClick={e => { e.stopPropagation(); toggle(t.id); }}
        style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: t.done ? C.success + '22' : 'none', border: `2px solid ${t.done ? C.success : overdue ? C.danger : C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.success, fontSize: 11 }}>
        {t.done ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? C.muted : overdue ? C.danger : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: (bp === 'mobile' || bp === 'tablet') ? 'normal' : 'nowrap' }}>
          {t.task || <em style={{ color: C.muted }}>Untitled task</em>}
        </div>
        {t.owner && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t.owner}</div>}
      </div>
      {overdue && !t.done && <span style={{ ...s.pill(C.danger), fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0 }}>Overdue</span>}
      <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ timeline, setTimeline, eventDate, openId, eventType }) {
  const C  = useT();
  const s  = makeS(C);
  const bp = useContext(BpCtx);
  const [modalId, setModalId] = useState(openId || null);
  const [tlSearch, setTlSearch] = useState('');
  const [quickTask, setQuickTask] = useState('');

  const quickAdd = () => {
    if (!quickTask.trim() || selectedPhase === '__overdue__') return;
    const ng = { id: uid(), week: selectedPhase, task: quickTask.trim(), done: false, owner: '', notes: '' };
    setTimeline(t => [...t, ng]);
    setQuickTask('');
  };

  const toggle = (id) => setTimeline(t => t.map(r => r.id === id ? { ...r, done: !r.done } : r));
  const add    = (week) => {
    const ng = { id: uid(), week: week || 'Custom', task: '', done: false, owner: '', notes: '' };
    setTimeline(t => [...t, ng]);
    setModalId(ng.id);
  };
  const del = (id) => { setTimeline(t => t.filter(r => r.id !== id)); setModalId(null); };
  const upd = (id, key, val) => setTimeline(t => t.map(r => r.id === id ? { ...r, [key]: val } : r));
  const isOverdue = (task) => isTaskOverdue(task, eventDate);

  const phaseOrder = Object.keys(PHASE_OFFSET);
  const done = timeline.filter(t => t.done).length;
  const overdueCount = timeline.filter(isOverdue).length;

  // All phases that have tasks, in phase order
  const allPhases = [
    ...phaseOrder.filter(p => timeline.some(t => t.week === p)),
    ...timeline.filter(t => !phaseOrder.includes(t.week)).map(t => t.week).filter((v, i, a) => a.indexOf(v) === i),
  ];

  // Auto-select on mount: first overdue → first incomplete → first phase
  const defaultPhase = overdueCount > 0 ? '__overdue__'
    : allPhases.find(p => timeline.filter(t => t.week === p).some(t => !t.done))
    || allPhases[0] || null;

  const [selectedPhase, setSelectedPhase] = useState(() => {
    if (openId) {
      const task = timeline.find(t => t.id === openId);
      return task ? task.week : defaultPhase;
    }
    return defaultPhase;
  });

  // Tasks for currently selected phase, optionally filtered by search
  const phaseTasks = (phase) => {
    const base = phase === '__overdue__'
      ? timeline.filter(isOverdue)
      : timeline.filter(t => t.week === phase);
    if (!tlSearch) return base;
    const q = tlSearch.toLowerCase();
    return base.filter(t => t.task.toLowerCase().includes(q) || (t.owner || '').toLowerCase().includes(q));
  };

  const currentTasks = selectedPhase ? phaseTasks(selectedPhase) : [];
  const modalTask = timeline.find(t => t.id === modalId);

  // TaskRow is defined below at module scope to prevent remounts on each Timeline render

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Tasks" value={timeline.length} />
        <StatCard label="Complete"    value={done} color={C.success} sub={timeline.length ? `${Math.round((done/timeline.length)*100)}%` : '—'} />
        <StatCard label="Remaining"   value={timeline.length - done} color={C.accent} />
        <StatCard label="Overdue"     value={overdueCount} color={overdueCount > 0 ? C.danger : C.muted} />
      </div>

      {timeline.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No tasks yet</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Build your planning checklist by adding tasks to each phase.</div>
          <button style={s.btn('primary')} onClick={() => add('12 Months Out')}>+ Add First Task</button>
        </div>
      ) : (
        <>
          {/* Phase timeline stepper */}
          {(() => {
            const knownPhases = phaseOrder.filter(p => allPhases.includes(p));
            const customPhases = allPhases.filter(p => !phaseOrder.includes(p));
            const steppablePhases = knownPhases; // custom phases shown separately
            return (
              <div style={{ marginBottom: 20 }}>
                {/* Stepper row — scroll horizontally */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', padding: '4px 4px 0', position: 'relative' }}>
                    {steppablePhases.map((phase, idx) => {
                      const tasks  = timeline.filter(t => t.week === phase);
                      const pDone  = tasks.filter(t => t.done).length;
                      const pOver  = tasks.some(isOverdue);
                      const allD   = tasks.length > 0 && pDone === tasks.length;
                      const nodeClr = allD ? C.success : pOver ? C.danger : pDone > 0 ? C.accent2 : C.border;
                      const isAct  = selectedPhase === phase;
                      const pDate  = phaseDate(phase, eventDate);
                      const abbr      = phase.replace(' Months Out', 'mo').replace(' Month Out', 'mo').replace(' Weeks Out', 'wk').replace('Week Of', 'WK');
                      const focusLbl  = PHASE_FOCUS[phase] || '';
                      const isLast    = idx === steppablePhases.length - 1;
                      return (
                        <div key={phase} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                          <button onClick={() => setSelectedPhase(phase)} title={focusLbl ? `${phase} — ${focusLbl}` : phase} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 76,
                          }}>
                            {/* Node circle */}
                            <div style={{
                              width: isAct ? 32 : 24, height: isAct ? 32 : 24,
                              borderRadius: '50%', flexShrink: 0,
                              background: isAct ? nodeClr : nodeClr + '33',
                              border: `2px solid ${nodeClr}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s', boxShadow: isAct ? `0 0 0 3px ${nodeClr}22` : 'none',
                            }}>
                              <span style={{ fontSize: isAct ? 9 : 8, fontWeight: 700, color: isAct ? C.bg : nodeClr, lineHeight: 1 }}>
                                {allD ? '✓' : pOver ? '!' : abbr}
                              </span>
                            </div>
                            {/* Label + focus + date */}
                            <div style={{ textAlign: 'center' }}>
                              {pDate ? (
                                <>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: isAct ? nodeClr : C.muted, whiteSpace: 'nowrap' }}>{pDate.replace(/,\s*\d{4}$/, '')}</div>
                                  {focusLbl && <div style={{ fontSize: 8, fontWeight: isAct ? 600 : 400, color: isAct ? C.text : C.muted, whiteSpace: 'nowrap', marginTop: 1, maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis' }}>{focusLbl}</div>}
                                  <div style={{ fontSize: 7, color: C.border, whiteSpace: 'nowrap', marginTop: 1 }}>{abbr}</div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: isAct ? nodeClr : C.muted, whiteSpace: 'nowrap' }}>{abbr}</div>
                                  {focusLbl && <div style={{ fontSize: 8, fontWeight: isAct ? 600 : 400, color: isAct ? C.text : C.muted, whiteSpace: 'nowrap', marginTop: 1, maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis' }}>{focusLbl}</div>}
                                </>
                              )}
                              <div style={{ fontSize: 8, color: allD ? C.success : pOver ? C.danger : C.border, marginTop: 1 }}>{pDone}/{tasks.length}</div>
                            </div>
                          </button>
                          {/* Connector line between nodes */}
                          {!isLast && (
                            <div style={{ width: 20, height: 2, background: allD ? C.success + '66' : C.border, marginTop: 15, flexShrink: 0, alignSelf: 'flex-start' }} />
                          )}
                        </div>
                      );
                    })}
                    {/* Event endpoint */}
                    {eventDate && steppablePhases.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                        <div style={{ width: 20, height: 2, background: C.border, marginTop: 15, flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 52 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent + '22', border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: C.accent }}>DAY</span>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, whiteSpace: 'nowrap' }}>Event</div>
                            <div style={{ fontSize: 8, color: C.border }}>{fmtDate(eventDate).replace(/,\s*\d{4}$/, '')}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Overdue alert + custom phases + search */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                  {overdueCount > 0 && (
                    <button onClick={() => setSelectedPhase('__overdue__')} style={{
                      ...s.btn(selectedPhase === '__overdue__' ? 'danger' : 'ghost'),
                      fontSize: 11, padding: '4px 10px',
                    }}>⚠ {overdueCount} Overdue</button>
                  )}
                  {customPhases.map(phase => {
                    const tasks = timeline.filter(t => t.week === phase);
                    const pDone = tasks.filter(t => t.done).length;
                    return (
                      <button key={phase} onClick={() => setSelectedPhase(phase)} style={{
                        ...s.btn(selectedPhase === phase ? 'primary' : 'ghost'), fontSize: 11, padding: '4px 10px',
                      }}>{phase} {pDone}/{tasks.length}</button>
                    );
                  })}
                  <div style={{ marginLeft: 'auto' }}>
                    <input style={{ ...s.input, fontSize: 11, padding: '4px 10px', width: 140 }} value={tlSearch} onChange={e => setTlSearch(e.target.value)} placeholder="Search…" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Phase content panel */}
          {selectedPhase && (
            <div style={s.card}>
              {/* Phase header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  {selectedPhase === '__overdue__' ? (
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>⚠ Overdue Tasks</div>
                  ) : (() => {
                    const pD = phaseDate(selectedPhase, eventDate);
                    return pD ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{pD}</div>
                          {PHASE_FOCUS[selectedPhase] && <div style={{ fontSize: 12, color: C.muted }}>— {PHASE_FOCUS[selectedPhase]}</div>}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{selectedPhase}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.accent }}>{selectedPhase}</div>
                          {PHASE_FOCUS[selectedPhase] && <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{PHASE_FOCUS[selectedPhase]}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Set an event date to see target dates</div>
                      </>
                    );
                  })()}
                </div>
                {selectedPhase !== '__overdue__' && (
                  <button style={{ ...s.btn('primary'), fontSize: 11, padding: '5px 12px' }} onClick={() => add(selectedPhase)}>+ Task</button>
                )}
              </div>

              {/* Progress bar */}
              {(() => {
                const tasks = timeline.filter(t => selectedPhase === '__overdue__' ? isOverdue(t) : t.week === selectedPhase);
                const pDone = tasks.filter(t => t.done).length;
                const pct = tasks.length ? Math.round((pDone / tasks.length) * 100) : 0;
                const clr = tasks.some(isOverdue) ? C.danger : pDone === tasks.length && tasks.length > 0 ? C.success : C.accent;
                return <ProgressBar pct={pct} color={clr} />;
              })()}

              {/* Event-type milestone guidance for this phase */}
              {selectedPhase !== '__overdue__' && (() => {
                const guidance = (WORKFLOW_FOCUS[eventType] || {})[selectedPhase];
                if (!guidance) return null;
                return (
                  <div style={{ padding: '10px 14px', background: C.accent + '0d', border: `1px solid ${C.accent}22`, borderRadius: 8, marginTop: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {eventType} · {guidance.focus}
                    </div>
                    {guidance.tips.map((tip, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: i > 0 ? 3 : 0 }}>
                        <span style={{ color: C.accent, flexShrink: 0 }}>·</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Quick-add task */}
              {selectedPhase !== '__overdue__' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    style={{ ...s.input, flex: 1, fontSize: 13 }}
                    value={quickTask}
                    placeholder="Quick-add a task… (Enter to save)"
                    onChange={e => setQuickTask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') quickAdd(); }}
                  />
                  <button style={s.btn('primary')} onClick={quickAdd} disabled={!quickTask.trim()}>Add</button>
                </div>
              )}

              {/* Task rows */}
              <div style={{ marginTop: 4 }}>
                {currentTasks.length === 0 && tlSearch && (
                  <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '20px 0' }}>No tasks match "{tlSearch}"</div>
                )}
                {currentTasks.length === 0 && !tlSearch && selectedPhase !== '__overdue__' && (
                  <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: '20px 0' }}>
                    No tasks in this phase yet.
                    <button style={{ ...s.btn('ghost'), fontSize: 11, marginLeft: 10 }} onClick={() => add(selectedPhase)}>+ Add one</button>
                  </div>
                )}
                {currentTasks.map(t => <TaskRow key={t.id} t={t} C={C} s={s} bp={bp} isOverdue={isOverdue} toggle={toggle} setModalId={setModalId} />)}
              </div>
            </div>
          )}

          {/* Bottom action row */}
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 10px' }} onClick={() => add('Custom')}>+ New Phase Task</button>
            {selectedPhase && selectedPhase !== '__overdue__' && (
              <button style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 10px' }} onClick={() => add(selectedPhase)}>+ Task to {selectedPhase}</button>
            )}
          </div>
        </>
      )}

      {modalTask && (
        <TaskModal task={modalTask} eventDate={eventDate} onClose={() => setModalId(null)} onChange={(key, val) => upd(modalTask.id, key, val)} onDelete={() => del(modalTask.id)} />
      )}
    </div>
  );
}

// ─── Run of Show ──────────────────────────────────────────────────────────────

function RunOfShow({ ros, setRos, vendors, eventName, eventDate, eventVenue }) {
  const C        = useT();
  const s        = makeS(C);
  const stageCLR = STAGE_CLR(C);
  const rosCLR   = ROS_CLR(C);
  const bp = useContext(BpCtx);
  const aiKey = useAIKey();
  const [modalId, setModalId] = useState(null);
  const modalEntry = ros.find(r => r.id === modalId);
  const [rosFilter, setRosFilter] = useState('all');
  const [rosDraftLoad, setRosDraftLoad] = useState(false);

  const draftFullROS = async () => {
    if (!aiKey) return;
    setRosDraftLoad(true);
    const vendorLines = vendors.filter(v=>['Confirmed','Contracted','Deposit Paid'].includes(v.status))
      .map(v=>`${v.name} (${v.category})${v.arrivalTime?' arrives '+v.arrivalTime:''}`).join('\n');
    const existingSegments = ros.map(r=>`${r.time||'?'} — ${r.segment}`).join('\n');
    const prompt = `Generate a complete run of show as JSON array. Each item: { time (HH:MM 24h), segment (string), type ("setup"|"ceremony"|"reception"|"vendor"|"break"|"event"), owner (string), notes (string) }. Include vendor arrivals, setup windows, key event moments, and wind-down. Times should be realistic and sequential. Return ONLY the JSON array, no explanation.\n\nVendors:\n${vendorLines||'(none yet)'}\nExisting segments:\n${existingSegments||'(none)'}\nEvent context: ${ros.length > 0 ? 'Extend/fill gaps in existing ROS' : 'Create a complete ROS for a full event day'}\n\nJSON:`;
    try {
      const raw = await askClaude(aiKey, prompt, { maxTokens: 900 });
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        const newRows = items.map(item => ({ id: uid(), time: item.time||'', segment: item.segment||'', type: item.type||'event', owner: item.owner||'', location: '', confirmed: false, notes: item.notes||'' }));
        setRos(r => [...r, ...newRows].sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
      }
    } catch(e) { /* silent */ }
    setRosDraftLoad(false);
  };

  const add = () => {
    const nr = { id: uid(), time: '', segment: '', location: '', type: 'event', owner: '', confirmed: false, notes: '' };
    setRos(r => [...r, nr]);
    setModalId(nr.id);
  };
  const del = (id) => { setRos(r => r.filter(e => e.id !== id)); setModalId(null); };
  const upd = (id, key, val) => setRos(r => r.map(e => e.id === id ? { ...e, [key]: val } : e));

  const syncVendors = () => {
    const existing = new Set(ros.filter(r => r.type === 'vendor').map(r => r.vendorName || r.owner));
    const newRows  = vendors
      .filter(v => ['Confirmed','Contracted','Deposit Paid'].includes(v.status) && v.arrivalTime && !existing.has(v.name))
      .map(v => ({ id: uid(), time: v.arrivalTime, segment: `${v.name} arrives`, location: '', type: 'vendor', owner: v.name, confirmed: false, vendorName: v.name, notes: '' }));
    if (newRows.length > 0) setRos(r => [...r, ...newRows].sort((a, b) => (a.time || '').localeCompare(b.time || '')));
  };

  const sorted = [...ros]
    .filter(r => rosFilter === 'all' || r.type === rosFilter)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const emergencyContacts = vendors.filter(v => v.phone).sort((a, b) => (a.arrivalTime || '').localeCompare(b.arrivalTime || ''));
  const unconfirmed = sorted.filter(r => r.type === 'vendor' && !r.confirmed).length;

  const fmtTime12 = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // Print / PDF — opens a clean, print-formatted day-of schedule (use browser "Save as PDF")
  const printROS = () => {
    const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const all = [...ros].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const typeLabel = { vendor: 'Vendor', event: 'Event', prep: 'Prep', setup: 'Setup', ceremony: 'Ceremony', reception: 'Reception', break: 'Break' };
    const rows = all.map(r => `
      <tr>
        <td class="time">${esc(fmtTime12(r.time))}</td>
        <td><strong>${esc(r.segment) || '<span class="muted">Untitled</span>'}</strong>${r.notes ? `<div class="notes">${esc(r.notes)}</div>` : ''}</td>
        <td>${esc(r.location)}</td>
        <td>${esc(r.owner)}</td>
        <td class="type">${esc(typeLabel[r.type] || r.type || '')}</td>
      </tr>`).join('');
    const contactRows = emergencyContacts.map(v => `
      <tr><td><strong>${esc(v.name)}</strong> <span class="muted">${esc(v.category)}</span></td><td>${esc(v.arrivalTime ? fmtTime12(v.arrivalTime) : '')}</td><td>${esc(v.phone)}</td></tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${esc(eventName || 'Run of Show')} — Run of Show</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, system-ui, 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 36px 44px; }
        h1 { font-size: 22px; margin: 0 0 2px; }
        .sub { color: #555; font-size: 13px; margin-bottom: 4px; }
        .meta { color: #888; font-size: 11px; margin-bottom: 24px; }
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; margin: 28px 0 8px; border-bottom: 2px solid #111; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; padding: 6px 8px; border-bottom: 1px solid #ccc; }
        td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        td.time { font-weight: 700; white-space: nowrap; width: 90px; font-variant-numeric: tabular-nums; }
        td.type { color: #888; font-size: 11px; white-space: nowrap; }
        .notes { color: #666; font-size: 11px; margin-top: 2px; font-weight: 400; }
        .muted { color: #aaa; font-weight: 400; }
        @media print { body { padding: 0; } @page { margin: 0.6in; } }
      </style></head><body>
      <h1>${esc(eventName || 'Run of Show')}</h1>
      <div class="sub">Run of Show${eventVenue ? ' · ' + esc(eventVenue) : ''}${eventDate ? ' · ' + esc(fmtDate(eventDate)) : ''}</div>
      <div class="meta">${all.length} segment${all.length !== 1 ? 's' : ''} · Generated ${esc(fmtDate(today8601()))}</div>
      <table>
        <thead><tr><th>Time</th><th>Segment</th><th>Location</th><th>Owner</th><th>Type</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">No schedule items yet.</td></tr>'}</tbody>
      </table>
      ${contactRows ? `<h2>Day-of Contacts</h2><table><thead><tr><th>Vendor</th><th>Arrives</th><th>Phone</th></tr></thead><tbody>${contactRows}</tbody></table>` : ''}
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
    win.focus();
  };

  return (
    <div>
      {modalEntry && (
        <ROSModal
          entry={modalEntry}
          onClose={() => setModalId(null)}
          onChange={(key, val) => upd(modalId, key, val)}
          onDelete={() => del(modalId)}
        />
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Segments"  value={ros.length} />
        <StatCard label="Vendor Arrivals" value={ros.filter(r => r.type === 'vendor').length} color={C.accent2} />
        <StatCard label="Prep Blocks"     value={ros.filter(r => r.type === 'prep').length}   color={C.warn} />
        <StatCard label="Unconfirmed"     value={unconfirmed} color={unconfirmed > 0 ? C.danger : C.success} sub="vendor slots" />
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={s.cardTitle}>Day-of Schedule</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={{ ...s.input, width: 'auto', padding: '5px 10px', fontSize: 11 }}
              value={rosFilter} onChange={e => setRosFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="vendor">Vendors</option>
              <option value="event">Event</option>
              <option value="prep">Prep</option>
            </select>
            <button style={s.btn('teal')} onClick={syncVendors}>Sync Vendors</button>
            <button style={s.btn()} onClick={printROS} title="Open a print-ready schedule — use your browser's Save as PDF">🖨 Print / PDF</button>
            <AIBtn onClick={draftFullROS} loading={rosDraftLoad} label="Draft Full ROS" />
            <button style={s.btn('primary')} onClick={add}>+ Add</button>
          </div>
        </div>

        {(bp === 'mobile' || bp === 'tablet') ? (
          <div>
            {sorted.length === 0 && <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '20px 0' }}>No schedule yet — tap "+ Add" to start</div>}
            {sorted.map((entry, i) => {
              const typeColor = rosCLR[entry.type] || C.muted;
              const next      = sorted[i + 1];
              const gapMin    = (entry.time && next?.time) ? parseMin(next.time) - parseMin(entry.time) : null;
              const gapLabel  = gapMin !== null && gapMin > 0 ? fmtDur(gapMin) : null;
              return (
                <div key={entry.id}>
                  <div onClick={() => setModalId(entry.id)}
                    style={{ display: 'flex', gap: 10, padding: '12px 0', borderTop: `1px solid ${C.border}`, cursor: 'pointer', alignItems: 'flex-start' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >
                    <div style={{ width: 3, borderRadius: 99, background: typeColor, alignSelf: 'stretch', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{entry.segment || <em style={{ color: C.muted, fontWeight: 400 }}>Untitled segment</em>}</div>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: C.muted, flexShrink: 0 }}>{entry.time || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={s.pill(typeColor)}>{entry.type}</span>
                        {entry.location && <span style={{ fontSize: 11, color: C.muted }}>📍 {entry.location}</span>}
                        {entry.owner    && <span style={{ fontSize: 11, color: C.muted }}>{entry.owner}</span>}
                        {entry.type === 'vendor' && entry.confirmed && <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>✓ Confirmed</span>}
                        {entry.type === 'vendor' && !entry.confirmed && <span style={{ fontSize: 11, color: C.warn }}>⚠ Unconfirmed</span>}
                      </div>
                    </div>
                    <span style={{ color: C.muted, fontSize: 16, flexShrink: 0, marginTop: 2 }}>›</span>
                  </div>
                  {gapLabel && i < sorted.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', color: C.muted, fontSize: 10 }}>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                      <span>{gapLabel}</span>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '64px 3px 1fr 80px 130px 1fr 30px 32px', gap: '8px', marginBottom: 8, padding: '0 0 8px', borderBottom: `1px solid ${C.border}` }}>
              {['Time', '', 'Segment / Location', 'Type', 'Owner', 'Notes', '✓', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
              ))}
            </div>

            {sorted.map((entry, i) => {
              const typeColor = rosCLR[entry.type] || C.muted;
              const next      = sorted[i + 1];
              const gapMin    = (entry.time && next?.time) ? parseMin(next.time) - parseMin(entry.time) : null;
              const gapLabel  = gapMin !== null && gapMin > 0 ? fmtDur(gapMin) : null;
              const isVendor  = entry.type === 'vendor';

              return (
                <Fragment key={entry.id}>
                  <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '64px 3px 1fr 80px 130px 1fr 30px 32px', gap: '8px', alignItems: 'start', marginBottom: gapLabel ? 4 : 6 }}>
                    <input style={{ ...s.input, padding: '6px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} value={entry.time} placeholder="09:00" onChange={e => upd(entry.id, 'time', e.target.value)} />
                    <div style={{ width: 3, minHeight: 36, borderRadius: 99, background: typeColor, marginTop: 4 }} />
                    <div>
                      <input style={s.input} value={entry.segment} placeholder="Segment description" onChange={e => upd(entry.id, 'segment', e.target.value)} />
                      <input style={{ ...s.input, fontSize: 11, marginTop: 4, color: C.muted, padding: '4px 10px' }} value={entry.location || ''} placeholder="📍 Location" onChange={e => upd(entry.id, 'location', e.target.value)} />
                    </div>
                    <select style={{ ...s.input, padding: '6px 8px', color: typeColor }} value={entry.type} onChange={e => upd(entry.id, 'type', e.target.value)}>
                      <option value="event">Event</option>
                      <option value="vendor">Vendor</option>
                      <option value="prep">Prep</option>
                    </select>
                    <input style={s.input} value={entry.owner} placeholder="Owner" onChange={e => upd(entry.id, 'owner', e.target.value)} />
                    <input style={s.input} value={entry.notes} placeholder="Notes / cues" onChange={e => upd(entry.id, 'notes', e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
                      {isVendor ? (
                        <input
                          type="checkbox"
                          checked={entry.confirmed || false}
                          onChange={e => upd(entry.id, 'confirmed', e.target.checked)}
                          title="Vendor confirmed"
                          style={{ accentColor: C.success, cursor: 'pointer', width: 14, height: 14 }}
                        />
                      ) : <div />}
                    </div>
                    <button style={{ ...s.btn('danger'), padding: '6px 8px' }} onClick={() => del(entry.id)}>✕</button>
                  </div>
                  {gapLabel && i < sorted.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 72 }}>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                      <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap' }}>{gapLabel}</span>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                    </div>
                  )}
                  </div>
                  {i < sorted.length - 1 && gapMin !== null && gapMin <= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 12px', marginBottom: 4, color: C.danger, fontSize: 11, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.danger, display: 'inline-block', flexShrink: 0 }} />
                      {gapMin === 0 ? 'Same time as next — possible conflict' : 'Time overlap — check order'}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* Emergency contacts */}
      {emergencyContacts.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Day-of Emergency Contacts</div>
          <table style={s.table}>
            <thead>
              <tr>{['Vendor', 'Category', 'Phone', 'Arrives', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {emergencyContacts.map(v => (
                <tr key={v.id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{v.name}</td>
                  <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{v.category}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: C.accent2 }}>{v.phone}</td>
                  <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{v.arrivalTime || '—'}</td>
                  <td style={s.td}><span style={s.pill(stageCLR[v.status] || C.muted)}>{v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ timeline, vendors, eventDate, ros, onTabChange }) {
  const C      = useT();
  const s      = makeS(C);
  const rosCLR = ROS_CLR(C);
  const eventMonth = eventDate ? new Date(eventDate + 'T00:00:00') : null;
  const [viewDate,    setViewDate]    = useState(() => new Date(getToday().getFullYear(), getToday().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => eventDate || today8601());
  const [calView,     setCalView]     = useState('month'); // 'month' | 'day'

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Build items map + phase detail map
  const items      = {};
  const phaseByDay = {}; // dateStr → { phase, tasks, date, color }
  const add = (dateStr, item) => { if (dateStr) { items[dateStr] = items[dateStr] || []; items[dateStr].push(item); } };

  if (eventDate) add(eventDate, { label: 'Event Day', color: C.accent, type: 'event' });

  const phaseGroups = {};
  timeline.forEach(task => {
    if (!(task.week in PHASE_OFFSET) || !eventDate) return;
    const d = new Date(eventDate + 'T00:00:00');
    d.setDate(d.getDate() + PHASE_OFFSET[task.week]);
    const ds = d.toISOString().slice(0, 10);
    if (!phaseGroups[ds]) phaseGroups[ds] = { phase: task.week, tasks: [], date: d };
    phaseGroups[ds].tasks.push(task);
  });
  Object.values(phaseGroups).forEach(({ phase, tasks, date }) => {
    const ds      = date.toISOString().slice(0, 10);
    const done    = tasks.filter(t => t.done).length;
    const overdue = tasks.filter(t => !t.done && date < getToday()).length;
    const total   = tasks.length;
    const color   = overdue > 0 ? C.danger : done === total ? C.success : C.accent2;
    const label   = done === total ? `${phase}: all done`
      : overdue > 0 ? `${phase}: ${overdue} overdue`
      : `${phase}: ${done}/${total} done`;
    add(ds, { label, color, type: 'task', title: phase });
    phaseByDay[ds] = { phase, tasks, date, color };
  });

  vendors.forEach(v => {
    if (v.payDueDate && !v.balancePaid && v.name)
      add(v.payDueDate, { label: `${v.name} payment`, color: C.warn, type: 'payment' });
  });

  const arrivingVendors = eventDate
    ? [...vendors.filter(v => v.arrivalTime && v.name && v.status === 'Confirmed')]
        .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))
    : [];
  if (arrivingVendors.length > 0) {
    add(eventDate, {
      label: `${arrivingVendors.length} vendor${arrivingVendors.length > 1 ? 's' : ''} arriving from ${arrivingVendors[0].arrivalTime}`,
      color: C.accent2, type: 'vendor',
      title: arrivingVendors.map(v => `${v.name} @ ${v.arrivalTime}`).join('\n'),
    });
  }

  // Grid
  const firstDay    = new Date(year, month, 1);
  const lastDay     = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    const d  = new Date(year, month, dayNum);
    const ds = d.toISOString().slice(0, 10);
    return { dayNum, ds, isToday: ds === today8601(), isEvent: ds === eventDate, dayItems: items[ds] || [] };
  });

  const monthLabel    = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isEventMonth  = eventMonth && eventMonth.getFullYear() === year && eventMonth.getMonth() === month;
  const goToEvent     = () => eventDate && setViewDate(new Date(new Date(eventDate + 'T00:00:00').getFullYear(), new Date(eventDate + 'T00:00:00').getMonth(), 1));
  const goToToday     = () => { setViewDate(new Date(getToday().getFullYear(), getToday().getMonth(), 1)); setSelectedDay(today8601()); };

  const thisMonthItems = cells.filter(Boolean).flatMap(c => c.dayItems);
  const criticalCount  = thisMonthItems.filter(i => i.color === C.danger).length;
  const paymentCount   = thisMonthItems.filter(i => i.type === 'payment').length;

  // Day view data — all events on the selected day with time context
  const selIsEventDay = selectedDay === eventDate;
  const dayRosItems   = selIsEventDay
    ? [...(ros || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    : [];
  const dayVendors    = selIsEventDay
    ? [...vendors.filter(v => v.arrivalTime && v.name && v.status === 'Confirmed')]
        .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))
    : [];
  const dayPayments   = vendors.filter(v => v.payDueDate === selectedDay && !v.balancePaid);
  const dayPhase      = phaseByDay[selectedDay];

  return (
    <div>
      {/* Nav bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {calView === 'month' ? (
            <>
              <button style={s.btn()} onClick={() => setViewDate(new Date(year, month - 1, 1))}>←</button>
              <span style={{ fontSize: 16, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>{monthLabel}</span>
              <button style={s.btn()} onClick={() => setViewDate(new Date(year, month + 1, 1))}>→</button>
            </>
          ) : (
            <>
              <button style={s.btn()} onClick={() => {
                const d = new Date(selectedDay + 'T00:00:00');
                d.setDate(d.getDate() - 1);
                setSelectedDay(d.toISOString().slice(0, 10));
              }}>←</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 200, textAlign: 'center' }}>
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
              </span>
              <button style={s.btn()} onClick={() => {
                const d = new Date(selectedDay + 'T00:00:00');
                d.setDate(d.getDate() + 1);
                setSelectedDay(d.toISOString().slice(0, 10));
              }}>→</button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {calView === 'month' && criticalCount > 0 && <span style={s.pill(C.danger)}>{criticalCount} overdue</span>}
          {calView === 'month' && paymentCount > 0 && <span style={s.pill(C.warn)}>{paymentCount} payment{paymentCount > 1 ? 's' : ''} due</span>}
          {calView === 'month' && isEventMonth && <span style={s.pill(C.accent)}>Event this month</span>}
          {calView === 'month' && eventDate && !isEventMonth && <button style={{ ...s.btn('ghost'), fontSize: 11, color: C.accent }} onClick={goToEvent}>Jump to event →</button>}
          <button style={{ ...s.btn('ghost'), fontSize: 11, color: C.muted }} onClick={goToToday}>Today</button>
          {eventDate && <button style={{ ...s.btn('ghost'), fontSize: 11, color: C.accent }} onClick={() => { setSelectedDay(eventDate); setCalView('day'); }}>Event Day</button>}
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {['month', 'day'].map(v => (
              <button key={v} onClick={() => setCalView(v)} style={{
                padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: calView === v ? C.accent : 'transparent',
                color: calView === v ? '#fff' : C.muted,
                transition: 'all 0.15s',
              }}>{v === 'month' ? 'Month' : 'Day'}</button>
            ))}
          </div>
        </div>
      </div>

      {calView === 'month' ? (
        <>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: C.muted, padding: '4px 0', letterSpacing: '0.06em', userSelect: 'none' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} style={{ minHeight: 80, background: C.bg + '88', borderRadius: 6 }} />;
              const { dayNum, ds, isToday, isEvent, dayItems } = cell;
              const isSelected  = ds === selectedDay;
              const hasCritical = dayItems.some(it => it.color === C.danger);
              return (
                <div key={ds} onClick={() => { setSelectedDay(ds); setCalView('day'); }} style={{
                  minHeight: 80, padding: '6px 6px 4px', borderRadius: 6, cursor: 'pointer',
                  background: isEvent ? C.accent + '1a' : isSelected ? C.accent2 + '12' : C.surface,
                  border: `1px solid ${isSelected ? C.accent2 + 'aa' : isEvent ? C.accent + '66' : isToday ? C.accent2 + '55' : hasCritical ? C.danger + '44' : C.border}`,
                  boxShadow: isSelected ? `0 0 0 1px ${C.accent2 + '33'}` : isEvent ? `0 0 0 1px ${C.accent + '33'}` : 'none',
                  userSelect: 'none', transition: 'background 0.1s, border-color 0.1s',
                }}>
                  <div style={{ fontSize: 11, fontWeight: isToday || isEvent || isSelected ? 700 : 400, color: isSelected ? C.accent2 : isEvent ? C.accent : isToday ? C.accent2 : C.muted, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {dayNum}
                    {isToday && <span style={{ fontSize: 8, background: C.accent2, color: C.bg, borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>NOW</span>}
                    {isEvent && <span style={{ fontSize: 8, background: C.accent, color: C.bg, borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>EVENT</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayItems.slice(0, 3).map((item, j) => (
                      <div key={j} title={item.title || item.label} style={{
                        fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '1px 4px',
                        background: item.color + '22', color: item.color,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4,
                      }}>
                        {item.label}
                      </div>
                    ))}
                    {dayItems.length > 3 && <div style={{ fontSize: 8, color: C.muted, paddingLeft: 2 }}>+{dayItems.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Day View ── */
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            {selectedDay === today8601() && <span style={s.pill(C.accent2)}>Today</span>}
            {selectedDay === eventDate && <span style={s.pill(C.accent)}>Event Day</span>}
            {dayPayments.length > 0 && <span style={s.pill(C.warn)}>{dayPayments.length} payment{dayPayments.length > 1 ? 's' : ''} due</span>}
          </div>

          {/* All-day items (phase tasks, payments) */}
          {(dayPhase || dayPayments.length > 0) && (
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface2 + '88', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayPhase && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: dayPhase.color, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Planning Milestone — {dayPhase.phase}</span>
                    {onTabChange && (
                      <button onClick={() => onTabChange('Planning Tasks')} style={{ fontSize: 10, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                        → Planning Tasks
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayPhase.tasks.map(t => {
                      const ov = dayPhase.date < getToday() && !t.done;
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ color: t.done ? C.success : ov ? C.danger : C.muted }}>{t.done ? '✓' : ov ? '!' : '○'}</span>
                          <span style={{ color: t.done ? C.muted : C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.task}</span>
                          {t.owner && <span style={{ color: C.muted, marginLeft: 'auto' }}>{t.owner}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {dayPayments.map(v => {
                const bal = v.balancePaid ? 0 : v.cost - v.depositAmt;
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: C.warn + '15', borderRadius: 6, border: `1px solid ${C.warn}33` }}>
                    <span style={{ fontSize: 11, color: C.warn, fontWeight: 700 }}>💳 Payment Due</span>
                    <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{v.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.warn }}>{fmtD(bal)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Time grid */}
          {(selIsEventDay && (dayRosItems.length > 0 || dayVendors.length > 0)) ? (
            <div>
              {/* Build merged time-sorted list of ROS + vendor arrivals */}
              {(() => {
                const slots = [];
                dayVendors.forEach(v => slots.push({ time: v.arrivalTime, label: `${v.name} arrival`, sub: v.category, color: C.accent2, type: 'vendor' }));
                dayRosItems.forEach(r => {
                  const clr = rosCLR[r.type] || C.muted;
                  slots.push({ time: r.time || '', label: r.segment || r.label || r.task || '—', sub: r.owner || r.type, color: clr, type: 'ros', duration: r.duration });
                });
                slots.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                const minHour = slots.length > 0 && slots[0].time
                  ? Math.max(0, Math.floor(parseMin(slots[0].time) / 60) - 1)
                  : 6;
                const maxHour = slots.length > 0 && slots[slots.length - 1].time
                  ? Math.min(24, Math.ceil(parseMin(slots[slots.length - 1].time) / 60) + 2)
                  : 22;
                const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);

                return (
                  <div style={{ padding: '8px 0', maxHeight: 480, overflowY: 'auto' }}>
                    {hours.map(h => {
                      const hLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                      const slotItems = slots.filter(s => {
                        if (!s.time) return false;
                        const sm = parseMin(s.time);
                        return sm >= h * 60 && sm < (h + 1) * 60;
                      });
                      return (
                        <div key={h} style={{ display: 'flex', gap: 0, minHeight: 44, borderTop: `1px solid ${C.border}33` }}>
                          <div style={{ width: 56, flexShrink: 0, padding: '10px 12px 0', fontSize: 10, color: C.border, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{hLabel}</div>
                          <div style={{ flex: 1, padding: '4px 16px 4px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {slotItems.map((item, j) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 6, background: item.color + '18', borderLeft: `3px solid ${item.color}` }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: item.color, minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>{item.time}</span>
                                <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{item.label}</span>
                                {item.duration && <span style={{ fontSize: 10, color: C.muted }}>{fmtDur(item.duration)}</span>}
                                <span style={{ fontSize: 10, color: item.color, textTransform: 'capitalize' }}>{item.sub}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{ padding: '8px 20px 12px', fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 10 }}>
                Full day-of schedule
                {onTabChange && (
                  <button onClick={() => onTabChange('Run of Show')} style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                    → Run of Show
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px 20px', fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
              {selIsEventDay ? 'No confirmed vendor arrivals or Run of Show items set.' : 'No timed events on this day.'}
              {!selIsEventDay && dayPhase && ' '}
            </div>
          )}
        </div>
      )}

      {/* Legend — month view only */}
      {calView === 'month' && (
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { color: C.accent,  label: 'Event Day' },
            { color: C.success, label: 'Phase complete' },
            { color: C.accent2, label: 'Phase in progress' },
            { color: C.danger,  label: 'Overdue phase' },
            { color: C.warn,    label: 'Payment due' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Master Calendar ──────────────────────────────────────────────────────────

function MasterCalendarView({ events, onSelectEvent }) {
  const C      = useT();
  const s      = makeS(C);
  const evtCLR = EVT_CLR(C);
  const rosCLR = ROS_CLR(C);
  const [viewDate,    setViewDate]    = useState(() => new Date(getToday().getFullYear(), getToday().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => today8601());
  const [calView,     setCalView]     = useState('month'); // 'month' | 'day'

  const fmtTime12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; const hr = h % 12 || 12; return `${hr}:${String(m || 0).padStart(2, '0')} ${ampm}`; };

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Aggregate items across all events
  const items      = {};  // dateStr → [{label, color, type, eventId, ...}]
  const phaseStore = {};  // dateStr → [{eventId, eventName, phase, tasks, date, color}]
  const addItem = (ds, item) => { if (ds) { items[ds] = items[ds] || []; items[ds].push(item); } };

  events.forEach(ev => {
    const evColor  = evtCLR[ev.type] || C.muted;
    const evDate   = ev.date;
    if (evDate) addItem(evDate, { type: 'event', label: ev.name, color: evColor, eventId: ev.id });

    // Phase milestones per event
    const phaseGroups = {};
    (ev.timeline || []).forEach(task => {
      if (!(task.week in PHASE_OFFSET) || !evDate) return;
      const d  = new Date(evDate + 'T00:00:00');
      d.setDate(d.getDate() + PHASE_OFFSET[task.week]);
      const ds = d.toISOString().slice(0, 10);
      if (!phaseGroups[ds]) phaseGroups[ds] = { phase: task.week, tasks: [], date: d };
      phaseGroups[ds].tasks.push(task);
    });
    Object.values(phaseGroups).forEach(({ phase, tasks, date }) => {
      const ds      = date.toISOString().slice(0, 10);
      const done    = tasks.filter(t => t.done).length;
      const overdue = tasks.filter(t => !t.done && date < getToday()).length;
      const total   = tasks.length;
      const chipColor = overdue > 0 ? C.danger : done === total ? C.success : evColor;
      const label     = `${ev.name}: ${done}/${total} done`;
      addItem(ds, { type: 'task', label, color: chipColor, eventId: ev.id, title: `${ev.name} — ${phase}` });
      phaseStore[ds] = phaseStore[ds] || [];
      phaseStore[ds].push({ eventId: ev.id, eventName: ev.name, phase, tasks, date, color: chipColor, evColor });
    });

    // Payments
    (ev.vendors || []).forEach(v => {
      if (v.payDueDate && !v.balancePaid && v.name)
        addItem(v.payDueDate, { type: 'payment', label: `${v.name}`, color: C.warn, eventId: ev.id, eventName: ev.name, vendor: v });
    });

    // Vendor arrivals chip on event day
    const arriving = (ev.vendors || []).filter(v => v.arrivalTime && v.name && v.status === 'Confirmed')
      .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
    if (arriving.length > 0 && evDate)
      addItem(evDate, { type: 'vendor', label: `${arriving.length} vendor${arriving.length > 1 ? 's' : ''} arriving`, color: C.accent2, eventId: ev.id, title: arriving.map(v => `${v.name} @ ${v.arrivalTime}`).join('\n') });
  });

  // Grid
  const firstDay    = new Date(year, month, 1);
  const lastDay     = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    const d  = new Date(year, month, dayNum);
    const ds = d.toISOString().slice(0, 10);
    return { dayNum, ds, isToday: ds === today8601(), dayItems: items[ds] || [] };
  });

  const monthLabel     = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const thisMonthItems = cells.filter(Boolean).flatMap(c => c.dayItems);
  const criticalCount  = thisMonthItems.filter(i => i.color === C.danger).length;
  const paymentCount   = thisMonthItems.filter(i => i.type === 'payment').length;
  const eventDays      = thisMonthItems.filter(i => i.type === 'event').length;
  const goToToday      = () => { setViewDate(new Date(getToday().getFullYear(), getToday().getMonth(), 1)); setSelectedDay(today8601()); setCalView('month'); };

  // Day detail data
  const selEventDay = events.filter(ev => ev.date === selectedDay);
  const selPhases   = phaseStore[selectedDay] || [];
  const selPayments = (items[selectedDay] || []).filter(i => i.type === 'payment');

  // Day view: time grid — merge vendor arrivals + ROS items across all events on this day
  const daySlots = [];
  selEventDay.forEach(ev => {
    const evColor = evtCLR[ev.type] || C.muted;
    (ev.vendors || []).filter(v => v.arrivalTime && v.name && v.status === 'Confirmed')
      .forEach(v => daySlots.push({ time: v.arrivalTime, label: `${v.name} arrival`, sub: `${ev.name} · ${v.category || ''}`, color: C.accent2, type: 'vendor', evId: ev.id }));
    (ev.ros || []).forEach(r => {
      const clr = rosCLR[r.type] || C.muted;
      daySlots.push({ time: r.time || '', label: r.segment || r.label || r.task || '—', sub: `${ev.name}${r.owner ? ` · ${r.owner}` : ''}`, color: clr, type: 'ros', duration: r.duration, evId: ev.id });
    });
  });
  daySlots.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const hasTimedContent = daySlots.length > 0;

  // Day-view prev/next
  const shiftDay = (delta) => {
    const d = new Date(selectedDay + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDay(d.toISOString().slice(0, 10));
  };

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {calView === 'month' ? (
            <>
              <button style={s.btn()} onClick={() => setViewDate(new Date(year, month - 1, 1))}>←</button>
              <span style={{ fontSize: 16, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>{monthLabel}</span>
              <button style={s.btn()} onClick={() => setViewDate(new Date(year, month + 1, 1))}>→</button>
            </>
          ) : (
            <>
              <button style={s.btn()} onClick={() => shiftDay(-1)}>←</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 200, textAlign: 'center' }}>
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
              </span>
              <button style={s.btn()} onClick={() => shiftDay(1)}>→</button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {calView === 'month' && criticalCount > 0 && <span style={s.pill(C.danger)}>{criticalCount} overdue</span>}
          {calView === 'month' && paymentCount  > 0 && <span style={s.pill(C.warn)}>{paymentCount} payment{paymentCount > 1 ? 's' : ''} due</span>}
          {calView === 'month' && eventDays     > 0 && <span style={s.pill(C.accent)}>{eventDays} event{eventDays > 1 ? 's' : ''} this month</span>}
          <button style={{ ...s.btn('ghost'), fontSize: 11, color: C.muted }} onClick={goToToday}>Today</button>
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {['month', 'day'].map(v => (
              <button key={v} onClick={() => setCalView(v)} style={{
                padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: calView === v ? C.accent : 'transparent',
                color: calView === v ? '#fff' : C.muted,
                transition: 'all 0.15s',
              }}>{v === 'month' ? 'Month' : 'Day'}</button>
            ))}
          </div>
        </div>
      </div>

      {calView === 'month' ? (
        <>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: C.muted, padding: '4px 0', letterSpacing: '0.06em', userSelect: 'none' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} style={{ minHeight: 80, background: C.bg + '88', borderRadius: 6 }} />;
              const { dayNum, ds, isToday, dayItems } = cell;
              const isSelected  = ds === selectedDay;
              const hasCritical = dayItems.some(it => it.color === C.danger);
              const isEventDay  = dayItems.some(it => it.type === 'event');
              return (
                <div key={ds} onClick={() => { setSelectedDay(ds); setCalView('day'); }} style={{
                  minHeight: 80, padding: '6px 6px 4px', borderRadius: 6, cursor: 'pointer',
                  background: isEventDay ? C.accent + '12' : isSelected ? C.accent2 + '10' : C.surface,
                  border: `1px solid ${isSelected ? C.accent2 + 'aa' : isEventDay ? C.accent + '55' : isToday ? C.accent2 + '44' : hasCritical ? C.danger + '33' : C.border}`,
                  boxShadow: isSelected ? `0 0 0 1px ${C.accent2 + '33'}` : 'none',
                  userSelect: 'none', transition: 'background 0.1s, border-color 0.1s',
                }}>
                  <div style={{ fontSize: 11, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? C.accent2 : isToday ? C.accent2 : C.muted, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {dayNum}
                    {isToday && <span style={{ fontSize: 8, background: C.accent2, color: C.bg, borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>NOW</span>}
                    {isEventDay && <span style={{ fontSize: 8, background: C.accent, color: C.bg, borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>EVENT</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayItems.slice(0, 3).map((item, j) => (
                      <div key={j} title={item.title || item.label} style={{
                        fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '1px 4px',
                        background: item.color + '22', color: item.color,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4,
                      }}>{item.label}</div>
                    ))}
                    {dayItems.length > 3 && <div style={{ fontSize: 8, color: C.muted, paddingLeft: 2 }}>+{dayItems.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend — month view only */}
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { color: C.accent,  label: 'Event Day' },
              { color: C.success, label: 'Phase complete' },
              { color: C.accent2, label: 'Vendor / in progress' },
              { color: C.danger,  label: 'Overdue phase' },
              { color: C.warn,    label: 'Payment due' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Day View ── */
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            {selectedDay === today8601() && <span style={s.pill(C.accent2)}>Today</span>}
            {selEventDay.length > 0 && <span style={s.pill(C.accent)}>{selEventDay.length} event{selEventDay.length > 1 ? 's' : ''}</span>}
            {selPayments.length > 0 && <span style={s.pill(C.warn)}>{selPayments.length} payment{selPayments.length > 1 ? 's' : ''} due</span>}
          </div>

          {/* Events on this day */}
          {selEventDay.length > 0 && (
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.accent, marginBottom: 8 }}>Event Day</div>
              {selEventDay.map(ev => (
                <div key={ev.id} onClick={() => onSelectEvent(ev.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                  background: (evtCLR[ev.type] || C.muted) + '12', borderRadius: 8,
                  border: `1px solid ${(evtCLR[ev.type] || C.muted) + '44'}`, cursor: 'pointer', marginBottom: 6,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = (evtCLR[ev.type] || C.muted) + '22'}
                  onMouseLeave={e => e.currentTarget.style.background = (evtCLR[ev.type] || C.muted) + '12'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{ev.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{ev.venue || ev.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={s.pill(evtCLR[ev.type] || C.muted)}>{ev.type}</span>
                    <span style={{ color: C.muted, fontSize: 14 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phase milestones + payments */}
          {(selPhases.length > 0 || selPayments.length > 0) && (
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface2 + '88', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selPhases.map((ph, i) => {
                const done = ph.tasks.filter(t => t.done).length;
                const overdue = ph.tasks.filter(t => !t.done && ph.date < getToday()).length;
                return (
                  <div key={i}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: ph.color, marginBottom: 6 }}>
                      Planning Milestone — {ph.phase} · {ph.eventName}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {ph.tasks.map(t => {
                        const ov = ph.date < getToday() && !t.done;
                        return (
                          <div key={t.id} onClick={() => onSelectEvent(ph.eventId)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.background = C.accent + '0d'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ color: t.done ? C.success : ov ? C.danger : C.muted }}>{t.done ? '✓' : ov ? '!' : '○'}</span>
                            <span style={{ color: t.done ? C.muted : C.text, textDecoration: t.done ? 'line-through' : 'none', flex: 1 }}>{t.task}</span>
                            {t.owner && <span style={{ color: C.muted }}>{t.owner}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: ph.color, fontWeight: 600, marginTop: 4 }}>{done}/{ph.tasks.length} done{overdue > 0 ? ` · ${overdue} overdue` : ''}</div>
                  </div>
                );
              })}
              {selPayments.map((item, i) => {
                const v = item.vendor;
                const bal = v ? v.cost - (v.depositPaid ? v.depositAmt : 0) : 0;
                return (
                  <div key={i} onClick={() => onSelectEvent(item.eventId)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: C.warn + '15', borderRadius: 6, border: `1px solid ${C.warn}33`, cursor: 'pointer' }}>
                    <span style={{ fontSize: 11, color: C.warn, fontWeight: 700 }}>💳 Payment Due</span>
                    <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{item.label} · <span style={{ color: C.muted }}>{item.eventName}</span></span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.warn }}>{fmtD(bal)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Time grid — vendor arrivals + ROS across all events this day */}
          {hasTimedContent ? (() => {
            const timed   = daySlots.filter(s => s.time);
            const untimed = daySlots.filter(s => !s.time);
            const minHour = timed.length > 0 ? Math.max(0, Math.floor(parseMin(timed[0].time) / 60) - 1) : 6;
            const maxHour = timed.length > 0 ? Math.min(24, Math.ceil(parseMin(timed[timed.length - 1].time) / 60) + 2) : 22;
            const hours   = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
            return (
              <div>
                <div style={{ padding: '8px 0', maxHeight: 480, overflowY: 'auto' }}>
                  {hours.map(h => {
                    const hLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                    const slotItems = timed.filter(sl => { const sm = parseMin(sl.time); return sm >= h * 60 && sm < (h + 1) * 60; });
                    return (
                      <div key={h} style={{ display: 'flex', gap: 0, minHeight: 44, borderTop: `1px solid ${C.border}33` }}>
                        <div style={{ width: 56, flexShrink: 0, padding: '10px 12px 0', fontSize: 10, color: C.border, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{hLabel}</div>
                        <div style={{ flex: 1, padding: '4px 16px 4px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {slotItems.map((item, j) => (
                            <div key={j} onClick={() => onSelectEvent(item.evId)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 6, background: item.color + '18', borderLeft: `3px solid ${item.color}`, cursor: 'pointer' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: item.color, minWidth: 42, fontVariantNumeric: 'tabular-nums' }}>{fmtTime12(item.time)}</span>
                              <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{item.label}</span>
                              {item.duration && <span style={{ fontSize: 10, color: C.muted }}>{fmtDur(item.duration)}</span>}
                              <span style={{ fontSize: 10, color: item.color }}>{item.sub}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {untimed.length > 0 && (
                  <div style={{ padding: '8px 20px 12px', borderTop: `1px solid ${C.border}33` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 6 }}>No time set</div>
                    {untimed.map((item, j) => (
                      <div key={j} onClick={() => onSelectEvent(item.evId)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 6, background: item.color + '12', borderLeft: `3px solid ${item.color}`, marginBottom: 3, cursor: 'pointer' }}>
                        <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{item.label}</span>
                        <span style={{ fontSize: 10, color: item.color }}>{item.sub}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '6px 20px 10px', fontSize: 11, color: C.muted }}>Click any item to open the event</div>
              </div>
            );
          })() : (
            <div style={{ padding: '24px 20px', fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
              {selEventDay.length > 0 ? 'No confirmed vendor arrivals or Run of Show items set for this event.' : selPhases.length > 0 || selPayments.length > 0 ? '' : 'Nothing scheduled — clear day.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Send to Client ───────────────────────────────────────────────────────────

const CLIENT_PKG_SECTIONS = [
  { id: 'summary',  label: 'Event Summary',  icon: '📋' },
  { id: 'ros',      label: 'Run of Show',    icon: '🕐' },
  { id: 'vendors',  label: 'Vendor List',    icon: '🤝' },
  { id: 'guests',   label: 'Guest List',     icon: '👥' },
  { id: 'budget',   label: 'Budget Summary', icon: '💰' },
];

function buildClientText(event, client, sections) {
  const lines = [];
  const guests  = event.guests  || [];
  const vendors = event.vendors || [];
  const budget  = event.budget  || [];
  const ros     = event.ros     || [];

  const eventDate = event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (sections.summary) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`${event.name || 'Your Event'}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    if (event.type)  lines.push(`Type:   ${event.type}`);
    if (eventDate)   lines.push(`Date:   ${eventDate}`);
    if (event.venue) lines.push(`Venue:  ${event.venue}`);
    if (client?.name)  lines.push(`Client: ${client.name}`);
    const confirmed = guests.filter(g => g.rsvp === 'Yes').length;
    const invited   = guests.length;
    if (invited > 0) lines.push(`Guests: ${confirmed} confirmed / ${invited} invited`);
    lines.push('');
  }

  if (sections.ros && ros.length > 0) {
    lines.push(`RUN OF SHOW`);
    lines.push(`─────────────────────────────────`);
    [...ros].sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach(r => {
      const time = r.time || '';
      const seg  = r.segment || '';
      const loc  = r.location ? `  [${r.location}]` : '';
      lines.push(`${time.padEnd(8)}${seg}${loc}`);
      if (r.notes) lines.push(`        ↳ ${r.notes}`);
    });
    lines.push('');
  }

  if (sections.vendors && vendors.length > 0) {
    const contracted = vendors.filter(v => ['Contracted', 'Deposit Paid', 'Confirmed'].includes(v.status));
    lines.push(`CONFIRMED VENDORS (${contracted.length})`);
    lines.push(`─────────────────────────────────`);
    contracted.forEach(v => {
      lines.push(`${(v.name || '').padEnd(28)} ${v.category || ''}`);
      if (v.phone)   lines.push(`  Phone:   ${v.phone}`);
      if (v.contact) lines.push(`  Email:   ${v.contact}`);
    });
    lines.push('');
  }

  if (sections.guests && guests.length > 0) {
    lines.push(`GUEST LIST (${guests.length})`);
    lines.push(`─────────────────────────────────`);
    const byGroup = guests.reduce((acc, g) => {
      const grp = g.group || 'Other';
      acc[grp] = acc[grp] || [];
      acc[grp].push(g);
      return acc;
    }, {});
    Object.entries(byGroup).forEach(([grp, gs]) => {
      lines.push(`${grp}:`);
      gs.forEach(g => {
        const rsvp  = g.rsvp ? ` [${g.rsvp}]` : '';
        const plus  = g.plusOne ? ` +${g.plusOne}` : '';
        const kids  = g.kids > 0 ? ` + ${g.kids} child${g.kids > 1 ? 'ren' : ''}` : '';
        lines.push(`  ${g.name}${plus}${kids}${rsvp}`);
      });
    });
    lines.push('');
  }

  if (sections.budget && budget.length > 0) {
    const totalBudgeted = budget.reduce((s, r) => s + (r.budgeted || 0), 0);
    const totalSpent    = budget.reduce((s, r) => s + (r.actual   || 0), 0);
    lines.push(`BUDGET SUMMARY`);
    lines.push(`─────────────────────────────────`);
    budget.forEach(r => {
      if (!r.budgeted && !r.actual) return;
      lines.push(`${(r.category || '').padEnd(22)} Budgeted: $${(r.budgeted || 0).toLocaleString()}  Spent: $${(r.actual || 0).toLocaleString()}`);
    });
    lines.push(`─────────────────────────────────`);
    lines.push(`TOTAL                  Budgeted: $${totalBudgeted.toLocaleString()}  Spent: $${totalSpent.toLocaleString()}`);
    lines.push('');
  }

  lines.push(`─────────────────────────────────`);
  lines.push(`Prepared by ${event._plannerName || 'your event planner'}`);
  lines.push(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

  return lines.join('\n');
}

// ─── Client Downloads ─────────────────────────────────────────────────────────

function downloadGuestTemplate(eventName) {
  const wb = XLSX.utils.book_new();
  const headers = ['Name', 'Group', 'Email', 'Phone', 'RSVP', 'Meal', 'Plus One', 'Plus One Meal', 'Kids', 'Needs', 'Table', 'Address', 'Notes'];
  const example = ['Sarah & James Chen', 'Family', 'sarah@email.com', '(615) 555-1234', 'Yes', 'Standard', 'Jen Park', 'Vegetarian', '0', '', '1', '', ''];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 10 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 5  }, { wch: 22 },
    { wch: 7  }, { wch: 28 }, { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Guest List');
  const safeName = (eventName || 'Event').replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `${safeName}_GuestList_Template.xlsx`);
}

function downloadCurrentGuestList(event) {
  const guests = event.guests || [];
  const wb = XLSX.utils.book_new();
  const rows = guests.length
    ? guests.map(g => ({
        'Name':           g.name          || '',
        'Group':          g.group         || '',
        'Email':          g.email         || '',
        'Phone':          g.phone         || '',
        'RSVP':           g.rsvp          || '',
        'Meal':           g.meal          || '',
        'Plus One':       g.plusOne       || '',
        'Plus One Meal':  g.plusOneMeal   || '',
        'Kids':           g.kids          || 0,
        'Needs':          g.needs         || '',
        'Table':          g.table         || '',
        'Address':        g.address       || '',
        'Notes':          g.partyNotes    || '',
      }))
    : [{ 'Name': '(no guests yet — add guests or import a spreadsheet)' }];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 10 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 5  }, { wch: 22 },
    { wch: 7  }, { wch: 28 }, { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Guest List');
  const safeName = (event.name || 'Event').replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `${safeName}_GuestList.xlsx`);
}

function downloadEventSummary(event, client) {
  exportClientPackage(event, client, { summary: true, ros: true, vendors: true, guests: true, budget: false });
}

function DownloadsCard({ event, client, compact = false }) {
  const C = useT();
  const s = makeS(C);

  const downloads = [
    {
      id: 'template',
      icon: '📋',
      label: 'Guest List Template',
      sub: 'Blank spreadsheet — fill in and re-import',
      action: () => downloadGuestTemplate(event?.name),
    },
    {
      id: 'guestlist',
      icon: '👥',
      label: 'Current Guest List',
      sub: `${(event?.guests || []).length} guests · XLSX`,
      action: () => downloadCurrentGuestList(event),
    },
    {
      id: 'summary',
      icon: '📄',
      label: 'Event Summary',
      sub: 'Vendors, run of show, guest overview',
      action: () => downloadEventSummary(event, client),
    },
  ];

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {downloads.map(d => (
          <button key={d.id} onClick={d.action}
            style={{ ...s.btn('ghost'), fontSize: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
            {d.icon} {d.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>⬇ Downloads</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {downloads.map(d => (
          <button key={d.id} onClick={d.action}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{d.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{d.sub}</div>
            </div>
            <span style={{ fontSize: 14, color: C.muted }}>⬇</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function exportClientPackage(event, client, sections) {
  const wb = XLSX.utils.book_new();
  const guests  = event.guests  || [];
  const vendors = event.vendors || [];
  const budget  = event.budget  || [];
  const ros     = event.ros     || [];

  const eventDate = event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const confirmed = guests.filter(g => g.rsvp === 'Yes').length;

  // ── Summary sheet ──────────────────────────────────────────────────────────
  if (sections.summary) {
    const rows = [
      [`${event.name || 'Your Event'} — Event Summary`],
      ['Prepared', new Date().toLocaleDateString()],
      [],
      ['EVENT DETAILS'],
      ['Event Name', event.name  || ''],
      ['Type',       event.type  || ''],
      ['Date',       eventDate],
      ['Venue',      event.venue || ''],
      [],
    ];
    if (client?.name)  rows.push(['CLIENT']);
    if (client?.name)  rows.push(['Name',  client.name  || '']);
    if (client?.email) rows.push(['Email', client.email || '']);
    if (client?.phone) rows.push(['Phone', client.phone || '']);
    rows.push([]);
    rows.push(['GUEST COUNTS']);
    rows.push(['Total Invited', guests.length]);
    rows.push(['Confirmed',     confirmed]);
    rows.push(['Declined',      guests.filter(g => g.rsvp === 'No').length]);
    rows.push(['Awaiting',      guests.filter(g => !g.rsvp || g.rsvp === 'Maybe' || g.rsvp === '').length]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // ── Run of Show ────────────────────────────────────────────────────────────
  if (sections.ros && ros.length > 0) {
    const sorted = [...ros].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const ws = XLSX.utils.json_to_sheet(sorted.map(r => ({
      'Time':      r.time      || '',
      'Segment':   r.segment   || '',
      'Location':  r.location  || '',
      'Owner':     r.owner     || '',
      'Confirmed': r.confirmed ? 'Yes' : '',
      'Notes':     r.notes     || '',
    })));
    ws['!cols'] = [{ wch: 8 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Run of Show');
  }

  // ── Vendors (contracted only, no payment internals) ─────────────────────────
  if (sections.vendors) {
    const contracted = vendors.filter(v => ['Contracted', 'Deposit Paid', 'Confirmed'].includes(v.status));
    const ws = XLSX.utils.json_to_sheet(
      contracted.length
        ? contracted.map(v => ({
            'Vendor':    v.name     || '',
            'Category':  v.category || '',
            'Status':    v.status   || '',
            'Phone':     v.phone    || '',
            'Email':     v.contact  || '',
            'Website':   v.website  || '',
            'Arrival':   v.arrivalTime || '',
            'Notes':     v.notes    || '',
          }))
        : [{ 'Vendor': '(no confirmed vendors yet)' }]
    );
    ws['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 26 }, { wch: 12 }, { wch: 42 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
  }

  // ── Guest list ─────────────────────────────────────────────────────────────
  if (sections.guests) {
    const ws = XLSX.utils.json_to_sheet(
      guests.length
        ? guests.map(g => ({
            'Name':       g.name    || '',
            'Group':      g.group   || '',
            'RSVP':       g.rsvp    || '',
            'Meal':       g.meal    || '',
            'Table':      g.table   || '',
            'Plus One':   g.plusOne || '',
            'Kids':       g.kids    || 0,
            'Needs':      g.needs   || '',
            'Email':      g.email   || '',
            'Phone':      g.phone   || '',
          }))
        : [{ 'Name': '(no guests yet)' }]
    );
    ws['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 7 }, { wch: 20 }, { wch: 5 }, { wch: 24 }, { wch: 26 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Guest List');
  }

  // ── Budget summary ─────────────────────────────────────────────────────────
  if (sections.budget && budget.length > 0) {
    const totalBudgeted = budget.reduce((s, r) => s + (r.budgeted || 0), 0);
    const totalSpent    = budget.reduce((s, r) => s + (r.actual   || 0), 0);
    const getPkgComm    = (cat) => vendors.filter(v => (v.budgetCategory || v.category) === cat && STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0);
    const totalComm     = budget.reduce((s, r) => s + getPkgComm(r.category), 0);
    const rows = budget.map(r => {
      const comm = getPkgComm(r.category);
      return {
        'Category':    r.category || '',
        'Budgeted':    r.budgeted || 0,
        'Committed':   comm,
        'Uncontracted': Math.max(0, (r.budgeted || 0) - comm),
        'Spent':       r.actual   || 0,
        'Balance Due': Math.max(0, comm - (r.actual || 0)),
      };
    });
    rows.push({ 'Category': 'TOTAL', 'Budgeted': totalBudgeted, 'Committed': totalComm, 'Uncontracted': Math.max(0, totalBudgeted - totalComm), 'Spent': totalSpent, 'Balance Due': Math.max(0, totalComm - totalSpent) });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 11 }, { wch: 11 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Budget');
  }

  const safeName = (event.name || 'Event').replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `${safeName}_ClientPackage.xlsx`);
}

function SendToClientModal({ event, client, profile, onClose }) {
  const C = useT();
  const s = makeS(C);
  const [sections,  setSections]  = useState({ summary: true, ros: true, vendors: true, guests: true, budget: false });
  const [copied,    setCopied]    = useState(false);
  const [step,      setStep]      = useState('compose'); // 'compose' | 'sent'
  const [sentMethod, setSentMethod] = useState('');

  const toggle = (id) => setSections(prev => ({ ...prev, [id]: !prev[id] }));
  const anyOn  = Object.values(sections).some(Boolean);

  const textSummary = buildClientText(event, client, sections);

  const handleCopy = () => {
    navigator.clipboard.writeText(textSummary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Your Event Summary — ${event.name || 'Upcoming Event'}`);
    const body    = encodeURIComponent(textSummary);
    const to      = client?.email ? encodeURIComponent(client.email) : '';
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self');
    setSentMethod('email'); setStep('sent');
  };

  const handleDownload = () => {
    exportClientPackage(event, client, sections);
    setSentMethod('download'); setStep('sent');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const letterhead = brandLetterheadHTML(profile);
    const payFooter  = brandPaymentFooterHTML(profile);
    win.document.write(`<!DOCTYPE html><html><head><title>${event.name || 'Event'} — Client Package</title>
      <style>body{font-family:-apple-system,system-ui,Arial,sans-serif;padding:40px 44px;color:#18181c}pre{white-space:pre-wrap;font-family:'SF Mono',Menlo,monospace;font-size:12.5px;line-height:1.65;margin:0}@media print{body{padding:0}@page{margin:0.6in}}</style>
      </head><body>${letterhead}<pre>${textSummary.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>${payFooter}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
    win.focus();
    setSentMethod('print'); setStep('sent');
  };

  const deliveryBtns = [
    {
      id: 'download', label: '📄 Download XLSX', sub: 'Multi-tab spreadsheet', variant: 'primary',
      action: handleDownload,
    },
    {
      id: 'email',    label: '✉️ Email to Client', sub: client?.email ? client.email : 'No email on file', variant: 'ghost',
      action: handleEmail, disabled: !client?.email,
    },
    {
      id: 'copy',    label: copied ? '✅ Copied!' : '📋 Copy Text', sub: 'Paste into any message', variant: 'ghost',
      action: handleCopy,
    },
    {
      id: 'print',   label: '🖨 Print / PDF', sub: 'Open print dialog', variant: 'ghost',
      action: handlePrint,
    },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.28)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>📦 Send to Client</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{event.name || 'Event'}{client?.name ? ` · ${client.name}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {step === 'compose' ? (
          <div style={{ padding: '20px 24px 24px' }}>
            {/* Section toggles */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>What to include</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {CLIENT_PKG_SECTIONS.map(({ id, label, icon }) => {
                const on = sections[id];
                return (
                  <button key={id} onClick={() => toggle(id)}
                    style={{
                      padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                      border: `1.5px solid ${on ? C.accent : C.border}`,
                      background: on ? C.accent + '18' : 'transparent',
                      color: on ? C.accent : C.muted,
                      transition: 'all 0.15s',
                    }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>

            {/* Delivery methods */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>How to deliver</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {deliveryBtns.map(({ id, label, sub, action, disabled }) => (
                <button key={id} onClick={action} disabled={disabled || !anyOn}
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`,
                    background: C.surfaceAlt || (C.surface === '#ffffff' ? '#f5f5f7' : '#1c1c1e'),
                    cursor: disabled || !anyOn ? 'not-allowed' : 'pointer',
                    opacity: disabled || !anyOn ? 0.45 : 1,
                    textAlign: 'left', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!disabled && anyOn) e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
                </button>
              ))}
            </div>

            {!anyOn && (
              <div style={{ fontSize: 12, color: C.warn, marginTop: 14, textAlign: 'center' }}>Select at least one section to deliver</div>
            )}

            {/* Guest list template download — always available */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>For Your Client to Fill In</div>
              <button
                onClick={() => downloadGuestTemplate(event?.name)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent2; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <span style={{ fontSize: 22 }}>📋</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>Guest List Template</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Blank spreadsheet your client fills in — Name, RSVP, Meal, Table, Dietary Needs</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Sent confirmation */
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {sentMethod === 'download' ? '📄' : sentMethod === 'email' ? '✉️' : sentMethod === 'print' ? '🖨' : '📋'}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>
              {sentMethod === 'download' ? 'Package downloaded!' : sentMethod === 'email' ? 'Email client opened' : sentMethod === 'print' ? 'Print dialog opened' : 'Copied to clipboard!'}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
              {sentMethod === 'download' ? `${event.name || 'Event'}_ClientPackage.xlsx` : sentMethod === 'email' ? 'Your email client should have opened with the summary pre-filled.' : sentMethod === 'print' ? 'Print or save as PDF from the dialog.' : 'Paste it into any message or document.'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setStep('compose')} style={s.btn('ghost')}>Send another way</button>
              <button onClick={onClose} style={s.btn('primary')}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Google Sheets Export ─────────────────────────────────────────────────────

function exportEventToSheets(event, client) {
  const wb = XLSX.utils.book_new();

  // ── Overview ──────────────────────────────────────────────────────────────
  const guests      = event.guests   || [];
  const vendors     = event.vendors  || [];
  const budget      = event.budget   || [];
  const timeline    = event.timeline || [];
  const ros         = event.ros      || [];

  const confirmed   = guests.filter(g => g.rsvp === 'Yes').length;
  const declined    = guests.filter(g => g.rsvp === 'No').length;
  const awaiting    = guests.filter(g => !g.rsvp || g.rsvp === 'Maybe' || g.rsvp === '').length;
  const totalBudget = budget.reduce((s, r) => s + (r.budgeted || 0), 0);
  const totalSpent  = budget.reduce((s, r) => s + (r.actual   || 0), 0);
  const tasksDone   = timeline.filter(t => t.done).length;
  const vConf       = vendors.filter(v => v.status === 'Confirmed').length;

  const wsOverview = XLSX.utils.aoa_to_sheet([
    ['NGW Event Boss — Event Export'],
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['EVENT DETAILS'],
    ['Name',    event.name  || ''],
    ['Type',    event.type  || ''],
    ['Date',    event.date  ? new Date(event.date + 'T00:00:00').toLocaleDateString() : ''],
    ['Venue',   event.venue || ''],
    [],
    ['CLIENT'],
    ['Name',    client?.name  || ''],
    ['Email',   client?.email || ''],
    ['Phone',   client?.phone || ''],
    [],
    ['GUESTS'],
    ['Total Invited', guests.length],
    ['Confirmed',     confirmed],
    ['Declined',      declined],
    ['Awaiting',      awaiting],
    [],
    ['BUDGET'],
    ['Total Budgeted',    totalBudget],
    ['Total Committed',   vendors.filter(v => STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0)],
    ['Total Spent',       totalSpent],
    ['Balance Due',       Math.max(0, vendors.filter(v => STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0) - totalSpent)],
    [],
    ['PLANNING'],
    ['Tasks Complete',    `${tasksDone} / ${timeline.length}`],
    ['Vendors Confirmed', `${vConf} / ${vendors.length}`],
  ]);
  wsOverview['!cols'] = [{ wch: 22 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

  // ── Guests ────────────────────────────────────────────────────────────────
  const guestRows = guests.length
    ? guests.map(g => ({
        'Name':           g.name          || '',
        'Group':          g.group         || '',
        'RSVP':           g.rsvp          || '',
        'Meal':           g.meal          || '',
        'Table':          g.table         || '',
        'Plus One':       g.plusOne       || '',
        'Plus One Meal':  g.plusOneMeal   || '',
        'Kids':           g.kids          || 0,
        'Special Needs':  g.needs         || '',
        'Email':          g.email         || '',
        'Phone':          g.phone         || '',
        'Address':        g.address       || '',
        'Gift Received':  g.giftReceived  ? 'Yes' : 'No',
        'Thank You Sent': g.thankYouSent  ? 'Yes' : 'No',
        'Notes':          g.partyNotes    || '',
      }))
    : [{ 'Name': '(no guests yet)' }];
  const wsGuests = XLSX.utils.json_to_sheet(guestRows);
  wsGuests['!cols'] = [
    { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 7 },
    { wch: 20 }, { wch: 14 }, { wch: 5  }, { wch: 22 }, { wch: 26 },
    { wch: 14 }, { wch: 28 }, { wch: 13 }, { wch: 14 }, { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGuests, 'Guests');

  // ── Seating ───────────────────────────────────────────────────────────────
  const seatingRows = guests
    .filter(g => g.table)
    .sort((a, b) => (Number(a.table) || 0) - (Number(b.table) || 0));
  const wsSeating = XLSX.utils.json_to_sheet(
    seatingRows.length
      ? seatingRows.map(g => ({
          'Table':  g.table  || '',
          'Name':   g.name   || '',
          'RSVP':   g.rsvp   || '',
          'Meal':   g.meal   || '',
          'Group':  g.group  || '',
        }))
      : [{ 'Table': '(no seating assigned yet)' }]
  );
  wsSeating['!cols'] = [{ wch: 7 }, { wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSeating, 'Seating');

  // ── Vendors ───────────────────────────────────────────────────────────────
  const vendorRows = vendors.length
    ? vendors.map(v => ({
        'Name':            v.name          || '',
        'Category':        v.category      || '',
        'Status':          v.status        || '',
        'Contract Signed': v.contractSigned ? 'Yes' : 'No',
        'Total Cost':      v.cost          || 0,
        'Deposit Paid':    v.depositAmt    || 0,
        'Balance Due':     (v.cost || 0) - (v.depositAmt || 0),
        'Payment Due':     v.payDueDate    || '',
        'Balance Paid':    v.balancePaid   ? 'Yes' : 'No',
        'Phone':           v.phone         || '',
        'Email':           v.email         || '',
        'Website':         v.website       || '',
        'Fax':             v.fax           || '',
        'Last Note':       (v.log && v.log.length > 0) ? (v.log[v.log.length - 1].text || '') : '',
      }))
    : [{ 'Name': '(no vendors yet)' }];
  const wsVendors = XLSX.utils.json_to_sheet(vendorRows);
  wsVendors['!cols'] = [
    { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 11 },
    { wch: 13 }, { wch: 11 }, { wch: 13 }, { wch: 12 }, { wch: 16 },
    { wch: 26 }, { wch: 26 }, { wch: 14 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsVendors, 'Vendors');

  // ── Budget ────────────────────────────────────────────────────────────────
  const getExpCommitted = (cat) => vendors.filter(v => (v.budgetCategory || v.category) === cat && STAGES.indexOf(v.status) >= 2).reduce((s, v) => s + (v.cost || 0), 0);
  const budgetRows = budget.length
    ? budget.map(r => {
        const comm = getExpCommitted(r.category);
        return {
          'Category':    r.category || '',
          'Budgeted':    r.budgeted || 0,
          'Committed':   comm,
          'Uncontracted': Math.max(0, (r.budgeted || 0) - comm),
          'Spent':       r.actual   || 0,
          'Balance Due': Math.max(0, comm - (r.actual || 0)),
          'Notes':       r.notes    || '',
        };
      })
    : [{ 'Category': '(no budget items yet)' }];
  const wsBudget = XLSX.utils.json_to_sheet(budgetRows);
  wsBudget['!cols'] = [{ wch: 18 }, { wch: 11 }, { wch: 11 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsBudget, 'Budget');

  // ── Run of Show ───────────────────────────────────────────────────────────
  const rosRows = ros.length
    ? [...ros]
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        .map(r => ({
          'Time':      r.time      || '',
          'Segment':   r.segment   || '',
          'Location':  r.location  || '',
          'Type':      r.type      || '',
          'Owner':     r.owner     || '',
          'Confirmed': r.confirmed ? 'Yes' : 'No',
          'Notes':     r.notes     || '',
        }))
    : [{ 'Time': '(no run of show entries yet)' }];
  const wsROS = XLSX.utils.json_to_sheet(rosRows);
  wsROS['!cols'] = [
    { wch: 7 }, { wch: 32 }, { wch: 18 }, { wch: 10 },
    { wch: 18 }, { wch: 10 }, { wch: 42 },
  ];
  XLSX.utils.book_append_sheet(wb, wsROS, 'Run of Show');

  // ── Planning Tasks ────────────────────────────────────────────────────────
  const taskRows = timeline.length
    ? timeline.map(t => ({
        'Phase':  t.week  || '',
        'Task':   t.task  || '',
        'Owner':  t.owner || '',
        'Done':   t.done  ? '✓' : '',
        'Notes':  t.notes || '',
      }))
    : [{ 'Phase': '(no tasks yet)' }];
  const wsTasks = XLSX.utils.json_to_sheet(taskRows);
  wsTasks['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 14 }, { wch: 6 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Planning Tasks');

  // ── Download ──────────────────────────────────────────────────────────────
  const safeName = (event.name || 'Event').replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `${safeName}_EventBoss.xlsx`);
}

// ─── Board Meeting Agenda Builder ─────────────────────────────────────────────

const AGENDA_ITEM_TYPES = [
  { id: 'call-to-order', label: 'Call to Order', icon: '🔔' },
  { id: 'information',   label: 'Information',   icon: '📋' },
  { id: 'discussion',    label: 'Discussion',    icon: '💬' },
  { id: 'vote',          label: 'Vote / Motion', icon: '🗳' },
  { id: 'break',         label: 'Break',         icon: '☕' },
  { id: 'adjourn',       label: 'Adjourn',       icon: '🔚' },
];
const VOTE_OUTCOMES = ['Passed', 'Failed', 'Tabled', 'Withdrawn', 'No vote taken'];

function minToTime12(m) {
  if (m === null || m === undefined) return '';
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

function calcAgendaTimes(items, startMin) {
  let cur = startMin ?? 540; // default 9:00 AM
  return items.map(item => { const t = cur; cur += (item.duration || 0); return t; });
}

function AgendaBuilder({ agenda = [], setAgenda, meetingStart, setMeetingStart, eventName, eventDate }) {
  const C = useT();
  const s = makeS(C);
  const [mode,       setMode]       = useState('build');
  const [expandedId, setExpandedId] = useState(null);

  const startMin   = parseMin(meetingStart) ?? 540;
  const times      = calcAgendaTimes(agenda, startMin);
  const totalMin   = agenda.reduce((sum, it) => sum + (it.duration || 0), 0);

  const makeItem = (overrides = {}) => ({
    id: uid(), title: '', presenter: '', duration: 15, type: 'discussion',
    notes: '', motion: '', seconder: '', voteYes: '', voteNo: '', voteAbstain: '', voteOutcome: '',
    ...overrides,
  });

  const addItem = () => { const it = makeItem(); setAgenda(a => [...a, it]); setExpandedId(it.id); };
  const updateItem = (id, key, val) => setAgenda(a => a.map(it => it.id === id ? { ...it, [key]: val } : it));
  const deleteItem = (id) => { setAgenda(a => a.filter(it => it.id !== id)); if (expandedId === id) setExpandedId(null); };
  const moveItem   = (id, dir) => setAgenda(a => {
    const idx = a.findIndex(it => it.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === a.length - 1)) return a;
    const next = [...a]; [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]; return next;
  });

  const addDefaultAgenda = () => setAgenda([
    makeItem({ title: 'Call to Order',                        type: 'call-to-order', duration: 5  }),
    makeItem({ title: 'Approval of Prior Meeting Minutes',    type: 'vote',          duration: 10 }),
    makeItem({ title: 'Financial Report',                     type: 'information',   duration: 15 }),
    makeItem({ title: 'Executive Director Report',            type: 'information',   duration: 20 }),
    makeItem({ title: 'Old Business',                         type: 'discussion',    duration: 20 }),
    makeItem({ title: 'New Business',                         type: 'discussion',    duration: 20 }),
    makeItem({ title: 'Action Items Review',                  type: 'information',   duration: 10 }),
    makeItem({ title: 'Adjourn',                              type: 'adjourn',       duration: 5  }),
  ]);

  const printDoc = (asMinutes) => {
    const lines = asMinutes ? [
      'MEETING MINUTES',
      eventName || 'Board Meeting',
      eventDate ? fmtDate(eventDate) : '',
      meetingStart ? `Called to order: ${minToTime12(startMin)}` : '',
      '',
      '─'.repeat(52),
      '',
      ...agenda.flatMap((item, i) => {
        const td = AGENDA_ITEM_TYPES.find(x => x.id === item.type) || AGENDA_ITEM_TYPES[2];
        const rows = [`${minToTime12(times[i])}  ${item.title || '(Untitled)'}  [${td.label}]`];
        if (item.presenter) rows.push(`  Moved/Presented by: ${item.presenter}`);
        if (item.notes)     rows.push(`  Notes: ${item.notes}`);
        if (item.type === 'vote') {
          if (item.motion)  rows.push(`  Motion: ${item.motion}`);
          if (item.seconder) rows.push(`  Seconded by: ${item.seconder}`);
          if (item.voteYes || item.voteNo || item.voteAbstain)
            rows.push(`  Vote: ${item.voteYes || 0} yes  /  ${item.voteNo || 0} no  /  ${item.voteAbstain || 0} abstain`);
          if (item.voteOutcome) rows.push(`  Outcome: ${item.voteOutcome}`);
        }
        rows.push('');
        return rows;
      }),
      '─'.repeat(52),
      '',
      'Minutes recorded by: ___________________________',
      'Date approved:       ___________________________',
    ] : [
      'BOARD MEETING AGENDA',
      eventName || 'Board Meeting',
      eventDate ? fmtDate(eventDate) : '',
      meetingStart ? `Start: ${minToTime12(startMin)}` : '',
      '',
      '─'.repeat(52),
      '',
      ...agenda.map((item, i) => {
        const td = AGENDA_ITEM_TYPES.find(x => x.id === item.type) || AGENDA_ITEM_TYPES[2];
        return `${minToTime12(times[i]).padEnd(10)} ${td.icon} ${item.title || '(Untitled)'}${item.presenter ? `  — ${item.presenter}` : ''}  (${item.duration || 0} min)`;
      }),
      '',
      '─'.repeat(52),
      `Total time: ${fmtDur(totalMin)}   Estimated end: ${minToTime12(startMin + totalMin)}`,
    ];
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><body><pre style="font-family:'Courier New',monospace;padding:40px;font-size:13px;line-height:1.7">${lines.join('\n')}</pre><script>window.print();window.close();\x3c/script></body></html>`);
    win.document.close();
  };

  if (!agenda.length) return (
    <div style={{ ...s.card, textAlign: 'center', padding: '48px 32px' }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No agenda built yet</div>
      <div style={{ fontSize: 13, color: C.muted, maxWidth: 360, margin: '0 auto 24px' }}>
        Start from the standard board meeting template or add items one by one.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={s.btn('primary')} onClick={addDefaultAgenda}>Use Standard Template</button>
        <button style={s.btn()} onClick={addItem}>+ Add First Item</button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {[['build', '📋 Agenda'], ['minutes', '✍️ Minutes']].map(([id, lbl]) => (
            <button key={id} onClick={() => setMode(id)} style={{
              padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: mode === id ? C.accent : 'transparent',
              color: mode === id ? '#fff' : C.muted, transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>Start:</span>
          <input type="time" style={{ ...s.input, width: 108, fontSize: 13 }}
            value={meetingStart || '09:00'} onChange={e => setMeetingStart(e.target.value)} />
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>
          {agenda.length} item{agenda.length !== 1 ? 's' : ''} · <strong style={{ color: C.text }}>{fmtDur(totalMin)}</strong> · ends {minToTime12(startMin + totalMin)}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={s.btn()} onClick={() => printDoc(mode === 'minutes')}>
            🖨 Print {mode === 'minutes' ? 'Minutes' : 'Agenda'}
          </button>
          <button style={s.btn('primary')} onClick={addItem}>+ Add Item</button>
        </div>
      </div>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {agenda.map((item, i) => {
          const td = AGENDA_ITEM_TYPES.find(x => x.id === item.type) || AGENDA_ITEM_TYPES[2];
          const isExpanded = expandedId === item.id;
          const isVote     = item.type === 'vote';

          return (
            <div key={item.id} style={{ background: C.surface, border: `1px solid ${isExpanded ? C.accent + '55' : C.border}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, minWidth: 60, flexShrink: 0 }}>
                  {minToTime12(times[i])}
                </div>
                <span style={{ fontSize: 15, flexShrink: 0 }} title={td.label}>{td.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {mode === 'build' ? (
                    <input
                      style={{ ...s.input, background: 'transparent', border: 'none', padding: 0, fontSize: 13, fontWeight: 500, width: '100%' }}
                      value={item.title}
                      placeholder="Agenda item…"
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateItem(item.id, 'title', e.target.value)}
                    />
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: item.title ? C.text : C.muted, fontStyle: item.title ? 'normal' : 'italic' }}>
                      {item.title || 'Untitled item'}
                      {item.presenter && <span style={{ fontWeight: 400, color: C.muted, marginLeft: 8 }}>— {item.presenter}</span>}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.duration || 0} min</div>
                {/* Vote outcome pill */}
                {isVote && item.voteOutcome && (
                  <span style={{ ...s.pill(item.voteOutcome === 'Passed' ? C.success : item.voteOutcome === 'Failed' ? C.danger : C.warn), fontSize: 10 }}>
                    {item.voteOutcome}
                  </span>
                )}
                <div style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{isExpanded ? '▾' : '▸'}</div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px', background: C.bg + '99' }}>
                  {mode === 'build' ? (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 150px' }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Type</div>
                        <select style={{ ...s.input, fontSize: 12 }} value={item.type}
                          onChange={e => updateItem(item.id, 'type', e.target.value)}>
                          {AGENDA_ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '2 1 180px' }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Presenter / Lead</div>
                        <input style={{ ...s.input, fontSize: 12 }} value={item.presenter}
                          placeholder="Name or role…" onChange={e => updateItem(item.id, 'presenter', e.target.value)} />
                      </div>
                      <div style={{ flex: '0 0 100px' }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Duration (min)</div>
                        <input type="number" min="1" max="240" style={{ ...s.input, fontSize: 12 }} value={item.duration || ''}
                          placeholder="15" onChange={e => updateItem(item.id, 'duration', Math.max(1, parseInt(e.target.value) || 1))} />
                      </div>
                      <div style={{ flex: '1 1 100%' }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Notes / description</div>
                        <textarea style={{ ...s.input, fontSize: 12, resize: 'vertical', minHeight: 56, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}
                          value={item.notes || ''} placeholder="Background, materials needed, reference documents…"
                          onChange={e => updateItem(item.id, 'notes', e.target.value)} />
                      </div>
                      <div style={{ flex: '1 1 100%', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button style={{ ...s.btn(), opacity: i === 0 ? 0.35 : 1 }} disabled={i === 0} onClick={() => moveItem(item.id, -1)} title="Move up">↑ Up</button>
                        <button style={{ ...s.btn(), opacity: i === agenda.length - 1 ? 0.35 : 1 }} disabled={i === agenda.length - 1} onClick={() => moveItem(item.id, 1)} title="Move down">↓ Down</button>
                        <div style={{ flex: 1 }} />
                        <button style={s.btn('danger')} onClick={() => deleteItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    /* Minutes mode */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {isVote && (
                        <div style={{ background: C.accent + '0c', border: `1px solid ${C.accent}33`, borderRadius: 8, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>🗳 Vote Record</div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 100%' }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Motion text</div>
                              <input style={{ ...s.input, fontSize: 12 }} value={item.motion || ''}
                                placeholder="RESOLVED, that…" onChange={e => updateItem(item.id, 'motion', e.target.value)} />
                            </div>
                            <div style={{ flex: '1 1 150px' }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Moved by</div>
                              <input style={{ ...s.input, fontSize: 12 }} value={item.presenter || ''}
                                placeholder="Name…" onChange={e => updateItem(item.id, 'presenter', e.target.value)} />
                            </div>
                            <div style={{ flex: '1 1 150px' }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Seconded by</div>
                              <input style={{ ...s.input, fontSize: 12 }} value={item.seconder || ''}
                                placeholder="Name…" onChange={e => updateItem(item.id, 'seconder', e.target.value)} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            {[['voteYes', '✓ Yes', C.success], ['voteNo', '✗ No', C.danger], ['voteAbstain', '— Abstain', C.muted]].map(([field, label, clr]) => (
                              <div key={field} style={{ flex: '1 1 72px' }}>
                                <div style={{ fontSize: 11, color: clr, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                                <input type="number" min="0" style={{ ...s.input, fontSize: 18, fontWeight: 800, textAlign: 'center', padding: '6px 8px' }}
                                  value={item[field] || ''} placeholder="0" onChange={e => updateItem(item.id, field, e.target.value)} />
                              </div>
                            ))}
                            <div style={{ flex: '1 1 120px' }}>
                              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Outcome</div>
                              <select style={{ ...s.input, fontSize: 12 }} value={item.voteOutcome || ''}
                                onChange={e => updateItem(item.id, 'voteOutcome', e.target.value)}>
                                <option value="">Select…</option>
                                {VOTE_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Discussion Notes</div>
                        <textarea
                          style={{ ...s.input, fontSize: 12, resize: 'vertical', minHeight: 80, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6 }}
                          value={item.notes || ''}
                          placeholder="Key discussion points, decisions made, action items assigned…"
                          onChange={e => updateItem(item.id, 'notes', e.target.value)}
                        />
                      </div>
                      {isVote && item.voteOutcome && (
                        <span style={{ ...s.pill(item.voteOutcome === 'Passed' ? C.success : item.voteOutcome === 'Failed' ? C.danger : C.warn), fontSize: 12, padding: '4px 12px' }}>
                          {item.voteOutcome} — {item.voteYes || 0}y / {item.voteNo || 0}n / {item.voteAbstain || 0}a
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button style={{ ...s.btn(), width: '100%', marginTop: 10, padding: '12px', fontSize: 13, color: C.muted, border: `1px dashed ${C.border}`, borderRadius: 10, background: 'transparent' }} onClick={addItem}>
        + Add Agenda Item
      </button>
    </div>
  );
}

// ─── Event Planner ────────────────────────────────────────────────────────────

const PLANNER_TABS = ['Overview', 'Budget', 'Guests', 'Seating', 'Vendors', 'Planning Tasks', 'Calendar', 'Run of Show'];

function EventPlanner({ event, setEvent, client, setClient, allEvents = [], onBack, onOpenClient, backLabel, initialNav, profile, onDelete, onDuplicate, clients = [], onLinkClient, onUnlinkClient }) {
  const C      = useT();
  const s      = makeS(C);
  const evtCLR = EVT_CLR(C);
  const bp  = useContext(BpCtx);
  const [tab,             setTab]            = useState(initialNav?.tab || 'Overview');
  const [showConsult,     setShowConsult]    = useState(false);
  const [exporting,       setExporting]      = useState(false);
  const [showSendClient,  setShowSendClient] = useState(false);
  const [showPortal,      setShowPortal]     = useState(false);
  const [openVendorId,    setOpenVendorId]   = useState(initialNav?.vendorId || null);
  const [openTaskId,      setOpenTaskId]     = useState(initialNav?.taskId || null);
  const [confirmEvtDel,   setConfirmEvtDel]  = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientPickVal,   setClientPickVal]  = useState('');

  const handleTabChange = (newTab, itemId) => {
    setOpenVendorId(newTab === 'Vendors'        ? (itemId || null) : null);
    setOpenTaskId(newTab   === 'Planning Tasks' ? (itemId || null) : null);
    setTab(newTab);
  };

  const wrap = (field) => (fn) =>
    setEvent(e => ({ ...e, [field]: typeof fn === 'function' ? fn(e[field]) : fn }));

  const days  = daysUntil(event.date);
  const color = evtCLR[event.type] || C.muted;

  // Sidebar badge counts — shown next to each tab name
  const guestCount   = (event.guests   || []).length;
  const confirmedG   = (event.guests   || []).filter(g => g.rsvp === 'Yes').length;
  const vendorCount  = (event.vendors  || []).length;
  const taskDone     = (event.timeline || []).filter(t => t.done).length;
  const taskTotal    = (event.timeline || []).length;
  const rosCount     = (event.ros      || []).length;
  const overdueCount = (event.timeline || []).filter(t => !t.done && isTaskOverdue(t, event.date)).length;
  const agendaCount  = (event.agenda   || []).length;
  const tabBadge = {
    'Guests':         guestCount > 0   ? String(guestCount)                                      : null,
    'Vendors':        vendorCount > 0  ? String(vendorCount)                                     : null,
    'Planning Tasks': taskTotal > 0    ? `${taskDone}/${taskTotal}${overdueCount > 0 ? ' ⚠' : ''}` : null,
    'Run of Show':    rosCount > 0     ? String(rosCount)                                        : null,
    'Seating':        confirmedG > 0   ? `${confirmedG} conf`                                    : null,
    'Agenda':         agendaCount > 0  ? String(agendaCount)                                     : null,
  };

  // Board Meeting gets an extra Agenda tab
  const plannerTabs = event.type === 'Board Meeting'
    ? ['Overview', 'Agenda', 'Budget', 'Guests', 'Vendors', 'Planning Tasks', 'Calendar', 'Run of Show']
    : PLANNER_TABS;

  // Keyboard shortcut: Cmd/Ctrl+1–8 to switch tabs
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= plannerTabs.length) {
        e.preventDefault();
        handleTabChange(plannerTabs[num - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [plannerTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMobile     = bp === 'mobile';
  const isSidebarNav = bp === 'tablet-land' || bp === 'desktop';

  // Event-color-aware tab styles — highlight uses event type color instead of global accent
  const evtSideTab = (active) => ({
    display: 'block', width: '100%', padding: '10px 16px', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, textAlign: 'left',
    background: active ? color + '1a' : 'transparent',
    color: active ? color : C.muted,
    borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  });
  const evtTab = (active) => ({
    padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    borderRadius: '8px 8px 0 0', border: 'none',
    background: active ? C.surface : 'transparent',
    color: active ? color : C.muted,
    borderTop: active ? `2px solid ${color}` : '2px solid transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  });

  const hPad = isMobile ? '14px 14px 0' : bp === 'tablet' ? '18px 20px 0' : '24px 28px 0';
  const bPad = isMobile ? '14px 14px'   : bp === 'tablet' ? '18px 20px'   : '24px 28px';

  const tabContent = (
    <ErrorBoundary>
      {tab === 'Overview'    && (
        <Overview
          budget={event.budget} guests={event.guests} vendors={event.vendors} timeline={event.timeline}
          catererCount={event.catererCount}
          onCatererUpdate={(n) => setEvent(e => ({ ...e, catererCount: n }))}
          onUpdateVendorLog={(vid, text) => setEvent(e => ({ ...e, vendors: e.vendors.map(v => v.id === vid ? { ...v, log: [...(v.log||[]), { id: uid(), date: today8601(), text }] } : v) }))}
          onTabChange={handleTabChange}
          setTimeline={wrap('timeline')}
          eventDate={event.date}
          eventType={event.type}
          onOpenConsult={() => setShowConsult(true)}
          guestEstimate={event.guestEstimate}
          intakeSavedAt={event.intake?.savedAt}
          client={client}
          onOpenComms={client ? (onOpenClient || (() => setShowPortal(true))) : undefined}
        />
      )}
      {tab === 'Budget'      && <Budget    budget={event.budget}     setBudget={wrap('budget')}     vendors={event.vendors} client={client} setClient={setClient} eventType={event.type} confirmedCount={(event.guests||[]).filter(g=>g.rsvp==='Yes').length} profile={profile} />}
      {tab === 'Guests'      && <Guests    guests={event.guests}     setGuests={wrap('guests')} event={event} />}
      {tab === 'Seating'     && <Seating   guests={event.guests}     setGuests={wrap('guests')} tables={event.tables || 5} onTablesChange={(n) => setEvent(e => ({ ...e, tables: n }))} tableNames={event.tableNames || []} onTableNamesChange={(names) => setEvent(e => ({ ...e, tableNames: names }))} />}
      {tab === 'Vendors'        && <Vendors   vendors={event.vendors}   setVendors={wrap('vendors')} budget={event.budget} openId={openVendorId} event={event} ros={event.ros} profile={profile} allEvents={allEvents} />}
      {tab === 'Planning Tasks' && <Timeline  timeline={event.timeline} setTimeline={wrap('timeline')} eventDate={event.date} openId={openTaskId} eventType={event.type} />}
      {tab === 'Calendar'    && <CalendarView timeline={event.timeline} vendors={event.vendors} eventDate={event.date} ros={event.ros} onTabChange={setTab} />}
      {tab === 'Run of Show' && <RunOfShow ros={event.ros}           setRos={wrap('ros')} vendors={event.vendors} eventName={event.name} eventDate={event.date} eventVenue={event.venue} />}
      {tab === 'Agenda'      && <AgendaBuilder
        agenda={event.agenda || []}
        setAgenda={wrap('agenda')}
        meetingStart={event.meetingStart || '09:00'}
        setMeetingStart={(val) => setEvent(e => ({ ...e, meetingStart: val }))}
        eventName={event.name}
        eventDate={event.date}
      />}
    </ErrorBoundary>
  );

  return (
    <div style={s.app}>
      {showConsult && <ConsultScriptModal event={event} setEvent={setEvent} onClose={() => setShowConsult(false)} />}
      {showSendClient && <SendToClientModal event={event} client={client} profile={profile} onClose={() => setShowSendClient(false)} />}
      {showPortal && client && <ClientPortal client={client} events={[event]} onClose={() => setShowPortal(false)} onUpdateGuests={gs => setEvent(ev => ({ ...ev, guests: typeof gs === 'function' ? gs(ev.guests || []) : gs }))} />}

      {/* ── Shared header (event identity strip) ── */}
      <div style={{ padding: hPad, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ ...s.btn('ghost'), fontSize: 12, padding: '4px 10px' }}>{backLabel || '← Clients'}</button>
          <span style={{ color: C.border, fontSize: 18 }}>|</span>
          <input
            style={{ background: 'none', border: 'none', fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.text, letterSpacing: '-0.02em', outline: 'none', padding: 0, minWidth: 0, flex: '0 1 auto', maxWidth: 400, fontFamily: "'Inter', system-ui, sans-serif" }}
            value={event.name}
            onChange={e => setEvent(ev => ({ ...ev, name: e.target.value }))}
          />
          <span style={s.pill(color)}>{event.type}</span>
          {days !== null && event.date && (
            <span style={s.pill(days <= 30 ? C.danger : days <= 90 ? C.warn : color)}>
              {days > 0 ? `${days}d away` : days === 0 ? 'Today!' : `${Math.abs(days)}d ago`}
            </span>
          )}
          {days !== null && days < -7 && (
            <button
              onClick={() => setEvent(e => ({ ...e, archived: !e.archived }))}
              style={{ ...s.btn('ghost'), fontSize: 10, padding: '2px 8px' }}
              title={event.archived ? 'Unarchive event' : 'Archive event'}
            >
              {event.archived ? '↩ Unarchive' : '📦 Archive'}
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ThemeToggle />
            {confirmEvtDel ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: C.muted }}>Delete event?</span>
                <button style={{ ...s.btn('danger'), fontSize: 11, padding: '4px 10px' }} onClick={onDelete}>Yes, delete</button>
                <button style={{ ...s.btn(), fontSize: 11, padding: '4px 10px' }} onClick={() => setConfirmEvtDel(false)}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEvtDel(true)}
                style={{ ...s.btn('danger'), fontSize: 11, padding: '4px 10px' }}
                title="Delete this event"
              >
                🗑 Delete
              </button>
            )}
            <button
              onClick={() => {
                setExporting(true);
                setTimeout(() => {
                  try { exportEventToSheets(event, client); } catch (err) { console.error('Export failed', err); }
                  setExporting(false);
                }, 60);
              }}
              style={{ ...s.btn('ghost'), fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5, opacity: exporting ? 0.6 : 1 }}
              title="Export to Google Sheets (.xlsx)"
              disabled={exporting}
            >
              {exporting ? '⏳ Exporting…' : '📊 Export'}
            </button>
            {client && (
              <button
                onClick={() => setShowPortal(true)}
                style={{ ...s.btn('teal'), fontSize: 11, padding: '4px 10px' }}
                title="Preview what your client sees"
              >
                👁 Client View
              </button>
            )}
            <button
              onClick={() => setShowSendClient(true)}
              style={{ ...s.btn('primary'), fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Package and send event details to client"
            >
              📦 Send to Client
            </button>
            <button
              onClick={onDuplicate}
              style={{ ...s.btn(), fontSize: 11, padding: '4px 10px' }}
              title="Duplicate this event"
            >
              ⎘ Duplicate
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: isSidebarNav ? 0 : 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ background: 'none', border: `1px solid transparent`, borderRadius: 6, fontSize: 12, color: C.muted, padding: '3px 7px', outline: 'none', minWidth: 0, width: Math.max(80, (event.venue || '').length * 7 + 20), transition: 'border-color 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }}
            value={event.venue || ''}
            placeholder="Venue"
            onChange={e => setEvent(ev => ({ ...ev, venue: e.target.value.replace(/(^\w|\s\w)/g, c => c.toUpperCase()) }))}
            onFocus={e => { e.target.style.borderColor = C.border; }}
            onBlur={e => { e.target.style.borderColor = 'transparent'; }}
          />
          <span style={{ color: C.border }}>·</span>
          <input
            type="date"
            style={{ background: 'none', border: `1px solid transparent`, borderRadius: 6, fontSize: 12, color: C.muted, padding: '3px 7px', outline: 'none', transition: 'border-color 0.15s', fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer' }}
            value={event.date || ''}
            onChange={e => setEvent(ev => ({ ...ev, date: e.target.value }))}
            onClick={e => { try { e.target.showPicker(); } catch {} }}
            onFocus={e => { e.target.style.borderColor = C.border; }}
            onBlur={e => { e.target.style.borderColor = 'transparent'; }}
          />
          <span style={{ color: C.border }}>·</span>
          <select
            style={{ background: 'none', border: `1px solid transparent`, borderRadius: 6, fontSize: 12, color: C.muted, padding: '3px 7px', outline: 'none', cursor: 'pointer', transition: 'border-color 0.15s', fontFamily: "'Inter', system-ui, sans-serif" }}
            value={event.type || 'Other'}
            onChange={e => setEvent(ev => ({ ...ev, type: e.target.value }))}
          >
            {EVT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>

          {/* Client link widget */}
          {client ? (
            <>
              <span style={{ color: C.border }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.accent }}>
                👤 {client.name}
                {onUnlinkClient && (
                  <button onClick={() => onUnlinkClient(client.id)} title="Unlink client" style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
                )}
              </span>
            </>
          ) : onLinkClient && clients.length > 0 ? (
            <>
              <span style={{ color: C.border }}>·</span>
              {showClientPicker ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <select autoFocus style={{ ...s.input, fontSize: 12, padding: '3px 8px', height: 'auto', width: 'auto', minWidth: 140 }}
                    value={clientPickVal}
                    onChange={e => setClientPickVal(e.target.value)}
                  >
                    <option value="">Pick a client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button style={{ ...s.btn('primary'), fontSize: 11, padding: '3px 10px' }}
                    onClick={() => { if (clientPickVal) { onLinkClient(clientPickVal); setShowClientPicker(false); setClientPickVal(''); } }}
                  >Link</button>
                  <button style={{ ...s.btn(), fontSize: 11, padding: '3px 8px' }} onClick={() => { setShowClientPicker(false); setClientPickVal(''); }}>✕</button>
                </span>
              ) : (
                <button onClick={() => setShowClientPicker(true)}
                  style={{ background: 'none', border: `1px dashed ${C.border}`, borderRadius: 6, fontSize: 11, color: C.muted, cursor: 'pointer', padding: '3px 9px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                >+ Link Client</button>
              )}
            </>
          ) : null}
        </div>

        {/* Horizontal tabs — mobile + tablet portrait only */}
        {!isSidebarNav && (
          <div style={s.tabs}>
            {plannerTabs.map(t => (
              <button key={t} style={evtTab(tab === t)} onClick={() => handleTabChange(t)}>
                {t}{tabBadge[t] ? ` (${tabBadge[t]})` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {isSidebarNav ? (
        /* ── Sidebar layout for tablet-land + desktop ── */
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 120px)' }}>
          {/* Sidebar nav */}
          <div style={{ width: bp === 'desktop' ? 200 : 180, flexShrink: 0, borderRight: `1px solid ${C.border}`, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {plannerTabs.map(t => (
              <button key={t} style={evtSideTab(tab === t)} onClick={() => handleTabChange(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>{t}</span>
                  {tabBadge[t] && <span style={{ fontSize: 10, fontWeight: 600, color: t === 'Planning Tasks' && overdueCount > 0 ? C.danger : C.muted, background: C.border + '88', borderRadius: 6, padding: '1px 5px', marginLeft: 4, flexShrink: 0 }}>{tabBadge[t]}</span>}
                </div>
              </button>
            ))}
            {bp === 'desktop' && (
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.border}`, marginLeft: 2, marginRight: 2 }}>
                {days !== null && (
                  <div style={{ fontSize: 11, color: days <= 30 ? C.danger : days <= 90 ? C.warn : C.muted, fontWeight: 600, marginBottom: 4 }}>
                    {days > 0 ? `${days} days away` : days === 0 ? 'Today!' : `${Math.abs(days)} days ago`}
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                  {event.guests?.filter(g => g.rsvp === 'Yes').length || 0} confirmed guests
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                  {event.vendors?.filter(v => v.status === 'Confirmed').length || 0} confirmed vendors
                </div>
              </div>
            )}
          </div>
          {/* Content — fills full remaining width, capped on desktop */}
          <div style={{ flex: 1, minWidth: 0, padding: bPad, overflowY: 'auto' }}>
            <div style={{ maxWidth: bp === 'desktop' ? 1060 : 'none', margin: '0 auto' }}>
              {tabContent}
            </div>
          </div>
        </div>
      ) : (
        /* ── Stacked layout for mobile + tablet portrait ── */
        <div style={{ padding: bPad }}>
          {tabContent}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const THEMES = { dark: DARK, light: LIGHT };

export default function App() {
  const bp = useBreakpoint();
  const [themeName, setThemeName] = useState('dark');
  const themeC = THEMES[themeName] || DARK;
  const themeCtxVal = { C: themeC, theme: themeName, setTheme: setThemeName };
  // Keep the page base (body) matching the theme so edges/overscroll never flash white.
  useEffect(() => { document.body.style.background = themeC.bg; }, [themeC.bg]);

  const [events,         setEvents]         = useState(() => {
    try {
      const d = localStorage.getItem('ngw-events');
      if (!d) return SEED_EVENTS;
      const stored = JSON.parse(d);
      const storedIds = new Set(stored.map(e => e.id));
      const missing = SEED_EVENTS.filter(e => !storedIds.has(e.id));
      return missing.length ? [...stored, ...missing] : stored;
    } catch { return SEED_EVENTS; }
  });
  const [clients, setClients] = useState(() => {
    try {
      const d = localStorage.getItem('ngw-clients');
      if (!d) return SEED_CLIENTS;
      const stored = JSON.parse(d);
      const storedIds = new Set(stored.map(c => c.id));
      const missing = SEED_CLIENTS.filter(c => !storedIds.has(c.id));
      return missing.length ? [...stored, ...missing] : stored;
    } catch { return SEED_CLIENTS; }
  });
  const [profile,        setProfile]        = useState(() => {
    try { const d = localStorage.getItem('ngw-profile'); return d ? JSON.parse(d) : { name: '', businessName: '', email: '', phone: '', city: '', website: '', bio: '' }; } catch { return { name: '', businessName: '', email: '', phone: '', city: '', website: '', bio: '' }; }
  });
  const [calNotes, setCalNotes] = useState(() => {
    try { const d = localStorage.getItem('ngw-cal-notes'); return d ? JSON.parse(d) : []; } catch { return []; }
  });
  const addCalNote    = (date, text, kind) => setCalNotes(ns => [...ns, { id: uid(), date, text: text.trim(), kind, done: false }]);
  const toggleCalNote = (id) => setCalNotes(ns => ns.map(n => n.id === id ? { ...n, done: !n.done } : n));
  const deleteCalNote = (id) => setCalNotes(ns => ns.filter(n => n.id !== id));
  const [activeClientId, setActiveClientId] = useState(null);
  const [activeId,       setActiveId]       = useState(null);
  const [initialNav,     setInitialNav]     = useState(null);
  const [showNew,        setShowNew]        = useState(false);
  const [showNewClient,  setShowNewClient]  = useState(false);
  const [showProfile,    setShowProfile]    = useState(false);
  const [toast,          setToast]          = useState(null); // { msg, variant }
  const showToast = (msg, variant = 'success') => setToast({ msg, variant });
  const toastCtxVal = { showToast };

  useEffect(() => { try { localStorage.setItem('ngw-events', JSON.stringify(events)); } catch {} }, [events]);
  useEffect(() => { try { localStorage.setItem('ngw-profile', JSON.stringify(profile)); } catch {} }, [profile]);
  useEffect(() => { try { localStorage.setItem('ngw-clients', JSON.stringify(clients)); } catch {} }, [clients]);
  useEffect(() => { try { localStorage.setItem('ngw-cal-notes', JSON.stringify(calNotes)); } catch {} }, [calNotes]);

  // ── Budget / deposit push notifications ────────────────────────────────────
  // Fires once on mount. Collects all unpaid vendor balances that are overdue
  // or due within 7 days across every event, requests Notification permission,
  // then fires one browser notification per alert (capped at 5 to avoid floods).
  useEffect(() => {
    if (!('Notification' in window)) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const alerts = [];
    events.forEach(ev => {
      (ev.vendors || []).forEach(v => {
        if (!v.payDueDate || v.balancePaid) return;
        const balance = (v.cost || 0) - (v.depositAmt || 0);
        if (balance <= 0) return;
        const due = new Date(v.payDueDate + 'T00:00:00');
        const diffDays = Math.round((due - today) / 86400000);
        if (diffDays <= 7) {
          const urgency = diffDays < 0
            ? `${Math.abs(diffDays)}d overdue`
            : diffDays === 0 ? 'due TODAY' : `due in ${diffDays}d`;
          alerts.push({
            title: `Payment ${urgency} — ${v.name}`,
            body: `${ev.name}: $${balance.toLocaleString()} balance ${urgency}. Open NGW Event Boss to action it.`,
          });
        }
      });
    });
    if (!alerts.length) return;
    const fire = () => {
      alerts.slice(0, 5).forEach(({ title, body }) => {
        try { new Notification(title, { body, icon: '/favicon.ico', tag: title }); } catch {}
      });
    };
    if (Notification.permission === 'granted') {
      fire();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => { if (perm === 'granted') fire(); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const updateProfile = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  const activeEvent  = events.find(e => e.id === activeId);
  const activeClient = clients.find(c => c.id === activeClientId)
    || (activeEvent ? clients.find(c => (c.eventIds || []).includes(activeEvent.id)) : null);

  const setEvent  = (fn) => setEvents(evts => evts.map(e => e.id === activeId          ? (typeof fn === 'function' ? fn(e) : fn) : e));
  const setClient = (fn) => setClients(cs  => cs.map(c  => c.id === activeClient?.id   ? (typeof fn === 'function' ? fn(c) : fn) : c));
  // Update guests for any event (used by ClientPortal so the client can manage the guest list)
  const updateEventGuests = (evId, fn) => setEvents(evts => evts.map(e => e.id === evId ? { ...e, guests: typeof fn === 'function' ? fn(e.guests || []) : fn } : e));

  const createEvent = (ev, explicitClientId) => {
    setEvents(evts => [...evts, ev]);
    const linkId = explicitClientId || activeClientId;
    if (linkId) {
      setClients(cs => cs.map(c => c.id === linkId ? { ...c, eventIds: [...new Set([...(c.eventIds || []), ev.id])] } : c));
      if (!activeClientId) setActiveClientId(linkId);
    }
    setActiveId(ev.id);
  };
  const createClient = (cl, linkedEventId) => {
    setClients(cs => [...cs, cl]);
    setActiveClientId(cl.id);
    // Nothing extra needed — cl.eventIds already has [linkedEventId] if chosen
  };
  const linkClientToEvent = (clientId) => {
    // Add active event to this client's eventIds; set as active client for back-nav
    setClients(cs => cs.map(c => c.id === clientId ? { ...c, eventIds: [...new Set([...(c.eventIds || []), activeId])] } : c));
    setActiveClientId(clientId);
  };
  const unlinkClientFromEvent = (clientId) => {
    setClients(cs => cs.map(c => c.id === clientId ? { ...c, eventIds: (c.eventIds || []).filter(id => id !== activeId) } : c));
    setActiveClientId(null);
  };
  const linkEventToClient = (evId) => {
    setClients(cs => cs.map(c => c.id === activeClientId ? { ...c, eventIds: [...new Set([...(c.eventIds || []), evId])] } : c));
  };
  const deleteClient = ()     => { setClients(cs => cs.filter(c => c.id !== activeClientId)); setActiveClientId(null); };
  const deleteEvent  = ()     => {
    const evId = activeId;
    setEvents(evts => evts.filter(e => e.id !== evId));
    // unlink from any client that referenced this event
    setClients(cs => cs.map(c => ({ ...c, eventIds: (c.eventIds || []).filter(id => id !== evId) })));
    setActiveId(null);
  };

  const providers = (children) => (
    <ThemeCtx.Provider value={themeCtxVal}>
      <ToastCtx.Provider value={toastCtxVal}>
        <AICtx.Provider value={profile?.anthropicKey || ''}>
          <BpCtx.Provider value={bp}>
            <div style={{ color: themeC.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
              <GlobalStyles />
              {children}
              <Toast msg={toast?.msg} variant={toast?.variant} onDone={() => setToast(null)} />
            </div>
          </BpCtx.Provider>
        </AICtx.Provider>
      </ToastCtx.Provider>
    </ThemeCtx.Provider>
  );

  // ── Public RSVP route: ?rsvp=CODE opens the guest form directly ──
  const urlParams  = new URLSearchParams(window.location.search);
  const rsvpCode   = urlParams.get('rsvp');
  const vendorCode = urlParams.get('vendor');

  if (rsvpCode) {
    const rsvpEvent = events.find(e => e.rsvpCode === rsvpCode || e.id === rsvpCode);
    if (rsvpEvent) {
      const handleGuestRsvp = (data) => {
        try {
          const key = `ngw-rsvp-queue-${rsvpEvent.id}`;
          const q = JSON.parse(localStorage.getItem(key) || '[]');
          localStorage.setItem(key, JSON.stringify([...q, { ...data, submittedAt: Date.now() }]));
        } catch {}
      };
      return providers(
        <RSVPFormView event={rsvpEvent} guestMode onSubmit={handleGuestRsvp} onClose={() => {}} />
      );
    }
  }

  // ── Public Vendor Brief route: ?vendor=TOKEN ──
  if (vendorCode) {
    try {
      let brief;
      try { brief = JSON.parse(b64decode(vendorCode)); }
      catch { brief = JSON.parse(atob(vendorCode)); } // fallback for older ASCII-only links
      if (brief && brief.vendorName) return providers(<VendorBriefView brief={brief} />);
    } catch {}
    // Invalid or corrupt token — show friendly error
    return providers(
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Link expired or invalid</div>
          <div style={{ fontSize: 14, color: '#888' }}>This vendor brief link is no longer valid. Ask your event planner to share a fresh link.</div>
        </div>
      </div>
    );
  }

  if (activeEvent) {
    return providers(
      <EventPlanner
        event={activeEvent}
        setEvent={setEvent}
        client={activeClient}
        setClient={setClient}
        allEvents={events}
        onBack={() => { setActiveId(null); setInitialNav(null); }}
        onOpenClient={activeClient ? () => { setActiveId(null); setInitialNav(null); setActiveClientId(activeClient.id); } : undefined}
        backLabel={activeClient ? `← ${activeClient.name}` : '← Dashboard'}
        initialNav={initialNav}
        profile={profile}
        onDelete={deleteEvent}
        clients={clients}
        onLinkClient={linkClientToEvent}
        onUnlinkClient={unlinkClientFromEvent}
        onDuplicate={() => {
          const cloned = {
            ...activeEvent,
            id: uid(),
            rsvpCode: uid(),
            name: activeEvent.name + ' (Copy)',
            date: '',
            guests: [],
            ros: [],
            catererCount: 0,
            timeline: activeEvent.timeline.map(t => ({ ...t, id: uid(), done: false })),
            vendors: activeEvent.vendors.map(v => ({ ...v, id: uid(), depositPaid: false, balancePaid: false, log: [], commsChecklist: {} })),
            budget: activeEvent.budget.map(r => ({ ...r, id: uid(), actual: 0, paid: false })),
          };
          setEvents(evts => [...evts, cloned]);
          setActiveId(cloned.id);
        }}
      />
    );
  }

  if (activeClient) {
    return providers(
      <>
        <ClientDetail
          client={activeClient}
          events={events}
          setClient={setClient}
          profile={profile}
          onSelectEvent={setActiveId}
          onAddEvent={() => setShowNew(true)}
          onBack={() => setActiveClientId(null)}
          onDelete={deleteClient}
          onUpdateEventGuests={updateEventGuests}
          onLinkEvent={linkEventToClient}
        />
        {showNew && <NewEventModal onClose={() => setShowNew(false)} onCreate={createEvent} clients={clients} />}
      </>
    );
  }

  return providers(
    <>
      <MainDashboard
        clients={clients}
        events={events}
        onSelectClient={setActiveClientId}
        onSelectEvent={(evId, nav) => { setInitialNav(nav || null); setActiveId(evId); }}
        profile={profile}
        onProfile={() => setShowProfile(true)}
        onNew={() => setShowNew(true)}
        onNewClient={() => setShowNewClient(true)}
        calNotes={calNotes}
        onAddCalNote={addCalNote}
        onToggleCalNote={toggleCalNote}
        onDeleteCalNote={deleteCalNote}
      />
      {showNew        && <NewEventModal  onClose={() => setShowNew(false)}       onCreate={createEvent}  clients={clients} profile={profile} />}
      {showNewClient  && <NewClientModal onClose={() => setShowNewClient(false)} onCreate={createClient} events={events} profile={profile} />}
      {showProfile && <ProfileModal profile={profile} onClose={() => setShowProfile(false)} onChange={updateProfile} />}
    </>
  );
}
