// UX_13 (owner, 11/25/2026): the layout is chosen by width.
//   phone    600 and below: UX_12 (tab bar, pushed pages, sheets);
//   compact  601 to 1023: one pane; the sidebar slides in from a menu button;
//            a guest opens as a pushed page;
//   split    1024 and up: three panes (sidebar, list, detail).
import { useEffect, useState } from 'react';

export const layoutFor = (width) => (width >= 1024 ? 'split' : width > 600 ? 'compact' : 'phone');

export function useLayout() {
  const read = () => (typeof window === 'undefined' ? 'phone' : layoutFor(window.innerWidth));
  const [layout, setLayout] = useState(read);
  useEffect(() => {
    const on = () => setLayout(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return layout;
}

/** Keyboard shortcuts never fire while she types in a field, or with a modifier held. */
export const typingIn = (el) => !!el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
