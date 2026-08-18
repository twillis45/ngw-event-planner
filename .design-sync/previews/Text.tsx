import { Text, color, space, radius } from 'ngw-event-boss';

// Studio Matte is a dark system: the text roles are near-white because they
// assume a carbon canvas. The preview card scaffold paints itself white, so
// every cell renders its own ground — otherwise primary text is white-on-white
// and only the steel-toned roles survive. Values come from the tokens, so this
// cannot drift from the real canvas.
const Canvas = ({ children, w = 560 }: { children: React.ReactNode; w?: number }) => (
  <div style={{
    background: color.surface.canvas,
    padding: space[6],
    borderRadius: radius.lg,
    maxWidth: w,
  }}>{children}</div>
);

// The full role ladder, in scale order. A planner reading a command surface
// should be able to tell tier by size alone — this card is where that gets
// checked, so the variants sit adjacent rather than in separate cells.
export const TypeScale = () => (
  <Canvas>
    <div style={{ display: 'grid', gap: 14 }}>
      <Text variant="title" as="h1">Saturday, October 18</Text>
      <Text variant="heading" as="h2">Vendor readiness</Text>
      <Text variant="bodyStrong">Three vendors have not returned a COI.</Text>
      <Text variant="body">
        Load-in opens at 6:00 AM through the north dock. The florist and the
        lighting crew overlap for forty minutes — confirm the freight elevator
        is held for both, or stagger them.
      </Text>
      <Text variant="secondary">Last updated 12 minutes ago by Dana Whitfield</Text>
      <Text variant="caption">Times shown in venue local time (EDT)</Text>
      <Text variant="label">RUN OF SHOW</Text>
    </div>
  </Canvas>
);

// Long-form body at a real measure — leading and wrapping are only legible
// across multiple lines, and a one-line sample hides both.
export const ReadingMeasure = () => (
  <Canvas w={480}>
    <Text variant="heading" as="h3" style={{ display: 'block', marginBottom: 10 }}>
      Why the timeline moved
    </Text>
    <Text variant="body" as="p" style={{ margin: 0 }}>
      The venue released the ballroom an hour later than contracted, which
      pushed the room flip past the point where the band could sound-check
      before doors. Rather than cut the check, we moved cocktails to the
      terrace and held guests outside for thirty-five minutes.
    </Text>
    <Text variant="secondary" as="p" style={{ marginTop: 10, marginBottom: 0 }}>
      Decision recorded by the on-site producer. No client approval required
      under the day-of authority granted in the planning agreement.
    </Text>
  </Canvas>
);

// The semantic/visual split: `as` picks the element, `variant` picks the look.
// Getting this wrong is the most common misuse, so it gets its own cell.
export const SemanticVsVisual = () => (
  <Canvas w={520}>
    <div style={{ display: 'grid', gap: 12 }}>
      <Text variant="label" as="h2">SECTION HEADING AS A LABEL</Text>
      <Text variant="body" as="p" style={{ margin: 0 }}>
        Above is an h2 wearing the label variant — correct when the heading is
        a kicker rather than a title.
      </Text>
      <Text variant="title" as="span">A title-styled span</Text>
      <Text variant="caption" as="p" style={{ margin: 0 }}>
        Above is a span wearing the title variant — correct inside a card whose
        real heading lives elsewhere.
      </Text>
    </div>
  </Canvas>
);
