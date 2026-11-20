import { readEventLink, takeEventLink, isOwnEvent } from '../eventLink';

describe('the alert link opens the event it is about', () => {
  test('reads the id and removes it, keeping everything else', () => {
    expect(readEventLink('https://x.test/hostv2/?event=ev_9xK2&elegant=1'))
      .toEqual({ id: 'ev_9xK2', url: 'https://x.test/hostv2/?elegant=1' });
  });
  test('no event in the link: nothing changes', () => {
    expect(readEventLink('https://x.test/hostv2/')).toEqual({ id: null, url: 'https://x.test/hostv2/' });
  });
  test('something that is not an id is dropped, not used', () => {
    expect(readEventLink('https://x.test/hostv2/?event=%3Cscript%3E').id).toBeNull();
  });
  test('takeEventLink strips the address bar once', () => {
    const calls = [];
    const win = { location: { href: 'https://x.test/hostv2/?event=ev_1' }, history: { replaceState: (a, b, u) => calls.push(u) } };
    expect(takeEventLink(win)).toBe('ev_1');
    expect(calls).toEqual(['https://x.test/hostv2/']);
  });
  test('only the host\'s own events open', () => {
    expect(isOwnEvent('ev_1', [{ id: 'ev_2' }], [{ id: 'ev_1' }])).toBe(true);
    expect(isOwnEvent('ev_x', [{ id: 'ev_2' }], [])).toBe(false);
    expect(isOwnEvent(null, [{ id: null }])).toBe(false);
  });
});
