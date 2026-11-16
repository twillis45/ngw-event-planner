// ─── THE EVENT'S HASHTAG (owner ruling 11/16/2026) ───────────────────────────
//
// Suggests up to three hashtags built ONLY from what the host gave: the
// honoree, the host's name, the event's name, its type, and its year. The host
// picks one or types their own (normalizeHashtag). Photos are handed to the
// person's own Instagram/Facebook app through the share sheet — the app never
// posts. Board (11/16): never claim a tag is "unused" or "available"; nothing
// here can know that, so nothing here says it. PURE: no I/O, no clock.

const MAX = 30;   // characters after the '#': long enough for a name + type + year

const words = (s) => String(s == null ? '' : s)
  .replace(/[’']/g, '')            // "Vida's" → "Vidas", never "Vida s"
  .split(/[^A-Za-z0-9]+/)
  .filter(Boolean);
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const camel = (s) => words(s).map(cap).join('');
const first = (s) => cap(words(s)[0] || '');
const possessive = (name) => (!name ? '' : /s$/i.test(name) ? name : name + 's');
const yearOf = (d) => { const m = /^(\d{4})-/.exec(String(d || '')); return m ? m[1] : ''; };

// "Retirement Party" → "Retirement"; "Birthday Party" → "Birthday".
const typeWord = (t) => camel(String(t || '').replace(/\b(party|celebration|event)\b/gi, '')) || '';

const valid = (body) => /^[A-Za-z][A-Za-z0-9]{1,}$/.test(body) && body.length <= MAX;

/**
 * @param {object} event  { type, honoree, hostName, name, date }
 * @returns {string[]} up to three distinct tags, each '#'-prefixed; [] when the event gives nothing to build from
 */
export function suggestHashtags(event) {
  const e = event || {};
  const year = yearOf(e.date);
  const type = typeWord(e.type);
  const who = first(e.honoree) || first(e.hostName);
  const out = [];
  const add = (body) => {
    if (!body) return;
    // Too long with the year: try without it, rather than cutting a name in half.
    const pick = valid(body + year) ? body + year : valid(body) ? body : null;
    if (pick && !out.includes('#' + pick)) out.push('#' + pick);
  };

  if (who && type) add(possessive(who) + type);
  if (/retire/i.test(e.type || '') && first(e.honoree)) add(first(e.honoree) + 'Retires');
  if (/wedding/i.test(e.type || '')) {
    const m = /^\s*([A-Za-z]+)\s*(?:&|and|\+)\s*([A-Za-z]+)/i.exec(String(e.name || '').replace(/[’']s\b/g, ''));
    if (m) add(cap(m[1]) + 'And' + cap(m[2]));
  }
  if (e.name) add(camel(e.name));
  return out.slice(0, 3);
}

/** A host's own tag, cleaned to something Instagram and Facebook accept. Never rejected for meaning. */
export function normalizeHashtag(input) {
  const body = words(input).map(cap).join('');
  return body ? '#' + body.slice(0, MAX) : '';
}
