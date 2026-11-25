// THE BUDGET QUESTION IS ONE THING (UX_12 §1, owner 11/25/2026). hostv4's first
// real question, measured rather than judged:
//   - 40 words or fewer on the screen, counted with its button and tab bar;
//   - one primary button, saying exactly what happens, with sourcedBudget's figure;
//   - the answer is saved through patchSavedEvent, the function hostv2 saves
//     with, and through nothing else.
// Rendered on the server, so there is no saved plan: the shell shows its sample
// birthday, which asks for a budget.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import HostShellV4 from '../src/HostShellV4.jsx';
import { sourcedBudget } from '@app/lib/playbooks';

const html = renderToStaticMarkup(createElement(HostShellV4));
const text = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, "'");
const words = (h) => text(h).split(/\s+/).filter((w) => /[A-Za-z0-9$]/.test(w));
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'HostShellV4.jsx'), 'utf8');

describe('the budget question is one thing', () => {
  it('asks it on the sample plan', () => {
    expect(html).toContain('data-budget');
    expect(text(html)).toContain('How much do you want to spend?');
  });

  it('carries 40 words or fewer, counted with its button and tab bar', () => {
    const n = words(html).length;
    expect(n, words(html).join(' ')).toBeLessThanOrEqual(40);
  });

  it('has one primary button, naming the cited figure it plans with', () => {
    const buttons = html.match(/class="primary"[^>]*>[^<]*/g) || [];
    expect(buttons.length).toBe(1);
    const sb = sourcedBudget({ type: 'Birthday', guestEstimate: 25 });
    const mid = (sb.steps[1] || sb.steps[0]).mid;
    expect(text(buttons[0])).toContain('Plan with $' + mid.toLocaleString('en-US'));
  });

  it('saves only through patchSavedEvent, the function hostv2 saves with', () => {
    expect(src).toMatch(/patchSavedEvent\(/);
    expect(src).not.toMatch(/saveCustomEvents|localStorage\.setItem/);
  });
});

describe('a step v4 cannot do yet is never a dead end', () => {
  it('every screen that says "opens in the current app" has the button that does it', () => {
    // The budget branch answers in place; every other ask shows the link, the sample included.
    expect(src).toMatch(/tab === 'next' && !sb && next && <div className="action">\{openInCurrent\}/);
    expect(src).not.toMatch(/!sb && !sample/);
  });
});
