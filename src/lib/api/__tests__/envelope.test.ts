import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { legacyOrEnvelope } from '../envelope';

const Item = z.object({ id: z.number(), name: z.string() });

describe('legacyOrEnvelope', () => {
  it('parses envelope shape with pagination', () => {
    const raw = {
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      pagination: { limit: 10, offset: 0, total: 2 },
    };
    const result = legacyOrEnvelope(raw, Item);
    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({ limit: 10, offset: 0, total: 2 });
  });

  it('parses envelope shape without pagination', () => {
    const raw = { data: [{ id: 1, name: 'a' }] };
    const result = legacyOrEnvelope(raw, Item);
    expect(result.data).toHaveLength(1);
    expect(result.pagination).toBeUndefined();
  });

  it('parses legacy bare-array shape', () => {
    const raw = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const result = legacyOrEnvelope(raw, Item);
    expect(result.data).toHaveLength(2);
    expect(result.pagination).toBeUndefined();
  });

  it('throws on items that fail the item schema', () => {
    const raw = { data: [{ id: 'not-a-number', name: 'a' }] };
    expect(() => legacyOrEnvelope(raw, Item)).toThrow();
  });

  it('throws on a malformed pagination block', () => {
    const raw = {
      data: [{ id: 1, name: 'a' }],
      pagination: { limit: -1, offset: 0, total: 1 },
    };
    expect(() => legacyOrEnvelope(raw, Item)).toThrow();
  });

  it('throws on non-array, non-envelope shapes', () => {
    expect(() => legacyOrEnvelope({ something: 'else' }, Item)).toThrow();
    expect(() => legacyOrEnvelope(null, Item)).toThrow();
    expect(() => legacyOrEnvelope('string', Item)).toThrow();
  });
});
