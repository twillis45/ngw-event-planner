// ─── Proposed vendor categories by event type ──────────────────────────────
// Market-research-grounded vendor rosters for the whole event list (researched
// June 2026). Order = booking priority. Lists fold in CURRENT on-trend categories
// surfaced by the research — content creators (48-hr social reels), mobile bars,
// 360 / roaming photo booths, live streaming / hybrid, fundraising-tech / auctioneers,
// grazing tables, organic balloon installs, brand activations, event apps.
//
// Sources (2026 trend research): The Knot & Everything DJs (wedding trends);
// Enloe/RMD/ClearChoice (360 & roaming photo booths); HYB Luxury (wedding content
// creators); SSAV/AVFX/AV Partners (corporate AV, LED, hybrid/live streaming);
// OneCause/RallyUp/Zeffy (gala auctioneer + fundraising platform); Eventifai/Camila's
// Decor (quinceañera/sweet-16 vendor checklists incl. choreographer & MC); Pike & West
// / Green Wedding Shoes (shower grazing tables + organic balloon decor); GPJ/Jack
// Morton/EMRG (corporate experiential / brand activation).
//
// This is the single source for proposed vendors; the intake reads it, and the
// create-event modal can adopt it later. Anything not curated here falls back to
// the type-aware budget-share buckets so every type still gets a sensible list.

import { getCategoryShares } from './budgetEstimator';

// Budget-share keys → vendor-bookable labels (fallback path only).
const SHARE_LABELS = {
  venue: 'Venue', catering: 'Catering', photo_video: 'Photography / Video',
  florist_decor: 'Florals / Decor', dj_entertainment: 'Music / DJ', av_production: 'AV / Tech',
  rentals: 'Rentals', hair_makeup: 'Hair & Makeup', transportation: 'Transportation', staffing: 'Staffing',
};

