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
// The first six contexts (Juneteenth · Birthday · Memorial/Celebration of
// Life · Retirement · Graduation · Baby shower) built the pattern; coverage
// now extends to the culturally-specific gatherings the app itself names
// (EVT_IDENT) plus the most common intake types (wedding, anniversary,
// reunion, …). Every added nudge holds the same bar: option-not-requirement
// phrasing, no invented statistics/vendors/prices, culturally accurate or
// not written at all, and routed only to the four surface routes both apps
// already consume (food-plan / vendor-list / guests-invites / ros-now, plus
// the crab-plan anchor that exists in both apps).
//
// ORDER MATTERS: CONTEXTS.find() takes the FIRST matching entry, so
// narrower contexts sit above broader ones (quinceañera before birthday,
// whose regex also contains "quincea"; bridal shower before wedding, which
// "wedding shower" would otherwise hit).
//
// Deliberately NOT covered (doctrine, not oversight):
//   · bare "cookout" — locked neutral (test 12): a cookout with no other
//     descriptor must never be inferred into a cultural context. Only the
//     app's named identity "The Cookout" matches.
//   · Day Party / Get-Together — nothing honest to say beyond generic
//     hosting advice; padding is worse than silence.
//   · Corporate Event / Conference / Gala — professional-event territory;
//     the "many hosts…" host-language nudge format doesn't fit.

