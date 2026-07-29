// ─── CTAs NAME THE ACT (host ruling 2026-07-28) ──────────────────────────────
//
// "app is not supposed to have do this CTAs" … "they should be the action
// needed." A button that says "Do this first" / "Handle this" / "Take me to it"
// describes the HOST moving, not the work — and at the tiers where those labels
// lived, the layer emitting them has no idea what the act even is. UX_05's rule
// is the same one: buttons carry verbs about the work, not nouns and not trips.
//
// This gate sweeps every CTA-producing surface so the class cannot regrow: the
// persona VOICE table, the playbook engine's authored CTAs, and the checklist
// route labels. Where a tier genuinely can't know the act, the fix is to OMIT
// the override so the engine's concrete label passes through — never to
// substitute a generic one.
const { VOICE } = require('../nextActionRenderer');
const { checklistRouteFor } = require('../taskRoute');
const { ALL_PLAYBOOKS, playbookChecklist } = require('../playbooks');

// Labels that describe travel or vagueness instead of the work.
const BANNED = [
  /^do (this|it)\b/i,
  /^handle (this|it)\b/i,
  /^take me to/i,
  /^go\b/i,
  /^continue$/i,
  /^click here/i,
  /^tap here/i,
  /^learn more$/i,
  /^see (it|more)$/i,
  /^open$/i,          // bare "Open" names no object
  /^view$/i,
];
const isBanned = (label) => BANNED.some((re) => re.test(String(label || '').trim()));
// Same rules, NO trim — for source literals, where a trailing space is the
// signal that the string is a concatenation fragment ('Open ' + vendName) and
// not the whole label. Trimming it first would fail the bare-verb rule against
// a button that actually reads "Open Fired Up BBQ".
const isBannedRaw = (label) => BANNED.some((re) => re.test(String(label || '')));

