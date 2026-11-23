// ─── THE EVENT IS NAMED FROM HER OWN WORDS (six root causes, cause 6) ────────
//
// "Thanksgiving dinner at my house for 14…" was saved as "My Thanksgiving
// Hosting": with no honoree and no host name heard, creation fell back to
// "My " + the playbook's type. Her sentence already named it.
//
// eventNameFrom: the honoree's or host's name when she gave one (unchanged),
// else the occasion phrase her sentence opens with ("Thanksgiving dinner" →
// "Thanksgiving Dinner"), else the occasion itself ("Thanksgiving"). Never
// "My <Type>". A name this falls back to is a placeholder, and
// lib/outwardReady asks her for a real one before anything goes out.

const STOP = /^(?:at|for|on|in|with|this|next|from|by|to|around|about|near|here|there|and|plus|w\/|@)$/i;
const LEAD = /^(?:a|an|the|our|my|we're|were|we|i'm|im|i|having|hosting|throwing|planning|doing)$/i;
const SMALL = /^(?:and|of|the|a|an|for|at|in|on|to|with|&)$/i;
const titleCase = (words) => words.map((w, i) => (i > 0 && SMALL.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

/** The occasion phrase her sentence opens with, title-cased; '' when none. */
export function occasionPhraseFrom(sentence, occasion) {
  const words = String(sentence || '').replace(/[“”"]/g, '').trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length && LEAD.test(words[i].replace(/[,.;:!?]+$/, ''))) i += 1;
  const out = [];
  for (; i < words.length && out.length < 5; i += 1) {
    const raw = words[i];
    const w = raw.replace(/[,.;:!?()]+$/, '');
    if (!w || STOP.test(w) || /\d/.test(w) || /['’]s$/i.test(w)) break;
    out.push(w);
    if (raw !== w) break;   // punctuation ends the phrase
  }
  if (!out.length) return '';
  // It must name the occasion: share a word with it (Thanksgiving, Game, Crab…).
  const occ = String(occasion || '').toLowerCase().split(/\s+/).filter((x) => x.length > 2);
  if (occ.length && !out.some((w) => occ.includes(w.toLowerCase()))) return '';
  return titleCase(out);
}

/**
 * eventNameFrom({ sentence, honoree, hostName, milestoneName }) →
 *   { name, placeholder } — placeholder is true when nothing she said named it.
 */
export function eventNameFrom({ sentence = '', honoree = '', hostName = '', milestoneName = '' } = {}) {
  const occasion = String(milestoneName || '').trim() || 'Event';
  if (String(honoree || '').trim()) return { name: `${String(honoree).trim()}’s ${occasion}`, placeholder: false };
  if (String(hostName || '').trim()) return { name: `${String(hostName).trim()}’s ${occasion}`, placeholder: false };
  const phrase = occasionPhraseFrom(sentence, occasion);
  if (phrase && phrase.toLowerCase() !== occasion.toLowerCase()) return { name: phrase, placeholder: false };
  return { name: phrase || occasion, placeholder: true };
}