const CONTEXTS = [
  {
    key: 'juneteenth',
    re: /juneteenth/i,
    nudges: {
      food: {
        text: 'Many hosts add red foods and drinks — red drink, red velvet, watermelon — if it fits your table.',
        why: 'Red foods honor the resilience and joy of the tradition for many families — but every family marks the day its own way.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      vendors: {
        text: 'Many hosts choose Black-owned vendors for Juneteenth, if that matters for your event.',
        why: 'Where the money goes can be part of the celebration — a common choice, never a requirement.',
        actionLabel: 'Open vendors', route: { tab: 'Vendors', focusField: 'vendor-list' },
      },
      guests: {
        text: 'A one-line note on what Juneteenth means to your family helps guests arrive ready.',
        why: 'Guests arrive readier when they know what the gathering celebrates — one warm sentence is plenty.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    // Must sit ABOVE birthday: the birthday regex also matches "quincea",
    // and a quinceañera deserves better than cake-and-song copy.
    key: 'quinceanera',
    re: /quincea|quince a[ñn]os/i,
    nudges: {
      program: {
        text: 'Many families build the evening around the traditional moments — the entrance, the vals, the changing of the shoes — each worth its own spot on the schedule.',
        why: 'The court and the family beats are what everyone remembers; giving each a time protects it from the flow of the night.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
    },
  },
  {
    key: 'birthday',
    re: /birthday|b-?day|quincea|sweet sixteen|sweet 16/i,
    nudges: {
      program: {
        text: 'Many hosts anchor the day around the cake-and-song moment — worth a spot on the schedule.',
        why: 'It’s the one beat every guest waits for; giving it a time protects it from the flow of the party.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      food: {
        text: 'Cake, or their favorite dessert, is the one thing guests expect — confirm it early if it fits.',
        why: 'Everything else on the table is flexible; the centerpiece dessert usually isn’t.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      guests: {
        text: 'Gifts, themes, or surprises? A quick invite line saves guests the guesswork.',
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
        text: 'Tone leads here — many hosts open with a welcome and a moment of remembrance, then build from there.',
        why: 'Guests take their cue from the first few minutes; a planned opening spares you having to set the tone on the fly.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'A warm line on the tone — celebration, remembrance, or both — helps guests arrive ready.',
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
        text: 'Many hosts build the day around the honoree — an entrance, a toast, a word from them.',
        why: 'A retirement party without a named toast moment tends to drift; the honoree beats are what people remember.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'Stories or photos for a memory book? Ask guests ahead of time — it beats asking on the day.',
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
        text: 'Grad parties run long — many hosts plan food that holds up over hours rather than one serving moment.',
        why: 'Guests arrive in waves after other parties; food that keeps beats food that peaks.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      program: {
        text: 'Photo moment or a word for the grad? Many hosts schedule it early, before guests rotate out.',
        why: 'Grad-season guests rarely stay to the end; the meaningful beats belong up front.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'A line with the drop-in window and parking saves grad-day guests the juggling.',
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
        text: 'Shower food skews light and grazeable — finger food, a sweet centerpiece, easy non-alcoholic options for the guest of honor.',
        why: 'The guest of honor sets the drink tone; having good alcohol-free options isn’t an afterthought here.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      guests: {
        text: 'Registry, theme, and whether it’s a surprise — many hosts put all three in the invite.',
        why: 'Shower guests want to get it right; the invite is where they look.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  // ── Culturally-specific gatherings the app names (EVT_IDENT) ──────────────
  {
    key: 'kwanzaa',
    re: /kwanzaa/i,
    nudges: {
      program: {
        text: 'Many hosts give the kinara lighting and the night’s principle a settled moment on the schedule — the gathering tends to build around it.',
        why: 'Each night of Kwanzaa centers one principle; a planned moment keeps the lighting from getting squeezed by the meal.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      food: {
        text: 'If yours is the karamu feast, many families build the table together — every household bringing a dish, if it fits.',
        why: 'The karamu is traditionally a shared table; spreading the cooking is part of the spirit, not a shortcut.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  {
    key: 'coffeeceremony',
    // Matched on the ceremony's name, never on nationality alone — the
    // event descriptor is the ceremony, not an identity.
    re: /coffee ceremony/i,
    nudges: {
      program: {
        text: 'The ceremony sets its own pace — three rounds from the same grounds, never rushed. Many hosts plan the rest of the gathering around it.',
        why: 'Roasting, brewing, and three rounds take real time; guests who know the shape of it settle in rather than watch the clock.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      food: {
        text: 'Light bites alongside are traditional — popcorn is the classic companion, with bread or roasted snacks if it fits.',
        why: 'The coffee is the centerpiece; small salty and sweet bites carry the hours without competing with it.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  {
    key: 'pupusa',
    re: /pupusa/i,
    nudges: {
      food: {
        text: 'Pupusas come off the griddle in rounds — many hosts plan a steady cooking flow rather than one serving moment, with curtido and salsa out from the start.',
        why: 'They’re best straight off the heat; the toppings waiting means each round is eaten at its peak.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  {
    // ONLY the app's named identity "The Cookout" — bare "cookout" is locked
    // neutral by doctrine (test 12): no cultural inference from a plain word.
    key: 'thecookout',
    re: /the cookout/i,
    nudges: {
      food: {
        text: 'The grill feeds in waves — many hosts pick sides that hold at room temperature so the table stays full between rounds.',
        why: 'Guests eat across the whole afternoon, not at one seating; the sides carry the gaps between grill rounds.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      guests: {
        text: 'Folks will ask what to bring — many hosts assign the signature sides to the people known for them.',
        why: 'The answer to “what can I bring” is easiest given once, in the invite, before five people bring dessert.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'fishfry',
    re: /fish fry/i,
    nudges: {
      food: {
        text: 'Fried fish lands in batches — many hosts keep one person on the fryer and pick sides that are ready before the first basket comes up.',
        why: 'The fryer sets the pace of the whole meal; sides done ahead let every batch go straight to the table hot.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  {
    key: 'sundaydinner',
    re: /sunday dinner/i,
    nudges: {
      food: {
        text: 'Sunday dinner runs on the familiar — many hosts anchor the menu on the family staples and let relatives bring their signature dishes.',
        why: 'The dishes people count on are the heart of the meal; the menu question is mostly who’s making what.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  // ── Regional seafood feasts ────────────────────────────────────────────────
  {
    key: 'crabfeast',
    re: /crab feast/i,
    nudges: {
      food: {
        // Routes to the crab-plan anchor — a real destination in BOTH apps
        // (App.js id="crab-plan"; hostv2 routeSheet opens the crabs sheet).
        text: 'Crabs go straight onto a paper-covered table — mallets, paper towels, and a spot for shells matter as much as the crabs themselves.',
        why: 'The eating runs long and messy by design; a table set up for it beats a scramble once the crabs land.',
        actionLabel: 'Open the crab plan', route: { tab: 'Planning', focusField: 'crab-plan' },
      },
      guests: {
        text: 'Picking crabs is hands-on and messy — a line in the invite about casual clothes saves guests showing up in white.',
        why: 'Guests who know it’s a roll-up-your-sleeves meal come dressed for it and settle in faster.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'boil',
    re: /crawfish|low ?country boil|seafood boil|shrimp boil|crab boil/i,
    nudges: {
      food: {
        text: 'A boil comes out in rounds and goes straight onto a covered table — many hosts set out the covering, paper towels, and a spot for shells before the first batch drops.',
        why: 'The pour is the whole show; a table that’s ready lets it go straight from pot to table while it’s hot.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
      guests: {
        text: 'It’s a hands-on, eat-with-your-fingers meal — many hosts say so in the invite so guests dress for it.',
        why: 'One line about the mess spares guests the surprise and lets them settle straight in.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  // ── Common intake types ────────────────────────────────────────────────────
  {
    // Must sit ABOVE wedding: "wedding shower" would otherwise match the
    // wedding context.
    key: 'bridalshower',
    re: /bridal shower|wedding shower/i,
    nudges: {
      guests: {
        text: 'Registry, dress theme, and whether it’s a surprise — shower guests look to the invite for all three.',
        why: 'Guests plan gifts and outfits off the invite; three short answers there spare a dozen texts later.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'wedding',
    re: /wedding(?!\s+(anniversary|shower))/i,
    nudges: {
      program: {
        text: 'Many couples lock times for the named moments — entrance, toasts, first dance — and let the rest of the night breathe.',
        why: 'The named moments are what photos and memories hang on; times protect them without scripting the whole night.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      vendors: {
        text: 'The week before, many hosts confirm arrival and setup times with every vendor in one pass.',
        why: 'Most day-of surprises are timing surprises; one round of confirmations catches them while they’re still fixable.',
        actionLabel: 'Open vendors', route: { tab: 'Vendors', focusField: 'vendor-list' },
      },
    },
  },
  {
    key: 'anniversary',
    re: /anniversar/i,
    nudges: {
      program: {
        text: 'Many hosts center one toast to the couple — a word from them, or about them, with a time on the schedule.',
        why: 'It’s the moment the whole gathering is for; a named time keeps it from getting lost in the mingling.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'Photos or stories from across the years land best collected ahead — many hosts ask in the invite.',
        why: 'A week of lead time turns “say a few words” into something worth keeping.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'reunion',
    re: /reunion/i,
    nudges: {
      program: {
        text: 'Many hosts schedule the group photo early — before folks drift, not after.',
        why: 'The photo is the one thing everyone wants afterward, and the crowd is never fuller than the first hour.',
        actionLabel: 'See the day plan', route: { tab: 'Event Day Schedule', focusField: 'ros-now' },
      },
      guests: {
        text: 'Matching shirts or family colors? Decide early and put it in the invite — printing takes lead time.',
        why: 'Shirts are half keepsake, half group photo; they only work if everyone knows before they pack.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'holidayparty',
    re: /holiday party|secret santa|white elephant/i,
    nudges: {
      guests: {
        text: 'Doing a gift exchange? Many hosts put the spending cap and the rules right in the invite.',
        why: 'Guests want to get it right — the cap and the format answer the two questions everyone asks.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'housewarming',
    re: /housewarming|house warming/i,
    nudges: {
      guests: {
        text: 'Many hosts put the address, parking, and a shoes-at-the-door note right in the invite.',
        why: 'It’s everyone’s first time finding the place — the details you take for granted are the ones guests need.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
      food: {
        text: 'Housewarmings run open-house style — many hosts plan grazing food that holds across the whole window rather than one serving moment.',
        why: 'Guests arrive in trickles, not a wave; food that keeps means the last arrival eats as well as the first.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  {
    // Guests-only BY DOCTRINE (test-locked): a plain dinner party carries no
    // cultural food context, so the food surface stays silent for it.
    key: 'dinnerparty',
    re: /dinner party/i,
    nudges: {
      guests: {
        text: 'Many hosts ask about allergies and can’t-eats when guests reply — it shapes the menu before it’s planned, not after.',
        why: 'One question up front beats redesigning a dish the day before.',
        actionLabel: 'Draft guest update', route: { tab: 'Guests', focusFieldTemplate: 'guests-invites-{eventId}' },
      },
    },
  },
  {
    key: 'gamenight',
    re: /game night|card party|trivia night/i,
    nudges: {
      food: {
        text: 'Many hosts keep the food one-handed and away from the play surface — grease and cards don’t mix.',
        why: 'Snacks people can eat mid-game keep the table moving; a separate food spot protects the cards and boards.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
      },
    },
  },
  {
    key: 'watchparty',
    re: /watch party|viewing party/i,
    nudges: {
      food: {
        text: 'The broadcast sets the schedule — many hosts have food out before the start and save a restock for the break.',
        why: 'Nobody leaves the screen at the good part; the break is the one window everyone eats at once.',
        actionLabel: 'Open the food plan', route: { tab: 'Planning', focusField: 'food-plan' },
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
// capped at THREE active nudges (no-overload doctrine). `source` names which
// explicit host field matched — never anything inferred.
// STATUS: computed correctly and test-locked, but not yet consumed by either
// app's UI — both apps render nudges one at a time via the per-surface
// eventContextNudge() below (food nudge only on the food surface, vendor
// nudge only on vendors, etc.), which is inherently bounded without needing
// a cross-surface cap since a host only sees one surface at a time. This
// aggregate + its cap exist for a future "what we noticed" digest-style view
// that doesn't have a home in either app yet — don't read the cap as
// currently enforced app-wide; it's enforced only if/when this function is
// actually called from somewhere.
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
