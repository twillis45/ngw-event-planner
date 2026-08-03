// Span intelligence — "one day or several?" answered in ONE place.
//
// The rule under test is never "guess a length". It is: say what is known, say
// what is merely suggested, and ASK when the difference matters.
import { spanIntel, shouldAskSpan, typeIsMultiDay } from '../eventSpan';

const base = { id: 'e', type: 'Birthday', date: '2028-06-17' };

describe('a span the host actually gave outranks everything', () => {
  test('endDate makes it multi with a real day count', () => {
    const s = spanIntel({ ...base, endDate: '2028-06-21' });
    expect(s.state).toBe('multi');
    expect(s.days).toBe(5);
    expect(s.basis).toBe('host-span');
    expect(s.shouldAsk).toBe(false);
  });

  test('a same-day endDate is a single day, not a zero-night span', () => {
    const s = spanIntel({ ...base, endDate: '2028-06-17' });
    expect(s.state).toBe('single');
  });
});

describe('signals SUGGEST multi-day — they never establish it', () => {
  test('a destination birthday is asked about, not assumed', () => {
    const s = spanIntel({ ...base, isDestination: true });
    expect(s.state).toBe('unasked');
    expect(s.shouldAsk).toBe(true);
    // The crucial part: no invented length.
    expect(s.days).toBeNull();
    expect(s.why).toMatch(/more than one day/i);
    expect(s.signals).toContain('it is a destination event');
  });

  test('guests flying in is a real signal', () => {
    expect(spanIntel({ ...base, travelMode: 'fly' }).state).toBe('unasked');
  });

  test('driving in is NOT a multi-day signal on its own', () => {
    expect(spanIntel({ ...base, travelMode: 'drive' }).state).toBe('single');
  });

  test('overnight guests is a real signal', () => {
    expect(spanIntel({ ...base, guestsStayOvernight: true }).state).toBe('unasked');
  });

  test('an ABSENT overnight answer is "not told", never a no', () => {
    // Absent must behave like the plain event, not like guestsStayOvernight:false.
    expect(spanIntel({ ...base }).state).toBe('single');
    expect(spanIntel({ ...base, guestsStayOvernight: false }).state).toBe('single');
  });

  test('several signals are all named, so the ask can say WHY', () => {
    const s = spanIntel({ ...base, isDestination: true, travelMode: 'fly', guestsStayOvernight: true });
    expect(s.signals).toHaveLength(3);
    expect(s.why).toMatch(/and/);
  });
});

describe('types that are multi-day BY DEFINITION', () => {
  test('the taxonomy flag is the source, not a hardcoded list here', () => {
    expect(typeIsMultiDay('Conference')).toBe(true);
    expect(typeIsMultiDay('Team Retreat')).toBe(true);
    expect(typeIsMultiDay('Birthday')).toBe(false);
  });

  test('a conference spans by definition — but the LENGTH is still unknown', () => {
    const s = spanIntel({ id: 'c', type: 'Conference', date: '2028-06-17' });
    expect(s.state).toBe('multi');
    expect(s.days).toBeNull();     // never invented
    expect(s.shouldAsk).toBe(true); // we know it spans, not how far
  });

  test('a dated span still beats the type default', () => {
    const s = spanIntel({ id: 'c', type: 'Conference', date: '2028-06-17', endDate: '2028-06-19' });
    expect(s.days).toBe(3);
    expect(s.basis).toBe('host-span');
  });
});

describe('the plain case stays plain', () => {
  test('a local one-day birthday is single and asks nothing', () => {
    const s = spanIntel(base);
    expect(s.state).toBe('single');
    expect(shouldAskSpan(base)).toBe(false);
  });

  test('it labels the single day as ASSUMED, not established', () => {
    expect(spanIntel(base).basis).toBe('assumed-single');
  });

  test('it degrades safely', () => {
    expect(spanIntel(null).state).toBe('single');
    expect(spanIntel({}).basis).toBe('unknown');
  });
});
