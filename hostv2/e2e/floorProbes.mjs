// ─── THE COHESION PROBES, SHARED (cohesion batch B, 11/24/2026) ─────────────
//
// Each function runs IN THE PAGE (page.evaluate) over one root, and returns a
// list of plain strings, one per violation, with no measurements in them so a
// list can be compared from run to run. The tap probe is the one
// everyTapIsFortyFourSquare has used since audit 2; it moved here so the
// every-sheet sweep measures with the same walk, not a second copy of it.
//
// UX_11 rules, owner-approved 11/24/2026:
//   9  tap targets at least 44x44 on touch (underFloor);
//   3  remove, delete and skip sit alone at the bottom and name what they
//      remove (destructiveNotLast);
//   2  an item opens in labeled groups: no field labeled only by a placeholder
//      (unlabeledFields).

// Rule 9. Every pressable control inside `root` whose probed hit area is under
// the floor on either axis, minus the one exemption (an inline text link in a
// sentence with nothing else tappable within 24px). `withSize` keeps the
// measured size in the string (the original spec's message); the sweep drops it.
export const underFloor = ([rootSel, floor, only, withSize = true]) => {
  const root = [...document.querySelectorAll(rootSel)].pop() || document.body;
  const PRESS = 'button, a[href], [role=button], [role=radio], summary, input:not([type=hidden]), select';
  const all = [...root.querySelectorAll(PRESS)];
  const judged = only ? all.filter((el) => el.matches(only)) : all;
  const inlineInSentence = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false;
    const p = el.parentElement;
    const text = [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (text.length < 12) return false;                 // a sentence around it, not a label beside it
    const r = el.getBoundingClientRect();
    return !all.some((o) => {
      if (o === el || o.contains(el) || el.contains(o) || !o.getClientRects().length) return false;
      const q = o.getBoundingClientRect();
      const dx = Math.max(0, q.left - r.right, r.left - q.right), dy = Math.max(0, q.top - r.bottom, r.top - q.bottom);
      return Math.hypot(dx, dy) < 24;
    });
  };
  const out = [];
  for (const el of judged) {
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.width < 4 || el.closest('[inert], [aria-hidden="true"]')) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const b = el.getBoundingClientRect();
    const cx = Math.round(b.left + b.width / 2), cy = Math.round(b.top + b.height / 2);
    const owns = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
    if (!owns(cx, cy)) continue;                        // covered or clipped: judged where it is reachable
    const walk = (dx, dy) => { let n = 0; while (n < 60 && owns(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
    const w = walk(-1, 0) + walk(1, 0) + 1, h = walk(0, -1) + walk(0, 1) + 1;
    if (w >= floor && h >= floor) continue;
    if (inlineInSentence(el)) continue;
    const name = `${String(el.className || el.tagName).split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 26)}"`;
    out.push(withSize ? `${name} ${w}x${h}` : name);
  }
  return out;
};

// On screen to a host: laid out, not hidden, and not inside a folded parent
// (a closed vendor card keeps its controls in the DOM at opacity 0 under a
// zero max-height). Defined inside each probe below, because a probe runs in
// the page and cannot reach this module's scope.
// Rule 3. A control that removes, deletes or skips something must be the LAST
// pressable of the item it acts on, alone on its line, and must say what it
// removes. The item is the nearest card-like container; a control with none
// is judged against the whole sheet.
export const destructiveNotLast = ([rootSel]) => {
  const root = [...document.querySelectorAll(rootSel)].pop() || document.body;
  const PRESS = 'button, a[href], [role=button], summary, input:not([type=hidden]), select, textarea, label:has(> input[type=file])';
  const DESTRUCT = /\b(remove|delete|skip)\b/i;
  // The bare verb, or the verb with a pronoun, names nothing.
  const GENERIC = /^(remove|delete|skip)( (it|this|them|from this event|this one))?\.?$/i;
  const ITEM = '[data-item], .vcard, .card, .brow, .grow';
  const shown = (el) => {
    if (!el || el.closest('[inert], [aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (parseFloat(ac.opacity) < 0.05) return false;
      if (/hidden|clip/.test(ac.overflow + ac.overflowY) && a.getBoundingClientRect().height < 2) return false;
    }
    return true;
  };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const el of root.querySelectorAll('button, a[href], [role=button]')) {
    if (!shown(el)) continue;
    const text = label(el);
    if (!DESTRUCT.test(text)) continue;
    const scope = el.closest(ITEM) || root;
    const where = scope === root ? 'sheet' : String(scope.className || scope.tagName).split(' ')[0];
    const tag = `${where} "${text.slice(0, 40)}"`;
    const others = [...scope.querySelectorAll(PRESS)].filter((o) => o !== el && !el.contains(o) && !o.contains(el) && shown(o));
    const after = others.filter((o) => el.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (after.length) out.push(`${tag} is not last (then "${label(after[0]).slice(0, 30)}")`);
    const r = el.getBoundingClientRect();
    const beside = others.find((o) => { const q = o.getBoundingClientRect(); return q.top < r.bottom - 2 && q.bottom > r.top + 2; });
    if (beside) out.push(`${tag} is not alone on its line (beside "${label(beside).slice(0, 30)}")`);
    if (GENERIC.test(text)) out.push(`${tag} does not name what it removes`);
  }
  return out;
};

// Rule 2. Every field a host types into carries a visible label: its own
// <label>, an aria-labelledby that points at visible text, or a group label
// (a legend, .shelf-label or label) just before it or its wrapper. A
// placeholder or an aria-label alone is not a visible label. A search box is
// exempt: it is a filter over the list, named by what it searches.
export const unlabeledFields = ([rootSel]) => {
  const root = [...document.querySelectorAll(rootSel)].pop() || document.body;
  const shown = (el) => {
    if (!el || el.closest('[inert], [aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (parseFloat(ac.opacity) < 0.05) return false;
      if (/hidden|clip/.test(ac.overflow + ac.overflowY) && a.getBoundingClientRect().height < 2) return false;
    }
    return true;
  };
  const visibleText = (el) => shown(el) && (el.innerText || '').trim().length > 0;
  const LABELISH = 'label, legend, .shelf-label, .field-label';
  const groupLabelBefore = (el) => {
    let node = el;
    for (let depth = 0; depth < 3 && node && node !== root; depth++) {
      let sib = node.previousElementSibling;
      while (sib) {
        if (sib.matches(LABELISH) && visibleText(sib)) return true;
        if (sib.matches('input, textarea, select, button')) break;   // another control's label, not this one's
        sib = sib.previousElementSibling;
      }
      node = node.parentElement;
    }
    return false;
  };
  const out = [];
  for (const el of root.querySelectorAll('input, textarea, select')) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (['hidden', 'file', 'submit', 'button'].includes(type)) continue;
    if (!shown(el)) continue;
    if (type === 'search' || el.getAttribute('role') === 'searchbox') continue;
    const own = [...(el.labels || [])].some((l) => visibleText(l) && (l.innerText || '').trim() !== (el.value || '').trim());
    const by = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
      .some((id) => visibleText(document.getElementById(id)));
    if (own || by || groupLabelBefore(el)) continue;
    const name = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || type || el.tagName;
    out.push(`${el.tagName.toLowerCase()}${type ? '[' + type + ']' : ''} "${name.replace(/\s+/g, ' ').trim().slice(0, 40)}"`);
  }
  return out;
};
// Rule 9 (owner report, 11/24/2026): nothing tappable is clipped. A tappable's
// keycap edge, focus ring and attention ring reach 12px out; an ancestor that
// clips horizontally (overflow-x not visible) within 12px of its left or right
// edge cuts them. iPadOS Safari has no overflow-clip-margin, so it cannot save it.
export const clippedSideways = ([rootSel, reach = 12]) => {
  const root = [...document.querySelectorAll(rootSel)].pop() || document.body;
  const PRESS = 'button, a[href], [role=button], [role=radio], summary, input:not([type=hidden]), select, textarea';
  const out = [];
  for (const el of root.querySelectorAll(PRESS)) {
    if (el.closest('[inert], [aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let hidden = false;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (parseFloat(ac.opacity) < 0.05) { hidden = true; break; }
      if (/hidden|clip/.test(ac.overflowY) && a.getBoundingClientRect().height < 2) { hidden = true; break; }
    }
    if (hidden) continue;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'visible') continue;
      const q = a.getBoundingClientRect();
      // A chip partly scrolled out of a sideways scroller is reached by
      // scrolling, not cut: judged only where the scroller shows it whole.
      if (/auto|scroll/.test(ox) && (r.left < q.left - 0.5 || r.right > q.right + 0.5)) break;
      const left = r.left - q.left, right = q.right - r.right;
      // In a scroller with more to scroll, the edge with more content beyond
      // it is a scroll edge: its padding waits at the end of the scroll.
      const more = /auto|scroll/.test(ox) && a.scrollWidth > a.clientWidth + 1;
      const atStart = a.scrollLeft <= 0.5, atEnd = a.scrollLeft >= a.scrollWidth - a.clientWidth - 0.5;
      const near = (d) => d < reach - 0.5;   // half a pixel for sub-pixel layout
      if ((near(left) && (!more || atStart)) || (near(right) && (!more || atEnd))) {
        const who = String(a.className || a.tagName).split(' ')[0];
        out.push(`${String(el.className || el.tagName).split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 26)}" in ${who}`);
        break;
      }
    }
  }
  return out;
};
