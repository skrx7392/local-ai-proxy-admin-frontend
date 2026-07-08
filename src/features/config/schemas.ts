import { z } from 'zod';

// Mirrors internal/admin/config_health.go::ConfigSnapshot. The backend
// encodes the struct directly (no envelope) — do NOT route this through
// parseEnvelope / parseDataEnvelope.
//
// This schema used to be `.strict()` as a "second fence" against secret
// leaks. That fence caused the 2026-07-08 P0: the backend's snapshot grew
// 8 whitelisted fields (2026-07 security hardening) and strict parsing
// rejected the ENTIRE payload, blanking /config. Unknown keys are now
// STRIPPED (zod's default): additive backend drift can never break the
// page, and the render whitelist stays CONFIG_GROUPS — a field the FE
// doesn't explicitly list is never displayed, so a leaked secret still
// can't reach the UI. The leak fence proper lives on the backend
// (ConfigSnapshot is itself a whitelist).
//
// Post-launch backend additions are declared optional so a newer FE can
// render them without a schema change, while older backends still parse.
export const AdminConfigSchema = z.object({
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
  // Added by the 2026-07 backend security hardening — optional so the FE
  // also accepts snapshots from backends that predate them.
  max_json_request_body_bytes: z.number().int().nonnegative().optional(),
  auth_login_rate_limit_per_minute: z.number().int().nonnegative().optional(),
  auth_login_email_rate_limit_per_minute: z
    .number()
    .int()
    .nonnegative()
    .optional(),
  auth_register_rate_limit_per_minute: z
    .number()
    .int()
    .nonnegative()
    .optional(),
  auth_general_rate_limit_per_minute: z
    .number()
    .int()
    .nonnegative()
    .optional(),
  auth_bcrypt_max_concurrent: z.number().int().nonnegative().optional(),
  models_list_all: z.boolean().optional(),
  nodes_file: z.string().optional(),
});

export type AdminConfig = z.infer<typeof AdminConfigSchema>;
