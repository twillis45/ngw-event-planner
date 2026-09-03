// ─── EVERY DIET STRING A HOST CAN PICK MUST RESOLVE ─────────────────────────
//
// A tech-debt pass found the diet vocabulary defined in five places, already
// disagreeing, with the SHIPPING picker offering two Big-9 allergens the
// matcher did not understand:
//
//   host ticks "Egg allergy" on Deviled eggs  ->  []          (nothing flagged)
//   guest types "egg allergy" as free text    ->  ["egg"]     (flagged)
//
// because rosterDiets normalizes prose to the canonical keys and the picker
// never did. The control built for the job was the one path that did not work,
// and it was invisible to all nine green gates because each of the five
// vocabularies is internally consistent — nothing compared them.
//
// This test is the comparison. It ENUMERATES the vocabularies rather than
// naming them: a gate that names files is how the fifth copy survives, and
// there were five.
import fs from 'fs';
import path from 'path';
import { DIET_KEYWORD_KEYS, DIET_TAGS_WITHOUT_KEYWORDS, itemDietaryFlags } from '../playbooks/index';

const ROOT = path.join(__dirname, '..', '..', '..');
const KNOWN = new Set([...DIET_KEYWORD_KEYS, ...DIET_TAGS_WITHOUT_KEYWORDS]);

// Walk the tree for anything shaped like a host-facing diet vocabulary.
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
};

const vocabularies = () => {
  const found = [];
  for (const file of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'hostv2', 'src'))]) {
    const src = fs.readFileSync(file, 'utf8');
    // Any array literal assigned to a DIET_TAGS-ish name, in any file.
    for (const m of src.matchAll(/(?:DIET_TAGS|DIETARY_TAGS|DIET_OPTIONS)\s*=\s*\[([^\]]*)\]/g)) {
      const line = src.slice(0, m.index).split('\n').length;
      for (const s of m[1].matchAll(/'([^']+)'/g)) {
        found.push({ tag: s[1], where: `${path.relative(ROOT, file)}:${line}` });
      }
    }
  }
  return found;
};

describe('the diet vocabulary is one vocabulary', () => {
  test('the sweep finds the vocabularies at all — the probe is real', () => {
    const v = vocabularies();
    expect(v.length).toBeGreaterThan(10);
    // More than one file defines one; that IS the debt, recorded not hidden.
    expect(new Set(v.map((x) => x.where.split(':')[0])).size).toBeGreaterThan(1);
  });

  test('EVERY offered string resolves, or is declared unmappable', () => {
    const orphans = vocabularies().filter((v) => !KNOWN.has(v.tag));
    expect(orphans.map((o) => `${o.tag} (${o.where})`)).toEqual([]);
  });

  test('and the two that were silently dead now actually flag', () => {
    // The regression itself, asserted on behaviour rather than on the map.
    expect(itemDietaryFlags('Deviled eggs', ['Egg allergy'])).toEqual(['egg']);
    expect(itemDietaryFlags('Soy sauce glaze', ['Soy allergy'])).toEqual(['soy']);
  });

  test('an alias and its canonical key agree', () => {
    // If they ever diverge, one path flags and the other does not — which is
    // the defect wearing a different hat.
    for (const [alias, canon] of [['Egg allergy', 'Egg'], ['Soy allergy', 'Soy'],
      ['Shellfish allergy', 'Shellfish'], ['No alcohol', 'Alcohol-free']]) {
      for (const item of ['Deviled eggs', 'Soy sauce glaze', 'Shrimp cocktail', 'Champagne toast']) {
        expect(itemDietaryFlags(item, [alias])).toEqual(itemDietaryFlags(item, [canon]));
      }
    }
  });

  test('a declared-unmappable tag really has no keyword map', () => {
    // Otherwise the exemption list becomes a place to hide a real gap.
    for (const tag of DIET_TAGS_WITHOUT_KEYWORDS) {
      expect(DIET_KEYWORD_KEYS).not.toContain(tag);
    }
  });
});
