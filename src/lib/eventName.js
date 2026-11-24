// ─── THE EVENT IS NAMED FROM HER OWN WORDS (six root causes, cause 6) ────────
//
// "Thanksgiving dinner at my house for 14…" was saved as "My Thanksgiving
// Hosting": with no honoree and no host name heard, creation fell back to
// "My " + the playbook's type. Her sentence already named it.
//
// eventNameFrom: her own words when her sentence opens with whose event it is
// and what ("Aunt Rosa's Thanksgiving Dinner", owner ruling 11/24/2026), else
// the honoree's or host's name when she gave one, else the occasion phrase her sentence opens with ("Thanksgiving dinner" →
// "Thanksgiving Dinner"), else the occasion itself ("Thanksgiving"). Never
// "My <Type>". A name this falls back to is a placeholder, and
// lib/outwardReady asks her for a real one before anything goes out.

const STOP = /^(?:at|for|on|in|with|this|next|from|by|to|around|about|near|here|there|and|plus|w\/|@)$/i;
const LEAD = /^(?:a|an|the|our|my|we're|were|we|i'm|im|i|having|hosting|throwing|planning|doing)$/i;
const SMALL = /^(?:and|of|the|a|an|for|at|in|on|to|with|&)$/i;
const titleCase = (words) => words.map((w, i) => (i > 0 && SMALL.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

// The phrase her sentence opens with, title-cased, and whether it says WHOSE
// event it is ("Aunt Rosa's Thanksgiving Dinner"): a possessive before the
// occasion. A possessive after the occasion ("Game night Vida's house") ends
// the phrase, as before. '' when it does not name the occasion.
function phraseOf(sentence, occasion) {
  const words = String(sentence || '').replace(/[“”"]/g, '').trim().split(/\s+/).filter(Boolean);
  // It must name the occasion: share a word with it (Thanksgiving, Game, Crab…).
  const occ = String(occasion || '').toLowerCase().split(/\s+/).filter((x) => x.length > 2);
  const names = (w) => occ.includes(w.toLowerCase());
  let i = 0;
  while (i < words.length && LEAD.test(words[i].replace(/[,.;:!?]+$/, ''))) i += 1;
  const out = [];
  let whose = false;
  for (; i < words.length && out.length < 5; i += 1) {
    const raw = words[i];
    const w = raw.replace(/[,.;:!?()]+$/, '');
    if (!w || STOP.test(w) || /\d/.test(w)) break;
    if (/['’]s$/i.test(w)) {
      if (out.some(names)) break;
      whose = true;
    }
    out.push(w);
    if (raw !== w) break;   // punctuation ends the phrase
  }
  if (!out.length || (occ.length && !out.some(names))) return { phrase: '', whose: false };
  // "Aunt Rosa's" alone is whose, not what: the occasion must follow it.
  return { phrase: titleCase(out), whose: whose && !/['’]s$/i.test(out[out.length - 1]) };
}

/** The occasion phrase her sentence opens with, title-cased; '' when none. */
export function occasionPhraseFrom(sentence, occasion) {
  return phraseOf(sentence, occasion).phrase;
}

/**
 * eventNameFrom({ sentence, honoree, hostName, milestoneName }) →
 *   { name, placeholder } — placeholder is true when nothing she said named it.
 */
export function eventNameFrom({ sentence = '', honoree = '', hostName = '', milestoneName = '' } = {}) {
  const occasion = String(milestoneName || '').trim() || 'Event';
  // HER WORDS NAME IT (owner ruling, 11/24/2026): "Aunt Rosa's Thanksgiving
  // Dinner for 14" is "Aunt Rosa's Thanksgiving Dinner", not the honoree plus
  // the type ("Aunt Rosa’s Thanksgiving Hosting").
  const { phrase: own, whose } = phraseOf(sentence, occasion);
  if (whose) return { name: own, placeholder: false };
  if (String(honoree || '').trim()) return { name: `${String(honoree).trim()}’s ${occasion}`, placeholder: false };
  if (String(hostName || '').trim()) return { name: `${String(hostName).trim()}’s ${occasion}`, placeholder: false };
  const phrase = own;
  if (phrase && phrase.toLowerCase() !== occasion.toLowerCase()) return { name: phrase, placeholder: false };
  return { name: phrase || occasion, placeholder: true };
}
