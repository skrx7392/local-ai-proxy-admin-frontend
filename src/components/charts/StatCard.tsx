'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Small qualifier shown under the value (e.g. "last 24h"). */
  hint?: string | undefined;
  /** Optional right-side slot — e.g. a sparkline or trend arrow. */
  accessory?: ReactNode;
  isLoading?: boolean;
  testId?: string | undefined;
}

// Plain presentational card. Animation is handled by the chakra `lift`
// transition tokens already in the theme; countUp/number animation is
// intentionally not built in here — a component that mounts once and
// refetches in place doesn't benefit from counting up every tick, and
// prefers-reduced-motion already disables the CSS animations via globalCss.
export function StatCard({
  label,
  value,
  hint,
  accessory,
  isLoading = false,
  testId,
}: StatCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.glass"
      background="bg.glass.surface"
      backdropFilter="blur(18px) saturate(1.2)"
      borderRadius="lg"
      padding="5"
      minHeight="110px"
      data-testid={testId}
      aria-busy={isLoading}
    >
      <HStack justifyContent="space-between" alignItems="flex-start" gap="3">
        <Stack gap="1" flex="1" minWidth="0">
          <Text textStyle="caption" color="fg.muted">
            {label}
          </Text>
          <Text
            textStyle="heading.lg"
            fontVariantNumeric="tabular-nums"
            fontFeatureSettings='"tnum"'
            truncate
          >
            {isLoading ? '—' : value}
          </Text>
          {hint && (
            <Text textStyle="caption" color="fg.subtle">
              {hint}
            </Text>
          )}
        </Stack>
        {accessory && <Box flexShrink="0">{accessory}</Box>}
      </HStack>
    </Box>
  );
}
