'use client';

import { Box, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface SectionProps {
  id: string;
  title: string;
  subtitle?: string;
  /** Optional spec line rendered under the subtitle (e.g. "Duration: 220ms · Easing: standard"). */
  spec?: string;
  children: ReactNode;
}

/**
 * Titled wrapper for a styleguide section. Provides an anchor target,
 * a heading, optional subtitle + spec line, and a consistent vertical rhythm.
 */
export function Section({ id, title, subtitle, spec, children }: SectionProps) {
  return (
    <Box
      as="section"
      id={id}
      data-section-id={id}
      scrollMarginTop="24"
      paddingBlock="10"
      borderBottom="1px solid"
      borderColor="border.subtle"
    >
      <Stack gap="1" marginBottom="6">
        <Text textStyle="heading.lg">{title}</Text>
        {subtitle ? (
          <Text textStyle="body.md" color="fg.muted">
            {subtitle}
          </Text>
        ) : null}
        {spec ? (
          <Text
            textStyle="code.sm"
            color="fg.subtle"
            fontVariantNumeric="tabular-nums"
          >
            {spec}
          </Text>
        ) : null}
      </Stack>
      <Box>{children}</Box>
    </Box>
  );
}
