'use client';

import { Alert, Button } from '@chakra-ui/react';

import { describeError } from '@/lib/api/errors';

export interface QueryErrorStateProps {
  /** Headline, e.g. "Failed to load configuration". */
  title: string;
  /** The query's error — rendered via describeError (ApiError/Zod aware). */
  error: unknown;
  /**
   * Called when the user clicks Retry — wire to the query's `refetch`.
   * Omit to render without an action.
   */
  onRetry?: () => void;
  /**
   * Root testid; the retry button gets `${testId}-retry`.
   */
  'data-testid'?: string;
}

/**
 * Standard error state for a failed page query: visible alert + Retry.
 * Born from the 2026-07-08 P0 where /config sat in skeletons with no way
 * out — every page-level query error should render this (or equivalent)
 * rather than a bare Alert with no action.
 */
export function QueryErrorState({
  title,
  error,
  onRetry,
  'data-testid': testId,
}: QueryErrorStateProps) {
  return (
    <Alert.Root status="error" data-testid={testId}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{describeError(error)}</Alert.Description>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            colorPalette="red"
            marginTop="2"
            alignSelf="flex-start"
            onClick={onRetry}
            data-testid={testId ? `${testId}-retry` : 'query-error-retry'}
          >
            Retry
          </Button>
        )}
      </Alert.Content>
    </Alert.Root>
  );
}
