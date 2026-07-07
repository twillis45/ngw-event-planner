// ─── eventContextNudges — EVENT-CONTEXT-INTELLIGENCE-1 ────────────────────────
//
// Help the host avoid missing what matters — never teach, prescribe, or infer.
// DOCTRINE (test-locked):
//   · SOURCE-BOUNDED: matches ONLY explicit host-entered text (event type,
//     name, theme). Never guests, vendors, names of people, or anything that
//     could infer identity, religion, or politics.
//   · RESPECT: every nudge speaks in "many hosts… / if it fits…" language —
//     options offered, never requirements. No "you need", "you should",
//     "must", "required".
//   · CHOICE: every nudge is dismissible (event.contextNudges[id]='dismissed'
//     via the normal patch path) and optional — no blocking state, no
//     green-dot impact, no completion pressure.
//   · TIMING: max ONE nudge per surface, shown where the decision happens
//     (food on the food surface, vendor on vendors, message on guests,
//     tone/moment on the day/program surface).
//   · ACTION-LINKED: each nudge routes to a real, existing control.
//   · The host's own "what matters" fields (must_have_moment / meaning_why)
//     outrank all of this — when they exist, MOMENT-PROTECT already carries
//     them; these nudges never override or restate them.
//
// First six safe contexts only (build the pattern before going broad):
// Juneteenth · Birthday · Memorial/Celebration of Life · Retirement ·
// Graduation · Baby shower.

const CONTEXTS = [
  {
    key: 'juneteenth',
    re: /juneteenth/i,
    nudges: {
      food: {
        text: 'For Juneteenth gatherings, many hosts include red foods and drinks — red drink, red velvet, watermelon. Add them if it fits your table.',
        why: 'Red foods honor the resilience and joy of the tradition for many families — but every family marks the day its own way.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      vendors: {
        text: 'Many hosts choose to support Black-owned vendors for Juneteenth. If that matters for your event, keep it in mind as you pick.',
        why: 'Where the money goes can be part of the celebration — a common choice, never a requirement.',
        actionLabel: 'Open vendors', route: { tab: 'Vendors', focusField: 'vendor-list' },
      },
      guests: {
        text: 'A one-line note about what Juneteenth means to your family sets the tone for guests. Add it to your invite or an update if it fits.',
        why: 'Guests arrive readier when they know what the gathering celebrates — one warm sentence is plenty.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'birthday',
    re: /birthday|b-?day|quincea|sweet sixteen|sweet 16/i,
    nudges: {
      program: {
        text: 'Many hosts anchor the day around the cake-and-song moment — worth placing it on the schedule so it never gets buried.',
        why: 'It’s the one beat every guest waits for; giving it a time protects it from the flow of the party.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      food: {
        text: 'Cake — or the birthday person’s favorite dessert — is the one thing guests expect. Confirm it early if it fits your plan.',
        why: 'Everything else on the table is flexible; the centerpiece dessert usually isn’t.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      guests: {
        text: 'If gifts, themes, or surprises are part of the plan, a quick line in the invite saves guests the guesswork.',
        why: 'One sentence up front beats ten day-of questions.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'memorial',
    re: /memorial|celebration of life|repast|homegoing|remembrance/i,
    nudges: {
      program: {
        text: 'Tone leads at a gathering like this. Many hosts open with a welcome and a moment of remembrance, and let the celebration build from there — shape it your way.',
        why: 'Guests take their cue from the first few minutes; a planned opening spares you having to set the tone on the fly.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'A warm line telling guests what kind of gathering this is — celebration, remembrance, or both — helps them arrive ready.',
        why: 'People dress, speak, and bring differently for a memorial than a party; one sentence removes the uncertainty.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'retirement',
    re: /retirement|retiring/i,
    nudges: {
      program: {
        text: 'Many hosts build the day around the honoree — an entrance, a toast, a word from them. Give those a spot on the schedule if it fits.',
        why: 'A retirement party without a named toast moment tends to drift; the honoree beats are what people remember.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'If stories, photos, or a memory book are part of the plan, asking guests ahead of time gets far better material than asking on the day.',
        why: 'The best tributes are collected, not improvised.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'graduation',
    re: /graduation|grad party|commencement/i,
    nudges: {
      food: {
        text: 'Grad parties run long and casual — many hosts plan food that holds up over hours (trays, coolers, restocks) rather than one serving moment.',
        why: 'Guests arrive in waves after other parties; food that keeps beats food that peaks.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      program: {
        text: 'If there’s a photo moment or a word for the graduate, many hosts schedule it early — before guests start rotating out to other parties.',
        why: 'Grad-season guests rarely stay to the end; the meaningful beats belong up front.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'A line with the drop-in window and parking saves grad-day guests juggling multiple parties.',
        why: 'On graduation weekend everyone is routing between events — logistics up front is a kindness.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'babyshower',
    re: /baby ?shower|sip[- ]?and[- ]?see|sprinkle/i,
    nudges: {
      food: {
        text: 'Shower food skews light and grazeable for many hosts — finger food, a sweet centerpiece, and easy non-alcoholic options for the guest of honor.',
        why: 'The guest of honor sets the drink tone; having good alcohol-free options isn’t an afterthought here.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      guests: {
        text: 'Registry, theme, and whether it’s a surprise — many hosts put all three in the invite so guests arrive prepared.',
        why: 'Shower guests want to get it right; the invite is where they look.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
];

// SOURCE-BOUNDED: only explicit, host-entered event descriptors.
const contextText = (event) => [event && event.type, event && event.name, event && event.theme, event && event.secondaryType]
  .filter(Boolean).join(' · ');

export function eventContextNudge(event, surface) {
  const ev = event || {};
  const t = contextText(ev);
  if (!t) return null;
  const ctxDef = CONTEXTS.find(c => c.re.test(t));
  if (!ctxDef) return null;
  const n = ctxDef.nudges[surface];
  if (!n) return null;
  const id = `${ctxDef.key}-${surface}`;
  const dismissed = (ev.contextNudges && typeof ev.contextNudges === 'object') ? ev.contextNudges : {};
  if (dismissed[id]) return null;
  const focusField = n.route.focusFieldTemplate
    ? n.route.focusFieldTemplate.replace('{eventId}', String(ev.id || ''))
    : n.route.focusField;
  return { id, context: ctxDef.key, surface, text: n.text, why: n.why, actionLabel: n.actionLabel, route: { tab: n.route.tab, focusField } };
}

// Aggregate view (spec shape): the whole event's context in one call, hard-
// capped at THREE active nudges app-wide (no-overload doctrine). `source`
// names which explicit host field matched — never anything inferred.
export function deriveEventContextNudges(event) {
  const ev = event || {};
  const t = contextText(ev);
  const ctxDef = t ? CONTEXTS.find(c => c.re.test(t)) : null;
  if (!ctxDef) {
    return { eventContext: 'unknown', source: 'unknown', nudges: [], suppressed: [] };
  }
  const source = ctxDef.re.test(String(ev.type || '') + ' ' + String(ev.secondaryType || '')) ? 'event_type'
    : ctxDef.re.test(String(ev.name || '')) ? 'event_name'
    : 'host_entered_context'; // theme — still explicit host text
  const all = Object.keys(ctxDef.nudges)
    .map(surface => eventContextNudge(ev, surface))
    .filter(Boolean)
    .map(n => ({ ...n, dismissible: true, priority: 'low', source }));
  return {
    eventContext: ctxDef.key,
    source,
    nudges: all.slice(0, 3), // hard cap: max three active context nudges
    suppressed: all.slice(3).map(n => n.id),
  };
}
