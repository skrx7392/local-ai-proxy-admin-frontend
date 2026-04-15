import { z } from 'zod';

// Mirrors internal/admin/config_health.go::ConfigSnapshot. The backend
// encodes the struct directly (no envelope) — do NOT route this through
// parseEnvelope / parseDataEnvelope.
//
// The whitelist lives on the backend; this schema is a second fence that
// rejects unknown fields so a future snapshot addition is a conscious FE
// change rather than something that silently renders "undefined".
export const AdminConfigSchema = z
  .object({
    ollama_url: z.string(),
    port: z.string(),
    log_level: z.string(),
    max_request_body_bytes: z.number().int().nonnegative(),
    default_credit_grant: z.number().nonnegative(),
    cors_origins: z.string(),
    admin_rate_limit_per_minute: z.number().int().nonnegative(),
    usage_channel_capacity: z.number().int().nonnegative(),
    admin_session_duration_hours: z.number().int().nonnegative(),
    user_session_duration_hours: z.number().int().nonnegative(),
    version: z.string(),
    build_time: z.string(),
    go_version: z.string(),
  })
  .strict();

export type AdminConfig = z.infer<typeof AdminConfigSchema>;
