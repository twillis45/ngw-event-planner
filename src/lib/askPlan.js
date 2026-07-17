// ─── askPlan — deterministic Q&A over the host's OWN plan ─────────────────────
//
// NOT fake AI. This maps a free-text question to an answer COMPUTED from the same
// engine outputs the rest of the app already renders (money, food plan, guest
// count, forecast, readiness), and it ALWAYS names the assumptions behind the
// number ("basis"). No LLM, no invented facts: an unrecognized question is
// answered honestly ("I can't answer that from your plan") and pointed at the
// surface that can, rather than guessed at.
//
// answerPlanQuestion(question, ctx) → { answer, basis:[string], matched, route? }
//   ctx (all optional; a term is only used when its data is present):
//     money      { planned, committed, spent, spentEstimated }  (lib/hostSpending)
//     foodPlan   { foodLow, foodHigh, perHeadLow, perHeadHigh, guests }  (playbookFoodPlan)
//     guests     number  (resolved head count)
//     guestBand  string  ("likely 56–81 on the day")
//     wx         { pop, risk, rainWindow, summary }  (weather)
//     readiness  { done, total, nextLabel }
//     eventName  string
//
// The caller passes a route the UI can deep-link to for each answer type.

const money$ = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

// Every number in the text, tagged with what the wording says it IS. A bare
// number is only money if nothing marks it as a head count — "50 people" and
// "for 50" are guests, not dollars.
const HEAD_NOUN = /^\s*(?:more\s+)?(?:people|guests?|heads?|persons?|folks|adults|kids|children|attendees)\b/i;

function scanNumbers(q) {
  const re = /(\$)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|grand)?/gi;
  const out = [];
  let m;
  while ((m = re.exec(q))) {
    const [full, dollar, digits, mult] = m;
    const n = parseFloat(digits.replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    const after = q.slice(m.index + full.length);
    const before = q.slice(0, m.index);
    out.push({
      value: /k|thousand|grand/i.test(mult || '') ? n * 1000 : n,
      isMoney: !!dollar || !!mult || /^\s*(?:dollars?|bucks)\b/i.test(after),
      isHead: HEAD_NOUN.test(after) || /\bfor\s*$/i.test(before),
    });
  }
  return out;
}

// The dollar figure the host actually named — never a head count read as money.
function parseAmount(q) {
  const nums = scanNumbers(q);
  const money = nums.find((n) => n.isMoney) || nums.find((n) => !n.isHead);
  return money ? money.value : null;
}

// A head count named in the question ("for 50", "50 guests"), if any.
function parseHeadcount(q) {
  const head = scanNumbers(q).find((n) => n.isHead && !n.isMoney);
  return head ? head.value : null;
}

// Nouns that narrow a question to ONE part of the plan. The budget-fit answer
// speaks for the WHOLE plan's committed total, so it cannot answer these.
const SCOPED_TO_PART = /\b(crabs?|food|meat|seafood|shrimp|chicken|beef|sides?|drinks?|booze|alcohol|beer|wine|bar|cake|dessert|catering|caterer|vendors?|music|dj|band|photographer|photos?|video|rentals?|tent|decor|decorations?|flowers?|venue|space|ice|invitations?|favors?)\b/i;

// The honest "I can't answer that from your plan" reply — the one shape used
// both for a question we don't recognize and for one we recognize but cannot
// answer truthfully. The caller escalates on `matched: false`.
function unanswered(eventName) {
  return {
    answer: `I can answer questions about your money, food, guests, weather, and what's next — straight from ${eventName ? eventName + "'s" : 'your'} plan. Try “will $2,000 cover it?”, “how much food do I need?”, or “am I ready?”.`,
    basis: [],
    matched: false,
  };
}

