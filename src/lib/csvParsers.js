// ─── platform definitions ────────────────────────────────────────────────────

export const PLATFORMS = {
  ngw: {
    label: 'NGW Native',
    templatePath: '/templates/ngw-guests-import.csv',
    fields: {
      name:                 'name',
      email:                'email',
      phone:                'phone',
      group:                'group',
      rsvp_status:          'rsvp_status',
      meal_preference:      'meal_preference',
      plus_one_name:        'plus_one_name',
      table_number:         'table_number',
      dietary_restrictions: 'dietary_restrictions',
      notes:                'notes',
    },
    rsvpMap: {
      yes: 'Yes', no: 'No', maybe: 'Maybe', pending: 'Pending', '': 'Pending',
    },
  },
  theknot: {
    label: 'The Knot',
    templatePath: '/templates/theknot-guests-import.csv',
    fields: {
      'Guest Name':     'name',
      'Email Address':  'email',
      'RSVP':           'rsvp_status',
      'Meal':           'meal_preference',
      '+1 Name':        'plus_one_name',
      'Seat':           'table_number',
      'Party Name':     'group',
    },
    rsvpMap: {
      attending: 'Yes', 'not attending': 'No', 'no response': 'Pending', '': 'Pending',
    },
  },
  zola: {
    label: 'Zola',
    templatePath: '/templates/zola-guests-import.csv',
    fields: {
      'Name':                 'name',
      'Email':                'email',
      'Attending':            'rsvp_status',
      'Dietary Restrictions': 'dietary_restrictions',
      'Table':                'table_number',
      'Group':                'group',
    },
    rsvpMap: {
      yes: 'Yes', no: 'No', awaiting: 'Pending', '': 'Pending',
    },
  },
  paperless: {
    label: 'Paperless Post',
    templatePath: '/templates/paperless-post-guests-import.csv',
    fields: {
      'First Name':  '_first',
      'Last Name':   '_last',
      'Email':       'email',
      'RSVP Status': 'rsvp_status',
      'Meal Choice': 'meal_preference',
      'Guest Name':  'plus_one_name',
    },
    rsvpMap: {
      attending: 'Yes', 'not attending': 'No', 'no response': 'Pending', '': 'Pending',
    },
    postProcess(row) {
      row.name = [row._first, row._last].filter(Boolean).join(' ').trim();
      delete row._first;
      delete row._last;
      return row;
    },
  },
};

// ─── constants ───────────────────────────────────────────────────────────────

const MAX_ROWS = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_RSVP = new Set(['Yes', 'No', 'Maybe', 'Pending', '']);
const VALID_MEAL = new Set(['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', '—', '']);

// ─── helpers ─────────────────────────────────────────────────────────────────

// Normalize a name for fuzzy dedup: lowercase, collapse spaces, strip punctuation.
const normName  = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const normEmail = (s) => (s || '').toLowerCase().trim();

// ─── guest transform ─────────────────────────────────────────────────────────

export function transformRows(rawRows, platformKey) {
  const config = PLATFORMS[platformKey];
  if (!config) throw new Error(`Unknown platform: ${platformKey}`);

  return rawRows.slice(0, MAX_ROWS).map((raw, i) => {
    const row = { _row: i + 2, _warnings: [] }; // 2 = 1-indexed + header row

    for (const [srcField, targetField] of Object.entries(config.fields)) {
      const val = String(raw[srcField] ?? '').trim();
      if (val) row[targetField] = val;
    }

    // Normalise RSVP — warn when unknown value is coerced
    if (row.rsvp_status !== undefined) {
      const raw_rsvp = row.rsvp_status;
      const key = raw_rsvp.toLowerCase();
      if (config.rsvpMap[key] !== undefined) {
        row.rsvp_status = config.rsvpMap[key];
      } else {
        row.rsvp_status = 'Pending';
        if (raw_rsvp) row._warnings.push(`RSVP "${raw_rsvp}" mapped to Pending`);
      }
    } else {
      row.rsvp_status = 'Pending';
    }

    // Normalise meal — warn when non-empty non-standard value is coerced
    const rawMeal = row.meal_preference;
    if (!rawMeal || rawMeal === '-') {
      row.meal_preference = '—';
    } else if (!VALID_MEAL.has(rawMeal)) {
      row._warnings.push(`Meal "${rawMeal}" mapped to —`);
      row.meal_preference = '—';
    }

    // Soft signal: missing email reduces dedup confidence
    if (!row.email) row._warnings.push('No email — name-only dedup');

    if (config.postProcess) config.postProcess(row);

    row.id = Math.random().toString(36).slice(2, 10);
    return row;
  });
}

