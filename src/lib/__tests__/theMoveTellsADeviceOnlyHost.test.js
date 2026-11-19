// Owner ruling 11/19/2026 (option A): GitHub's redirect moves the app; a plan
// saved only on a device stays at the old address, so the host is told first.
import { domainMove, moveNotice } from '../domainMove';

const ENV = { REACT_APP_DOMAIN_MOVE_HOST: 'events.noguessworksystems.com', REACT_APP_DOMAIN_MOVE_DATE: '2026-11-30' };
const at = (y, m, d) => new Date(y, m - 1, d, 12);

test('off until both the new address and the day are set', () => {
  expect(domainMove({})).toBeNull();
  expect(domainMove({ REACT_APP_DOMAIN_MOVE_HOST: 'events.noguessworksystems.com' })).toBeNull();
  expect(domainMove({ ...ENV, REACT_APP_DOMAIN_MOVE_DATE: 'Nov 30' })).toBeNull();
  expect(domainMove({ ...ENV, REACT_APP_DOMAIN_MOVE_HOST: 'https://x.com/path' })).toBeNull();
  expect(domainMove(ENV)).toEqual({ host: 'events.noguessworksystems.com', date: '2026-11-30' });
});

test('before the day it names the day and the address and asks to sign in', () => {
  expect(moveNotice(domainMove(ENV), at(2026, 11, 20))).toBe('On Monday, November 30 this app moves to events.noguessworksystems.com. Plans saved only on this device don’t come along — sign in to keep this one in your account.');
});

test('on the day it says today; after it, nothing', () => {
  expect(moveNotice(domainMove(ENV), at(2026, 11, 30))).toMatch(/^Today this app moves to/);
  expect(moveNotice(domainMove(ENV), at(2026, 12, 1))).toBe('');
  expect(moveNotice(null, at(2026, 11, 20))).toBe('');
});
