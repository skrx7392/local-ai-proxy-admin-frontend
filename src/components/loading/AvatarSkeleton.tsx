'use client';

import { ShimmerBar } from './ShimmerBar';

export interface AvatarSkeletonProps {
  size?: number;
  animate?: boolean;
}

export function AvatarSkeleton({ size = 32, animate = true }: AvatarSkeletonProps) {
  return <ShimmerBar animate={animate} h={size} w={`${size}px`} borderRadius="full" />;
}
