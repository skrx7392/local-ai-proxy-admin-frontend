'use client';

import { Box, Table } from '@chakra-ui/react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { DataTableSkeleton } from '@/components/loading';
import { EmptyState } from './EmptyState';

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  /** Stable id getter — required for React key stability across re-fetches. */
  getRowId: (row: TData) => string;
  'aria-label'?: string;
  /**
   * When provided, every row navigates to this href on click / Enter and
   * gets the pointer + hover affordance (the table recipe styles
   * `[data-interactive]` rows only). Omit it for tables without a detail
   * page so their rows don't look clickable.
   *
   * Clicks on interactive elements inside a row (links, buttons, inputs)
   * and clicks that end a text selection never trigger navigation.
   */
  rowHref?: (row: TData) => string;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyState,
  getRowId,
  'aria-label': ariaLabel,
  rowHref,
}: DataTableProps<TData>) {
  // @tanstack/react-table is the documented API for headless tables; the
  // React-Compiler "incompatible library" lint is a false positive here
  // because useReactTable memoizes internally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  if (isLoading) {
    return <DataTableSkeleton rows={5} columns={Math.max(columns.length, 1)} />;
  }

  if (data.length === 0) {
    return (
      <Box
        borderWidth="1px"
        borderColor="border.glass"
        borderRadius="lg"
        background="bg.glass.surface"
        padding="10"
        textAlign="center"
      >
        {emptyState ?? (
          <EmptyState
            title="Nothing here yet"
            description="Once there is data to show, it will appear in this table."
          />
        )}
      </Box>
    );
  }

  return (
    // Every data table scrolls horizontally when its natural width exceeds
    // the viewport (narrow windows / mobile), so trailing columns and row
    // actions stay reachable instead of being clipped. The wrapper is a
    // focusable region so keyboard users can scroll it (and axe's
    // scrollable-region-focusable check passes).
    <Box
      overflowX="auto"
      maxWidth="100%"
      tabIndex={0}
      role="region"
      aria-label={ariaLabel ?? 'Data table'}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'border.focus',
        outlineOffset: '2px',
      }}
      data-testid="data-table-scroll"
    >
      <Table.Root aria-label={ariaLabel} data-testid="data-table">
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.ColumnHeader
                  key={header.id}
                  style={
                    header.column.columnDef.size !== undefined
                      ? { width: `${header.column.columnDef.size}px` }
                      : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) =>
            rowHref ? (
              <ClickableRow key={row.id} href={rowHref(row.original)}>
                {renderCells(row)}
              </ClickableRow>
            ) : (
              <Table.Row key={row.id} data-testid="data-table-row">
                {renderCells(row)}
              </Table.Row>
            ),
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

function renderCells<TData>(row: Row<TData>): ReactNode {
  return row.getVisibleCells().map((cell) => (
    <Table.Cell key={cell.id}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </Table.Cell>
  ));
}

// Elements that own their own click/keyboard behavior — activating one of
// these inside a clickable row must never also navigate the row.
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"]';

/**
 * A table row that navigates on click / Enter. Split into its own component
 * so `useRouter` is only mounted when a table opts into navigation — tables
 * without `rowHref` never touch the app router (which also keeps them
 * renderable in environments without a router context).
 */
function ClickableRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>): void {
    if (event.defaultPrevented) return;
    // Inner links/buttons (e.g. the row's Deactivate action) keep their own
    // behavior.
    if (
      event.target instanceof Element &&
      event.target.closest(INTERACTIVE_SELECTOR) !== null
    ) {
      return;
    }
    // Selecting text fires a click on mouseup — don't yank the user away.
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    // Honor open-in-new-tab intent (cmd/ctrl-click), like a real link would.
    if (event.metaKey || event.ctrlKey) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>): void {
    if (event.key !== 'Enter') return;
    // Only when the row itself is focused — Enter on an inner control (a
    // focused action button) must keep its own meaning.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    router.push(href);
  }

  return (
    <Table.Row
      data-testid="data-table-row"
      // Drives the recipe's hover + cursor + focus-ring styling.
      data-interactive=""
      data-href={href}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Table.Row>
  );
}
