// BottomSheet — production operational primitive.
// Weighted rise / soft dismiss (Sprint 8 matrix), escalation-aware tint +
// surfacing speed, adaptive height, tablet-aware (centered, max-width).
// No bounce/spring/elastic. Grounded, physical, calm.
import { useEffect, useRef, useState } from 'react';
import { color, radius, space, elevation, type } from '../tokens';
import { choreography } from '../motion';
import { useEscalation } from '../../contexts/EscalationContext';

export default function BottomSheet({
  open,
  onClose,
  title,
  height = 'auto',     // 'auto' | number(px) | 'peek'
  children,
  style = {},
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const rafRef = useRef(null);
  const timerRef = useRef(null);

  // Safe unconditionally — EscalationCtx has a nominal default (no provider → nominal).
  const esc = useEscalation();
  const emergency = esc.emergency, isEscalated = esc.isEscalated;

  // Surfacing speed follows severity; dismiss is always the soft release.
  const rise = emergency ? choreography.emergency : (isEscalated ? choreography.escalation : choreography.sheetRise);
  const fall = choreography.sheetDismiss;

  useEffect(() => {
    if (open) {
      clearTimeout(timerRef.current);
      setMounted(true);
      rafRef.current = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    } else if (mounted) {
      setShown(false);
      timerRef.current = setTimeout(() => setMounted(false), fall.ms + 20);
    }
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(timerRef.current); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const sheetBg = isEscalated ? color.status.riskBg : color.surface.elevated;
  const sheetBorder = emergency ? color.status.riskBright : (isEscalated ? color.status.risk : color.border.default);
  const peekH = height === 'peek' ? 120 : (typeof height === 'number' ? height : undefined);

  return (
    <div
      aria-hidden={!shown}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      {/* scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          opacity: shown ? 1 : 0,
          transition: `opacity ${(shown ? rise : fall).ms}ms ${(shown ? rise : fall).ease}`,
        }}
      />
      {/* sheet */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          width: '100%', maxWidth: 640, // tablet-aware: centered, capped
          height: peekH, maxHeight: '88vh',
          background: sheetBg,
          borderTop: `1px solid ${sheetBorder}`,
          borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
          boxShadow: emergency ? elevation.interrupt : elevation.escalation,
          padding: `${space[4]}px ${space[5]}px ${space[8]}px`, // 32px bottom = keyboard/thumb safe
          boxSizing: 'border-box',
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${(shown ? rise : fall).ms}ms ${(shown ? rise : fall).ease}`,
          overflowY: 'auto',
          ...style,
        }}
      >
        {/* grab handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: color.surface.dim, margin: '0 auto ' + space[4] + 'px' }} />
        {title && (
          <div style={{ fontFamily: type.family, fontSize: type.size.lg, fontWeight: type.weight.semibold, color: color.text.primary, marginBottom: space[4] }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
