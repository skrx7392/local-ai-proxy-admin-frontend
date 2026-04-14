import { z, type ZodType } from 'zod';

// Response parsing that tolerates both the envelope shape and the legacy
// bare array during the BE PR 4 → PR 7 transition. PR 4 made envelope
// opt-in via ?envelope=1; PR 7 will flip it on by default. FE PR D will
// drop this helper once we're committed to envelope-only.
//
// Usage:
//   const { data, pagination } = legacyOrEnvelope(raw, UserSchema);
//
// `raw` is the JSON body returned by `apiFetch` (already parsed).
// `item` is the Zod schema for a single list item.

export const PaginationSchema = z.object({
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export type EnvelopeResult<T> = {
  data: T[];
  pagination?: Pagination | undefined;
};

export function legacyOrEnvelope<T>(
  raw: unknown,
  item: ZodType<T>,
): EnvelopeResult<T> {
  // Envelope shape: { data: [...], pagination: {...} }
  if (
    raw !== null &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    'data' in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    const envelope = z
      .object({
        data: z.array(item),
        pagination: PaginationSchema.optional(),
      })
      .parse(raw);
    return { data: envelope.data, pagination: envelope.pagination };
  }

  // Legacy bare array.
  return { data: z.array(item).parse(raw) };
}
