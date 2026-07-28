// ─── Fire & burn safety provenance (failure-modes wave 2, 2026-07-28) ────────
// NFPA/USFA/CPSC HTML blocks automated fetch; every entry below was verified
// from the AGENCY'S OWN PDF (downloaded + text-extracted) or its official
// release text via a fetched authoritative carrier — noted per entry. Two
// doctrine refusals ride with the registry: there is NO agency numeric
// grill-distance (say "well away"; USFA's flat rule is never on a porch or
// balcony), and BAKING SODA is not in any agency's grease-fire doctrine — the
// taught response is lid + burner off, never water.

export const FIRE_SAFETY_SOURCES = {
  'nfpa-grilling-tips': {
    org: 'NFPA — Grilling Safety Tips (agency PDF)',
    url: 'https://content.nfpa.org/-/media/project/storefront/catalog/files/safety-tip-sheets/grillingsafetytips.pdf',
    fetched: '2026-07-28',
    claim: 'Grills are outdoor-only: well away from the home, deck railings, eaves and branches; a 3-foot kid-and-pet zone; never unattended; gas lid open before lighting; clean grease buildup (an uncleaned grill is the leading factor in grill fires). July is the peak grill-fire month; about half of grill injuries are thermal burns. Propane: yearly soapy-water leak check; if the flame goes out, turn everything off and wait 5 minutes before relighting.',
  },
  'usfa-outdoor-fires': {
    org: 'US Fire Administration (FEMA) — Outdoor Fire Safety',
    url: 'https://www.usfa.fema.gov/prevention/outdoor-fires/',
    fetched: '2026-07-28',
    claim: 'Never store or use a grill on a porch or balcony. Cooled coals go in a lidded metal can. Fire pits and outdoor fireplaces at least 10 feet from anything that can burn; metal spark screen over wood fires; put fires fully out before leaving the yard.',
  },
  'usfa-turkey-fryer': {
    org: 'USFA — Turkey Fryer Fire Safety (agency PDF; transfers to fish-fry rigs)',
    url: 'https://www.usfa.fema.gov/downloads/pdf/publications/turkey-fryer-fire-safety-infographic.pdf',
    fetched: '2026-07-28',
    claim: 'Oil fryers: sturdy level surface at least 10 feet from the home, never under eaves; size the oil with a WATER test before frying; attach a thermometer (no thermostat means oil can overheat to ignition); food fully thawed — ice meets oil violently; 3-foot zone. NFPA goes further and discourages outdoor oil fryers outright.',
  },
  'nfpa-cooking-tips': {
    org: 'NFPA — Cooking Safety (agency PDF)',
    url: 'https://content.nfpa.org/-/media/project/storefront/catalog/files/safety-tip-sheets/cookingsafetytips.pdf',
    fetched: '2026-07-28',
    claim: 'Grease fire: slide a lid over the pan and turn off the burner — leave it covered until fully cool. Oven fire: heat off, door closed. Any doubt about fighting a small fire: get out, close the door behind you, call 911 from outside. Never water on a grease fire (state fire marshals state it verbatim).',
  },
  'perc-cylinders': {
    org: 'Propane Education & Research Council — small-cylinder safety (PERC brochure)',
    url: 'https://www.ferrellgas.com/getmedia/3cfd9bca-c1cf-4a8f-bc8d-28ea97aa7ba1/small_cylinder_safety.pdf',
    fetched: '2026-07-28',
    claim: 'Cylinders ride upright and secured, never in a closed trunk or hot vehicle, straight to the destination. Never store a cylinder indoors, in a garage, shed or tent, near heat above 120°F — and never a spare under or beside the grill.',
  },
  'cpsc-charcoal-co': {
    org: 'CPSC — Charcoal Grill Safety (publication 465, agency PDF)',
    url: 'https://www.cpsc.gov/s3fs-public/465CharcoalGrillSafetyTipsWEB_0.pdf',
    fetched: '2026-07-28',
    claim: 'The bag warning, verbatim: burning charcoal inside can kill you — carbon monoxide has no odor. NEVER burn charcoal in homes, vehicles, tents, or garages; a still-warm grill never goes into a camper.',
  },
  'cpsc-fireworks-2025': {
    org: 'CPSC — fireworks safety release (June 2026, official release text)',
    url: 'https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Shares-Fireworks-Safety-Tips-as-America-Turns-250',
    fetched: '2026-07-28',
    claim: '2025: about 13,000 ER-treated fireworks injuries, ~1,300 from sparklers alone — sparklers burn near 2,000°F. One device at a time, never lean over it, never relight duds (wait 20 minutes, then soak), water bucket or hose ready, never while impaired. A professional display is the safe option.',
  },
  'usfa-extinguishers': {
    org: 'USFA — Choosing and Using Fire Extinguishers',
    url: 'https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/fire-extinguishers/',
    fetched: '2026-07-28',
    claim: 'ABC multipurpose is the home default; Class K covers cooking oils and fats (fryer rigs). PASS: pull, aim low, squeeze, sweep — and only fight a fire that is small and contained, with the fire department already called and a clear way out.',
  },
  'nih-burns': {
    org: 'NIH MedlinePlus — Burns (medical encyclopedia)',
    url: 'https://medlineplus.gov/ency/article/000030.htm',
    fetched: '2026-07-28',
    claim: 'Cool a minor burn under cool running water (not ice water) for 5–30 minutes; never butter, oil, ice, or creams; don’t break blisters; cover with a clean dry dressing. 911 when the burn is palm-size or larger, on hands, feet, face or groin, chemical or electrical, or with shock or smoke inhalation.',
  },
  'nfpa-candles-ilsfm': {
    org: 'NFPA candle statistics (via Illinois State Fire Marshal)',
    url: 'https://sfm.illinois.gov/currentfocus/candle-safety.html',
    fetched: '2026-07-28',
    claim: 'An average of 20 home candle fires are reported per day; 60% start when something burnable is left too close. Keep candles at least a foot from anything that can burn and out before you leave the room; December–January peak.',
  },
};
