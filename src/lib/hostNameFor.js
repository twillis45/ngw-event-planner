// ─── WHO THE INVITATION IS FROM, ONCE (owner, 11/21/2026) ────────────────────
//
// Two stores answered it: `event.hostName` (the invite's "Hosted by", the
// guest notices, the vendor brief) and the profile name (Settings' "Your
// name", which signs her notes). "Who is the invitation from?" sat blank while
// the profile had her name, and the helper ask preferred the profile over the
// event — the opposite order to every other reader.
//
// The event's own line wins (she may write "Todd & Sarah" for one party);
// the profile name fills it when the event has none. PURE.
//
// `event.host` is the sample seeds' spelling of the same line (Wanda's reads
// "Wanda Mundy"); nothing else wrote or read it, so the host went unknown.
const clean = (v) => String(v == null ? '' : v).trim();
export function hostNameFor(event, profile) {
  return clean(event && event.hostName) || clean(event && event.hostNames) || clean(event && event.host)
    || clean(profile && profile.name);
}

// ─── IS THIS NAME THE HOST? (Wanda audit P1-6, 11/22/2026) ───────────────────
// Steps owned by "Wanda" were filed as a helper's job ("Send Wanda their job",
// "Helpers 1 of 9") because the helper readers knew the host only as
// "host / you / me". A typed owner is the host when it is one of those words,
// or one of the people on the host line — full name or first name ("Todd &
// Sarah" names two). PURE.
const SELF_WORDS = /^(host|you|yours|me|myself|self|i)$/i;
const norm = (v) => clean(v).toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');
export function isHostName(name, event, profile) {
  const n = norm(name);
  if (!n) return false;
  if (SELF_WORDS.test(n)) return true;
  const people = norm(hostNameFor(event, profile)).split(/\s*(?:&|\+|\/|,|\band\b)\s*/).filter(Boolean);
  return people.some((p) => p === n || p.split(' ')[0] === n);
}
