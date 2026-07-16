import {
  detectMilitaryBranch, isMilitaryRetirement, militaryRetirementContext,
  isGroundedMilitary, MILITARY_SOURCES, militaryDecisionsFor,
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
  test('all SIX branches are authored + grounded', () => {
    const events = {
      army: wanda,
      navy: navyRet,
      airforce: { type: 'Retirement Party', story: 'retiring from the Air Force' },
      marines: { type: 'Retirement Party', story: '20 years a Marine' },
      coastguard: { type: 'Retirement Party', story: 'Coast Guard retirement' },
      spaceforce: { type: 'Retirement Party', story: 'a Space Force Guardian retiring' },
    };
    for (const [slug, ev] of Object.entries(events)) {
      const c = militaryRetirementContext(ev);
      expect(c.branch).toBe(slug);
      expect(c.authored).toBe(true);
      expect(isGroundedMilitary(c)).toBe(true);
      expect(c.protocol.length).toBeGreaterThan(6);
    }
  });

  test('an AMBIGUOUS-branch military retirement is an honest partial (not fabricated protocol)', () => {
    const c = militaryRetirementContext(vfwRet); // VFW named, no service → branch unknown
    expect(c.branch).toBe('unknown');
    expect(c.authored).toBe(false);
    expect(c.protocol).toBeNull();
    expect(isGroundedMilitary(c)).toBe(false); // no sources → not grounded, honestly
  });

  test('a distinctive rite loads per branch — Navy piping, Marine sword', () => {
    const navy = militaryRetirementContext(navyRet);
    expect(navy.ceremonySequence.join(' ')).toMatch(/piping|pipe/i);
    const marineDecs = militaryDecisionsFor({ type: 'Retirement Party', story: '20 years a Marine' });
    expect(marineDecs.find((d) => d.id === 'mil_marine_sword')).toBeTruthy();
    const navyDecs = militaryDecisionsFor(navyRet);
    expect(navyDecs.find((d) => d.id === 'mil_navy_piping')).toBeTruthy();
  });
});
