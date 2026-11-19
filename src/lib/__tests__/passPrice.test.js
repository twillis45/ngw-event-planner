// ─── THE PASS PRICE TEST, BROWSER SIDE (plan item G86, owner 11/19/2026) ────
//
// The device is shown a price, then its checkout is charged one; the server
// recomputes that from the same key with stripe_payments.pass_price_for. These
// vectors are the SAME file the backend's test_pass_price_test.py reads, so if
// either side's rule moves, one of the two suites goes red.
import fs from 'fs';
import path from 'path';
import {
  sha256Hex, priceBucket, priceForKey, normalizePriceTest, isPriceKey, formatPassPrice,
  devicePriceKey, devicePassPriceCents, passPriceLabel, withPassPrice, setPassPriceTest,
  PASS_PRICE_KEY_STORAGE, PASS_PRICE_CENTS, __resetPassPrice,
} from '../passPrice';

const VECTORS = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'backend', 'tests', 'pass_price_vectors.json'), 'utf8'));

describe('the rule both sides share', () => {
  test('sha256 is sha256 (FIPS 180-2 examples)', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))
      .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });

  test.each(VECTORS.keys.map((r) => [r.key.slice(0, 12), r]))('%s… lands where the server puts it', (_k, row) => {
    expect(sha256Hex(row.key).slice(0, 8)).toBe(row.sha256_8);
    expect(priceBucket(row.key)).toBe(row.bucket);
    expect(priceForKey(row.key, VECTORS.test)).toEqual({ cents: row.cents, variant: row.variant });
  });

  test('(premise) the vectors cover both arms', () => {
    expect(new Set(VECTORS.keys.map((r) => r.variant))).toEqual(new Set(['control', 'test']));
  });

  test.each(VECTORS.malformed.map((k) => [JSON.stringify(k), k]))('a malformed key %s pays $39', (_l, k) => {
    expect(priceForKey(k, { cents: 4900, share: 100 })).toEqual({ cents: 3900, variant: 'control' });
  });

  test('off, or a test the server would not run, is $39 for every key', () => {
    for (const t of [null, undefined, {}, { cents: 4900, share: 0 }, { cents: 4900, share: 101 },
      { cents: 3900, share: 50 }, { cents: 99, share: 50 }, { cents: 49.5, share: 50 }, { cents: '4900', share: 50 }]) {
      expect(normalizePriceTest(t)).toBeNull();
      for (const row of VECTORS.keys) expect(priceForKey(row.key, t).cents).toBe(3900);
    }
  });

  test('the control price is the server constant', () => {
    const py = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'backend', 'app', 'routers', 'stripe_payments.py'), 'utf8');
    const m = py.match(/^PASS_AMOUNT_CENTS\s*=\s*([\d_]+)/m);
    expect(m).not.toBeNull();
    expect(PASS_PRICE_CENTS).toBe(Number(m[1].replace(/_/g, '')));
  });

  test('a price formats as a host reads it', () => {
    expect(formatPassPrice(3900)).toBe('$39');
    expect(formatPassPrice(4950)).toBe('$49.50');
    expect(formatPassPrice(null)).toBeNull();
  });
});

describe('this device', () => {
  const env = { ...process.env };
  beforeEach(() => { __resetPassPrice(); localStorage.clear(); });
  afterEach(() => { process.env = { ...env }; });

  test('mints a 22-character url-safe key once, and keeps it', () => {
    const k = devicePriceKey();
    expect(k).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(isPriceKey(k)).toBe(true);
    expect(localStorage.getItem(PASS_PRICE_KEY_STORAGE)).toBe(k);
    __resetPassPrice();
    expect(devicePriceKey()).toBe(k);          // a reload reads the same key
  });

  test('a stored key that is not a key is replaced', () => {
    localStorage.setItem(PASS_PRICE_KEY_STORAGE, 'nope');
    expect(devicePriceKey()).not.toBe('nope');
    expect(isPriceKey(devicePriceKey())).toBe(true);
  });

  test('billing live: no price until capabilities answer, then the bucket\'s price', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    process.env.REACT_APP_BILLING_LIVE = '1';
    const inTest = VECTORS.keys.find((r) => r.variant === 'test');
    localStorage.setItem(PASS_PRICE_KEY_STORAGE, inTest.key);
    expect(devicePassPriceCents()).toBeNull();
    expect(passPriceLabel()).toBeNull();
    expect(withPassPrice('Get the pass')).toBe('Get the pass');
    setPassPriceTest(VECTORS.test);
    expect(passPriceLabel()).toBe('$49');
    expect(withPassPrice('Get the pass')).toBe('Get the pass — $49');
  });

  test('a backend that sends no test (or null) is $39', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    process.env.REACT_APP_BILLING_LIVE = '1';
    localStorage.setItem(PASS_PRICE_KEY_STORAGE, VECTORS.keys.find((r) => r.variant === 'test').key);
    setPassPriceTest(undefined);
    expect(passPriceLabel()).toBe('$39');
    setPassPriceTest(null);
    expect(passPriceLabel()).toBe('$39');
  });

  test('a control-bucket device sees $39 while the test runs', () => {
    localStorage.setItem(PASS_PRICE_KEY_STORAGE, VECTORS.keys.find((r) => r.variant === 'control').key);
    setPassPriceTest(VECTORS.test);
    expect(passPriceLabel()).toBe('$39');
  });

  test('billing off: $39 without asking, since no money can be taken', () => {
    delete process.env.REACT_APP_BILLING_LIVE;
    expect(passPriceLabel()).toBe('$39');
  });
});
