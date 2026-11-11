// The policy publisher (scripts/publish-policies.mjs) must never put an
// unreviewed draft on a public page. Stage 9, LEGAL-1 (11/11/2026).
//
// Red-proofed two ways: (1) with marker detection disabled in findProblems,
// the first test goes red (the drafts publish); (2) with stripScaffolding made
// a no-op, the fixture test goes red (code citations reach the HTML).
const fs = require('fs');
const path = require('path');
const { POLICIES, publishPolicies, buildPage, formatProblem } = require('../../../scripts/policy-publish-core.js');

const ROOT = path.resolve(__dirname, '../../..');
const drafts = () => POLICIES.map((p) => ({ ...p, source: fs.readFileSync(path.join(ROOT, p.file), 'utf8') }));
const lineOf = (source, needle) => source.split('\n').findIndex((l) => l.includes(needle)) + 1;

test('today\'s drafts are refused, nothing is produced, and each placeholder is named by file:line', () => {
  const sources = drafts();
  const result = publishPolicies(sources);
  expect(result.ok).toBe(false);
  expect(result.pages).toEqual([]);

  const report = result.problems.map(formatProblem);
  const [privacy, terms, refunds] = sources;
  const expectAt = (doc, needle, marker) => {
    const line = lineOf(doc.source, needle);
    expect(line).toBeGreaterThan(0);
    expect(report).toContainEqual(expect.stringContaining(`${doc.file}:${line}  ${marker}`));
  };
  expectAt(privacy, '[OWNER: effective date]', '[OWNER:');
  expectAt(privacy, '[OWNER: governing state]', '[OWNER:');
  expectAt(terms, '[OWNER: minimum age', '[OWNER:');
  expectAt(terms, '**COUNSEL:** Is incorporation by reference', 'COUNSEL');
  expectAt(refunds, '[OWNER: refund rule — pick one]', '[OWNER:');
  expectAt(refunds, '**COUNSEL — where the rule choice', 'COUNSEL');
  for (const doc of sources) expectAt(doc, '**DRAFT ', 'DRAFT');

  // Every ⟶ citation in the drafts is closed, so once the markers are gone the
  // only thing left between a draft and a page is the review itself.
  expect(result.problems.filter((p) => p.marker === 'citation')).toEqual([]);
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
