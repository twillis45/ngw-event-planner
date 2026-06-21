// Reality-Fix 2 P3 — trivial must-have inputs must not echo into hero copy.
import { isMeaningfulMustHave } from '../eventIdentity';

describe('isMeaningfulMustHave', () => {
  test('trivial inputs are NOT meaningful (never echoed to hero)', () => {
    expect(isMeaningfulMustHave('m')).toBe(false);
    expect(isMeaningfulMustHave('go')).toBe(false);
    expect(isMeaningfulMustHave('fun')).toBe(false);   // one word
    expect(isMeaningfulMustHave('cake')).toBe(false);  // one word
    expect(isMeaningfulMustHave('   ')).toBe(false);
    expect(isMeaningfulMustHave('')).toBe(false);
    expect(isMeaningfulMustHave(null)).toBe(false);
    expect(isMeaningfulMustHave(undefined)).toBe(false);
  });

  test('real moments ARE meaningful', () => {
    expect(isMeaningfulMustHave('The toast')).toBe(true);
    expect(isMeaningfulMustHave('Elders first')).toBe(true);
    expect(isMeaningfulMustHave('The toast to Grandma')).toBe(true);
    expect(isMeaningfulMustHave('The reading of the history before we eat')).toBe(true);
    expect(isMeaningfulMustHave('Cut the cake')).toBe(true);
  });
});
