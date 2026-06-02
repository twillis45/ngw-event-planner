// AlphaTesterGate — Sprint 45 Alpha Test Distribution
//
// Lightweight registration + consent + feedback wrapper for external coordinator sessions.
// Activated when ?slice=orchestration&observe=1 is in the URL.
//
// Flow:
//   register → consent → [OrchestrationSlice] → feedback → complete
//
// Tester ID:
//   Passed via ?tid=TEST-001 URL param (pre-assigned by facilitator).
//   Falls back to timestamp-based ID if not provided.
//
// Data:
//   - Profile stored in localStorage + included in observationKit session export
//   - Feedback stored in localStorage + included in export
//   - Full export JSON shown at end for copy + email to facilitator
//
// No backend required. Everything travels with the session export.

import { useState, useCallback } from 'react';
import { setTesterProfile, setSessionFeedback, exportSession } from './orchestration/observationKit';

// ─── Constants ─────────────────────────────────────────────────────────────

const ROLES = [
  'Wedding Coordinator',
  'Event Planner',
  'Corporate Event Manager',
  'Production Coordinator',
  'Photographer',
  'DJ / MC',
  'Other',
];

const EVENT_TYPES = [
  'Weddings',
  'Corporate Events',
  'Social Events',
  'Galas & Fundraisers',
  'Conferences',
  'Multi-day Festivals',
  'Other',
];

const FEEDBACK_QUESTIONS = [
  { id: 'attention',     label: 'What drew your attention first?',                          type: 'text' },
  { id: 'confusing',     label: 'What felt confusing?',                                      type: 'text' },
  { id: 'knew_begin',    label: 'Did you know where to begin?',                              type: 'scale', low: 'Not at all', high: 'Immediately' },
  { id: 'oriented',      label: 'Did the environment help you stay oriented?',               type: 'scale', low: 'No', high: 'Yes' },
  { id: 'transitions',   label: 'Did transitions feel easier to track than a static list?',  type: 'scale', low: 'No', high: 'Yes' },
  { id: 'distracting',   label: 'Did anything feel distracting?',                            type: 'text' },
  { id: 'use_real',      label: 'Would you use this during a real event?',                   type: 'scale', low: 'Definitely not', high: 'Definitely yes' },
  { id: 'usefulness',    label: 'Rate usefulness (1–10)',                                    type: 'rating', max: 10 },
  { id: 'trust',         label: 'Rate trust — did you feel confident in what it showed?',   type: 'rating', max: 10 },
  { id: 'comments',      label: 'Additional comments',                                       type: 'text', optional: true },
];

// ─── ID generation ─────────────────────────────────────────────────────────

function generateTesterId() {
  // Use a short timestamp-based suffix so IDs don't collide across devices
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `TEST-${suffix}`;
}

