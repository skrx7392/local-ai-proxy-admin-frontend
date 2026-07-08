'use client';

import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';

import { QueryErrorState } from '@/components/data';
import { TextBlockSkeleton } from '@/components/loading';
import { CONFIG_GROUPS } from '@/features/config/groups';
import { useAdminConfig } from '@/features/config/hooks';
import type { AdminConfig } from '@/features/config/schemas';

function formatValue(
  value: AdminConfig[keyof AdminConfig] | undefined,
  render?: (v: AdminConfig[keyof AdminConfig]) => string,
): string {
  // '' covers unset-string snapshot values (ollama_url / nodes_file are
  // empty when the env var is absent); undefined covers fields an older
  // backend doesn't serve yet.
  if (value === undefined || value === null || value === '') return '—';
  if (render) return render(value);
  return String(value);
}

export default function ConfigPage() {
  const { data, status, error, refetch } = useAdminConfig();

  return (
    <Container maxW="6xl" paddingBlock="8" data-testid="config-page">
      <Stack gap="6">
        <Stack gap="1">
          <Heading size="xl">Configuration</Heading>
          <Text color="fg.muted" textStyle="body.md">
            Read-only snapshot of the running backend process. Values are
            captured at boot; restart the backend to pick up env changes.
          </Text>
        </Stack>

        {status === 'pending' && (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
            {CONFIG_GROUPS.map((group) => (
              <Box
                key={group.id}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="border.muted"
                padding="5"
                data-testid={`config-skeleton-${group.id}`}
              >
                <TextBlockSkeleton lines={group.fields.length + 1} />
              </Box>
            ))}
          </SimpleGrid>
        )}

        {status === 'error' && (
          <QueryErrorState
            title="Failed to load configuration"
            error={error}
            onRetry={() => void refetch()}
            data-testid="config-error"
          />
        )}

        {status === 'success' && data && (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
            {CONFIG_GROUPS.map((group) => (
              <Box
                key={group.id}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="border.muted"
                padding="5"
                data-testid={`config-group-${group.id}`}
              >
                <Heading size="md" marginBottom="4">
                  {group.label}
                </Heading>
                <Stack gap="3" as="dl">
                  {group.fields.map((field) => (
                    <Box
                      key={field.key}
                      display="grid"
                      gridTemplateColumns="minmax(0, 12rem) 1fr"
                      gap="4"
                      alignItems="baseline"
                    >
                      <Text
                        as="dt"
                        color="fg.muted"
                        textStyle="caption"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {field.label}
                      </Text>
                      <Text
                        as="dd"
                        fontFamily="mono"
                        textStyle="body.sm"
                        wordBreak="break-all"
                        data-testid={`config-value-${field.key}`}
                      >
                        {formatValue(data[field.key], field.render)}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
