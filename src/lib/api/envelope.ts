import { z, type ZodType } from 'zod';

// FE PR D — envelope is the only shape we accept now. `apiFetch` auto-appends
// `envelope=1` on every GET, so every list response is `{ data, pagination }`.
// BE PR 7 will flip the server-side default; this helper is stable either way.

export const PaginationSchema = z.object({
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export type EnvelopeResult<T> = {
  data: T[];
  pagination: Pagination;
};

export function parseEnvelope<T>(
  raw: unknown,
  item: ZodType<T>,
): EnvelopeResult<T> {
  return z
    .object({
      data: z.array(item),
      pagination: PaginationSchema,
    })
    .parse(raw);
}
