'use client';

import { Button, HStack, NativeSelect, Text } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';

export interface PaginationProps {
  limit: number;
  offset: number;
  /** Total row count from the envelope — required now that every list returns an envelope. */
  total: number;
  /** Current page's actual row count — used for the displayed range only. */
  pageRowCount: number;
  pageSizes?: readonly number[];
  onChange: (next: { limit: number; offset: number }) => void;
  isLoading?: boolean;
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;

export function Pagination({
  limit,
  offset,
  total,
  pageRowCount,
  pageSizes = DEFAULT_PAGE_SIZES,
  onChange,
  isLoading = false,
}: PaginationProps) {
  const selectId = useId();
  const firstIndex = pageRowCount === 0 ? 0 : offset + 1;
  const lastIndex = offset + pageRowCount;

  const canGoPrev = offset > 0;
  const canGoNext = lastIndex < total;

  return (
    <HStack
      gap="4"
      justifyContent="space-between"
      paddingBlock="3"
      data-testid="pagination"
    >
      <HStack gap="2">
        <label htmlFor={selectId}>
          <Text textStyle="body.sm" color="fg.muted">
            Rows per page
          </Text>
        </label>
        <NativeSelect.Root size="sm" width="20" disabled={isLoading}>
          <NativeSelect.Field
            id={selectId}
            value={String(limit)}
            onChange={(event) => {
              const nextLimit = Number(event.target.value);
              onChange({ limit: nextLimit, offset: 0 });
            }}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      <HStack gap="3">
        <Text textStyle="body.sm" color="fg.muted" data-testid="pagination-range">
          {`${firstIndex}\u2013${lastIndex} of ${total}`}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Previous page"
          data-testid="pagination-prev"
          onClick={() => onChange({ limit, offset: Math.max(0, offset - limit) })}
          disabled={!canGoPrev || isLoading}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Next page"
          data-testid="pagination-next"
          onClick={() => onChange({ limit, offset: offset + limit })}
          disabled={!canGoNext || isLoading}
        >
          <ChevronRight size={16} />
        </Button>
      </HStack>
    </HStack>
  );
}
