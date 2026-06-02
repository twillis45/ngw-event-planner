// demo/src/lib/vendorCopilot.js
// Sprint 54 · AI Readiness Copilot — grounded vendor briefing
//
// Lives inside the Vendor Detail Cockpit. Two modes:
//
//   1. Rule-based preview (always available):
//      Deterministic — uses the vendorIntelligence helpers + a fixed
//      message template. Labeled honestly: "Rule-based readiness preview ·
//      AI connection not enabled yet" when no API key is configured.
//
//   2. AI mode (only when planner has an Anthropic API key set in Profile):
//      Real Claude call with strict structured-JSON prompt. The model
//      receives the rule-based preview as ground truth + raw vendor data
//      and is forbidden to invent facts. Output is parsed and rendered
//      in the same shape as the rule-based preview.
//
// Output shape (both modes return the same structure):
//   {
//     source:        'rule-based' | 'ai',
//     headline:      string,            // 1-line situation summary
//     summary:       string,            // 1-2 sentence summary
//     missing:       string[],          // what data is not tracked / not on file
//     risks:         { risk: string, consequence: string }[],
//     questions:     string[],          // questions the planner should ask
//     nextAction:    { title, consequence, ctaCopy } | null,
//     draftMessage:  string,            // ready-to-send copy or templated stub
//     evidence:      string[],          // what data points the output was based on
//     limitations:   string[],          // what was unknown / what the planner must verify
//   }
//
// Grounding principles (per skill 06):
//   - Every output is based on app data only
//   - Unknown means unknown ("Not tracked yet")
//   - AI mode shows evidence + limitations
//   - Review-first: nothing is auto-sent or auto-applied
//   - No invented numbers, dates, or facts

import {
  getVendorReadiness,
  getVendorLifecycleStage,
  getVendorNextAction,
  getVendorChallengeSummary,
  getVendorPlanningState,
  getVendorDayOfState,
  getVendorCloseoutState,
  getVendorLinkedWork,
} from './vendorIntelligence';
import { getVendorRequiredQuestions, getVendorCategoryKey } from './vendorQuestions';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Context builder — assembles the grounded "facts" object passed to BOTH
//    the rule-based preview and the AI prompt. Single source of truth.
// ─────────────────────────────────────────────────────────────────────────────
export function buildVendorCopilotContext(vendor, event) {
  if (!vendor) return null;
  const readiness = getVendorReadiness(vendor, event);
  const stage = getVendorLifecycleStage(vendor, event);
  const nextAction = getVendorNextAction(vendor, event);
  const challenges = getVendorChallengeSummary(vendor, event);
  const planning = getVendorPlanningState(vendor, event);
  const dayOf = getVendorDayOfState(vendor, event);
  const closeout = getVendorCloseoutState(vendor, event);
  const linked = getVendorLinkedWork(vendor, event);
  const questions = getVendorRequiredQuestions(vendor, event);
  const categoryKey = getVendorCategoryKey(vendor);

  const eventDays = event && event.date ? daysFrom(event.date) : null;
  const confirmedGuests = event && event.guests
    ? event.guests.filter(g => g.rsvp === 'Yes').length
    : 0;

  return {
    vendor: {
      id: vendor.id,
      name: vendor.name || 'this vendor',
      category: vendor.category || 'Uncategorized',
      categoryKey,
      status: vendor.status || 'unset',
      contactName: vendor.contactName || null,
      contact: vendor.contact || null,
      phone: vendor.phone || null,
      cost: vendor.cost || 0,
      depositPaid: !!vendor.depositPaid,
      balancePaid: !!vendor.balancePaid,
      contractSigned: vendor.contractSigned === true || vendor.contract_signed === true,
      payDueDate: vendor.payDueDate || null,
      arrivalTime: vendor.arrivalTime || vendor.arrival_time || null,
      lastLogDate: pickLastLogDate(vendor.log),
      notes: vendor.notes || null,
    },
    event: {
      name: event?.name || event?.title || 'this event',
      type: event?.type || event?.eventType || null,
      date: event?.date || null,
      daysAway: eventDays,
      confirmedGuests,
      catererCount: event?.catererCount ?? null,
    },
    readiness, stage, nextAction, challenges, planning, dayOf, closeout, linked, questions,
  };
}

function daysFrom(iso) {
  if (!iso) return null;
  const t = new Date(iso + 'T00:00:00').getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}
function pickLastLogDate(log) {
  if (!Array.isArray(log) || log.length === 0) return null;
  return [...log].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].date || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Rule-based preview — deterministic. Always available.
