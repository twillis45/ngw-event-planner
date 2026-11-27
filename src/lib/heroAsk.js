// ─── THE HERO ASK VOCABULARY — one home, so one derivation ────────────────────
//
// Extracted from HostShellV2 (board ruling C, 2026-07-30). These were module-private
// to the shell, which meant the ONE invariant that matters here — the card title never
// re-speaks the ask that is already on screen — could not be asserted anywhere except
// by eye. It shipped broken twice. They live here now so heroAskDedup.test.js can prove
// the dedup predicate over real seeded events instead of a hand-copied mirror of it.
//
// PURE display mappers: no React, no component state, no event mutation.
import { normalizeAsk } from './askVoice';

// REBALANCE 2026-07-17 — the ASK vocabulary. The display slot speaks the next
// action in plain hand-holder words (2–4 words, ≤2 lines at display size); the
// panel beneath carries the specifics. Raw queue titles are card copy and can
// be proper nouns ("Confirm Semper Catering Co") — never display material.
const HERO_NOUN = { cater: 'caterer', dj: 'DJ', music: 'DJ', photo: 'photographer', video: 'videographer', flor: 'florist', flower: 'florist', venue: 'venue', rental: 'rentals', bar: 'bartender', cake: 'baker', transport: 'driver' };

// ─── THE ASK KINDS — the one copy table (six root causes, cause 1, part 2) ───
//
// The hero's headline used to be chosen by words in the item's title: a ladder
// of regexes over "budget", "venue", "guest", "serving", "conflict", "count",
// "Confirm …", "Send payment to …". Every misfire this file's history records
// was that mechanism: "3 guests still need a room" asked "Add who's coming.",
// "Sort where everyone stays" asked "Add the location.", "… arrives before venue
// access" asked "Add the location.", a step that said "serving" asked "Decide
// the menu.".
//
// Now the producer, which knows what its item is, DECLARES it: `ask` (its own
// sentence) or `askKind` (one of the kinds below). A vendor kind names the
// vendor it is about by `vendorId` (or its route's), and the noun comes from
// that vendor's category, never from the title. heroAskFor reads the
// declaration and nothing else; a title is only ever spoken back as itself.
// Pinned by heroAskReadsTheDeclaration.test.js over all 47 playbooks.
export const ASK_KINDS = Object.freeze({
  budget: 'How much do you want to spend?',
  'budget-over': 'Bring the plan inside your budget.',
  guests: 'Add who’s coming.',
  rsvp: 'Nudge your RSVPs.',
  'start-time': 'Confirm the start time.',
  date: 'Pick the day.',
  location: 'Add the location.',
  // At home the place is set (her home); what is missing is where it is. The
  // one sentence for it: the venue gate, the checklist row and the card's own
  // decision line all speak this (live 11/23/2026). ONE ADDRESS ASK (owner,
  // render 11, 11/24/2026): it asks for the address, and a city or a ZIP
  // answers it too. Was "Add your city.".
  town: 'Add your address.',
  conflict: 'Untangle your vendors.',
  decisions: 'Settle your decisions.',
  'catering-count': 'Fix the catering count.',
  'food-provider': 'Decide who provides the food.',
  'food-service': 'Choose how the food is served.',
  'food-dietary': 'Note the dietary needs.',
  menu: 'Decide the menu.',
  'get-food': 'Get the food.',
  'catch-up': 'Catch up on this step.',
});
// IS THIS THE VENUE ASK? (cohesion F, 11/24/2026). By what the item DECLARES:
// the venue blocker's type, or the location kind its producer stamps (the
// ledger's location and venue-address cues). Never by its words — "Then, in
// order" used a regex over the title here, and a title is copy.
export function asksForTheVenue(a) {
  return !!a && (a.blockerType === 'venue-selection' || a.askKind === 'location');
}
// A vendor kind's verb. The noun is the declared vendor's category.
export const VENDOR_ASK_VERBS = Object.freeze({
  'vendor-confirm': 'Confirm', 'vendor-book': 'Book', 'vendor-call': 'Call',
  'vendor-chase': 'Chase', 'vendor-pay': 'Pay', 'vendor-reconfirm': 'Reconfirm',
});
// Kinds that are declared for the shell's own rungs (the conflict card, the COI
// step) and that this table does not phrase: the shell speaks them itself.
export const SHELL_ASK_KINDS = Object.freeze(['coi']);
export function isKnownAskKind(k) {
  return Object.prototype.hasOwnProperty.call(ASK_KINDS, k)
    || Object.prototype.hasOwnProperty.call(VENDOR_ASK_VERBS, k)
    || SHELL_ASK_KINDS.includes(k);
}
// An item that declares no kind is asked by its declared DOMAIN, where the
// domain is a job (an item whose domain is not its job declares a kind or an ask).
const DOMAIN_KIND = { budget: 'budget', guests: 'guests', start: 'guests', date: 'date', food: 'menu' };

