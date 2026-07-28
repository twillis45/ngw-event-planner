// ─── Incident intelligence — when a HUMAN situation goes wrong at an event ───
//
// Host directive (2026-07-28): "if at a hosted event someone gets out of hand,
// gets sick on alcohol — how are we looking at the human issues that tend to
// arise?" Three-agent research fleet, run under the grounding doctrine
// (knowledge/groundingDoctrine.js): every claim below was page-verified on the
// date stamped, or is explicitly tiered below cited.
//
// THE HARD BOUNDARY (FTC precedent — MelApp/Mole Detective settlements 2015;
// FTC Mobile Health App guidance): this module is PROCEDURAL, never
// diagnostic. It tells a host where the kit is, who to call, and what the
// cited authority says — it NEVER assesses a guest's condition, classifies
// "is this an emergency?", or scores risk. Professional incident planning is
// procedural (named roles, documented locations, pre-decided words — Notre
// Dame EAP / Yale OEM / MPI, all cited below); that is the shape we follow.

import { venueFor } from '../venueFor';
import { isLikelyOutdoor } from '../weather';

// Every id referenced by a line below resolves here — the same {org, url,
// fetched, claim} shape as every other *_SOURCES registry, unioned into the
// admin Grounding-sources view via groundingSources.js.
export const INCIDENT_SOURCES = {
  'sfpd-911': {
    org: 'San Francisco Police Department — When to Call 9-1-1',
    url: 'https://www.sanfranciscopolice.org/get-service/when-call-9-1-1',
    fetched: '2026-07-28',
    claim: 'Call 911 when there is danger to life or property or a crime in progress — a fight happening now, a weapon, a medical emergency. Situations without immediate threat belong on the non-emergency line. (Corroborated: Portland, DC, Santa Clara.)',
  },
  'cpi-deescalation': {
    org: 'Crisis Prevention Institute — Top 10 De-escalation Tips',
    url: 'https://www.crisisprevention.com/blog/general/cpi-s-top-10-de-escalation-tips-revisited/',
    fetched: '2026-07-28',
    claim: 'Stay calm — your own response determines whether a situation escalates. Be empathic, respect personal space, ignore provocative challenges and redirect, set limits as simple respectful choices, allow silence and decision time. Never argue with a provocation.',
  },
  'rochester-5ds': {
    org: 'University of Rochester — Bystander Intervention (the 5 Ds)',
    url: 'https://www.rochester.edu/sexualmisconduct/resources/bystander-intervention/',
    fetched: '2026-07-28',
    claim: 'Direct, Distract, Delegate, Delay, Document — and always prioritize safety. Distraction (change the subject, create an interruption) and delegation (get someone better positioned, like a friend of the person) are lower-risk than direct confrontation.',
  },
  'aha-hands-only': {
    org: 'American Heart Association — Hands-Only CPR',
    url: 'https://cpr.heart.org/en/cpr-courses-and-kits/hands-only-cpr',
    fetched: '2026-07-28',
    claim: 'If a teen or adult suddenly collapses: two steps — call 911, then push hard and fast in the center of the chest. Recommended for bystanders including the untrained. Most out-of-hospital cardiac arrests (73.4%) happen in homes; immediate bystander CPR can double or triple survival (AHA CPR Facts & Stats).',
  },
  'stroke-fast': {
    org: 'American Stroke Association — Stroke Warning Signs',
    url: 'https://www.stroke.org/en/about-stroke/stroke-symptoms',
    fetched: '2026-07-28',
    claim: 'F.A.S.T.: Face drooping, Arm weakness, Speech difficulty — Time to call 911, even if the symptoms pass. Note when symptoms started.',
  },
  'nih-choking': {
    org: 'MedlinePlus (NIH) — Choking first aid',
    url: 'https://medlineplus.gov/ency/article/000047.htm',
    fetched: '2026-07-28',
    claim: 'A person who cannot speak, cough forcefully, or breathe needs help now — call 911 if the airway cannot be cleared. Oxygen loss causes brain damage in as little as 4–6 minutes. (Page review date 2026-02-17.)',
  },
  'nws-heat': {
    org: 'National Weather Service — Heat Illness',
    url: 'https://www.weather.gov/safety/heat-illness',
    fetched: '2026-07-28',
    claim: 'Heat exhaustion (heavy sweating; cool, pale, clammy skin; dizziness) → cooler place, cool wet cloths, sips of water. Heat STROKE (hot red skin, temp above 103°F, confusion, passing out) is a life-threatening emergency: call 911 and do not give fluids.',
  },
  'aha-arc-firstaid-kit': {
    org: 'AHA / American Red Cross — 2024 First Aid Guidelines, Table 2 (minimum kit contents)',
    url: 'https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines/tables-and-figures/major-concepts/minimum-contents-for-american-red-cross-first-aid-kit',
    fetched: '2026-07-28',
    claim: 'The joint AHA/Red Cross minimum first-aid kit: exam gloves, adhesive bandages + tape, antibiotic ointment, sterile pads, roller and triangular bandages, cold pack, scissors, tourniquet, eye/skin wash, guidebook — all latex-free.',
  },
  'yale-event-eap': {
    org: 'Yale Office of Emergency Management — Special Event Emergency Planning',
    url: 'https://emergency.yale.edu/be-prepared/special-event-emergency-planning',
    fetched: '2026-07-28',
    claim: 'Institutional event plans document the first-aid kit location, name primary and secondary assembly spots, brief helpers in advance on who talks to guests during an incident, and pre-identify guests who would need help evacuating.',
  },
  'nd-event-eap': {
    org: 'University of Notre Dame Police — Emergency Planning Checklist for Special Events',
    url: 'https://police.nd.edu/assets/566642/emergency_planning_checklist_2_.pdf',
    fetched: '2026-07-28',
    claim: 'Professional event plans name one on-site leader with a clear chain of command, document contact numbers, and pre-script the words to use in an emergency — decisions and language are made BEFORE the day, not during the incident.',
  },
  'ndpa-water-watcher': {
    org: 'National Drowning Prevention Alliance — Supervision / 5 Layers of Protection',
    url: 'https://ndpa.org/supervision/',
    fetched: '2026-07-28',
    claim: 'A Water Watcher is an adult who watches children in or around water with NO other activity — no phone — rotating roughly every 15 minutes. Toddlers and non-swimmers need an adult within arm’s reach. Drowning is the leading cause of death for ages 1–4. If a child goes missing at a gathering, check the water first.',
  },
  'wsusa-water-watcher': {
    org: 'Water Safety USA (Red Cross, CDC, AAP, USCG + 10 more) — Watch Your Kids',
    url: 'https://www.watersafetyusa.org/watch-your-kids.html',
    fetched: '2026-07-28',
    claim: 'The designated water watcher should be at least 16 (an adult preferred), know rescue and CPR, keep a working phone and rescue equipment nearby, and be SOBER and alert. Supervision is required even when a lifeguard is present.',
  },
  'palcb-signs': {
    org: 'Pennsylvania Liquor Control Board (RAMP) — Signs of Intoxication',
    url: 'https://www.pa.gov/agencies/lcb/alcohol-education-training/ramp/signs-of-intoxication',
    fetched: '2026-07-28',
    claim: 'A state alcohol regulator’s standard: visible intoxication is impairment evident upon common observation (no single sign determinative); once identified, service must stop immediately, and staff should do whatever they can to prevent the guest from driving — sober ride, transportation, or police.',
  },
  'madd-safe-party': {
    org: 'MADD — Safe Party Guide',
    url: 'https://madd.org/drunk-driving/safe-party-guide/',
    fetched: '2026-07-28',
    claim: 'Plan safe rides at RSVP time, keep food and non-alcoholic options out all night, never serve anyone under 21, and remember only time sobers a person up — an impaired guest gets the sofa or a ride, never their keys.',
  },
  'naic-event-insurance': {
    org: 'National Association of Insurance Commissioners — Event Insurance',
    url: 'https://content.naic.org/article/consumer-insight-event-insurance',
    fetched: '2026-07-28',
    claim: 'Event liability insurance covers injury or property damage to others at your event; host liquor liability is an add-on; some venues require a minimum amount of event liability insurance and to be named additional insured.',
  },
  'niaaa-overdose': {
    org: 'NIAAA (NIH) — Understanding the Dangers of Alcohol Overdose',
    url: 'https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-dangers-of-alcohol-overdose',
    fetched: '2026-07-28',
    claim: 'Critical signs of alcohol overdose: mental confusion or stupor; cannot be woken; vomiting; seizures; slow breathing (fewer than 8 breaths a minute) or 10+ second gaps; clammy skin; no gag reflex; bluish or pale skin. Call 911 immediately — do NOT wait for all symptoms; a person who has passed out can die. Never leave them alone; if vomiting lean them forward; if unconscious roll them onto one side, ear toward the ground. Cold showers, coffee, and walking do NOT reverse an overdose — "don\'t play doctor." (Fact sheet updated December 2025.)',
  },
  'mayo-alcohol-poisoning': {
    org: 'Mayo Clinic — Alcohol poisoning',
    url: 'https://www.mayoclinic.org/diseases-conditions/alcohol-poisoning/symptoms-causes/syc-20354386',
    fetched: '2026-07-28',
    claim: 'Never assume a person will sleep off alcohol poisoning. Call 911 right away, do not leave an unconscious person alone, and do not try to make them vomit. (Verified via archived copy of the live page, 2026-07-10.)',
  },
  'niaaa-host-tips': {
    org: 'NIAAA (NIH) — Director’s blog: hosting a party (2022-12-12)',
    url: 'https://www.niaaa.nih.gov/about-niaaa/directors-page/niaaa-directors-blog/holiday-party-here-are-tips-hosting-party-including-guests-who-may-not-be-drinking',
    fetched: '2026-07-28',
    claim: 'Host practices from NIAAA: keep a real variety of alcohol-free drinks, put more emphasis on food than drinks, clearly flag anything spiked, skip games centered on alcohol, and never call attention to guests who are not drinking.',
  },
  'nhtsa-drunk-driving': {
    org: 'NHTSA — Drunk Driving (host guidance + 2024 data)',
    url: 'https://www.nhtsa.gov/risky-driving/drunk-driving',
    fetched: '2026-07-28',
    claim: '"If you’re hosting a party where alcohol will be served, make sure all guests leave with a sober driver." If someone has been drinking, take their keys and help arrange a sober ride. 11,904 people died in alcohol-impaired crashes in 2024 — one every 44 minutes. NHTSA also notes failure to recognize impairment is itself a symptom of impairment — so nobody, host included, should judge "okay to drive." (Verified via archived copy, 2026-07-26.)',
  },
  'iii-social-host-checklist': {
    org: 'Insurance Information Institute — Social host liability (host checklist)',
    url: 'https://www.iii.org/article/social-host-liability',
    fetched: '2026-07-28',
    claim: 'The insurance industry’s host risk-reduction checklist: know your state’s law; consider a licensed venue; hire a professional bartender; encourage designated drivers; limit your own drinking; keep food and non-alcoholic drinks out; never pressure guests to drink; cease alcohol service toward the evening’s end; arrange rides for impaired guests. Homeowners policies typically carry only $100,000–$300,000 of liquor liability.',
  },
  'ncsl-underage-hosting': {
    org: 'NCSL — Social Host Liability for Underage Drinking (page dated 2014 — pattern only, never counts)',
    url: 'https://www.ncsl.org/financial-services/social-host-liability-for-underage-drinking-statutes',
    fetched: '2026-07-28',
    claim: 'Most states treat hosting minors who drink far more strictly than serving adults — many impose civil liability and criminal penalties on adults who host or permit underage drinking. The page’s state counts are from 2014; ship the pattern, not the numbers.',
  },
  'msu-family-gatherings': {
    org: 'Michigan State University Extension — Family gatherings',
    url: 'https://www.canr.msu.edu/news/you_do_not_have_to_dread_family_gatherings',
    fetched: '2026-07-28',
    claim: 'Extension guidance for tense family gatherings: expect people not to change and manage your own response; create physical distance instead of engaging; deliberately ignore baiting remarks; watch the alcohol; take walks when tension builds.',
  },
};

