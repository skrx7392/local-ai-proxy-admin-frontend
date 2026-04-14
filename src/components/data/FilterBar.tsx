'use client';

import { Button, HStack, Wrap } from '@chakra-ui/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FilterBarProps {
  children: ReactNode;
  /** Shown only when there's at least one active filter. */
  hasActiveFilters?: boolean;
  onClearFilters?: (() => void) | undefined;
}

/**
 * Layout-only wrapper that gives every list page the same filter-row
 * rhythm and a consistent "Clear" affordance. Feature-specific filter
 * controls (enum chip toggles, date pickers, etc.) live alongside the
 * page that uses them — this component has no knowledge of them.
 */
export function FilterBar({
  children,
  hasActiveFilters = false,
  onClearFilters,
}: FilterBarProps) {
  return (
    <HStack
      gap="3"
      paddingBlock="2"
      alignItems="flex-start"
      wrap="wrap"
      data-testid="filter-bar"
    >
      <Wrap gap="2" flex="1">
        {children}
      </Wrap>
      {hasActiveFilters && onClearFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearFilters}
          data-testid="filter-bar-clear"
        >
          <X size={14} />
          Clear filters
        </Button>
      )}
    </HStack>
  );
}
