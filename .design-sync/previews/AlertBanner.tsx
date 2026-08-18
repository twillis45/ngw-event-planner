import { AlertBanner, Button, color, space, radius } from 'ngw-event-boss';

// Studio Matte is a dark system: the surface and text roles assume a carbon
// canvas. The preview card scaffold paints itself white, so every cell renders
// its own ground. Values come from tokens — this cannot drift from the real one.
const Canvas = ({ children, w = 660 }: { children: React.ReactNode; w?: number }) => (
  <div style={{
    background: color.surface.canvas,
    padding: space[6],
    borderRadius: radius.lg,
    maxWidth: w,
  }}>{children}</div>
);

// Every severity in one column. Each carries its own chip label, and
// escalated/emergency add mass (heavier shadow, red border) rather than only
// changing hue — stacking them is the only way to see the weight ladder.
export const SeverityLadder = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 12 }}>
      <AlertBanner
        severity="nominal"
        title="Final headcount due Friday"
        body="The venue needs a number by 5:00 PM to lock staffing."
      />
      <AlertBanner
        severity="delayed"
        title="Florist arrival pushed to 7:15 AM"
        body="Still ahead of the 9:00 AM room reveal. No action needed yet."
      />
      <AlertBanner
        severity="overdue"
        title="Three COIs outstanding"
        body="Lighting, valet, and the band have not returned certificates. The venue gate is 48 hours out."
      />
      <AlertBanner
        severity="escalated"
        title="Freight elevator double-booked"
        body="Another event holds the elevator 6:00–7:00 AM. Load-in cannot start on time as planned."
      />
      <AlertBanner
        severity="emergency"
        title="Venue reports a water leak in the ballroom"
        body="Facilities is on site. Ceremony space may need to move to the terrace."
      />
      <AlertBanner
        severity="resolved"
        title="Elevator conflict cleared"
        body="The other event moved to 8:00 AM. Load-in holds at 6:00."
      />
    </div>
  </Canvas>
);

// The action slot, which is what makes this operational rather than
// informational. The button inside takes escalation priority when the banner
// does, so the two agree instead of competing.
export const WithActions = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 12 }}>
      <AlertBanner
        severity="overdue"
        title="Three COIs outstanding"
        body="Lighting, valet, and the band. The venue gate is 48 hours out."
        action={<Button priority="p2" size="sm">Chase all three</Button>}
      />
      <AlertBanner
        severity="escalated"
        title="Freight elevator double-booked"
        body="Load-in cannot start at 6:00 as planned."
        action={<Button priority="escalation" size="sm">Call the venue</Button>}
      />
    </div>
  </Canvas>
);

// Title only — the common compact case in a dense command list, where a body
// would be noise.
export const TitleOnly = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 10 }}>
      <AlertBanner severity="delayed" title="Cake delivery moved to 2:00 PM" />
      <AlertBanner severity="resolved" title="Parking attendant confirmed" />
      <AlertBanner
        severity="escalated"
        title="Band sound-check conflicts with the room flip"
        action={<Button priority="escalation" size="sm">Resolve</Button>}
      />
    </div>
  </Canvas>
);
