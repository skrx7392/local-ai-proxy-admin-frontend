import { z } from 'zod';

// Matches the anonymous userResponse struct in
// internal/admin/admin.go::listUsers. Backend serializes CreatedAt via
// RFC3339 so a plain string is correct.
export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// Activate / deactivate responses are both {status: "activated"|"deactivated"}
// — we don't parse them because they're not consumed by the UI beyond
// "the mutation succeeded". Kept here as a sanity schema in case a caller
// wants to verify.
export const UserActivationResponseSchema = z.object({
  status: z.enum(['activated', 'deactivated']),
});

// Detail response from GET /users/:id and PUT /users/:id/role. Adds
// `account_id` (nullable) and `updated_at` on top of the list shape.
export const UserDetailSchema = UserSchema.extend({
  account_id: z.number().int().nullable(),
  updated_at: z.string(),
});

export type UserDetail = z.infer<typeof UserDetailSchema>;

export const UserRoles = ['admin', 'user'] as const;
export type UserRole = (typeof UserRoles)[number];
