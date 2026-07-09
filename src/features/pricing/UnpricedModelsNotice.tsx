'use client';

import { Badge, Box, Button, HStack, Stack, Text, VStack } from '@chakra-ui/react';

import type { UnpricedServingModel } from './unpriced';

// Both the effective rate and the amount charged render as USD (1 credit =
// $1, the app-wide convention). The rate keeps up to 6 decimals; the charged
// total is a plain money amount.
const perMtok = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const credits = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export interface UnpricedModelsNoticeProps {
  models: UnpricedServingModel[];
  onAddPricing: (model: string) => void;
}

/**
 * Flags models that have served traffic but have no active pricing row. Each is
 * shown with its observed effective (blended) rate — credits charged ÷ tokens
 * served — so operators can see what was actually billed (or that it served for
 * free) and add an explicit rate. Renders nothing when there's nothing to flag.
 */
export function UnpricedModelsNotice({
  models,
  onAddPricing,
}: UnpricedModelsNoticeProps) {
  if (models.length === 0) return null;

  return (
    <Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderLeftWidth="3px"
      borderLeftColor="orange.solid"
      borderRadius="md"
      padding="4"
      data-testid="unpriced-models-notice"
    >
      <Stack gap="3">
        <Box>
          <HStack gap="2">
            <Text textStyle="body.md" fontWeight="medium">
              Serving without pricing
            </Text>
            <Badge colorPalette="orange" data-testid="unpriced-models-count">
              {models.length}
            </Badge>
          </HStack>
          <Text color="fg.muted" textStyle="body.sm">
            These models served requests in the last 30 days but have no active
            pricing row. The effective rate is the observed blend (credits
            charged ÷ tokens served); there is no backend default rate.
          </Text>
        </Box>

        <Stack gap="2">
          {models.map((m) => (
            <HStack
              key={m.model}
              justify="space-between"
              align="center"
              gap="4"
              data-testid={`unpriced-model-${m.model}`}
            >
              <VStack align="flex-start" gap="0.5" minW="0">
                <Text fontFamily="mono" fontSize="sm" fontWeight="medium">
                  {m.model}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {m.requests.toLocaleString()} requests ·{' '}
                  {credits.format(m.credits)} charged
                </Text>
              </VStack>

              <HStack gap="4" align="center">
                <VStack align="flex-end" gap="0">
                  <Text
                    fontSize="sm"
                    data-testid={`unpriced-effective-rate-${m.model}`}
                  >
                    {perMtok.format(m.effective_rate_per_mtok)}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    effective / 1M tokens
                  </Text>
                </VStack>
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="accent"
                  onClick={() => onAddPricing(m.model)}
                  data-testid={`unpriced-add-pricing-${m.model}`}
                >
                  Add pricing
                </Button>
              </HStack>
            </HStack>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
