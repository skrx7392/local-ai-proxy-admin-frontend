'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';

export interface SwatchProps {
  /** Display label for the step (e.g. "50"). */
  label: string;
  /** Raw CSS color value (hex, rgb, rgba, var(), …). */
  value: string;
  /** Show hex/value under the chip. Default true. */
  showValue?: boolean;
}

/** A single color chip. */
export function Swatch({ label, value, showValue = true }: SwatchProps) {
  return (
    <Stack gap="1" align="flex-start" minW="64px">
      <Box
        width="64px"
        height="40px"
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="border.subtle"
        style={{ background: value }}
        data-swatch-value={value}
      />
      <Text textStyle="caption" color="fg.default">
        {label}
      </Text>
      {showValue ? (
        <Text textStyle="code.sm" color="fg.subtle">
          {value}
        </Text>
      ) : null}
    </Stack>
  );
}

export interface SemanticSwatchPairProps {
  name: string;
  darkValue: string;
  lightValue: string;
}

/**
 * Paired swatch chip showing the same semantic token rendered against a dark
 * and a light backdrop. Useful for eyeballing contrast in both modes at once
 * without actually flipping the theme.
 */
export function SemanticSwatchPair({ name, darkValue, lightValue }: SemanticSwatchPairProps) {
  return (
    <Stack gap="1" minW="180px">
      <Text textStyle="code.sm" color="fg.default">
        {name}
      </Text>
      <HStack gap="2">
        <Box
          flex="1"
          height="40px"
          borderRadius="md"
          padding="2"
          background="#0f172a"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            width="100%"
            height="100%"
            borderRadius="sm"
            style={{ background: darkValue }}
          />
        </Box>
        <Box
          flex="1"
          height="40px"
          borderRadius="md"
          padding="2"
          background="#ffffff"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            width="100%"
            height="100%"
            borderRadius="sm"
            style={{ background: lightValue }}
          />
        </Box>
      </HStack>
    </Stack>
  );
}
