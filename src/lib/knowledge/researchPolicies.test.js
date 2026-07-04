// ─── researchPolicies.test.js ─────────────────────────────────────────────────
import {
  RESEARCH_POLICIES,
  PROVIDER_POLICIES,
  researchPolicyFor,
  providerPolicyFor,
  isStaleByPolicy,
  nextResearchDate,
  shouldRetry,
  classifyFailure,
} from './researchPolicies';

// ── RESEARCH_POLICIES shape ───────────────────────────────────────────────────

describe('RESEARCH_POLICIES', () => {
  const EXPECTED_KINDS = [
    'pricing', 'cost-factor', 'quantity', 'safety', 'governance',
    'grounding', 'regional', 'cultural', 'weather', 'planner',
  ];

  test('has all 10 gap-kind keys', () => {
    EXPECTED_KINDS.forEach((k) => {
      expect(RESEARCH_POLICIES).toHaveProperty(k);
    });
    expect(Object.keys(RESEARCH_POLICIES)).toHaveLength(10);
  });

  test('every policy has required fields', () => {
    Object.entries(RESEARCH_POLICIES).forEach(([kind, policy]) => {
      expect(typeof policy.freshnessDays).toBe('number');
      expect(typeof policy.retryAttempts).toBe('number');
      expect(typeof policy.timeoutMs).toBe('number');
      expect(typeof policy.corroborationRequired).toBe('boolean');
      expect(typeof policy.minCorroboration).toBe('number');
      expect(typeof policy.scheduleInterval).toBe('string');
      expect(typeof policy.priority).toBe('string');
      expect(typeof policy.failureMode).toBe('string');
    });
  });

  test('pricing.freshnessDays === 45', () => {
    expect(RESEARCH_POLICIES.pricing.freshnessDays).toBe(45);
  });

  test('weather.freshnessDays === 7', () => {
    expect(RESEARCH_POLICIES.weather.freshnessDays).toBe(7);
  });

  test('safety.corroborationRequired === true', () => {
    expect(RESEARCH_POLICIES.safety.corroborationRequired).toBe(true);
  });

  test('cultural.minCorroboration === 3', () => {
    expect(RESEARCH_POLICIES.cultural.minCorroboration).toBe(3);
  });

  test('pricing.retryAttempts >= 2', () => {
    expect(RESEARCH_POLICIES.pricing.retryAttempts).toBeGreaterThanOrEqual(2);
  });
});

// ── PROVIDER_POLICIES shape ───────────────────────────────────────────────────

describe('PROVIDER_POLICIES', () => {
  const EXPECTED_FAMILIES = [
    'government', 'academic', 'standards', 'food-safety', 'weather',
    'hospitality', 'event-industry', 'commercial-pricing', 'retail',
    'wholesale', 'tourism', 'venue', 'catering', 'sme',
    'internal-validation', 'community',
  ];

  test('has all 16 family keys from providers.js', () => {
    EXPECTED_FAMILIES.forEach((f) => {
      expect(PROVIDER_POLICIES).toHaveProperty(f);
    });
    expect(Object.keys(PROVIDER_POLICIES)).toHaveLength(16);
  });

  test('every provider policy has freshnessDays, failureMode, scheduleInterval, priority', () => {
    Object.entries(PROVIDER_POLICIES).forEach(([family, policy]) => {
      expect(typeof policy.freshnessDays).toBe('number');
      expect(typeof policy.failureMode).toBe('string');
      expect(typeof policy.scheduleInterval).toBe('string');
      expect(typeof policy.priority).toBe('string');
    });
  });
});

// ── researchPolicyFor ─────────────────────────────────────────────────────────

