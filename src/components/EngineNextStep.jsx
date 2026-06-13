// EngineNextStep — shadow-mode preview of the Event Intelligence backward-solve,
// with a side-by-side comparison against the production Spine (selectEventNextAction).
// Additive + fully guarded: never replaces the Spine; renders nothing if the engine can't solve.
import React from 'react';
import { enginePreview } from '../lib/eventSolveAdapter';
import { selectEventNextAction } from '../CommandCenter';

export default function EngineNextStep({ event }) {
  let p = null, spine = null;
  try { p = enginePreview(event); } catch (e) { p = null; }
  try { spine = selectEventNextAction(event); } catch (e) { spine = null; }
  if (!p || !p.binding) return null;

  const spineTitle = spine && spine.title;
  // loose agreement: do the engine's binding keywords overlap the Spine's action?
  const norm = s => (s || '').toLowerCase();
  const agree = spineTitle
    ? norm(p.binding.name).split(/\W+/).some(w => w.length > 3 && norm(spineTitle).includes(w))
    : null;

  // shadow-mode comparison log (builds the dataset for the promote decision).
  // Records EVERY comparison (not just divergences) so we get a real agreement
  // base-rate. Deduped by event+binding+spine, persisted to localStorage so it
  // survives navigation/reloads, and exposed on window for the collector harness.
  try {
    const rec = {
      eventKey: String((event && (event.id || event.name)) || 'unknown'),
      eventName: (event && event.name) || null,
      daysOut: p.daysOut != null ? p.daysOut : null,
      family: p.family || null,
      flag: p.flag || null,
      dateAtRisk: !!p.dateAtRisk,
      engineBinding: p.binding.name,
      delivery: p.delivery || null,
      spine: spineTitle || null,
      agree, // true / false / null(no spine)
    };
    const KEY = 'ngw_engine_shadow_v1';
    const k = `${rec.eventKey}|${rec.engineBinding}|${rec.spine}`;
    const log = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!log.some(r => r._k === k)) {
      log.push({ ...rec, _k: k });
      localStorage.setItem(KEY, JSON.stringify(log));
    }
    window.__engineShadowLog = log;
    window.__dumpEngineShadow = () => JSON.parse(localStorage.getItem(KEY) || '[]');
    window.__clearEngineShadow = () => { localStorage.removeItem(KEY); window.__engineShadowLog = []; };
    console.debug('[engine-shadow]', rec);
  } catch (e) {}

  // The visible side-by-side is a DEVELOPER shadow-mode tool, not end-user UI —
  // it leaked to production on every non-Command tab (Grandmother caught the
  // "ENGINE PREVIEW binding: … vs Spine: … ⚑ differs" bar). Gate the overlay to
  // explicit opt-in; the comparison logging above still runs to build the dataset.
  let showPreview = false;
  try {
    showPreview = typeof window !== 'undefined' && (
      window.localStorage.getItem('ngw-engine-preview') === '1' ||
      /[?&]enginePreview=1/.test(window.location.search)
    );
  } catch (e) { showPreview = false; }
  if (!showPreview) return null;

  return (
    <div style={{
      padding: '5px 16px', borderBottom: '1px solid rgba(132,158,184,0.16)',
      fontSize: 11, lineHeight: 1.4, color: 'rgba(132,158,184,0.85)',
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', fontSize: 8.5, opacity: 0.8 }}>
        Engine preview
      </span>
      <span aria-hidden>{p.flag}</span>
      <span style={{ color: '#cdd8e3' }}>binding: <b style={{ color: '#e6edf3' }}>{p.binding.name}</b></span>
      {p.dateAtRisk && <span style={{ color: '#e0796f', fontWeight: 600 }}>· date-at-risk</span>}
      {p.delivery && <span style={{ opacity: 0.7 }}>· {p.delivery}</span>}
      {spineTitle && (
        <span style={{ opacity: 0.6 }}>
          · vs Spine: {spineTitle} {agree === true ? '✓' : agree === false ? '⚑ differs' : ''}
        </span>
      )}
    </div>
  );
}