describe('no CTA describes a trip instead of the work', () => {
  test('every persona VOICE primaryCta names an act', () => {
    const bad = [];
    for (const [category, personas] of Object.entries(VOICE || {})) {
      for (const [persona, entry] of Object.entries(personas || {})) {
        const out = typeof entry === 'function' ? entry({ moreCount: 2, title: 'x', settleCount: 1 }) : entry;
        const cta = out && out.primaryCta;
        if (cta && isBanned(cta)) bad.push(`${category}.${persona} → "${cta}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every checklist route label names an act', () => {
    const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
    const bad = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      const ev = { id: 'cta', type, date: iso(45), guests: 24, venueCity: 'McHenry', venueState: 'MD' };
      let rows = [];
      try { rows = playbookChecklist(ev) || []; } catch { rows = []; }
      for (const t of rows) {
        const task = typeof t === 'string' ? t : t.task;
        let hit = null;
        try { hit = checklistRouteFor(task, { week: t.week, category: t.category }, ev); } catch { /* covered elsewhere */ }
        if (hit && isBanned(hit.label)) bad.add(`${type} :: "${hit.label}"`);
      }
    }
    expect([...bad]).toEqual([]);
  });

  // ── THE PRODUCER SWEEP (added 2026-07-28 after the class regrew) ───────────
  //
  // The two tests above walk the VOICE table and the checklist router — and the
  // host still found "Do this" on the live hero the same day. It came from the
  // CommandCenter tier ladder, a THIRD producer neither test touched. Same
  // lesson the policy-fork gate taught: a gate closes a class only if it spans
  // every tree and idiom that can emit one.
  //
  // Running the whole ladder would need a fixture per tier and would still only
  // cover the branches that happen to fire. A literal scan covers every branch
  // unconditionally, including ones no fixture reaches.
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.resolve(__dirname, '../../..');
  const CTA_FILES = [
    'src/CommandCenter.jsx',
    'src/lib/phaseProgress.js',
    'src/lib/nextActionRenderer.js',
    'src/lib/taskRoute.js',
    'hostv2/src/HostShellV2.jsx',
  ].filter((f) => fs.existsSync(path.join(ROOT, f)));

  // Comments explain the rule and quote the banned labels — scanning them would
  // fail the gate on its own documentation.
  const stripComments = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/(^|[^:'"])\/\/.*$/, '$1')).join('\n');

  const CTA_KEY = /(?:primaryCta|secondaryCta|actionLabel|ctaLabel|cta)\s*:\s*'([^']*)'/g;

  test('every CTA literal in every producer names an act', () => {
    const bad = [];
    for (const f of CTA_FILES) {
      const src = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'));
      let m;
      while ((m = CTA_KEY.exec(src))) {
        const label = m[1].trim();
        // 'Go' is the ONE sanctioned sentinel: the shell rewrites it into
        // "Open <real destination>" so the button still names where it lands.
        // Proven still live by the test below — if that translation is ever
        // deleted, this exemption fails with it rather than rotting open.
        if (label === 'Go') continue;
        if (isBanned(label)) bad.push(`${f} → "${label}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  test("the 'Go' sentinel exemption is still earned — the shell translates it", () => {
    const shell = fs.readFileSync(path.join(ROOT, 'hostv2/src/HostShellV2.jsx'), 'utf8');
    // ONE helper does the translation for every render site. If it is deleted or
    // stops handling the sentinel, the exemption above dies with it.
    expect(shell).toMatch(/function ctaLabelFor\(/);
    expect(shell).toMatch(/if \(given && given !== 'Go'\) return given;/);
    expect(shell).toMatch(/return 'Open ' \+ where;/);
  });

  // The scan above reads OBJECT KEYS (`cta: '…'`). The host's live report was a
  // button whose label was JSX TEXT — `<button className="cta">Take me to it
  // </button>` — which no key-based regex can see. Four of those were sitting in
  // the shell, untouched by every engine-side cleanup. Both idioms, or neither.
  // "Do it for me" is the PRODUCT NAME of the DIFM feature (lib/doItForMe.js) —
  // the app writing the thing for you. It reads as `^do it` but it is the exact
  // opposite of a vague trip label: it names precisely what the button does.
  const ALLOWED_FEATURE_NAMES = new Set(['Do it for me']);

  test('no banned label is hard-typed as JSX button text', () => {
    const bad = [];
    for (const f of ['hostv2/src/HostShellV2.jsx', 'hostv2/src/InviteV2.jsx']) {
      const full = path.join(ROOT, f);
      if (!fs.existsSync(full)) continue;
      const src = stripComments(fs.readFileSync(full, 'utf8'));
      // Literal text between a <button …> and its </button>, plus the ternary
      // string literals inside a button's children.
      // `(?:=>|[^>])` — the arrow alternative must come FIRST, or the lazy
      // quantifier stops at the `>` of an onClick arrow function and the "tag"
      // ends mid-attribute.
      const BTN = /<button\b(?:=>|[^>])*?>([^<{]{2,60})</g;
      let m;
      while ((m = BTN.exec(src))) {
        const label = m[1].trim();
        if (label && isBanned(label) && !ALLOWED_FEATURE_NAMES.has(label)) bad.push(`${f} → "${label}"`);
      }
      // Ternary/expression labels — isBannedRaw, see above.
      const INLINE = /<button\b(?:=>|[^>])*?>\{[^}]*?'([^']{2,60})'/g;
      while ((m = INLINE.exec(src))) {
        const label = m[1];
        if (label.trim() !== 'Go' && isBannedRaw(label) && !ALLOWED_FEATURE_NAMES.has(label.trim())) bad.push(`${f} → "${label.trim()}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every phase cue names its destination as an act', () => {
    const { cueActionLabel } = require('../phaseProgress');
    for (const id of ['datetime', 'location', 'headcount', 'food', 'shopping',
      'vendors', 'rain', 'budget', 'payments', 'thankyous', 'rentals', 'ros-next']) {
      const label = cueActionLabel({ id });
      expect(isBanned(label)).toBe(false);
      expect(label.length).toBeGreaterThan(4);   // not a bare verb
    }
    // An unknown cue still gets a real label, never a trip.
    expect(isBanned(cueActionLabel({ id: 'something-new' }))).toBe(false);
  });

  test('the banned list actually bites (guard against a dead gate)', () => {
    expect(isBanned('Do this first')).toBe(true);
    expect(isBanned('Handle this')).toBe(true);
    expect(isBanned('Take me to it')).toBe(true);
    expect(isBanned('Open')).toBe(true);
    // …and real labels pass
    expect(isBanned('Open the list')).toBe(false);
    expect(isBanned('Make the call')).toBe(false);
    expect(isBanned('Set the start time')).toBe(false);
    expect(isBanned('Build the day')).toBe(false);
  });
});

// ─── THE LABEL AND THE ROUTE MUST COME FROM ONE RESOLUTION ───────────────────
//
// Host, 2026-07-28: "this CTA destination is not correct." The hero read
// "Open travel & stays" and landed on the plan list. Cause: the compression
// tier took the LABEL from the checklist router but kept the task deep-link as
// its ROUTE — I had even written a comment calling the task row "tighter".
//
// A label naming one destination while the route goes to another is a lying CTA
// wearing an honest name, which is worse than the generic label it replaced:
// "Do this" at least promised nothing.
describe('a hero CTA goes where its label says', () => {
  const fs = require('fs');
  const path = require('path');
  const cc = fs.readFileSync(path.resolve(__dirname, '../..', 'CommandCenter.jsx'), 'utf8');

  test('label and route both read the same resolution', () => {
    expect(cc).toMatch(/const routerHit = _lead \? _lead\.hit : null;/);
    expect(cc).toMatch(/primaryCta: routerHit\.label,/);
    expect(cc).toMatch(/primaryRoute: routerHit\.route,/);
  });

  // ── THE HERO NEVER LANDS ON A LIST (host ruling 2026-07-28) ────────────────
  // "dont have the hero CTAs go to the checklist. They should have final
  // destination. not 2 click to get to the deal."
  test('a row the router cannot PLACE never becomes the hero', () => {
    // The tier leads with the first do-now row that resolves to a real
    // destination, and explicitly refuses routes back onto the task list.
    expect(cc).toMatch(/hit\.route\.tab === 'Planning Tasks' \|\| hit\.route\.tab === 'Timeline'/);
    expect(cc).toMatch(/if \(!routerHit\) return null;/);
  });

  test('no checklist fallback label survives in this tier', () => {
    const tier = cc.slice(cc.indexOf('THE HERO NEVER LANDS ON THE CHECKLIST'));
    const block = tier.slice(0, tier.indexOf('// Tier 5'));
    expect(block).not.toMatch(/'Open your checklist'/);
  });

  test('the label is never taken from the router while the route ignores it', () => {
    // The exact shape of the defect: hit.label used with firstRoute alongside.
    expect(cc).not.toMatch(/hit && hit\.label\)[\s\S]{0,400}primaryRoute: firstRoute,/);
  });
});

// ─── "THEN, IN ORDER" — NO ARROW WITHOUT A DESTINATION ───────────────────────
//
// Host ask 2026-07-28: "audit Then in Order for dead links."
//
// Result of the sweep — 39 playbooks × T-45/14/3, every row's route through
// resolveRoute: ZERO dead links. Nothing in that list currently fails to open.
//
// But the arrow was rendered UNCONDITIONALLY, so the promise was structural
// rather than earned: the first row to arrive without a resolvable route would
// have shown a → and then toasted "Not wired here yet". This gate keeps the
// glyph tied to the navigation, so the class cannot appear at all.
describe('the then-in-order rows only promise what they deliver', () => {
  const fs = require('fs');
  const path = require('path');
  const shell = fs.readFileSync(
    path.resolve(__dirname, '../../..', 'hostv2/src/HostShellV2.jsx'), 'utf8');

  test('the row arrow is conditional, not hard-coded', () => {
    expect(shell).toMatch(/\{goes && <span className="ef-g" aria-hidden="true">→<\/span>\}/);
    expect(shell).not.toMatch(/<span className="ef-g" aria-hidden="true">→<\/span><\/span>\s*\n\s*<\/button>/);
  });

  test('a then-row never takes the settle-in-place path', () => {
    // ── THE FOUR DEAD ROWS (host click-through, 2026-07-28) ──────────────────
    // onCta's settle branch does `setEditor(key); spotlight(key)`, and the
    // editor slot renders at exactly ONE site — inside the HERO card. A Then
    // row passes its own row key, so setEditor set state nothing rendered and
    // spotlight scrolled to an element that did not exist: rain, food,
    // shopping and seats all dimmed and did nothing. Below the fold there is
    // no "in place" to settle into, so openThen must ROUTE a wiredKind row.
    const body = (shell.match(/const openThen = \(a, key\) => \{[\s\S]*?\n                \};/) || [''])[0];
    expect(body).toBeTruthy();
    expect(body).toMatch(/if \(wiredKind\(a\)\) \{[\s\S]*?routeSheet\(a\.route\)/);
    // …and it must say so honestly when it cannot, never fall through silently.
    expect(body).toMatch(/toast\(/);
    // The editor slot is hero-only — if a second slot is ever added below the
    // fold this assertion should be revisited deliberately, not drift.
    expect((shell.match(/className="editor-slot"/g) || []).length).toBe(1);
  });

  test('every route the then-list can emit still resolves', () => {
    // The sweep, kept as a live gate rather than a one-off finding.
    const { eventPlan } = require('../../CommandCenter');
    const { resolveRoute } = require('../routeResolver');
    const { ALL_PLAYBOOKS } = require('../playbooks');
    const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };
    const dead = [];
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      for (const days of [45, 14, 3]) {
        let plan = null;
        try {
          plan = eventPlan({ id: 'dl', type, date: iso(days), guestCount: 24,
            venueCity: 'McHenry', venueState: 'MD', totalBudget: 5000 });
        } catch (_e) { continue; }
        for (const a of ((plan && plan.queue) || []).slice(1).filter((x) => x && x.level !== 'critical')) {
          if (a.kind === 'bundle') continue;            // bundles open their own sheet
          let r = null;
          try { r = resolveRoute(a.route); } catch (_e) { r = null; }
          // A row with no route at all is allowed — it simply wears no arrow now.
          if (a.route && !r) dead.push(`${type} @T-${days} :: ${String(a.title || '').slice(0, 50)}`);
        }
      }
    }
    expect(dead).toEqual([]);
  });
});