// ─── Styles ────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: '#080808',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    overflowY: 'auto', padding: '40px 20px',
  },
  card: {
    width: '100%', maxWidth: 480,
    background: '#141414',
    border: '1px solid #2A2A2A',
    borderRadius: 12,
    padding: '32px 28px',
  },
  tag: {
    display: 'inline-block',
    fontSize: 10, fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#C8A86B',
    background: '#1E1A0E',
    border: '1px solid #3A3018',
    borderRadius: 4, padding: '3px 8px',
    marginBottom: 16,
  },
  h1: { fontSize: 22, fontWeight: 700, color: '#EFEFEF', margin: '0 0 8px' },
  body: { fontSize: 13, color: '#888', lineHeight: 1.6, margin: '0 0 24px' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, letterSpacing: '0.06em' },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: '#0E0E0E', border: '1px solid #2A2A2A',
    borderRadius: 6, padding: '10px 12px',
    fontSize: 14, color: '#EFEFEF',
    outline: 'none',
    marginBottom: 16,
  },
  select: {
    width: '100%', boxSizing: 'border-box',
    background: '#0E0E0E', border: '1px solid #2A2A2A',
    borderRadius: 6, padding: '10px 12px',
    fontSize: 14, color: '#EFEFEF',
    outline: 'none', cursor: 'pointer',
    marginBottom: 16,
    appearance: 'none',
  },
  btn: {
    width: '100%',
    background: '#C8A86B', border: 'none', borderRadius: 8,
    padding: '13px 0',
    fontSize: 14, fontWeight: 700, color: '#0A0A0A',
    cursor: 'pointer', marginTop: 8,
  },
  btnSecondary: {
    width: '100%',
    background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 8,
    padding: '12px 0',
    fontSize: 14, fontWeight: 600, color: '#888',
    cursor: 'pointer', marginTop: 8,
  },
  divider: { height: 1, background: '#1A1A1A', margin: '20px 0' },
  idBadge: {
    display: 'inline-block',
    background: '#1A1A1A', border: '1px solid #2A2A2A',
    borderRadius: 6, padding: '4px 10px',
    fontSize: 13, fontWeight: 700, color: '#C8A86B',
    letterSpacing: '0.08em', marginBottom: 20,
  },
  recordBox: {
    background: '#0E0E1A', border: '1px solid #2A2A44',
    borderRadius: 8, padding: '16px',
    marginBottom: 20,
  },
  recordTitle: { fontSize: 12, fontWeight: 700, color: '#9090C8', marginBottom: 8 },
  recordStep: { fontSize: 12, color: '#6666AA', lineHeight: 1.7, margin: 0 },
  consentBox: {
    background: '#0A0A0A', border: '1px solid #222',
    borderRadius: 6, padding: '12px 14px',
    fontSize: 11, color: '#666', lineHeight: 1.6,
    marginBottom: 20,
  },
  endBtn: {
    position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
    background: '#1A1A1A', border: '1px solid #333',
    borderRadius: 8, padding: '8px 14px',
    fontSize: 11, fontWeight: 600, color: '#666',
    cursor: 'pointer',
    transition: 'background 400ms ease, color 400ms ease',
  },
  scaleRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 16,
  },
  scaleBtn: (active) => ({
    width: 32, height: 32, borderRadius: 6,
    background: active ? '#C8A86B' : '#1A1A1A',
    border: active ? '1px solid #C8A86B' : '1px solid #2A2A2A',
    color: active ? '#0A0A0A' : '#666',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }),
  scaleLabel: { fontSize: 10, color: '#555', flexShrink: 0 },
  textArea: {
    width: '100%', boxSizing: 'border-box',
    background: '#0E0E0E', border: '1px solid #2A2A2A',
    borderRadius: 6, padding: '10px 12px',
    fontSize: 13, color: '#EFEFEF', lineHeight: 1.5,
    outline: 'none', resize: 'vertical', minHeight: 72,
    marginBottom: 16,
  },
  exportBox: {
    background: '#080808', border: '1px solid #1A1A1A',
    borderRadius: 6, padding: '12px',
    fontSize: 10, color: '#444', fontFamily: 'monospace',
    maxHeight: 200, overflowY: 'auto',
    marginBottom: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  },
  copyBtn: {
    width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
    borderRadius: 8, padding: '12px 0',
    fontSize: 13, fontWeight: 700, color: '#C8A86B',
    cursor: 'pointer', marginBottom: 12,
  },
  successNote: {
    fontSize: 11, color: '#44AA66', textAlign: 'center',
    padding: '8px', display: 'none',
  },
};

// ─── Screens ───────────────────────────────────────────────────────────────

function ScreenRegister({ profile, setProfile, onContinue }) {
  const valid = profile.name.trim() && profile.email.trim() && profile.role && profile.yearsExp && profile.eventType;

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.tag}>NGW EVENT BOSS · ALPHA TEST</div>
        <h1 style={S.h1}>Before we begin</h1>
        <p style={S.body}>
          You're testing an early-stage coordination environment designed for live event management.
          This takes about 5–10 minutes. Tell us a bit about your background first.
        </p>

        <div style={S.idBadge}>{profile.id}</div>

        <label style={S.label}>YOUR NAME</label>
        <input style={S.input} placeholder="First and last name"
          value={profile.name}
          onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />

        <label style={S.label}>EMAIL</label>
        <input style={S.input} type="email" placeholder="you@example.com"
          value={profile.email}
          onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />

        <label style={S.label}>YOUR ROLE</label>
        <select style={S.select} value={profile.role}
          onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}>
          <option value="">Select a role…</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={S.label}>YEARS OF EXPERIENCE</label>
        <select style={S.select} value={profile.yearsExp}
          onChange={e => setProfile(p => ({ ...p, yearsExp: e.target.value }))}>
          <option value="">Select…</option>
          {['Less than 1 year','1–2 years','3–5 years','6–10 years','10+ years'].map(y =>
            <option key={y} value={y}>{y}</option>)}
        </select>

        <label style={S.label}>PRIMARY EVENT TYPE</label>
        <select style={S.select} value={profile.eventType}
          onChange={e => setProfile(p => ({ ...p, eventType: e.target.value }))}>
          <option value="">Select…</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button style={{ ...S.btn, opacity: valid ? 1 : 0.4 }}
          disabled={!valid}
          onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}

