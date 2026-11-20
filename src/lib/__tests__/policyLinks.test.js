// Policy links appear only for policies that are published (BRAND.policies),
// never for a draft or a malformed URL. Stage 9, LEGAL-1 (11/11/2026).
import { publishedPolicies } from '../policyLinks';
import { BRAND } from '../brand';

test('the three published policies link, from brand.js (published 11/20/2026)', () => {
  // The URLs live in brand.js; this pins them to the pages publish-policies.mjs writes.
  const base = 'https://twillis45.github.io/ngw-event-planner/hostv2/legal/';
  expect(BRAND.policies).toEqual({ privacy: base + 'privacy.html', terms: base + 'terms.html', refunds: base + 'refunds.html' });
  expect(publishedPolicies().map((p) => [p.label, p.url])).toEqual([
    ['Privacy', base + 'privacy.html'],
    ['Terms', base + 'terms.html'],
    ['Refunds', base + 'refunds.html'],
  ]);
});

test('a published https policy links, in a fixed order', () => {
  const out = publishedPolicies({ refunds: 'https://example.com/refunds', privacy: 'https://example.com/privacy', terms: null });
  expect(out.map((p) => p.label)).toEqual(['Privacy', 'Refunds']);
  expect(out[0].url).toBe('https://example.com/privacy');
});

test('a draft path, http, or junk never links', () => {
  expect(publishedPolicies({ privacy: 'docs/legal/PRIVACY_POLICY_DRAFT.md', terms: 'http://example.com/terms', refunds: 'https://exa mple.com' })).toEqual([]);
});