// ─────────────────────────────────────────────────────────────────────────────
export function getRuleBasedPreview(context) {
  if (!context) return null;
  const { vendor, event, readiness, stage, nextAction, challenges, planning, questions } = context;

  // ── Headline ──
  const headlineParts = [];
  if (readiness.level === 'critical') headlineParts.push(`${vendor.name} has a critical readiness gap`);
  else if (readiness.level === 'attention') headlineParts.push(`${vendor.name} needs attention`);
  else if (readiness.level === 'safe') headlineParts.push(`${vendor.name} is on track`);
  else if (readiness.level === 'closed') headlineParts.push(`${vendor.name} is closed out`);
  else headlineParts.push(`${vendor.name} is still early in the pipeline`);
  if (event.daysAway !== null && event.daysAway >= 0) {
    headlineParts.push(event.daysAway === 0 ? 'today' : `${event.daysAway} days from event`);
  } else if (event.daysAway !== null) {
    headlineParts.push('event is past');
  }
  const headline = headlineParts.join(' · ');

  // ── Summary ──
  const summary = [
    `${vendor.name} (${vendor.category}) is at ${stage}.`,
    readiness.summary || '',
    nextAction ? `Next: ${nextAction.title.toLowerCase()}` : '',
  ].filter(Boolean).join(' ');

  // ── Missing (from planning state + day-of state) ──
  const missing = [];
  for (const row of planning) {
    if (row.status === 'missing') missing.push(`${row.label}: ${row.value}`);
  }
  // Surface "Not tracked yet" items as missing only if vendor is committed + near event
  const committed = ['Confirmed', 'Booked', 'Deposit Paid', 'Contracted'].includes(vendor.status);
  if (committed && event.daysAway !== null && event.daysAway >= 0 && event.daysAway <= 30) {
    for (const row of planning) {
      if (row.status === 'not_tracked' && row.consequence) {
        missing.push(`${row.label}: ${row.value}`);
      }
    }
  }

  // ── Risks (from challenges that are critical or attention) ──
  const risks = [];
  const catLabels = {
    booking: 'Booking', communication: 'Communication', logistics: 'Logistics',
    scope: 'Scope', timeline: 'Timeline', financial: 'Payment',
    documents: 'Documents', dayOf: 'Day of', closeout: 'Wrap-up',
  };
  for (const [key, c] of Object.entries(challenges)) {
    if (!c) continue;
    if (c.level === 'critical' || c.level === 'attention') {
      risks.push({
        risk: `${catLabels[key] || key}: ${c.note}`,
        consequence: riskConsequence(key, c.level, context),
      });
    }
  }

  // ── Questions (unanswered category questions) ──
  const qSet = [];
  for (const q of questions) {
    if (q.status !== 'answered') qSet.push(q.question);
  }
  // Cap to most relevant 6
  const questionList = qSet.slice(0, 6);

  // ── Next action (already deterministic from vendorIntelligence) ──
  const next = nextAction ? {
    title: nextAction.title,
    consequence: nextAction.consequence,
    ctaCopy: nextAction.ctaCopy,
  } : null;

  // ── Draft message ── (templated, planner-tone, blanks marked clearly)
  const draftMessage = buildTemplatedDraft(context);

  // ── Evidence ── (what data fed the output)
  const evidence = buildEvidence(context);

  // ── Limitations ── (what's unknown that the planner should verify)
  const limitations = buildLimitations(context);

  return {
    source: 'rule-based',
    headline,
    summary: summary.replace(/\s+/g, ' ').trim(),
    missing,
    risks,
    questions: questionList,
    nextAction: next,
    draftMessage,
    evidence,
    limitations,
  };
}

function riskConsequence(key, level, ctx) {
  const v = ctx.vendor;
  const daysAway = ctx.event.daysAway;
  const close = daysAway !== null && daysAway >= 0 && daysAway <= 14;
  switch (key) {
    case 'booking':
      return close ? 'Closer to the event, the harder it gets to find another option if this one falls through.' : 'Booking gaps tend to cascade — they affect payment, documents, and the day-of plan.';
    case 'communication':
      return 'Vendors who go quiet can be harder to reach when you need a quick answer.';
    case 'logistics':
      return 'The day-of timeline depends on confirmed arrival and setup times.';
    case 'scope':
      return 'Unclear scope often surfaces as a problem on event day.';
    case 'timeline':
      return 'A vendor not on the run of show won\'t show up on the day-of timeline.';
    case 'financial':
      if (level === 'critical') return `Late payments to ${v.name} can affect how they prioritize your event.`;
      return 'The vendor isn\'t fully locked in until payment is recorded.';
    case 'documents':
      return 'Booking record is incomplete without a signed contract on file.';
    case 'dayOf':
      return 'Smooth day-of coordination needs a confirmed arrival time, contact, and setup details.';
    case 'closeout':
      return 'Open wrap-up items leave the event without a clean finish.';
    default:
      return 'Unresolved items can lower overall event readiness.';
  }
}

