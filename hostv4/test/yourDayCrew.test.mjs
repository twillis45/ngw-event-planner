// @vitest-environment jsdom
// YOUR DAY CREW (B3, 11/26/2026; the Thanksgiving mockup, 8:00 AM). Pushed from
// The Day: each helper gets a link to their own job and nothing else.
//   · a row per helper (lib/helperJob crewRows): their jobs, and "Link sent",
//     "Has it" or "Can’t do it" from their own answer;
//   · Send: the link is made on the server (lib/api/helperLink, the account
//     hostv2 signed in), then a text to their phone or a copy, recording the
//     handoff and the link (lib/helperJob, hostv2's send); Email when they have
//     an address; a failed link says why and that nothing was sent;
//   · Everyone's part today: hostv2's draft (draftHelperBrief), to copy;
//   · Print the day sheet: in the current app for now.
// The server calls are faked here; nothing is made or sent.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

const api = vi.hoisted(() => ({ mint: vi.fn(), email: vi.fn(), answers: vi.fn() }));
vi.mock('@app/lib/api/helperLink', () => ({
  isHelperLinkApiConfigured: () => true,
  mintHelperLinkResult: api.mint,
  emailHelperJob: api.email,
  fetchHelperConfirmations: api.answers,
  helperEmailWords: (r) => (r && r.ok ? 'Emailed.' : 'Couldn’t email it.'),
}));
const { CrewPage } = await import('../src/DayPage.jsx');
const { default: DayPage } = await import('../src/DayPage.jsx');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TG = {
  id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host',
  venue: '12 Elm Street', guestMode: 'list', vendors: [], budget: [],
  guests: [
    { id: 'g-maya', name: 'Maya Fenn', phone: '(240) 555-0101', rsvp: 'Yes' },
    { id: 'g-sam', name: 'Sam Ortiz', email: 'sam@example.com', rsvp: 'Yes' },
  ],
  timeline: [
    { id: 't-ice', task: 'Drinks and ice', owner: 'Maya Fenn', done: false },
    { id: 't-coats', task: 'Coats and parking', owner: 'Sam Ortiz', done: false },
  ],
  helperLinkIds: ['g-sam'],
};
let host; let root; let saved;
const save = (ed) => { saved.push(ed); return true; };
beforeEach(() => {
  saved = []; api.mint.mockReset(); api.email.mockReset(); api.answers.mockReset();
  api.answers.mockResolvedValue([{ helper_key: 'g-sam', state: 'confirmed' }]);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const q = (s) => host.querySelector(s);
const qa = (s) => [...host.querySelectorAll(s)];
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const mount = async (ev = TG) => { act(() => root.render(createElement(CrewPage, { ev, save, nav: null, status: null }))); await flush(); };

describe('your day crew', () => {
  it('a row per helper with their jobs and where they stand', async () => {
    await mount();
    const rows = qa('[data-crew-row]');
    expect(rows.map((r) => r.getAttribute('data-crew-row'))).toEqual(['g-maya', 'g-sam']);
    expect(rows[0].textContent).toMatch(/Maya Fenn.*Drinks and ice/);
    expect(rows[1].textContent).toMatch(/Has it/);
  });

  it('Send: the link is made, then a text to their phone; the handoff and the link are recorded', async () => {
    api.mint.mockResolvedValue({ ok: true, code: 'abc', helperKey: 'g-maya' });
    await mount();
    await act(async () => { q('[data-crew-row="g-maya"] [data-crew-send]').click(); });
    await flush();
    expect(api.mint).toHaveBeenCalledWith('tg', 'Maya Fenn');
    const text = q('[data-crew-text]');
    expect(text.getAttribute('href')).toMatch(/^sms:2405550101\?&body=/);
    expect(decodeURIComponent(text.getAttribute('href'))).toContain('/hostv2/?helper=abc');
    // The link exists once it is made, sent or not (hostv2's rule): saved quietly.
    expect(saved[0]).toEqual({ patch: { helperLinkIds: ['g-sam', 'g-maya'] } });
    act(() => { text.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
    expect(Object.values(saved[1].patch.sendLedger)[0]).toMatchObject({ status: 'handed_off', channel: 'sms' });
  });

  it('a failed link says why, and that nothing was sent', async () => {
    api.mint.mockResolvedValue({ ok: false, kind: 'signed-out' });
    await mount();
    await act(async () => { q('[data-crew-row="g-maya"] [data-crew-send]').click(); });
    await flush();
    expect(q('[role="alert"]').textContent).toBe('Sign in to make Maya’s link. Nothing was sent.');
    expect(saved).toEqual([]);
  });

  it('a helper with an email: the app emails their job', async () => {
    api.mint.mockResolvedValue({ ok: true, code: 'def', helperKey: 'g-sam' });
    api.email.mockResolvedValue({ ok: true });
    await mount();
    await act(async () => { q('[data-crew-row="g-sam"] [data-crew-send]').click(); });
    await flush();
    await act(async () => { q('[data-crew-email]').click(); });
    await flush();
    expect(api.email).toHaveBeenCalledWith('tg', 'Sam Ortiz');
    expect(q('[data-crew-emailed]').textContent).toBe('Emailed.');
  });

  it('everyone’s part today, and the day sheet in the current app', async () => {
    await mount();
    act(() => q('[data-crew-brief]').click());
    // hostv2's draft, word for word: the day's schedule grouped by who runs each step.
    const { draftHelperBrief } = await import('@app/lib/doItForMe');
    const { todaysRos } = await import('@app/lib/dayOfEdits');
    const want = draftHelperBrief(TG, null, { ros: todaysRos(TG, new Date()) }).body;
    expect(want).toMatch(/everyone’s part/);
    expect(q('[role="dialog"] .qhelp').textContent).toBe(want);
    expect(q('[data-crew-print]').getAttribute('href')).toBe('../hostv2/');
  });

  it('no one has a job yet: says so, and where to give one', async () => {
    await mount({ ...TG, timeline: [], helperLinkIds: [] });
    expect(q('[data-crew-empty]').textContent).toMatch(/No one has a job yet/);
  });
});

describe('The Day opens it', () => {
  it('a row with how many links went out', async () => {
    let opened = 0;
    act(() => root.render(createElement(DayPage, { ev: TG, save, status: null, onRun: () => {}, onCounter: () => {}, onCrew: () => { opened += 1; }, now: new Date('2026-11-26T07:30:00') })));
    const row = q('[data-open-crew]');
    expect(row.textContent).toMatch(/Your day crew.*1 of 2 sent/);
    act(() => row.click());
    expect(opened).toBe(1);
  });
});
