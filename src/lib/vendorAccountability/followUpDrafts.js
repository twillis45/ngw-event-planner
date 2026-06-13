// ─── Vendor Follow-up Draft Generator ──────────────────────────────────────
// Sprint 61.A Phase A. Pure generator — returns draft text + metadata.
// NEVER sends. The UI decides which action is allowed based on provider
// state (commLive && emailEnabled).
//
// Action grammar follows the comms 6-state lock:
//   - copy            (always allowed)
//   - open_email_draft (always allowed — opens mailto)
//   - save_to_thread  (allowed when shared message history is connected)
//   - send_via_email  (allowed only when commLive && emailEnabled)

import { getVendorPlaybook, UNIVERSAL_VENDOR_QUESTIONS } from './playbooks.js';

/**
 * @typedef FollowUpDraft
 * @prop {string} subject
 * @prop {string} body
 * @prop {('email'|'sms'|'phone'|'thread')} recommendedChannel
 * @prop {Array<'copy'|'open_email_draft'|'save_to_thread'|'send_via_email'>} allowedActions
 * @prop {Array<'send_via_email'|'save_to_thread'>} blockedActions
 * @prop {string[]} missingItems  promise keys this follow-up is asking about
 * @prop {string}   reason        explainable: why we're sending this now
 */

/**
 * Generate a follow-up draft based on which promises are open.
 *
 * @param {Object} vendor
 * @param {Object} event
 * @param {Array}  promises
 * @param {Object} opts
 * @param {boolean} [opts.commLive=false]    shared message backend connected
 * @param {boolean} [opts.emailEnabled=false] email provider connected
 * @returns {FollowUpDraft}
 */
export function generateVendorFollowUpDraft(vendor, event, promises = [], opts = {}) {
  const { commLive = false, emailEnabled = false } = opts;
  const playbook = getVendorPlaybook(vendor?.category);

  // Which promises are open (not confirmed/completed)?
  const open = (promises || []).filter(p => p.status !== 'confirmed' && p.status !== 'completed' && p.status !== 'not_required');
  const missingKeys = open.map(p => p.promiseKey);

  // If nothing is open, surface a friendly check-in instead.
  const itemLines = open.length
    ? open.map(p => `• ${p.promiseText}`).join('\n')
    : '• A quick check-in before event week.';

  const eventLabel = event?.name || 'the event';
  const dateLabel = event?.date
    ? ` on ${new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}`
    : '';

  // Subject: vendor name + event + short cue
  const cue = open.length ? `confirmations needed` : `quick check-in`;
  const subject = `${eventLabel} — ${cue}`;

  // Body: short, plain, friendly, action-oriented.
  const greeting = vendor?.contactName ? `Hi ${vendor.contactName},` : 'Hi,';
  const intro = `I'm reaching out about ${eventLabel}${dateLabel}.`;
  const ask = open.length
    ? `Could you confirm the following so we can finalize the run of show?`
    : `Wanted to confirm we're on track and check if anything has changed.`;
  const closing = `Thanks for your help — let me know what you need from me to make this easy.`;

  const body = [greeting, '', intro, '', ask, '', itemLines, '', closing].join('\n');

  const allowedActions = ['copy', 'open_email_draft'];
  const blockedActions = [];
  if (commLive) allowedActions.push('save_to_thread');
  else          blockedActions.push('save_to_thread');
  if (commLive && emailEnabled) allowedActions.push('send_via_email');
  else                          blockedActions.push('send_via_email');

  const reason = open.length
    ? `${open.length} promise${open.length === 1 ? '' : 's'} pending confirmation.`
    : `Routine check-in — no specific items overdue.`;

  return {
    subject,
    body,
    recommendedChannel: 'email',
    allowedActions,
    blockedActions,
    missingItems: missingKeys,
    reason,
    suggestedQuestions: [...(playbook.questionsToAsk || []), ...UNIVERSAL_VENDOR_QUESTIONS.filter(q => !(playbook.questionsToAsk || []).includes(q))],
  };
}

/**
 * Bulk helper — generate one draft per vendor with open promises.
 */
export function generateAllFollowUpDrafts(event, promisesByVendor, opts = {}) {
  const drafts = [];
  (event?.vendors || []).forEach(v => {
    const open = (promisesByVendor[v.id] || []).filter(p => p.status !== 'confirmed' && p.status !== 'completed');
    if (!open.length) return;
    drafts.push({
      vendorId: v.id,
      draft: generateVendorFollowUpDraft(v, event, promisesByVendor[v.id] || [], opts),
    });
  });
  return drafts;
}
