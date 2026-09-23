// ─── A ROUTE NOBODY CALLS ────────────────────────────────────────────────────
//
// `backend/app/routers/kroger.py` is 231 lines: OAuth client-credentials with
// token caching, fuzzy product matching against a host's shopping list, and
// store lookup by ZIP. Three endpoints. Nothing in either shell calls any of
// them, and nothing ever did.
//
// It is the backend twin of the defect `engineReachesTheShippingShell` was
// written for, and it needs its own instrument for the same reason: every test
// in this repo proves a route WORKS, and none asks whether anything reaches it.
//
// WHAT MAKES THIS HARDER THAN THE LIBRARY VERSION. Library calls are imports,
// which are declarations. HTTP calls are STRINGS, and this codebase composes
// them — `commApi.js` builds `const base = (id) => \`/api/events/${id}/communication\``
// and then calls `${base(eventId)}/channels/${type}/read`. A matcher that looks
// for the literal route path finds none of those ten and reports a working
// feature as dead. The first draft of this file did exactly that.
//
// So it resolves one level of template helper before matching. That is enough
// for this codebase and it is checked by a premise test below, because an
// over-eager matcher (one that marks everything called) is the failure that
// would make this file quietly worthless.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');

// ── the routes FastAPI actually registers ──────────────────────────────────
const routes = () => {
  const dir = path.join(ROOT, 'backend', 'app', 'routers');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.py'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const pre = (/APIRouter\(prefix="([^"]+)"/.exec(src) || [])[1] || '';
    for (const m of src.matchAll(/@router\.(get|post|put|patch|delete)\("([^"]*)"/g)) {
      out.push({ module: f.replace(/\.py$/, ''), method: m[1].toUpperCase(), path: (pre + m[2]) || '/' });
    }
  }
  return out;
};

// ── every URL-ish string the frontend builds ───────────────────────────────
const frontendPaths = () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!/node_modules|build|__tests__/.test(p)) walk(p); continue; }
      if (/\.(js|jsx|mjs)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  walk(path.join(ROOT, 'hostv2', 'src'));

  const out = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // One level of helper resolution: `const base = (id) => `/api/…``
    const helpers = new Map();
    for (const m of src.matchAll(/const\s+([A-Za-z0-9_$]+)\s*=\s*\([^)]*\)\s*=>\s*`([^`]*\/api\/[^`]*)`/g)) {
      helpers.set(m[1], m[2]);
    }
    for (const m of src.matchAll(/[`'"]([^`'"\n]*\/api\/[^`'"\n]*)[`'"]/g)) out.add(m[1]);
    for (const m of src.matchAll(/[`]([^`\n]*\$\{[A-Za-z0-9_$]+\([^`]*)[`]/g)) {
      let s = m[1];
      // Replace the WHOLE `${base(id)}` expression with the helper's template.
      // Splitting on the prefix alone left the closing brace behind and every
      // composed route failed to match — the bug this premise test now pins.
      for (const [name, tpl] of helpers) {
        s = s.replace(new RegExp(`\\$\\{${name}\\([^)]*\\)\\}`, 'g'), tpl);
      }
      if (s.includes('/api/')) out.add(s);
    }
  }
  return [...out];
};

// A route and a frontend string match when their shapes agree: every `{param}`
// and every `${expr}` collapses to one wildcard segment.
const shape = (s) => String(s)
  .replace(/\?.*$/, '')
  .replace(/\$\{[^}]*\}/g, '*')
  .replace(/\{[^}]+\}/g, '*')
  .replace(/\/+$/, '');

const CALLED = (() => {
  const fe = frontendPaths().map(shape);
  return (route) => {
    const want = shape(route);
    return fe.some((got) => got === want || got.endsWith(want) || want.endsWith(got));
  };
})();

// ── WHO ELSE CALLS A ROUTE, BESIDES OUR OWN FRONTEND ───────────────────────
// A webhook or an OAuth redirect is called by Stripe or DocuSign, and a status
// probe is for whoever is configuring the box. Those are not dead; they have a
// caller this repo cannot see. Each is named with who calls it, so the list is
// a set of decisions rather than a place to hide an uncalled route.
const CALLED_FROM_OUTSIDE = {
  '/api/docusign/callback': 'DocuSign redirects the browser here after the OAuth consent screen.',
  '/api/docusign/webhook': 'DocuSign Connect POSTs envelope events here.',
  '/api/stripe/webhook': 'Stripe POSTs checkout events here; the signature is verified server-side.',
  '/api/stripe/status': 'Operator probe — is the Stripe key set on this deployment.',
  '/api/weather/status': 'Operator probe — is the weather key set.',
  '/api/webhooks/status': 'Operator probe — is the relay configured.',
  '/api/shopping/instacart/status': 'Operator probe — is the Instacart key set.',
  '/api/shopping/kroger/status': 'Operator probe — are the Kroger client id/secret set.',
};

