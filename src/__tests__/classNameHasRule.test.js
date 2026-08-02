// ─── CLASSNAME SOURCE-OF-TRUTH — every class the shell writes must be styled ──
//
// Todd (2026-08-01), after the CTA inventory found `cta stay` on three buttons
// with no `.stay` rule anywhere: "gate it." This is the SECOND time the same bug
// shipped — `cta big` did it in July for the three biggest moments in the app,
// was caught by hand, and fixed by hand. Twice is systemic. A hand audit found
// this one; a hand audit will miss the third.
//
// The failure mode is silent by construction: CSS drops a selector that matches
// nothing, React renders the className regardless, and the button quietly
// becomes its base style. Nothing errors. Nothing looks broken. The variant
// simply never existed.
//
// THE GATE: a class the shell writes must appear in at least one selector.
// That is the whole rule, and it is unambiguous — it catches both historical
// bugs and cannot produce a false positive.
//
// WHAT THIS DELIBERATELY DOES NOT CHECK, and why:
//
// The same audit flagged `.confrow` as a scope risk — it is styled only under
// `.hero.elegant`, so used anywhere else it renders as a browser default. The
// obvious second check is "every class must be reachable without an ancestor."
// That was written, run, and removed: it flags ~20 legitimate classes
// (`.nb-label`, `.p-row`, `.sv-meta`, `.wl`/`.wn`/`.ww`, `.nr-l`/`.nr-r`)
// because **descendant-scoping is the house style here**, not an anomaly.
//
// `.confrow` is not unusual in SHAPE. It is only risky if it is used outside
// its parent — and whether it is cannot be answered from the stylesheet. The
// hero className is composed at runtime from `elegantMode`, so that question
// needs the surface driven, not a regex. Encoding it here would mean a
// twenty-entry registry that nobody prunes, and a registry nobody prunes stops
// being evidence.
//
// An earlier near-miss is worth recording for whoever widens this: `.frow`,
// `.line` and `.fstat` all LOOKED like compound-only classes and were not —
// each has a real bare rule. A checker that treats `.frow.dragging` as proof
// that `.frow` is styled reports a clean sheet on a broken one, which is the
// same shortcut that would have hidden `.stay`.

import fs from 'fs';
import path from 'path';

const HOSTV2 = path.join(__dirname, '..', '..', 'hostv2', 'src');
const JSX = path.join(HOSTV2, 'HostShellV2.jsx');
const CSS = path.join(HOSTV2, 'styles.css');

// ── Classes that are styled somewhere this test cannot see, or are not style
//    hooks at all. Grown ONLY with a reason — an entry here is a promise that
//    the class is doing something real.
const NOT_STYLE_HOOKS = new Set([
  // Structural/no-op tokens React or the DOM consumes directly.
  'sr-only',
]);

// ── BASELINE: phantoms already shipping when this gate landed (2026-08-01).
//
//    The gate is introduced GREEN so it can land beside a parallel session's
//    work without breaking their build — but it is shrink-only. Two assertions
//    hold the line: nothing new may join this list, and an entry that stops
//    being a phantom must be REMOVED from it. Delete the className, delete the
//    line here, and the baseline gets smaller. It cannot grow.
//
//    The hand audit found ONE of these (`stay`). The other seven are why this
//    file exists.
const KNOWN_PHANTOMS = new Set([
  'stay',          // 3 uses — `cta stay`. The one the CTA inventory caught.
  'agenda',        // 1 use
  'cvb-brief',     // 1 use
  'draft-body',    // 1 use
  'eb-text',       // 1 use
  'latercard',     // 1 use
  'lodge-req',     // 1 use
  'vc-statuspick', // 1 use
]);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every class token the JSX writes from an UNAMBIGUOUS position:
 *   className="a b"        — a plain attribute
 *   className={`a ${x} b`} — the static segments of a template literal
 *
 * DELIBERATE GAP: string literals inside a general braced expression
 * (`className={cond ? 'a' : 'b'}`) are NOT harvested. A first cut did harvest
 * them and reported 30 phantoms, of which 28 were noise — comparison operands
 * (`mode === 'Plan'`), enum values, and dynamic prefixes. A gate that cries
 * wolf gets muted, and a muted gate is worse than none.
 *
 * Both historical bugs this test exists for — `cta stay` and `cta big` — were
 * plain string attributes, so the tight scope still covers the real failure
 * mode. If a phantom ever ships from a ternary, widen this and pay the noise
 * cost then, with the evidence in hand.
 */
function classNamesWrittenBy(source) {
  const tokens = new Set();
  const add = (raw) => raw
    .split(/\s+/)
    .filter(Boolean)
    // A trailing hyphen is a dynamic prefix — `rv-${kind}` leaves `rv-` once
    // the hole is removed. That is a computed class, not a phantom.
    .filter((t) => !t.endsWith('-'))
    .filter((t) => /^[a-z][\w-]*$/.test(t))
    .forEach((t) => tokens.add(t));

  const plain = /className="([^"{}]*)"/g;
  let m;
  while ((m = plain.exec(source)) !== null) add(m[1]);

  const tpl = /className=\{`([^`]*)`\}/g;
  while ((m = tpl.exec(source)) !== null) add(m[1].replace(/\$\{[^}]*\}/g, ' '));

  return tokens;
}

/** Every selector in the stylesheet, comments and at-rule preludes removed. */
function selectorsIn(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  // Everything between a block boundary and the next `{` is a selector list.
  const re = /(^|[}{;])\s*([^{}@;]+?)\s*\{/g;
  let m;
  while ((m = re.exec(noComments)) !== null) {
    m[2].split(',').forEach((s) => {
      const sel = s.trim();
      if (sel) out.push(sel);
    });
  }
  return out;
}

function isMentionedAnywhere(cls, selectors) {
  const escaped = cls.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
  const anywhere = new RegExp(`\\.${escaped}(?![\\w-])`);
  return selectors.some((sel) => anywhere.test(sel));
}

// ─────────────────────────────────────────────────────────────────────────────

describe('className source of truth — hostv2', () => {
  const jsx = fs.readFileSync(JSX, 'utf8');
  const css = fs.readFileSync(CSS, 'utf8');
  const written = [...classNamesWrittenBy(jsx)].filter((c) => !NOT_STYLE_HOOKS.has(c));
  const selectors = selectorsIn(css);

  it('reads both source files and finds real content', () => {
    // Guards the guard: a regex that silently matches nothing would make every
    // assertion below vacuously pass.
    expect(written.length).toBeGreaterThan(50);
    expect(selectors.length).toBeGreaterThan(200);
    expect(written).toContain('cta');
    expect(selectors.some((s) => s.trim() === '.cta')).toBe(true);
  });

  const phantoms = written.filter((c) => !isMentionedAnywhere(c, selectors));

  it('no NEW class ships without a rule', () => {
    // A phantom renders as its base style and signals nothing. Delete the
    // token, or add the rule in the SAME change that adds the className.
    const added = phantoms.filter((c) => !KNOWN_PHANTOMS.has(c)).sort();
    expect({ added }).toEqual({ added: [] });
  });

  it('the phantom baseline only shrinks', () => {
    // An entry that is no longer a phantom has been fixed — take it out, so the
    // list keeps telling the truth about what is left. A baseline nobody prunes
    // stops being a baseline and becomes a permission slip.
    const fixedButStillListed = [...KNOWN_PHANTOMS]
      .filter((c) => !phantoms.includes(c))
      .sort();
    expect({ fixedButStillListed }).toEqual({ fixedButStillListed: [] });
  });
});
