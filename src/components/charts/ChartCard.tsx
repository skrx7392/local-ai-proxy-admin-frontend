'use client';

import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface ChartCardProps {
  title: string;
  /** One-line qualifier under the title (units, dashed-line meaning). */
  hint?: string;
  children: ReactNode;
}

/** Titled glass card wrapping one chart in a dashboard grid. */
export function ChartCard({ title, hint, children }: ChartCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.glass"
      borderRadius="lg"
      background="bg.glass.surface"
      padding="4"
      data-testid="chart-card"
    >
      <Stack gap="3">
        <Box>
          <Heading size="sm">{title}</Heading>
          {hint && (
            <Text fontSize="xs" color="fg.muted">
              {hint}
            </Text>
          )}
        </Box>
        {children}
      </Stack>
    </Box>
  );
}
