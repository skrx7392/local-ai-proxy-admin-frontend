'use client';

import {
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Text,
  chakra,
} from '@chakra-ui/react';
import { useState } from 'react';

import { FilterBar } from '@/components/data';
import type { UrlPatch } from '@/lib/url/listState';

import {
  QUICK_PICK_MS,
  isIso,
  parseId,
  quickPickRange,
  type QuickPick,
  type UsageFilters,
} from './filters';

const QUICK_PICKS: readonly { key: QuickPick; label: string }[] = [
  { key: '1h', label: '1h' },
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
];

export interface UsageFilterControlsProps {
  filters: UsageFilters;
  onChange: (patch: UrlPatch, options?: { resetOffset?: boolean }) => void;
  showInterval?: boolean;
  interval?: 'hour' | 'day' | undefined;
}

// Converts an ISO string to the `YYYY-MM-DDTHH:MM` shape that
// <input type="datetime-local"> expects. The input is unaware of timezone so
// we display local time; on submit we reconstruct a full ISO string.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function localInputToIso(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Matches whatever quick pick produced the current range (±30s to absorb
// clock drift from when the pick was written vs. the page rendered). Returns
// null when the user picked a custom range.
function detectQuickPick(filters: UsageFilters): QuickPick | null {
  if (!isIso(filters.since) || !isIso(filters.until)) return null;
  const spanMs = Date.parse(filters.until) - Date.parse(filters.since);
  for (const pick of Object.keys(QUICK_PICK_MS) as QuickPick[]) {
    if (Math.abs(spanMs - QUICK_PICK_MS[pick]) <= 30_000) return pick;
  }
  return null;
}

