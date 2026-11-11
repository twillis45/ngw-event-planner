// The policy publisher's core, kept apart from the CLI (publish-policies.mjs)
// so a jest test can hold it to the rule without touching the filesystem —
// the same split as verify-summary.js.
//
// THE RULE: nothing reaches a public page while a draft marker remains. The
// drafts in docs/legal/ carry four kinds of marker, and any one of them, on any
// line, refuses the whole run (no page is written, not even the clean ones):
//
//   [OWNER: …]   a fact only the owner can supply
//   COUNSEL      a question an attorney decides (blocks and inline notes)
//   VERIFY:      a claim someone still has to check
//   DRAFT        the "not yet reviewed" header each draft opens with
//
// Removing them is the act of sign-off; this script cannot tell whether an
// attorney approved the text, only whether someone says so by deleting them.
//
// THE CITATION CONVENTION (draft-only scaffolding, stripped on publish):
//
//   ⟶ … ⟵   a margin note — a code citation, or a note to the reviewer. It
//            opens at ⟶ and closes at the next ⟵, may span lines, and may sit
//            mid-sentence; prose after ⟵ is kept. The published page never
//            carries what lies between them. An unclosed ⟶, a stray ⟵, or a
//            ⟶ inside an open note refuses the run, because guessing where a
//            citation ends is how code paths leak into a legal page.
//
// Nothing here is legal advice; this only moves reviewed text into HTML.

const OPEN = '⟶';
const CLOSE = '⟵';

const POLICIES = Object.freeze([
  { slug: 'privacy', label: 'Privacy', file: 'docs/legal/PRIVACY_POLICY_DRAFT.md' },
  { slug: 'terms', label: 'Terms', file: 'docs/legal/TERMS_OF_SERVICE_DRAFT.md' },
  { slug: 'refunds', label: 'Refunds', file: 'docs/legal/REFUND_POLICY_DRAFT.md' },
]);

const MARKERS = [
  ['[OWNER:', /\[OWNER\b/],
  ['COUNSEL', /\bCOUNSEL\b/],
  ['VERIFY:', /\bVERIFY:/],
  ['DRAFT', /\bDRAFT\b/],
];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

/** Every reason this source may not be published, as { file, line, marker, text }. */
function findProblems(source, file) {
  const problems = [];
  source.split('\n').forEach((text, i) => {
    for (const [marker, re] of MARKERS) {
      if (re.test(text)) problems.push({ file, line: i + 1, marker, text: text.trim() });
    }
  });
  let openAt = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === OPEN) {
      if (openAt >= 0) {
        problems.push({ file, line: lineOf(source, i), marker: 'citation', text: `${OPEN} inside a note opened at line ${lineOf(source, openAt)} — close it with ${CLOSE}` });
      }
      openAt = i;
    } else if (ch === CLOSE) {
      if (openAt < 0) problems.push({ file, line: lineOf(source, i), marker: 'citation', text: `stray ${CLOSE} with no ${OPEN} before it` });
      openAt = -1;
    }
  }
  if (openAt >= 0) {
    problems.push({ file, line: lineOf(source, openAt), marker: 'citation', text: `unclosed ${OPEN} — end the note with ${CLOSE}` });
  }
  return problems.sort((a, b) => a.line - b.line);
}

/** Remove every ⟶ … ⟵ note; drop lines that held nothing else. */
function stripScaffolding(source) {
  const HOLE = '\u0000';
  return source
    .replace(/[ \t]*⟶[\s\S]*?⟵/g, HOLE)
    .split('\n')
    .filter((l) => !(l.includes(HOLE) && l.replace(new RegExp(HOLE, 'g'), '').trim() === ''))
    .map((l) => l.split(HOLE).join(''))
    .join('\n');
}

// ── a small markdown renderer for the subset the drafts use ───────────────
// Headings, paragraphs, bullet and numbered lists, block quotes, pipe tables,
// rules; inline code, bold, italic, links, bare emails. No dependency: the
// drafts are three files we control, and a full parser is permanent code that
// someone else updates for a job this size.

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text) {
  return text.split(/(`[^`]*`)/).map((part) => {
    if (/^`[^`]*`$/.test(part)) return `<code>${esc(part.slice(1, -1))}</code>`;
    let h = esc(part);
    h = h.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1<em>$2</em>');
    h = h.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, '<a href="$2">$1</a>');
    if (!h.includes('<a ')) h = h.replace(new RegExp(`(^|[^\\w.:/"])(${EMAIL.source})`, 'g'), '$1<a href="mailto:$2">$2</a>');
    return h;
  }).join('');
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,})\s*$/;
const QUOTE = /^\s*>/;
const TABLE = /^\s*\|/;
const ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const LABEL_LINE = /^\*\*[^*]+:\*\*/; // "**Effective:** …" — each is its own line

