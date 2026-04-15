'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useHotkeys, type HotkeyBinding } from '@/lib/hooks/useHotkeys';
import { GOTO_SHORTCUTS } from '@/lib/nav/navItems';

/**
 * Registers the admin keyboard shortcuts:
 * - `g u` → /users
 * - `g k` → /keys
 * - `/`   → focus the topbar nav input, if one is present (owner of
 *            `data-hotkey-target="nav-search"`). Rendered in `TopBar`.
 */
export function ShortcutProvider() {
  const router = useRouter();

  const bindings = useMemo<HotkeyBinding[]>(() => {
    const list: HotkeyBinding[] = GOTO_SHORTCUTS.map((item) => ({
      combo: `g ${item.shortcut}`,
      handler: () => router.push(item.href),
    }));

    list.push({
      combo: '/',
      handler: () => {
        const target = document.querySelector<HTMLElement>(
          '[data-hotkey-target="nav-search"]',
        );
        target?.focus();
      },
    });

    return list;
  }, [router]);

  useHotkeys(bindings);
  return null;
}
