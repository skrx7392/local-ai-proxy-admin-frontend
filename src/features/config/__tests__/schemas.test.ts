import { describe, expect, it } from 'vitest';

import { AdminConfigSchema } from '../schemas';

const SAMPLE = {
  ollama_url: 'http://ollama.local:11434',
  port: '8080',
  log_level: 'info',
  max_request_body_bytes: 52_428_800,
  default_credit_grant: 1.5,
  cors_origins: '*',
  admin_rate_limit_per_minute: 10,
  usage_channel_capacity: 1000,
  admin_session_duration_hours: 6,
  user_session_duration_hours: 168,
  version: 'abc1234',
  build_time: '2026-04-15T00:00:00Z',
  go_version: 'go1.26.0',
} as const;

describe('AdminConfigSchema', () => {
  it('parses a whitelisted snapshot', () => {
    const parsed = AdminConfigSchema.parse(SAMPLE);
    expect(parsed.version).toBe('abc1234');
    expect(parsed.admin_session_duration_hours).toBe(6);
  });

  it('rejects unknown fields (second-fence against a leak)', () => {
    expect(() =>
      AdminConfigSchema.parse({ ...SAMPLE, admin_key: 'sk-leaked' }),
    ).toThrow();
    expect(() =>
      AdminConfigSchema.parse({ ...SAMPLE, database_url: 'postgres://...' }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    const { version: _v, ...missing } = SAMPLE;
    void _v;
    expect(() => AdminConfigSchema.parse(missing)).toThrow();
  });

  it('rejects negative numeric fields', () => {
    expect(() =>
      AdminConfigSchema.parse({ ...SAMPLE, admin_rate_limit_per_minute: -1 }),
    ).toThrow();
  });
});