function isBlockStart(line) {
  return HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || TABLE.test(line) || ITEM.test(line);
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    let m = HEADING.exec(line);
    if (m) { const n = m[1].length; out.push(`<h${n}>${inline(m[2].trim())}</h${n}>`); i++; continue; }

    if (RULE.test(line)) { out.push('<hr>'); i++; continue; }

    if (QUOTE.test(line)) {
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i])) inner.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(inner.join('\n'))}</blockquote>`);
      continue;
    }

    if (TABLE.test(line)) {
      const rows = [];
      while (i < lines.length && TABLE.test(lines[i])) {
        rows.push(lines[i++].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
      }
      const hasHead = rows.length > 1 && rows[1].every((c) => /^:?-{3,}:?$/.test(c));
      const head = hasHead ? `<thead><tr>${rows[0].map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : '';
      const body = (hasHead ? rows.slice(2) : rows).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<div class="table"><table>${head}<tbody>${body}</tbody></table></div>`);
      continue;
    }

    m = ITEM.exec(line);
    if (m) {
      const ordered = /\d/.test(m[2]);
      const start = ordered ? parseInt(m[2], 10) : 1;
      const items = [];
      while (i < lines.length) {
        const im = ITEM.exec(lines[i]);
        if (im && /\d/.test(im[2]) === ordered) {
          items.push([im[3]]);
          i++;
        } else if (lines[i].trim() && items.length && !isBlockStart(lines[i])) {
          items[items.length - 1].push(lines[i].trim());
          i++;
        } else if (!lines[i].trim()) {
          // A blank line ends the list unless the next item continues it.
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          const nm = j < lines.length && ITEM.exec(lines[j]);
          if (nm && /\d/.test(nm[2]) === ordered) { i = j; continue; }
          break;
        } else {
          break;
        }
      }
      const tag = ordered ? 'ol' : 'ul';
      const attr = ordered && start !== 1 ? ` start="${start}"` : '';
      out.push(`<${tag}${attr}>${items.map((it) => `<li>${inline(it.join(' '))}</li>`).join('')}</${tag}>`);
      continue;
    }

    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i]) && !LABEL_LINE.test(lines[i].trim())) {
      para.push(lines[i++].trim());
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ── one page ──────────────────────────────────────────────────────────────

const STYLE = `
:root { color-scheme: light dark; --bg: #ffffff; --fg: #1c1c1e; --muted: #5c5c66; --rule: #d8d8de; --link: #0b57d0; --tint: #f3f3f6; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #141416; --fg: #ececf0; --muted: #a6a6b0; --rule: #36363c; --link: #8ab4f8; --tint: #212125; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-text-size-adjust: 100%; }
main { max-width: 65ch; margin: 0 auto; padding: 32px 16px 48px; overflow-wrap: anywhere; }
h1 { font-size: 1.75rem; line-height: 1.25; margin: 0 0 16px; }
h2 { font-size: 1.3rem; line-height: 1.3; margin: 40px 0 8px; }
h3 { font-size: 1.08rem; margin: 28px 0 6px; }
p, ul, ol { margin: 0 0 14px; }
li { margin: 0 0 6px; }
a { color: var(--link); }
code { font: 0.9em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--tint); padding: 1px 4px; border-radius: 4px; }
hr { border: 0; border-top: 1px solid var(--rule); margin: 32px 0; }
blockquote { margin: 0 0 14px; padding: 4px 0 4px 16px; border-left: 3px solid var(--rule); color: var(--muted); }
.table { overflow-x: auto; margin: 0 0 14px; }
table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--rule); }
th { font-weight: 600; }
footer { max-width: 65ch; margin: 0 auto; padding: 0 16px 48px; color: var(--muted); font-size: 0.92rem; }
footer p { margin: 0 0 8px; }
`;

function buildPage({ slug, file, source }) {
  const problems = findProblems(source, file);
  if (problems.length) return { ok: false, slug, problems };

  const md = stripScaffolding(source);
  const title = (/^#\s+(.+)$/m.exec(md) || [])[1];
  const effective = ((/^\*\*Effective:\*\*\s*(.+)$/m.exec(md) || [])[1] || '').replace(/`/g, '').trim();
  const email = (EMAIL.exec(md) || [])[0];
  const missing = [];
  if (!title) missing.push('a "# Title" heading');
  if (!effective) missing.push('an "**Effective:** <date>" line');
  if (!email) missing.push('a contact email address');
  if (missing.length) {
    return { ok: false, slug, problems: missing.map((what) => ({ file, line: 1, marker: 'missing', text: `no ${what}` })) };
  }

  const others = POLICIES.filter((p) => p.slug !== slug)
    .map((p) => `<a href="${p.slug}.html">${p.label}</a>`).join(' · ');
  const html = `<!doctype html>
<!-- Generated by scripts/publish-policies.mjs from ${file}. Edit the source and re-run; do not edit this file. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title.trim())}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${renderMarkdown(md)}
</main>
<footer>
<hr>
<p>Effective ${esc(effective)}. Questions: <a href="mailto:${email}">${email}</a></p>
<p>${others}</p>
</footer>
</body>
</html>
`;
  return { ok: true, slug, title: title.trim(), effective, email, html };
}

/** All or nothing: pages only when every source is clean. */
function publishPolicies(sources) {
  const results = sources.map(buildPage);
  const problems = results.flatMap((r) => (r.ok ? [] : r.problems));
  if (problems.length) return { ok: false, problems, pages: [] };
  return { ok: true, problems: [], pages: results };
}

function formatProblem(p) {
  return `${p.file}:${p.line}  ${p.marker}  ${p.text}`;
}

module.exports = { POLICIES, findProblems, stripScaffolding, renderMarkdown, buildPage, publishPolicies, formatProblem };
