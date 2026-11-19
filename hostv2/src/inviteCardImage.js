// inviteCardImage — draws the invitation card as a JPEG (owner, 11/19/2026:
// "Build the invitation picture email"). WHAT it says is lib/inviteCard
// (inviteCardModel); this is HOW it looks, measured from the guest invite
// page's own stylesheet (styles.css .inv2-*): the page's paper (rendered once
// from that CSS to public/email/invite-paper-{light,dark}.jpg), Playfair for
// the name and deck line, the masthead with its rule and diamond, the accent
// rule, and centered When / Where / Hosted by, each struck into the paper
// with the page's letterpress shadows.
//
// Drawn on a canvas rather than photographed from the page: a canvas draws the
// same on every browser (the page-capture libraries are unreliable on iPhone
// Safari), and needs no new dependency. The card is 380 CSS px wide, the page's
// phone width, at 3x.
const W = 380;
const S = 3;
const PAD = 26;
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

const paperUrl = (kind) => `${import.meta.env.BASE_URL || '/'}email/invite-paper-${kind}.jpg`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('paper failed to load'));
    img.src = src;
  });
}

async function fontsReady() {
  try {
    if (!document.fonts) return;
    await Promise.all([
      document.fonts.load(`700 42px ${SERIF}`),
      document.fonts.load(`italic 400 15.5px ${SERIF}`),
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

/** Lay the card out (a measuring pass), then draw it. Returns a JPEG Blob. */
export async function drawInviteCard(model) {
  await fontsReady();
  const dark = model.colors.paper === 'dark';
  const c = model.colors;
  const paper = await loadImage(paperUrl(dark ? 'dark' : 'light'));
  const inner = W - PAD * 2;

  const plan = (ctx) => {
    const ops = [];
    let y = 30;
    ops.push({ k: 'mast', y: y + 9 }); y += 14;
    if (model.eyebrow) { y += 18; ops.push({ k: 'eyebrow', y: y + 9 }); y += 12; }
    ctx.font = `700 42px ${SERIF}`;
    const nameLines = wrap(ctx, model.name, inner);
    y += model.eyebrow ? 14 : 26;
    nameLines.forEach((l) => { y += 42 * 1.08; ops.push({ k: 'name', text: l, y: y - 9 }); });
    if (model.deck) {
      ctx.font = `italic 400 15.5px ${SERIF}`;
      wrap(ctx, model.deck, inner).forEach((l) => { y += 22; ops.push({ k: 'deck', text: l, y: y - 5 }); });
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
  };

  const measure = document.createElement('canvas').getContext('2d');
  const { ops, h } = plan(measure);
  const canvas = document.createElement('canvas');
  canvas.width = W * S; canvas.height = h * S;
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);

  // The paper, edge to edge, with the page's thin inner edge. Square: the
  // email rounds its corners (border-radius on the image), so no corner color
  // can show against a mail app's dark background.
  ctx.drawImage(paper, 0, 0, W, h);
  ctx.strokeStyle = dark ? 'rgba(255,244,224,.09)' : 'rgba(196,178,148,.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, h - 1);

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
    } else if (op.k === 'eyebrow') {
      ctx.font = `800 11.5px ${SANS}`; ctx.fillStyle = c.hueDeep;
      struck(ctx, dark, false, () => drawSpaced(ctx, model.eyebrow.toUpperCase(), W / 2, op.y, 11.5 * 0.2, 'center'));
    } else if (op.k === 'name') {
      ctx.font = `700 42px ${SERIF}`; ctx.fillStyle = c.ink; ctx.textAlign = 'center';
      struck(ctx, dark, true, () => ctx.fillText(op.text, W / 2, op.y));
    } else if (op.k === 'deck') {
      ctx.font = `italic 400 15.5px ${SERIF}`; ctx.fillStyle = c.sub; ctx.textAlign = 'center';
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
