// ─── THE ONE RENAME FIELD (owner, 11/24/2026, renders 4a, 4b, 12a) ──────────
// Every place she names her event uses this one field: the board's title
// (long press on touch, double-click on a desktop, or "Name it" while the name
// is a placeholder), the events sheet's Rename on the current event, and the
// invite step's "What do you call it?". One field, so the three cannot drift.
//
//   mode 'title'  — in place of the title, the text selected; Done saves.
//   mode 'sheet'  — in place of the events sheet's row; Save, and Cancel.
//   mode 'invite' — the invite check's ask: empty, the current name as its
//                   placeholder; "Save the name". Always open, so no cancel.
//
// Escape, or leaving the field without a change, cancels (title and sheet).
// A changed field that loses focus stays open: nothing she typed is lost.
import { useEffect, useRef, useState } from 'react';

export default function EventNameField({ name, onSave, onCancel, mode = 'title', label = 'Event name', saveLabel = 'Done' }) {
  const open = mode !== 'invite';
  const [value, setValue] = useState(open ? String(name || '') : '');
  const ref = useRef(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    ref.current.focus();
    ref.current.select();
  }, [open]);
  const next = value.trim();
  const changed = !!next && next !== String(name || '').trim();
  const save = (e) => {
    if (e) e.preventDefault();
    if (!next) return;
    if (open && !changed) { if (onCancel) onCancel(); return; }
    onSave(next);
  };
  return (
    <form className={'evname evname-' + mode} data-rename={mode} onSubmit={save}>
      <input ref={ref} className="field evname-in" name="evname" value={value} aria-label={label}
        placeholder={open ? undefined : String(name || '')} autoComplete="off" enterKeyHint="done"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !onCancel) return;
          e.preventDefault(); e.stopPropagation();
          onCancel();
        }}
        onBlur={(e) => {
          if (!onCancel || changed) return;
          // Moving to this field's own buttons is not leaving it.
          if (e.relatedTarget && e.currentTarget.form && e.currentTarget.form.contains(e.relatedTarget)) return;
          onCancel();
        }} />
      <button className="mini" type="submit">{saveLabel}</button>
      {mode === 'sheet' && <button type="button" className="evname-cancel" onClick={onCancel}>Cancel</button>}
    </form>
  );
}
