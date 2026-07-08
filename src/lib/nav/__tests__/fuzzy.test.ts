import { describe, expect, it } from 'vitest';

import { fuzzyFilter, fuzzyScore } from '../fuzzy';

describe('fuzzyScore', () => {
  it('matches everything on an empty (or whitespace) query', () => {
    expect(fuzzyScore('Dashboard', '')).toBe(0);
    expect(fuzzyScore('Dashboard', '   ')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(fuzzyScore('Keys', 'KEYS')).not.toBeNull();
    expect(fuzzyScore('keys', 'Keys')).not.toBeNull();
  });

  it('returns null when the query is not a subsequence of the text', () => {
    expect(fuzzyScore('Users', 'usg')).toBeNull();
    expect(fuzzyScore('Keys', 'zzz')).toBeNull();
  });

  it('matches non-contiguous subsequences', () => {
    // u·s·g appear in order in "Usage" but not contiguously.
    expect(fuzzyScore('Usage', 'usg')).not.toBeNull();
    expect(fuzzyScore('Registration tokens', 'rtok')).not.toBeNull();
  });

  it('ranks prefix > substring > scattered subsequence', () => {
    const prefix = fuzzyScore('Usage', 'usa');
    const substring = fuzzyScore('Thousand', 'usa');
    const subsequence = fuzzyScore('Uppsala', 'usa');
    expect(prefix).not.toBeNull();
    expect(substring).not.toBeNull();
    expect(subsequence).not.toBeNull();
    expect(prefix!).toBeGreaterThan(substring!);
    expect(substring!).toBeGreaterThan(subsequence!);
  });
});

describe('fuzzyFilter', () => {
  const labels = [
    'Dashboard',
    'Usage',
    'Keys',
    'Users',
    'Accounts',
    'Pricing',
    'Nodes',
    'Registration tokens',
    'Registrations',
    'Config',
  ];

  it('returns every item in original order for an empty query', () => {
    expect(fuzzyFilter(labels, '', (l) => l)).toEqual(labels);
  });

  it('drops items that do not match', () => {
    expect(fuzzyFilter(labels, 'usg', (l) => l)).toEqual(['Usage']);
  });

  it('keeps all fuzzy matches, best first', () => {
    const result = fuzzyFilter(labels, 'reg', (l) => l);
    expect(result).toHaveLength(2);
    expect(result).toContain('Registration tokens');
    expect(result).toContain('Registrations');
  });

  it('puts an exact-name match first', () => {
    const result = fuzzyFilter(labels, 'keys', (l) => l);
    expect(result[0]).toBe('Keys');
  });
});
