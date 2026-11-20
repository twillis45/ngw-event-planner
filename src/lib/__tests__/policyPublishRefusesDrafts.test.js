// The policy publisher (scripts/publish-policies.mjs) must never put an
// unreviewed draft on a public page. Stage 9, LEGAL-1 (11/11/2026).
//
// Red-proofed (11/11): with stripScaffolding made a no-op, the fixture test goes
// red (code citations reach the HTML). Refusal on a marker is held by the
// fixture tests below; the first test guards the published pages (11/20).
const fs = require('fs');
const path = require('path');
const { POLICIES, publishPolicies, buildPage, formatProblem } = require('../../../scripts/policy-publish-core.js');

const ROOT = path.resolve(__dirname, '../../..');
const drafts = () => POLICIES.map((p) => ({ ...p, source: fs.readFileSync(path.join(ROOT, p.file), 'utf8') }));

// Published 11/20/2026 (owner ruling: publish now, revise after the attorney).
// The drafts carry no marker now, so the guard is the other half of the rule:
// the committed pages are exactly what the script builds from today's sources.
// An edit to a draft without re-running `npm run policies:publish` (or a hand
// edit to a page) fails here. Red-proofed: a one-word change to a draft, not
// republished, turns this red.
test('today\'s policies publish cleanly, and each committed page is exactly what the script builds', () => {
  const result = publishPolicies(drafts());
  expect(result.problems.map(formatProblem)).toEqual([]);
  expect(result.ok).toBe(true);
  for (const page of result.pages) {
    const committed = fs.readFileSync(path.join(ROOT, 'hostv2', 'public', 'legal', `${page.slug}.html`), 'utf8');
    expect(committed).toBe(page.html);
    expect(page.effective).toBe('November 20, 2026');
    for (const scaffold of ['⟶', '⟵', '[OWNER', 'COUNSEL', 'VERIFY:']) expect(page.html).not.toContain(scaffold);
  }
});

const FIXTURE = `# Fixture Policy — Test Co

**Effective:** November 20, 2026
**Contact:** help@example.com ⟶ \`src/lib/brand.js:145\` ⟵

---

## 1. Section

Made by Test Co. ⟶ \`src/lib/brand.js:139,
142\` ⟵ These terms apply to everyone.

- **Hosts** sign in by email. ⟶ \`HostShellV2.jsx:2122\`
  (\`signInWithOtp\`) ⟵
- Type \`DELETE\` to confirm.
  ⟶ \`account.py:30-41\` ⟵

| Service | Why |
|---|---|
| Stripe | Payment ⟶ \`stripe_payments.py\` ⟵ |
`;

test('a clean fixture becomes a page with its title, effective date and contact, and no citation scaffolding', () => {
  const page = buildPage({ slug: 'terms', file: 'fixture.md', source: FIXTURE });
  expect(page.ok).toBe(true);
  expect(page.html).toContain('<title>Fixture Policy — Test Co</title>');
  expect(page.html).toContain('<h1>Fixture Policy — Test Co</h1>');
  expect(page.html).toContain('Effective November 20, 2026');
  expect(page.html).toContain('href="mailto:help@example.com"');
  // prose after a mid-sentence citation survives, joined
  expect(page.html).toContain('Made by Test Co. These terms apply to everyone.');
  expect(page.html).toContain('<code>DELETE</code>');
  expect(page.html).toContain('<td>Payment</td>');
  for (const scaffold of ['⟶', '⟵', 'brand.js', 'HostShellV2', 'signInWithOtp', 'account.py', 'stripe_payments']) {
    expect(page.html).not.toContain(scaffold);
  }
  expect(page.html).toMatch(/prefers-color-scheme: dark/);
  expect(page.html).toMatch(/max-width: 65ch/);
});

test('an unclosed citation refuses rather than guessing where it ends', () => {
  const unclosed = buildPage({ slug: 'terms', file: 'fixture.md', source: FIXTURE.replace('`stripe_payments.py` ⟵', '`stripe_payments.py`') });
  expect(unclosed.ok).toBe(false);
  expect(unclosed.problems.map(formatProblem)).toEqual([expect.stringMatching(/^fixture\.md:20 {2}citation {2}unclosed/)]);
  // ...and one left open mid-document is caught at the next note it would swallow
  const swallowing = buildPage({ slug: 'terms', file: 'fixture.md', source: FIXTURE.replace('⟶ `account.py:30-41` ⟵', '⟶ `account.py:30-41`') });
  expect(swallowing.ok).toBe(false);
  expect(swallowing.problems.map(formatProblem)).toEqual([expect.stringMatching(/^fixture\.md:20 {2}citation {2}⟶ inside a note opened at line 16/)]);
});

test('one refused policy blocks all three — no partial publish', () => {
  const clean = { slug: 'privacy', file: 'a.md', source: FIXTURE };
  const dirty = { slug: 'terms', file: 'b.md', source: FIXTURE.replace('November 20, 2026', '`[OWNER: effective date]`') };
  const result = publishPolicies([clean, dirty]);
  expect(result.ok).toBe(false);
  expect(result.pages).toEqual([]);
  expect(result.problems.map(formatProblem)).toEqual([expect.stringMatching(/^b\.md:3 {2}\[OWNER:/)]);
});
