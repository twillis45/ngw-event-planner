// THE GUESTS PATH, start to finish (owner, 11/26/2026: "Bring the path back").
// One source for both the step list and the bottom button, so the lit step and
// the button can never disagree. The order of the checks is the button's order
// from #272: a question, then names, the invite, the count after the reply-by
// date, then nudging whoever hasn't replied.
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