export function answerPlanQuestion(questionRaw, ctx = {}) {
  const q = String(questionRaw || '').toLowerCase().trim();
  if (!q) return null;
  const { money, foodPlan, guests, guestBand, wx, readiness, eventName } = ctx;
  const amount = parseAmount(q);
  const has = (re) => re.test(q);

  // ── Budget fit: "will $2000 cover it?", "is $5k enough?", "can I afford…"
  // Only answers the WHOLE plan at its CURRENT size. A question scoped to one
  // part ("cover the crabs") or to a different head count ("for 50") is a
  // different question — decline so the caller can escalate to a tool-calling
  // answer rather than quietly answering the one we can compute.
  const askedHead = parseHeadcount(q);
  const partScoped = has(SCOPED_TO_PART);
  const whatIfSize = askedHead != null && (guests == null || askedHead !== Number(guests));
  const budgetShaped = amount != null && has(/\b(cover|enough|afford|budget|fit|too much|spend)\b/) && money;

  // A budget question we can't answer honestly is DECLINED outright, not left to
  // fall through — "is $2,000 enough for 50 guests?" would otherwise be caught by
  // the guests term below and answered with the head count, which is a different
  // wrong answer to the same money question.
  if (budgetShaped && (partScoped || whatIfSize)) return unanswered(eventName);

  if (budgetShaped) {
    const committed = Number(money.committed) || 0;
    const diff = amount - committed;
    const basis = [`Your plan commits about ${money$(committed)} so far — food, supplies, space, and anything you've priced (vendors, crab).`];
    if (Number(money.spentEstimated) > 0) basis.push(`${money$(money.spentEstimated)} of that is still an estimate, not a firm price — the real total can move.`);
    const answer = diff >= 0
      ? `${money$(amount)} covers what your plan commits so far — you're about ${money$(diff)} under.`
      : `${money$(amount)} is about ${money$(-diff)} short of what your plan already commits (${money$(committed)}).`;
    return { answer, basis, matched: true, route: 'budget' };
  }

  // ── Spend so far: "how much have I spent?"
  if (has(/\bspent\b|how much.*(paid|out the door)|money.*(gone|spent)/) && money) {
    const spent = Number(money.spent) || 0;
    const basis = [`Counts every line you've marked bought — food, supplies, space, and priced vendors/crab.`];
    if (Number(money.spentEstimated) > 0) basis.push(`${money$(money.spentEstimated)} of it is still an estimate (a midpoint), not a receipt you typed.`);
    return { answer: `You've spent about ${money$(spent)} so far${money.planned ? ` of your ${money$(money.planned)} budget` : ''}.`, basis, matched: true, route: 'budget' };
  }

  // ── Budget headroom: "how much can I still spend?", "what's left?"
  if (has(/\b(left|remaining|headroom|still (spend|have))\b/) && money && Number(money.planned) > 0) {
    const left = Number(money.planned) - Number(money.committed || 0);
    const basis = [`Your budget is ${money$(money.planned)}; your plan already commits ${money$(money.committed || 0)}.`];
    const answer = left >= 0
      ? `About ${money$(left)} of your ${money$(money.planned)} budget isn't spoken for yet.`
      : `Your plan is about ${money$(-left)} over the ${money$(money.planned)} budget you set.`;
    return { answer, basis, matched: true, route: 'budget' };
  }

  // ── Food amount / cost: "how much food?", "what's the food cost?", "per person?"
  if (has(/\bfood\b|\beat\b|\bmeal\b|per (person|head|guest)/) && foodPlan && (Number(foodPlan.foodLow) > 0 || Number(foodPlan.foodHigh) > 0)) {
    const range = foodPlan.foodLow === foodPlan.foodHigh ? money$(foodPlan.foodLow) : `${money$(foodPlan.foodLow)}–${money$(foodPlan.foodHigh)}`;
    const basis = [`Sized for ${foodPlan.guests || guests || 'your'} guests from your menu — quantities scale with the head count.`];
    let answer = `Your food plan runs about ${range}.`;
    if (has(/per (person|head|guest)/) && Number(foodPlan.perHeadLow) > 0) {
      const ph = foodPlan.perHeadLow === foodPlan.perHeadHigh ? money$(foodPlan.perHeadLow) : `${money$(foodPlan.perHeadLow)}–${money$(foodPlan.perHeadHigh)}`;
      answer = `About ${ph} per person — ${range} in total for ${foodPlan.guests || guests} guests.`;
    }
    return { answer, basis, matched: true, route: 'food' };
  }

  // ── Guests: "how many are coming?", "how many going?"
  if (has(/how many\b|head ?count|\bguests?\b|\bcoming\b|\bgoing\b|\brsvp/) && (guests != null)) {
    const basis = [guestBand ? guestBand.replace(/^planned around\s*·?\s*/i, '') : `From your entered count / roster.`];
    return { answer: `You're planning around ${guests}${guestBand ? ` — ${guestBand.replace(/^planned around\s*·?\s*/i, '')}` : ''}.`, basis, matched: true, route: 'guests' };
  }

  // ── Weather / rain: "will it rain?", "what's the forecast?"
  if (has(/\brain\b|\bweather\b|\bforecast\b|\bstorm\b|will it (rain|pour)/) && wx && Number.isFinite(Number(wx.pop))) {
    const pop = Math.round(Number(wx.pop));
    const basis = [`From the forecast the app pulled for your day and place${wx._sample ? ' (a sample forecast — live weather turns on with the API key)' : ''}.`];
    const answer = pop >= 40
      ? `Rain looks real — about ${pop}% in the day window${wx.rainWindow && wx.rainWindow.label ? `, most likely ${wx.rainWindow.label}` : ''}. Worth a backup plan.`
      : pop >= 20
        ? `A chance of rain — about ${pop}% in the day window. Keep an eye on it.`
        : `Rain looks unlikely — about ${pop}% in the day window.`;
    return { answer, basis, matched: true, route: 'rain' };
  }

  // ── Readiness / what's next: "am I ready?", "what's left?", "what's next?"
  if (has(/\bready\b|what'?s (next|left)|am i (set|done|on track)|how (am i doing|far along)/) && readiness) {
    const { done, total, nextLabel } = readiness;
    const basis = [`Counts the planning essentials your plan tracks — set to ready only when the checklist agrees.`];
    const answer = (done >= total && total > 0)
      ? `You're set — all ${total} parts of your plan are handled.`
      : `${done} of ${total} parts of your plan handled${nextLabel ? `. Next up: ${nextLabel}.` : '.'}`;
    return { answer, basis, matched: true, route: 'plan' };
  }

  // ── Unrecognized — answer honestly, never guess.
  return unanswered(eventName);
}

export default answerPlanQuestion;
