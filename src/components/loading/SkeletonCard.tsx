'use client';

import { Box } from '@chakra-ui/react';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Internal wrapper used by all skeletons — matches the real `Card` recipe's
 * visual footprint so swap-in doesn't cause layout shift. We render it as a
 * plain styled Box rather than using the Card slot recipe so skeletons remain
 * render-safe in tests that don't mount the full Chakra system.
 */
export function SkeletonCard({
  children,
  ...rest
}: ComponentProps<typeof Box> & { children: ReactNode }) {
  return (
    <Box
      role="status"
      aria-live="polite"
      borderRadius="lg"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border.glass"
      background="bg.glass.surface"
      boxShadow="e0"
      padding="4"
      display="flex"
      flexDirection="column"
      gap="3"
      {...rest}
    >
      {children}
    </Box>
  );
}
