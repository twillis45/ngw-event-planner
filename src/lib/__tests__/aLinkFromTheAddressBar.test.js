// "THAT NEEDS TO BE AN HTTPS LINK TO THE SEARCH." (host, in production,
// 2026-09-30, pasting a perfectly good Santa Fe search:)
//
//   www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&...&price_max=4800
//
// Safari hides the scheme in its address bar, so copying what is DISPLAYED
// gives exactly that string. The https requirement is real — this app only
// ever fetches https — but it is a thing to satisfy on the host's behalf, not
// a rule to read back to them while refusing their link.
//
// The guard is kept narrow deliberately: adding a scheme to anything that is
// not host-shaped would turn a typo, or a sentence, into a fetch.
import { httpsify } from '../lodgingIntel';

describe('a link copied from the address bar', () => {
  test('the exact string the host pasted now resolves', () => {
    expect(httpsify('www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&adults=10'))
      .toBe('https://www.airbnb.com/s/Santa-Fe--NM/homes?checkin=2028-06-17&adults=10');
  });

  test.each([
    ['airbnb.com/s/Santa-Fe', 'https://airbnb.com/s/Santa-Fe'],
    ['vrbo.com/search?q=x', 'https://vrbo.com/search?q=x'],
    ['abnb.me/xYz', 'https://abnb.me/xYz'],
    ['example.co.uk', 'https://example.co.uk'],
  ])('%s -> %s', (raw, want) => expect(httpsify(raw)).toBe(want));

  test('an https link is returned untouched', () => {
    const u = 'https://www.airbnb.com/rooms/123';
    expect(httpsify(u)).toBe(u);
  });

  test('http is UPGRADED, not refused — same requirement met, never a downgrade', () => {
    expect(httpsify('http://www.airbnb.com/s/x')).toBe('https://www.airbnb.com/s/x');
  });

  test('prose is never turned into a URL', () => {
    for (const junk of ['notes about airbnb', 'the search I did', '', '   ', 'hello world']) {
      expect(httpsify(junk)).not.toMatch(/^https:\/\//);
    }
  });

  test('a bare word with no dot is not a host', () => {
    expect(httpsify('airbnb')).toBe('airbnb');
  });

  test('another scheme is left alone to fail honestly rather than mangled', () => {
    expect(httpsify('ftp://example.com/x')).toBe('ftp://example.com/x');
    expect(httpsify('javascript:alert(1)')).toBe('javascript:alert(1)');
  });
});
