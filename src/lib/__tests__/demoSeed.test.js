// Demo seed/reset tooling — the flagship demo's staged before-states and the
// delete+reseed reset contract (fresh ids every seed → fresh brief code →
// clean confirmation state, no server cleanup).

import { buildDemoEvent, withDemoSeeded, withDemoRemoved, isDemoEvent, DEMO_ID_PREFIX } from '../demoSeed';

const NOW = 1783300000000;

describe('buildDemoEvent — staged before-states', () => {
  const ev = buildDemoEvent(NOW);

  test('flagship identity: name, type, venue set, 120 guests, ~12 weeks out', () => {
    expect(ev.name).toMatch(/Army Retirement Celebration at the VFW/);
    expect(ev.type).toBe('Retirement Party');
    expect(ev.venue).toContain('VFW Post 3150');
    expect(ev.guestCount).toBe(120);
    const days = Math.round((Date.parse(ev.date) - NOW) / 86400000);
    expect(days).toBeGreaterThanOrEqual(80);
    expect(days).toBeLessThanOrEqual(90);
  });

  test('budget deliberately unset (the "Set your budget" demo beat)', () => {
    expect(ev.totalBudget).toBeUndefined();
    expect(ev.budget).toEqual([]);
  });

  test('six NAMED DMV vendors — never placeholder names', () => {
    expect(ev.vendors).toHaveLength(6);
    ev.vendors.forEach(v => {
      expect(String(v.name).length).toBeGreaterThan(10);
      expect(v.name).not.toMatch(/vendor [a-z]|sample/i);
    });
  });

  test('the one needs-attention item: VFW insurance certificate', () => {
    const vfw = ev.vendors.find(v => /VFW/.test(v.name));
    expect(vfw.coiStatus).toBe('required');
  });

  test('caterer staged for the confirm-back beats: pre-Confirmed, contact, empty on-site', () => {
    const cat = ev.vendors.find(v => v.category === 'Catering');
    expect(cat.status).toBe('Contracted');            // "Mark confirmed" available
    expect(cat.contactName).toBe('Dana Whitfield');   // prefills the confirm form
    expect(cat.arrivalTime).toBe('14:30');
    expect(cat.briefNote).toBeTruthy();
    expect(cat.onSiteContactName).toBe('');           // "Save on-site contact" available
    expect(cat.onSitePhone).toBe('');
  });

  test('ROS cues assigned to the caterer so the brief carries a schedule', () => {
    const cat = ev.vendors.find(v => v.category === 'Catering');
    const cues = ev.ros.filter(r => r.vendorName === cat.name);
    expect(cues.length).toBeGreaterThanOrEqual(3);
    cues.forEach(c => expect(c.time && c.segment).toBeTruthy());
  });
});

describe('reset contract — delete + reseed with fresh identity', () => {
  test('every seed mints fresh ids (fresh vendor ids → fresh brief codes)', () => {
    const a = buildDemoEvent(NOW);
    const b = buildDemoEvent(NOW + 60000);
    expect(a.id).not.toBe(b.id);
    expect(a.vendors[1].id).not.toBe(b.vendors[1].id);
    expect(a.id.startsWith(DEMO_ID_PREFIX)).toBe(true);
  });

  test('withDemoSeeded replaces prior demo events and never touches real ones', () => {
    const real = { id: 'ev-real', name: 'Real Wedding' };
    const oldDemo = buildDemoEvent(NOW);
    const { events, removed } = withDemoSeeded([real, oldDemo], NOW + 60000);
    expect(removed).toEqual([oldDemo.id]);
    expect(events.some(e => e.id === 'ev-real')).toBe(true);
    expect(events.filter(isDemoEvent)).toHaveLength(1);
    expect(events.find(isDemoEvent).id).not.toBe(oldDemo.id);
  });

  test('withDemoRemoved strips only demo events', () => {
    const real = { id: 'ev-real', name: 'Real Wedding' };
    const demo = buildDemoEvent(NOW);
    const { events, removed } = withDemoRemoved([real, demo]);
    expect(events).toEqual([real]);
    expect(removed).toEqual([demo.id]);
  });
});
