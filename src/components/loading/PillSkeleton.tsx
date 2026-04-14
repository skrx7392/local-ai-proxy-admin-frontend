'use client';

import { ShimmerBar } from './ShimmerBar';

export interface PillSkeletonProps {
  width?: number;
  animate?: boolean;
}

export function PillSkeleton({ width = 64, animate = true }: PillSkeletonProps) {
  return <ShimmerBar animate={animate} h={20} w={`${width}px`} borderRadius="full" />;
}
