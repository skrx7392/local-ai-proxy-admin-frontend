import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from '../DataTable';
import { system } from '@/theme';

// DataTable's clickable rows navigate through the app router; jsdom has no
// app-router context, so stub it with an observable push spy.
const routerPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

type Row = { id: number; name: string; role: string };

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
];

const data: Row[] = [
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Bo', role: 'user' },
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

describe('DataTable — row navigation (rowHref)', () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderClickable(extraColumns: ColumnDef<Row, unknown>[] = []) {
    return wrap(
      <DataTable
        data={data}
        columns={[...columns, ...extraColumns]}
        getRowId={(r) => String(r.id)}
        rowHref={(r) => `/rows/${r.id}`}
      />,
    );
  }

  it('rows without rowHref carry no interactive affordance', () => {
    wrap(
      <DataTable data={data} columns={columns} getRowId={(r) => String(r.id)} />,
    );
    for (const row of screen.getAllByTestId('data-table-row')) {
      expect(row.hasAttribute('data-interactive')).toBe(false);
      expect(row.getAttribute('tabindex')).toBeNull();
    }
  });

  it('rows with rowHref are marked interactive and keyboard-focusable', () => {
    renderClickable();
    const rows = screen.getAllByTestId('data-table-row');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.hasAttribute('data-interactive')).toBe(true);
      expect(row.getAttribute('tabindex')).toBe('0');
    }
    expect(rows[0]?.getAttribute('data-href')).toBe('/rows/1');
    expect(rows[1]?.getAttribute('data-href')).toBe('/rows/2');
  });

  it('clicking anywhere in a row navigates to its href', () => {
    renderClickable();
    fireEvent.click(screen.getByText('Ada'));
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/rows/1');
  });

  it('Enter on a focused row navigates', () => {
    renderClickable();
    const row = screen
      .getAllByTestId('data-table-row')
      .find((r) => r.getAttribute('data-href') === '/rows/2');
    expect(row).toBeDefined();
    row!.focus();
    fireEvent.keyDown(row!, { key: 'Enter' });
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith('/rows/2');
  });

  it('other keys on a focused row do not navigate', () => {
    renderClickable();
    const row = screen.getAllByTestId('data-table-row')[0]!;
    row.focus();
    fireEvent.keyDown(row, { key: ' ' });
    fireEvent.keyDown(row, { key: 'Escape' });
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('clicks on interactive elements inside the row do not navigate', () => {
    const onAction = vi.fn();
    renderClickable([
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button type="button" onClick={() => onAction(row.original.id)}>
            Deactivate
          </button>
        ),
      },
    ]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]!);
    expect(onAction).toHaveBeenCalledWith(1);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('Enter dispatched from an inner control does not trigger row navigation', () => {
    renderClickable([
      {
        id: 'actions',
        header: '',
        cell: () => <button type="button">Deactivate</button>,
      },
    ]);
    const button = screen.getAllByRole('button', { name: 'Deactivate' })[0]!;
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('does not navigate when the click ends a text selection', () => {
    renderClickable();
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      toString: () => 'Ada',
    } as unknown as Selection);
    fireEvent.click(screen.getByText('Ada'));
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('cmd/ctrl-click opens the row target in a new tab instead of navigating', () => {
    renderClickable();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    fireEvent.click(screen.getByText('Ada'), { metaKey: true });
    expect(open).toHaveBeenCalledWith('/rows/1', '_blank', 'noopener,noreferrer');
    expect(routerPush).not.toHaveBeenCalled();
  });
});
