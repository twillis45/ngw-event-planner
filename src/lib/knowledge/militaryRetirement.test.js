import {
  detectMilitaryBranch, isMilitaryRetirement, militaryRetirementContext,
  isGroundedMilitary, MILITARY_SOURCES,
} from './militaryRetirement';

const wanda = { type: 'Retirement Party', secondaryType: 'Birthday', story: '30 years in the Army, turning 50', name: 'Wanda’s Retirement' };
const navyRet = { type: 'Retirement Party', story: '20 years in the Navy' };
const civilianRet = { type: 'Retirement Party', story: '32 years at the library' };
const vfwRet = { type: 'Retirement Party', name: 'Retirement at VFW Post 1847', story: 'thirty years of service' };

describe('detectMilitaryBranch', () => {
  test('detects Army from the story', () => {
    expect(detectMilitaryBranch(wanda)).toBe('army');
  });
  test('detects Navy', () => {
    expect(detectMilitaryBranch(navyRet)).toBe('navy');
  });
  test('a civilian retirement has no branch', () => {
    expect(detectMilitaryBranch(civilianRet)).toBeNull();
  });
  test('a generic military signal (VFW) resolves to unknown branch, not null', () => {
    expect(detectMilitaryBranch(vfwRet)).toBe('unknown');
  });
});

describe('isMilitaryRetirement', () => {
  test('Army retirement → true', () => {
    expect(isMilitaryRetirement(wanda)).toBe(true);
  });
  test('civilian retirement → false', () => {
    expect(isMilitaryRetirement(civilianRet)).toBe(false);
  });
  test('a birthday with no retirement → false', () => {
    expect(isMilitaryRetirement({ type: 'Birthday', story: 'army brat' })).toBe(false);
  });
});

describe('militaryRetirementContext — Army protocol', () => {
  const ctx = militaryRetirementContext(wanda);
  test('returns an authored Army context', () => {
    expect(ctx).toBeTruthy();
    expect(ctx.branch).toBe('army');
    expect(ctx.authored).toBe(true);
  });
  test('carries the ceremony sequence + protocol elements', () => {
    expect(Array.isArray(ctx.ceremonySequence)).toBe(true);
    expect(ctx.ceremonySequence.length).toBeGreaterThan(6);
    const ids = ctx.protocol.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['color_guard', 'flag_presentation', 'retirement_order', 'shadowbox', 'chain_of_command', 'spouse_recognition', 'honors']));
  });
  test('is grounded — cites real sources that resolve', () => {
    expect(isGroundedMilitary(ctx)).toBe(true);
    ctx.sources.forEach((s) => expect(MILITARY_SOURCES[s]).toBeTruthy());
  });
  test('every protocol element cites a resolving source', () => {
    ctx.protocol.forEach((p) => {
      expect(Array.isArray(p.sources)).toBe(true);
      p.sources.forEach((s) => expect(MILITARY_SOURCES[s]).toBeTruthy());
    });
  });
  test('a civilian retirement gets no context', () => {
    expect(militaryRetirementContext(civilianRet)).toBeNull();
  });
  test('an unauthored branch is an honest partial (not fabricated protocol)', () => {
    const c = militaryRetirementContext(navyRet);
    expect(c.branch).toBe('navy');
    expect(c.authored).toBe(false);
    expect(c.protocol).toBeNull();
    expect(isGroundedMilitary(c)).toBe(false); // no sources → not grounded, honestly
  });
});
