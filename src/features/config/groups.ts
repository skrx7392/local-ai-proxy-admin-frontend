import type { AdminConfig } from './schemas';

export type ConfigFieldKey = keyof AdminConfig;

export type ConfigGroup = {
  id: 'backend' | 'limits' | 'auth' | 'observability' | 'build';
  label: string;
  fields: readonly { key: ConfigFieldKey; label: string; render?: (v: AdminConfig[ConfigFieldKey]) => string }[];
};

// Formatter for byte-sized values so the `max_request_body_bytes` row
// shows "50 MiB" instead of "52428800". Binary (1024) to match how
// request-body limits are usually discussed operationally.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB'] as const;
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const rounded = v >= 10 ? Math.round(v).toString() : v.toFixed(1);
  return `${rounded} ${units[i]}`;
}

// Grouping per PLAN.md FE G scope: "Backend / Limits / Observability / Build".
// Fields inside each group stay in the order an operator expects to scan them
// (most impactful first), not alphabetical.
export const CONFIG_GROUPS: readonly ConfigGroup[] = [
  {
    id: 'backend',
    label: 'Backend',
    fields: [
      { key: 'ollama_url', label: 'Ollama URL' },
      { key: 'port', label: 'Port' },
      { key: 'log_level', label: 'Log level' },
      { key: 'cors_origins', label: 'CORS origins' },
      { key: 'nodes_file', label: 'Nodes file' },
      { key: 'models_list_all', label: 'List all models' },
    ],
  },
  {
    id: 'limits',
    label: 'Limits',
    fields: [
      {
        key: 'max_request_body_bytes',
        label: 'Max request body',
        render: (v) => formatBytes(v as number),
      },
      {
        key: 'max_json_request_body_bytes',
        label: 'Max JSON body',
        render: (v) => formatBytes(v as number),
      },
      {
        key: 'admin_rate_limit_per_minute',
        label: 'Admin rate limit (per min)',
      },
      {
        key: 'default_credit_grant',
        label: 'Default credit grant',
        render: (v) => `${(v as number).toFixed(2)} credits`,
      },
      {
        key: 'admin_session_duration_hours',
        label: 'Admin session duration',
        render: (v) => `${v} h`,
      },
      {
        key: 'user_session_duration_hours',
        label: 'User session duration',
        render: (v) => `${v} h`,
      },
    ],
  },
  {
    // 2026-07 security hardening — auth throttles. Optional on the schema
    // (older backends omit them); missing values render as "—".
    id: 'auth',
    label: 'Auth limits',
    fields: [
      {
        key: 'auth_login_rate_limit_per_minute',
        label: 'Login rate limit (per min)',
      },
      {
        key: 'auth_login_email_rate_limit_per_minute',
        label: 'Login per-email limit (per min)',
      },
      {
        key: 'auth_register_rate_limit_per_minute',
        label: 'Register rate limit (per min)',
      },
      {
        key: 'auth_general_rate_limit_per_minute',
        label: 'General auth limit (per min)',
      },
      {
        key: 'auth_bcrypt_max_concurrent',
        label: 'Bcrypt max concurrent',
      },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    fields: [
      {
        key: 'usage_channel_capacity',
        label: 'Usage channel capacity',
      },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    fields: [
      { key: 'version', label: 'Version' },
      { key: 'build_time', label: 'Build time' },
      { key: 'go_version', label: 'Go version' },
    ],
  },
];
