import { Surface, Text, EscalationBadge, DensityProvider, color, space, radius } from 'ngw-event-boss';

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

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 6 }}>
    <Text variant="secondary">{label}</Text>
    <Text variant="bodyStrong">{value}</Text>
  </div>
);

// The whole point of this component: the five depth planes stacked so the
// elevation/border ladder is legible in one look. canvas is flat ground, card
// is the default plane, active is the raised one under the eye, escalation
// carries the red keyline and risk fill, interrupt sits highest.
export const RoleLadder = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 14 }}>
      <Surface role="canvas">
        <Text variant="label" style={{ display: 'block', marginBottom: 6 }}>CANVAS</Text>
        <Text variant="secondary">Saturday — Kessler wedding, 148 guests</Text>
      </Surface>

      <Surface role="card">
        <Text variant="label" style={{ display: 'block', marginBottom: 6 }}>CARD</Text>
        <Text variant="bodyStrong">Vendors</Text>
        <Row label="Contracted" value="9 of 11" />
        <Row label="COIs on file" value="6 of 11" />
      </Surface>

      <Surface role="active">
        <Text variant="label" style={{ display: 'block', marginBottom: 6 }}>ACTIVE</Text>
        <Text variant="bodyStrong">Load-in — 6:00 AM, freight elevator</Text>
        <Row label="Crew called" value="7" />
        <Row label="First truck" value="Lighting, 6:05 AM" />
      </Surface>

      <Surface role="escalation">
        <Text variant="label" style={{ display: 'block', marginBottom: 6 }}>ESCALATION</Text>
        <Text variant="bodyStrong">Freight elevator double-booked 6:00–7:00 AM</Text>
        <Row label="Blocks" value="Lighting, florist" />
      </Surface>

      <Surface role="interrupt">
        <Text variant="label" style={{ display: 'block', marginBottom: 6 }}>INTERRUPT</Text>
        <Text variant="bodyStrong">Venue reports a water leak in the ballroom</Text>
        <Row label="Decision needed by" value="7:30 AM" />
      </Surface>
    </div>
  </Canvas>
);

// Density behavior, which is invisible in a single surface. Under crisis the
// ordinary cards lose their grounding shadow and recede, so the active surface
// is the only thing still raised. Side by side is the only way to see it.
export const DensityRecession = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <Text variant="label" style={{ display: 'block', marginBottom: 8 }}>FULL DENSITY</Text>
        <DensityProvider override="full">
          <div style={{ display: 'grid', gap: 10 }}>
            <Surface role="card"><Text variant="body">Seating chart — 18 tables</Text></Surface>
            <Surface role="card"><Text variant="body">Bar package confirmed</Text></Surface>
            <Surface role="active"><Text variant="bodyStrong">Send final headcount by 5:00 PM</Text></Surface>
          </div>
        </DensityProvider>
      </div>
      <div>
        <Text variant="label" style={{ display: 'block', marginBottom: 8 }}>CRISIS DENSITY</Text>
        <DensityProvider override="crisis">
          <div style={{ display: 'grid', gap: 10 }}>
            <Surface role="card"><Text variant="body">Seating chart — 18 tables</Text></Surface>
            <Surface role="card"><Text variant="body">Bar package confirmed</Text></Surface>
            <Surface role="active"><Text variant="bodyStrong">Send final headcount by 5:00 PM</Text></Surface>
          </div>
        </DensityProvider>
      </div>
    </div>
  </Canvas>
);

// Padding and radius are the layout axes. pad takes a space-scale KEY, not a
// pixel value — the most common misuse of this component.
export const PaddingAndRadius = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 12 }}>
      <Surface role="card" pad={3} rad="sm">
        <Text variant="secondary">pad 3 · rad sm — dense run-of-show row</Text>
      </Surface>
      <Surface role="card" pad={5} rad="lg">
        <Text variant="secondary">pad 5 · rad lg — the default vendor card</Text>
      </Surface>
      <Surface role="card" pad={8} rad="xl">
        <Text variant="secondary">pad 8 · rad xl — event hero panel</Text>
      </Surface>
    </div>
  </Canvas>
);

// Borderless surfaces, used when a surface nests inside another and a second
// keyline would only add noise. The inner planes still separate by fill alone.
export const Borderless = () => (
  <Canvas>
    <Surface role="card" pad={5}>
      <Text variant="heading" style={{ display: 'block', marginBottom: 4 }}>Run of show</Text>
      <Text variant="caption" style={{ display: 'block', marginBottom: 12 }}>Saturday, August 22, 2026</Text>
      <div style={{ display: 'grid', gap: 8 }}>
        <Surface role="active" border={false} pad={4} rad="md">
          <Text variant="bodyStrong">6:00 AM · Load-in begins</Text>
        </Surface>
        <Surface role="active" border={false} pad={4} rad="md">
          <Text variant="bodyStrong">9:00 AM · Room reveal</Text>
        </Surface>
        <Surface role="active" border={false} pad={4} rad="md">
          <Text variant="bodyStrong">4:30 PM · Guest arrival</Text>
        </Surface>
      </div>
    </Surface>
  </Canvas>
);

// How the roles actually get composed in the host: a card holding real content,
// with the escalation plane nested inside it for the one thing that is wrong.
export const RealisticComposition = () => (
  <Canvas>
    <Surface role="card" pad={6}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <Text variant="heading">Vendor readiness</Text>
        <EscalationBadge status="warning">3 OUTSTANDING</EscalationBadge>
      </div>
      <div style={{ marginTop: 12 }}>
        <Row label="Caterer — Hearth &amp; Vine" value="COI on file" />
        <Row label="Lighting — Northline AV" value="COI outstanding" />
        <Row label="Valet — Cordova" value="COI outstanding" />
      </div>
      <div style={{ marginTop: 16 }}>
        <Surface role="escalation" pad={4} rad="md">
          <Text variant="bodyStrong" style={{ display: 'block', marginBottom: 4 }}>
            The band has not returned a certificate
          </Text>
          <Text variant="secondary">The venue gate is 48 hours out and blocks load-in.</Text>
        </Surface>
      </div>
    </Surface>
  </Canvas>
);
