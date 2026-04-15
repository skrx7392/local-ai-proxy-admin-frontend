'use client';

import { Box, chakra, HStack, Popover, Portal, Stack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';

import { useAdminHealth } from '@/features/health/hooks';
import type { AdminHealth } from '@/features/health/schemas';

type DotTone = 'ok' | 'warn' | 'error' | 'unknown';

function toneFromHealth(query: {
  status: 'pending' | 'error' | 'success';
  data: AdminHealth | undefined;
}): DotTone {
  if (query.status === 'pending') return 'unknown';
  if (query.status === 'error' || !query.data) return 'error';
  return query.data.status === 'ok' ? 'ok' : 'warn';
}

const DOT_COLOR: Record<DotTone, string> = {
  ok: 'green.500',
  warn: 'yellow.500',
  error: 'red.500',
  unknown: 'gray.500',
};

const TONE_LABEL: Record<DotTone, string> = {
  ok: 'healthy',
  warn: 'degraded',
  error: 'unreachable',
  unknown: 'checking',
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH > 0 ? `${d}d ${remH}h` : `${d}d`;
}

export function HealthIndicator() {
  const query = useAdminHealth();
  const tone = useMemo(
    () =>
      toneFromHealth({
        status: query.status,
        data: query.data,
      }),
    [query.status, query.data],
  );
  const dotColor = DOT_COLOR[tone];
  const label = TONE_LABEL[tone];

  const checks = query.data?.checks ?? {};
  const checkEntries = Object.entries(checks);

  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger asChild>
        <chakra.button
          type="button"
          display="inline-flex"
          alignItems="center"
          gap="2"
          paddingInline="2"
          paddingBlock="1"
          borderRadius="md"
          _hover={{ background: 'bg.muted' }}
          aria-label={`Backend health: ${label}`}
          data-testid="topbar-health"
          data-health-tone={tone}
        >
          <Box
            width="2.5"
            height="2.5"
            borderRadius="full"
            background={dotColor}
            boxShadow="0 0 0 2px var(--chakra-colors-bg-canvas, transparent)"
            data-testid="topbar-health-dot"
          />
          <Text textStyle="body.xs" color="fg.muted" display={{ base: 'none', md: 'inline' }}>
            {label}
          </Text>
        </chakra.button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content data-testid="topbar-health-popover" maxW="sm">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <Popover.Body>
              <Stack gap="3">
                <Stack gap="0">
                  <Text textStyle="body.sm" fontWeight="medium">
                    Backend: {label}
                  </Text>
                  {query.data && (
                    <Text textStyle="caption" color="fg.muted">
                      version {query.data.version} · uptime{' '}
                      {formatUptime(query.data.uptime_seconds)}
                    </Text>
                  )}
                  {query.isError && (
                    <Text textStyle="caption" color="red.500">
                      {query.error instanceof Error ? query.error.message : 'Unknown error'}
                    </Text>
                  )}
                </Stack>
                {checkEntries.length > 0 && (
                  <Stack gap="2" as="ul" listStyleType="none" paddingInlineStart="0">
                    {checkEntries.map(([name, result]) => (
                      <HStack
                        key={name}
                        justify="space-between"
                        gap="3"
                        as="li"
                        data-testid={`topbar-health-check-${name}`}
                      >
                        <HStack gap="2">
                          <Box
                            width="2"
                            height="2"
                            borderRadius="full"
                            background={
                              result.status === 'ok' ? 'green.500' : 'red.500'
                            }
                          />
                          <Text textStyle="body.sm" fontFamily="mono">
                            {name}
                          </Text>
                        </HStack>
                        <Text textStyle="caption" color="fg.muted">
                          {result.status === 'ok'
                            ? result.latency_ms !== undefined
                              ? `${result.latency_ms}ms`
                              : 'ok'
                            : (result.error ?? 'error')}
                        </Text>
                      </HStack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