function buildTemplatedDraft(ctx) {
  const v = ctx.vendor;
  const e = ctx.event;
  const next = ctx.nextAction;
  const close = e.daysAway !== null && e.daysAway >= 0 && e.daysAway <= 30;
  const greeting = v.contactName ? `Hi ${v.contactName.split(' ')[0]},` : `Hi ${v.name} team,`;

  if (!next) {
    return [
      greeting,
      '',
      `Just touching base on ${e.name} — wanted to make sure we're aligned on next steps.`,
      '',
      `Let me know if there's anything you need from us.`,
      '',
      `Thanks,`,
      `[Your name]`,
    ].join('\n');
  }

  // Tailor by the next-action category
  const lines = [greeting, ''];
  const eventLine = e.date && close
    ? `${e.name} is coming up${e.daysAway === 0 ? ' today' : ` in ${e.daysAway} days`}.`
    : `Quick note on ${e.name}.`;
  lines.push(eventLine);
  lines.push('');

  switch (next.sourceCategory) {
    case 'financial':
      lines.push(`I'm following up on the outstanding balance${v.cost ? ` ($${v.cost.toLocaleString()})` : ''}. Could you confirm receipt of payment or the best way to send it?`);
      break;
    case 'documents':
      lines.push(`Could you send over the signed contract when you have a moment? I want to make sure we have a clean booking record on file.`);
      break;
    case 'logistics':
      lines.push(`Can you confirm your arrival/setup time? We're finalizing the run of show and want to make sure your window is locked in.`);
      break;
    case 'communication':
      lines.push(`Just checking in — we haven't connected in a while and I want to make sure we're still aligned heading into the event.`);
      break;
    case 'timeline':
      lines.push(`I want to confirm your role on the run of show — could we lock in your arrival, setup, and active windows?`);
      break;
    case 'scope':
      lines.push(`A few details I'd like to confirm before the event — could we schedule a brief call to walk through?`);
      break;
    case 'booking':
      lines.push(`I'd love to lock you in for ${e.name}. Could we get the booking finalized this week?`);
      break;
    case 'closeout':
      lines.push(`Thank you again for the work on ${e.name}. A few quick wrap-up items I'd love to finish — let me know when's a good time to connect.`);
      break;
    default:
      lines.push(`Touching base on ${e.name}. ${next.consequence}`);
  }

  lines.push('');
  lines.push(`Thanks,`);
  lines.push(`[Your name]`);
  return lines.join('\n');
}

function buildEvidence(ctx) {
  const v = ctx.vendor;
  const e = ctx.event;
  const evidence = [
    `Vendor: ${v.name} (${v.category}, status: ${v.status})`,
  ];
  if (e.date) evidence.push(`Event date: ${e.date}${e.daysAway !== null ? ` (${e.daysAway} days away)` : ''}`);
  if (v.contractSigned) evidence.push('Contract: signed'); else evidence.push('Contract: not on file');
  if (v.depositPaid) evidence.push('Deposit: paid');
  if (v.balancePaid) evidence.push('Balance: paid');
  if (v.payDueDate) evidence.push(`Payment due: ${v.payDueDate}`);
  if (v.arrivalTime) evidence.push(`Arrival: ${v.arrivalTime}`);
  if (v.lastLogDate) evidence.push(`Last log entry: ${v.lastLogDate}`);
  if (v.cost) evidence.push(`Cost: $${v.cost.toLocaleString()}`);
  if (v.category === 'Catering' && e.catererCount !== null) evidence.push(`Caterer holds: ${e.catererCount}; confirmed guests: ${e.confirmedGuests}`);
  return evidence;
}

