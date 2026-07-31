// ─── THE HERO ASK VOCABULARY — one home, so one derivation ────────────────────
//
// Extracted from HostShellV2 (board ruling C, 2026-07-30). These were module-private
// to the shell, which meant the ONE invariant that matters here — the card title never
// re-speaks the ask that is already on screen — could not be asserted anywhere except
// by eye. It shipped broken twice. They live here now so heroAskDedup.test.js can prove
// the dedup predicate over real seeded events instead of a hand-copied mirror of it.
//
// PURE display mappers: no React, no component state, no event mutation.
import { normalizeAsk, isCircularAsk } from './askVoice';

// REBALANCE 2026-07-17 — the ASK vocabulary. The display slot speaks the next
// action in plain hand-holder words (2–4 words, ≤2 lines at display size); the
// panel beneath carries the specifics. Raw queue titles are card copy and can
// be proper nouns ("Confirm Semper Catering Co") — never display material.
const HERO_NOUN = { cater: 'caterer', dj: 'DJ', music: 'DJ', photo: 'photographer', video: 'videographer', flor: 'florist', flower: 'florist', venue: 'venue', rental: 'rentals', bar: 'bartender', cake: 'baker', transport: 'driver' };

// The food dimensions a host actually decides between, most-blocking first.
// Provider comes before service style, which comes before the dishes: you cannot
// choose a menu before you know who is cooking it, and a repast whose provider is
// open is asking a sourcing question, not a culinary one.
// Ordered, so a title naming two dimensions is asked about the one that gates.
const FOOD_DIMENSION = [
  { re: /\b(who|provider|providers|provid\w*|source|sourcing|cater\w*|potluck|cook(s|ing)?)\b/i, ask: 'Decide who provides the food.' },
  { re: /\b(service|style|buffet|plated|seated|family[- ]style|passed|stationed|format)\b/i, ask: 'Choose how the food is served.' },
  { re: /\b(dietary|allerg\w*|vegetarian|vegan|halal|kosher|gluten)\b/i, ask: 'Note the dietary needs.' },
  { re: /\b(count|headcount|quantit\w*|how much|per guest|portions?)\b/i, ask: 'Fix the catering count.' },
  { re: /\b(menu|dish\w*|serving|entree|main|sides?)\b/i, ask: 'Decide the menu.' },
];
function foodAsk(title) {
  for (const d of FOOD_DIMENSION) if (d.re.test(title)) return d.ask;
  return null;
}
export function heroAskFor(a, event) {
  try {
    // AN AUTHORED ASK ALWAYS WINS (2026-07-30). Everything below classifies an item
    // by its domain and its title prose, which is exactly the mechanism ruling C had
    // to unpick elsewhere — and it misfires whenever a surface's DOMAIN is not its
    // JOB. Live case: surfaceRegistry's `seating` surface declares domain 'guests',
    // so "2 confirmed guests still need seats" fell into the guests branch below and
    // the hero asked "Add who's coming." The guests were already added and confirmed;
    // they needed seats. The host got a headcount stepper that could not act on the
    // thing being raised, which is what a false ask always produces.
    // A surface that knows its own job can now say so (`ask` on the raise) and this
    // reads it first. Structural, and it generalises: any future surface whose domain
    // and job differ authors one line instead of teaching this ladder a new regex.
    if (a && a.ask) return normalizeAsk(a.ask) || 'Your next step.';
    const t = String((a && a.title) || '').replace(/\.+$/, '').trim();
    const d = String((a && a.domain) || '').toLowerCase();
    if (d === 'budget' || /budget/i.test(t)) return 'Set your budget.';
    // ── THE FOOD BRANCH USED TO RESTATE ITS OWN ITEM ──────────────────────────
    // Host report, 2026-07-31: a repast whose open decision is "Who provides the
    // food" was asked "Decide the menu." — an instruction to do the thing the
    // card is already named after, and one that names the WRONG dimension: the
    // provider was the open question, not the dishes.
    //
    // The defect was the rule, not the string. This branch matched any title
    // containing food/menu/serving and answered with a single fixed sentence, so
    // every distinct food question collapsed into the same ask. It now reads the
    // title to name the dimension actually missing, and foodAsk() returns null
    // when it cannot tell — a null falls through to the ladder below rather than
    // inventing a dimension the event has no evidence for.
    if (d === 'food' || /serving|menu|food/i.test(t)) {
      const ask = foodAsk(t);
      if (ask && !isCircularAsk(ask, t)) return ask;
      // Nothing narrower is known. Say the general thing ONLY if it still adds
      // information; otherwise fall through and let a later rung speak.
      if (!isCircularAsk('Decide the menu.', t)) return 'Decide the menu.';
    }
    if (d === 'guests' || d === 'start' || /guest|who.s coming|rsvp/i.test(t)) return /rsvp/i.test(t) ? 'Nudge your RSVPs.' : 'Add who’s coming.';
    if (/start time/i.test(t)) return 'Confirm the start time.';
    if (d === 'date' || /pick (a|the) day|\bdate\b/i.test(t)) return 'Pick the day.';
    if (/location|venue|where/i.test(t)) return 'Add the location.';
    if (/conflict/i.test(t)) return 'Untangle your vendors.';
    const am = t.match(/^ask\s+.+?\s+about\s+(.{3,24})$/i);
    if (am) return 'Ask about ' + am[1].toLowerCase().replace(/\.+$/, '') + '.';
    if (/resolve .*decision|decisions? —|decisions? are past/i.test(t)) return 'Settle your decisions.';
    if (/(catering|guest|final)\s+count/i.test(t)) return 'Fix the catering count.';
    const vm = t.match(/^(confirm|book|call|chase|pay|reconfirm)\s+(.+)$/i);
    if (vm) {
      const verb = vm[1].charAt(0).toUpperCase() + vm[1].slice(1).toLowerCase();
      const rest = vm[2].toLowerCase();
      const v = ((event && event.vendors) || []).find(x => x && x.name && rest.includes(String(x.name).toLowerCase().slice(0, 6)));
      const catKey = v ? String(v.category || v.type || '').toLowerCase() : '';
      const nounKey = Object.keys(HERO_NOUN).find(k => catKey.includes(k) || rest.includes(k));
      return verb + ' your ' + (nounKey ? HERO_NOUN[nounKey] : 'vendor') + '.';
    }
    // A food-line buy ("Fried or baked chicken & baked ham — 28.5 lbs in 2 days")
    // carries an item title, never an instruction — the fallback rendered the dead
    // "Your next step." on it (audit 2026-07-22, W11). The foodFocus route names
    // the real job in plain words.
    if (a && a.route && a.route.foodFocus) return 'Get the food.';
    // ── OPEN: A 26-CHARACTER CUTOFF DECIDES WHETHER THE HOST SEES THE ASK ──
    // Frames 25/26 audit, driven 2026-07-29 on the retirement party. Its open
    // decision is authored as a question — retirementParty.js venue:
    // "At home, a restaurant, or the workplace?" (40 chars) — and the host got
    // the placeholder "Your next step." with the options as a card label under
    // it. Game Night's "What kind of games?" (20 chars) IS promoted to the hero.
    // Same kind of item, opposite treatment, decided by string length alone.
    //
    // Two things block the obvious fix, both confirmed by driving it:
    //  1. `a.title` reaches here with the question mark already gone —
    //     decisionShortLabel (playbooks/index ~1990) strips it deliberately,
    //     correctly, for the SHORT CARD form. So a /\?$/ test never fires.
    //  2. Adding `ask: d.label` to playbooks' `open.push` (~2602) did NOT reach
    //     this item — this queue entry is built by some other path, so the
    //     authored question never arrives. Both attempts were reverted rather
    //     than left in as a producer with no consumer.
    // The fix needs that path identified first, then the AUTHORED question
    // carried through as its own field. It must not be re-derived from the
    // short label, and the cutoff must not be widened blindly — a long
    // declarative title genuinely does not read as a hero; a question does.
    return (t.length <= 26 ? normalizeAsk(t + '.') : null) || 'Your next step.';
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
    const record = t.replace(/^(confirm|book|call|pay|chase|set|plan|add|decide|pick|reconfirm|nudge|ask|fix|buy|resolve|settle)\s+/i, '').replace(/^["“”"']+|["“”"']+$/g, '').trim();
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
