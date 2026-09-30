// A TROPHY IS NOT A PICTURE OF THE HOUSE (found while driving, 2026-09-30).
//
// Pasting the real captured Santa Fe results page put an Airbnb "Guest
// favourite" badge on two of the six cards, as the property photo. It passed
// every check because it IS a real image on a real allowed host — Airbnb
// serves its own marketing art from the same CDN as listing photography:
//
//   photo  /im/pictures/miso/Hosting-1174846431882101136/original/....jpeg
//   photo  /im/pictures/hosting/Hosting-1574721869691975245/original/....jpeg
//   photo  /im/pictures/prohost-api/Hosting-685872797369361569/original/....jpeg
//   BADGE  /im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-GuestFavorite
//
// isAllowedMedia is NOT the place to fix this. It answers "is this safe to
// load", and it should keep saying yes — a badge is not a security problem.
// Whether an image depicts the property is a different question and gets its
// own predicate, so tightening one can never quietly loosen the other.
//
// It matters more now that the photo is a tap target: a host tapping a trophy
// to see the house is a worse miss than a blank frame, and UX_08's rule is
// that missing data says missing. "+ Add a picture" is the honest state.
import { isAllowedMedia, isListingPhoto } from '../lodgingBookmarklet';

const BADGE = 'https://a0.muscache.com/im/pictures/airbnb-platform-assets/AirbnbPlatformAssets-GuestFavorite';
const REAL = [
  'https://a0.muscache.com/im/pictures/miso/Hosting-1174846431882101136/original/b01d820a-f6b4-4b5b-8f46-b91cd69150fb.jpeg',
  'https://a0.muscache.com/im/pictures/hosting/Hosting-1574721869691975245/original/450bf09b-ce50-47bf-9350-62a08019049b.jpeg',
  'https://a0.muscache.com/im/pictures/prohost-api/Hosting-685872797369361569/original/6335719f-a707-4e63-99f1-9549da82ccb2.jpeg',
];

describe('a platform badge is not a listing photo', () => {
  test('the badge is still SAFE to load — the security answer does not change', () => {
    expect(isAllowedMedia(BADGE)).toBe(true);
  });

  test('...but it is not a picture of the property', () => {
    expect(isListingPhoto(BADGE)).toBe(false);
  });

  test.each(REAL)('a real listing photo still passes: %s', (url) => {
    expect(isListingPhoto(url)).toBe(true);
  });

  test('anything unsafe is not a listing photo either', () => {
    // The photo question is downstream of the safety one, never around it.
    expect(isListingPhoto('http://a0.muscache.com/im/pictures/miso/x.jpg')).toBe(false);
    expect(isListingPhoto('https://evil.example.com/house.jpg')).toBe(false);
    expect(isListingPhoto('')).toBe(false);
    expect(isListingPhoto(null)).toBe(false);
  });

  test('the badge path is matched on its own segment, not a loose substring', () => {
    // A listing whose photo id merely contains the words must not be dropped.
    expect(isListingPhoto(
      'https://a0.muscache.com/im/pictures/miso/Hosting-1/original/airbnb-platform-assets.jpeg',
    )).toBe(true);
  });
});
