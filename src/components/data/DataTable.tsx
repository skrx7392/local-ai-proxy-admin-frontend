'use client';

import { Box, Table, Text, VStack } from '@chakra-ui/react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { DataTableSkeleton } from '@/components/loading';

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  /** Stable id getter — required for React key stability across re-fetches. */
  getRowId: (row: TData) => string;
  'aria-label'?: string;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyState,
  getRowId,
  'aria-label': ariaLabel,
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
    return (
      <DataTableSkeleton
        rows={5}
        columns={Math.max(columns.length, 1)}
      />
    );
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
          <VStack gap="1">
            <Text textStyle="body.md" color="fg.default">
              Nothing here yet
            </Text>
            <Text textStyle="body.sm" color="fg.muted">
              Once there is data to show, it will appear in this table.
            </Text>
          </VStack>
        )}
      </Box>
    );
  }

  return (
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
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id} data-testid="data-table-row">
            {row.getVisibleCells().map((cell) => (
              <Table.Cell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