// ── The day-of "if something goes wrong" plan — PROCEDURAL lines only ─────────
// Pure, event-aware composition: every line quotes what a cited authority says
// and points at real event data (the venue address for 911, the first-aid row
// the playbook already carries). Conditional lines gate on REAL fields — never
// an inferred guess about the crowd. Returns { lines, boundary } where every
// line = { key, label, text, sources: [ids in INCIDENT_SOURCES] }.
export function incidentPlanFor(event) {
  const ev = event || {};
  const vfv = venueFor(ev);
  const outdoors = (() => { try { return isLikelyOutdoor(vfv.name, ev.notes || ''); } catch { return false; } })();
  const waterish = /pool|lake|beach|river|waterfront|marina|pond/i.test([vfv.name, String(ev.notes || ''), String(ev.type || '')].join(' '));
  const kidsAround = ev.kidsPolicy !== 'adults_only';
  const addr = vfv.address || vfv.displayLine || '';

  const lines = [];
  lines.push({
    key: 'call',
    label: 'When it’s a 911 call',
    text: `Active danger — a fight happening now, a weapon, someone collapsing — is a 911 call, not a judgment call.${addr ? ` The words you’d need: “${addr}.”` : ' Know the address words you’d say before the day.'}`,
    sources: ['sfpd-911', 'nd-event-eap'],
  });
  lines.push({
    key: 'collapse',
    label: 'If someone collapses',
    text: 'Call 911, then hands-only CPR: push hard and fast in the center of the chest — the AHA’s two steps, made for untrained bystanders. Most cardiac arrests happen in homes.',
    sources: ['aha-hands-only'],
  });
  lines.push({
    key: 'outofhand',
    label: 'If someone gets out of hand',
    text: 'Stay calm — your response sets the temperature. Don’t argue with provocations; give space; offer simple choices. Lower-risk than confronting: distract, or bring in their own friend. If it turns violent, that’s the 911 line above.',
    sources: ['cpi-deescalation', 'rochester-5ds'],
  });
  lines.push({
    key: 'kit',
    label: 'The kit',
    text: 'Know where the first-aid kit is before guests arrive — professional event plans write its location down. The AHA/Red Cross minimum kit list is the standard.',
    sources: ['yale-event-eap', 'aha-arc-firstaid-kit'],
  });
  if (outdoors) {
    lines.push({
      key: 'heat',
      label: 'Heat',
      text: 'Heavy sweating and clammy skin → cooler spot, wet cloths, sips of water. Hot red skin, confusion, or passing out is heat stroke: 911, and no fluids.',
      sources: ['nws-heat'],
    });
  }
  if (waterish && kidsAround) {
    lines.push({
      key: 'water',
      label: 'Water watcher',
      text: 'Name one sober adult as the water watcher — phone away, rotating every 15 minutes; little ones stay within arm’s reach. If a child goes missing, check the water first.',
      sources: ['ndpa-water-watcher', 'wsusa-water-watcher'],
    });
  }
  lines.push({
    key: 'sick',
    label: 'If someone is sick on alcohol',
    text: 'Confusion, can’t be woken, vomiting, seizures, slow or gapped breathing, clammy or bluish skin — call 911; NIAAA says do NOT wait for every sign, and never assume they’ll sleep it off. Don’t leave them alone; vomiting → lean them forward; unconscious → on their side, ear toward the ground. Coffee, cold showers, and walking don’t reverse it.',
    sources: ['niaaa-overdose', 'mayo-alcohol-poisoning'],
  });
  lines.push({
    key: 'keys',
    label: 'Keys',
    text: 'NHTSA’s host rule, verbatim: make sure all guests leave with a sober driver — if someone has been drinking, take their keys and arrange the ride. Only time sobers a person up: the sofa or a ride, never the wheel. Nobody — host included — can reliably judge “okay to drive.”',
    sources: ['nhtsa-drunk-driving', 'madd-safe-party', 'palcb-signs'],
  });

  return {
    lines,
    // The duty boundary, stated to the host in the surface's own grounding line.
    boundary: 'Pointers to the cited authorities — not medical or legal advice.',
  };
}
