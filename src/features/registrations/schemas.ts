import { z } from 'zod';

// Matches internal/admin/admin.go::registrationEventDTO. `metadata` is the
// decoded JSON payload when it parsed, otherwise the raw string — both are
// shown in the row detail expansion so the permissive shape is intentional.
export const RegistrationEventSchema = z.object({
  id: z.number().int(),
  kind: z.string(),
  source: z.string(),
  user_id: z.number().int().nullable(),
  user_email: z.string().nullable(),
  user_name: z.string().nullable(),
  account_id: z.number().int().nullable(),
  account_name: z.string().nullable(),
  account_type: z.string().nullable(),
  registration_token_id: z.number().int().nullable(),
  metadata: z.unknown().nullable(),
  created_at: z.string(),
});

export type RegistrationEvent = z.infer<typeof RegistrationEventSchema>;
