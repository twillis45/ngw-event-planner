// ─── SENDING A HELPER THEIR JOB ─────────────────────────────────────────────
// hostv2's sendHelperJob, minus the button (B3 day crew, 11/26/2026), so
// hostv4's "Your day crew" sends exactly the same job:
//   · helperJobMessage: the ask (lib/helperAsk) with every job the helper holds
//     and their link; a text to their phone when there is one, else the share
//     sheet; and whether they have an email for the app to send it to.
//   · helperLinkPatch: which helpers have a link (silent, deduped; a link exists
//     whether or not the host goes on to send).
//   · helperHandoffPatch: the send ledger's host-attested handoff, at the moment
//     her own phone takes the message. Never "Sent".
//   · helperMintWhy: a failed link in plain words, and that nothing was sent.
//   · crewRows: one row per helper (lib/helperResponsibility), with their own
//     answer when they gave one, for the crew page.
import { deriveHelperResponsibilities } from './helperResponsibility';
import { buildHelperAsk } from './helperAsk';
import { recordHandoff } from './sendLedger';
import { helperAskTitle } from './messageTimeline';
import { hostNameFor } from './hostNameFor';

const firstOf = (name) => String(name || 'them').split(/\s+/)[0];
const guestOf = (event, guestId) => (guestId ? ((event && event.guests) || []).find((g) => g && g.id === guestId) : null) || null;

export function helperJobMessage({ event, profile, helperId, code, appUrl }) {
  const { responsibilities } = deriveHelperResponsibilities(event) || { responsibilities: [] };
  const mine = (responsibilities || []).filter((x) => x.helperId === helperId);
  const resp = mine[0];
  if (!resp) return null;
  const url = appUrl + '?helper=' + encodeURIComponent(code);
  const body = buildHelperAsk({
    event, hostName: hostNameFor(event, profile), helperName: resp.helperName,
    jobs: mine.map((x) => ({ kind: x.itemType, label: x.label })), url,
  });
  const guest = guestOf(event, resp.guestId);
  const digits = String((guest && guest.phone) || '').replace(/[^+\d]/g, '');
  const hasEmail = !!String((guest && guest.email) || '').trim();
  const href = digits ? 'sms:' + digits + '?&body=' + encodeURIComponent(body) : null;
  return { first: firstOf(resp.helperName), helperName: resp.helperName, body, href, hasEmail, channel: digits ? 'text' : 'share' };
}

export function helperLinkPatch(event, helperId) {
  const cur = Array.isArray(event && event.helperLinkIds) ? event.helperLinkIds : [];
  return helperId && !cur.includes(helperId) ? { helperLinkIds: [...cur, helperId] } : {};
}

export function helperHandoffPatch(event, resp, channel, nowIso) {
  return {
    sendLedger: recordHandoff(event && event.sendLedger, helperAskTitle(resp.helperName), channel,
      nowIso || new Date().toISOString(), { kind: 'helper', id: resp.helperId }),
  };
}

export function helperMintWhy(kind, first) {
  const why = kind === 'signed-out' ? `Sign in to make ${first}’s link.`
    : kind === 'not-found' ? `${first}’s job hasn’t saved to your plan yet. Give it a moment, then try again.`
      : `Couldn’t make ${first}’s link just now.`;
  return `${why} Nothing was sent.`;
}

// `answers` is the latest answer per helper through their link, keyed by
// helperId (hostv2's helperAnswerByKey; lib/whoIsConfirmed reads the same).
export function crewRows(event, answers) {
  const said = (answers && typeof answers === 'object') ? answers : {};
  const { responsibilities } = deriveHelperResponsibilities(event) || { responsibilities: [] };
  const linked = Array.isArray(event && event.helperLinkIds) ? event.helperLinkIds : [];
  const byId = new Map();
  for (const r of responsibilities || []) {
    if (!byId.has(r.helperId)) {
      const g = guestOf(event, r.guestId);
      byId.set(r.helperId, {
        helperId: r.helperId, name: r.helperName, first: firstOf(r.helperName), jobs: [],
        linkSent: linked.includes(r.helperId),
        answer: (said[String(r.helperId)] && said[String(r.helperId)].state) || null,
        phone: !!String((g && g.phone) || '').replace(/[^+\d]/g, ''), email: !!String((g && g.email) || '').trim(),
      });
    }
    byId.get(r.helperId).jobs.push(r.label);
  }
  return [...byId.values()];
}

// The helper's page is hostv2's (?helper=). From hostv4, publicAppUrl() is
// hostv4's own address; this names hostv2 beside it, and is a no-op from hostv2.
export const helperPageBase = (appUrl) => new URL('../hostv2/', appUrl).href;
