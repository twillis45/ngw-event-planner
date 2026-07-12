// DESTINATION-1 — "destination" is a MODIFIER on another event type ("destination
// birthday", "destination anniversary"), not its own type. A bare `destination\b`
// alternative in the Wellness Retreat regex used to hijack resolution before the
// real type's own regex got a chance — this was masked for "destination birthday"
// only by accident (Wellness Retreat has no playbook, so HOST_TYPES filtering in
// HostShellV2.jsx fell through to a substring match that happened to find
// "birthday"), but would have produced a genuinely wrong type for e.g. "destination
// anniversary" (Anniversary IS a real playbook type, so nothing would have caught it).
import { resolveCanonicalType } from '../eventTaxonomyAdapter';

describe('DESTINATION-1 — "destination X" resolves to X, not Wellness Retreat', () => {
  test('destination birthday celebration → Birthday, not Wellness Retreat', () => {
    expect(resolveCanonicalType('destination 80th birthday celebration in Santa Fe, New Mexico')).toBe('Birthday');
  });
  test('destination anniversary → Anniversary (previously would have been hijacked)', () => {
    expect(resolveCanonicalType('a destination anniversary trip')).toBe('Anniversary');
  });
  test('destination baby shower → Baby Shower', () => {
    expect(resolveCanonicalType('destination baby shower in Palm Springs')).toBe('Baby Shower');
  });
  test('destination wedding still resolves to Wedding (its own earlier, more specific rule)', () => {
    expect(resolveCanonicalType('planning a destination wedding')).toBe('Wedding');
  });
  test('a genuine destination trip/getaway (no other subject) still resolves to Wellness Retreat', () => {
    expect(resolveCanonicalType('a destination getaway with friends')).toBe('Wellness Retreat');
    expect(resolveCanonicalType('destination trip for spring break')).toBe('Wellness Retreat');
  });
});
