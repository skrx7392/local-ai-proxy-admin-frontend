import { describe, expect, it } from 'vitest';

import { CONFIG_GROUPS } from '../groups';
import { AdminConfigSchema } from '../schemas';

describe('CONFIG_GROUPS', () => {
  it('covers every key on AdminConfigSchema exactly once', () => {
    const schemaKeys = new Set(
      Object.keys(AdminConfigSchema.shape) as (keyof typeof AdminConfigSchema.shape)[],
    );
    const seen = new Set<string>();
    for (const group of CONFIG_GROUPS) {
      for (const field of group.fields) {
        expect(seen.has(field.key)).toBe(false);
        seen.add(field.key);
        expect(schemaKeys.has(field.key)).toBe(true);
      }
    }
    expect(seen.size).toBe(schemaKeys.size);
  });

  it('formats max_request_body_bytes as a binary size string', () => {
    const field = CONFIG_GROUPS.find((g) => g.id === 'limits')!
      .fields.find((f) => f.key === 'max_request_body_bytes')!;
    expect(field.render!(52_428_800)).toBe('50 MiB');
    expect(field.render!(1024)).toMatch(/KiB/);
    expect(field.render!(512)).toBe('512 B');
  });

  it('suffixes session durations with hours', () => {
    const limits = CONFIG_GROUPS.find((g) => g.id === 'limits')!;
    const admin = limits.fields.find((f) => f.key === 'admin_session_duration_hours')!;
    expect(admin.render!(6)).toBe('6 h');
  });
});
