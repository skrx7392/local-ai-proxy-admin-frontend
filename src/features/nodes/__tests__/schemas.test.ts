import { describe, expect, it } from 'vitest';

import {
  NodeFormSchema,
  NodeSchema,
  nodeToFormValues,
  parseStaticModels,
  toCreatePayload,
  toUpdatePayload,
  type NodeFormValues,
} from '../schemas';

// Full wire shape — matches internal/admin/nodes.go::nodeDTO.
const wireNode = {
  id: 1,
  name: 'workstation',
  base_url: 'http://192.0.2.10:11434',
  backend_type: 'ollama',
  auth_header: null,
  static_models: null,
  health_path: null,
  timeout_seconds: 900,
  enabled: true,
  source: 'api',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  health: 'healthy',
  models: ['llama3.1:8b', 'qwen3-coder:30b'],
  last_checked_at: '2026-07-07T10:00:00Z',
};

describe('NodeSchema', () => {
  it('parses a healthy api-sourced node (last_error omitted)', () => {
    const parsed = NodeSchema.parse(wireNode);
    expect(parsed.name).toBe('workstation');
    expect(parsed.health).toBe('healthy');
    expect(parsed.last_error).toBeUndefined();
    expect(parsed.models).toEqual(['llama3.1:8b', 'qwen3-coder:30b']);
  });

  it('parses an unhealthy node carrying last_error and a masked auth_header', () => {
    const parsed = NodeSchema.parse({
      ...wireNode,
      id: 2,
      backend_type: 'openai_compat',
      auth_header: 'Bearer sk-…abcd',
      static_models: ['gpt-4o-mini'],
      health: 'unhealthy',
      models: [],
      last_error: 'dial tcp: connection refused',
      last_checked_at: null,
    });
    expect(parsed.auth_header).toBe('Bearer sk-…abcd');
    expect(parsed.static_models).toEqual(['gpt-4o-mini']);
    expect(parsed.last_error).toContain('refused');
    expect(parsed.last_checked_at).toBeNull();
  });

  it('parses a config-sourced node', () => {
    const parsed = NodeSchema.parse({
      ...wireNode,
      source: 'config',
      health: 'unknown',
    });
    expect(parsed.source).toBe('config');
    expect(parsed.health).toBe('unknown');
  });

  it('rejects unexpected backend_type / health / source values', () => {
    expect(() =>
      NodeSchema.parse({ ...wireNode, backend_type: 'vllm' }),
    ).toThrow();
    expect(() => NodeSchema.parse({ ...wireNode, health: 'flapping' })).toThrow();
    expect(() => NodeSchema.parse({ ...wireNode, source: 'file' })).toThrow();
  });
});

describe('NodeFormSchema', () => {
  const valid = {
    name: 'workstation',
    base_url: 'http://192.0.2.10:11434',
    backend_type: 'ollama',
    auth_mode: 'keep',
    auth_header: '',
    static_models: '',
    health_path: '',
    timeout_seconds: '',
    enabled: true,
  };

  it('accepts a minimal valid form', () => {
    const parsed = NodeFormSchema.parse(valid);
    expect(parsed.name).toBe('workstation');
    expect(parsed.timeout_seconds).toBeUndefined();
  });

  it('rejects a base_url ending in /v1 (backend appends /v1 itself)', () => {
    expect(() =>
      NodeFormSchema.parse({ ...valid, base_url: 'http://host:8000/v1' }),
    ).toThrow(/\/v1/);
  });

  it('rejects non-http(s) schemes and URLs with query/fragment', () => {
    expect(() =>
      NodeFormSchema.parse({ ...valid, base_url: 'ftp://host' }),
    ).toThrow();
    expect(() =>
      NodeFormSchema.parse({ ...valid, base_url: 'http://host?x=1' }),
    ).toThrow();
    expect(() =>
      NodeFormSchema.parse({ ...valid, base_url: 'not a url' }),
    ).toThrow();
  });

  it('requires health_path to start with a slash when set', () => {
    expect(() =>
      NodeFormSchema.parse({ ...valid, health_path: 'healthz' }),
    ).toThrow();
    expect(
      NodeFormSchema.parse({ ...valid, health_path: '/healthz' }).health_path,
    ).toBe('/healthz');
  });

  it('coerces timeout_seconds and rejects non-positive values', () => {
    expect(
      NodeFormSchema.parse({ ...valid, timeout_seconds: '900' })
        .timeout_seconds,
    ).toBe(900);
    expect(() =>
      NodeFormSchema.parse({ ...valid, timeout_seconds: '-5' }),
    ).toThrow();
  });

  it('requires a value when auth_mode is replace', () => {
    expect(() =>
      NodeFormSchema.parse({ ...valid, auth_mode: 'replace', auth_header: ' ' }),
    ).toThrow();
    expect(
      NodeFormSchema.parse({
        ...valid,
        auth_mode: 'replace',
        auth_header: 'Bearer new-secret',
      }).auth_header,
    ).toBe('Bearer new-secret');
  });
});