// ─── guest validate ──────────────────────────────────────────────────────────

export function validateRows(rows) {
  return rows.map(row => {
    const errors = [];

    if (!row.name || row.name.trim() === '') {
      errors.push('Name is required');
    }

    if (row.email && !EMAIL_RE.test(row.email)) {
      errors.push(`Invalid email: "${row.email}"`);
    }

    if (row.rsvp_status && !VALID_RSVP.has(row.rsvp_status)) {
      errors.push(`Unknown RSVP value: "${row.rsvp_status}"`);
    }

    if (row.meal_preference && !VALID_MEAL.has(row.meal_preference)) {
      row.meal_preference = '—'; // already coerced in transform, safety net
    }

    return { ...row, _errors: errors, _valid: errors.length === 0 };
  });
}

// ─── guest merge ─────────────────────────────────────────────────────────────

export function computeMergeSummary(existing, incoming, mode) {
  const existingByEmail = new Map(
    existing.filter(g => g.email).map(g => [normEmail(g.email), g])
  );
  const existingByName = new Map(
    existing.map(g => [normName(g.name), g])
  );
  const validIncoming = incoming.filter(r => r._valid);

  if (mode === 'replace') {
    return {
      willAdd: validIncoming.length, willUpdate: 0,
      willRemove: existing.length, willSkip: incoming.length - validIncoming.length,
      duplicateCandidates: 0,
    };
  }

  let willAdd = 0, willUpdate = 0, duplicateCandidates = 0;
  for (const r of validIncoming) {
    const emailMatch = r.email && existingByEmail.has(normEmail(r.email));
    if (emailMatch) {
      willUpdate++;
    } else {
      // No email match — check if a name-only match exists
      const nameMatch = r.name && existingByName.has(normName(r.name));
      if (nameMatch) {
        duplicateCandidates++;
        willUpdate++; // counts as an update via name fallback
      } else {
        willAdd++;
      }
    }
  }
  return {
    willAdd, willUpdate, willRemove: 0,
    willSkip: incoming.length - validIncoming.length,
    duplicateCandidates,
  };
}

export function applyMerge(existing, incoming, mode, batchId) {
  const valid = incoming
    .filter(r => r._valid)
    .map(({ _row, _errors, _valid, _warnings, ...r }) => ({ ...r, import_batch_id: batchId }));

  if (mode === 'replace') return valid;

  const existingByEmail = new Map(
    existing.filter(g => g.email).map(g => [normEmail(g.email), g])
  );
  const existingByName = new Map(
    existing.map(g => [normName(g.name), g])
  );

  if (mode === 'add_new') {
    const newOnes = valid.filter(r => {
      if (r.email && existingByEmail.has(normEmail(r.email))) return false;
      if (!r.email && r.name && existingByName.has(normName(r.name))) return false;
      return true;
    });
    return [...existing, ...newOnes];
  }

  // merge: update matched (email primary, name fallback) + add new
  const matchedExistingIds = new Set();

  const updatedExisting = existing.map(g => {
    // Try email match first
    if (g.email) {
      const match = valid.find(r => r.email && normEmail(r.email) === normEmail(g.email));
      if (match) {
        matchedExistingIds.add(g.id);
        return { ...g, ...match, id: g.id };
      }
    }
    // Fallback: name match (only when guest has no email or email didn't match)
    const nameMatch = valid.find(r =>
      !r.email &&
      r.name && normName(r.name) === normName(g.name) &&
      !matchedExistingIds.has(g.id)
    );
    if (nameMatch) {
      matchedExistingIds.add(g.id);
      return { ...g, ...nameMatch, id: g.id };
    }
    return g;
  });

  // Add rows that didn't match anything
  const usedIncoming = new Set();
  updatedExisting.forEach(g => {
    const r = valid.find(r =>
      (r.email && g.email && normEmail(r.email) === normEmail(g.email)) ||
      (!r.email && r.name && normName(r.name) === normName(g.name))
    );
    if (r) usedIncoming.add(r.id);
  });
  const brandNew = valid.filter(r => !usedIncoming.has(r.id));
  return [...updatedExisting, ...brandNew];
}

