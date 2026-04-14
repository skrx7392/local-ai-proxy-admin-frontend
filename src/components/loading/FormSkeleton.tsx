'use client';

import { Stack } from '@chakra-ui/react';

import { ShimmerBar } from './ShimmerBar';
import { SkeletonCard } from './SkeletonCard';

export interface FormSkeletonProps {
  fields?: number;
  animate?: boolean;
}

/** N stacked (label bar 120px + input bar 36px full-width) pairs. */
export function FormSkeleton({ fields = 6, animate = true }: FormSkeletonProps) {
  return (
    <SkeletonCard gap="4">
      {Array.from({ length: fields }).map((_, i) => (
        <Stack key={i} gap="2">
          <ShimmerBar animate={animate} h={10} w="120px" />
          <ShimmerBar animate={animate} h={36} w="100%" borderRadius="md" />
        </Stack>
      ))}
    </SkeletonCard>
  );
}
