// EventDaySlice — Sprint 19 slice harness entry point.
//
// Renders EventDayMode with a synthetic event so the surface can be
// reviewed, screenshotted, and tested without auth.
//   http://localhost:3000/?slice=event-day
//   http://localhost:3000/?slice=event-day&state=escalated
//   http://localhost:3000/?slice=event-day&state=critical
//   http://localhost:3000/?slice=event-day&state=emergency
//   http://localhost:3000/?slice=event-day&state=recovery
//
// The ?state param pre-sets the demo driver so reviewers can jump
// directly to any severity tier without clicking through the test harness.

import EventDayMode from '../components/EventDayMode';

const SYNTH_EVENT = {
  id:       'synth-hartwell-2026',
  name:     'Hartwell Wedding',
  date:     'Sat · 14:00 · Bluebell Manor',
  location: 'Bluebell Manor, Westshire',
  vendors: [
    { id: 'v1', name: 'Catering',   category: 'CAT', status: 'no_contact' },
    { id: 'v2', name: 'Floral Co.', category: 'FLO', status: 'nominal' },
    { id: 'v3', name: 'Sound & AV', category: 'AV',  status: 'nominal' },
  ],
};

export default function EventDaySlice() {
  return (
    <EventDayMode
      event={SYNTH_EVENT}
      onExit={() => { window.location.search = ''; }}
    />
  );
}
