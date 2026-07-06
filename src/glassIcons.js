// ── Glass identity icons ──────────────────────────────────────────────────────
// The locked "clear-glass-realistic" identity language (prototyped in
// review-artifacts/icon-proto/board7.html, approved 2026-06-23). Each cultural mark
// is rendered as a solid translucent-glass volume: a tonal face gradient, edge-density
// darkening, an inner refraction edge (thickness), a Fresnel rim, a chromatic edge
// fringe, a two-layer grounded shadow + a focused caustic, and a top-sheen — no glow.
//
// USAGE RULE (carries the standing constraint): these icons are COLORED (the cultural
// hue), so they belong ONLY on free, non-card hero surfaces — the host-home hero mark,
// the invite hero, the AssembleReveal. NEVER inside a card (per the "no identity color
// in cards" rule); cards keep the monochrome line glyph.
//
// Shapes are keyed by the EVT_IDENT icon name. Types without a glass shape fall back
// (caller renders the flat glyph in the hue). Add a filled shape here to light one up.
import React from 'react';

// hex color mix (so we don't depend on CSS color-mix inside SVG attributes)
function hx(c){ c=c.replace('#',''); if(c.length===3)c=c.split('').map(x=>x+x).join(''); return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16)); }
function toHex(a){ return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function mix(c,o,p){ const A=hx(c),B=hx(o==='white'?'#ffffff':o==='black'?'#000000':o); const t=p/100; return toHex(A.map((v,i)=>v*(1-t)+B[i]*t)); }

const RED='#C8453B',GREEN='#3E8E5F',INK='#262A30',GOLD='#E9A23B',STEEL='#6F8794';
const KC=[{x:30,c:RED},{x:42,c:RED},{x:54,c:RED},{x:66,c:INK},{x:78,c:GREEN},{x:90,c:GREEN},{x:102,c:GREEN}];

// Each shape: { hue, base (floor y), parts:[{d,color,er?}], flames?() }
export const GLASS_SHAPES = {
  kinara: { hue: STEEL, base: 80, parts: () => [
      ...KC.map(c => ({ d:`M ${c.x-3.6} 22 h7.2 a2.4 2.4 0 0 1 2.4 2.4 v35.2 a2.4 2.4 0 0 1 -2.4 2.4 h-7.2 a2.4 2.4 0 0 1 -2.4 -2.4 v-35.2 a2.4 2.4 0 0 1 2.4 -2.4 Z`, color:c.c })),
      { d:`M14 62 h104 a8 8 0 0 1 8 8 v4 a8 8 0 0 1 -8 8 H14 a8 8 0 0 1 -8 -8 v-4 a8 8 0 0 1 8 -8 Z`, color:STEEL } ],
    flames: () => KC.map(c => `<path d="M${c.x} 16 q-3 -3 0 -6.6 q3 3.6 0 6.6 Z" fill="${GOLD}"/>`).join('') },
  'house-key': { hue:'#3FA6A0', base:80, parts:(h)=>[{ d:`M30 80 V48 L66 22 L102 48 V80 Z`, color:h }] },
  house:       { hue:'#3FA6A0', base:80, parts:(h)=>[{ d:`M30 80 V48 L66 22 L102 48 V80 Z`, color:h }] },
  spade:  { hue:'#6E6FB0', base:84, parts:(h)=>[{ d:`M66 20 C48 40 36 48 36 60 C36 70 46 73 54 67 C52 75 48 80 42 84 L90 84 C84 80 80 75 78 67 C86 73 96 70 96 60 C96 48 84 40 66 20 Z`, color:h }] },
  // Maryland blue crab — ADULT Chesapeake posture (glyph quality pass 2026-07-06):
  // angular carapace ending in the species' pointed LATERAL SPINES, strong jointed
  // pincers raised from the shoulders (no curly cartoon claws), eye TICKS instead of
  // ball-tipped stalks, jointed legs, and rear SWIMMING PADDLES. gscale: the authored
  // paths are wide-but-thin and read SMALL in the dome vs peers (QA 2026-06-28), so
  // scale the whole crab up about its center.
  crab: { hue:'#2E6F8E', base:88, gscale:1.12, gcy:50, parts:(h)=>[
      // carapace — realistic top view: fine marginal teeth along the front edge
      // ending in the species' long lateral spines at (8,50)/(124,50)
      { d:`M8 50 L34 45 L38 47 L43 43 L48 46 L53 42 L58 45 L62 41 L66 43 L70 41 L74 45 L79 42 L84 46 L89 43 L94 47 L98 45 L124 50 C116 65 96 74 66 74 C36 74 16 65 8 50 Z`, color:h },
      // chelipeds — one-piece raised claws, pincer notch cut into the fill
      { d:`M46 47 L31 39 C24 35 19 28 20 19 L26 9 L28 16 L34 11 C38 16 38 24 33 30 L52 42 Z`, color:h },
      { d:`M86 47 L101 39 C108 35 113 28 112 19 L106 9 L104 16 L98 11 C94 16 94 24 99 30 L80 42 Z`, color:h } ],
    flames:(h)=>`<path d="M60 42 L59 37 M72 42 L73 37" stroke="${mix(h,'black',12)}" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M30 63 L18 69 L10 68 M36 68 L28 76 L20 78 M42 72 L38 81 L32 85 M102 63 L114 69 L122 68 M96 68 L104 76 L112 78 M90 72 L94 81 L100 85" stroke="${mix(h,'black',12)}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M54 74 L52 82 M78 74 L80 82" stroke="${mix(h,'black',12)}" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="51" cy="86.5" rx="4.6" ry="2.7" transform="rotate(-24 51 86.5)" fill="${mix(h,'black',12)}"/><ellipse cx="81" cy="86.5" rx="4.6" ry="2.7" transform="rotate(24 81 86.5)" fill="${mix(h,'black',12)}"/>` },
  // The Cookout — kettle grill (dome + bowl + legs + handle)
  grill: { hue:'#E07A3B', base:84, parts:(h)=>[
      { d:`M40 52 A26 26 0 0 0 92 52 Z`, color:h },
      { d:`M40 52 A26 19 0 0 1 92 52 Z`, color:mix(h,'black',8) } ],
    flames:(h)=>`<path d="M48 76 L43 88 M84 76 L89 88 M66 78 L66 90" stroke="${mix(h,'black',14)}" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="66" cy="30" r="3.2" fill="${mix(h,'black',14)}"/><path d="M66 33 V40" stroke="${mix(h,'black',14)}" stroke-width="3.2" stroke-linecap="round"/>` },
  // simple, bold marks
  sun:  { hue:'#E2A93B', base:80, parts:(h)=>[{ d:`M66 36 a18 18 0 1 0 0.01 0 Z`, color:h }], flames:(h)=>{let r='';for(let a=0;a<12;a++){const t=a*Math.PI/6,x=66+Math.cos(t)*30,y=54+Math.sin(t)*30,x2=66+Math.cos(t)*38,y2=54+Math.sin(t)*38;r+=`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${mix(h,'black',10)}" stroke-width="3.4" stroke-linecap="round"/>`;}return r;} },
  wine: { hue:'#8E5A86', base:84, parts:(h)=>[{ d:`M50 22 H82 C82 40 74 48 66 48 C58 48 50 40 50 22 Z`, color:h }], flames:(h)=>`<path d="M66 48 V74 M52 78 H80" stroke="#8E5A86" stroke-width="3.6" stroke-linecap="round" fill="none"/>` },
  candle: { hue:'#7E6FA6', base:82, parts:(h)=>[{ d:`M58 30 h16 a3 3 0 0 1 3 3 v44 a3 3 0 0 1 -3 3 h-16 a3 3 0 0 1 -3 -3 v-44 a3 3 0 0 1 3 -3 Z`, color:h }], flames:()=>`<path d="M66 28 q-4 -4 0 -9 q4 5 0 9 Z" fill="${GOLD}"/>` },
  // freedom star (Juneteenth)
  'star-freedom': { hue:'#C8453B', base:78, parts:(h)=>[{ d:`M66 22 L74 46 L99 46 L79 61 L86 85 L66 70 L46 85 L53 61 L33 46 L58 46 Z`, color:h }] },
  die: { hue:'#A24E8E', base:82, parts:(h)=>[{ d:`M36 30 h60 a8 8 0 0 1 8 8 v40 a8 8 0 0 1 -8 8 H36 a8 8 0 0 1 -8 -8 v-40 a8 8 0 0 1 8 -8 Z`, color:h }], flames:()=>`<g fill="#fff" opacity="0.9"><circle cx="48" cy="46" r="3.4"/><circle cx="66" cy="58" r="3.4"/><circle cx="84" cy="70" r="3.4"/><circle cx="84" cy="46" r="3.4"/><circle cx="48" cy="70" r="3.4"/></g>` },
  // wedding rings (used by any rings/wedding identity)
  rings: { hue:'#D9A441', base:72, parts:()=>{ const dn=(cx)=>`M ${cx-20} 50 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0 Z M ${cx-11} 50 a 11 11 0 1 1 22 0 a 11 11 0 1 1 -22 0 Z`; return [{d:dn(52),color:'#D9A441',er:1},{d:dn(80),color:'#D9A441',er:1}]; } },
  // Ethiopian coffee pot (jebena) — bulb body + tall neck + spout + lid knob
  jebena: { hue:'#3E8E5F', base:80, parts:(h)=>[
      { d:`M46 62 C46 48 54 42 66 42 C78 42 86 48 86 62 C86 73 78 79 66 79 C54 79 46 73 46 62 Z`, color:h },
      { d:`M60 44 L58 24 Q58 20 61 20 L66 20 Q69 20 68 24 L66 44 Z`, color:h },
      { d:`M46 56 C37 54 32 58 33 64 C36 60 41 60 47 61 Z`, color:h },
      { d:`M63 18 a3 3 0 1 1 0.01 0 Z`, color:h } ] },
  // Crawfish (Crawfish Boil) — body + tail fan + 2 claws; legs/antennae in overlay
  crawfish: { hue:'#C8453B', base:74, parts:(h)=>[
      { d:`M48 52 C56 46 76 46 84 52 C88 55 88 61 84 64 C76 70 56 70 48 64 C44 61 44 55 48 52 Z`, color:h },
      { d:`M84 58 L97 49 L91 58 L99 60 L91 62 L97 71 L84 64 Z`, color:h },
      { d:`M48 52 C39 44 29 46 29 54 C29 59 35 60 38 55 C39 52 36 50 33 51 Z`, color:h },
      { d:`M50 60 C42 66 31 66 28 73 C33 70 41 70 49 65 Z`, color:h } ],
    flames:(h)=>`<path d="M48 50 L40 38 M50 53 L42 41" stroke="${mix(h,'black',12)}" stroke-width="2.4" stroke-linecap="round" fill="none"/>` },
  // Sweetgrass basket (Low Country / Gullah) — body + handle band; weave in overlay
  basket: { hue:'#5C6F8E', base:82, parts:(h)=>[
      { d:`M42 54 L90 54 L85 80 L47 80 Z`, color:h },
      { d:`M48 54 C48 36 84 36 84 54 L80 54 C80 40 52 40 52 54 Z`, color:h } ],
    flames:(h)=>`<path d="M44 62 H88 M45 70 H87" stroke="${mix(h,'black',14)}" stroke-width="1.6" opacity="0.7"/><path d="M58 54 V80 M74 54 V80" stroke="${mix(h,'black',14)}" stroke-width="1.4" opacity="0.5"/>` },
  // Pupusa (Pupusa Gathering) — round masa disc; seam + steam in overlay
  pupusa: { hue:'#2E6CB0', base:80, parts:(h)=>[
      { d:`M66 36 C82 36 94 45 94 56 C94 67 82 76 66 76 C50 76 38 67 38 56 C38 45 50 36 66 36 Z`, color:h } ],
    flames:(h)=>`<path d="M50 56 Q66 50 82 56" stroke="${mix(h,'black',16)}" stroke-width="1.8" fill="none" opacity="0.6"/><path d="M58 30 q-3 -4 0 -7 M70 30 q3 -4 0 -7" stroke="${mix(h,'white',30)}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/>` },
  // Serving cloche (Sunday Dinner) — dome + plate; knob in overlay
  cloche: { hue:'#9B3A4A', base:78, parts:(h)=>[
      { d:`M38 64 A28 24 0 0 1 94 64 Z`, color:h },
      { d:`M28 65 Q66 60 104 65 Q66 75 28 65 Z`, color:mix(h,'black',6) } ],
    flames:(h)=>`<circle cx="66" cy="35" r="3" fill="${mix(h,'white',20)}"/><path d="M66 38 V42" stroke="${mix(h,'white',20)}" stroke-width="3" stroke-linecap="round"/>` },
  // Watch Party screen — monitor + play triangle + stand
  'screen-play': { hue:'#3FA0C4', base:86, parts:(h)=>[
      { d:`M28 28 h76 a7 7 0 0 1 7 7 v38 a7 7 0 0 1 -7 7 H28 a7 7 0 0 1 -7 -7 V35 a7 7 0 0 1 7 -7 Z`, color:h } ],
    flames:(h)=>`<path d="M58 42 L80 54 L58 66 Z" fill="${mix(h,'white',60)}"/><path d="M52 86 H80 M66 80 V86" stroke="${mix(h,'black',12)}" stroke-width="4" stroke-linecap="round" fill="none"/>` },
  // Fish Fry — a fish (body + tail fin); eye in overlay
  fish: { hue:'#E2A93B', base:74, parts:(h)=>[
      { d:`M44 56 C44 46 56 42 68 42 C82 42 92 49 94 56 C92 63 82 70 68 70 C56 70 44 66 44 56 Z`, color:h },
      { d:`M46 56 L30 47 L37 56 L30 65 Z`, color:h } ],
    flames:(h)=>`<circle cx="82" cy="52" r="2.4" fill="${mix(h,'black',45)}"/><path d="M64 44 Q70 56 64 68" stroke="${mix(h,'black',14)}" stroke-width="1.6" fill="none" opacity="0.5"/>` },
  // Get-Together — a small group (two people, overlapping)
  users: { hue:'#7A8AB0', base:82, parts:(h)=>[
      { d:`M48 41 a9 9 0 1 1 0.01 0 Z`, color:h },
      { d:`M31 80 C31 64 41 57 48.5 57 C56 57 66 64 66 80 Z`, color:h },
      { d:`M84 45 a8 8 0 1 1 0.01 0 Z`, color:mix(h,'white',12) },
      { d:`M62 80 C62 66 72 60 84 60 C96 60 104 66 104 80 Z`, color:mix(h,'white',12) } ] },
};

let _gid = 0;
// Build the glass SVG markup for a shape entry + hue, at a given size.
export function glassSvg(iconName, hue, size = 56) {
  const sp = GLASS_SHAPES[iconName];
  if (!sp) return null;
  const id = 'gi' + (_gid++);
  const H = hue || sp.hue;
  const parts = sp.parts(H);
  const fy = sp.base + 8;
  let defs = '<defs>';
  parts.forEach((pt, k) => {
    defs += `<linearGradient id="f-${id}-${k}" x1="0.15" y1="0" x2="0.72" y2="1"><stop offset="0" stop-color="${mix(pt.color,'white',30)}"/><stop offset="0.46" stop-color="${pt.color}"/><stop offset="1" stop-color="${mix(pt.color,'black',32)}"/></linearGradient>`;
    defs += `<radialGradient id="e-${id}-${k}" cx="0.42" cy="0.42" r="0.6"><stop offset="0.6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.32)"/></radialGradient>`;
    defs += `<clipPath id="cp-${id}-${k}"><path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''}/></clipPath>`;
  });
  defs += `<linearGradient id="rim-${id}" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.95)"/><stop offset="0.5" stop-color="rgba(255,255,255,0.30)"/><stop offset="1" stop-color="rgba(255,255,255,0.16)"/></linearGradient>`;
  defs += `<linearGradient id="sheen-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.22)"/><stop offset="0.4" stop-color="rgba(255,255,255,0)"/></linearGradient>`;
  defs += `<filter id="bl-${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  defs += `<filter id="bl2-${id}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4.5"/></filter>`;
  defs += `<clipPath id="cl-${id}">${parts.map(pt=>`<path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''}/>`).join('')}</clipPath></defs>`;
  let s = '';
  s += `<ellipse cx="68" cy="${fy}" rx="44" ry="5.5" fill="#000" opacity="0.4" filter="url(#bl2-${id})"/>`;
  s += `<ellipse cx="66" cy="${fy-1}" rx="30" ry="3.6" fill="#000" opacity="0.5" filter="url(#bl-${id})"/>`;
  s += `<ellipse cx="62" cy="${fy-1.5}" rx="13" ry="2.4" fill="${mix(H,'white',38)}" opacity="0.3" filter="url(#bl-${id})"/>`;
  // A shape may declare gscale (+ optional gcx/gcy center) when its authored paths read
  // small in the dome relative to peers (e.g. the wide-but-thin crab). We scale the WHOLE
  // glyph — body + overlay (flames: eye-stalks/legs) — about its center so it keeps weight.
  let g = `<g>`;
  g += parts.map((pt,k)=>`<path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="url(#f-${id}-${k})"/>`).join('');
  g += parts.map((pt,k)=>`<path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="url(#e-${id}-${k})"/>`).join('');
  g += parts.map((pt,k)=>`<g clip-path="url(#cp-${id}-${k})"><path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="none" stroke="rgba(255,255,255,0.36)" stroke-width="3.2"/><path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="1.3" transform="translate(0.7,1)"/></g>`).join('');
  g += `<g clip-path="url(#cl-${id})"><rect x="0" y="0" width="132" height="98" fill="url(#sheen-${id})"/><polygon points="6,18 58,12 48,28 -4,36" fill="rgba(255,255,255,0.24)"/><circle cx="41" cy="24" r="4.6" fill="#fff" opacity="0.95"/><circle cx="50" cy="31" r="2" fill="#fff" opacity="0.6"/></g>`;
  g += parts.map(pt=>`<path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="none" stroke="#5fd0ff" stroke-width="1" opacity="0.5" transform="translate(-0.7,-0.7)"/><path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="none" stroke="#ff6b8a" stroke-width="1" opacity="0.45" transform="translate(0.8,0.9)"/>`).join('');
  g += parts.map(pt=>`<path d="${pt.d}" ${pt.er?'fill-rule="evenodd"':''} fill="none" stroke="url(#rim-${id})" stroke-width="1.25"/>`).join('');
  g += `</g>`;
  if (sp.flames) g += sp.flames(H);
  if (sp.gscale) { const cx = sp.gcx ?? 66, cy = sp.gcy ?? 54; g = `<g transform="translate(${cx},${cy}) scale(${sp.gscale}) translate(${-cx},${-cy})">${g}</g>`; }
  s += g;
  return `<svg width="${size}" height="${Math.round(size*0.78)}" viewBox="0 0 132 98" aria-hidden="true">${defs}${s}</svg>`;
}

export function hasGlassShape(iconName) { return !!GLASS_SHAPES[iconName]; }

// Flat rendering of the SAME identity shape — for small/badge contexts (headers, chips, nav)
// where the full glass volume is too heavy but the identity must still READ as itself, never
// degrade to a generic flat-icon fallback. Same paths + authored colors as the glass shape,
// minus the dome/gradients/sheen. This is what keeps a Juneteenth header a freedom-star, not a spark.
export function monoSvg(iconName, hue, size = 22) {
  const sp = GLASS_SHAPES[iconName];
  if (!sp) return null;
  const H = hue || sp.hue;
  const parts = sp.parts(H);
  // CLEAN silhouette only — the main filled volumes, in their authored colors. Deliberately DROPS
  // the decorative detail strokes (flames / crab legs / candle wicks): those are fixed-width and
  // read as crowded/muddy at 18-22px. The filled body carries the identity; the hero glass keeps
  // the full detail. This is what makes the small header/nav mark light, not busy.
  const g = parts.map((pt) => `<path d="${pt.d}" ${pt.er ? 'fill-rule="evenodd"' : ''} fill="${pt.color}"/>`).join('');
  const inner = sp.gscale ? `<g transform="translate(${sp.gcx ?? 66},${sp.gcy ?? 54}) scale(${sp.gscale}) translate(${-(sp.gcx ?? 66)},${-(sp.gcy ?? 54)})">${g}</g>` : g;
  return `<svg width="${size}" height="${Math.round(size * 0.78)}" viewBox="0 0 132 98" aria-hidden="true">${inner}</svg>`;
}

// React wrapper. Returns null when there's no glass shape (caller falls back to glyph).
export function GlassIcon({ icon, hue, size = 56 }) {
  const html = glassSvg(icon, hue, size);
  if (!html) return null;
  return React.createElement('span', { 'aria-hidden': true, style: { display: 'inline-flex', lineHeight: 0 }, dangerouslySetInnerHTML: { __html: html } });
}
