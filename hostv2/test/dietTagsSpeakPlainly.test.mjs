// Diet tags in plain English (owner, 11/24/2026). The engine's labels stay
// terse (dietFlags.test.js); the shell's one display map turns every one of
// them into words a host reads without decoding.
import { describe, it, expect } from 'vitest';
import { dietTagLabel, dietTagText } from '../src/dietTags.js';

const ENGINE_LABELS = {
  'not pesc.': 'Not pescatarian',
  'not veg': 'Not vegetarian',
  'not vegan': 'Not vegan',
  nuts: 'Has nuts',
  gluten: 'Has gluten',
  dairy: 'Has dairy',
  shellfish: 'Has shellfish',
  fish: 'Has fish',
  soy: 'Has soy',
  sesame: 'Has sesame',
  egg: 'Has egg',
  alcohol: 'Has alcohol',
  'check halal': 'Check: halal',
  'check kosher': 'Check: kosher',
};

describe('dietTagLabel', () => {
  it('maps every engine label to plain English', () => {
    for (const [engine, words] of Object.entries(ENGINE_LABELS)) expect(dietTagLabel(engine)).toBe(words);
  });
  it('joins a line\'s flags into one tag, and says nothing for none', () => {
    expect(dietTagText(['not pesc.', 'nuts'])).toBe('Not pescatarian · Has nuts');
    expect(dietTagText([])).toBe('');
    expect(dietTagText(undefined)).toBe('');
  });
});
