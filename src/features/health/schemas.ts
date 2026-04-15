import { z } from 'zod';

// Mirrors internal/health/health.go::CheckResult. LatencyMs / Error / Depth /
// Capacity are `omitempty`, so treat them as optional at the wire.
export const HealthCheckResultSchema = z.object({
  status: z.enum(['ok', 'error']),
  latency_ms: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
  queue_depth: z.number().int().nonnegative().optional(),
  queue_capacity: z.number().int().nonnegative().optional(),
});
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

// Mirrors internal/admin/config_health.go::getHealth. Top-level `status` is
// `ok` (HTTP 200) or `degraded` (HTTP 503). The BFF hook intentionally
// accepts a 503 body — degraded is a first-class UI state, not an error.
export const AdminHealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.record(z.string(), HealthCheckResultSchema),
  uptime_seconds: z.number().int().nonnegative(),
  version: z.string(),
});
export type AdminHealth = z.infer<typeof AdminHealthSchema>;
