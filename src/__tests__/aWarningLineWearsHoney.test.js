// ─── A WARNING LINE WEARS THE HONEY CHIP, IN BOTH THEMES (owner, 11/22/2026) ──
//
// #231's ruling: "attention is umber on an opaque honey chip", one value in
// both themes (--honey / --on-honey, 7.65:1), "not orange body copy". #231 moved
// the create screen's type guess; it left about a dozen warning paragraphs
// colored inline with `color: var(--warn)`, which in dark is orange body text
// ("The last day needs to be after…", "Add the full link…", a malformed email,
// the crab order's issues). Those now carry the `warn-note` class, which paints
// the same honey treatment.
//
// Pinned on the source: no <p> or plain message <span> in hostv2 colors itself
// with --warn inline, and `.warn-note` reads the honey tokens.
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..', 'hostv2', 'src');
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.jsx')).map((f) => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]);
const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');

test('no warning paragraph is colored orange inline', () => {
  const hits = [];
  for (const [f, text] of files) {
    text.split('\n').forEach((line, i) => {
      // A paragraph, or the review-reply error span, whose inline style names --warn as its color.
      if (/<p\b[^>]*color:\s*'var\(--warn\)'/.test(line) || /<span style=\{\{ fontSize: 12, color: 'var\(--warn\)'/.test(line)) hits.push(`${f}:${i + 1}`);
      if (/\{ color: 'var\(--warn\)' \}\}>\{dstatC\.reason\}/.test(line)) hits.push(`${f}:${i + 1}`);
    });
  }
  expect(hits).toEqual([]);
});

test('the warning lines carry warn-note', () => {
  const all = files.map(([, t]) => t).join('\n');
  const n = (all.match(/warn-note/g) || []).length;
  expect(n).toBeGreaterThanOrEqual(12);
  for (const marker of ['Add the full link (starts with https://)', 'That doesn’t look like an email address.', 'The last day needs to be after']) {
    const at = all.indexOf(marker);
    expect(at).toBeGreaterThan(-1);
    expect(all.slice(Math.max(0, at - 400), at)).toMatch(/warn-note/);
  }
});

test('warn-note is the honey chip: umber on honey, the same tokens in both themes', () => {
  const rule = (css.match(/\.warn-note[^{]*\{([^}]*)\}/) || [])[1] || '';
  expect(rule).toMatch(/background:\s*var\(--honey\)/);
  expect(rule).toMatch(/color:\s*var\(--on-honey\)/);
  expect(css).not.toMatch(/data-theme="(light|dark)"\][^{]*\.warn-note/); // one value, both themes
});

// "$220 over, expected" on the board's budget tile (owner screenshot of the
// iPad landscape board, 11/22/2026) painted --warn orange text in dark. It is
// the same attention signal, so it wears the same honey, and the " · " joiner
// sits outside the chip.
test('the budget tile’s over amount wears the honey chip, not orange text', () => {
  const rule = (css.match(/\.over-seg\s*\{([^}]*)\}/) || css.match(/\.tile-c \.over-seg[^{]*\{([^}]*)\}/) || [])[1] || '';
  expect(rule).toMatch(/background:\s*var\(--honey\)/);
  expect(rule).toMatch(/color:\s*var\(--on-honey\)/);
  const shell = files.find(([f]) => f === 'HostShellV2.jsx')[1];
  expect(shell).not.toMatch(/className="over-seg">\{' · '/);
});