export function UsageFilterControls({
  filters,
  onChange,
  showInterval = false,
  interval,
}: UsageFilterControlsProps) {
  const currentPick = detectQuickPick(filters);
  const [customOpen, setCustomOpen] = useState(currentPick === null);
  const [advancedOpen, setAdvancedOpen] = useState(
    filters.account_id !== undefined ||
      filters.api_key_id !== undefined ||
      filters.user_id !== undefined,
  );
  const [customError, setCustomError] = useState<string | null>(null);

  function applyQuickPick(pick: QuickPick): void {
    const range = quickPickRange(pick);
    setCustomOpen(false);
    setCustomError(null);
    onChange(
      { since: range.since, until: range.until },
      { resetOffset: true },
    );
  }

  function applyCustomRange(sinceLocal: string, untilLocal: string): void {
    const sinceIso = localInputToIso(sinceLocal);
    const untilIso = localInputToIso(untilLocal);
    if (!sinceIso || !untilIso) {
      setCustomError('Both dates are required.');
      return;
    }
    if (Date.parse(sinceIso) >= Date.parse(untilIso)) {
      setCustomError('Start must be before end.');
      return;
    }
    setCustomError(null);
    onChange({ since: sinceIso, until: untilIso }, { resetOffset: true });
  }

  function applyModel(value: string): void {
    const trimmed = value.trim();
    onChange({ model: trimmed || null }, { resetOffset: true });
  }

  function applyId(
    key: 'account_id' | 'api_key_id' | 'user_id',
    value: string,
  ): void {
    if (value.trim() === '') {
      onChange({ [key]: null }, { resetOffset: true });
      return;
    }
    const id = parseId(value);
    // Malformed IDs are silently omitted — the instruction was "validate or
    // intentionally omit, don't send confusing requests". The input stays
    // red so the user sees they typed garbage.
    if (id === undefined) return;
    onChange({ [key]: id }, { resetOffset: true });
  }

  const hasActive =
    currentPick === null ||
    filters.model !== undefined ||
    filters.account_id !== undefined ||
    filters.api_key_id !== undefined ||
    filters.user_id !== undefined;

  return (
    <Stack gap="3" data-testid="usage-filter-controls">
      <FilterBar
        hasActiveFilters={hasActive}
        onClearFilters={() => {
          const fresh = quickPickRange('24h');
          setCustomOpen(false);
          setAdvancedOpen(false);
          setCustomError(null);
          onChange(
            {
              since: fresh.since,
              until: fresh.until,
              model: null,
              account_id: null,
              api_key_id: null,
              user_id: null,
              interval: null,
            },
            { resetOffset: true },
          );
        }}
      >
        <HStack gap="2" data-testid="usage-quick-picks">
          {QUICK_PICKS.map((qp) => (
            <Button
              key={qp.key}
              size="sm"
              variant={currentPick === qp.key ? 'solid' : 'outline'}
              onClick={() => applyQuickPick(qp.key)}
              data-testid={`usage-quick-pick-${qp.key}`}
            >
              {qp.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={customOpen || currentPick === null ? 'solid' : 'outline'}
            onClick={() => setCustomOpen((v) => !v)}
            data-testid="usage-quick-pick-custom"
          >
            Custom
          </Button>
        </HStack>

        <chakra.label display="inline-flex" alignItems="center" gap="2">
          <Text textStyle="body.sm" color="fg.muted">
            Model
          </Text>
          <Input
            size="sm"
            width="180px"
            defaultValue={filters.model ?? ''}
            placeholder="llama3.1:8b"
            data-testid="usage-filter-model"
            onBlur={(e) => applyModel(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyModel(e.currentTarget.value);
            }}
          />
        </chakra.label>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAdvancedOpen((v) => !v)}
          data-testid="usage-filter-advanced-toggle"
        >
          {advancedOpen ? 'Hide' : 'Advanced'}
        </Button>
      </FilterBar>

      {customOpen && (
        <CustomRangeRow
          sinceIso={filters.since}
          untilIso={filters.until}
          error={customError}
          onApply={applyCustomRange}
        />
      )}

      {advancedOpen && (
        <HStack gap="3" data-testid="usage-filter-advanced">
          <IdField
            label="Account ID"
            defaultValue={filters.account_id}
            testId="usage-filter-account-id"
            onCommit={(v) => applyId('account_id', v)}
          />
          <IdField
            label="API key ID"
            defaultValue={filters.api_key_id}
            testId="usage-filter-api-key-id"
            onCommit={(v) => applyId('api_key_id', v)}
          />
          <IdField
            label="User ID"
            defaultValue={filters.user_id}
            testId="usage-filter-user-id"
            onCommit={(v) => applyId('user_id', v)}
          />
          {showInterval && (
            <chakra.label display="inline-flex" alignItems="center" gap="2">
              <Text textStyle="body.sm" color="fg.muted">
                Interval
              </Text>
              <HStack gap="1">
                {(['hour', 'day'] as const).map((iv) => (
                  <Button
                    key={iv}
                    size="xs"
                    variant={interval === iv ? 'solid' : 'outline'}
                    onClick={() =>
                      onChange({ interval: iv }, { resetOffset: true })
                    }
                    data-testid={`usage-filter-interval-${iv}`}
                  >
                    {iv}
                  </Button>
                ))}
              </HStack>
            </chakra.label>
          )}
        </HStack>
      )}
    </Stack>
  );
}

function CustomRangeRow({
  sinceIso,
  untilIso,
  error,
  onApply,
}: {
  sinceIso: string;
  untilIso: string;
  error: string | null;
  onApply: (since: string, until: string) => void;
}) {
  const [since, setSince] = useState(isoToLocalInput(sinceIso));
  const [until, setUntil] = useState(isoToLocalInput(untilIso));

  return (
    <Stack gap="1">
      <HStack gap="3" data-testid="usage-custom-range">
        <chakra.label display="inline-flex" alignItems="center" gap="2">
          <Text textStyle="body.sm" color="fg.muted">
            From
          </Text>
          <Input
            size="sm"
            type="datetime-local"
            value={since}
            data-testid="usage-custom-since"
            onChange={(e) => setSince(e.currentTarget.value)}
          />
        </chakra.label>
        <chakra.label display="inline-flex" alignItems="center" gap="2">
          <Text textStyle="body.sm" color="fg.muted">
            To
          </Text>
          <Input
            size="sm"
            type="datetime-local"
            value={until}
            data-testid="usage-custom-until"
            onChange={(e) => setUntil(e.currentTarget.value)}
          />
        </chakra.label>
        <Button
          size="sm"
          onClick={() => onApply(since, until)}
          data-testid="usage-custom-apply"
        >
          Apply
        </Button>
      </HStack>
      {error && (
        <Box role="alert" color="red.500">
          <Text textStyle="caption" data-testid="usage-custom-error">
            {error}
          </Text>
        </Box>
      )}
    </Stack>
  );
}

function IdField({
  label,
  defaultValue,
  testId,
  onCommit,
}: {
  label: string;
  defaultValue: number | undefined;
  testId: string;
  onCommit: (value: string) => void;
}) {
  return (
    <chakra.label display="inline-flex" alignItems="center" gap="2">
      <Text textStyle="body.sm" color="fg.muted">
        {label}
      </Text>
      <Input
        size="sm"
        width="120px"
        inputMode="numeric"
        defaultValue={defaultValue ?? ''}
        data-testid={testId}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(e.currentTarget.value);
        }}
      />
    </chakra.label>
  );
}