// ─── vendor transform / validate / merge ─────────────────────────────────────

const VALID_VENDOR_STATUS   = new Set(['Considering', 'Quoted', 'Contracted', 'Deposit Paid', 'Confirmed', '']);
const VALID_PREFERRED_TIER  = new Set(['Standard', 'Preferred', 'Certified', '']);
const VENDOR_MAX_ROWS = 500;

// Parse a semi-colon-or-pipe-separated tag cell into an array
const parseTags = (val) =>
  val ? val.split(/[;|,]/).map(t => t.trim()).filter(Boolean) : [];

// Parse boolean-ish CSV value
const parseBool = (val) => {
  if (!val) return false;
  return ['true', 'yes', '1', 'paid', 'y'].includes(val.toLowerCase());
};

// Parse number, return 0 on failure
const parseNum = (val) => {
  const n = parseFloat(String(val).replace(/[$,]/g, ''));
  return isNaN(n) ? 0 : n;
};

export function transformVendorRows(rawRows) {
  return rawRows.slice(0, VENDOR_MAX_ROWS).map((raw, i) => {
    const get = (key) => String(raw[key] ?? '').trim();
    const _warnings = [];

    const status = get('Status');
    const normStatus = status
      ? Object.keys(Object.fromEntries([...VALID_VENDOR_STATUS].filter(Boolean).map(s => [s.toLowerCase(), s])))
          .reduce((found, k) => found || (k === status.toLowerCase() ? [...VALID_VENDOR_STATUS].find(s => s.toLowerCase() === k) : null), null) || status
      : 'Considering';

    if (status && !VALID_VENDOR_STATUS.has(normStatus)) {
      _warnings.push(`Status "${status}" kept as-is — verify it's valid`);
    }

    const preferredTier = get('Preferred Tier');
    if (preferredTier && !VALID_PREFERRED_TIER.has(preferredTier)) {
      _warnings.push(`Preferred Tier "${preferredTier}" kept as-is`);
    }

    const name = get('Name') || get('Vendor');
    const email = get('Email') || get('Contact Email') || get('contact');
    if (!email) _warnings.push('No email provided');

    return {
      _row: i + 2,
      _warnings,
      id:                    Math.random().toString(36).slice(2, 10),
      name,
      category:              get('Category'),
      budgetCategory:        get('Budget Category') || get('Category'),
      status:                normStatus || 'Considering',
      contactName:           get('Contact Name'),
      contact:               email,
      phone:                 get('Phone'),
      website:               get('Website'),
      cost:                  parseNum(get('Cost')),
      depositAmt:            parseNum(get('Deposit Amount')),
      depositPaid:           parseBool(get('Deposit Paid')),
      balancePaid:           parseBool(get('Balance Paid')),
      payDueDate:            get('Payment Due Date'),
      arrivalTime:           get('Arrival Time'),
      notes:                 get('Notes'),
      serviceArea:           get('Service Area'),
      preferredTier:         preferredTier || '',
      identityTags:          parseTags(get('Identity Tags')),
      specialtyTags:         parseTags(get('Specialty Tags')),
      languageTags:          parseTags(get('Languages')),
      culturalExperienceTags: parseTags(get('Cultural Experience')),
      backup:                '',
      log:                   [],
    };
  });
}

export function validateVendorRows(rows) {
  return rows.map(row => {
    const errors = [];

    if (!row.name || row.name.trim() === '') {
      errors.push('Vendor name is required');
    }

    if (row.contact && !EMAIL_RE.test(row.contact)) {
      errors.push(`Invalid email: "${row.contact}"`);
    }

    return { ...row, _errors: errors, _valid: errors.length === 0 };
  });
}

