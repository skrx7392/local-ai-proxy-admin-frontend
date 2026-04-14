'use client';

import { Stack } from '@chakra-ui/react';

import { ShimmerBar } from './ShimmerBar';

export interface TextBlockSkeletonProps {
  lines?: number;
  animate?: boolean;
}

/** Bars at 100% / 85% / 60%; repeats with varied widths if `lines > 3`. */
export function TextBlockSkeleton({ lines = 3, animate = true }: TextBlockSkeletonProps) {
  const widths = ['100%', '85%', '60%', '92%', '78%', '65%'];
  return (
    <Stack gap="2">
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBar
          key={i}
          animate={animate}
          h={12}
          w={widths[i % widths.length] ?? '100%'}
        />
      ))}
    </Stack>
  );
}
