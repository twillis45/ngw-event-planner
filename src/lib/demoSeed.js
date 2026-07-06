// ─── Demo seed/reset tooling (D-2 §3/§9) ──────────────────────────────────────
// The 3-minute flagship demo needs staged BEFORE-states and a reset a human can
// run between demos without SQL and without polluting real data.
//
// RESET STRATEGY — delete + reseed, never repair-in-place: every seed mints
// FRESH ids (event, vendors), so the demo's vendor-brief link is a brand-new
// server code with zero confirmation rows. The previous demo's code opaquely
// 404s the moment its event row is deleted (live-proven behavior), so no
// backend cleanup is ever needed. The old event is removed through the app's
// normal delete path (cloud sync included).
//
// BEFORE-STATES staged (the demo script's beats, docs/FLAGSHIP_DEMO_AND_PRICING_D2.md):
//   beat 2  — exactly one needs-attention item (the VFW insurance certificate)
//             plus the "Set your budget" next step (budget deliberately unset)
//   beat 3  — caterer with contact, arrival time, a briefNote, and ROS cues so
//             the shared brief has a schedule to show
//   beat 5+ — caterer pre-Confirmed (Contracted) with EMPTY on-site fields so
//             "Save on-site contact" and "Mark confirmed" both light up
//
// All vendors are real-feeling DMV names (never "Vendor A") per the flagship
// standard.

// 'demoqa-' — NOT 'demo-': the app's own sample seeds use demo-* ids
// (e.g. 'demo-jun' Juneteenth Cookout) and the reset must never touch them.
export const DEMO_ID_PREFIX = 'demoqa-';

export const isDemoEvent = (e) =>
  !!(e && typeof e.id === 'string' && e.id.startsWith(DEMO_ID_PREFIX));

// Deterministic given (now); ids carry a run suffix so every seed is a fresh
// identity (fresh vendor ids → fresh brief codes → clean confirmation state).
export function buildDemoEvent(now = Date.now()) {
  const run = now.toString(36);
  const id = `${DEMO_ID_PREFIX}${run}`;
  const vid = (slug) => `${id}-${slug}`;
  const date = new Date(now + 84 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // ~12 weeks out

  const catererName = 'Capital Rotisserie Catering — Silver Spring, MD';
  return {
    id,
    recordKind: 'host_event',
    name: '30-Year United States Army Retirement Celebration at the VFW',
    type: 'Retirement Party',
    date,
    timeOfDay: 'Afternoon',
    venueKind: 'venue',
    venue: 'VFW Post 3150 — Alexandria, VA',
    guestMode: 'count',
    guestCount: 120,
    guestEstimate: 120,
    guests: [],
    budget: [],           // budget deliberately UNSET → the "Set your budget" beat
    timeline: [],
    vendors: [
      {
        id: vid('venue'), name: 'VFW Post 3150 — Alexandria, VA', category: 'Venue',
        status: 'Booked', coiStatus: 'required',                  // beat 2: the one needs-attention item
        contactName: 'Post Quartermaster', arrivalTime: '',
      },
      {
        id: vid('caterer'), name: catererName, category: 'Catering',
        status: 'Contracted', contractSigned: true,               // pre-Confirmed: host action available
        contactName: 'Dana Whitfield', arrivalTime: '14:30',
        briefNote: 'Load in through the side gate; buffet tables ready by 3 PM.',
        onSiteContactName: '', onSitePhone: '',                    // empty → "Save on-site contact" lights up
      },
      { id: vid('photo'),  name: 'Anacostia Frame & Film Co. — Washington, DC', category: 'Photography', status: 'Contracted', contactName: 'Marcus Bell' },
      { id: vid('dj'),     name: 'Beltway Sound Collective — Arlington, VA',    category: 'DJ',          status: 'Quoted' },
      { id: vid('rental'), name: 'Old Town Tent & Party Rentals — Alexandria, VA', category: 'Rentals',  status: 'Quoted' },
      { id: vid('honor'),  name: 'Commonwealth Honor Guard Services — Fairfax, VA', category: 'Recognition Ceremony', status: 'Considering' },
    ],
    // ROS cues assigned to the caterer so the shared brief carries a schedule.
    ros: [
      { id: vid('ros1'), time: '14:30', segment: 'Caterer load-in', location: 'Side gate', notes: 'Ask for the post quartermaster', vendorName: catererName },
      { id: vid('ros2'), time: '15:45', segment: 'Buffet set + tasting check', location: 'Main hall', vendorName: catererName },
      { id: vid('ros3'), time: '17:00', segment: 'Dinner service opens', location: 'Main hall', vendorName: catererName },
    ],
  };
}

// Pure list transforms — the caller owns persistence (setEvents in App).
export function withDemoSeeded(events, now = Date.now()) {
  const cleared = (events || []).filter((e) => !isDemoEvent(e));
  return { events: [...cleared, buildDemoEvent(now)], removed: (events || []).filter(isDemoEvent).map((e) => e.id) };
}

export function withDemoRemoved(events) {
  return { events: (events || []).filter((e) => !isDemoEvent(e)), removed: (events || []).filter(isDemoEvent).map((e) => e.id) };
}
