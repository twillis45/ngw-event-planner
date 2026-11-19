// ─── THE ONE-EVENT PASS PRICE, PER DEVICE (plan item G86, owner 11/19/2026) ──
//
// "A $49 test (second Stripe price)". The server owns the price: it charges
// PASS_AMOUNT_CENTS ($39) unless PASS_PRICE_TEST_CENTS/SHARE turn a test on,
// and `/api/capabilities` then reports `pass_price_test: {cents, share}`.
//
// THE DEVICE IS THE UNIT, fixed before any price is shown. This browser mints
// one random key (localStorage `ngw-pass-price-key`) and keeps it. A signed-out
// host sees the price before signing in, and the price must never change after
// sign-in, so nothing about the account enters the rule:
//
//     bucket = int(first 8 hex of sha256(key), 16) % 100
//     the test price when bucket < share, else $39
//
// The checkout sends the key and the server re-runs the SAME rule
// (`stripe_payments.pass_price_for`). Both are held to one set of vectors,
// backend/tests/pass_price_vectors.json. The browser never sends an amount.
//
// UNKNOWN IS NOT $39. Until capabilities answer, a billing-live build cannot
// know which price this device will be charged, so `devicePassPriceCents()` is
// null and the doors say nothing price-specific (stripeApi.js's three-state
// rule, for the same reason: no flicker between two claims about price). A
// build with billing off can take no money at all, so it shows $39.

export const PASS_PRICE_CENTS = 3900;          // backend PASS_AMOUNT_CENTS
export const PASS_PRICE_KEY_STORAGE = 'ngw-pass-price-key';

const KEY_SHAPE = /^[A-Za-z0-9_-]{22,64}$/;
export const isPriceKey = (k) => typeof k === 'string' && KEY_SHAPE.test(k);

// SHA-256 of an ASCII string, as hex. Synchronous because a price is rendered
// synchronously (crypto.subtle is async-only). Only ever fed a validated key.
const SHA_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const ror = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256Hex(ascii) {
  const len = ascii.length;
  const blocks = (((len + 8) >> 6) + 1) * 16;
  const w = new Array(blocks).fill(0);
  for (let i = 0; i < len; i++) w[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  w[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
  w[blocks - 1] = len * 8;
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const m = new Array(64);
  for (let j = 0; j < blocks; j += 16) {
    for (let t = 0; t < 64; t++) {
      if (t < 16) { m[t] = w[j + t]; continue; }
      const s0 = ror(m[t - 15], 7) ^ ror(m[t - 15], 18) ^ (m[t - 15] >>> 3);
      const s1 = ror(m[t - 2], 17) ^ ror(m[t - 2], 19) ^ (m[t - 2] >>> 10);
      m[t] = (m[t - 16] + s0 + m[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let t = 0; t < 64; t++) {
      const t1 = (k + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[t] + m[t]) | 0;
      const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, k].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
  }
  return h.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/** The device's bucket, 0–99. PURE. */
export const priceBucket = (key) => parseInt(sha256Hex(key).slice(0, 8), 16) % 100;

/** A capabilities answer, as {cents, share}, or null (off). PURE. */
export function normalizePriceTest(v) {
  if (!v || typeof v !== 'object') return null;
  const { cents, share } = v;
  if (!Number.isInteger(cents) || cents < 100 || cents > 50000 || cents === PASS_PRICE_CENTS) return null;
  if (!Number.isInteger(share) || share < 1 || share > 100) return null;
  return { cents, share };
}

/** {cents, variant} for a key under a test (or none). PURE; mirrors the server. */
export function priceForKey(key, test) {
  const t = normalizePriceTest(test);
  if (t && isPriceKey(key) && priceBucket(key) < t.share) return { cents: t.cents, variant: 'test' };
  return { cents: PASS_PRICE_CENTS, variant: 'control' };
}

/** "$39", or "$49.50" for a price with cents. null stays null. PURE. */
export function formatPassPrice(cents) {
  if (!Number.isInteger(cents)) return null;
  return '$' + (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));
}

// ─── this device ─────────────────────────────────────────────────────────────

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function mintKey() {
  const bytes = new Uint8Array(16);
  try { crypto.getRandomValues(bytes); } catch { for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256); }
  let bits = 0; let n = 0; let out = '';
  bytes.forEach((byte) => {
    bits = (bits << 8) | byte; n += 8;
    while (n >= 6) { n -= 6; out += B64URL[(bits >> n) & 63]; }
  });
  if (n > 0) out += B64URL[(bits << (6 - n)) & 63];
  return out;   // 16 bytes → 22 url-safe characters
}

let _key = null;
/** This browser's price key: read once, minted and stored if absent. */
export function devicePriceKey() {
  if (_key) return _key;
  let k = null;
  try { k = localStorage.getItem(PASS_PRICE_KEY_STORAGE); } catch { /* no storage */ }
  if (!isPriceKey(k)) {
    k = mintKey();
    try { localStorage.setItem(PASS_PRICE_KEY_STORAGE, k); } catch { /* this page load keeps it */ }
  }
  _key = k;
  return _key;
}

// Same predicate as passGate.isBillingLive. Not imported: passGate imports
// this file for formatPassPrice, and the import must not become a cycle.
const billingLive = () => {
  try { return Boolean(process.env.REACT_APP_API_BASE_URL) && process.env.REACT_APP_BILLING_LIVE === '1'; } catch { return false; }
};

let _known = false;
let _test = null;
/** Recorded by commApi.getCapabilities from a successful answer only. */
export const setPassPriceTest = (v) => { _known = true; _test = normalizePriceTest(v); };

/** The cents this device will be charged, or null while that is not known. */
export function devicePassPriceCents() {
  if (!_known) return billingLive() ? null : PASS_PRICE_CENTS;
  return priceForKey(devicePriceKey(), _test).cents;
}

/** "$49" / "$39", or null while not known. The one helper every pass door uses. */
export const passPriceLabel = () => formatPassPrice(devicePassPriceCents());

/** "See the One-Event Pass — $49", or the text alone while the price is not known. */
export const withPassPrice = (text) => {
  const p = passPriceLabel();
  return p ? text + ' — ' + p : text;
};

/** Tests only: forget the capabilities answer and the cached key. */
export const __resetPassPrice = () => { _known = false; _test = null; _key = null; };
