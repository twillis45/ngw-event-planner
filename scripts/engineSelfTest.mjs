// CLI self-test for the Event Intelligence Engine (run: node scripts/engineSelfTest.mjs).
// Proves the SAME solver runs both families + the real-state app-event mapping.
// Moved out of eventSolve.mjs so the engine carries no node-only code into the bundle.
import { GRAPHS, solve, enginePreview } from '../src/lib/eventSolve.mjs';

const date = s => new Date(s + 'T00:00:00Z');
const show = (label, r) => {
  console.log(`\n${label} (${r.daysOut}d out)  Readiness ${r.readiness}%  ${r.flag}`);
  if (r.binding) console.log(`  BINDING → ${r.binding.name}  [${r.delivery}]`);
  console.log(r.dateAtRisk ? `  ⚠ DATE-AT-RISK: ${r.criticalChain.join(' → ')}` : '  on schedule');
};

const WED_DONE = new Set(['date_budget','venue','guestlist_draft','deposits','photographer','caterer','officiant','band_dj','florist','attire_order','save_the_dates','cake','hmua','rentals','tasting','transport','invitations_design','guestlist_final','invitations_sent']);
show('WEDDING · Maria & James', solve(GRAPHS.wedding, date('2026-07-07'), WED_DONE, date('2026-06-13')));
const CORP_DONE = new Set(['objective_signoff','budget_approval','venue_date','speakers_confirm','av_production','agenda_ros_v1','catering','registration_live','invites_open_reg','swag']);
show('CORPORATE · User Conference', solve(GRAPHS.corporate, date('2026-07-13'), CORP_DONE, date('2026-06-13')));

const asOf = date('2026-06-13');
const showP = (label, ev) => { const r = enginePreview(ev, asOf); r ? show(label, r) : console.log(`\n${label} → no preview`); };
showP('PREVIEW · Todd & Sarah (mapped state)', {
  date: '2026-09-12', type: 'Wedding', venue: 'Bluebell Venue', budget: 18900, guests: new Array(120), ros: [],
  vendors: [{ category: 'Venue', status: 'Confirmed', depositPaid: true, coiStatus: 'on file' },
            { category: 'Florals', status: 'Confirmed', depositPaid: true },
            { category: 'Photography', status: 'Booked' }, { category: 'Catering', status: 'Confirmed' }],
});
showP('PREVIEW · Maria & James (mapped state)', {
  date: '2026-07-07', type: 'Wedding', venue: 'Riverside Estate', budget: 32000, guests: new Array(140), ros: [],
  vendors: [{ category: 'Venue', status: 'Confirmed' }, { category: 'Florals', status: 'Booked' }],
});
showP('PREVIEW · Q3 User Conference (corporate, decks slipping)', {
  date: '2026-07-20', type: 'Conference', venue: 'Hilton Downtown', budget: 240000, budgetApproved: true,
  sponsorSignoff: true, objective: 'Drive 200 qualified leads',
  attendees: new Array(180), agenda: true, registration: { live: true, open: true },
  speakers: [{ name: 'VP Eng', status: 'Confirmed', deckReceived: false },
             { name: 'CEO', status: 'Confirmed', deckReceived: false }],
  vendors: [{ category: 'Venue', status: 'Confirmed' }, { category: 'AV / Tech', status: 'Booked' },
            { category: 'Catering', status: 'Confirmed' }],
});
showP('PREVIEW · Board Offsite (corporate, early, budget unapproved)', {
  date: '2026-11-15', type: 'Board Meeting', venue: '', budget: 60000, budgetApproved: false,
  attendees: new Array(14), speakers: [], vendors: [],
});
