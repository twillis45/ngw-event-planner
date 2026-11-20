// Policy links appear only for policies that are published (BRAND.policies),
// never for a draft or a malformed URL. Stage 9, LEGAL-1 (11/11/2026).
import { publishedPolicies } from '../policyLinks';
import { BRAND } from '../brand';

test('the three published policies link, from brand.js (published 11/20/2026)', () => {
  // brand.js names the in-app pages publish-policies.mjs writes; they resolve
  // against the address the app runs at, so one build links right at both hosts.
  expect(BRAND.policies).toEqual({ privacy: 'legal/privacy.html', terms: 'legal/terms.html', refunds: 'legal/refunds.html' });
  for (const app of ['https://twillis45.github.io/ngw-event-planner/hostv2/', 'https://events.noguessworksystems.com/hostv2/']) {
    expect(publishedPolicies(BRAND.policies, app).map((p) => [p.label, p.url])).toEqual([
      ['Privacy', app + 'legal/privacy.html'],
      ['Terms', app + 'legal/terms.html'],
      ['Refunds', app + 'legal/refunds.html'],
    ]);
  }
  // A page URL (…/hostv2/index.html) resolves to the same directory.
  expect(publishedPolicies(BRAND.policies, 'https://events.noguessworksystems.com/hostv2/index.html')[0].url)
    .toBe('https://events.noguessworksystems.com/hostv2/legal/privacy.html');
});

test('by default it resolves against the running app, and with no public address an in-app page is not linked', () => {
  // jsdom runs at http://localhost/.
  expect(publishedPolicies()[0].url).toBe('http://localhost/legal/privacy.html');
  expect(publishedPolicies(BRAND.policies, null)).toEqual([]);
});

test('a published https policy links, in a fixed order', () => {
  const out = publishedPolicies({ refunds: 'https://example.com/refunds', privacy: 'https://example.com/privacy', terms: null });
  expect(out.map((p) => p.label)).toEqual(['Privacy', 'Refunds']);
  expect(out[0].url).toBe('https://example.com/privacy');
});

test('a draft path, http, or junk never links', () => {
  const app = 'https://events.noguessworksystems.com/hostv2/';
  expect(publishedPolicies({ privacy: 'docs/legal/PRIVACY_POLICY_DRAFT.md', terms: 'http://example.com/terms', refunds: 'https://exa mple.com' }, app)).toEqual([]);
  expect(publishedPolicies({ privacy: '../legal/privacy.html', terms: '/legal/terms.html', refunds: 'legal/../../x.html' }, app)).toEqual([]);
});
