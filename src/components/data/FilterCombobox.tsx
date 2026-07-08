'use client';

import {
  Combobox,
  Portal,
  Spinner,
  createListCollection,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';

export interface FilterComboboxOption {
  /** Wire value submitted to the filter (e.g. a numeric id as string). */
  value: string;
  /** Human-readable text shown and searched (e.g. "Batch Pipeline (502)"). */
  label: string;
}

export interface FilterComboboxProps {
  /** Visible label rendered inline, to the left of the input. */
  label: string;
  options: readonly FilterComboboxOption[];
  /** Currently applied value; `undefined` means no filter. */
  value: string | undefined;
  /** Fires with the picked option's value, or `null` when cleared. */
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  isLoading?: boolean;
  /**
   * Commit free text (Enter / blur) as the value when it matches no option.
   * Used by the model filter so historical models that are no longer
   * deployed stay filterable. Without it, unmatched text silently reverts —
   * same semantics the raw ID inputs had for garbage input.
   */
  allowCustomValue?: boolean;
  /** Width of the input control. */
  inputWidth?: string;
  'data-testid'?: string;
}

/**
 * Searchable single-select for filter bars: one upfront fetch, client-side
 * substring filtering (datasets on this admin are single-digit), value/label
 * split so the UI shows names while the URL carries ids. Built on Chakra v3's
 * Combobox (Ark UI) so keyboard navigation and ARIA come from the library.
 */
export function FilterCombobox({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  isLoading = false,
  allowCustomValue = false,
  inputWidth = '220px',
  'data-testid': testId,
}: FilterComboboxProps) {
  // Label of the applied selection. Falls back to the raw value while the
  // options are still loading (deep link by id) or when the entity no longer
  // exists — the filter stays visible and clearable either way.
  const selectedLabel = useMemo(() => {
    if (value === undefined) return '';
    return options.find((o) => o.value === value)?.label ?? value;
  }, [options, value]);

  const [inputValue, setInputValue] = useState(selectedLabel);

  // Reflect selection changes (pick, clear, URL navigation) and late-arriving
  // labels in the input text without clobbering in-progress typing: only sync
  // when the *selection's* label actually changed. Adjusted during render
  // (the React-documented derive-state-from-props pattern) rather than in an
  // effect, so there's no flash of the stale text.
  const [prevSelectedLabel, setPrevSelectedLabel] = useState(selectedLabel);
  if (prevSelectedLabel !== selectedLabel) {
    setPrevSelectedLabel(selectedLabel);
    setInputValue(selectedLabel);
  }

  // Show the full list when the text equals the applied selection —
  // reopening the picker should offer every alternative, not just the
  // current one. Filter only while the admin is actively narrowing.
  const filtered = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query || inputValue === selectedLabel) return [...options];
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, inputValue, selectedLabel]);

  const collection = useMemo(
    () => createListCollection({ items: filtered }),
    [filtered],
  );

  function commitCustomValue(raw: string): void {
    const trimmed = raw.trim();
    if (trimmed === (value ?? '')) return;
    onValueChange(trimmed === '' ? null : trimmed);
  }

  return (
    <Combobox.Root
      collection={collection}
      value={value === undefined ? [] : [value]}
      onValueChange={(e) => {
        const picked = e.value[0];
        onValueChange(picked === undefined || picked === '' ? null : picked);
      }}
      inputValue={inputValue}
      onInputValueChange={(e) => setInputValue(e.inputValue)}
      openOnClick
      allowCustomValue={allowCustomValue}
      size="sm"
      display="inline-flex"
      flexDirection="row"
      alignItems="center"
      gap="2"
      width="auto"
      positioning={{ sameWidth: true }}
    >
      <Combobox.Label
        textStyle="body.sm"
        color="fg.muted"
        fontWeight="normal"
        marginBottom="0"
      >
        {label}
      </Combobox.Label>
      <Combobox.Control width={inputWidth}>
        <Combobox.Context>
          {(combobox) => (
            <Combobox.Input
              placeholder={placeholder}
              data-testid={testId}
              onKeyDown={(e) => {
                if (!allowCustomValue || e.key !== 'Enter') return;
                // Ark applies Enter to the highlighted option itself; only
                // commit free text when nothing is highlighted.
                if (combobox.highlightedValue === null) {
                  commitCustomValue(e.currentTarget.value);
                }
              }}
              onBlur={(e) => {
                if (allowCustomValue) {
                  commitCustomValue(e.currentTarget.value);
                } else if (inputValue !== selectedLabel) {
                  // Unmatched text never becomes a filter — revert to the
                  // applied selection so the box shows what's active.
                  setInputValue(selectedLabel);
                }
              }}
            />
          )}
        </Combobox.Context>
        <Combobox.IndicatorGroup>
          {isLoading && <Spinner size="xs" color="fg.muted" />}
          <Combobox.ClearTrigger
            data-testid={testId ? `${testId}-clear` : undefined}
          />
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content data-testid={testId ? `${testId}-list` : undefined}>
            <Combobox.Empty>
              {isLoading ? 'Loading…' : 'No matches'}
            </Combobox.Empty>
            {filtered.map((option) => (
              <Combobox.Item key={option.value} item={option}>
                <Combobox.ItemText>{option.label}</Combobox.ItemText>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
}