function buildLimitations(ctx) {
  const v = ctx.vendor;
  const limitations = [];
  if (!v.phone) limitations.push('No phone on file — cannot model day-of reachability.');
  if (!v.contactName) limitations.push('No primary contact name — cannot personalize messaging.');
  if (!v.payDueDate && v.cost) limitations.push('No payment due date — cannot model cashflow timing.');
  if (!v.arrivalTime) limitations.push('No arrival time — cannot model day-of timeline coverage.');
  if (!v.lastLogDate) limitations.push('No activity log — cannot model communication recency.');
  limitations.push('Day-of check-in, setup, and closeout fields are not in the data model yet (Sprint 54+ work).');
  limitations.push('Document attachments not supported yet — contract status reflects a flag, not an actual file.');
  return limitations;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI prompt builder — strict grounding, JSON-only output
// ─────────────────────────────────────────────────────────────────────────────
export function buildCopilotPrompt(context, rulePreview) {
  if (!context) return '';
  const v = context.vendor;
  const e = context.event;

  // Compact facts dump — the model gets ONLY this data + the rule-based preview
  // as ground truth. It is forbidden to invent anything beyond this.
  const facts = {
    vendor: v,
    event: e,
    readiness: { level: context.readiness.level, label: context.readiness.label, summary: context.readiness.summary },
    lifecycleStage: context.stage,
    nextActionFromRules: context.nextAction,
    challengeSummary: Object.fromEntries(
      Object.entries(context.challenges).map(([k, c]) => [k, c ? { level: c.level, note: c.note } : null])
    ),
    planningGaps: context.planning.filter(p => p.status === 'missing' || p.status === 'pending').map(p => ({ label: p.label, status: p.status, value: p.value })),
    unansweredQuestions: context.questions.filter(q => q.status !== 'answered').map(q => q.question),
    linkedWorkCounts: Object.fromEntries(Object.entries(context.linked).map(([k, arr]) => [k, Array.isArray(arr) ? arr.length : 0])),
  };

  return [
    `You are an event-planning copilot embedded inside the NGW Event Boss Vendor Detail view.`,
    `Your job: produce a grounded readiness brief for the planner on ONE specific vendor.`,
    ``,
    `STRICT RULES:`,
    `1. Use ONLY the facts provided below. Do not invent dates, prices, contact names, contract terms, deliverables, or any other detail not in the facts.`,
    `2. If a fact is not present, say it is "not tracked yet" or list it under "limitations". Do not guess.`,
    `3. Tone: serious event-operations voice. Direct. Consequence-driven. No fluff, no exclamation marks, no emoji.`,
    `4. The draft message must read like a real planner writing to a real vendor — short, polite, specific. No salesy language.`,
    `5. Do not auto-assert anything is "safe" unless the readiness level says safe.`,
    `6. Output VALID JSON ONLY — no preamble, no markdown fences. Start with { and end with }.`,
    ``,
    `OUTPUT JSON SHAPE (exact keys, in this order):`,
    `{`,
    `  "headline": "1-line situation summary (max 100 chars)",`,
    `  "summary": "1-2 sentence summary of the vendor's current readiness",`,
    `  "missing": ["short item 1", "short item 2"],`,
    `  "risks": [ { "risk": "short risk description", "consequence": "why it matters" } ],`,
    `  "questions": ["question 1 the planner should ask the vendor", "question 2"],`,
    `  "nextAction": { "title": "imperative sentence", "consequence": "why this matters", "ctaCopy": "short button label" },`,
    `  "draftMessage": "ready-to-send message body (plain text, line breaks allowed). Use [Your name] for the signoff.",`,
    `  "evidence": ["data point 1 used", "data point 2 used"],`,
    `  "limitations": ["what was unknown 1", "what the planner must verify 2"]`,
    `}`,
    ``,
    `RULE-BASED PREVIEW (your starting point — improve the prose, but do not change the facts):`,
    JSON.stringify({
      headline: rulePreview.headline,
      summary: rulePreview.summary,
      missing: rulePreview.missing,
      risks: rulePreview.risks,
      questions: rulePreview.questions,
      nextAction: rulePreview.nextAction,
      draftMessage: rulePreview.draftMessage,
      evidence: rulePreview.evidence,
      limitations: rulePreview.limitations,
    }, null, 2),
    ``,
    `FACTS:`,
    JSON.stringify(facts, null, 2),
    ``,
    `JSON:`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Parse AI response into the preview shape — robust to fences/preamble
// ─────────────────────────────────────────────────────────────────────────────
export function parseCopilotResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Strip markdown fences if present
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Find the first {...} block
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    // Defensive: normalize shape
    return {
      source: 'ai',
      headline: typeof parsed.headline === 'string' ? parsed.headline : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      missing: Array.isArray(parsed.missing) ? parsed.missing.filter(x => typeof x === 'string') : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(r => ({
        risk: typeof r?.risk === 'string' ? r.risk : '',
        consequence: typeof r?.consequence === 'string' ? r.consequence : '',
      })).filter(r => r.risk) : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.filter(x => typeof x === 'string') : [],
      nextAction: parsed.nextAction && typeof parsed.nextAction === 'object' ? {
        title: parsed.nextAction.title || '',
        consequence: parsed.nextAction.consequence || '',
        ctaCopy: parsed.nextAction.ctaCopy || 'Open vendor',
      } : null,
      draftMessage: typeof parsed.draftMessage === 'string' ? parsed.draftMessage : '',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.filter(x => typeof x === 'string') : [],
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations.filter(x => typeof x === 'string') : [],
    };
  } catch {
    return null;
  }
}
