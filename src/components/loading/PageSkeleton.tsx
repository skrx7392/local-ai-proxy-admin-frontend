'use client';

import { Box, HStack, Stack } from '@chakra-ui/react';
import type { ReactNode } from 'react';

import { ShimmerBar } from './ShimmerBar';

export interface PageSkeletonProps {
  animate?: boolean;
  children?: ReactNode;
}

/**
 * TopBar shimmer + breadcrumb shimmer + `{children}` slot for page-specific
 * content. The AdminShell frame is represented structurally only; the full
 * AdminShell skeleton ships in PR B.
 */
export function PageSkeleton({ animate = true, children }: PageSkeletonProps) {
  return (
    <Box role="status" aria-live="polite">
      {/* TopBar stand-in */}
      <HStack
        height="56px"
        paddingInline="6"
        borderBottom="1px solid"
        borderColor="border.subtle"
        background="bg.glass.elevated"
        gap="4"
      >
        <ShimmerBar animate={animate} h={16} w="120px" />
        <Box flex="1" />
        <ShimmerBar animate={animate} h={12} w="80px" />
        <ShimmerBar animate={animate} h={24} w={24} borderRadius="full" />
      </HStack>
      <Stack padding="6" gap="6">
        {/* Breadcrumb */}
        <ShimmerBar animate={animate} h={10} w="240px" />
        {children}
      </Stack>
    </Box>
  );
}
