import { useMemo } from 'react';

import type { FilterComboboxOption } from '@/components/data';
import { useAccountsList } from '@/features/accounts/hooks';
import { useKeysList } from '@/features/keys/hooks';
import { useNodesList } from '@/features/nodes/hooks';
import { useUsersList } from '@/features/users/hooks';

// Option feeds for the Usage page's filter comboboxes. Each reuses the list
// hook that already powers the entity's own page (same query key → shared
// cache), fetched once and filtered client-side — these datasets are
// single-digit on a self-hosted gateway.
//
// One page of 100 covers every realistic install; if an instance ever
// outgrows it the picker degrades to "first 100 by the backend's ordering",
// it never breaks.
const PICKER_PAGE = { limit: 100, offset: 0 } as const;

export interface EntityOptionsResult {
  options: FilterComboboxOption[];
  isLoading: boolean;
}

function toOption(id: number, name: string): FilterComboboxOption {
  return { value: String(id), label: `${name} (${id})` };
}

export function useAccountOptions(): EntityOptionsResult {
  const query = useAccountsList(PICKER_PAGE);
  const options = useMemo(
    () => (query.data?.data ?? []).map((a) => toOption(a.id, a.name)),
    [query.data],
  );
  return { options, isLoading: query.isLoading };
}

// Includes revoked keys on purpose: usage attributed to a revoked key is
// exactly what an admin auditing traffic wants to isolate.
export function useApiKeyOptions(): EntityOptionsResult {
  const query = useKeysList(PICKER_PAGE);
  const options = useMemo(
    () => (query.data?.data ?? []).map((k) => toOption(k.id, k.name)),
    [query.data],
  );
  return { options, isLoading: query.isLoading };
}

export function useUserOptions(): EntityOptionsResult {
  const query = useUsersList(PICKER_PAGE);
  const options = useMemo(
    () => (query.data?.data ?? []).map((u) => toOption(u.id, u.name)),
    [query.data],
  );
  return { options, isLoading: query.isLoading };
}

export function useNodeOptions(): EntityOptionsResult {
  const query = useNodesList(PICKER_PAGE);
  const options = useMemo(
    () => (query.data?.data ?? []).map((n) => toOption(n.id, n.name)),
    [query.data],
  );
  return { options, isLoading: query.isLoading };
}

// There is no dedicated /models admin endpoint; the live model list is what
// the gateway's node registry discovered (node.models) plus any statically
// pinned lists (static_models — kept separately so models on a currently
// unhealthy node remain filterable). The combobox also allows free text, so
// historical models that have since been undeployed can still be typed.
export function useModelOptions(): EntityOptionsResult {
  const query = useNodesList(PICKER_PAGE);
  const options = useMemo(() => {
    const models = new Set<string>();
    for (const node of query.data?.data ?? []) {
      for (const model of node.models) models.add(model);
      for (const model of node.static_models ?? []) models.add(model);
    }
    return [...models].sort().map((m) => ({ value: m, label: m }));
  }, [query.data]);
  return { options, isLoading: query.isLoading };
}
