// welcomeGate — first-run welcome decision (V2). The gate must fire for a
// genuinely new host only, and never again once anything real exists or the
// host has dismissed it.

import { shouldShowWelcome, isRealHostEvent, LS_WELCOMED } from '../welcomeGate';

const realEvent = { id: 'ev-abc', name: 'Backyard Cookout', recordKind: 'host_event' };

describe('isRealHostEvent', () => {
  test('a named host_event with an id is real', () => {
    expect(isRealHostEvent(realEvent)).toBe(true);
  });
  test('recordKind defaults to host_event when absent (legacy rows)', () => {
    expect(isRealHostEvent({ id: 'ev-1', name: 'Fish Fry' })).toBe(true);
  });
  test('demo-seeded rows are not real', () => {
    expect(isRealHostEvent({ ...realEvent, id: 'demo-crab' })).toBe(false);
  });
  test('non-host records are not real', () => {
    expect(isRealHostEvent({ ...realEvent, recordKind: 'guest_note' })).toBe(false);
  });
  test('unnamed or id-less stubs are not real', () => {
    expect(isRealHostEvent({ id: 'ev-2', name: '   ' })).toBe(false);
    expect(isRealHostEvent({ name: 'No Id' })).toBe(false);
    expect(isRealHostEvent(null)).toBe(false);
  });
});

describe('shouldShowWelcome', () => {
  test('brand-new host: no events, no custom, never welcomed → show', () => {
    expect(shouldShowWelcome({ appEvents: [], customEvent: null, welcomed: false })).toBe(true);
  });
  test('no arguments at all still behaves like a brand-new host', () => {
    expect(shouldShowWelcome()).toBe(true);
    expect(shouldShowWelcome({})).toBe(true);
  });
  test('already welcomed → never show, even with zero events', () => {
    expect(shouldShowWelcome({ appEvents: [], customEvent: null, welcomed: true })).toBe(false);
  });
  test('a V2-created event (custom) → never show', () => {
    expect(shouldShowWelcome({ appEvents: [], customEvent: { id: 'custom', name: 'My Crab Feast' }, welcomed: false })).toBe(false);
  });
  test('a real app event → never show', () => {
    expect(shouldShowWelcome({ appEvents: [realEvent], customEvent: null, welcomed: false })).toBe(false);
  });
  test('only demo/seed/non-host rows in storage → still show', () => {
    const seeds = [
      { id: 'demo-crab', name: 'Demo Crab Feast', recordKind: 'host_event' },
      { id: 'ev-note', name: 'A note', recordKind: 'guest_note' },
      { id: 'ev-blank', name: '' },
      null,
    ];
    expect(shouldShowWelcome({ appEvents: seeds, customEvent: null, welcomed: false })).toBe(true);
  });
  test('garbage custom value without an id does not suppress the welcome', () => {
    expect(shouldShowWelcome({ appEvents: [], customEvent: {}, welcomed: false })).toBe(true);
  });
  test('clearing the flag re-arms it (welcomed false again, still no events)', () => {
    // Same call as the brand-new case — the gate is pure, so re-arming is
    // just the flag reading false again.
    expect(shouldShowWelcome({ appEvents: [], customEvent: null, welcomed: false })).toBe(true);
  });
  test('flag key is the documented one', () => {
    expect(LS_WELCOMED).toBe('ngw-v2-welcomed');
  });
});
