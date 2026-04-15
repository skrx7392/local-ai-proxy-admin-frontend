'use client';

import { Input } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { NAV_ITEMS } from '@/lib/nav/navItems';

/**
 * Compact "go to…" input in the topbar. Press `/` from anywhere (via
 * `ShortcutProvider`) to focus it, then type and hit Enter to jump to the
 * first nav item whose label matches.
 */
export function NavSearch() {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState('');

  function submit(query: string) {
    const needle = query.trim().toLowerCase();
    if (!needle) return;
    const match = NAV_ITEMS.find((item) =>
      item.label.toLowerCase().includes(needle),
    );
    if (match) {
      router.push(match.href);
      setValue('');
    }
  }

  return (
    <>
      <Input
        aria-label="Go to page"
        placeholder="Go to…  (/)"
        size="sm"
        width="180px"
        list={listId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit(value);
          } else if (e.key === 'Escape') {
            setValue('');
            (e.target as HTMLInputElement).blur();
          }
        }}
        data-hotkey-target="nav-search"
        data-testid="nav-search"
      />
      <datalist id={listId}>
        {NAV_ITEMS.map((item) => (
          <option key={item.href} value={item.label} />
        ))}
      </datalist>
    </>
  );
}
