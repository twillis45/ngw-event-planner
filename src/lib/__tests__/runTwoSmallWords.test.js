// Run 2 break run (11/6/2026), the P3s that live in words.
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';
import { occasionShortName } from '../occasionWords';
import { answerPlanQuestion } from '../askPlan';

test('R2-7: a holiday party keeps "Party"', () => {
  expect(occasionShortName('Holiday Party')).toBe('Holiday Party');
  expect(occasionShortName('Birthday Party')).toBe('Birthday');           // control
});

test('R2-22: a book club is a get-together', () => {
  expect(parseSmartEventText('Book club at my place on Saturday for 6 friends').type).toBe('Get-Together');
});

test.each([
  ['retirment pary for my boss carl around 35 ppl', 'Retirement Party'],
  ['brithday party for my daughter, 20 kids', 'Birthday'],
  ['anniversery dinner for 2', 'Anniversary'],
  ['graduaton party for 40', 'Graduation'],
])('R2-9: a common misspelling still names the occasion — %s', (s, type) => {
  expect(parseSmartEventText(s).type).toBe(type);
});

test('R2-8: nothing is said to be "because you said party" when no one said party', () => {
  const p = parseSmartEventText('Fiesta de cumpleaños para mi mamá, 30 personas, 15 de julio');
  expect(p.typeBasis).toBe('generic');
  expect(String(p.typeHeard).toLowerCase()).toBe('fiesta');
  expect(String(parseSmartEventText('a party for 20').typeHeard).toLowerCase()).toBe('party');
});

test('R2-19: a negative amount is not answered as a positive one', () => {
  const r = answerPlanQuestion('will $-5 cover it?', { money: { expected: 285, committed: 255 } });
  expect(r.answer || '').not.toMatch(/\$5 is about/);
  const r2 = answerPlanQuestion('will -$5 cover it?', { money: { expected: 285, committed: 255 } });
  expect(r2.answer || '').not.toMatch(/\$5 is about/);
});
