// ─── A FUNERAL MEAL TOLD ITS BUDGET EXCLUDES PARTY FAVORS ─────────────────
//
// Shipped 2026-10-06 in 516f432b and found the same evening by the re-score
// board. That commit removed the `est.destinationAdjusted` gate on the budget
// ask's exclusions line — correctly, because a local event also has a cake and
// tips and was being told nothing. What it did not check is that the list it
// was now showing EVERY event is family-scoped, and the families are coarse.
//
// `budgetFamilyForType` folds Wedding, Sweet 16, Quinceañera, Vow Renewal and
// Fundraiser / Gala into one `full_service` bucket, so four events with no
// couple anywhere in them were told their budget excludes "Honeymoon or travel
// for the couple/host" and "Marriage license / permit fees".
//
// And `Repast` — the meal after a funeral — resolves to `host_driven`, whose
// list opens with "Gifts, favors, and thank-you cards". A host arranging food
// for the people who just buried someone was told their budget does not cover
// party favors.
//
// That last one is the reason this file exists. The others are wrong; that one
// is unkind, and it reached production.
//
// THE RULE: an exclusion is a claim about THIS event. A line that names a
// thing the event cannot have is not a disclosure, it is noise at best and an
// insult at worst — and the coarser the family map, the more of both.
import { notIncludedFor } from '../budgetEstimator';
import { ALL_PLAYBOOKS } from '../playbooks';

// Phrases that only make sense for a specific kind of event, and the types
// that may legitimately see them. Anything else naming them is a defect.
const ONLY_FOR = [
  { re: /honeymoon|marriage licen|the couple/i, ok: ['Wedding', 'Elopement', 'Vow Renewal'] },
  { re: /\bfavors?\b|\bgifts?\b/i, notFor: ['Repast'] },
];

describe('an exclusion must apply to the event it is shown on', () => {
  test('(premise) the sweep reaches the real corpus and real lists', () => {
    // Without this, an empty offender list could mean "nothing resolved".
    expect(ALL_PLAYBOOKS.length).toBeGreaterThan(40);
    expect(notIncludedFor('Wedding', {}).length).toBeGreaterThan(3);
    expect(notIncludedFor('Repast', {}).length).toBeGreaterThan(0);
  });

  test('NO COUPLE, NO HONEYMOON: only a wedding-shaped event hears wedding exclusions', () => {
    const offenders = [];
    for (const pb of ALL_PLAYBOOKS) {
      const rule = ONLY_FOR[0];
      if (rule.ok.includes(pb.type)) continue;
      for (const line of notIncludedFor(pb.type, {})) {
        if (rule.re.test(line)) offenders.push(`${pb.type} :: ${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('A REPAST IS NOT A PARTY: no favors, no gifts, on the meal after a funeral', () => {
    const lines = notIncludedFor('Repast', {});
    expect(lines.length).toBeGreaterThan(0);          // it still discloses something
    for (const line of lines) expect(line).not.toMatch(/\bfavors?\b|\bgifts?\b|\bparty\b/i);
  });

  test('…and the ordinary cases still get the lines they need', () => {
    // The guard must not be satisfied by emptying the lists.
    expect(notIncludedFor('Birthday', {}).join(' ')).toMatch(/cake/i);
    expect(notIncludedFor('Wedding', {}).join(' ')).toMatch(/marriage licen/i);
    expect(notIncludedFor('Birthday', { isDestination: true }).join(' ')).toMatch(/airfare/i);
  });
});
