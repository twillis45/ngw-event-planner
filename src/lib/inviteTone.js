// ─── Invite tone + palettes (extracted from App.js) ───────────────────────────
// The guest invite speaks the EVENT'S mood, not the host's app theme (board
// verdict): daytime/family/casual → light & warm paper (the category norm);
// formal/evening → dark & elegant; somber (Repast) → quiet/muted. A host
// override (event.inviteStyle = 'bright' | 'elegant') ALWAYS wins, so the
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

export const inviteTone = (event, opts = {}) => {
  if (event && event.inviteStyle === 'elegant') return 'dark';
  if (event && event.inviteStyle === 'bright') return 'light';
  const isQuiet = opts.isQuiet || SOMBER_DEFAULT;
  if (isQuiet(event)) return 'muted';
  const t = ((event && event.type) || '').toLowerCase();
  const evening = !!event && (event.timeOfDay === 'evening' || event.timeOfDay === 'night');
  const elegant = evening || /gala|client dinner|award|cocktail|board meeting|conference|product launch|networking|fundraiser|corporate/.test(t);
  return elegant ? 'dark' : 'light';
};

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
