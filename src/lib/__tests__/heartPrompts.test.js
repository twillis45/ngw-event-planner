// The "Make it yours" examples must belong to the host's OWN event. Shipped
// hardcoded to a retirement for "Margaret — my mom" and driven live on a
// wedding (click-through audit 2026-07-28).
const { heartPlaceholders, HEART_PROMPT_SETS } = require('../heartPrompts');
const { ALL_PLAYBOOKS } = require('../playbooks');

describe('heart prompts belong to the event', () => {
  test('a wedding is never prompted with someone else’s mother', () => {
    const w = heartPlaceholders('Wedding');
    expect(w.honoree).not.toMatch(/Margaret/i);
    expect(w.honoree_story).not.toMatch(/library/i);
  });

  test('a repast is never told the day should be loud', () => {
    const r = heartPlaceholders('Repast');
    expect(r.feeling_words).not.toMatch(/loud/i);
    expect(r.meaning_why).not.toMatch(/celebrat/i);
  });

  test('the retirement set is preserved — it was right for its own type', () => {
    expect(heartPlaceholders('Retirement Party').honoree).toMatch(/Margaret/);
  });

  test('unknown / empty types get the generic set, never a stranger’s life', () => {
    for (const t of ['', null, undefined, 'Something We Have Not Built']) {
      const g = heartPlaceholders(t);
      expect(g.honoree).not.toMatch(/Margaret|Marcus|Maya|Priya|Whitfield|Willie/);
      expect(String(g.honoree).length).toBeGreaterThan(3);
    }
  });

  test('every set fills all five fields (a blank example is worse than none)', () => {
    for (const s of HEART_PROMPT_SETS.concat([heartPlaceholders('')])) {
      for (const k of ['honoree', 'honoree_story', 'meaning_why', 'feeling_words', 'must_have_moment']) {
        expect(String(s[k] || '').trim().length).toBeGreaterThan(3);
      }
    }
  });

  test('every real playbook type resolves to a set', () => {
    for (const pb of ALL_PLAYBOOKS) {
      const p = heartPlaceholders(pb.label || pb.type || pb.id);
      expect(String(p.honoree || '').length).toBeGreaterThan(3);
    }
  });
});
