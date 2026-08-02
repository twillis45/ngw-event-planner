// ─── Food-safety provenance — the verification pass the playbooks promised ───
//
// backyardBbq's own governance note said it plainly: food-safety guidance
// "reflects widely-published USDA-style practice … labeled synthesized until a
// foreground verification pass attaches citations." This is that pass
// (2026-07-28): every claim the playbooks ship was verified against the
// PRIMARY agency text — fsis.usda.gov / fda.gov block automated fetch (403),
// so each page was read in full via a dated June–July 2026 archive copy of the
// canonical URL; the URLs below are the live .gov pages.
//
// Same registry shape as every *_SOURCES; unioned into the admin Grounding
// view via groundingSources.js.

export const FOOD_SAFETY_SOURCES = {
  'fsis-danger-zone': {
    org: 'USDA FSIS — "Danger Zone" (40°F–140°F)',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Bacteria grow most rapidly between 40°F and 140°F, doubling in as little as 20 minutes. Never leave food out of refrigeration over 2 hours — 1 hour when above 90°F. Keep hot food at or above 140°F (chafing dishes, warming trays, slow cookers); keep cold food at or below 40°F on ice. Reheat thoroughly to 165°F.',
  },
  'fsis-temp-chart': {
    org: 'USDA FSIS — Safe Minimum Internal Temperature Chart (updated 2025-04-14)',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Poultry (incl. ground) 165°F · ground meats 160°F · beef/pork/veal/lamb steaks, chops, roasts 145°F + 3-minute rest · fish & shellfish 145°F · leftovers and casseroles 165°F · eggs 160°F — measured with a food thermometer.',
  },
  'fsis-grilling': {
    org: 'USDA FSIS — Grilling and Food Safety',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/grilling-and-food-safety',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Never use the same platter and utensils for raw and cooked meat or poultry. Cooler doctrine: pack from the refrigerator with enough ice to hold 40°F, shade the cooler, limit openings, raw meat sealed at the bottom; if poultry juice leaks onto another meat, cook that meat to 165°F.',
  },
  'fda-outdoors': {
    org: 'FDA — Handling Food Safely While Eating Outdoors',
    url: 'https://www.fda.gov/food/buy-store-serve-safe-food/handling-food-safely-while-eating-outdoors',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Served cold perishables get 2 hours out — 1 hour above 90°F — then discard. Separate drink and food coolers (drink-cooler openings warm the perishables). Marinate in the refrigerator; never reuse marinade that touched raw meat unless a portion was reserved first.',
  },
  'fsis-leftovers': {
    org: 'USDA FSIS — Leftovers and Food Safety',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Buffets: hot food in chafing dishes/slow cookers/warming trays; cold dishes nested in ice, or small trays replaced often. Refrigerate leftovers within 2 hours; divide big pots into shallow containers to cool fast; reheat to 165°F.',
  },
  'fsis-cooking-groups': {
    org: 'USDA FSIS — Cooking for Groups (the potluck/community-meal guide)',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/cooking-groups',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'USDA’s dedicated guide for volunteers cooking for family reunions, church dinners, and community gatherings — including dishes prepared at home and brought to the event ("7 Food Safety Steps for Successful Community Meals"). The canonical potluck citation.',
  },
  'fsis-big9': {
    org: 'USDA FSIS — Food Allergies: The "Big 9"',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-allergies-big-9',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Nine major allergens: milk, eggs, fish, Crustacean shellfish, tree nuts, peanuts, wheat, soybeans, sesame (FASTER Act, effective 2023). Cross-contact = a trace of an allergenic food incorporated into another food not intended to contain it — shared equipment and shared tables are the vector; labeling law does not cover it. (FDA’s allergen page corroborates, verified via 2025-09 archive.)',
  },
  'cdc-four-steps': {
    org: 'CDC — Four Steps to Food Safety',
    url: 'https://www.cdc.gov/food-safety/prevention/index.html',
    fetched: '2026-07-28',
    sourceClass: 'government',   // federal agency - no stake in the answer (5F.9)
    claim: 'Clean (hands 20 seconds with soap, before/during/after handling food; surfaces often) · Separate · Cook · Chill — the four-step frame both CDC and USDA publish.',
  },
};
