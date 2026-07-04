// Sprint IS-1 regression: the free-text signal AssembleReveal builds for
// resolveEventIdentity() must strip the primary event type's own words out of
// the event name before parsing — otherwise a plain "My Retirement Party"
// (type='Retirement Party') falsely self-detects as a compound "retirement +
// retirement" event. This mirrors the exact stripping logic added in App.js's
// AssembleReveal component (not exported, so the algorithm is duplicated here
// for a fast, isolated regression check — see App.js AssembleReveal for the
// live call site).
import { resolveEventIdentity } from '../eventIdentityEngine';

function buildFreeText(ev) {
  const typeWords = String((ev && ev.type) || '').toLowerCase().split(/\s+/).filter(Boolean);
  const nameSansType = String((ev && ev.name) || '')
    .split(/\s+/)
    .filter(w => !typeWords.includes(w.toLowerCase()))
    .join(' ');
  return [nameSansType, ev && ev.secondaryType, ev && ev.honoree, ev && ev.theme]
    .filter(Boolean).join('. ');
}

describe('IS-1: name-stripping prevents self-echo false-positive compound detection', () => {
  test('a plain "My Retirement Party" (type=Retirement Party) is NOT compound', () => {
    const ev = { type: 'Retirement Party', name: 'My Retirement Party' };
    const freeText = buildFreeText(ev);
    const identity = resolveEventIdentity(ev, ev.type, 'self', freeText);
    expect(identity.isCompound).toBe(false);
    expect(identity.secondaryEventTypes).toEqual([]);
  });

  test('a plain "My Birthday" (type=Birthday) is NOT compound', () => {
    const ev = { type: 'Birthday', name: 'My Birthday' };
    const freeText = buildFreeText(ev);
    const identity = resolveEventIdentity(ev, ev.type, 'self', freeText);
    expect(identity.isCompound).toBe(false);
  });

  test('a genuine compound name ("50th Birthday and Military Retirement from the Navy", type=Birthday) IS still detected', () => {
    const ev = { type: 'Birthday', name: '50th Birthday and Military Retirement from the Navy' };
    const freeText = buildFreeText(ev);
    const identity = resolveEventIdentity(ev, ev.type, 'self', freeText);
    expect(identity.isCompound).toBe(true);
    expect(identity.secondaryEventTypes).toContain('retirement');
    expect(identity.secondaryEventTypes).toContain('military-retirement');
  });

  test('secondaryType (existing structured compound picker) still contributes when name is generic', () => {
    const ev = { type: 'Birthday', name: 'My Birthday', secondaryType: 'Retirement Party' };
    const freeText = buildFreeText(ev);
    const identity = resolveEventIdentity(ev, ev.type, 'self', freeText);
    expect(identity.isCompound).toBe(true);
  });
});
