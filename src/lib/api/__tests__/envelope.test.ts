import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseEnvelope } from '../envelope';

const Item = z.object({ id: z.number(), name: z.string() });

describe('parseEnvelope', () => {
  it('parses the { data, pagination } envelope', () => {
    const raw = {
      data: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      pagination: { limit: 10, offset: 0, total: 2 },
    };
    const result = parseEnvelope(raw, Item);
    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({ limit: 10, offset: 0, total: 2 });
  });

  it('throws when pagination is missing (strict envelope)', () => {
    expect(() =>
      parseEnvelope({ data: [{ id: 1, name: 'a' }] }, Item),
    ).toThrow();
  });

  it('throws on items that fail the item schema', () => {
    const raw = {
      data: [{ id: 'not-a-number', name: 'a' }],
      pagination: { limit: 10, offset: 0, total: 1 },
    };
    expect(() => parseEnvelope(raw, Item)).toThrow();
  });

  it('throws on a malformed pagination block', () => {
    const raw = {
      data: [{ id: 1, name: 'a' }],
      pagination: { limit: -1, offset: 0, total: 1 },
    };
    expect(() => parseEnvelope(raw, Item)).toThrow();
  });

  it('throws on non-envelope shapes', () => {
    expect(() => parseEnvelope([{ id: 1, name: 'a' }], Item)).toThrow();
    expect(() => parseEnvelope({ something: 'else' }, Item)).toThrow();
    expect(() => parseEnvelope(null, Item)).toThrow();
    expect(() => parseEnvelope('string', Item)).toThrow();
  });
});
