// Sprint 55M + 57A-B — the producer-side renderer seam.
// 55M proved the seam is canonical-preserving (logic fields immutable, AP-002 fence).
// 57A-B authors the HOST voice + the pi.voice flag: flag OFF ⇒ personaFor='planner'
// ⇒ no planner VOICE entry ⇒ renderAction is identity ⇒ byte-identical to today.

import { renderAction, personaFor, VOICE, OVERRIDE_FIELDS } from '../nextActionRenderer';

const CATEGORIES = ['caterer', 'decision', 'approval', 'vendor', 'compression', 'timeline', 'comm', 'operational', 'calendar', 'neutral'];

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

beforeEach(() => { try { localStorage.clear(); } catch {} }); // flag OFF by default

describe('57A-B renderAction — T1 PLANNER is identity (flag-off / safe voice)', () => {
  CATEGORIES.forEach((cat) => {
    test(`${cat} × planner: returns the SAME reference (no-op = today)`, () => {
      const cmd = mkCmd(cat);
      expect(renderAction(cmd, 'planner')).toBe(cmd);
    });
  });
  test('null/undefined cmd passes through', () => {
    expect(renderAction(null, 'host')).toBeNull();
    expect(renderAction(undefined, 'planner')).toBeUndefined();
  });
});

describe('57A-B renderAction — T1b HOST applies voice, logic untouched', () => {
  CATEGORIES.forEach((cat) => {
    test(`${cat} × host: rewrites only OVERRIDE_FIELDS; logic fields identical`, () => {
      const cmd = mkCmd(cat);
      const out = renderAction(cmd, 'host');               // default VOICE now has host entries
      expect(out).not.toBe(cmd);                            // host voice applied
      LOGIC_FIELDS.forEach((f) => expect(out[f]).toEqual(cmd[f])); // engine logic preserved
      diffKeys(cmd, out).forEach((k) => expect(OVERRIDE_FIELDS).toContain(k));
    });
  });
  test('host decision title is plain (no "Resolve" jargon)', () => {
    const out = renderAction({ ...mkCmd('decision'), title: 'Resolve "Collect dietary".' }, 'host');
    expect(out.title.startsWith('Resolve')).toBe(false);
    expect(out.title).toMatch(/Decide:/);
    expect(out.primaryCta).toBe('Make the call');
  });
});

describe('55M renderAction — T2 logic-field immutability (AP-002 guard)', () => {
  const HOSTILE = { decision: { host: () => ({
    level: 'critical', category: 'hacked', primaryRoute: { tab: 'Evil' }, contextLine: 'tampered',
    compressionSubBadge: { level: 'emergency' }, title: 'allowed title',
  }) } };
  test('only title changes; every logic field passes through unchanged', () => {
    const cmd = mkCmd('decision');
    const out = renderAction(cmd, 'host', HOSTILE);
    expect(out.title).toBe('allowed title');
    LOGIC_FIELDS.forEach((f) => expect(out[f]).toEqual(cmd[f]));
  });
});

describe('55M renderAction — T3/T4/T5 override hygiene', () => {
  test('T3 changed keys ⊆ {title,consequence,primaryCta}', () => {
    const cmd = mkCmd('vendor');
    const out = renderAction(cmd, 'host', { vendor: { host: () => ({ title: 'X', consequence: 'Y', primaryCta: 'Z' }) } });
    diffKeys(cmd, out).forEach((k) => expect(OVERRIDE_FIELDS).toContain(k));
  });
  test('T4 compressionSubBadge + primaryRoute survive an override', () => {
    const cmd = mkCmd('compression');
    const out = renderAction(cmd, 'host', { compression: { host: () => ({ title: 'New' }) } });
    expect(out.compressionSubBadge).toEqual(cmd.compressionSubBadge);
    expect(out.primaryRoute).toEqual(cmd.primaryRoute);
  });
  test('T5 empty / non-string overrides do not erase a field', () => {
    const cmd = mkCmd('timeline');
    const out = renderAction(cmd, 'host', { timeline: { host: () => ({ title: '', consequence: null, primaryCta: 42 }) } });
    expect(out.title).toBe(cmd.title);
    expect(out.consequence).toBe(cmd.consequence);
    expect(out.primaryCta).toBe(cmd.primaryCta);
  });
});

describe('57A-B personaFor — T6 audience mapping behind pi.voice flag', () => {
  test('FLAG OFF (default): every audience → planner (= today, identity)', () => {
    ['self_family', 'friend', 'client', 'organization', 'professional', 'other', undefined].forEach((a) => {
      expect(personaFor({ audience: a })).toBe('planner');
    });
    expect(personaFor({})).toBe('planner');
    expect(personaFor(null)).toBe('planner');
  });
  describe('FLAG ON', () => {
    beforeEach(() => { try { localStorage.setItem('ngw-pi-voice', '1'); } catch {} });
    test('self_family → host', () => expect(personaFor({ audience: 'self_family' })).toBe('host'));
    test('friend → host', () => expect(personaFor({ audience: 'friend' })).toBe('host'));
    test('client → planner', () => expect(personaFor({ audience: 'client' })).toBe('planner'));
    test('organization → operator (Sprint 57I)', () => expect(personaFor({ audience: 'organization' })).toBe('operator'));
    test('professional → planner', () => expect(personaFor({ audience: 'professional' })).toBe('planner'));
    test('unset / other / unknown → host (safer default)', () => {
      expect(personaFor({ audience: '' })).toBe('host');
      expect(personaFor({ audience: 'other' })).toBe('host');
      expect(personaFor({})).toBe('host');
    });
    test('persona NEVER depends on event.type (recordKind dropped)', () => {
      expect(personaFor({ type: 'Wedding', audience: 'self_family' })).toBe('host');
      expect(personaFor({ type: 'Dinner Party', audience: 'client' })).toBe('planner');
    });
  });
});

describe('57A-B — T7 shipped VOICE shape', () => {
  test('only host is authored; planner is absent (identity) for every category', () => {
    CATEGORIES.forEach((cat) => {
      expect(VOICE[cat] && VOICE[cat].host).toBeTruthy();
      expect(VOICE[cat] && VOICE[cat].planner).toBeFalsy();
    });
  });
});

describe('57A-B — T7b producer wiring: flag OFF is byte-identical (integration)', () => {
  test('selectEventNextAction renders planner (identity) when flag off', () => {
    // eslint-disable-next-line global-require
    const { selectEventNextAction } = require('../../CommandCenter');
    const ev = { id: 't', type: 'Dinner Party', date: '2030-01-01' };
    const na = selectEventNextAction(ev);
    expect(na).toBeTruthy();
    expect(typeof na.category).toBe('string');
    expect(personaFor(ev)).toBe('planner'); // flag off ⇒ today's voice
  });
});
