import { Button, EscalationProvider, Text, color, space, radius } from 'ngw-event-boss';

// Studio Matte is a dark system: the text and surface roles assume a carbon
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

// The priority ladder in nominal context. p1 is primary here — expressed
// through structure (raised surface, grounding shadow, steel keyline), never
// through brighter colour.
export const PriorityLadder = () => (
  <Canvas>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button priority="p1">Send final headcount</Button>
      <Button priority="p2">Review seating</Button>
      <Button priority="ambient">Export run of show</Button>
    </div>
  </Canvas>
);

// The same pair under two contexts. This is the Sprint 8 defect's resolution
// and the most important thing about this component: under escalation the
// escalation action becomes primary and p1 DEMOTES to a quiet secondary, so
// they never compete as co-equals. Side by side is the only way to see it.
export const EscalationContextShift = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <Text variant="label" style={{ display: 'block', marginBottom: 8 }}>NOMINAL</Text>
        <EscalationProvider initialLevel="nominal">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button priority="p1">Send final headcount</Button>
            <Button priority="escalation">Call the venue</Button>
          </div>
        </EscalationProvider>
      </div>
      <div>
        <Text variant="label" style={{ display: 'block', marginBottom: 8 }}>ESCALATED</Text>
        <EscalationProvider initialLevel="escalated">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button priority="p1">Send final headcount</Button>
            <Button priority="escalation">Call the venue</Button>
          </div>
        </EscalationProvider>
      </div>
    </div>
  </Canvas>
);

// Explicit sizes. Height is otherwise derived from priority, so this is the
// override axis rather than the default one.
export const Sizes = () => (
  <Canvas>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button priority="p2" size="sm">Small</Button>
      <Button priority="p2" size="md">Medium</Button>
      <Button priority="p2" size="lg">Large</Button>
      <Button priority="p2" size="xl">Extra large</Button>
    </div>
  </Canvas>
);

// Disabled across the ladder — a disabled p1 must still read as the structural
// primary, just inert. Losing that is a real regression this cell catches.
export const DisabledStates = () => (
  <Canvas>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button priority="p1" disabled>Send final headcount</Button>
      <Button priority="p2" disabled>Review seating</Button>
      <Button priority="ambient" disabled>Export run of show</Button>
    </div>
  </Canvas>
);

// Full-width, as it appears in a bottom sheet or a narrow host column.
export const FullWidth = () => (
  <Canvas w={400}>
    <div style={{ display: 'grid', gap: 10 }}>
      <Button priority="p1" full>Confirm 148 guests</Button>
      <Button priority="ambient" full>Not yet — keep the estimate</Button>
    </div>
  </Canvas>
);
