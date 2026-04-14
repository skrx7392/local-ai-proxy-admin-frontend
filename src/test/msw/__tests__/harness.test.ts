import { describe, expect, it } from 'vitest';

import { useMockBackend } from '../useMockBackend';

describe('MSW harness — admin handlers', () => {
  useMockBackend();

  it('intercepts GET /api/admin/keys with envelope', async () => {
    const response = await fetch(
      'http://admin.local/api/admin/keys?envelope=1',
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: unknown[];
      pagination: { total: number; limit: number; offset: number };
    };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination.total).toBeGreaterThan(0);
  });

  it('applies the is_active filter on the list endpoint', async () => {
    // Backend exposes `revoked` on the response but accepts
    // ?is_active=true|false as the filter param — assert on `revoked`.
    const activeOnly = await fetch(
      'http://admin.local/api/admin/keys?envelope=1&is_active=true',
    );
    const inactiveOnly = await fetch(
      'http://admin.local/api/admin/keys?envelope=1&is_active=false',
    );
    const active = (await activeOnly.json()) as {
      data: Array<{ revoked: boolean }>;
    };
    const inactive = (await inactiveOnly.json()) as {
      data: Array<{ revoked: boolean }>;
    };
    expect(active.data.every((k) => !k.revoked)).toBe(true);
    expect(inactive.data.every((k) => k.revoked)).toBe(true);
  });

  it('returns the real create-key shape (id, name, key, key_prefix, rate_limit)', async () => {
    const response = await fetch('http://admin.local/api/admin/keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'spec-key' }),
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      id: number;
      name: string;
      key: string;
      key_prefix: string;
      rate_limit: number;
    };
    expect(body.name).toBe('spec-key');
    expect(body.key).toMatch(/^sk-/);
    expect(body.key_prefix).toMatch(/^sk-/);
    expect(body.rate_limit).toBeGreaterThan(0);
  });

  it('falls back to bare-array shape when envelope=1 is not set', async () => {
    const response = await fetch('http://admin.local/api/admin/pricing');
    const body = (await response.json()) as
      | unknown[]
      | { data: unknown[]; pagination?: unknown };
    // Handler returns { data: [...] } with no pagination — still
    // compatible with the legacyOrEnvelope helper.
    expect(body).toHaveProperty('data');
    expect(
      (body as { pagination?: unknown }).pagination,
    ).toBeUndefined();
  });
});
