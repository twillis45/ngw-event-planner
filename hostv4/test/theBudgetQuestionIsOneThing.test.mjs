// THE BUDGET QUESTION IS ONE THING (UX_12 §1, owner 11/25/2026). hostv4's first
// real question, measured rather than judged:
//   - 40 words or fewer on the screen, counted with its button and tab bar;
//   - one primary button, saying exactly what happens, with the figure hostv2's
//     ask lights (lib/budgetChoices, one answer for both shells, 11/26/2026);
//   - the choices are hostv2's: Lean, Mid-range, All-out (and "Covers your plan"
//     when the lit figure is none of them), each with its per-head;
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
import { budgetChoices } from '@app/lib/budgetChoices';

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

  it('has one primary button, naming the figure hostv2 lights', () => {
    const buttons = html.match(/class="primary"[^>]*>[^<]*/g) || [];
    expect(buttons.length).toBe(1);
    const bc = budgetChoices({ type: 'Birthday', guestEstimate: 25 });
    expect(text(buttons[0])).toContain('Plan with $' + bc.cta.lit.toLocaleString('en-US'));
  });

  it('offers hostv2’s choices, the lit one picked', () => {
    const bc = budgetChoices({ type: 'Birthday', guestEstimate: 25 });
    const rows = html.match(/<button[^>]*role="radio"[\s\S]*?<\/button>/g) || [];
    // The picked choice carries its per-head; the others say their figure only.
    expect(rows.map((r) => text(r).replace(/\s+/g, ' ').trim())).toEqual(bc.choices.map((c) => `${c.label} $${c.amount.toLocaleString('en-US')}${c.lit ? ' ' + c.perHead : ''}`));
    expect((html.match(/aria-checked="true"/g) || []).length).toBe(1);
  });

  it('saves only through patchSavedEvent, the function hostv2 saves with', () => {
    expect(src).toMatch(/patchSavedEvent\(/);
    expect(src).not.toMatch(/saveCustomEvents|localStorage\.setItem/);
  });
});

describe('a step v4 cannot do yet is never a dead end', () => {
  it('every screen that says "opens in the current app" has the button that does it', () => {
    // The budget branch answers in place; every other ask shows the link, the sample included.
    // A Guests ask opens the Guests page here; every other ask opens the current app.
    expect(src).toMatch(/tab === 'next' && !sb && next && next\.guests && <div className="action"><button className="primary" onClick=\{\(\) => push\('guests'\)\}>Open Guests/);
    expect(src).toMatch(/tab === 'next' && !sb && next && !next\.guests && <div className="action">\{openInCurrent\}/);
    expect(src).not.toMatch(/!sb && !sample/);
  });
});
