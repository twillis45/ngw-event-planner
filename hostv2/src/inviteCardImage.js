// inviteCardImage — draws the invitation card as a JPEG (owner, 11/19/2026:
// "Build the invitation picture email"). WHAT it says is lib/inviteCard
// (inviteCardModel); this is HOW it looks, measured from the guest invite
// page's own stylesheet (styles.css .inv2-*): the page's paper (drawPaper,
// below: its gradients, highlights and shading at the card's own size, and
// its linen grain from public/email/invite-grain-{light,dark}.jpg), Playfair for
// the name and deck line, the masthead with its rule and diamond, the accent
// rule, the event's crest when it has one, and centered When / Where / Hosted
// by, each struck into the paper with the page's letterpress shadows.
//
// Drawn on a canvas rather than photographed from the page: a canvas draws the
// same on every browser (the page-capture libraries are unreliable on iPhone
// Safari), and needs no new dependency. The card is 380 CSS px wide, the page's
// phone width, at 3x.
import { tintHex } from '@app/lib/inviteTone';

const W = 380;
const S = 3;
const PAD = 26;
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
// The host's message is set in the page's message style (.inv2-msg): the
// reading serif, italic, with the signature upright under it (11/24/2026).
const SERIF_READ = "'Newsreader', Georgia, 'Times New Roman', serif";
const MSG_FONT = `italic 400 17px ${SERIF_READ}`;
const SIG_FONT = `400 15px ${SERIF_READ}`;

const grainUrl = (kind) => `${import.meta.env.BASE_URL || '/'}email/invite-grain-${kind}.jpg`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('grain failed to load'));
    img.src = src;
  });
}

