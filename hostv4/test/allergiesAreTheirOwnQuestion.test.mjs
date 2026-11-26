// @vitest-environment jsdom
// The owner, 11/25/2026, on a guest's sheet in hostv4: "Dietary options are
// missing, and allergies need to be separated from dietary options." The sheet
// had a meal list and one free-text "Dietary needs" box. The guest's own RSVP
// form already asks three separate things (a meal; diet rules; the FDA's nine
// major allergens) and saves g.meal, g.diets and g.allergens, which the food
// plan and the helper asks read. The host could set none of the last two, and
// could not pick Pescatarian, which a guest can.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEALS, ALLERGENS, DIET_RULES } from '@app/lib/dietOptions';
import { MEAL_CHOICES, listToggleEdit } from '@app/lib/guestEdits';
import { GuestDetail } from '../src/GuestsPage.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const here = path.dirname(fileURLToPath(import.meta.url));
const ev = { id: 'e1', guests: [{ id: 'g1', name: 'Linda Example', rsvp: 'Yes', meal: 'Vegetarian', diets: ['Halal'], allergens: [] }], plusOnePolicy: 'no_plus_ones', kidsPolicy: 'adults_only' };

describe('one list of meals, diets and allergens', () => {
  it('the guest form takes its lists from the shared module, not its own copy', () => {
    const src = readFileSync(path.resolve(here, '../../hostv2/src/InviteV2.jsx'), 'utf8');
    expect(src).not.toMatch(/const (ALLERGENS|DIET_RULES|MEALS) = \[/);
    expect(src).toMatch(/from '@app\/lib\/dietOptions'/);
  });
  it('the host can pick every meal a guest can', () => {
    for (const m of MEALS) expect(MEAL_CHOICES).toContain(m);
  });
  it('the nine major allergens, and diet rules that are not allergens', () => {
    expect(ALLERGENS).toHaveLength(9);
    for (const d of DIET_RULES) expect(ALLERGENS).not.toContain(d);
  });
});

describe('listToggleEdit', () => {
  it('adds and removes one item, keeping the others', () => {
    const on = listToggleEdit(ev, 0, 'allergens', 'Peanut', 'Linda');
    expect(on.patch.guests[0].allergens).toEqual(['Peanut']);
    expect(on.msg).toMatch(/Peanut/);
    const off = listToggleEdit({ ...ev, guests: on.patch.guests }, 0, 'diets', 'Halal', 'Linda');
    expect(off.patch.guests[0].diets).toEqual([]);
    expect(off.patch.guests[0].allergens).toEqual(['Peanut']);
  });
});

describe("the guest's sheet asks diet and allergies apart", () => {
  let host; let root; let saved;
  beforeEach(() => {
    saved = [];
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    act(() => root.render(createElement(GuestDetail, { ev, g: ev.guests[0], i: 0, save: (ed) => { saved.push(ed); return true; }, onDone: () => {} })));
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); });
  const group = (label) => host.querySelector(`[role="group"][aria-label="${label}"]`);
  it('shows a Diet group and an Allergies group, each with every option', () => {
    expect([...group('Diet').querySelectorAll('button')].map((b) => b.textContent)).toEqual(DIET_RULES);
    expect([...group('Allergies').querySelectorAll('button')].map((b) => b.textContent)).toEqual(ALLERGENS);
  });
  it('marks what is saved, and a tap saves only that list', () => {
    const halal = [...group('Diet').querySelectorAll('button')].find((b) => b.textContent === 'Halal');
    expect(halal.getAttribute('aria-pressed')).toBe('true');
    const peanut = [...group('Allergies').querySelectorAll('button')].find((b) => b.textContent === 'Peanut');
    act(() => peanut.click());
    expect(saved[0].patch.guests[0].allergens).toEqual(['Peanut']);
    expect(saved[0].patch.guests[0].diets).toEqual(['Halal']);
  });
  it('the free-text box is for anything else, not the diet', () => {
    expect(host.querySelector('[aria-label="Dietary needs"]')).toBeNull();
    expect(host.querySelector('[aria-label="Other needs"]')).not.toBeNull();
  });
});
