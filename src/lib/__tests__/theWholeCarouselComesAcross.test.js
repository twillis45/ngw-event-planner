// THE GALLERY THE HOST ASKED FOR, AND THE ONE PATH THAT CAN DELIVER IT.
//
// Host, 2026-09-30: "are we able to import the whole gallery for each?"
//
// We cannot fetch one. Airbnb's robots.txt disallows /rooms/*/photos, and this
// app never loads a listing page — every picture it has was handed to it.
//
// MEASURED, not assumed: all three captured results pages in __fixtures__
// carry exactly ONE <img> per card (airbnb 6 imgs / 6 cards, vrbo 3 / 4,
// hotels 8 / 4, counted 2026-09-30). So a PASTE has no gallery to give, and
// saying otherwise would be the "readiness is a claim" failure in miniature.
//
// The BOOKMARKLET runs on the live page, where the carousel has already put
// several <img> nodes in the DOM. That is the only path where a second picture
// exists, so that is the path this gate holds — end to end: the script's own
// source collects them, the reader keeps them, and the card parser turns them
// into `photos` with the badge dropped and the lead shot still first.
import { buildBookmarklet, parseBookmarkletPayload } from '../lodgingBookmarklet';
import { candidatesFromGroups, listingPhotos } from '../lodgingIntel';

const CDN = 'https://a0.muscache.com/im/pictures';
const SHOT = (n) => `${CDN}/miso/Hosting-11748464318821011${n}/original/b01d820a-f6b4-4b5b-8f46-b91cd6915${n}.jpeg`;
const BADGE = `${CDN}/airbnb-platform-assets/AirbnbPlatformAssets-GuestFavorite.png`;
const URL1 = 'https://www.airbnb.com/rooms/12345678';

describe('the bookmarklet brings the whole carousel, not the first frame', () => {
  test('its source reads EVERY img in the card, not one', () => {
    // It comes back as a percent-encoded javascript: URL — read the script.
    const src = decodeURIComponent(buildBookmarklet('https://example.com/hostv2/'));
    // querySelector would take the first and stop — that is the bug this fixes.
    expect(src).toContain("querySelectorAll('img')");
    expect(src).toContain('imgs:srcs');
  });

  test('the reader keeps them all, drops the badge, and keeps the lead first', () => {
    const [row] = parseBookmarkletPayload(JSON.stringify([{
      url: URL1, lines: ['Home in Santa Fe', '8 beds'],
      imgs: [SHOT(1), BADGE, SHOT(2), SHOT(3)],
    }]));
    expect(row.imgs).toEqual([SHOT(1), BADGE, SHOT(2), SHOT(3)]);
    const [c] = candidatesFromGroups([{ url: row.url, lines: row.lines, imgs: row.imgs }]);
    expect(c.photos).toEqual([SHOT(1), SHOT(2), SHOT(3)]);
    // photoUrl downstream is photos[0]; the lead shot must not move.
    expect(c.photo).toBe(SHOT(1));
  });

  test('an OLDER bookmarklet still in a bookmarks bar keeps working', () => {
    // It sends `img`, no `imgs`. Nobody re-drags a bookmark because we shipped.
    const [row] = parseBookmarkletPayload(JSON.stringify([{
      url: URL1, lines: ['Home in Santa Fe', 'Casa Cielo'], img: SHOT(1),
    }]));
    const [c] = candidatesFromGroups([{ url: row.url, lines: row.lines, imgs: row.imgs }]);
    expect(c.photo).toBe(SHOT(1));
    expect(c.photos).toEqual([SHOT(1)]);
  });

  test('a card whose only image is a badge still has no picture', () => {
    const [c] = candidatesFromGroups([{ url: URL1, lines: ['Home in Santa Fe', 'Casa Cielo'], imgs: [BADGE] }]);
    expect(c.photo).toBe('');
    expect(c.photos).toEqual([]);
  });
});

describe('listingPhotos — the shared collector', () => {
  test('dedupes the repeated first frame a carousel emits', () => {
    expect(listingPhotos([SHOT(1), SHOT(1), SHOT(2)])).toEqual([SHOT(1), SHOT(2)]);
  });

  test('absolutizes a protocol-relative src', () => {
    expect(listingPhotos(['//a0.muscache.com/im/pictures/miso/Hosting-1/original/x.jpeg']))
      .toEqual(['https://a0.muscache.com/im/pictures/miso/Hosting-1/original/x.jpeg']);
  });

  test('caps the strip — `photos` is on the guest-published whitelist', () => {
    expect(listingPhotos(Array.from({ length: 30 }, (_, i) => SHOT(i))).length).toBe(12);
  });
});