// ── THE PAGE'S PAPER, AT THE CARD'S OWN SIZE (owner, 11/19/2026: "I want same
// paper color gradients etc") ─────────────────────────────────────────────
// Each layer is the stylesheet's (styles.css .inv2-sheet, ::before, ::after,
// and their .inv2-dark versions), value for value, laid out by the CSS rules
// for gradient geometry, so a short card shades like the page and is not a
// tall sheet squeezed. The grain (::before) is a texture rendered from the
// page's own CSS, composited the way the page composites it.
function cssLinear(ctx, w, h, deg, stops) {
  const a = (deg * Math.PI) / 180;
  const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const dx = (Math.sin(a) * len) / 2, dy = (-Math.cos(a) * len) / 2;
  const g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
  stops.forEach(([at, c]) => g.addColorStop(at, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
// radial-gradient(RX% RY% at CX% CY%, …): an ellipse, drawn as a circle in a
// vertically scaled space.
function cssRadial(ctx, w, h, rx, ry, cx, cy, stops) {
  const R = rx * w, k = (ry * h) / R;
  ctx.save();
  ctx.translate(cx * w, cy * h); ctx.scale(1, k);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  stops.forEach(([at, c]) => g.addColorStop(at, c));
  ctx.fillStyle = g; ctx.fillRect(-cx * w, -cy * h / k, w, h / k);
  ctx.restore();
}
// box-shadow: inset X Y BLUR COLOR, drawn as a strip along its edge.
function insetEdge(ctx, w, h, side, size, blur, color) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.fillStyle = color;
  if (blur) ctx.filter = `blur(${blur}px)`;
  if (side === 'top') ctx.fillRect(-4, -4, w + 8, 4 + size);
  if (side === 'bottom') ctx.fillRect(-4, h - size, w + 8, size + 4);
  if (side === 'left') ctx.fillRect(-4, -4, 4 + size, h + 8);
  if (side === 'right') ctx.fillRect(w - size, -4, size + 4, h + 8);
  ctx.restore();
}

// The page's sheet on a phone is calc(852px - 132px) tall (styles.css
// .inv2-sheet min-height); the card shows its top part. So the paper is
// computed at the sheet's height and the card is cut from its top: the light
// falls exactly where it falls on the page, and the bottom shading, which on
// the page sits far below the facts, is not pulled up under them.
export const SHEET_H = 720;
export function drawPaper(ctx, w, h, dark, grain, paperHex) {
  const card = h;
  h = Math.max(h, SHEET_H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, card); ctx.clip();
  if (!dark) {
    // A palette's paper (11/24/2026) in the stock's own light-to-shade shape.
    cssLinear(ctx, w, h, 168, paperHex ? [[0, tintHex(paperHex, 0.45)], [0.48, paperHex], [1, tintHex(paperHex, -0.035)]]
      : [[0, '#fdfaf4'], [0.48, '#f9f4ea'], [1, '#f2ebdc']]);
    cssRadial(ctx, w, h, 1.6, 1.2, 0.5, 1.18, [[0, 'rgba(226,213,192,.5)'], [0.46, 'rgba(240,232,218,0)'], [1, 'rgba(240,232,218,0)']]);
    cssRadial(ctx, w, h, 1.3, 0.9, 0.32, -0.1, [[0, 'rgba(255,253,248,.98)'], [0.58, 'rgba(253,250,245,0)'], [1, 'rgba(253,250,245,0)']]);
    insetEdge(ctx, w, card, 'bottom', 2, 3, 'rgba(140,110,70,.14)');
    insetEdge(ctx, w, card, 'right', 1.5, 1, 'rgba(140,110,70,.12)');
    insetEdge(ctx, w, card, 'left', 1.5, 0, 'rgba(255,255,255,.55)');
    insetEdge(ctx, w, h, 'top', 2, 0, 'rgba(255,255,255,.95)');
    ctx.save(); ctx.strokeStyle = 'rgba(196,178,148,.5)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, card - 1); ctx.restore();
    if (grain) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(grain, 0, 0, w * S, Math.min(card * S, grain.height), 0, 0, w, Math.min(card, grain.height / S)); ctx.restore(); }
    cssLinear(ctx, w, h, 180, [[0, 'rgba(255,255,255,.28)'], [0.08, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
    cssLinear(ctx, w, h, 0, [[0, 'rgba(120,96,60,.09)'], [0.2, 'rgba(120,96,60,0)'], [1, 'rgba(120,96,60,0)']]);
    cssRadial(ctx, w, h, 1.4, 1.05, 0.5, 0.45, [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [1, 'rgba(110,85,50,.10)']]);
    cssLinear(ctx, w, h, 118, [[0, 'rgba(255,255,255,.62)'], [0.26, 'rgba(255,255,255,.16)'], [0.42, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
  } else {
    cssLinear(ctx, w, h, 168, paperHex ? [[0, tintHex(paperHex, 0.06)], [0.48, paperHex], [1, tintHex(paperHex, -0.1)]]
      : [[0, '#191b1f'], [0.48, '#131518'], [1, '#0d0f11']]);
    cssRadial(ctx, w, h, 1.6, 1.2, 0.5, 1.18, [[0, 'rgba(0,0,0,.55)'], [0.46, 'rgba(20,22,25,0)'], [1, 'rgba(20,22,25,0)']]);
    cssRadial(ctx, w, h, 1.3, 0.9, 0.32, -0.1, [[0, 'rgba(44,47,52,.85)'], [0.58, 'rgba(22,24,27,0)'], [1, 'rgba(22,24,27,0)']]);
    insetEdge(ctx, w, card, 'bottom', 2, 3, 'rgba(0,0,0,.5)');
    insetEdge(ctx, w, h, 'top', 1.5, 0, 'rgba(255,246,230,.14)');
    ctx.save(); ctx.strokeStyle = 'rgba(255,244,224,.09)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, card - 1); ctx.restore();
    if (grain) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(grain, 0, 0, w * S, Math.min(card * S, grain.height), 0, 0, w, Math.min(card, grain.height / S)); ctx.restore(); }
    cssRadial(ctx, w, h, 1.4, 1.05, 0.5, 0.45, [[0, 'rgba(0,0,0,0)'], [0.58, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.4)']]);
    cssLinear(ctx, w, h, 118, [[0, 'rgba(255,246,228,.10)'], [0.26, 'rgba(255,246,228,.03)'], [0.42, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
  }
  ctx.restore();
}

async function fontsReady() {
  try {
    if (!document.fonts) return;
    await Promise.all([
      document.fonts.load(`700 42px ${SERIF}`),
      document.fonts.load(MSG_FONT),
      document.fonts.load(SIG_FONT),
    ]);
  } catch { /* system serif stands in */ }
}

// Letter-spaced text, drawn a character at a time: canvas letterSpacing is not
// in every Safari this ships to.
function spacedWidth(ctx, text, spacing) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return text ? w - spacing : 0;
}
function drawSpaced(ctx, text, x, y, spacing, align) {
  const w = spacedWidth(ctx, text, spacing);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textAlign = 'left';
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
}

function wrap(ctx, text, max) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= max || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// The page's letterpress (.lp / .lp-display text-shadow), one pass per shadow.
function struck(ctx, dark, display, draw) {
  const shadows = dark
    ? (display ? [['rgba(255,246,230,.18)', 1.5, 0], ['rgba(0,0,0,.95)', -2, 2]] : [['rgba(255,246,230,.14)', 1, 0], ['rgba(0,0,0,.85)', -1, 1]])
    : (display ? [['rgba(255,255,255,.9)', 2, 1], ['rgba(90,62,32,.5)', -1.5, 1]] : [['rgba(255,255,255,.85)', 1, 0], ['rgba(100,72,40,.4)', -0.5, 0.5]]);
  for (const [color, dy, blur] of shadows) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = dy * S; ctx.shadowBlur = blur * S; draw(); ctx.restore();
  }
  draw();
}

/** The card's layout: what goes where, measured with `ctx` (a measuring
 *  pass; nothing is drawn). Exported so the layout is testable. */
export function planInviteCard(ctx, model, crest) {
  const inner = W - PAD * 2;
  const ops = [];
  let y = 30;
  ops.push({ k: 'mast', y: y + 9 }); y += 14;
  if (crest && crest.naturalWidth) {
    const ch = 96 * (crest.naturalHeight / crest.naturalWidth);
    y += 10; ops.push({ k: 'crest', y, h: ch }); y += ch;
  }
  if (model.eyebrow) { y += 18; ops.push({ k: 'eyebrow', y: y + 9 }); y += 12; }
  ctx.font = `700 42px ${SERIF}`;
  const nameLines = wrap(ctx, model.name, inner);
  y += model.eyebrow ? 14 : 26;
  nameLines.forEach((l) => { y += 42 * 1.08; ops.push({ k: 'name', text: l, y: y - 9 }); });
  if (model.deck) {
    ctx.font = MSG_FONT;
    y += 4;
    wrap(ctx, model.deck, inner - 24).forEach((l) => { y += 24; ops.push({ k: 'deck', text: l, y: y - 5, font: MSG_FONT }); });
    if (model.sig) { y += 26; ops.push({ k: 'sig', text: model.sig, y: y - 5, font: SIG_FONT }); }
  }
  y += 16; ops.push({ k: 'rule', y }); y += 2 + 4;
  for (const f of model.facts) {
    y += 13 + 11; ops.push({ k: 'label', text: f.label.toUpperCase(), y: y - 1 });
    ctx.font = `600 15px ${SANS}`;
    const full = f.sub ? `${f.value} · ${f.sub}` : f.value;
    const oneLine = ctx.measureText(full).width <= inner;
    const lines = oneLine ? [full] : [...wrap(ctx, f.value, inner), ...(f.sub ? [f.sub] : [])];
    lines.forEach((l, i) => { y += 3 + 18; ops.push({ k: 'val', text: l, sub: f.sub, oneLine, last: i === lines.length - 1, y: y - 4 }); });
  }
  return { ops, h: Math.ceil(y + 34) };
}

/** Lay the card out (a measuring pass), then draw it. Returns a JPEG Blob. */
export async function drawInviteCard(model) {
  await fontsReady();
  const dark = model.colors.paper === 'dark';
  const c = model.colors;
  const grain = await loadImage(grainUrl(dark ? 'dark' : 'light')).catch(() => null);   // no grain: the gradients alone
  // G83 (11/19/2026): the page's crest (InviteV2 markUrlFor) when the event has
  // one and the host left it on. It failing to load leaves it out, as the page would.
  const crest = model.crest ? await loadImage(model.crest).catch(() => null) : null;

  const measure = document.createElement('canvas').getContext('2d');
  const { ops, h } = planInviteCard(measure, model, crest);
  const canvas = document.createElement('canvas');
  canvas.width = W * S; canvas.height = h * S;
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);

  // The paper, square: the email rounds its corners (border-radius on the
  // image), so no corner color can show against a mail app's dark background.
  drawPaper(ctx, W, h, dark, grain, c.paperHex);

  ctx.textBaseline = 'alphabetic';
  for (const op of ops) {
    if (op.k === 'mast') {
      ctx.font = `800 11px ${SANS}`; ctx.fillStyle = c.hueDeep;
      const left = model.mast[0].toUpperCase(), right = (model.mast[1] || '').toUpperCase();
      const sp = 11 * 0.18;
      struck(ctx, dark, false, () => { drawSpaced(ctx, left, PAD, op.y, sp, 'left'); if (right) drawSpaced(ctx, right, W - PAD, op.y, sp, 'right'); });
      const x0 = PAD + spacedWidth(ctx, left, sp) + 9, x1 = W - PAD - (right ? spacedWidth(ctx, right, sp) + 9 : 0);
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = c.hue; ctx.fillRect(x0, op.y - 4, x1 - x0, 1); ctx.restore();
      ctx.save(); ctx.translate((x0 + x1) / 2, op.y - 3.5); ctx.rotate(Math.PI / 4); ctx.fillStyle = c.hue; ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    } else if (op.k === 'crest') {
      // .inv2-crest: two blurred silhouettes, light up-left and shade down-right,
      // embossing the mark into the paper; the art multiplied in on cream.
      const x = W / 2 - 48;
      const shape = (color) => {
        const off = document.createElement('canvas');
        off.width = 96 * S; off.height = Math.ceil(op.h * S);
        const o = off.getContext('2d');
        o.drawImage(crest, 0, 0, off.width, off.height);
        o.globalCompositeOperation = 'source-in'; o.fillStyle = color; o.fillRect(0, 0, off.width, off.height);
        return off;
      };
      const layers = dark
        ? [['rgba(255,246,230,.24)', -1.3, -1.3, 0.4], ['rgba(0,0,0,.62)', 1.7, 2.2, 0.9]]
        : [['rgba(255,255,255,.92)', -1.3, -1.3, 0.4], ['rgba(110,80,45,.55)', 1.7, 2.2, 0.9]];
      for (const [color, dx, dy, blur] of layers) {
        ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.drawImage(shape(color), x + dx, op.y + dy, 96, op.h); ctx.restore();
      }
      ctx.save();
      if (!dark) ctx.globalCompositeOperation = 'multiply';
      ctx.filter = dark ? 'saturate(.8) brightness(.93) contrast(1.02)' : 'saturate(.82) contrast(1.03)';
      ctx.drawImage(crest, x, op.y, 96, op.h);
      ctx.restore();
    } else if (op.k === 'eyebrow') {
      ctx.font = `800 11.5px ${SANS}`; ctx.fillStyle = c.hueDeep;
      struck(ctx, dark, false, () => drawSpaced(ctx, model.eyebrow.toUpperCase(), W / 2, op.y, 11.5 * 0.2, 'center'));
    } else if (op.k === 'name') {
      ctx.font = `700 42px ${SERIF}`; ctx.fillStyle = c.ink; ctx.textAlign = 'center';
      struck(ctx, dark, true, () => ctx.fillText(op.text, W / 2, op.y));
    } else if (op.k === 'deck') {
      ctx.font = op.font; ctx.fillStyle = c.body || c.ink; ctx.textAlign = 'center';
      ctx.fillText(op.text, W / 2, op.y);
    } else if (op.k === 'sig') {
      ctx.font = op.font; ctx.fillStyle = c.sub; ctx.textAlign = 'center';
      ctx.fillText(op.text, W / 2, op.y);
    } else if (op.k === 'rule') {
      ctx.fillStyle = c.hue; ctx.fillRect(W / 2 - 22, op.y, 44, 2);
    } else if (op.k === 'label') {
      ctx.font = `800 11px ${SANS}`; ctx.fillStyle = c.hueDeep;
      struck(ctx, dark, false, () => drawSpaced(ctx, op.text, W / 2, op.y, 11 * 0.16, 'center'));
    } else if (op.k === 'val') {
      // "Thursday, November 26 · 4:00 PM": the day in ink, the hour quieter, as on the page.
      ctx.textAlign = 'left';
      const parts = op.oneLine && op.sub
        ? [[op.text.slice(0, op.text.length - op.sub.length - 3), `600 15px ${SANS}`, c.body || c.ink], [' · ' + op.sub, `500 15px ${SANS}`, c.sub]]
        : (!op.oneLine && op.sub && op.last) ? [[op.text, `500 15px ${SANS}`, c.sub]] : [[op.text, `600 15px ${SANS}`, c.body || c.ink]];
      let total = 0; for (const [t, f] of parts) { ctx.font = f; total += ctx.measureText(t).width; }
      let x = W / 2 - total / 2;
      for (const [t, f, col] of parts) {
        ctx.font = f; ctx.fillStyle = col;
        const at = x; struck(ctx, dark, false, () => ctx.fillText(t, at, op.y));
        x += ctx.measureText(t).width;
      }
    }
  }
  return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no picture'))), 'image/jpeg', 0.9));
}