function ScreenConsent({ profile, onBegin }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.tag}>STEP 2 OF 2 — BEFORE YOU BEGIN</div>
        <h1 style={S.h1}>Start screen recording</h1>
        <p style={S.body}>
          We ask you to record your screen during the test. This captures what you actually do,
          not just what you remember. It takes 30 seconds to set up.
        </p>

        <div style={S.recordBox}>
          <div style={S.recordTitle}>iPhone</div>
          <p style={S.recordStep}>
            1. Open Control Center (swipe down from top-right)<br />
            2. Tap the Screen Record button (circle icon)<br />
            3. Wait for the 3-second countdown<br />
            4. Return to this page
          </p>
        </div>

        <div style={S.recordBox}>
          <div style={{ ...S.recordTitle, color: '#60C880' }}>Android</div>
          <p style={{ ...S.recordStep, color: '#336644' }}>
            1. Swipe down to open Quick Settings<br />
            2. Tap "Screen Recorder" or "Screen Record"<br />
            3. Confirm and wait for countdown<br />
            4. Return to this page
          </p>
        </div>

        <label style={S.consentBox}>
          By continuing you confirm your screen is being recorded and consent to your
          interaction data being used to improve NGW Event Boss.
          Your name and email will not be shared publicly.
          Data is used solely for product research.
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: '#888' }}>
            My screen is recording and I consent to data collection
          </span>
        </label>

        <div style={{ ...S.idBadge, marginBottom: 8 }}>
          {profile.id} · {profile.name}
        </div>
        <p style={{ fontSize: 11, color: '#555', marginBottom: 20 }}>
          Keep this session ID — you'll see it again at the end.
        </p>

        <button style={{ ...S.btn, opacity: confirmed ? 1 : 0.4 }}
          disabled={!confirmed}
          onClick={onBegin}>
          Begin Test →
        </button>
      </div>
    </div>
  );
}

