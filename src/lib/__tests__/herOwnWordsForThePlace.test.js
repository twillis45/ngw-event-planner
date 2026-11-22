// HER OWN WORDS FOR THE PLACE (CI on #232, 11/22/2026). D-08 made venueFor the
// one home rule, which also turned a home she NAMED ("Vida's place", "my
// mom's") into "our place". "Our place" stands in only for a generic home
// phrase; a named home is printed as she typed it, and a business is never
// "our place". Spec: hostv2/e2e/theInviteAsksForWhatIsMissing.spec.mjs.
import { placePhrase } from '../doItForMe';

// venueKind 'home' is what setVenue stores for every home phrase, named or not.
const at = (venue, extra = {}) => placePhrase({ name: 'Party', venue, venueKind: 'home', ...extra });

test('a home she named keeps her words', () => {
  expect(at('Vida’s place')).toBe('Vida’s place');
  expect(at("my mom's")).toMatch(/mom/i);
});

test('a generic home phrase reads "our place"', () => {
  for (const v of ['my house', 'our place', 'home', 'Backyard', 'the backyard', 'my apartment']) {
    expect(at(v)).toBe('our place');
  }
});

test('a business is never "our place"', () => {
  expect(at('Marshall Funeral Home', { venueKind: 'venue' })).not.toBe('our place');
});
