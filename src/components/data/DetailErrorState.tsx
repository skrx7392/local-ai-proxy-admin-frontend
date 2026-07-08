'use client';

import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';

import { ApiError, describeError } from '@/lib/api/errors';

export interface DetailErrorStateProps {
  /** Capitalized noun, e.g. "User" — used in the heading. */
  resourceLabel: string;
  /** The id from the route, echoed in the 404 body copy. */
  resourceId: number | string;
  /** The detail query's error. */
  error: unknown;
  /** Where the back button points, e.g. "/users". */
  backHref: string;
  /** Back button copy, e.g. "Back to users". */
  backLabel: string;
  /** Root testid; the back button gets `${testId}-back`. */
  'data-testid'?: string;
}

/**
 * Error state for a resource detail page (`/users/[id]`, `/keys/[id]`).
 *
 * Born from the 2026-07-08 UX review: the old inline version rendered the
 * backend's 404 message ("User not found") as the body under an identical
 * heading, and the back link read as plain text. Here the 404 body is our
 * own copy (never the backend echo), so heading and body are always
 * distinct, and the back affordance is a real button.
 */
export function DetailErrorState({
  resourceLabel,
  resourceId,
  error,
  backHref,
  backLabel,
  'data-testid': testId,
}: DetailErrorStateProps) {
  const lower = resourceLabel.toLowerCase();
  const is404 = error instanceof ApiError && error.status === 404;

  return (
    <Stack gap="3" data-testid={testId}>
      <Heading textStyle="heading.md">
        {is404 ? `${resourceLabel} not found` : `Failed to load ${lower}`}
      </Heading>
      <Text color="fg.muted">
        {is404
          ? `No ${lower} with ID ${resourceId} exists. It may have been deleted, or the link may be out of date.`
          : describeError(error)}
      </Text>
      <Box>
        <Button
          asChild
          size="sm"
          variant="outline"
          data-testid={testId ? `${testId}-back` : 'detail-error-back'}
        >
          <NextLink href={backHref}>← {backLabel}</NextLink>
        </Button>
      </Box>
    </Stack>
  );
}
