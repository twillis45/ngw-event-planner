import { BottomSheet, Button, Text, color, space, radius } from 'ngw-event-boss';

// BottomSheet is a fixed-position overlay: it paints `position:fixed; inset:0`
// with a 55% scrim and rises from the bottom edge. So the "Canvas" here is not a
// card the sheet sits inside — it is the screen BEHIND the sheet. Without it the
// scaffold's hardcoded white body shows through the scrim as washed gray and the
// dark system reads wrong. Each export therefore paints a full-viewport ground
// with a little host content, then opens the sheet on top of it.
const Screen = ({ children, behind }: { children: React.ReactNode; behind?: React.ReactNode }) => (
  <div style={{
    background: color.surface.canvas,
    minHeight: '100vh',
    padding: space[5],
    boxSizing: 'border-box',
  }}>
    {behind}
    {children}
  </div>
);

// A stand-in for the command screen underneath, so the scrim has something real
// to sit over and the sheet's elevation is legible rather than floating on flat black.
const Behind = ({ heading, lines }: { heading: string; lines: string[] }) => (
  <div style={{ display: 'grid', gap: space[3] }}>
    <Text variant="label" as="div">SATURDAY · 4 DAYS OUT</Text>
    <Text variant="heading" as="div">{heading}</Text>
    {lines.map((l) => (
      <div key={l} style={{
        background: color.surface.card,
        border: `1px solid ${color.border.subtle}`,
        borderRadius: radius.md,
        padding: `${space[3]}px ${space[4]}px`,
      }}>
        <Text variant="secondary" as="div">{l}</Text>
      </div>
    ))}
  </div>
);

// The primary story: a decision the host has to make, with the two real answers
// as buttons. height="auto" — the sheet takes exactly the height of its content,
// which is the common case for a short confirm.
export const ConfirmHeadcount = () => (
  <Screen behind={<Behind heading="Whitfield rehearsal dinner" lines={[
    'Venue needs the final number by 5:00 PM',
    '52 confirmed · 6 have not replied',
  ]} />}>
    <BottomSheet open title="Lock the final headcount at 52?" onClose={() => {}}>
      <div style={{ display: 'grid', gap: space[4] }}>
        <Text variant="secondary" as="p">
          Six guests have not replied yet.
        </Text>
        <div style={{
          background: color.surface.card,
          border: `1px solid ${color.border.subtle}`,
          borderRadius: radius.md,
          padding: space[4],
          display: 'grid',
          gap: space[2],
        }}>
          <Text variant="caption" as="div">WHAT CHANGES</Text>
          <Text variant="body" as="div">Catering count 58 → 52</Text>
          <Text variant="body" as="div">Estimated cost −$414</Text>
        </div>
        <div style={{ display: 'flex', gap: space[3] }}>
          <Button priority="p1">Lock 52 and notify</Button>
          <Button priority="ambient">Chase the six first</Button>
        </div>
      </div>
    </BottomSheet>
  </Screen>
);

// The tall case: a fixed pixel height so the sheet holds a scrolling detail
// record without swallowing the whole screen. Shows the height axis as a number.
export const VendorDetail = () => (
  <Screen behind={<Behind heading="Vendors · 6 booked" lines={[
    'Marlowe House · contract signed',
    'Fern & Field Florals · COI outstanding',
  ]} />}>
    <BottomSheet open height={400} title="Fern & Field Florals" onClose={() => {}}>
      <div style={{ display: 'grid', gap: space[4] }}>
        <Text variant="secondary" as="p">
          Arrival 7:15 AM through the loading dock. Two-person crew, 90 minutes
          for the ceremony arch and eight table runs.
        </Text>
        <div style={{ display: 'grid', gap: space[2] }}>
          <Text variant="caption" as="div">OUTSTANDING</Text>
          <Text variant="body" as="div">Certificate of insurance — venue gate is Thursday</Text>
          <Text variant="body" as="div">Final stem count — needs the locked headcount</Text>
        </div>
        <div style={{ display: 'flex', gap: space[3] }}>
          <Button priority="p1">Request the COI</Button>
          <Button priority="ambient">Call Dana</Button>
        </div>
      </div>
    </BottomSheet>
  </Screen>
);

// height="peek" — a 120px sheet that surfaces one line and one action without
// covering the screen behind it. This is the day-of nudge, not a decision.
export const DayOfPeek = () => (
  <Screen behind={<Behind heading="Day of · 6:00 AM load-in" lines={[
    'Freight elevator held 6:00–7:00 AM',
    'Rentals truck en route · 12 min out',
    'Kitchen staff arrive 8:30 AM',
  ]} />}>
    <BottomSheet open height="peek" onClose={() => {}}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
        <Text variant="bodyStrong" as="div">Rentals truck · 12 min out</Text>
        <Button priority="p2" size="sm">Open dock</Button>
      </div>
    </BottomSheet>
  </Screen>
);
