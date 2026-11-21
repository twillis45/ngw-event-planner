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
const clean = (v) => String(v == null ? '' : v).trim();
export function hostNameFor(event, profile) {
  return clean(event && event.hostName) || clean(event && event.hostNames) || clean(profile && profile.name);
}
