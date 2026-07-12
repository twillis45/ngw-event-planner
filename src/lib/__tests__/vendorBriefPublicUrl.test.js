import { legacyVendorBriefUrl } from '../vendorBriefPublicUrl';

describe('legacyVendorBriefUrl — V2 → legacy public brief page bridge', () => {
  const CODE = 'aB3xK9_qwErTy12345uVw'; // 22-char urlsafe VB2-style code

  test('production Pages layout: hostv2/ link rewrites to the parent path', () => {
    expect(legacyVendorBriefUrl(`https://user.github.io/ngw-event-planner/hostv2/?vendor=${CODE}`))
      .toBe(`https://user.github.io/ngw-event-planner/?vendor=${CODE}`);
  });

  test('hostv2 without a trailing slash still rewrites', () => {
    expect(legacyVendorBriefUrl(`https://user.github.io/ngw-event-planner/hostv2?vendor=${CODE}`))
      .toBe(`https://user.github.io/ngw-event-planner/?vendor=${CODE}`);
  });

  test('explicit index.html still rewrites', () => {
    expect(legacyVendorBriefUrl(`https://user.github.io/ngw-event-planner/hostv2/index.html?vendor=${CODE}`))
      .toBe(`https://user.github.io/ngw-event-planner/?vendor=${CODE}`);
  });

  test('legacy base64 snapshot tokens survive the round trip re-encoded', () => {
    // b64 payloads carry '+', '/', '=' — the query parser decodes, we re-encode.
    const b64 = 'eyJhIjoxfQ==';
    const out = legacyVendorBriefUrl(`https://user.github.io/ngw-event-planner/hostv2/?vendor=${encodeURIComponent(b64)}`);
    expect(out).toBe(`https://user.github.io/ngw-event-planner/?vendor=${encodeURIComponent(b64)}`);
    // and the target URL decodes back to the exact original token
    expect(new URL(out).searchParams.get('vendor')).toBe(b64);
  });

  test('dev server at the root: never redirects (parent path is not the legacy app)', () => {
    expect(legacyVendorBriefUrl(`http://127.0.0.1:5200/?vendor=${CODE}`)).toBeNull();
  });

  test('hostv2 mid-path but not the final segment: never redirects', () => {
    expect(legacyVendorBriefUrl(`https://x.io/hostv2/deep/?vendor=${CODE}`)).toBeNull();
  });

  test('no vendor param / blank vendor param: null', () => {
    expect(legacyVendorBriefUrl('https://user.github.io/ngw-event-planner/hostv2/')).toBeNull();
    expect(legacyVendorBriefUrl('https://user.github.io/ngw-event-planner/hostv2/?rsvp=abc')).toBeNull();
    expect(legacyVendorBriefUrl('https://user.github.io/ngw-event-planner/hostv2/?vendor=')).toBeNull();
    expect(legacyVendorBriefUrl('https://user.github.io/ngw-event-planner/hostv2/?vendor=%20')).toBeNull();
  });

  test('unparseable href: null, never throws', () => {
    expect(legacyVendorBriefUrl('not a url')).toBeNull();
    expect(legacyVendorBriefUrl('')).toBeNull();
    expect(legacyVendorBriefUrl(undefined)).toBeNull();
  });

  test('only the vendor param is forwarded (the brief route reads nothing else)', () => {
    const out = legacyVendorBriefUrl(`https://x.io/app/hostv2/?utm=abc&vendor=${CODE}&other=1`);
    expect(out).toBe(`https://x.io/app/?vendor=${CODE}`);
  });
});
