import { parseSmartEventText, unusedClauses } from '../smartParseEvent';
import { militaryDecisionsFor, detectMilitaryBranch } from '../knowledge/militaryRetirement';

// Verbatim GOLD-01, docs/redesign/NGW_PRODUCT_EXPERIENCE_REFERENCE.md:474.
export const GOLD01 = "Wanda's 50th birthday and 30-year Army retirement, about 75 guests in the Maryland/DC area, black and gold, formal Army recognition followed by a celebration, food, bar, DJ and photography, budget $5,000.";

test('a catering business never replaces the explicitly named honoree', () => {
  expect(parseSmartEventText("Grad party for Jake, Tony's BBQ is catering").honoree).toBe('Jake');
  expect(parseSmartEventText("Birthday, caterer Alice's Catering").honoree).toBeNull();
  expect(parseSmartEventText("Birthday, caterer Alice's team").honoree).toBeNull();
  expect(parseSmartEventText("Birthday, Caterer Alice's team").honoree).toBeNull();
});

test.each(['DJ', 'AV', 'PA'])('a meaningful short clause is disclosed: %s', (clause) => {
  expect(unusedClauses(`Birthday, 75 guests, ${clause}`)).toContain(clause);
});

test('GOLD-01 creation words reach the existing Army protocol engine', () => {
  const p = parseSmartEventText(GOLD01);
  const event = { type: p.type, secondaryType: p.secondaryType, name: "Wanda’s Retirement & 50th Birthday", createdFromText: GOLD01 };
  expect(detectMilitaryBranch(event)).toBe('army');
  expect(militaryDecisionsFor(event)).toHaveLength(6);
});

test('GOLD-01 vendor intent becomes unbooked category rows, not invented suppliers', () => {
  const { heardVendorIntents, clausesNotUsed } = require('../heardClauses');
  const rows = heardVendorIntents(GOLD01);
  expect(rows.map((v) => v.category)).toEqual(['Catering', 'Mobile Bar', 'DJ', 'Photography']);
  expect(rows.every((v) => v.status === 'Considering' && v.name === '')).toBe(true);
  expect(clausesNotUsed(GOLD01)).toContain('formal Army recognition followed by a celebration');
  for (const clause of ['food', 'bar', 'DJ', 'photography']) expect(clausesNotUsed(GOLD01)).not.toContain(clause);
  expect(heardVendorIntents("Grad party for Jake, Tony's BBQ is catering")).toEqual([
    expect.objectContaining({ category: 'Catering', name: "Tony's BBQ", status: 'Considering' }),
  ]);
  expect(heardVendorIntents('Birthday, no DJ, no photography')).toEqual([]);
});
