// Behavioral coverage for lib/csvParsers — THE shared import/export engine
// both shells consume (legacy ImportWizard/VendorImportWizard/ExportMenu and
// HostShellV2's CSV import). Locks the platform field maps, RSVP/meal
// normalization + warnings, validation, the email-primary/name-fallback
// dedupe + merge rules, vendor parsing, and CSV serialization round-trip.
import Papa from 'papaparse';
import {
  PLATFORMS,
  transformRows, validateRows, computeMergeSummary, applyMerge,
  transformVendorRows, validateVendorRows, computeVendorMergeSummary, applyVendorMerge,
  toCSV, COLUMNS, exportFileSlug,
} from '../csvParsers';

// Parse a CSV string the same way the wizards parse files.
const parse = (csv) => Papa.parse(csv.trim(), { header: true, skipEmptyLines: true }).data;

// ─── guest transform ─────────────────────────────────────────────────────────

const THEKNOT_CSV = `
Guest Name,Email Address,RSVP,Meal,+1 Name,Seat,Party Name
Ada Byron,ada@example.com,attending,Vegetarian,Charles B,4,Family
Samuel Hill,sam@example.com,not attending,,,,Friends
Rosa Diaz,,no response,Chicken,,,Work
Max Ray,max@example.com,probably,,,,"Ray, Max & Co"
`;

test('transformRows maps The Knot columns to canonical fields', () => {
  const rows = transformRows(parse(THEKNOT_CSV), 'theknot');
  expect(rows).toHaveLength(4);
  const ada = rows[0];
  expect(ada.name).toBe('Ada Byron');
  expect(ada.email).toBe('ada@example.com');
  expect(ada.rsvp_status).toBe('Yes');            // attending → Yes
  expect(ada.meal_preference).toBe('Vegetarian');
  expect(ada.plus_one_name).toBe('Charles B');
  expect(ada.table_number).toBe('4');
  expect(ada.group).toBe('Family');
  expect(ada._row).toBe(2);                        // 1-indexed + header row
  expect(ada.id).toMatch(/^[a-z0-9]{8}$/);
  expect(rows[1].rsvp_status).toBe('No');          // not attending → No
  expect(rows[2].rsvp_status).toBe('Pending');     // no response → Pending
});

test('transformRows warns when RSVP and meal values are coerced', () => {
  const rows = transformRows(parse(THEKNOT_CSV), 'theknot');
  const max = rows[3];
  expect(max.rsvp_status).toBe('Pending');         // unknown "probably"
  expect(max._warnings).toContain('RSVP "probably" mapped to Pending');
  const rosa = rows[2];
  expect(rosa.meal_preference).toBe('—');          // "Chicken" not in the valid set
  expect(rosa._warnings).toContain('Meal "Chicken" mapped to —');
  expect(rosa._warnings).toContain('No email — name-only dedup');
});

test('paperless postProcess joins First/Last Name into name', () => {
  const csv = `
First Name,Last Name,Email,RSVP Status,Meal Choice,Guest Name
Grace,Hopper,grace@example.com,attending,Vegan,Howard A
`;
  const [row] = transformRows(parse(csv), 'paperless');
  expect(row.name).toBe('Grace Hopper');
  expect(row._first).toBeUndefined();
  expect(row._last).toBeUndefined();
  expect(row.plus_one_name).toBe('Howard A');      // paperless "Guest Name" = +1
  expect(row.meal_preference).toBe('Vegan');
});

test('evite alternate column names land on the same canonical fields', () => {
  const csv = `
Guest Name,Email Address,Response,Dietary Needs
Lin Wu,lin@example.com,declined,nut allergy
`;
  const [row] = transformRows(parse(csv), 'evite');
  expect(row.name).toBe('Lin Wu');
  expect(row.email).toBe('lin@example.com');
  expect(row.rsvp_status).toBe('No');              // declined → No
  expect(row.dietary_restrictions).toBe('nut allergy');
});

test('transformRows caps at 2000 rows and rejects unknown platforms', () => {
  const big = Array.from({ length: 2101 }, (_, i) => ({ name: `G${i}` }));
  expect(transformRows(big, 'ngw')).toHaveLength(2000);
  expect(() => transformRows([], 'wix')).toThrow('Unknown platform: wix');
});