export function computeVendorMergeSummary(existing, incoming, mode) {
  const existingByName = new Map(
    existing.map(v => [normName(v.name), v])
  );
  const validIncoming = incoming.filter(r => r._valid);

  if (mode === 'replace') {
    return {
      willAdd: validIncoming.length, willUpdate: 0,
      willRemove: existing.length, willSkip: incoming.length - validIncoming.length,
    };
  }

  let willAdd = 0, willUpdate = 0;
  for (const r of validIncoming) {
    if (r.name && existingByName.has(normName(r.name))) willUpdate++;
    else willAdd++;
  }
  return { willAdd, willUpdate, willRemove: 0, willSkip: incoming.length - validIncoming.length };
}

export function applyVendorMerge(existing, incoming, mode, batchId) {
  const valid = incoming
    .filter(r => r._valid)
    .map(({ _row, _errors, _valid, _warnings, ...r }) => ({ ...r, import_batch_id: batchId }));

  if (mode === 'replace') return valid;

  const existingByName = new Map(existing.map(v => [normName(v.name), v]));

  if (mode === 'add_new') {
    const newOnes = valid.filter(r => !r.name || !existingByName.has(normName(r.name)));
    return [...existing, ...newOnes];
  }

  // merge: update by name + add new
  const matchedIds = new Set();
  const updated = existing.map(v => {
    const match = valid.find(r => r.name && normName(r.name) === normName(v.name));
    if (match) { matchedIds.add(match.id); return { ...v, ...match, id: v.id, log: v.log || [] }; }
    return v;
  });
  const brandNew = valid.filter(r => !matchedIds.has(r.id));
  return [...updated, ...brandNew];
}

// ─── export helpers ──────────────────────────────────────────────────────────

function escapeCell(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function toCSV(rows, columns) {
  const header = columns.map(c => c.label).join(',');
  const body   = rows.map(row => columns.map(c => {
    const val = row[c.key];
    // Flatten arrays (tags) to semicolon-separated strings
    return escapeCell(Array.isArray(val) ? val.join('; ') : val);
  }).join(',')).join('\n');
  return header + '\n' + body;
}

export function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const COLUMNS = {
  guests: [
    { key: 'name',                 label: 'Name' },
    { key: 'email',                label: 'Email' },
    { key: 'phone',                label: 'Phone' },
    { key: 'group',                label: 'Group' },
    { key: 'rsvp_status',          label: 'RSVP' },
    { key: 'meal_preference',      label: 'Meal' },
    { key: 'plus_one_name',        label: '+1 Name' },
    { key: 'table_number',         label: 'Table' },
    { key: 'dietary_restrictions', label: 'Dietary' },
    { key: 'notes',                label: 'Notes' },
  ],
  // plannerNotes and privateRiskFlags are intentionally excluded from this export
  vendors: [
    { key: 'name',         label: 'Vendor' },
    { key: 'category',     label: 'Category' },
    { key: 'status',       label: 'Status' },
    { key: 'contactName',  label: 'Contact Name' },
    { key: 'contact',      label: 'Email' },
    { key: 'phone',        label: 'Phone' },
    { key: 'website',      label: 'Website' },
    { key: 'cost',         label: 'Cost' },
    { key: 'depositAmt',   label: 'Deposit Amount' },
    { key: 'depositPaid',  label: 'Deposit Paid' },
    { key: 'balancePaid',  label: 'Balance Paid' },
    { key: 'payDueDate',   label: 'Payment Due Date' },
    { key: 'arrivalTime',  label: 'Arrival Time' },
    { key: 'serviceArea',  label: 'Service Area' },
    { key: 'preferredTier', label: 'Preferred Tier' },
    { key: 'identityTags', label: 'Identity Tags' },
    { key: 'specialtyTags', label: 'Specialty Tags' },
    { key: 'languageTags', label: 'Languages' },
    { key: 'culturalExperienceTags', label: 'Cultural Experience' },
    { key: 'notes',        label: 'Notes' },
  ],
  budget: [
    { key: 'category', label: 'Category' },
    { key: 'budgeted', label: 'Budgeted' },
    { key: 'actual',   label: 'Actual' },
    { key: 'notes',    label: 'Notes' },
  ],
  timeline: [
    { key: 'week',  label: 'Milestone' },
    { key: 'task',  label: 'Task' },
    { key: 'done',  label: 'Done' },
    { key: 'owner', label: 'Owner' },
  ],
};
