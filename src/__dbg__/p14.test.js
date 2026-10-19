import { parseSmartEventText, unusedClauses } from '../lib/smartParseEvent';
const show = (t) => {
  const p = parseSmartEventText(t, {});
  console.log('TEXT:', t);
  console.log('   venueCity=', JSON.stringify(p.venueCity), 'state=', JSON.stringify(p.state),
              'theme=', JSON.stringify(p.theme), 'type=', JSON.stringify(p.type));
  console.log('   unused:', JSON.stringify(unusedClauses(t, {})));
};
test('p14', () => {
  show('40 guests in the Maryland/DC area');
  show('retirement party, 40 guests in the Maryland/DC area, black and gold');
  show('black and gold theme');
  show('black and gold');
  show('birthday party in the Phoenix area');
});
