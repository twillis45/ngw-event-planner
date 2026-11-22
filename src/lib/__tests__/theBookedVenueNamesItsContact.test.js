// ─── THE BOOKED VENUE NAMES ITS CONTACT (Wanda audit follow-up, 11/22/2026) ──
//
// Space asked "Confirm with the venue who your day-of contact is." on Wanda's
// board while her booked hall, VFW Post 1847 — Freedom Hall, lists its contact
// on the vendor record ("Hank Delgado, Post Quartermaster"). Owner: "Make sure
// ask is not repeated." A BOOKED venue vendor's contact answers the row; the
// booked-venue reader is the one the venue call already settles from.
import WANDA from '../../data/wandaGoldEvent';
import { derivePlaceIntelligence } from '../placeIntelligence';

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
const contactRow = (ev) => derivePlaceIntelligence(ev).sections.find((s) => s.key === 'contact');
const withVenue = (patch) => {
  const ev = wanda();
  ev.vendors = ev.vendors.map((v) => (/venue/i.test(v.category) ? { ...v, ...patch } : v));
  return ev;
};

describe('a booked venue’s contact answers the day-of contact row', () => {
  test('Wanda: handled, and it names who', () => {
    const row = contactRow(wanda());
    expect(row.state).toBe('handled');
    expect(row.detail).toContain('Hank Delgado, Post Quartermaster');
    expect(derivePlaceIntelligence(wanda()).missingItems).not.toContain('Venue contact');
  });

  test('control: a venue still being considered does not answer it', () => {
    expect(contactRow(withVenue({ status: 'Considering' })).state).toBe('needs');
  });

  test('control: a booked venue with no contact on file still asks', () => {
    expect(contactRow(withVenue({ contact: '' })).state).toBe('needs');
  });

  test('her own entry still wins', () => {
    const row = contactRow(wanda({ venueContact: 'Vida Haynes' }));
    expect(row.state).toBe('handled');
    expect(row.detail).toBe('Day-of contact entered.');
  });
});
