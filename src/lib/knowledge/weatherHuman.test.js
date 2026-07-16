// Wave-2n: grounded weather-contingency (NOAA/NWS) + human-relational (protocol/seating
// etiquette) axes — the last two Coverage hard-zeros, off 0.
import { ALL_PLAYBOOKS } from '../playbooks';
import { WEATHER_SOURCES, isGroundedWeather, effectiveWeather, detectWeatherCategory, resolveWeather } from './weatherContext';
import { HUMAN_SOURCES, isGroundedHuman, effectiveHuman, detectHumanCategory, resolveHuman } from './humanContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('weather + human axes', () => {
  test('weather grounds outdoor decisions; human grounds seating/honoree decisions', () => {
    let wx = 0; let hm = 0;
    for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
      if (detectWeatherCategory(d)) { expect(isGroundedWeather(effectiveWeather(d))).toBe(true); wx++; }
      if (detectHumanCategory(d)) { expect(isGroundedHuman(effectiveHuman(d))).toBe(true); hm++; }
    }
    expect(wx).toBeGreaterThanOrEqual(4);
    // ~11 after the 2o over-match tightening (shade/screen/bar/costsplit removed) — every
    // remaining hit is genuinely relational (guest lists, surprise, tribute, court, dress).
    expect(hm).toBeGreaterThanOrEqual(9);
  });

  test('no false positives on food-choice / cooking decisions', () => {
    for (const d of [{ id: 'sides', label: 'The sides' }, { id: 'roast_location', label: 'Roast indoors or outdoors (smoke)?' }, { id: 'crab_size', label: 'Crab size' }, { id: 'seasoning', label: 'Seasoning level' }]) {
      expect(detectWeatherCategory(d)).toBeNull();
      expect(detectHumanCategory(d)).toBeNull();
    }
  });

  test('resolvers map to the right source; predicates reject hollow', () => {
    expect(resolveWeather({ id: 'shade', label: 'Shade + rain plan' }).sources).toContain('noaa-outdoor-events');
    expect(resolveHuman({ id: 'seating', label: 'Seating / floor plan' }).sources).toContain('seatplan-dynamics');
    expect(isGroundedWeather({ factor: 'x', guideline: 'y', tier: 'noaa-standard', sources: ['nope'] })).toBe(false);
    expect(isGroundedHuman({ factor: 'x', guideline: 'y', tier: 'wrong', sources: ['gatech-protocol'] })).toBe(false);
  });

  test('all sources real + dated; gap-detector 0; board surfaces both', () => {
    for (const s of [...Object.values(WEATHER_SOURCES), ...Object.values(HUMAN_SOURCES)]) {
      expect(s.url).toMatch(/^https?:\/\//); expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    let gaps = 0;
    for (const pb of ALL_PLAYBOOKS) gaps += detectGapsInPlaybook(pb).filter((g) => /weather-ungrounded|human-ungrounded/.test(String(g.type))).length;
    expect(gaps).toBe(0);
    const b = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: '2026-09-01', guests: [], guestEstimate: 40 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    expect(rows.some((r) => r.humanGrounded === true)).toBe(true);
  });
});
