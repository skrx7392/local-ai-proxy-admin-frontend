'use client';

import { Box, Text, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  /**
   * Wrap the content in a glass card. Default `false` — callers that render
   * inside an already-framed surface (like DataTable's empty branch) should
   * leave this off to avoid card-in-card.
   */
  framed?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  framed = false,
}: EmptyStateProps) {
  const content = (
    <VStack gap="2" data-testid="empty-state">
      {icon && (
        <Box color="fg.muted" aria-hidden="true">
          {icon}
        </Box>
      )}
      <Text textStyle="body.md" color="fg.default">
        {title}
      </Text>
      {description && (
        <Text textStyle="body.sm" color="fg.muted">
          {description}
        </Text>
      )}
      {action && <Box pt="1">{action}</Box>}
    </VStack>
  );

  if (!framed) return content;

  return (
    <Box
      borderWidth="1px"
      borderColor="border.glass"
      borderRadius="lg"
      background="bg.glass.surface"
      padding="10"
      textAlign="center"
    >
      {content}
    </Box>
  );
}
