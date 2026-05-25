import { useState, useEffect, useRef } from 'react';
import { toCSV, downloadCSV, COLUMNS } from '../lib/csvParsers';

const C = {
  bg: '#0f0f11', surface: '#18181c', border: '#2a2a32',
  accent: '#7c6ef8', text: '#e8e8f0', muted: '#6b6b80',
};

export default function ExportMenu({ guests, vendors, budget, timeline, eventName = 'event' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const slug = eventName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'event';

  const exports = [
    { label: 'Guests (.csv)',   action: () => downloadCSV(`${slug}-guests.csv`,   toCSV(guests,   COLUMNS.guests)) },
    { label: 'Vendors (.csv)',  action: () => downloadCSV(`${slug}-vendors.csv`,  toCSV(vendors,  COLUMNS.vendors)) },
    { label: 'Budget (.csv)',   action: () => downloadCSV(`${slug}-budget.csv`,   toCSV(budget,   COLUMNS.budget)) },
    { label: 'Timeline (.csv)', action: () => downloadCSV(`${slug}-timeline.csv`, toCSV(timeline, COLUMNS.timeline)) },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${C.border}`, background: C.bg, color: C.text,
          fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        Export <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '6px', zIndex: 200, minWidth: 170,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {exports.map(({ label, action }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 12px', borderRadius: 7, border: 'none',
                background: 'transparent', color: C.text, cursor: 'pointer',
                fontSize: 13,
                ':hover': { background: C.bg },
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
