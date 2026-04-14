'use client';

import { Box, HStack } from '@chakra-ui/react';

import { ShimmerBar } from './ShimmerBar';
import { SkeletonCard } from './SkeletonCard';

export interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  animate?: boolean;
}

/** Header bar + N rows × M shimmer cells, wrapped in a glass card. */
export function DataTableSkeleton({
  rows = 5,
  columns = 4,
  animate = true,
}: DataTableSkeletonProps) {
  return (
    <SkeletonCard gap="0" padding="0">
      <Box padding="3" borderBottom="1px solid" borderColor="border.subtle">
        <HStack gap="4">
          {Array.from({ length: columns }).map((_, i) => (
            <ShimmerBar
              key={`h-${i}`}
              animate={animate}
              h={10}
              flex="1"
              opacity={0.8}
            />
          ))}
        </HStack>
      </Box>
      {Array.from({ length: rows }).map((_, r) => (
        <Box
          key={`r-${r}`}
          padding="3"
          borderBottom={r === rows - 1 ? 'none' : '1px solid'}
          borderColor="border.subtle"
        >
          <HStack gap="4">
            {Array.from({ length: columns }).map((__, c) => (
              <ShimmerBar key={`c-${r}-${c}`} animate={animate} h={12} flex="1" />
            ))}
          </HStack>
        </Box>
      ))}
    </SkeletonCard>
  );
}
