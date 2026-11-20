// The policy links a screen may show: only the ones published (BRAND.policies),
// in a fixed order. Empty until a policy is live, so every place that renders
// these shows nothing rather than a link to a draft.
//
// A published policy is either an https URL, or a page that ships INSIDE the
// app (`legal/<slug>.html`, hostv2/public/legal/), which is resolved against the
// address the app is running at right now. That is what lets one build serve
// both twillis45.github.io/ngw-event-planner/hostv2/ and
// events.noguessworksystems.com/hostv2/ (owner ruling 11/19/2026): a link
// hard-coded to either host would be wrong at the other. Where the app has no
// public web address (a native build without REACT_APP_PUBLIC_APP_URL), an
// in-app page has nowhere true to point, so it is not shown.
import { BRAND } from './brand';
import { publicAppUrl } from './publicAppUrl';

const LABELS = [['privacy', 'Privacy'], ['terms', 'Terms'], ['refunds', 'Refunds']];
const APP_PAGE = /^legal\/[a-z0-9-]+\.html$/;

function currentAppUrl() {
  try { return publicAppUrl(); } catch { return null; }
}

function resolve(value, appUrl) {
  if (typeof value !== 'string') return null;
  if (/^https:\/\/[^\s]+$/.test(value)) return value;
  if (!APP_PAGE.test(value) || !appUrl) return null;
  try { return new URL(value, appUrl).href; } catch { return null; }
}

export function publishedPolicies(policies = BRAND.policies, appUrl = currentAppUrl()) {
  return LABELS
    .map(([key, label]) => ({ key, label, url: resolve(policies && policies[key], appUrl) }))
    .filter((p) => p.url);
}