// Curated rosters. Keyed by the app's canonical EVT_TYPES names; intake/modal
// variants are normalized via ALIASES below.
// Every label below is a member of the master CATEGORY_GROUPS taxonomy in App.js,
// so seeded categories match the add-vendor picker, the vendor bank, and playbooks.
export const CURATED_VENDORS = {
  // ── Weddings & Celebrations ──────────────────────────────────────────────
  'Wedding':          ['Venue', 'Catering', 'Photography', 'Videography', 'Content Creator', 'Florals', 'DJ', 'Hair & Makeup', 'Officiant', 'Cake', 'Mobile Bar', '360 Booth', 'Rentals', 'Transport'],
  'Engagement Party': ['Venue', 'Catering', 'Mobile Bar', 'Photography', 'Content Creator', 'Florals', 'DJ', 'Cake', '360 Booth', 'Rentals'],
  'Vow Renewal':      ['Venue', 'Catering', 'Photography', 'Videography', 'Officiant', 'Florals', 'DJ', 'Hair & Makeup', 'Cake', 'Mobile Bar', 'Rentals'],
  'Anniversary':      ['Venue', 'Catering', 'Photography', 'Florals', 'DJ', 'Mobile Bar', 'Cake', 'Photo Booth', 'Rentals'],
  'Bridal Shower':    ['Venue', 'Catering', 'Grazing Table', 'Cake', 'Mobile Bar', 'Florals', 'Balloon Décor', 'Photography', 'Activities', 'Favors', 'Rentals'],
  'Baby Shower':      ['Venue', 'Catering', 'Mobile Bar', 'Grazing Table', 'Cake', 'Balloon Décor', 'Florals', 'Photography', 'Activities', 'Favors', 'Rentals'],
  'Birthday':         ['Venue', 'Catering', 'Cake', 'DJ', 'Balloon Décor', '360 Booth', 'Photography', 'Mobile Bar', 'Activities', 'Rentals'],
  'Sweet 16':         ['Venue', 'Catering', 'DJ', 'Photography', 'Videography', '360 Booth', 'Balloon Décor', 'Cake', 'Hair & Makeup', 'MC / Host', 'Rentals'],
  'Quinceañera':      ['Venue', 'Catering', 'Mobile Bar', 'DJ', 'Photography', 'Videography', 'Florals', 'Cake', 'Hair & Makeup', 'Choreographer', '360 Booth', 'MC / Host', 'Transport', 'Rentals'],
  'Graduation':       ['Venue', 'Catering', 'Cake', 'Balloon Décor', 'Photography', 'DJ', 'Photo Booth', 'Mobile Bar', 'Rentals'],
  'Retirement Party': ['Venue', 'Catering', 'Photography', 'DJ', 'Florals', 'Cake', 'Mobile Bar', 'AV / Tech', 'Rentals'],
  'Reunion':          ['Venue', 'Catering', 'DJ', 'Photography', 'Photo Booth', 'Mobile Bar', 'AV / Tech', 'Activities', 'Rentals'],

  // ── Corporate ────────────────────────────────────────────────────────────
  'Holiday Party':     ['Venue', 'Catering', 'Mobile Bar', 'DJ', 'Decor', '360 Booth', 'Photography', 'AV / Tech', 'Brand Activation', 'Rentals'],
  'Board Meeting':     ['Venue', 'Catering', 'AV / Tech', 'Live Streaming / Hybrid', 'Printing / Signage', 'Transport'],
  'Conference':        ['Venue', 'Catering', 'Mobile Bar', 'AV / Tech', 'Live Streaming / Hybrid', 'Registration / Badging', 'Speakers / Talent', 'Sponsor / Exhibitor', 'Printing / Signage', 'Photography', 'Event App', 'Staffing'],
  'Product Launch':    ['Venue', 'Catering', 'Mobile Bar', 'AV / Tech', 'Brand Activation', 'Live Streaming / Hybrid', 'Photography', 'Content Creator', 'Decor', 'Entertainment', 'Staffing'],
  'Team Retreat':      ['Venue', 'Catering', 'Mobile Bar', 'Facilitator / Trainer', 'Activities', 'Lodging / Concierge', 'Transport', 'AV / Tech', 'Printing / Signage'],
  'Town Hall':         ['Venue', 'Catering', 'AV / Tech', 'Live Streaming / Hybrid', 'Photography', 'Printing / Signage', 'Staffing'],
  'Training / Workshop': ['Venue', 'Catering', 'AV / Tech', 'Facilitator / Trainer', 'Printing / Signage', 'Live Streaming / Hybrid', 'Rentals'],
  'Award Ceremony':    ['Venue', 'Catering', 'Mobile Bar', 'AV / Tech', 'MC / Host', 'Photography', 'Live Streaming / Hybrid', 'Florals', 'Lighting', 'Awards / Engraving', 'Staffing'],
  'Client Dinner':     ['Venue', 'Catering', 'Mobile Bar', 'Florals', 'Photography', 'Entertainment', 'Transport'],

  // ── Social & Fundraising ─────────────────────────────────────────────────
  'Fundraiser / Gala': ['Venue', 'Catering', 'Mobile Bar', 'AV / Tech', 'Band / Live Music', 'Auctioneer', 'Fundraising Platform', 'Photography', 'Florals', 'Lighting', 'Live Streaming / Hybrid', 'Staffing', 'Printing / Signage'],
  'Networking Event':  ['Venue', 'Catering', 'Mobile Bar', 'AV / Tech', 'Registration / Badging', 'Entertainment', 'Photography', 'Printing / Signage', 'Event App'],
  'Wellness Retreat':  ['Venue', 'Lodging / Concierge', 'Catering', 'Facilitator / Trainer', 'Activities', 'Transport', 'Photography', 'Printing / Signage'],

  // ── On-trend ceremonies & milestones ─────────────────────────────────────
  'Elopement':         ['Venue', 'Officiant', 'Photography', 'Videography', 'Florals', 'Hair & Makeup', 'Lodging / Concierge', 'Transport', 'Cake'],
  'Surprise Proposal': ['Photography', 'Videography', 'Florals', 'Lighting', 'Decor', 'Venue', 'Entertainment'],
  'Gender Reveal':     ['Venue', 'Catering', 'Cake', 'Balloon Décor', 'Photography', 'Photo Booth', 'Florals', 'Activities', 'Favors', 'Rentals'],
  'Bachelorette Party':['Lodging / Concierge', 'Transport', 'Activities', 'Catering', 'Mobile Bar', 'Photography', 'Decor', 'Favors', 'Hair & Makeup'],
  'Bachelor Party':    ['Lodging / Concierge', 'Transport', 'Activities', 'Catering', 'Mobile Bar', 'Photography', 'Entertainment'],

  // ── At-Home Gatherings (light, DIY-friendly rosters) ─────────────────────
  'Dinner Party':      ['Catering', 'Mobile Bar', 'Florals', 'Rentals', 'DJ', 'Photography'],
  'Housewarming':      ['Catering', 'Mobile Bar', 'Florals', 'Decor', 'Rentals', 'Photography', 'Balloon Décor'],
  'Get-Together':      ['Catering', 'Mobile Bar', 'Rentals', 'Activities', 'DJ'],

  'Other':             ['Venue', 'Catering', 'Bar / Beverage', 'Photography', 'Entertainment', 'Decor', 'Rentals', 'AV / Tech'],
};

// Normalize intake/public-form + modal type vocabularies to a curated key.
const ALIASES = {
  'Corporate Event': 'Conference',          // intake's general corporate ≈ conference roster
  'Corporate': 'Conference',
  'Conference / Summit': 'Conference',
  'Gala / Fundraiser': 'Fundraiser / Gala',
  'Birthday Party': 'Birthday',
  'Graduation Party': 'Graduation',
};

/**
 * The proposed vendor categories for an event type.
 * Returns the curated, on-trend roster when available; otherwise derives a
 * sensible list from the type-aware budget-share buckets so nothing is empty.
 */
export function proposedVendorCategories(eventType) {
  if (CURATED_VENDORS[eventType]) return CURATED_VENDORS[eventType];
  const aliased = ALIASES[eventType];
  if (aliased && CURATED_VENDORS[aliased]) return CURATED_VENDORS[aliased];
  return Object.keys(getCategoryShares(eventType)).map(k => SHARE_LABELS[k]).filter(Boolean);
}