describe('parseStaticModels', () => {
  it('splits on commas and newlines, trims, drops empties', () => {
    expect(parseStaticModels(' a, b\nc,, \n')).toEqual(['a', 'b', 'c']);
    expect(parseStaticModels('')).toEqual([]);
  });
});

function formValues(overrides: Partial<NodeFormValues> = {}): NodeFormValues {
  return {
    name: 'n1',
    base_url: 'http://h:11434',
    backend_type: 'ollama',
    auth_mode: 'keep',
    auth_header: '',
    static_models: '',
    health_path: '',
    timeout_seconds: undefined,
    enabled: true,
    ...overrides,
  };
}

describe('toCreatePayload', () => {
  it('omits every optional field left empty', () => {
    expect(toCreatePayload(formValues())).toEqual({
      name: 'n1',
      base_url: 'http://h:11434',
      backend_type: 'ollama',
    });
  });

  it('includes optional fields when provided', () => {
    expect(
      toCreatePayload(
        formValues({
          auth_mode: 'replace',
          auth_header: 'Bearer s',
          static_models: 'm1, m2',
          health_path: '/healthz',
          timeout_seconds: 900,
        }),
      ),
    ).toEqual({
      name: 'n1',
      base_url: 'http://h:11434',
      backend_type: 'ollama',
      auth_header: 'Bearer s',
      static_models: ['m1', 'm2'],
      health_path: '/healthz',
      timeout_seconds: 900,
    });
  });
});

describe('toUpdatePayload (PUT tri-state semantics)', () => {
  it('keep: auth_header is ABSENT from the payload (never round-trips the mask)', () => {
    const p = toUpdatePayload(formValues({ auth_mode: 'keep' }));
    expect('auth_header' in p).toBe(false);
  });

  it('clear: auth_header is the empty string', () => {
    const p = toUpdatePayload(formValues({ auth_mode: 'clear' }));
    expect(p.auth_header).toBe('');
  });

  it('replace: auth_header is the new raw value', () => {
    const p = toUpdatePayload(
      formValues({ auth_mode: 'replace', auth_header: 'Bearer next' }),
    );
    expect(p.auth_header).toBe('Bearer next');
  });

  it('empty static_models sends [] (switch back to discovery)', () => {
    expect(toUpdatePayload(formValues()).static_models).toEqual([]);
    expect(
      toUpdatePayload(formValues({ static_models: 'a,b' })).static_models,
    ).toEqual(['a', 'b']);
  });

  it('empty health_path sends "" (clear) and empty timeout sends 0 (default)', () => {
    const p = toUpdatePayload(formValues());
    expect(p.health_path).toBe('');
    expect(p.timeout_seconds).toBe(0);
  });

  it('carries enabled so a disabled node can be resurrected', () => {
    expect(toUpdatePayload(formValues({ enabled: false })).enabled).toBe(false);
    expect(toUpdatePayload(formValues({ enabled: true })).enabled).toBe(true);
  });
});

describe('nodeToFormValues', () => {
  it('prefills from a node without exposing the masked secret', () => {
    const node = NodeSchema.parse({
      ...wireNode,
      auth_header: 'Bearer sk-…abcd',
      static_models: ['m1', 'm2'],
      health_path: '/hp',
      timeout_seconds: 60,
    });
    const values = nodeToFormValues(node);
    expect(values.auth_mode).toBe('keep');
    expect(values.auth_header).toBe('');
    expect(values.static_models).toBe('m1, m2');
    expect(values.health_path).toBe('/hp');
    expect(values.timeout_seconds).toBe('60');
    expect(values.enabled).toBe(true);
  });
});
