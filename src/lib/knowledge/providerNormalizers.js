// ─── Provider Normalizers (KRA-1 Bundle B) ────────────────────────────────────
// Auto-parse raw provider API responses into canonical records[] that feed
// directly into runCampaign(campaign, { fetched: { [providerId]: records } }).
//
// The browser cannot fetch external URLs (CORS). The researcher fetches the
// raw response and pastes it here. Each normalizer knows the correct format
// for its provider — the researcher pastes raw, not pre-formatted JSON.
//
// Every normalizer:
//   - Accepts raw string or parsed object
//   - Returns records[] (canonical shape for recordsToEvidence())
//   - Never throws — returns [] on bad input with a parse error note
//   - Never fabricates values — extracts only what the source actually says
//
// Record shape: { source, assetId, fieldPath, url, excerpt, extractedFacts[], region }

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

function safe(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

// ── BLS Average Price API (v2) ─────────────────────────────────────────────────
// Endpoint: https://api.bls.gov/publicAPI/v2/timeseries/data/
// Series IDs: APU* (Average Price series for food items)
// Response shape: { status, Results: { series: [{ seriesID, data: [{ year, period, value }] }] } }
//
// Usage: paste the raw BLS API JSON response.
// The most recent data point becomes the extracted fact.
export function normalizeBLS(rawResponse, { assetId, fieldPath, unit = 'USD', seriesLabel = null } = {}) {
  const data = safe(rawResponse);
  if (!data) return { records: [], error: 'Invalid JSON — paste the full BLS API response' };

  try {
    const series = data?.Results?.series || data?.series || [];
    const records = [];

    for (const s of series) {
      const points = (s.data || []).filter((d) => d.value && d.value !== '-');
      if (!points.length) continue;
      // Use the most recent non-preliminary data point
      const latest = points[0];
      const value  = parseFloat(latest.value);
      if (isNaN(value)) continue;

      const period  = `${latest.year}-${(latest.period || '').replace('M', '')}`;
      const label   = seriesLabel || s.seriesID || 'BLS Average Price';

      records.push({
        source: 'data.gov',
        assetId: assetId || '',
        fieldPath: fieldPath || '',
        url: `https://api.bls.gov/publicAPI/v2/timeseries/data/${s.seriesID}`,
        excerpt: `BLS Average Price ${label}: $${value.toFixed(2)} ${unit} as of ${period}`,
        extractedFacts: [
          { field: fieldPath || '', value, unit, period, seriesId: s.seriesID },
        ],
        region: 'US',
        capturedAt: new Date().toISOString().slice(0, 10),
        authority: 'official',
      });
    }

    return { records, seriesCount: series.length, periodCovered: records[0]?.extractedFacts[0]?.period };
  } catch (e) {
    return { records: [], error: `BLS parse error: ${e.message}` };
  }
}

// ── USDA ERS API ───────────────────────────────────────────────────────────────
// Multiple endpoints — the normalizer handles the two most useful:
//   1. Food Price Outlook (annual/quarterly price change data)
//   2. Food Expenditure Series (spending data)
// Response varies by endpoint; we extract whatever looks like a price.
export function normalizeUSDA(rawResponse, { assetId, fieldPath, commodity = null } = {}) {
  const data = safe(rawResponse);
  if (!data) return { records: [], error: 'Invalid JSON — paste the full USDA ERS API response' };

  try {
    // Handle array of records or wrapped { data: [...] }
    const rows = Array.isArray(data) ? data : (data.data || data.results || [data]);
    const records = [];

    for (const row of rows) {
      // Skip if no recognizable price field
      const priceFields = ['price', 'value', 'amount', 'costPerUnit', 'averagePrice', 'retailPrice'];
      let priceValue = null;
      let priceKey   = null;
      for (const f of priceFields) {
        if (row[f] != null && !isNaN(parseFloat(row[f]))) { priceValue = parseFloat(row[f]); priceKey = f; break; }
      }
      if (priceValue == null) continue;

      const itemLabel = row.commodity || row.item || row.product || row.description || commodity || 'item';
      const yearLabel = row.year || row.period || row.date || '';
      const unit      = row.unit || row.priceUnit || 'unit';

      records.push({
        source: 'data.gov',
        assetId: assetId || '',
        fieldPath: fieldPath || '',
        url: 'https://www.ers.usda.gov/data-products/',
        excerpt: `USDA ERS: ${itemLabel} — $${priceValue.toFixed(2)} per ${unit}${yearLabel ? ` (${yearLabel})` : ''}`,
        extractedFacts: [{ field: fieldPath || '', value: priceValue, unit, item: itemLabel, year: yearLabel }],
        region: row.region || row.area || 'US',
        capturedAt: new Date().toISOString().slice(0, 10),
        authority: 'official',
      });
    }

    return { records };
  } catch (e) {
    return { records: [], error: `USDA parse error: ${e.message}` };
  }
}

// ── FDA Recall RSS / JSON ──────────────────────────────────────────────────────
// Source: https://api.fda.gov/food/enforcement.json?search=...
// Response: { results: [{ recall_number, product_description, reason_for_recall, status, ... }] }
export function normalizeFDA(rawResponse, { assetId } = {}) {
  const data = safe(rawResponse);
  if (!data) return { records: [], error: 'Invalid JSON — paste the full FDA API response' };

  try {
    const results = data.results || (Array.isArray(data) ? data : []);
    const records = results.slice(0, 10).map((r) => ({
      source: 'fda-foodsafety',
      assetId: assetId || '',
      fieldPath: 'safetyNotes',
      url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
      excerpt: `FDA Recall: ${r.product_description || 'product'} — ${r.reason_for_recall || 'reason not specified'} (${r.status || 'status unknown'})`,
      extractedFacts: [{
        field: 'safetyNotes',
        value: `RECALL ALERT: ${r.reason_for_recall || ''}`,
        recallNumber: r.recall_number,
        status: r.status,
      }],
      region: 'US',
      capturedAt: new Date().toISOString().slice(0, 10),
      authority: 'official',
    }));
    return { records };
  } catch (e) {
    return { records: [], error: `FDA parse error: ${e.message}` };
  }
}

// ── Market / Commercial Pricing (generic) ──────────────────────────────────────
// Accepts flexible formats:
//   - Array of { price, unit, item, source?, region? } objects
//   - Single { price, unit, item } object
//   - Retail or wholesale price survey data
// Used for market-pricing, retail, restaurant-depot, catering-network providers.
export function normalizeMarketPricing(rawResponse, { assetId, fieldPath, provider = 'market-pricing', region = 'US' } = {}) {
  const data = safe(rawResponse);
  if (!data) return { records: [], error: 'Invalid JSON — paste price data as [{ price, unit, item, source? }] or a single object' };

  try {
    const rows = Array.isArray(data) ? data : [data];
    const records = [];

    for (const row of rows) {
      // Accept price as a scalar or [min, max] range
      let value;
      if (Array.isArray(row.price)) {
        value = row.price;
      } else if (row.priceMin != null && row.priceMax != null) {
        value = [parseFloat(row.priceMin), parseFloat(row.priceMax)];
      } else if (row.price != null) {
        const p = parseFloat(row.price);
        if (!isNaN(p)) value = p;
      }

      if (value == null) continue;

      const item    = row.item || row.product || row.description || 'item';
      const unit    = row.unit || 'unit';
      const src     = row.source || row.store || row.vendor || provider;
      const theRegion = row.region || region;

      records.push({
        source: provider,
        assetId: assetId || '',
        fieldPath: fieldPath || '',
        url: row.url || null,
        excerpt: `${src}: ${item} — ${Array.isArray(value) ? `$${value[0]}–$${value[1]}` : `$${value}`} per ${unit}${theRegion !== 'US' ? ` (${theRegion})` : ''}${row.date ? ` as of ${row.date}` : ''}`,
        extractedFacts: [{ field: fieldPath || '', value, unit, item, store: src }],
        region: theRegion,
        capturedAt: new Date().toISOString().slice(0, 10),
        authority: 'trade',
      });
    }

    return { records };
  } catch (e) {
    return { records: [], error: `Market pricing parse error: ${e.message}` };
  }
}

// ── NOAA Climate Normals / Heat Index ─────────────────────────────────────────
// Endpoint: https://www.ncei.noaa.gov/cdo-web/api/v2/data (requires token)
// Simplified: accepts { results: [{ date, datatype, value, station }] }
export function normalizeNOAA(rawResponse, { assetId, fieldPath = 'weatherGuidance' } = {}) {
  const data = safe(rawResponse);
  if (!data) return { records: [], error: 'Invalid JSON — paste the NOAA CDO API response' };

  try {
    const results = data.results || (Array.isArray(data) ? data : []);
    const records = results.slice(0, 5).map((r) => ({
      source: 'noaa',
      assetId: assetId || '',
      fieldPath,
      url: 'https://www.ncei.noaa.gov/cdo-web/',
      excerpt: `NOAA: ${r.datatype || 'measurement'} — ${r.value} on ${r.date || 'date unknown'} at ${r.station || 'station unknown'}`,
      extractedFacts: [{ field: fieldPath, value: r.value, datatype: r.datatype, station: r.station, date: r.date }],
      region: r.station ? r.station.slice(0, 2) : 'US',
      capturedAt: new Date().toISOString().slice(0, 10),
      authority: 'official',
    }));
    return { records };
  } catch (e) {
    return { records: [], error: `NOAA parse error: ${e.message}` };
  }
}

// ── Auto-detect provider format ────────────────────────────────────────────────
// Given a provider ID and raw paste, pick the right normalizer.
// This is what the evidence submission form calls — researcher selects provider,
// pastes raw, and the form auto-parses without manual JSON formatting.
export const PROVIDER_NORMALIZER_MAP = {
  'data.gov':        normalizeBLS,
  'noaa':            normalizeNOAA,
  'fda-foodsafety':  normalizeFDA,
  'market-pricing':  normalizeMarketPricing,
  'retail':          normalizeMarketPricing,
  'restaurant-depot': normalizeMarketPricing,
  'catering-network': normalizeMarketPricing,
  'wholesale':       normalizeMarketPricing,
  'community-forums': normalizeMarketPricing,
};

export function autoNormalize(providerId, rawPaste, opts = {}) {
  const normalizer = PROVIDER_NORMALIZER_MAP[providerId];
  if (!normalizer) {
    // Generic fallback — try to parse as market pricing
    return normalizeMarketPricing(rawPaste, { ...opts, provider: providerId });
  }
  return normalizer(rawPaste, { ...opts, provider: providerId });
}

// ── Paste-mode hint ────────────────────────────────────────────────────────────
// Returns instructions for what to paste for a given provider.
export function pasteHintFor(providerId) {
  const hints = {
    'data.gov':         'Paste the full BLS API JSON response from api.bls.gov/publicAPI/v2/timeseries/data/. The most recent data point is extracted automatically.',
    'noaa':             'Paste the NOAA CDO API JSON response from www.ncei.noaa.gov/cdo-web/api/v2/data. Include results[] array.',
    'fda-foodsafety':   'Paste the FDA enforcement API JSON from api.fda.gov/food/enforcement.json. All recall records are extracted.',
    'market-pricing':   'Paste a JSON array: [{ "price": 8.50, "unit": "lb", "item": "crabs", "source": "store name" }]. Accepts scalar price or [min, max] range.',
    'retail':           'Paste a JSON array of retail price observations: [{ "price": 9.99, "unit": "lb", "item": "product name", "store": "Costco" }].',
    'restaurant-depot': 'Paste a JSON array of wholesale/case prices: [{ "price": [6.50, 8.00], "unit": "dozen", "item": "blue crabs", "store": "Restaurant Depot" }].',
    'catering-network': 'Paste a JSON array of catering quotes: [{ "price": 45, "unit": "per head", "item": "full-service crab feast", "source": "caterer name" }].',
    'community-forums': 'Paste a JSON array of community-reported prices: [{ "price": 7.50, "unit": "dozen", "item": "item", "source": "Reddit r/..."}]. Always requires corroboration.',
  };
  return hints[providerId] || 'Paste a JSON array of price/data records: [{ "price": ..., "unit": "...", "item": "..." }]';
}
