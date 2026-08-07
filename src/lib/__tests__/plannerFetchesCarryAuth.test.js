// ── THE CALLER HALF OF A SERVER-SIDE AUTH FIX IS UNPINNED BY DEFAULT ────────
//
// Two endpoints became planner-only this sprint: the webhook relay (its
// anonymous SSRF) and Stripe checkout (its anonymous charge-minting). Each fix
// required the CALLER to start sending auth headers, or the feature would ship
// as a 401.
//
// Nothing guarded that. A refactor that drops the spread from one fetch
// produces no test failure — the only symptom is a 401 surfacing in a toast,
// and `webhookService` swallows its error into a delivery-log entry.
//
// This is a SOURCE-PROOF test, in the idiom this repo already uses for CTA
// truthfulness: it reads the modules and asserts the shape, because the thing
// being protected is that a specific line does not get deleted.
const fs = require('fs');
const path = require('path');

// module -> the paths in it that require planner auth server-side
const GATED = {
  'stripeApi.js': ['/api/stripe/create-checkout-session', '/api/stripe/verify-session',
    '/api/stripe/create-subscription-session'],
  'webhookService.js': ['/api/webhooks/relay'],
};

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('planner-gated fetches carry auth', () => {
  test.each(Object.keys(GATED))('%s imports the shared header helper', (file) => {
    // Re-deriving the headers locally is the other way this breaks: two places
    // to update when the Supabase rollout finishes, and one of them forgotten.
    expect(read(file)).toMatch(/import \{[^}]*plannerAuthHeaders[^}]*\} from '\.\/commApi'/);
  });

  test.each(Object.entries(GATED))('every gated fetch in %s spreads it', (file, paths) => {
    const src = read(file);
    const missing = [];
    for (const p of paths) {
      // EVERY occurrence, not the first. These paths are also named in the
      // module's own header comment, and matching that instead of the fetch is
      // how the first version of this test failed on correct code.
      const spots = [];
      for (let i = src.indexOf(p); i !== -1; i = src.indexOf(p, i + 1)) spots.push(i);
      if (!spots.length) { missing.push(`${p} (call site gone — update this list)`); continue; }
      const ok = spots.some((at) => {
        const before = src.slice(Math.max(0, at - 200), at);
        const after = src.slice(at, at + 420);
        return /fetch\(/.test(before) && /plannerAuthHeaders\(\)/.test(after);
      });
      if (!ok) missing.push(p);
    }
    expect({ file, withoutAuth: missing }).toEqual({ file, withoutAuth: [] });
  });

  test('the helper is actually exported (premise)', () => {
    // Without this, a renamed export would make the regex above fail loudly —
    // but a DELETED one would leave the import matching a stale name while the
    // call resolves to undefined at runtime.
    const comm = read('commApi.js');
    expect(comm).toMatch(/export async function plannerAuthHeaders/);
  });

  test('it sends a bearer token or the dev token, not nothing', () => {
    const comm = read('commApi.js');
    expect(comm).toMatch(/Authorization.*Bearer/);
    expect(comm).toMatch(/X-Planner-Token/);
  });
});
