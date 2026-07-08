import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NAV_ITEMS } from '@/lib/nav/navItems';
import { system } from '@/theme';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { NavSearch } from '../NavSearch';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

function getInput(): HTMLInputElement {
  return screen.getByTestId('nav-search');
}

beforeEach(() => {
  pushMock.mockReset();
});

describe('<NavSearch /> suggestions popover', () => {
  it('is a collapsed combobox until focused', () => {
    wrap(<NavSearch />);
    const input = getInput();
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lists every destination on focus', () => {
    wrap(<NavSearch />);
    fireEvent.focus(getInput());

    expect(getInput()).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(NAV_ITEMS.length);
    expect(options.map((o) => o.textContent)).toEqual(
      NAV_ITEMS.map((item) => item.label),
    );
  });

  it('filters fuzzily as you type', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);

    // Non-contiguous subsequence: u·s·g → Usage only (not Users).
    fireEvent.change(input, { target: { value: 'usg' } });
    let options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Usage']);

    // Prefix match hits both registration destinations.
    fireEvent.change(input, { target: { value: 'reg' } });
    options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Registration tokens', 'Registrations']),
    );
    expect(options).toHaveLength(2);
  });

  it('shows a "no matches" state and Enter is a no-op there', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzzz' } });

    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByTestId('nav-search-empty')).toHaveTextContent(
      'No matches',
    );

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navigates with ArrowDown + Enter and closes/resets', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);

    // First option (Dashboard) is highlighted; ArrowDown moves to Usage.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = screen.getByRole('option', { name: 'Usage' });
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', active.id);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(pushMock).toHaveBeenCalledExactlyOnceWith('/usage');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('');
  });

  it('wraps keyboard highlight at both ends', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);

    // ArrowUp from the first option wraps to the last (Config).
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: 'Config' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // ArrowDown from the last wraps back to the first (Dashboard).
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Dashboard' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('navigates on click', () => {
    wrap(<NavSearch />);
    fireEvent.focus(getInput());

    fireEvent.click(screen.getByRole('option', { name: 'Keys' }));
    expect(pushMock).toHaveBeenCalledExactlyOnceWith('/keys');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape closes the popover but keeps focus and text; a second Escape clears and blurs', () => {
    wrap(<NavSearch />);
    const input = getInput();
    input.focus();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'key' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('key');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(document.activeElement).not.toBe(input);
  });

  it('typing reopens the popover after it was dismissed', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.change(input, { target: { value: 'no' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Nodes' }),
    ).toBeInTheDocument();
  });

  it('preserves legacy behavior: exact name + Enter navigates even with the popover dismissed', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'keys' } });
    fireEvent.keyDown(input, { key: 'Escape' }); // ignore/dismiss the popover
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(pushMock).toHaveBeenCalledExactlyOnceWith('/keys');
    expect(input.value).toBe('');
  });

  it('closes the popover on blur', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.blur(input);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('wires combobox ARIA to the listbox it controls', () => {
    wrap(<NavSearch />);
    const input = getInput();
    fireEvent.focus(input);

    const listbox = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).toHaveAttribute('aria-autocomplete', 'list');

    const first = screen.getAllByRole('option')[0]!;
    expect(input).toHaveAttribute('aria-activedescendant', first.id);
  });
});