// ── BUILT AND NOT WIRED ────────────────────────────────────────────────────
// The point of the file. Each entry is a decision someone has to make, not a
// number to raise: either a shell should call it, or it should go.
//
// IT STARTED WITH THREE. `portal-respond` was listed here on a hand-read of
// commApi's `req(...)` call sites, which missed `commApi.portalRespond` — a
// helper App.js calls at :14892. The matcher caught the mistake through the
// staleness test below, which is exactly what that test is for: this list rots
// in both directions, and a stale "not wired" is a map that sends the next
// person to rebuild something that already works.
//
// IT IS NOW EMPTY, AND THAT IS THE POINT OF KEEPING IT. Both Kroger routes left
// this list on 2026-09-23 when the host shell grew a store picker and the three
// price layers — and they left because this file's staleness test FAILED and
// made them leave. That is the guard working in the direction nobody builds
// for: not catching a new dead route, but refusing to keep calling a live one
// dead. An empty object here is a claim ("nothing is built and unwired"), and
// the two tests below are what keep it a true one.
const BUILT_NOT_WIRED = {};

describe('every backend route has someone who calls it', () => {
  test('(premise) the backend is actually being read', () => {
    // If the routers move, this file must fail loudly rather than pass on an
    // empty list — a guard over nothing is the failure mode that matters most.
    const r = routes();
    expect(r.length).toBeGreaterThan(50);
    expect(r.some((x) => x.path === '/api/food-prices')).toBe(true);
  });

  test('(premise) the matcher resolves COMPOSED urls, not just literals', () => {
    // commApi builds `${base(eventId)}/channels`. The first draft of this
    // matcher missed all ten communication routes and reported a working
    // feature as dead. This is the test that keeps it honest.
    expect(CALLED('/api/events/{event_id}/communication/channels')).toBe(true);
    expect(CALLED('/api/events/{event_id}/communication/channels/{channel_type}/read')).toBe(true);
  });

  test('(premise) …and is not so eager that everything looks called', () => {
    // The opposite failure: a matcher that says yes to anything proves nothing.
    //
    // This used to assert on `/api/shopping/kroger/search-list`, a route that
    // was real and genuinely uncalled — a better negative than a fabricated one,
    // right up until the shell called it and this assertion became the thing
    // standing between the codebase and the truth. Fabricated paths now, shaped
    // like real ones so the matcher has to actually reject them rather than
    // failing on something obviously malformed.
    expect(CALLED('/api/definitely/not/a/real/route')).toBe(false);
    expect(CALLED('/api/shopping/kroger/aisle-map')).toBe(false);
    expect(CALLED('/api/events/{event_id}/communication/carrier-pigeon')).toBe(false);
  });

  test('THE GUARD: every route is called, or named as external, or named as unwired', () => {
    const unexplained = routes()
      .filter((r) => !CALLED(r.path))
      .filter((r) => !CALLED_FROM_OUTSIDE[r.path] && !BUILT_NOT_WIRED[r.path])
      .map((r) => `${r.method} ${r.path}`)
      .sort();
    // Named, not counted: a new route nobody calls has to say which it is.
    expect(unexplained).toEqual([]);
  });

  test('…and nothing is named that is actually being called', () => {
    // The list rots the other way too. A route that gets wired must leave this
    // file, or the next person trusts a stale map.
    const stale = [...Object.keys(BUILT_NOT_WIRED)].filter((p) => CALLED(p));
    expect(stale).toEqual([]);
  });

  test('every exception says WHO calls it, or what decision is open', () => {
    for (const [p, why] of Object.entries({ ...CALLED_FROM_OUTSIDE, ...BUILT_NOT_WIRED })) {
      expect(why.length).toBeGreaterThan(30);
      expect(p.startsWith('/api/')).toBe(true);
    }
  });
});
