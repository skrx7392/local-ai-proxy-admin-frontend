'use client';

import { HStack } from '@chakra-ui/react';

import { ShimmerBar } from './ShimmerBar';
import { SkeletonCard } from './SkeletonCard';
import { TextBlockSkeleton } from './TextBlockSkeleton';

export interface DialogSkeletonProps {
  animate?: boolean;
}

/** TextBlockSkeleton + right-aligned two-button shimmer row. */
export function DialogSkeleton({ animate = true }: DialogSkeletonProps) {
  return (
    <SkeletonCard gap="4" maxW="540px">
      <TextBlockSkeleton animate={animate} lines={4} />
      <HStack gap="2" justifyContent="flex-end">
        <ShimmerBar animate={animate} h={36} w="80px" borderRadius="md" />
        <ShimmerBar animate={animate} h={36} w="120px" borderRadius="md" />
      </HStack>
    </SkeletonCard>
  );
}
