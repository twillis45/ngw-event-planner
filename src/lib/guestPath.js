// THE GUESTS PATH, start to finish (owner, 11/26/2026: "Bring the path back").
// Shared by hostv4 and hostv2 since 11/27/2026 ("Guests design approved, build
// it"): the questions still to ask, the plan as the path reads it, the five
// steps and the one bottom button, and the line summing up the answers.
// One source for both the step list and the bottom button, so the lit step and
// the button can never disagree. The order of the checks is the button's order
// from #272: a question, then names, the invite, the count after the reply-by
// date, then nudging whoever hasn't replied.
import { proposeReplyBy } from './replyBy';
import { nudgeRecipients, nudgeCount, wasInvited } from './replyNudge';
import { rsvpState } from './rsvp';

const STEPS = ['answers', 'names', 'invite', 'replies', 'count'];
const day = (iso) => { try { return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return ''; } };

export function guestPath(s, planLabel = '') {
  const current = s.qs.length ? 'answers'
    : s.byName && !s.named ? 'names'
      : !s.sent ? 'invite'
        : s.replyByPassed && !s.locked ? 'count'
          : s.toNudge || !s.replyByPassed ? 'replies'
            : null;
  const action = current === 'answers' ? (s.qs[0] === 'count' ? { step: 'answers', kind: 'plan', label: planLabel } : null)
    : current === 'names' ? { step: 'names', kind: 'add', label: 'Add names' }
      : current === 'invite' ? { step: 'invite', kind: 'invite', label: 'Review your invite' }
        : current === 'count' ? { step: 'count', kind: 'lock', label: 'Lock the count' }
          : current === 'replies' && s.toNudge ? { step: 'replies', kind: 'nudge', label: s.toNudge === 1 ? 'Nudge the one who hasn’t replied' : 'Nudge the ' + s.toNudge + ' who haven’t replied' }
            // No one to nudge because no phone or email is on file (owner, 11/26/2026: "Yes add button").
            : current === 'replies' && s.noReach ? { step: 'replies', kind: 'reach', label: 'Add how to reach them' }
              : null;
  const at = current ? STEPS.indexOf(current) : STEPS.length;
  const val = {
    answers: s.qs.length ? s.qs.length + ' to answer' : '',
    names: !s.byName ? 'Count only' : s.named ? s.named + ' named' : 'None yet',
    invite: s.sent ? 'Sent' : 'Not sent yet',
    replies: s.sent ? s.replied + ' of ' + s.invited : 'After the invite',
    count: s.locked ? 'Locked at ' + s.locked : s.replyByPassed ? 'Not locked' : s.deadline ? 'After ' + day(s.deadline) : 'After the reply-by date',
  };
  const LABEL = { answers: 'Your answers', names: 'Names', invite: 'Your invite', replies: 'Replies', count: 'The count' };
  const steps = STEPS.map((k, i) => ({
    k, label: LABEL[k], val: val[k],
    state: k === 'count' && s.locked ? 'done' : i < at ? 'done' : i === at ? 'now' : 'later',
  }));
  return { steps, current, action };
}

/** The questions still to ask, in the prototype's order. An answer is a saved field. */
export function guestQuestions(ev) {
  const q = [];
  if (!(Number(ev.guestEstimate) > 0) && ev.guestCountSource !== 'host') q.push('count');
  if (!ev.guestMode) q.push('mode');
  // Unset or cleared (Undo writes null back) is unanswered: the question returns.
  if (ev.plusOnePolicy == null) q.push('plus');
  if (ev.kidsPolicy == null) q.push('kids');
  // Too close for an honest reply-by date (owner's Thanksgiving, 11/25/2026:
  // the party was the next day), the question has no answer, so it isn't asked.
  if (!String(ev.rsvpDeadline || '').trim()) {
    let close = false;
    try { const p = proposeReplyBy(ev); close = !!(p && p.tooClose); } catch { close = false; }
    if (!close) q.push('replyBy');
  }
  return q;
}

// The count is the host's estimate, else the planned count; with neither the
// clause is left out (the approved render read "about —", 11/27/2026).
const ANSWER = {
  count: (ev) => { const n = Number(ev.guestEstimate) || Number(ev.guestCount) || 0; return n > 0 ? 'about ' + n : ''; },
  mode: (ev) => (ev.guestMode === 'count' ? 'by headcount' : 'by name'),
  plus: (ev) => (ev.plusOnePolicy === 'plus_one_ok' ? '+1s welcome' : 'no +1s'),
  kids: (ev) => (ev.kidsPolicy === 'kids_welcome' ? 'kids welcome' : 'adults only'),
  replyBy: (ev) => (String(ev.rsvpDeadline || '').trim() ? 'replies by ' + new Date(String(ev.rsvpDeadline).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'no reply-by date'),
};
export const answersLine = (ev) => Object.keys(ANSWER).map((k) => ANSWER[k](ev)).filter(Boolean).join(' · ');

/**
 * The plan as the path reads it. `now` is the phone's clock: the reply-by date
 * passes at the end of that day where the host is. `waiting` is the count of
 * guest questions waiting (fetched by the shell).
 */
export function guestPathState(ev, { now = new Date(), waiting = 0 } = {}) {
  const guests = Array.isArray(ev.guests) ? ev.guests : [];
  const named = guests.length;
  const pad = (n) => String(n).padStart(2, '0');
  const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  const reach = nudgeRecipients(ev);
  return {
    qs: guestQuestions(ev),
    // Names stay on the page once there are any, even after the count is locked
    // (locking writes guestMode 'count', as hostv2's lock does).
    byName: ev.guestMode !== 'count' || named > 0,
    named,
    sent: !!ev.invitesSentAt,
    replyByPassed: !!ev.rsvpDeadline && String(ev.rsvpDeadline).slice(0, 10) < today,
    locked: ev.guestMode === 'count' ? Number(ev.guestCount) || 0 : 0,
    toNudge: nudgeCount(reach),
    noReach: reach.unreachable.length,
    replied: guests.filter((g) => wasInvited(ev, g) && rsvpState(g) !== 'pending').length,
    invited: guests.filter((g) => wasInvited(ev, g)).length,
    waiting,
    deadline: ev.rsvpDeadline,
  };
}