// ─── guest validate ──────────────────────────────────────────────────────────

test('validateRows requires a name and a well-formed email', () => {
  const rows = validateRows(transformRows(parse(`
name,email,rsvp_status
Ada Byron,ada@example.com,yes
,missing@example.com,yes
Bad Email,not-an-email,yes
`), 'ngw'));
  expect(rows[0]._valid).toBe(true);
  expect(rows[1]._valid).toBe(false);
  expect(rows[1]._errors).toContain('Name is required');
  expect(rows[2]._valid).toBe(false);
  expect(rows[2]._errors).toContain('Invalid email: "not-an-email"');
});

// ─── guest merge ─────────────────────────────────────────────────────────────

const existingGuests = () => ([
  { id: 'g1', name: 'Ada Byron',   email: 'ada@example.com', rsvp_status: 'Pending' },
  { id: 'g2', name: 'Samuel Hill', email: '',                rsvp_status: 'Yes' },
]);

const incoming = (over = {}) => validateRows(transformRows(parse(`
name,email,rsvp_status
Ada Byron,ADA@example.com,yes
Samuel Hill,,no
New Person,new@example.com,maybe
`), 'ngw')).map(r => ({ ...r, ...over }));

test('computeMergeSummary: email match primary, name-only match flagged', () => {
  const s = computeMergeSummary(existingGuests(), incoming(), 'merge');
  expect(s.willAdd).toBe(1);                 // New Person
  expect(s.willUpdate).toBe(2);              // Ada by email (case-insensitive), Samuel by name
  expect(s.duplicateCandidates).toBe(1);     // Samuel matched by name only
  expect(s.willRemove).toBe(0);
});

test('computeMergeSummary: replace removes everyone and adds only valid rows', () => {
  const rows = incoming();
  rows.push({ ...rows[0], name: '', _valid: false, _errors: ['Name is required'] });
  const s = computeMergeSummary(existingGuests(), rows, 'replace');
  expect(s).toEqual({ willAdd: 3, willUpdate: 0, willRemove: 2, willSkip: 1, duplicateCandidates: 0 });
});

test('applyMerge add_new skips email and name-only duplicates', () => {
  const out = applyMerge(existingGuests(), incoming(), 'add_new', 'b1');
  expect(out).toHaveLength(3);
  const added = out[2];
  expect(added.name).toBe('New Person');
  expect(added.import_batch_id).toBe('b1');
  // internal flags are stripped from committed rows
  expect(added._valid).toBeUndefined();
  expect(added._row).toBeUndefined();
});

test('applyMerge merge updates matched rows but preserves existing ids', () => {
  const out = applyMerge(existingGuests(), incoming(), 'merge', 'b2');
  expect(out).toHaveLength(3);
  const ada = out.find(g => g.id === 'g1');
  expect(ada.rsvp_status).toBe('Yes');             // updated via email match
  const sam = out.find(g => g.id === 'g2');
  expect(sam.rsvp_status).toBe('No');              // updated via name fallback
  expect(out.filter(g => g.name === 'New Person')).toHaveLength(1);
});

test('applyMerge replace returns only the valid incoming rows', () => {
  const rows = incoming();
  rows[1] = { ...rows[1], _valid: false };
  const out = applyMerge(existingGuests(), rows, 'replace', 'b3');
  expect(out).toHaveLength(2);
  expect(out.every(g => g.import_batch_id === 'b3')).toBe(true);
});

// ─── vendor transform / validate / merge ─────────────────────────────────────

const VENDOR_CSV = `
Name,Category,Status,Contact Name,Email,Cost,Deposit Amount,Deposit Paid,Identity Tags,Languages
Sound & Co,DJ,quoted,Rita M,rita@soundco.com,"$1,200.50",300,yes,veteran-owned; family-run,English|Spanish
Blooms,Florist,,,,,,,,
`;

