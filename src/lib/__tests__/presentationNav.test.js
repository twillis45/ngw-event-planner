// Sprint 57E-A — Host nav hide/reveal. Proves: flag OFF = identity (full nav),
// planner = identity, host = ~6-item reduction with reveal-when-data, route keys
// (the list members) preserved — only the LIST shown is reduced.

import { hostNav, hostNavActive, hostTabLabel } from '../presentationNav';

const TABS = ['Command', 'Communication', 'Planning', 'Decisions', 'Client Intake', 'Vendors', 'Crew', 'Guests', 'Seating', 'Budget', 'Documents', 'Calendar', 'Event Day Schedule', 'Event Details'];
const HOST = { audience: 'self_family' };
const PLANNER = { audience: 'client' };

beforeEach(() => { try { localStorage.clear(); } catch {} }); // pi.nav OFF by default

describe('57E-A hostNav — T1 off-switch is identity (= today)', () => {
  test('host audience but pi-off=nav ⇒ full nav unchanged', () => {
    try { localStorage.setItem('ngw-pi-nav', '0'); } catch {}
    expect(hostNav(TABS, HOST)).toBe(TABS);
    expect(hostNavActive(HOST)).toBe(false);
  });
});

describe('57E-A hostNav — FLAG ON', () => {
  beforeEach(() => { try { localStorage.setItem('ngw-pi-nav', '1'); } catch {} });

  test('T2 planner audience ⇒ identity (full nav)', () => {
    expect(hostNav(TABS, PLANNER)).toBe(TABS);
    expect(hostNavActive(PLANNER)).toBe(false);
  });

  test('T3 host, no data ⇒ exactly the 6 essentials', () => {
    expect(hostNav(TABS, HOST)).toEqual(['Command', 'Planning', 'Guests', 'Budget', 'Event Day Schedule', 'Event Details']);
    expect(hostNavActive(HOST)).toBe(true);
  });

  test('T4 reveal-when-data: Vendors / Documents / Messages appear only with data', () => {
    expect(hostNav(TABS, { ...HOST, vendors: [{ id: 'v1' }] })).toContain('Vendors');
    expect(hostNav(TABS, { ...HOST, documents: [{ id: 'd1' }] })).toContain('Documents');
    expect(hostNav(TABS, { ...HOST, commClient: [{ id: 'm1' }] })).toContain('Communication');
    // …and stay hidden without data
    expect(hostNav(TABS, HOST)).not.toContain('Vendors');
    expect(hostNav(TABS, HOST)).not.toContain('Documents');
  });

  test('T5 planner-only tabs are hidden in host mode', () => {
    const out = hostNav(TABS, HOST);
    ['Client Intake', 'Crew', 'Decisions', 'Seating', 'Calendar'].forEach((t) => expect(out).not.toContain(t));
  });

  test('T6 every shown host tab is a real route key (no invented tabs)', () => {
    hostNav(TABS, { ...HOST, vendors: [{}], documents: [{}], commClient: [{}] })
      .forEach((t) => expect(TABS).toContain(t));
  });

  test('T7 hostTabLabel relabels for host, null (→ caller default) for planner/unmapped', () => {
    expect(hostTabLabel('Planning', HOST)).toBe('Plan');
    expect(hostTabLabel('Budget', HOST)).toBe('Budget');
    expect(hostTabLabel('Event Day Schedule', HOST)).toBe('The Day');
    expect(hostTabLabel('Event Details', HOST)).toBe('Venue & Details');
    expect(hostTabLabel('Guests', HOST)).toBeNull();      // unmapped ⇒ caller default ("Guests")
    expect(hostTabLabel('Planning', PLANNER)).toBeNull(); // planner ⇒ caller default
  });
});
