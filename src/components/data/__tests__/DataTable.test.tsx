import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { DataTable } from '../DataTable';
import { system } from '@/theme';

type Row = { id: number; name: string; role: string };

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
];

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('DataTable', () => {
  it('renders the skeleton while loading (no rows in the DOM yet)', () => {
    wrap(
      <DataTable
        data={[]}
        columns={columns}
        isLoading
        getRowId={(r) => String(r.id)}
      />,
    );
    expect(screen.queryByTestId('data-table')).toBeNull();
  });

  it('renders the empty state when data is empty and not loading', () => {
    wrap(
      <DataTable data={[]} columns={columns} getRowId={(r) => String(r.id)} />,
    );
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByTestId('data-table')).toBeNull();
  });

  it('renders a custom empty state when provided', () => {
    wrap(
      <DataTable
        data={[]}
        columns={columns}
        emptyState={<div>No keys yet — create one above.</div>}
        getRowId={(r) => String(r.id)}
      />,
    );
    expect(screen.getByText('No keys yet — create one above.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).toBeNull();
  });

  it('renders one row per data item with cell values', () => {
    const data: Row[] = [
      { id: 1, name: 'Ada', role: 'admin' },
      { id: 2, name: 'Bo', role: 'user' },
    ];
    wrap(
      <DataTable data={data} columns={columns} getRowId={(r) => String(r.id)} />,
    );
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(2);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });
});
