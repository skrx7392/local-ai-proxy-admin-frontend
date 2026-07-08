import { z } from 'zod';

// Wire shape of a node. Matches internal/admin/nodes.go::nodeDTO — stored
// config (auth_header MASKED, e.g. "Bearer sk-…abcd") joined with live
// registry state (health / models / last_error / last_checked_at).

export const NODE_BACKEND_TYPES = ['ollama', 'openai_compat'] as const;
export type NodeBackendType = (typeof NODE_BACKEND_TYPES)[number];

// "unhealthy" is confirmed-down: the poller only flips healthy → unhealthy
// after 2 consecutive probe failures (hysteresis). "unknown" = not probed
// yet (disabled, or created before any probe reached it).
export const NODE_HEALTH_STATES = ['healthy', 'unhealthy', 'unknown'] as const;
export type NodeHealth = (typeof NODE_HEALTH_STATES)[number];

export const NodeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  base_url: z.string(),
  backend_type: z.enum(NODE_BACKEND_TYPES),
  // MASKED on every read path; null = no auth header configured.
  auth_header: z.string().nullable(),
  // null = model list is discovered by probing; non-null list is authoritative.
  static_models: z.array(z.string()).nullable(),
  health_path: z.string().nullable(),
  timeout_seconds: z.number().int().nullable(),
  enabled: z.boolean(),
  source: z.enum(['api', 'config']),
  created_at: z.string(),
  updated_at: z.string(),
  health: z.enum(NODE_HEALTH_STATES),
  models: z.array(z.string()),
  // `omitempty` on the wire — absent when the last probe succeeded.
  last_error: z.string().optional(),
  last_checked_at: z.string().nullable(),
});

export type Node = z.infer<typeof NodeSchema>;

// ---- Form schema (shared by create + edit dialogs) ----------------------

// auth_mode drives the PUT tri-state for the masked secret:
//   keep    → auth_header ABSENT from the payload (backend keeps current)
//   replace → auth_header = new raw value
//   clear   → auth_header = "" (backend clears)
// The masked read value must NEVER be sent back — the form never prefills it.
export const AUTH_MODES = ['keep', 'replace', 'clear'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

function validateBaseUrl(value: string, ctx: z.RefinementCtx): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Must be a valid URL' });
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    ctx.addIssue({ code: 'custom', message: 'Scheme must be http or https' });
    return;
  }
  if (url.search || url.hash || url.username || url.password) {
    ctx.addIssue({
      code: 'custom',
      message: 'Query, fragment, and userinfo are not allowed',
    });
    return;
  }
  if (url.pathname.replace(/\/+$/, '').endsWith('/v1')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Do not include the /v1 segment — the gateway appends it',
    });
  }
}

export const NodeFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    base_url: z
      .string()
      .trim()
      .min(1, 'Base URL is required')
      .superRefine(validateBaseUrl),
    backend_type: z.enum(NODE_BACKEND_TYPES),
    auth_mode: z.enum(AUTH_MODES),
    auth_header: z.string(),
    // Raw comma/newline-separated input; parsed by parseStaticModels.
    static_models: z.string(),
    health_path: z
      .string()
      .trim()
      .refine((v) => v === '' || (v.startsWith('/') && !v.includes('://')), {
        message: 'Must be a path starting with /',
      }),
    timeout_seconds: z.preprocess(
      (value) => {
        if (value === '' || value === undefined || value === null) return undefined;
        const n = Number(value);
        return Number.isNaN(n) ? value : n;
      },
      z
        .number()
        .int('Must be a whole number')
        .positive('Must be greater than 0')
        .optional(),
    ),
    enabled: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.auth_mode === 'replace' && values.auth_header.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['auth_header'],
        message: 'Enter a new value, or choose Keep / Clear',
      });
    }
  });

export type NodeFormInput = z.input<typeof NodeFormSchema>;
export type NodeFormValues = z.output<typeof NodeFormSchema>;

export function parseStaticModels(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- Wire payloads -------------------------------------------------------

// POST /api/admin/nodes — optional fields are omitted entirely when unset.
export type CreateNodePayload = {
  name: string;
  base_url: string;
  backend_type: NodeBackendType;
  auth_header?: string;
  static_models?: string[];
  health_path?: string;
  timeout_seconds?: number;
};

// PUT /api/admin/nodes/{id} — PATCH-like. The dialog prefills every
// non-secret field, so those are always sent (same-value replace is a
// no-op). Empty values map to the documented "clear" sentinels:
//   static_models: [] → back to probe discovery
//   health_path:   "" → clear
//   timeout_seconds: 0 → default (5 minutes)
// auth_header follows the keep/replace/clear tri-state and is only
// present for replace ("value") or clear ("").
export type UpdateNodePayload = {
  name: string;
  base_url: string;
  backend_type: NodeBackendType;
  auth_header?: string;
  static_models: string[];
  health_path: string;
  timeout_seconds: number;
  enabled: boolean;
};

export function toCreatePayload(values: NodeFormValues): CreateNodePayload {
  const payload: CreateNodePayload = {
    name: values.name,
    base_url: values.base_url,
    backend_type: values.backend_type,
  };
  // Create has no secret to keep — any typed value is sent, empty is omitted
  // (auth_mode only matters for PUT).
  if (values.auth_header.trim() !== '') {
    payload.auth_header = values.auth_header.trim();
  }
  const models = parseStaticModels(values.static_models);
  if (models.length > 0) payload.static_models = models;
  if (values.health_path !== '') payload.health_path = values.health_path;
  if (values.timeout_seconds !== undefined) {
    payload.timeout_seconds = values.timeout_seconds;
  }
  return payload;
}

export function toUpdatePayload(values: NodeFormValues): UpdateNodePayload {
  const payload: UpdateNodePayload = {
    name: values.name,
    base_url: values.base_url,
    backend_type: values.backend_type,
    static_models: parseStaticModels(values.static_models),
    health_path: values.health_path,
    timeout_seconds: values.timeout_seconds ?? 0,
    enabled: values.enabled,
  };
  if (values.auth_mode === 'replace') {
    payload.auth_header = values.auth_header.trim();
  } else if (values.auth_mode === 'clear') {
    payload.auth_header = '';
  }
  return payload;
}

// Prefill for the edit dialog. auth_header deliberately starts empty with
// auth_mode "keep" — the masked value is display-only and never round-trips.
export function nodeToFormValues(node: Node): NodeFormInput {
  return {
    name: node.name,
    base_url: node.base_url,
    backend_type: node.backend_type,
    auth_mode: 'keep',
    auth_header: '',
    static_models: (node.static_models ?? []).join(', '),
    health_path: node.health_path ?? '',
    timeout_seconds:
      node.timeout_seconds !== null ? String(node.timeout_seconds) : '',
    enabled: node.enabled,
  };
}
