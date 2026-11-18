// A wait the host can see (owner, 11/18/2026: "more attention"). One status
// line with a pulsing mark, announced to screen readers, placed under the
// action it belongs to. Same look as the shop's store lookup (.store-busy).
export default function BusyLine({ children, style }) {
  return (
    <div className="store-busy busy-line" role="status" aria-live="polite" data-busy-line style={style}>
      <span className="busy-dot" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
