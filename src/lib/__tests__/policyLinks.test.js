// Policy links appear only for policies that are published (BRAND.policies),
// never for a draft or a malformed URL. Stage 9, LEGAL-1 (11/11/2026).
import { publishedPolicies } from '../policyLinks';
import { BRAND } from '../brand';

test('nothing is published today, so nothing links', () => {
  // Flip this when the owner publishes: the URL goes in brand.js, not here.
  expect(BRAND.policies).toEqual({ privacy: null, terms: null, refunds: null });
  expect(publishedPolicies()).toEqual([]);
});

test('a published https policy links, in a fixed order', () => {
  const out = publishedPolicies({ refunds: 'https://example.com/refunds', privacy: 'https://example.com/privacy', terms: null });
  expect(out.map((p) => p.label)).toEqual(['Privacy', 'Refunds']);
  expect(out[0].url).toBe('https://example.com/privacy');
});

test('a draft path, http, or junk never links', () => {
  expect(publishedPolicies({ privacy: 'docs/legal/PRIVACY_POLICY_DRAFT.md', terms: 'http://example.com/terms', refunds: 'https://exa mple.com' })).toEqual([]);
});
