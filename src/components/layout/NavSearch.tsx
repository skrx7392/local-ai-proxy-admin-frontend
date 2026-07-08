'use client';

import { Box, Input } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';

import { fuzzyFilter } from '@/lib/nav/fuzzy';
import { NAV_ITEMS, type NavItem } from '@/lib/nav/navItems';

function optionSlug(item: NavItem): string {
  return item.href === '/' ? 'dashboard' : item.href.slice(1);
}

/**
 * "Go to…" combobox in the topbar. Press `/` from anywhere (via
 * `ShortcutProvider`) to focus it; focusing opens a popover listing every
 * destination, typing filters it fuzzily (see `@/lib/nav/fuzzy`), and
 * ArrowUp/ArrowDown + Enter (or click) navigates.
 *
 * Hand-rolled listbox rather than Chakra/Ark `Combobox`: this is a
 * navigation launcher, not a value-select — nothing stays "selected", Enter
 * must fall back to first-substring-match when the popover was dismissed
 * (legacy behavior), and Escape is two-stage (close popover → clear + blur).
 * Modeling that against Ark's selection state machine costs more than the
 * ~100 lines of ARIA combobox pattern below.
 *
 * Escape handling never reaches `useHotkeys` concerns: all hotkeys are
 * suppressed while focus is in an editable target.
 */
export function NavSearch() {
  const router = useRouter();
  const listboxId = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(
    () => fuzzyFilter(NAV_ITEMS, value, (item) => item.label),
    [value],
  );

  // The highlight is index-based; clamp so a shrinking result list can never
  // point past the end (typing resets to 0, but belt-and-braces under
  // noUncheckedIndexedAccess).
  const clampedIndex = Math.min(activeIndex, matches.length - 1);
  const activeItem = clampedIndex >= 0 ? matches[clampedIndex] : undefined;
  const activeOptionId = activeItem
    ? `${listboxId}-option-${optionSlug(activeItem)}`
    : undefined;

  function openPopover() {
    setOpen(true);
    setActiveIndex(0);
  }

  function navigateTo(item: NavItem) {
    router.push(item.href);
    setValue('');
    setOpen(false);
  }

  /**
   * Pre-popover behavior, kept verbatim: jump to the first nav item whose
   * label contains the query. Runs when Enter is pressed with the popover
   * dismissed, so "type exact name + Enter" works even ignoring suggestions.
   */
  function submitLegacy(query: string) {
    const needle = query.trim().toLowerCase();
    if (!needle) return;
    const match = NAV_ITEMS.find((item) =>
      item.label.toLowerCase().includes(needle),
    );
    if (match) navigateTo(match);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openPopover();
        else if (matches.length > 0) {
          setActiveIndex((clampedIndex + 1) % matches.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openPopover();
        else if (matches.length > 0) {
          setActiveIndex((clampedIndex - 1 + matches.length) % matches.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (open && activeItem) navigateTo(activeItem);
        else if (!open) submitLegacy(value);
        break;
      case 'Escape':
        if (open) {
          // Stage 1: dismiss the popover, keep focus and text.
          setOpen(false);
        } else {
          // Stage 2 (pre-popover behavior): clear and leave the box.
          setValue('');
          e.currentTarget.blur();
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  return (
    <Box position="relative">
      <Input
        role="combobox"
        aria-label="Go to page"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open && matches.length > 0 ? listboxId : undefined}
        aria-activedescendant={open ? activeOptionId : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Go to…  (/)"
        size="sm"
        width="180px"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={openPopover}
        // Clicking the box reopens the popover even when it already holds
        // focus — e.g. after a first-Escape dismissal, or after a client
        // navigation that keeps this persistent input focused (no fresh
        // focus event fires in either case).
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        data-hotkey-target="nav-search"
        data-testid="nav-search"
      />
      {open && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          right="0"
          width="240px"
          maxHeight="320px"
          overflowY="auto"
          zIndex="dropdown"
          background="bg.glass.opaque"
          borderWidth="1px"
          borderColor="border.glass"
          borderRadius="md"
          shadow="e2"
          paddingBlock="1"
          data-testid="nav-search-popover"
        >
          {matches.length > 0 ? (
            <Box
              as="ul"
              id={listboxId}
              role="listbox"
              aria-label="Go to page suggestions"
              listStyleType="none"
              margin="0"
              padding="0"
            >
              {matches.map((item, index) => {
                const Icon = item.icon;
                const active = index === clampedIndex;
                return (
                  <Box
                    as="li"
                    key={item.href}
                    id={`${listboxId}-option-${optionSlug(item)}`}
                    role="option"
                    aria-selected={active}
                    display="flex"
                    alignItems="center"
                    gap="2"
                    paddingInline="3"
                    paddingBlock="1.5"
                    cursor="pointer"
                    textStyle="body.sm"
                    background={active ? 'bg.glass.subtle' : undefined}
                    color={active ? 'fg.default' : 'fg.muted'}
                    // Keep focus in the input so blur doesn't close the
                    // popover before the click below lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => navigateTo(item)}
                    onMouseMove={() => setActiveIndex(index)}
                    data-testid={`nav-search-option-${optionSlug(item)}`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              paddingInline="3"
              paddingBlock="1.5"
              textStyle="body.sm"
              color="fg.muted"
              data-testid="nav-search-empty"
            >
              No matches
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
