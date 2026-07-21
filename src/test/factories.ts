import type { ModelUsage } from '@/features/usage/schemas';

// Complete ModelUsage with neutral defaults so tests only state the fields
// they assert on. Wire-shape completeness is enforced by the Zod schema
// (schemas.test.ts); this keeps unrelated inline literals from breaking
// every time the wire grows a field.
export function makeModelUsage(
  overrides: Partial<ModelUsage> & Pick<ModelUsage, 'model'>,
): ModelUsage {
  return {
    requests: 0,
    total_tokens: 0,
    credits: 0,
    avg_duration_ms: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    tok_per_sec: null,
    p50_duration_ms: null,
    p95_duration_ms: null,
    error_count: 0,
    partial_count: 0,
    ...overrides,
  };
}