test('transformVendorRows parses money, booleans, tags, and status case', () => {
  const [v, blooms] = transformVendorRows(parse(VENDOR_CSV));
  expect(v.name).toBe('Sound & Co');
  expect(v.status).toBe('Quoted');                 // case-normalized to the valid set
  expect(v.cost).toBe(1200.5);                     // "$1,200.50"
  expect(v.depositAmt).toBe(300);
  expect(v.depositPaid).toBe(true);                // "yes"
  expect(v.identityTags).toEqual(['veteran-owned', 'family-run']);
  expect(v.languageTags).toEqual(['English', 'Spanish']);
  expect(v.log).toEqual([]);
  expect(blooms.status).toBe('Considering');       // empty status defaults
  expect(blooms.cost).toBe(0);
  expect(blooms._warnings).toContain('No email provided');
});

test('validateVendorRows requires a name and valid contact email', () => {
  const rows = validateVendorRows(transformVendorRows(parse(`
Name,Email
Good Vendor,ok@example.com
,anon@example.com
Bad Contact,nope
`)));
  expect(rows[0]._valid).toBe(true);
  expect(rows[1]._errors).toContain('Vendor name is required');
  expect(rows[2]._errors).toContain('Invalid email: "nope"');
});

test('vendor merge matches by name, keeps id and log, adds new', () => {
  const existing = [{ id: 'v1', name: 'Sound & Co', status: 'Considering', log: [{ t: 1 }] }];
  const rows = validateVendorRows(transformVendorRows(parse(VENDOR_CSV)));
  const summary = computeVendorMergeSummary(existing, rows, 'merge');
  expect(summary).toEqual({ willAdd: 1, willUpdate: 1, willRemove: 0, willSkip: 0 });
  const out = applyVendorMerge(existing, rows, 'merge', 'vb1');
  expect(out).toHaveLength(2);
  const sound = out.find(v => v.id === 'v1');
  expect(sound.status).toBe('Quoted');
  expect(sound.log).toEqual([{ t: 1 }]);           // history survives the update
});

// ─── export serialization ────────────────────────────────────────────────────

test('toCSV escapes commas, quotes, newlines and flattens tag arrays', () => {
  const csv = toCSV(
    [{ name: 'Ray, Max & Co', notes: 'He said "yes"\nthen left', identityTags: ['a', 'b'] }],
    [{ key: 'name', label: 'Vendor' }, { key: 'notes', label: 'Notes' }, { key: 'identityTags', label: 'Identity Tags' }],
  );
  expect(csv.split('\n')[0]).toBe('Vendor,Notes,Identity Tags');
  expect(csv).toContain('"Ray, Max & Co"');
  expect(csv).toContain('"He said ""yes""\nthen left"');
  expect(csv).toContain('a; b');
});

test('guest export → re-import round-trip preserves every column value', () => {
  const guests = [{
    name: 'Ada Byron', email: 'ada@example.com', phone: '555-0100', group: 'Family',
    rsvp_status: 'Yes', meal_preference: 'Vegetarian', plus_one_name: 'Charles B',
    table_number: '4', dietary_restrictions: 'nut allergy', notes: 'VIP, front row',
  }];
  const csv = toCSV(guests, COLUMNS.guests);
  const [back] = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;
  expect(back).toEqual({
    Name: 'Ada Byron', Email: 'ada@example.com', Phone: '555-0100', Group: 'Family',
    RSVP: 'Yes', Meal: 'Vegetarian', '+1 Name': 'Charles B', Table: '4',
    Dietary: 'nut allergy', Notes: 'VIP, front row',
  });
  // and the NGW template re-imports its own export losslessly
  const [row] = validateRows(transformRows(
    Papa.parse(csv, { header: true, skipEmptyLines: true }).data.map(r => ({
      name: r.Name, email: r.Email, phone: r.Phone, group: r.Group,
      rsvp_status: r.RSVP, meal_preference: r.Meal, plus_one_name: r['+1 Name'],
      table_number: r.Table, dietary_restrictions: r.Dietary, notes: r.Notes,
    })), 'ngw'));
  expect(row._valid).toBe(true);
  expect(row.name).toBe('Ada Byron');
  expect(row.rsvp_status).toBe('Yes');
});

test('exportFileSlug slugs event names and never returns empty', () => {
  expect(exportFileSlug("Maya's 30th Birthday")).toBe('mayas-30th-birthday');
  expect(exportFileSlug('event')).toBe('event');
  expect(exportFileSlug('')).toBe('event');
  expect(exportFileSlug('!!!')).toBe('event');
});
