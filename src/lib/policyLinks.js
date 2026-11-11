// The policy links a screen may show: only the ones published (BRAND.policies),
// only over https, in a fixed order. Empty until a policy is live, so every
// place that renders these shows nothing rather than a link to a draft.
import { BRAND } from './brand';

const LABELS = [['privacy', 'Privacy'], ['terms', 'Terms'], ['refunds', 'Refunds']];

export function publishedPolicies(policies = BRAND.policies) {
  return LABELS
    .map(([key, label]) => ({ key, label, url: policies && policies[key] }))
    .filter((p) => typeof p.url === 'string' && /^https:\/\/[^\s]+$/.test(p.url));
}
