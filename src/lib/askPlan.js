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

// Pull the first dollar-ish amount from the text ("$2k", "2000", "2,500 dollars").
function parseAmount(q) {
  const m = q.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|grand)?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return /k|thousand|grand/i.test(m[2] || '') ? n * 1000 : n;
}

export function answerPlanQuestion(questionRaw, ctx = {}) {
  const q = String(questionRaw || '').toLowerCase().trim();
  if (!q) return null;
  const { money, foodPlan, guests, guestBand, wx, readiness, eventName } = ctx;
  const amount = parseAmount(q);
  const has = (re) => re.test(q);

  // ── Budget fit: "will $2000 cover it?", "is $5k enough?", "can I afford…"
  if (amount != null && has(/\b(cover|enough|afford|budget|fit|too much|spend)\b/) && money) {
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
      ? `You're set — all ${total} of your planning areas are handled.`
      : `${done} of ${total} areas handled${nextLabel ? `. Next up: ${nextLabel}.` : '.'}`;
    return { answer, basis, matched: true, route: 'plan' };
  }

  // ── Unrecognized — answer honestly, never guess.
  return {
    answer: `I can answer questions about your money, food, guests, weather, and what's next — straight from ${eventName ? eventName + "'s" : 'your'} plan. Try “will $2,000 cover it?”, “how much food do I need?”, or “am I ready?”.`,
    basis: [],
    matched: false,
  };
}

export default answerPlanQuestion;