function vendorNoun(a, event) {
  const route = (a && (a.route || a.primaryRoute)) || {};
  const id = (a && a.vendorId != null) ? a.vendorId : route.vendorId;
  const v = id != null ? ((event && event.vendors) || []).find((x) => x && String(x.id) === String(id)) : null;
  const cat = String((v && (v.category || v.type)) || (a && a.vendorCategory) || '').toLowerCase();
  const key = cat ? Object.keys(HERO_NOUN).find((k) => cat.includes(k)) : null;
  return key ? HERO_NOUN[key] : 'vendor';
}
export function askForKind(kind, a, event) {
  if (Object.prototype.hasOwnProperty.call(ASK_KINDS, kind)) return ASK_KINDS[kind];
  if (Object.prototype.hasOwnProperty.call(VENDOR_ASK_VERBS, kind)) return VENDOR_ASK_VERBS[kind] + ' your ' + vendorNoun(a, event) + '.';
  return null;
}
// THE RULED FOOD CARD'S HEADLINE (polish, 11/22/2026). When the record line
// under it names the call beside its count ("Who cooks what? · 2 open", the
// owner's 11/21 iPad ruling), the headline must not repeat that question, and
// "Decide the menu." was wrong over a grill master or a cook/cater/potluck
// call. Pinned by theRuledFoodCardSaysItsCallOnce.test.js.
export function foodCallsAsk(n) {
  return Number(n) === 1 ? 'Make the food call.' : 'Make the food calls.';
}

