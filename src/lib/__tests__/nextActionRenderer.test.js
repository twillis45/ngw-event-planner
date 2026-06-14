// Sprint 55M — proves the producer-side renderer seam is canonical-preserving:
// VOICE={} is the identity function (inert), and a persona can NEVER touch a logic
// field (level / category / primaryRoute / contextLine / compressionSubBadge).

import { renderAction, personaFor, VOICE, OVERRIDE_FIELDS } from '../nextActionRenderer';

// The full engine `category` set (the existing discriminator — no new key invented).
const CATEGORIES = ['caterer', 'decision', 'approval', 'vendor', 'compression', 'timeline', 'comm', 'operational', 'calendar', 'neutral'];

// A synthetic engine action carrying every field shape the real cascade emits.
const mkCmd = (category) => ({
  level: 'attention',
  category,
  title: `Engine title for ${category}.`,
  consequence: `Engine consequence for ${category} — Overdue by 3 days, $2,500.`,
  primaryCta: 'Do it',
  primaryRoute: { tab: 'Vendors', vendorId: `v-${category}` },
  contextLine: '12 days until event',
  ...(category === 'compression'
    ? { compressionSubBadge: { level: 'critical', label: 'Tight timeline', count: 4 } }
    : {}),
});

const LOGIC_FIELDS = ['level', 'category', 'primaryRoute', 'contextLine', 'compressionSubBadge'];
const diffKeys = (a, b) => Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);

describe('55M renderAction — T1 inertness (VOICE={} is identity)', () => {
  CATEGORIES.forEach((cat) => {
    ['host', 'planner'].forEach((p) => {
      test(`${cat} × ${p}: returns the SAME reference (no-op)`, () => {
        const cmd = mkCmd(cat);
        expect(renderAction(cmd, p)).toBe(cmd); // referential identity preserved
      });
    });
  });
  test('null/undefined cmd passes through', () => {
    expect(renderAction(null, 'host')).toBeNull();
    expect(renderAction(undefined, 'planner')).toBeUndefined();
  });
});

describe('55M renderAction — T2 logic-field immutability (AP-002 guard)', () => {
  // A hostile voice that TRIES to rewrite every logic field — must be ignored.
  const HOSTILE = {
    decision: {
      host: () => ({
        level: 'critical', category: 'hacked',
        primaryRoute: { tab: 'Evil' }, contextLine: 'tampered',
        compressionSubBadge: { level: 'emergency' },
        title: 'allowed title',
      }),
    },
  };
  test('only title changes; every logic field passes through unchanged', () => {
    const cmd = mkCmd('decision');
    const out = renderAction(cmd, 'host', HOSTILE);
    expect(out.title).toBe('allowed title');
    LOGIC_FIELDS.forEach((f) => expect(out[f]).toEqual(cmd[f]));
  });
});

describe('55M renderAction — T3 override-surface restriction', () => {
  const VOICE_OK = { vendor: { host: () => ({ title: 'X', consequence: 'Y', primaryCta: 'Z' }) } };
  test('changed keys are a subset of {title,consequence,primaryCta}', () => {
    const cmd = mkCmd('vendor');
    const out = renderAction(cmd, 'host', VOICE_OK);
    diffKeys(cmd, out).forEach((k) => expect(OVERRIDE_FIELDS).toContain(k));
  });
});

describe('55M renderAction — T4 passthrough integrity', () => {
  test('compressionSubBadge + primaryRoute survive an override', () => {
    const cmd = mkCmd('compression');
    const out = renderAction(cmd, 'host', { compression: { host: () => ({ title: 'New' }) } });
    expect(out.compressionSubBadge).toEqual(cmd.compressionSubBadge);
    expect(out.primaryRoute).toEqual(cmd.primaryRoute);
  });
});

describe('55M renderAction — T5 no-blanking', () => {
  test('empty / non-string overrides do not erase a field', () => {
    const cmd = mkCmd('timeline');
    const out = renderAction(cmd, 'host', { timeline: { host: () => ({ title: '', consequence: null, primaryCta: 42 }) } });
    expect(out.title).toBe(cmd.title);
    expect(out.consequence).toBe(cmd.consequence);
    expect(out.primaryCta).toBe(cmd.primaryCta);
  });
});

describe('55M personaFor — T6 recordKind proxy + safe default', () => {
  test('home-hosted type → host', () => {
    expect(personaFor({ type: 'Dinner Party' })).toBe('host');
  });
  test('professional (full_service) type → planner', () => {
    expect(personaFor({ type: 'Wedding' })).toBe('planner');
  });
  test('unknown / missing type → planner (never over-simplify)', () => {
    expect(personaFor({ type: 'Totally Unknown Type' })).toBe('planner');
    expect(personaFor({})).toBe('planner');
    expect(personaFor(null)).toBe('planner');
  });
});

describe('55M — T7 shipped runtime is inert', () => {
  test('shipped VOICE is empty (the kill switch)', () => {
    expect(VOICE).toEqual({});
  });
  test('PROOF-CASE: a decision voice flows host≠planner with logic untouched (NOT shipped)', () => {
    const PROOF_VOICE = {
      decision: {
        host: () => ({
          title: 'A decision is waiting on you.',
          consequence: 'Make this call now and everything that depends on it can move.',
          primaryCta: 'Make the call',
        }),
      },
    };
    const cmd = mkCmd('decision');
    const host = renderAction(cmd, 'host', PROOF_VOICE);
    const planner = renderAction(cmd, 'planner', PROOF_VOICE);
    expect(planner).toBe(cmd); // planner has no entry → identity (baseline copy)
    expect(host.title).not.toBe(cmd.title);
    expect(host.primaryCta).toBe('Make the call');
    LOGIC_FIELDS.forEach((f) => expect(host[f]).toEqual(cmd[f])); // logic untouched
  });
});

describe('55M — T7b producer wiring is inert (integration)', () => {
  test('selectEventNextAction pipes through renderAction with VOICE={} (no drift)', () => {
    // eslint-disable-next-line global-require
    const { selectEventNextAction } = require('../../CommandCenter');
    const ev = { id: 't', type: 'Dinner Party', date: '2030-01-01' };
    const na = selectEventNextAction(ev);
    expect(na).toBeTruthy();
    expect(typeof na.category).toBe('string'); // logic field intact
    expect(personaFor(ev)).toBe('host');       // persona derived from recordKind
  });
});
