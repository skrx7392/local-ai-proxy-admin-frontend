import { describe, expect, it } from 'vitest';

import { adminConfig } from '@/test/msw/fixtures';

import { AdminConfigSchema } from '../schemas';

// The 13 fields FE PR G shipped with — the minimum contract the page renders.
const BASE = {
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
  it('parses the original 13-field snapshot', () => {
    const parsed = AdminConfigSchema.parse(BASE);
    expect(parsed.version).toBe('abc1234');
    expect(parsed.admin_session_duration_hours).toBe(6);
  });

  it('parses the full live snapshot (post security-hardening additive fields)', () => {
    // `adminConfig` mirrors what the backend serves today, including the
    // 8 fields added after FE PR G. This is the exact payload that broke
    // /config on 2026-07-08 when the schema was `.strict()`.
    const parsed = AdminConfigSchema.parse(adminConfig);
    expect(parsed.version).toBe(adminConfig.version);
    expect(parsed.max_request_body_bytes).toBe(
      adminConfig.max_request_body_bytes,
    );
  });

  it('ignores unknown fields instead of failing the whole page', () => {
    // Additive backend drift must never blank /config (P0 2026-07-08).
    // Unknown keys are STRIPPED — the render whitelist is CONFIG_GROUPS,
    // so a leaked field still never reaches the UI.
    const parsed = AdminConfigSchema.parse({
      ...BASE,
      admin_key: 'sk-leaked',
    });
    expect('admin_key' in parsed).toBe(false);
    expect(parsed.version).toBe('abc1234');
  });

  it('rejects missing required fields', () => {
    const { version: _v, ...missing } = BASE;
    void _v;
    expect(() => AdminConfigSchema.parse(missing)).toThrow();
  });

  it('rejects negative numeric fields', () => {
    expect(() =>
      AdminConfigSchema.parse({ ...BASE, admin_rate_limit_per_minute: -1 }),
    ).toThrow();
  });
});
