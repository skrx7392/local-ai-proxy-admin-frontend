import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dateToLocalInput,
  localInputToIso,
  resolveExpiryIso,
} from '../expiry';
import { RegistrationTokenFormSchema } from '../schemas';

const NOW = new Date('2026-07-08T12:00:00.000Z');

describe('expiry helpers', () => {
  it('resolves duration presets relative to the provided now', () => {
    expect(resolveExpiryIso('24h', '', NOW)).toBe('2026-07-09T12:00:00.000Z');
    expect(resolveExpiryIso('7d', '', NOW)).toBe('2026-07-15T12:00:00.000Z');
    expect(resolveExpiryIso('30d', '', NOW)).toBe('2026-08-07T12:00:00.000Z');
  });

  it('resolves "never" to undefined (no expiry)', () => {
    expect(resolveExpiryIso('never', '', NOW)).toBeUndefined();
  });

  it('resolves "custom" by converting the local datetime input to UTC ISO', () => {
    const local = '2026-12-31T18:30';
    expect(resolveExpiryIso('custom', local, NOW)).toBe(
      new Date(local).toISOString(),
    );
  });

  it('resolves "custom" with unparseable input to undefined', () => {
    expect(resolveExpiryIso('custom', '', NOW)).toBeUndefined();
    expect(resolveExpiryIso('custom', 'garbage', NOW)).toBeUndefined();
  });

  it('localInputToIso returns null for blank or malformed values', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('   ')).toBeNull();
    expect(localInputToIso('not-a-date')).toBeNull();
  });

  it('dateToLocalInput round-trips through localInputToIso at minute precision', () => {
    const d = new Date('2026-07-15T09:45:00');
    const iso = localInputToIso(dateToLocalInput(d));
    expect(iso).toBe(d.toISOString());
  });
});

describe('RegistrationTokenFormSchema expiry (defense in depth)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const base = {
    name: 'ops-onboarding',
    credit_grant: '5',
    max_uses: '',
    expiry_custom: '',
  };

  it('emits expires_at as UTC ISO for a duration preset', () => {
    const parsed = RegistrationTokenFormSchema.parse({
      ...base,
      expiry_preset: '24h',
    });
    expect(parsed.expires_at).toBe('2026-07-09T12:00:00.000Z');
  });

  it('omits expires_at for the "never" preset', () => {
    const parsed = RegistrationTokenFormSchema.parse({
      ...base,
      expiry_preset: 'never',
    });
    expect(parsed.expires_at).toBeUndefined();
  });

  it('emits the custom local datetime as UTC ISO', () => {
    const local = '2026-12-31T18:30';
    const parsed = RegistrationTokenFormSchema.parse({
      ...base,
      expiry_preset: 'custom',
      expiry_custom: local,
    });
    expect(parsed.expires_at).toBe(new Date(local).toISOString());
  });

  it('rejects a custom expiry in the past', () => {
    const result = RegistrationTokenFormSchema.safeParse({
      ...base,
      expiry_preset: 'custom',
      expiry_custom: '2020-01-01T00:00',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'expiry_custom',
      );
      expect(issue?.message).toBe('Expiry must be in the future');
    }
  });

  it('rejects a missing custom expiry', () => {
    const result = RegistrationTokenFormSchema.safeParse({
      ...base,
      expiry_preset: 'custom',
      expiry_custom: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'expiry_custom',
      );
      expect(issue?.message).toBe('Pick an expiry date and time');
    }
  });

  it('rejects an unknown preset value', () => {
    const result = RegistrationTokenFormSchema.safeParse({
      ...base,
      expiry_preset: 'sometime',
    });
    expect(result.success).toBe(false);
  });
});