function ScreenFeedback({ profile, onSubmit }) {
  const initFeedback = () => FEEDBACK_QUESTIONS.reduce((acc, q) => {
    acc[q.id] = q.type === 'rating' ? '' : q.type === 'scale' ? '' : '';
    return acc;
  }, {});

  const [fb, setFb] = useState(initFeedback);

  const allAnswered = FEEDBACK_QUESTIONS.filter(q => !q.optional).every(q => {
    const val = fb[q.id];
    return val !== '' && val !== undefined;
  });

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.tag}>SESSION COMPLETE</div>
        <h1 style={S.h1}>Quick feedback</h1>
        <p style={S.body}>
          5 minutes of your honest reaction is worth more than 5 weeks of our guesswork.
          There are no right answers.
        </p>
        <div style={S.idBadge}>{profile.id}</div>

        {FEEDBACK_QUESTIONS.map(q => (
          <div key={q.id} style={{ marginBottom: 4 }}>
            <label style={S.label}>
              {q.label.toUpperCase()}{q.optional ? ' (optional)' : ''}
            </label>

            {q.type === 'text' && (
              <textarea style={S.textArea}
                placeholder="Type your answer…"
                value={fb[q.id]}
                onChange={e => setFb(f => ({ ...f, [q.id]: e.target.value }))} />
            )}

            {q.type === 'scale' && (
              <div style={S.scaleRow}>
                <span style={S.scaleLabel}>{q.low}</span>
                {[1,2,3,4,5].map(n => (
                  <button key={n} style={S.scaleBtn(fb[q.id] === n)}
                    onClick={() => setFb(f => ({ ...f, [q.id]: n }))}>
                    {n}
                  </button>
                ))}
                <span style={S.scaleLabel}>{q.high}</span>
              </div>
            )}

            {q.type === 'rating' && (
              <div style={S.scaleRow}>
                {Array.from({ length: q.max }, (_, i) => i + 1).map(n => (
                  <button key={n} style={S.scaleBtn(fb[q.id] === n)}
                    onClick={() => setFb(f => ({ ...f, [q.id]: n }))}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={S.divider} />
        <button style={{ ...S.btn, opacity: allAnswered ? 1 : 0.4 }}
          disabled={!allAnswered}
          onClick={() => onSubmit(fb)}>
          Submit Feedback →
        </button>
      </div>
    </div>
  );
}

function ScreenComplete({ profile, exportData, onCopyExport }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(exportData).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Fallback: select text
    });
    onCopyExport();
  }

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.tag}>TEST COMPLETE</div>
        <h1 style={S.h1}>Thank you, {profile.name.split(' ')[0]}.</h1>
        <p style={S.body}>
          Your session has been recorded. Please stop your screen recording now,
          then complete the two steps below.
        </p>

        <div style={S.idBadge}>{profile.id}</div>

        <div style={{ ...S.recordBox, marginBottom: 20 }}>
          <div style={S.recordTitle}>STEP 1 — STOP RECORDING</div>
          <p style={S.recordStep}>
            iPhone: Tap the red bar at the top → Stop Recording<br />
            Android: Tap the screen recorder notification → Stop<br />
            Save the video to your camera roll or share directly.
          </p>
        </div>

        <div style={{ ...S.recordBox, borderColor: '#2A3A2A', background: '#0A140A', marginBottom: 20 }}>
          <div style={{ ...S.recordTitle, color: '#60C880' }}>STEP 2 — SEND YOUR SESSION DATA</div>
          <p style={{ ...S.recordStep, color: '#336644', marginBottom: 12 }}>
            Copy the data below and paste it into the reply form or email it to your facilitator.
          </p>
          <div style={S.exportBox}>{exportData}</div>
          <button style={S.copyBtn} onClick={handleCopy}>
            {copied ? '✓ Copied to clipboard' : 'Copy Session Data'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
          Send your recording + session data to your facilitator.<br />
          Questions? Reply to the email you received with this invitation.
        </p>
      </div>
    </div>
  );
}

// ─── Main Gate ─────────────────────────────────────────────────────────────

export default function AlphaTesterGate({ children }) {
  const params = new URLSearchParams(window.location.search);

  // Tester ID: prefer URL param (facilitator-assigned), fall back to generated
  const [profile, setProfile] = useState(() => ({
    id: params.get('tid') || generateTesterId(),
    name: params.get('name') || '',
    email: params.get('email') || '',
    role: '',
    yearsExp: '',
    eventType: '',
    registeredAt: null,
  }));

  const [screen, setScreen] = useState('register');
  const [exportData, setExportData] = useState('');

  // Commit profile to observationKit once registration is complete
  const handleRegistered = useCallback(() => {
    const fullProfile = { ...profile, registeredAt: new Date().toISOString() };
    setProfile(fullProfile);
    // Will be called just before moving to consent — observationKit may not be
    // active yet; setTesterProfile is safe to call speculatively and will be
    // picked up when the session starts.
    setTesterProfile(fullProfile);
    setScreen('consent');
  }, [profile]);

  const handleBegin = useCallback(() => {
    // observationKit startObservation() is called by OrchestrationSlice itself
    // Re-attach profile after it initialises (it may clear session on begin)
    setTesterProfile({ ...profile, registeredAt: profile.registeredAt });
    setScreen('session');
  }, [profile]);

  const handleEndSession = useCallback(() => {
    setScreen('feedback');
  }, []);

  const handleFeedbackSubmit = useCallback((feedback) => {
    setSessionFeedback(feedback);
    const data = exportSession();
    setExportData(data);
    setScreen('complete');
  }, []);

  if (screen === 'register') {
    return <ScreenRegister profile={profile} setProfile={setProfile} onContinue={handleRegistered} />;
  }

  if (screen === 'consent') {
    return <ScreenConsent profile={profile} onBegin={handleBegin} />;
  }

  if (screen === 'feedback') {
    return <ScreenFeedback profile={profile} onSubmit={handleFeedbackSubmit} />;
  }

  if (screen === 'complete') {
    return <ScreenComplete profile={profile} exportData={exportData} onCopyExport={() => {}} />;
  }

  // screen === 'session' — render the actual slice with End Session button
  return (
    <>
      {children}
      <button
        style={S.endBtn}
        onClick={handleEndSession}
        title="End test session and submit feedback"
      >
        End Session
      </button>
    </>
  );
}