describe('researchPolicyFor', () => {
  test('returns the named policy for a known kind', () => {
    const p = researchPolicyFor('pricing');
    expect(p.freshnessDays).toBe(45);
    expect(p.priority).toBe('high');
  });

  test('returns grounding fallback for an unknown kind', () => {
    const p = researchPolicyFor('nonexistent-kind');
    expect(p).toEqual(RESEARCH_POLICIES.grounding);
  });

  test('returns weather policy for "weather"', () => {
    const p = researchPolicyFor('weather');
    expect(p.freshnessDays).toBe(7);
    expect(p.failureMode).toBe('retry');
  });
});

// ── providerPolicyFor ─────────────────────────────────────────────────────────

describe('providerPolicyFor', () => {
  test('returns policy for a known family', () => {
    const p = providerPolicyFor('government');
    expect(typeof p.freshnessDays).toBe('number');
    expect(typeof p.failureMode).toBe('string');
  });

  test('returns default fallback for unknown family', () => {
    const p = providerPolicyFor('totally-unknown-family');
    expect(p.freshnessDays).toBe(180);
    expect(p.failureMode).toBe('skip');
    expect(p.scheduleInterval).toBe('semi-annual');
    expect(p.priority).toBe('med');
  });

  test('food-safety has alert failureMode', () => {
    const p = providerPolicyFor('food-safety');
    expect(p.failureMode).toBe('alert');
  });
});

// ── isStaleByPolicy ───────────────────────────────────────────────────────────

describe('isStaleByPolicy', () => {
  const ASOF = '2026-07-03';

  test('returns false when evidence or asOf is missing', () => {
    expect(isStaleByPolicy(null, 'pricing', ASOF)).toBe(false);
    expect(isStaleByPolicy({ capturedAt: '2026-01-01' }, 'pricing', null)).toBe(false);
  });

  test('returns true when capturedAt is missing from evidence', () => {
    expect(isStaleByPolicy({}, 'pricing', ASOF)).toBe(true);
  });

  test('evidence 50 days old is stale for pricing (45-day policy)', () => {
    // 50 days before 2026-07-03 = 2026-05-14
    const capturedAt = '2026-05-14';
    const evidence = { capturedAt };
    expect(isStaleByPolicy(evidence, 'pricing', ASOF)).toBe(true);
  });

  test('evidence 10 days old is NOT stale for pricing (45-day policy)', () => {
    // 10 days before 2026-07-03 = 2026-06-23
    const capturedAt = '2026-06-23';
    const evidence = { capturedAt };
    expect(isStaleByPolicy(evidence, 'pricing', ASOF)).toBe(false);
  });

  test('uses effectiveDate when capturedAt is absent', () => {
    const evidence = { effectiveDate: '2026-06-23' };
    expect(isStaleByPolicy(evidence, 'pricing', ASOF)).toBe(false);
  });

  test('evidence 8 days old IS stale for weather (7-day policy)', () => {
    // 8 days before 2026-07-03 = 2026-06-25
    const evidence = { capturedAt: '2026-06-25' };
    expect(isStaleByPolicy(evidence, 'weather', ASOF)).toBe(true);
  });

  test('evidence 6 days old is NOT stale for weather', () => {
    const evidence = { capturedAt: '2026-06-27' };
    expect(isStaleByPolicy(evidence, 'weather', ASOF)).toBe(false);
  });
});

// ── nextResearchDate ──────────────────────────────────────────────────────────

