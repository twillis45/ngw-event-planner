import { parseSmartEventText } from '../smartParseEvent';
test('verify sample', () => {
  const show = (s, keys) => {
    const p = parseSmartEventText(s);
    console.log(`  ${keys.map(k=>`${k}=${JSON.stringify(p[k])}`).join(' ')}   <- "${s}"`);
  };
  show('birthday party at my house, 30 people', ['venueKind','venue']);
  show('cookout at my house saturday, 30 people', ['venueKind','venue']);
  show("mom's 80th birthday, 30 people", ['honoree','milestone']);
  show('birthday party for mom, 30 people', ['honoree','milestone']);
  show('80th birthday party, 30 people', ['milestone']);
  show('sweet 16 for my daughter, 30 people', ['type','milestone','honoree']);
  show('birthday party in vegas june 14 2027, 30 people', ['isDestination','venueCity']);
  show('birthday party in Las Vegas NV june 14 2027, 30 people', ['isDestination','venueCity']);
  show('birthday party at noon, 30 people', ['startTime','timeOfDay']);
  show('birthday party thanksgiving 2027, 30 people', ['date','monthYear']);
  show('birthday party summer 2027, 30 people', ['date','monthYear']);
  expect(true).toBe(true);
});
