// ─── Invite tone + palettes (extracted from App.js) ───────────────────────────
// The guest invite speaks the EVENT'S mood, not the host's app theme (board
// verdict): light & warm paper by default (the category norm); formal types
// → dark & elegant (owner ruling 11/19/2026: the hour no longer decides);
// somber (Repast) → quiet/muted. A host
// override (event.inviteStyle = 'bright' | 'elegant' | a palette, below) ALWAYS wins, so the
// engine never silently guesses the soul of the party wrong (Rams' dissent).
// Used only on the guest-facing invite, never the app.
//
// Extracted so BOTH invite surfaces (the production app's RSVPFormView and the
// V2 prototype's InviteV2) read one tone truth. The one App-specific piece —
// the EVT_IDENT quiet-mark check — is injectable via opts.isQuiet(event); the
// built-in default recognises the somber types by name.

const SOMBER_DEFAULT = (event) =>
  /memorial|remembrance|funeral|repast|celebration of life/i
    .test(String((event && event.type) || '') + ' ' + String((event && event.name) || ''));

const FORMAL = /gala|client dinner|award|cocktail|board meeting|conference|product launch|networking|fundraiser|corporate/;

export const inviteTone = (event, opts = {}) => {
  if (event && event.inviteStyle === 'elegant') return 'dark';
  if (event && event.inviteStyle === 'bright') return 'light';
  // A palette (11/24/2026) is light stock unless its arrangement puts a dark
  // color on the paper; "Match my event" may resolve to today's muted or dark.
  const st = parseInviteStyle(event && event.inviteStyle);
  if (st.kind === 'auto') {
    const a = autoInvitePalette(event, opts);
    if (a === 'muted' || a === 'dark') return a;
    const pal = invitePaletteFor(event, opts);
    return pal && pal.dark ? 'dark' : 'light';
  }
  if (st.kind === 'palette') { const pal = invitePaletteFor(event, opts); return pal && pal.dark ? 'dark' : 'light'; }
  const isQuiet = opts.isQuiet || SOMBER_DEFAULT;
  if (isQuiet(event)) return 'muted';
  // CREAM BY DEFAULT, DARK ONLY FOR FORMAL (owner ruling, 11/19/2026). The hour
  // used to darken an invite too, so a 7 PM dinner at home went out on the
  // black stationery ("That dark invite sent is gross"). Only a formal TYPE is
  // dark now; a host who wants dark for anything else picks Elegant.
  const t = ((event && event.type) || '').toLowerCase();
  const formal = FORMAL.test(t);
  return formal ? 'dark' : 'light';
};

// ─── THE INVITE'S COLORS (owner-approved palettes, 11/24/2026: "build it") ───
// Eight palettes, each a paper, an ink and an accent (with the accent's
// ornament hue and a muted line), stored in the SAME field as the old paper
// choice: event.inviteStyle. One parser reads every value:
//   ''             today's tone engine (cream, dark when formal, muted when
//                  somber) — every event made before the palettes keeps it;
//   'bright'       today's cream;  'elegant' today's dark;
//   'auto'         "Match my event": the resolver below picks (new events);
//   '<key>'        a palette in its own order;
//   '<key>:<n>'    the same palette with its colors rearranged (arrangement n
//                  of arrangementsFor, the ones that pass the contrast gate).
// The page sets seven variables from it (inviteSheetVars): --stock-paper,
// --stock-ink, --stock-sub, --hue, --hue-deep, --stock-line, --on-hue.
// Hex values from the palette study (renders-palettes/pal.js), measured with
// the same WCAG math as below.
export const INVITE_PALETTES = [
  { key: 'cloud-clay', name: 'Cloud & Clay', paper: '#fbfaf7', ink: '#2f2b28', sub: '#625b55', hue: '#c4673f', accent: '#a3482a', onAccent: '#ffffff', line: '#ddd6cc' },
  { key: 'ecru-sky', name: 'Ecru & Sky', paper: '#f4eee1', ink: '#3d2617', sub: '#6a5444', hue: '#7fa9c9', accent: '#2e5d82', onAccent: '#ffffff', line: '#d9cfbd' },
  { key: 'butter-berry', name: 'Butter & Berry', paper: '#fcf3cf', ink: '#3b2417', sub: '#6b5141', hue: '#c42a78', accent: '#a01a5c', onAccent: '#ffffff', line: '#e6d9a6' },
  { key: 'sage-mauve', name: 'Sage & Mauve', paper: '#ebefe6', ink: '#263646', sub: '#505b65', hue: '#a87e93', accent: '#7c4c64', onAccent: '#ffffff', line: '#cdd5c6' },
  { key: 'clay-blush', name: 'Clay & Blush', paper: '#f7e7e1', ink: '#1f1c1b', sub: '#5e5352', hue: '#b8674a', accent: '#8c412c', onAccent: '#ffffff', line: '#e3cbc2' },
  { key: 'midnight-gold', name: 'Midnight & Gold', paper: '#fbf7ec', ink: '#18213d', sub: '#535a6e', hue: '#c5a04c', accent: '#22305e', onAccent: '#fbf7ec', line: '#ddd2b4' },
  { key: 'forest-oxblood', name: 'Forest & Oxblood', paper: '#f7f1e3', ink: '#1f3a2c', sub: '#58604f', hue: '#8b3a3f', accent: '#6e1f26', onAccent: '#ffffff', line: '#dcd2bc' },
  { key: 'dusty-silver', name: 'Dusty Blue & Silver', paper: '#fcfcfd', ink: '#2b3a4c', sub: '#5a6470', hue: '#a7b0bb', accent: '#4a6585', onAccent: '#ffffff', line: '#dde1e6' },
];
const PALETTE_BY_KEY = Object.fromEntries(INVITE_PALETTES.map((p) => [p.key, p]));
export const paletteByKey = (key) => PALETTE_BY_KEY[key] || null;

