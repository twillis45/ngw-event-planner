// ─── THE OLD SELF-CONTAINED BRIEF LINK IS SUNSET (owner ruling 11/19/2026) ───
//
// Plan G90 / work order 16: "Sunset the old self-contained vendor brief link:
// none minted; existing links work until the event date." The live app already
// makes none: with the brief API configured, a brief is a short server code,
// and a failed mint makes no link at all (S9-5). The snapshot, the whole brief
// base64-encoded in the link, cannot be gated or revoked by any server, so it
// now stops showing the day after its event. A snapshot with no readable date
// keeps showing: there is nothing true to expire it by. PURE.

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** True while a legacy snapshot brief still shows: through its event date, on the viewer's own calendar. */
export function snapshotStillLive(brief, now = new Date()) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String((brief && brief.eventDate) || ''));
  if (!m) return true;
  return ymd(now) <= m[1];
}
