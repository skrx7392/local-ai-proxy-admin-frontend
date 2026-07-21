'use client';

import { Badge, Box, Button, HStack, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';

import { ApiError } from '@/lib/api/errors';

import { GrantCreditsDialog } from './GrantCreditsDialog';
import {
  useCreditRequests,
  useResolveCreditRequest,
  useTopUpCreditRequest,
} from './hooks';

import type { CreditRequest, GrantCreditsFormValues } from './schemas';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

// Pending cap-hit requests (docs/design/credit-requests.md §6), surfaced
// above the accounts table only when there is something to act on. Top up
// marks the request granted first (idempotency lock, same contract as the
// Discord bot) and then grants through the audited credits endpoint;
// Dismiss silences the account for the rest of the month.
export function CreditRequestsStrip() {
  const query = useCreditRequests('pending');
  const resolve = useResolveCreditRequest();
  const topUp = useTopUpCreditRequest();

  const [topUpTarget, setTopUpTarget] = useState<CreditRequest | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const requests = query.data?.data ?? [];
  if (requests.length === 0) return null;

  function describe(err: unknown): string {
    if (err instanceof ApiError) {
      // 409 = already resolved elsewhere or expired at month rollover.
      return err.message;
    }
    return 'Action failed.';
  }

  function handleTopUp(values: GrantCreditsFormValues): void {
    if (!topUpTarget) return;
    setError(undefined);
    topUp.mutate(
      { request: topUpTarget, values },
      {
        onSuccess: () => setTopUpTarget(null),
        onError: (err) => {
          setTopUpTarget(null);
          setError(describe(err));
        },
      },
    );
  }

  function handleDismiss(request: CreditRequest): void {
    setError(undefined);
    resolve.mutate(
      { id: request.id, status: 'dismissed', note: 'dismissed via admin console' },
      { onError: (err) => setError(describe(err)) },
    );
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="border.emphasized"
      borderRadius="l2"
      padding="4"
      data-testid="credit-requests-strip"
    >
      <Stack gap="3">
        <HStack gap="2">
          <Badge colorPalette="orange">{requests.length}</Badge>
          <Text fontWeight="semibold">
            Credit request{requests.length === 1 ? '' : 's'} — monthly limit
            reached
          </Text>
        </HStack>

        {error && (
          <Text
            role="alert"
            color="red.500"
            textStyle="body.sm"
            data-testid="credit-requests-error"
          >
            {error}
          </Text>
        )}

        {requests.map((request) => {
          const spent = request.effective_monthly_grant - request.balance;
          return (
            <HStack
              key={request.id}
              justify="space-between"
              wrap="wrap"
              gap="2"
              data-testid={`credit-request-${request.id}`}
            >
              <Box>
                <Text fontWeight="medium">
                  {request.email ?? request.account_name}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  used {money.format(spent)} of{' '}
                  {money.format(request.effective_monthly_grant)}/mo — a top-up
                  lasts until the next monthly reset
                </Text>
              </Box>
              <HStack gap="1">
                <Button
                  size="xs"
                  colorPalette="accent"
                  onClick={() => {
                    setError(undefined);
                    setTopUpTarget(request);
                  }}
                  data-testid={`credit-request-topup-${request.id}`}
                >
                  Top up
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleDismiss(request)}
                  loading={resolve.isPending}
                  data-testid={`credit-request-dismiss-${request.id}`}
                >
                  Dismiss
                </Button>
              </HStack>
            </HStack>
          );
        })}
      </Stack>

      <GrantCreditsDialog
        isOpen={topUpTarget !== null}
        accountName={topUpTarget?.email ?? topUpTarget?.account_name ?? null}
        onOpenChange={(open) => {
          if (!open) setTopUpTarget(null);
        }}
        onSubmit={handleTopUp}
        isSubmitting={topUp.isPending}
      />
    </Box>
  );
}
