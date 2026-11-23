// ─── MONEY COMING IN · SPONSORS (owner pick B + A's ask, 11/21/2026) ─────────
//
// PTA, Gala and Conference rows about sponsors had nowhere to go: money in
// this app was spend-only. Your money gains "Money coming in · sponsors"
// (event.sponsors[]): the business, the amount, what their name goes on,
// Mark received, Mark thanked, Draft their report. It shows pledged vs in hand
// and is NEVER counted as spending and never lowers a spend total: nothing
// here is read by budgetFor / hostSpending. The ask row gets "Draft the
// sponsor ask" on the existing draft sheet; the thank / report / recognition
// rows open the sponsor list.

import { fmtLongDate } from './doItForMe';
import { decisionAnswered } from './playbooks';

// The rows the sponsor list answers: thanks, the banner, the recognition owed,
// the prospectus (Gala, Conference).
export const SPONSOR_LIST_ROW = /^thank (?:the )?sponsors\b|^order the sponsor thank-you banner\b|^collect sponsor logos\b|\bprospectus\b/i;
// Which playbooks show the sponsor list without a row opening it.
export const SPONSOR_TYPES = ['PTA / Booster Fundraiser', 'Fundraiser / Gala', 'Conference'];

const str = (v) => String(v == null ? '' : v).trim();
const amt = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

export function sponsorsOf(event) {
  return (Array.isArray(event && event.sponsors) ? event.sponsors : []).filter((s) => s && s.id && str(s.business));
}

/** Pledged (every sponsor's amount) and in hand (the received ones). */
export function sponsorTotals(event) {
  const list = sponsorsOf(event);
  return {
    pledged: list.reduce((t, s) => t + amt(s.amount), 0),
    inHand: list.filter((s) => s.received).reduce((t, s) => t + amt(s.amount), 0),
    count: list.length,
  };
}

/** The new sponsors[] with one added, or null when the business is blank. */
export function addSponsor(event, { business, amount, recognition }, id) {
  const b = str(business);
  if (!b) return null;
  return [...sponsorsOf(event), {
    id: id || 's-' + Date.now().toString(36), business: b.slice(0, 80), amount: amt(amount),
    recognition: str(recognition).slice(0, 120), received: false, thanked: false,
  }];
}

/** Toggle received / thanked on one sponsor. */
export function markSponsor(event, id, key, value) {
  if (!['received', 'thanked'].includes(key)) return sponsorsOf(event);
  return sponsorsOf(event).map((s) => (s.id === id ? { ...s, [key]: !!value } : s));
}

// The fundraising goal, ONLY when the host chose it: an outgoing ask may not
// state the playbook's default as if it were theirs.
const GOAL_DECISIONS = ['fundraising_goal', 'target'];
function hostGoal(event) {
  const picks = (event && event.foodChoices) || {};
  for (const id of GOAL_DECISIONS) {
    let answered = false;
    try { answered = decisionAnswered(event, id); } catch (_e) { answered = false; }
    if (answered && str(picks[id])) return str(picks[id]).replace(/–/g, ' to ');
  }
  return '';
}

/** "Draft the sponsor ask": real facts filled in, [brackets] for the rest. */
export function draftSponsorAsk(event, profile = null) {
  const ev = event || {};
  const name = str(ev.name) || '[the event]';
  const when = fmtLongDate(ev.date);
  const goal = hostGoal(ev);
  const host = str(profile && profile.name);
  const body = [
    `Hi [name] — I’m on the committee for ${name}${when ? ` on ${when}` : ''}.`,
    `This year we’re raising ${goal || '[the goal]'} for [what the money funds].`,
    'Would [business] sponsor it? For $[amount] your name goes on [the banner / the program / a table sign], and we’ll thank you by name and send you a photo of it up.',
    'Could you let me know by [date]?',
    host ? `Thank you — ${host}` : 'Thank you!',
  ].join('\n\n');
  return { subject: `Sponsoring ${name}`, body };
}

/** "Draft their report": what they gave, where their name went, thanks. */
export function draftSponsorReport(event, sponsor, profile = null) {
  const ev = event || {};
  const s = sponsor || {};
  const name = str(ev.name) || 'our event';
  const host = str(profile && profile.name);
  const gave = amt(s.amount) ? `$${amt(s.amount).toLocaleString('en-US')}` : 'your gift';
  const body = [
    `Hi [name] — thank you for sponsoring ${name}.`,
    `${s.received ? `Your ${gave} came in` : `Your pledge of ${gave}`}${str(s.recognition) ? `, and your name went on ${str(s.recognition)}` : ''}. [Add a photo of it.]`,
    'Here is what it made possible: [what the money funded, in a sentence].',
    host ? `With thanks — ${host}` : 'With thanks!',
  ].join('\n\n');
  return { subject: `Thank you from ${name}`, body };
}

/** The ask row is done once any sponsor is on the list: someone was asked and said yes. */
export function sponsorAskDone(event) {
  return sponsorsOf(event).length > 0;
}