describe('nextResearchDate', () => {
  test('returns null when lastResearchedAt is missing', () => {
    expect(nextResearchDate(null, 'pricing')).toBeNull();
    expect(nextResearchDate('', 'pricing')).toBeNull();
  });

  test('pricing: 2026-01-01 + 45 days = 2026-02-15', () => {
    expect(nextResearchDate('2026-01-01', 'pricing')).toBe('2026-02-15');
  });

  test('weather: 2026-07-01 + 7 days = 2026-07-08', () => {
    expect(nextResearchDate('2026-07-01', 'weather')).toBe('2026-07-08');
  });

  test('cultural: advances by 730 days', () => {
    const result = nextResearchDate('2026-01-01', 'cultural');
    // 730 days from 2026-01-01: 365 → 2027-01-01, 365 more → 2028-01-01
    expect(result).toBe('2028-01-01');
  });

  test('returns an ISO date string (YYYY-MM-DD)', () => {
    const result = nextResearchDate('2026-06-01', 'pricing');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('unknown kind uses grounding fallback (365 days)', () => {
    const result = nextResearchDate('2026-01-01', 'nonexistent');
    expect(nextResearchDate('2026-01-01', 'grounding')).toBe(result);
  });
});

// ── shouldRetry ───────────────────────────────────────────────────────────────

describe('shouldRetry', () => {
  test('returns false for corrupt failure (never retry)', () => {
    expect(shouldRetry('corrupt', 0, 'pricing')).toBe(false);
  });

  test('returns false for duplicate failure (never retry)', () => {
    expect(shouldRetry('duplicate', 0, 'pricing')).toBe(false);
  });

  test('returns true for timeout on first attempt (pricing allows 3 retries)', () => {
    expect(shouldRetry('timeout', 0, 'pricing')).toBe(true);
  });

  test('returns false for timeout when attemptCount >= retryAttempts (pricing = 3)', () => {
    expect(shouldRetry('timeout', 3, 'pricing')).toBe(false);
  });

  test('returns false when attemptCount exceeds retryAttempts', () => {
    expect(shouldRetry('timeout', 99, 'pricing')).toBe(false);
  });

  test('unavailable is not retried by default (retry=false in recovery table)', () => {
    expect(shouldRetry('unavailable', 0, 'pricing')).toBe(false);
  });

  test('partial failure is retried on first attempt', () => {
    expect(shouldRetry('partial', 0, 'pricing')).toBe(true);
  });

  test('unknown failure is retried once', () => {
    expect(shouldRetry('unknown', 0, 'pricing')).toBe(true);
  });

  test('respects per-kind retryAttempts (quantity allows 2 retries)', () => {
    expect(shouldRetry('timeout', 1, 'quantity')).toBe(true);
    expect(shouldRetry('timeout', 2, 'quantity')).toBe(false);
  });
});

// ── classifyFailure ───────────────────────────────────────────────────────────

describe('classifyFailure', () => {
  test('classifies "Request timed out" as timeout', () => {
    expect(classifyFailure(new Error('Request timed out'))).toBe('timeout');
  });

  test('classifies "timeout" keyword as timeout', () => {
    expect(classifyFailure(new Error('Connection timeout after 8000ms'))).toBe('timeout');
  });

  test('classifies "503 Service unavailable" as unavailable', () => {
    expect(classifyFailure(new Error('503 Service unavailable'))).toBe('unavailable');
  });

  test('classifies "server is down" as unavailable', () => {
    expect(classifyFailure(new Error('server is down for maintenance'))).toBe('unavailable');
  });

  test('classifies "duplicate record" as duplicate', () => {
    expect(classifyFailure(new Error('duplicate record found'))).toBe('duplicate');
  });

  test('classifies "corrupt JSON" as corrupt', () => {
    expect(classifyFailure(new Error('corrupt JSON response'))).toBe('corrupt');
  });

  test('classifies "invalid json" as corrupt', () => {
    expect(classifyFailure(new Error('invalid json at position 0'))).toBe('corrupt');
  });

  test('classifies unrecognized errors as unknown', () => {
    expect(classifyFailure(new Error('random error message'))).toBe('unknown');
    expect(classifyFailure(new Error('something went wrong'))).toBe('unknown');
  });

  test('classifies partial/incomplete data errors', () => {
    expect(classifyFailure(new Error('partial response returned'))).toBe('partial');
    expect(classifyFailure(new Error('incomplete data set'))).toBe('partial');
  });

  test('handles non-Error arguments gracefully', () => {
    expect(classifyFailure('timed out')).toBe('timeout');
    expect(classifyFailure('unknown problem')).toBe('unknown');
  });
});