// ── WCAG math (the palette study's, verbatim in effect) ──────────────────────
const rgbOf = (h) => { const x = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); };
const hexOf = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mixHex = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return hexOf(A.map((v, i) => v + (B[i] - v) * t)); };
/** A color toward white (t>0) or toward black (t<0), by |t|. */
export const tintHex = (h, t) => mixHex(h, t >= 0 ? '#ffffff' : '#000000', Math.abs(t));
const lumOf = (h) => rgbOf(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrastRatio = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// The sheet is a gradient: a lit top and a shaded foot. Text is measured
// against the paper and both ends, and the WORST number counts.
// A dark paper's lit top is a faint sheen, not 45% white (the dark stock's own
// gradient: .inv2-dark .inv2-sheet), so it is measured at 8%.
export const paperTop = (paper) => mixHex(paper, '#ffffff', lumOf(paper) < 0.18 ? 0.08 : 0.45);
export const paperFoot = (paper) => mixHex(paper, '#000000', 0.06);
export const worstOnPaper = (fg, paper) => Math.min(contrastRatio(fg, paper), contrastRatio(fg, paperTop(paper)), contrastRatio(fg, paperFoot(paper)));
export const GATE = { ink: 4.5, inkTarget: 7, text: 4.5 };
const isDarkHex = (h) => lumOf(h) < 0.18;

/** The text pairs of one set of colors, each at its worst on the paper. */
export function measureColors(c) {
  return {
    ink: worstOnPaper(c.ink, c.paper), accent: worstOnPaper(c.accent, c.paper),
    sub: worstOnPaper(c.sub, c.paper), yes: contrastRatio(c.onAccent, c.accent),
  };
}
export const passesGate = (c) => { const m = measureColors(c); return m.ink >= GATE.ink && m.accent >= GATE.text && m.sub >= GATE.text && m.yes >= GATE.text; };

// A color made text on a paper it does not clear: deepened (light paper) or
// lightened (dark paper) in small steps, at most 45% of the way, so it still
// reads as that palette's color (the way the gold ornament's text is navy).
function textGrade(color, paper) {
  if (worstOnPaper(color, paper) >= GATE.text) return color;
  const to = isDarkHex(paper) ? '#ffffff' : '#000000';
  for (let t = 0.05; t <= 0.4501; t += 0.05) {
    const c = mixHex(color, to, t);
    if (worstOnPaper(c, paper) >= GATE.text) return c;
  }
  return null;
}

// The six ways paper, ink and accent can change places; 0 is the palette's own.
const ORDERS = [['paper', 'ink', 'accent'], ['paper', 'accent', 'ink'], ['ink', 'paper', 'accent'],
  ['ink', 'accent', 'paper'], ['accent', 'paper', 'ink'], ['accent', 'ink', 'paper']];

/** One arrangement's colors, before the gate. Exported for the test. */
export function arrange(p, order) {
  const base = { paper: p.paper, ink: p.ink, accent: p.accent };
  const paper = base[order[0]];
  if (order[0] === 'paper' && order[1] === 'ink') return { paper, ink: p.ink, accent: p.accent, sub: p.sub, hue: p.hue, onAccent: p.onAccent, line: p.line };
  const ink = textGrade(base[order[1]], paper);
  // The accent keeps its family: its ornament hue when that clears the paper.
  const accentBase = order[2] === 'accent' && isDarkHex(paper) ? p.hue : base[order[2]];
  const accent = textGrade(accentBase, paper);
  if (!ink || !accent) return null;
  const sub = textGrade(mixHex(ink, paper, 0.3), paper);
  // Text on the accent fill (the Yes button): whichever of paper, ink or white reads best.
  const onAccent = [paper, ink, '#ffffff'].sort((a, b) => contrastRatio(b, accent) - contrastRatio(a, accent))[0];
  return { paper, ink, accent, sub: sub || ink, hue: order[2] === 'accent' ? p.hue : accent, onAccent, line: mixHex(paper, ink, 0.18) };
}

/** The arrangements a palette offers: only those that pass the gate, each with
 *  its index in ORDERS (the number stored after the colon). */
export function arrangementsFor(paletteOrKey) {
  const p = typeof paletteOrKey === 'string' ? paletteByKey(paletteOrKey) : paletteOrKey;
  if (!p) return [];
  const out = [];
  ORDERS.forEach((order, index) => {
    const c = arrange(p, order);
    if (c && passesGate(c)) out.push({ index, order, ...c, dark: isDarkHex(c.paper) });
  });
  return out;
}

/** Every inviteStyle value, old and new, through one parser. */
export function parseInviteStyle(value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return { kind: 'legacy', value: '' };
  if (v === 'bright' || v === 'elegant') return { kind: 'legacy', value: v };
  if (v === 'auto') return { kind: 'auto' };
  const m = /^([a-z-]+)(?::(\d+))?$/.exec(v);
  if (m && PALETTE_BY_KEY[m[1]]) return { kind: 'palette', key: m[1], arrangement: m[2] ? Number(m[2]) : 0 };
  return { kind: 'legacy', value: '' };   // an unknown value: today's engine, never a crash
}
/** What the host's panel and rows call an inviteStyle value. */
export function inviteStyleLabel(value) {
  const st = parseInviteStyle(value);
  if (st.kind === 'auto') return 'Match my event';
  if (st.kind === 'palette') return PALETTE_BY_KEY[st.key].name;
  return st.value === 'elegant' ? 'Elegant dark' : st.value === 'bright' ? 'Bright paper' : 'Today’s cream';
}
export const formatInviteStyle = (key, arrangement) => (arrangement ? `${key}:${arrangement}` : key);

// "Match my event" (owner's mapping, 11/24/2026). PURE. Returns 'muted',
// 'dark' or a palette key.
const BY_TYPE = [
  [/thanksgiving|friendsgiving/i, 'cloud-clay'],
  [/25th\s*anniversary|silver\s*anniversary|hanukkah|chanukah/i, 'dusty-silver'],
  [/christmas|holiday/i, 'forest-oxblood'],
  [/new\s*year|\bnye\b|anniversary/i, 'midnight-gold'],
  [/baby\s*shower|christening|baptism|graduat/i, 'ecru-sky'],
  [/bridal\s*shower|\btea\b|garden\s*party/i, 'sage-mauve'],
  [/engagement|bachelorette/i, 'clay-blush'],
  [/kid|sweet\s*16|sweet\s*sixteen|brunch|first\s*birthday|1st\s*birthday/i, 'butter-berry'],
];
export function monthPalette(dateIso) {
  const m = /^\d{4}-(\d{2})/.exec(String(dateIso || ''));
  if (!m) return 'cloud-clay';
  const mo = Number(m[1]);
  if (mo === 12) return 'forest-oxblood';
  if (mo <= 2) return 'dusty-silver';
  if (mo <= 5) return 'sage-mauve';
  if (mo <= 8) return 'butter-berry';
  return 'cloud-clay';
}
export function autoInvitePalette(event, opts = {}) {
  const ev = event || {};
  const isQuiet = opts.isQuiet || SOMBER_DEFAULT;
  if (isQuiet(ev)) return 'muted';
  if (FORMAL.test(String(ev.type || '').toLowerCase())) return 'dark';
  const text = String(ev.type || '') + ' ' + String(ev.name || '');
  const hit = BY_TYPE.find(([re]) => re.test(text));
  return hit ? hit[1] : monthPalette(ev.date);
}

// Today's cream, with the contrast-passing rust (11/24/2026).
export const TODAY_CREAM = { paper: '#f9f4ea', ink: '#241f18', sub: '#62626d', hue: '#D9622B', accent: '#9c4426', onAccent: '#ffffff', line: '#d8cbb4' };

/** The palette an event's invite wears, or null for today's tone classes. */
export function invitePaletteFor(event, opts = {}) {
  const st = parseInviteStyle(event && event.inviteStyle);
  let key = null, arrangement = 0;
  if (st.kind === 'palette') { key = st.key; arrangement = st.arrangement; }
  else if (st.kind === 'auto') {
    const a = autoInvitePalette(event, opts);
    if (a === 'muted' || a === 'dark') return null;   // today's muted / dark stock
    key = a;
  } else return null;
  const offered = arrangementsFor(key);
  const pick = offered.find((o) => o.index === arrangement) || offered[0];
  return pick ? { key, name: PALETTE_BY_KEY[key].name, ...pick } : null;
}

/** The seven variables .inv2-sheet reads. */
export const inviteSheetVars = (c) => ({
  // The paper's lit top and shaded foot, in the stock's own shape (styles.css
  // .inv2-sheet reads them): a light paper lit 45%, a dark one 6%.
  '--paper-top': tintHex(c.paper, c.dark ? 0.06 : 0.45), '--paper-foot': tintHex(c.paper, c.dark ? -0.1 : -0.035),
  '--stock-paper': c.paper, '--stock-ink': c.ink, '--stock-sub': c.sub,
  '--hue': c.hue, '--hue-deep': c.accent, '--stock-line': c.line, '--on-hue': c.onAccent,
});

// Secondary/muted text values were darkened (light) / brightened (dark) to
// clear WCAG AA after MEASURING each pair (a11y P2, item 6) — see App.js
// history for the measured ratios. Values verbatim.
export const invitePalette = (tone) => tone === 'dark'
  ? { dark: true,  bg: '#0d0f12', panel: '#15181c', surface: '#1a1e23', border: '#262b31', text: '#ffffff', sub: 'rgba(132,158,184,0.95)', muted: 'rgba(150,174,198,0.88)' }
  : tone === 'muted'
  ? { dark: false, bg: '#edeae5', panel: '#f6f4f0', surface: '#ffffff', border: '#ddd7cd', text: '#2a2a2e', sub: '#62626d', muted: '#6d6d78' }
  : { dark: false, bg: '#faf6f0', panel: '#ffffff', surface: '#ffffff', border: '#ece5d9', text: '#1a1a1a', sub: '#62626d', muted: '#6d6d78' };

// Deepen an event hue for use as a LIGHT-tone accent. The identity hues are
// tuned to sing on a dark panel; on cream they read pale/washed-out (esp. the
// steel-blues). This pushes saturation up and lightness down just enough that
// the same hue reads as a confident, richer accent on paper — without becoming
// muddy or losing its identity. Pure hex→HSL→hex; returns the input unchanged
// if it can't parse (never throws on the invite).
export const deepenForLight = (hex) => {
  try {
    let h = String(hex || '').trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return hex;
    let r = parseInt(h.slice(0, 2), 16) / 255;
    let g = parseInt(h.slice(2, 4), 16) / 255;
    let b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue = 0, s = 0, l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      hue = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) hue = ((b - r) / d + 2);
      else                hue = ((r - g) / d + 4);
      hue /= 6;
    }
    s = Math.min(1, s * 1.35 + 0.16);
    l = Math.max(0.30, Math.min(l, 0.46));
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let R, G, B;
    if (s === 0) { R = G = B = l; }
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      R = hue2rgb(p, q, hue + 1 / 3);
      G = hue2rgb(p, q, hue);
      B = hue2rgb(p, q, hue - 1 / 3);
    }
    const toHex = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(R)}${toHex(G)}${toHex(B)}`;
  } catch { return hex; }
};
