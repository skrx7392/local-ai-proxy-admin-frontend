'use client';

import { ShimmerBar } from './ShimmerBar';
import { SkeletonCard } from './SkeletonCard';

export interface StatCardSkeletonProps {
  animate?: boolean;
}

/**
 * Matches the real StatCard footprint (card + 3 stacked bars:
 * label 40% / value 60%×28px tall / delta 30%) so there's zero layout shift
 * when real data arrives.
 */
export function StatCardSkeleton({ animate = true }: StatCardSkeletonProps) {
  return (
    <SkeletonCard minH="120px" gap="3">
      <ShimmerBar animate={animate} h={10} w="40%" />
      <ShimmerBar animate={animate} h={28} w="60%" />
      <ShimmerBar animate={animate} h={10} w="30%" />
    </SkeletonCard>
  );
}
