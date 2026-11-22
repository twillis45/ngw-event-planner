// ─── THE HOST IS NOT HER OWN HELPER (Wanda audit P1-6) ──────────────────────
//
// Three of Wanda's steps are hers ("owner: 'Wanda'"). The helper engine only
// knew the host as "host / you / me", so it filed her as a helper: the step
// offered "Send Wanda their job", and the board read "Helpers 1 of 9".
//
// The host's own name is now read through hostNameFor — the one "who is the
// host" reader — and isHostName decides, for every helper reader.
import W from '../../data/wandaGoldEvent';
import { hostNameFor, isHostName } from '../hostNameFor';
import { deriveHelperResponsibilities } from '../helperResponsibility';
import { summarizeWhoIsConfirmed } from '../whoIsConfirmed';
import { namedHelperCount } from '../playbooks';

describe('who the host is', () => {
  test("the seed's host line is the event's host name", () => {
    expect(hostNameFor(W)).toBe('Wanda Mundy');
    // The event's own hostName still wins, then the profile.
    expect(hostNameFor({ ...W, hostName: 'The Mundys' })).toBe('The Mundys');
    expect(hostNameFor({}, { name: 'Pat' })).toBe('Pat');
  });

  test.each([
    ['Wanda', true], ['wanda mundy', true], ['Wanda Mundy', true],
    ['host', true], ['me', true],
    ['Vida Haynes', false], ['Cory', false], ['', false],
  ])('%p is the host: %p', (name, yes) => {
    expect(isHostName(name, W)).toBe(yes);
  });

  test('a shared host line names each host', () => {
    const ev = { hostName: 'Todd & Sarah' };
    expect(isHostName('Sarah', ev)).toBe(true);
    expect(isHostName('Todd', ev)).toBe(true);
    expect(isHostName('Jordan', ev)).toBe(false);
  });
});

describe('Wanda has helpers, and she is not one of them', () => {
  test('no responsibility is hers', () => {
    const names = deriveHelperResponsibilities(W).responsibilities.map((r) => r.helperName);
    expect(names).not.toContain('Wanda');
    expect(names).toContain('Vida Haynes');
    expect(names).toContain('Cory Mundy');
  });

  test('the board counts the other six', () => {
    expect(summarizeWhoIsConfirmed(W, {}, {}).helpers.total).toBe(6);
  });

  test('the plan’s helper count agrees on who is a helper', () => {
    // Vida, Cory and the church singer — never Wanda.
    expect(namedHelperCount(W)).toBe(3);
  });
});