export function heroAskFor(a, event) {
  try {
    // AN AUTHORED ASK ALWAYS WINS (2026-07-30). A surface that knows its own
    // job says so (`ask` on the raise); live case: the seating surface declares
    // domain 'guests', and "2 confirmed guests still need seats" was asked
    // "Add who's coming." An authored ask that normalizes to nothing falls
    // through (batch 11): the placeholder was its fallback, and it named nothing.
    if (a && a.ask) { const own = normalizeAsk(a.ask); if (own) return own; }
    // ── A LATE CHECKLIST STEP IS ASKED AS ONE (owner screenshot, 11/18/2026) ──
    // A late step is not a menu, budget or guest question; its card already
    // names it. A bunch of late steps led by a step is asked as a step too.
    if (a && a.taskId && a.category === 'decision') return ASK_KINDS['catch-up'];
    if (a && a.category === 'compression' && a.leadIsStep) return ASK_KINDS['catch-up'];
    // THE DECLARED KIND (cause 1, part 2): the producer says what its item asks.
    if (a && a.askKind) { const k = askForKind(a.askKind, a, event); if (k) return k; }
    // ── A BUY LINE IS NOT A DECISION (PR #70, driven 2026-07-31) ──────────────
    // The foodFocus route points at an unbought LINE in the spread: an
    // execution item is answered as execution.
    if (a && a.route && a.route.foodFocus) return ASK_KINDS['get-food'];
    const d = String((a && a.domain) || '').toLowerCase();
    if (DOMAIN_KIND[d]) return ASK_KINDS[DOMAIN_KIND[d]];
    const t = String((a && a.title) || '').replace(/\.+$/, '').trim();
    // ── THE LAST RESORT NAMES THE ACT (2026-08-17) ────────────────────────
    // Nothing declared: the item speaks for itself. A short title is its own
    // ask (a long declarative title does not read as a hero: measured across
    // 39 playbooks x 7 stages, 221 of 273 heads carry a title over 26
    // characters and none is a question), else the authored CTA (house doctrine
    // requires a CTA to name the act). 'Go' is EXCLUDED: it is the shell's
    // routing sentinel, not host copy, and ctaNamesTheAct forbids a bare "Go.".
    const short = t.length <= 26 ? normalizeAsk(t + '.') : null;
    if (short) return short;
    const cta = String((a && (a.primaryCta || a.ctaLabel || a.cta)) || '').trim();
    if (cta && cta.toLowerCase() !== 'go') {
      const fromCta = normalizeAsk(/[.?!]$/.test(cta) ? cta : cta + '.');
      if (fromCta) return fromCta;
    }
    // A BUNDLE SPEAKS FOR ITS FIRST ITEM (audit 2 lane C P1-6, 11/22/2026):
    // "Your next step. · past its window · See all 5" named nothing. The first
    // item is the one "this one first" points at. Its own ask when it has a
    // specific one, else its own words — a generic "Catch up on this step."
    // names no step either.
    const first = a && Array.isArray(a.items) && a.items.length ? a.items[0] : null;
    if (first) {
      const fa = heroAskFor(first, event);
      if (fa && fa !== 'Your next step.' && fa !== ASK_KINDS['catch-up']) return fa;
      const ft = normalizeAsk(String(first.title || '').replace(/\.+$/, '').trim() + '.');
      if (ft) return ft;
    }
    // A LONE ITEM NAMES ITSELF (batch 11, #229 Left). Only an item with no
    // words at all keeps the placeholder; there is nothing else to name.
    if (t) { const own = normalizeAsk(t + '.'); if (own) return own; }
    return 'Your next step.';
  } catch { return 'Your next step.'; }
}
// The record the panel names — only when it adds info beyond the ask (dedup:
// the ask owns the VERB, the panel owns the NOUN).
export function heroRecord(a, ask) {
  try {
    const t = String((a && a.title) || '').replace(/\.+$/, '').trim();
    // Strip the leading verb AND the surrounding quotes: a decision-board "call" arrives
    // titled Resolve "the label", and dropping only the verb left the bare "quoted" name
    // showing in the hero (host "why is this in quotes" 2026-07-18).
    const bare = t.replace(/^(confirm|book|call|pay|chase|set|plan|add|decide|pick|reconfirm|nudge|ask|fix|buy|resolve|settle)\s+/i, '');
    // Only a WHOLLY quoted name loses its quotes. A title that ends in a quoted
    // example keeps its closing mark (owner's phone, 11/19/2026: '…someone at
    // the table is allergic' lost its close quote on the board).
    const record = (/^["“'](.*)["”']$/.test(bare.trim()) ? bare.trim().slice(1, -1) : bare).trim();
    // BOTH sides normalize IDENTICALLY (ruling C, 2026-07-30). The ask was punctuation-
    // stripped and the record was not, so a record token still wearing its punctuation
    // ("outdoor?", "chicken,") could never match the clean ask token it duplicates —
    // adds === true, and the title re-spoke the ask. Asymmetric normalization is the same
    // ask-twice defect as the two-derivations bug, one layer down.
    const tok = (s) => String(s || '').toLowerCase().replace(/[^a-z\s’']/g, '').split(/\s+/).filter(Boolean);
    const askTok = new Set(tok(ask));
    const adds = tok(record).some(w => w.length > 2 && !askTok.has(w));
    return adds ? record.charAt(0).toUpperCase() + record.slice(1) : null;
  } catch { return null; }
}
