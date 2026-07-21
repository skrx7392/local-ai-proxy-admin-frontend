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

import { FilterBar, FilterCombobox } from '@/components/data';
import type { UrlPatch } from '@/lib/url/listState';

import {
  useAccountOptions,
  useApiKeyOptions,
  useModelOptions,
  useNodeOptions,
  useUserOptions,
  type EntityOptionsResult,
} from './entityOptions';
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
  // Advanced-row visibility is DERIVED unless the user explicitly toggled
  // it (choice !== null). Any active advanced setting — entity filters, or
  // an interval override on a tab that consumes it — auto-opens the row, so
  // deep links and tab switches can never hide an active setting behind a
  // collapsed panel. The controls stay mounted across tab switches, which is
  // why this must be computed per render rather than seeded once in state.
  const [advancedChoice, setAdvancedChoice] = useState<boolean | null>(null);
  const advancedOpen =
    advancedChoice ??
    (filters.account_id !== undefined ||
      filters.api_key_id !== undefined ||
      filters.user_id !== undefined ||
      filters.node_id !== undefined ||
      (showInterval && interval !== undefined));
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

  function applyModel(value: string | null): void {
    const trimmed = value?.trim() ?? '';
    onChange({ model: trimmed || null }, { resetOffset: true });
  }

  function applyId(
    key: 'account_id' | 'api_key_id' | 'user_id' | 'node_id',
    value: string | null,
  ): void {
    if (value === null || value.trim() === '') {
      onChange({ [key]: null }, { resetOffset: true });
      return;
    }
    // Values come from picker options so they're always valid ids; the
    // parse is a guard against malformed input ever reaching the wire —
    // "validate or intentionally omit, don't send confusing requests".
    const id = parseId(value);
    if (id === undefined) return;
    onChange({ [key]: id }, { resetOffset: true });
  }

  const hasActive =
    currentPick === null ||
    filters.model !== undefined ||
    filters.account_id !== undefined ||
    filters.api_key_id !== undefined ||
    filters.user_id !== undefined ||
    filters.node_id !== undefined ||
    (showInterval && interval !== undefined);

  return (
    <Stack gap="3" data-testid="usage-filter-controls">
      <FilterBar
        hasActiveFilters={hasActive}
        onClearFilters={() => {
          const fresh = quickPickRange('24h');
          setCustomOpen(false);
          setAdvancedChoice(null);
          setCustomError(null);
          onChange(
            {
              since: fresh.since,
              until: fresh.until,
              model: null,
              account_id: null,
              api_key_id: null,
              user_id: null,
              node_id: null,
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

        <ModelFilter model={filters.model} onApply={applyModel} />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAdvancedChoice(!advancedOpen)}
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
        <HStack gap="3" wrap="wrap" data-testid="usage-filter-advanced">
          <EntityFilters filters={filters} onApply={applyId} />
          {showInterval && (
            <chakra.label display="inline-flex" alignItems="center" gap="2">
              <Text textStyle="body.sm" color="fg.muted">
                Interval
              </Text>
              <HStack gap="1">
                {/* "auto" clears the override: the backend then picks hour
                    for windows ≤48h and day beyond — without it a chosen
                    interval silently persisted across range changes. */}
                {/* Interval feeds only the timeseries charts — never the
                    paginated table queries — so changing it must not reset
                    the table's offset. */}
                <Button
                  size="xs"
                  variant={interval === undefined ? 'solid' : 'outline'}
                  onClick={() => onChange({ interval: null })}
                  data-testid="usage-filter-interval-auto"
                >
                  auto
                </Button>
                {(['hour', 'day'] as const).map((iv) => (
                  <Button
                    key={iv}
                    size="xs"
                    variant={interval === iv ? 'solid' : 'outline'}
                    onClick={() => onChange({ interval: iv })}
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

// The model filter is always visible, so its options hook lives in its own
// component purely for cohesion — /nodes is the same query the Nodes page
// runs and react-query dedupes it. Free text stays allowed (historical
// models that are no longer deployed on any node).
function ModelFilter({
  model,
  onApply,
}: {
  model: string | undefined;
  onApply: (value: string | null) => void;
}) {
  const { options, isLoading } = useModelOptions();
  return (
    <FilterCombobox
      label="Model"
      options={options}
      value={model}
      onValueChange={onApply}
      placeholder="Any model"
      isLoading={isLoading}
      allowCustomValue
      inputWidth="200px"
      data-testid="usage-filter-model"
    />
  );
}

type EntityKey = 'account_id' | 'api_key_id' | 'user_id' | 'node_id';

// Mounted only while the Advanced panel is open, so the four entity lists
// are fetched lazily — opening /usage without touching Advanced costs no
// extra requests beyond the model list.
function EntityFilters({
  filters,
  onApply,
}: {
  filters: UsageFilters;
  onApply: (key: EntityKey, value: string | null) => void;
}) {
  const accounts = useAccountOptions();
  const keys = useApiKeyOptions();
  const users = useUserOptions();
  const nodes = useNodeOptions();

  const pickers: readonly {
    key: EntityKey;
    label: string;
    placeholder: string;
    testId: string;
    value: number | undefined;
    data: EntityOptionsResult;
  }[] = [
    {
      key: 'account_id',
      label: 'Account',
      placeholder: 'All accounts',
      testId: 'usage-filter-account-id',
      value: filters.account_id,
      data: accounts,
    },
    {
      key: 'api_key_id',
      label: 'API key',
      placeholder: 'All keys',
      testId: 'usage-filter-api-key-id',
      value: filters.api_key_id,
      data: keys,
    },
    {
      key: 'user_id',
      label: 'User',
      placeholder: 'All users',
      testId: 'usage-filter-user-id',
      value: filters.user_id,
      data: users,
    },
    {
      key: 'node_id',
      label: 'Node',
      placeholder: 'All nodes',
      testId: 'usage-filter-node-id',
      value: filters.node_id,
      data: nodes,
    },
  ];

  return (
    <>
      {pickers.map((picker) => (
        <FilterCombobox
          key={picker.key}
          label={picker.label}
          options={picker.data.options}
          value={picker.value?.toString()}
          onValueChange={(v) => onApply(picker.key, v)}
          placeholder={picker.placeholder}
          isLoading={picker.data.isLoading}
          data-testid={picker.testId}
        />
      ))}
    </>
  );
}
