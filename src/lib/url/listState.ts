'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

// Values `update` accepts; `null`, `undefined`, or empty string remove the key.
export type UrlPatch = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Shared URL-as-source-of-truth helper for list pages. Back button, refresh,
 * and copy-link all round-trip the filter/pagination state because the state
 * lives in the URL, not React state.
 */
export function useListSearchParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const update = useCallback(
    (patch: UrlPatch, options: { resetOffset?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      if (options.resetOffset) next.delete('offset');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { searchParams, update };
}

export function readInt(
  sp: URLSearchParams | null,
  key: string,
  fallback: number,
): number {
  const raw = sp?.get(key);
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function readEnum<T extends string>(
  sp: URLSearchParams | null,
  key: string,
  values: readonly T[],
  fallback: T,
): T {
  const raw = sp?.get(key);
  if (!raw) return fallback;
  return (values as readonly string[]).includes(raw) ? (raw as T) : fallback;
}
