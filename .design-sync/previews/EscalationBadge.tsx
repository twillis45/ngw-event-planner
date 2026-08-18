import { EscalationBadge, Surface, Text, color, space, radius } from 'ngw-event-boss';

// Studio Matte is a dark system: the surface and text roles assume a carbon
// canvas. The preview card scaffold paints itself white, so every cell renders
// its own ground. Values come from tokens — this cannot drift from the real one.
const Canvas = ({ children, w = 620 }: { children: React.ReactNode; w?: number }) => (
  <div style={{
    background: color.surface.canvas,
    padding: space[6],
    borderRadius: radius.lg,
    maxWidth: w,
  }}>{children}</div>
);

// Every status in one row. The pairing rule is the point: a bright tint label
// on a dark tint pill, never same-hue-on-same-hue. Adjacency is the only way to
// confirm emergency reads hotter than risk while both stay legible.
export const StatusLadder = () => (
  <Canvas>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <EscalationBadge status="confirmed">CONFIRMED</EscalationBadge>
      <EscalationBadge status="warning">DUE FRIDAY</EscalationBadge>
      <EscalationBadge status="risk">COI MISSING</EscalationBadge>
      <EscalationBadge status="emergency">VENUE DOWN</EscalationBadge>
      <EscalationBadge status="neutral">NOT STARTED</EscalationBadge>
    </div>
  </Canvas>
);

// The dot carries the status hue on its own. Without it the pill has to survive
// on fill and border alone — this cell exists to confirm it still does.
export const WithoutDot = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <EscalationBadge status="confirmed">CONFIRMED</EscalationBadge>
        <EscalationBadge status="warning">DUE FRIDAY</EscalationBadge>
        <EscalationBadge status="risk">COI MISSING</EscalationBadge>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <EscalationBadge status="confirmed" dot={false}>CONFIRMED</EscalationBadge>
        <EscalationBadge status="warning" dot={false}>DUE FRIDAY</EscalationBadge>
        <EscalationBadge status="risk" dot={false}>COI MISSING</EscalationBadge>
      </div>
    </div>
  </Canvas>
);

// Where the badge actually lives: at the end of a vendor row, carrying the one
// piece of state that row has. Labels are real operational strings, which run
// longer than a one-word demo and must not wrap or crowd the dot.
export const InVendorList = () => (
  <Canvas>
    <Surface role="card" pad={5}>
      <Text variant="heading" style={{ display: 'block', marginBottom: 12 }}>Vendors</Text>
      <div style={{ display: 'grid', gap: 10 }}>
        {[
          ['Hearth & Vine — catering', 'confirmed', 'CONTRACT SIGNED'],
          ['Northline AV — lighting', 'warning', 'COI DUE FRIDAY'],
          ['Cordova — valet', 'risk', 'NO COI · 48 HRS'],
          ['Ash & Ember — band', 'emergency', 'UNREACHABLE'],
          ['Petal Row — florist', 'neutral', 'AWAITING QUOTE'],
        ].map(([name, status, label]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <Text variant="body">{name}</Text>
            <EscalationBadge status={status as any}>{label}</EscalationBadge>
          </div>
        ))}
      </div>
    </Surface>
  </Canvas>
);

// The badge over the escalation plane rather than a plain card. Risk-on-risk is
// the pairing most likely to lose contrast, so it gets its own cell.
export const OnEscalationSurface = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 12 }}>
      <Surface role="escalation" pad={5}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Text variant="bodyStrong">Freight elevator double-booked</Text>
          <EscalationBadge status="risk">BLOCKS LOAD-IN</EscalationBadge>
        </div>
      </Surface>
      <Surface role="active" pad={5}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Text variant="bodyStrong">Final headcount — 148 guests</Text>
          <EscalationBadge status="confirmed">SENT 4:12 PM</EscalationBadge>
        </div>
      </Surface>
    </div>
  </Canvas>
);
