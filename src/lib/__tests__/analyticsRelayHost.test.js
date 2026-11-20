import { posthogHostFor } from '../analytics';

// Events must go through our API's relay, not PostHog's own address, or tracker
// blockers silently drop them (11/20/2026).
describe('posthogHostFor', () => {
  it('uses the API relay when an API base is configured', () => {
    expect(posthogHostFor({ REACT_APP_API_BASE_URL: 'https://ngw-events-api.onrender.com' }))
      .toBe('https://ngw-events-api.onrender.com/api/relay');
  });
  it('tolerates a trailing slash on the API base', () => {
    expect(posthogHostFor({ REACT_APP_API_BASE_URL: 'https://api.example.test/' }))
      .toBe('https://api.example.test/api/relay');
  });
  it('falls back to PostHog directly with no API', () => {
    expect(posthogHostFor({})).toBe('https://us.i.posthog.com');
  });
  it('an explicit host still wins', () => {
    expect(posthogHostFor({ REACT_APP_POSTHOG_HOST: 'https://x.test', REACT_APP_API_BASE_URL: 'https://a.test' }))
      .toBe('https://x.test');
  });
});
