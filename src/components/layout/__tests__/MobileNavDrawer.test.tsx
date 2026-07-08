import { ChakraProvider } from '@chakra-ui/react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Ark's drawer open/close transitions run through rAF ticks; under a loaded
// CI machine the default 1s async-util timeout is occasionally too tight.
configure({ asyncUtilTimeout: 5000 });

import { MobileNavDrawer } from '../MobileNavDrawer';
import { system } from '@/theme';

// next/navigation's usePathname is a server-client hybrid that needs to
// be mocked for unit tests.
const pathnameMock = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

// Clicking a real next/link outside an app-router context throws; a plain
// anchor preserves the onClick contract this suite exercises. preventDefault
// stops jsdom from attempting a real document navigation.
vi.mock('next/link', () => ({
  default: ({ children, onClick, ...props }: ComponentProps<'a'>) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('MobileNavDrawer', () => {
  it('renders a hamburger trigger and keeps the drawer unmounted while closed', () => {
    pathnameMock.mockReturnValue('/');
    wrap(<MobileNavDrawer />);
    expect(screen.getByTestId('mobile-nav-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-nav-drawer')).toBeNull();
  });

  it('opens the drawer with every nav link when the hamburger is clicked', async () => {
    pathnameMock.mockReturnValue('/');
    wrap(<MobileNavDrawer />);

    fireEvent.click(screen.getByTestId('mobile-nav-trigger'));

    expect(await screen.findByTestId('mobile-nav-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-keys')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-users')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-config')).toBeInTheDocument();
  });

  it('marks the current route active inside the drawer', async () => {
    pathnameMock.mockReturnValue('/keys');
    wrap(<MobileNavDrawer />);

    fireEvent.click(screen.getByTestId('mobile-nav-trigger'));
    await screen.findByTestId('mobile-nav-drawer');

    expect(screen.getByTestId('sidenav-link-keys')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('sidenav-link-users')).not.toHaveAttribute('aria-current');
  });

  it('closes when a nav link is clicked', async () => {
    pathnameMock.mockReturnValue('/');
    wrap(<MobileNavDrawer />);

    fireEvent.click(screen.getByTestId('mobile-nav-trigger'));
    await screen.findByTestId('mobile-nav-drawer');

    fireEvent.click(screen.getByTestId('sidenav-link-keys'));

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).toBeNull();
    });
  });

  it('traps focus inside the drawer and closes on Escape (Chakra Drawer built-ins)', async () => {
    pathnameMock.mockReturnValue('/');
    wrap(<MobileNavDrawer />);

    fireEvent.click(screen.getByTestId('mobile-nav-trigger'));
    const drawer = await screen.findByTestId('mobile-nav-drawer');

    // Ark's focus trap moves focus into the drawer once it is fully open;
    // waiting for that both verifies the trap and guarantees the dismiss
    // listeners are attached before we send Escape.
    await waitFor(() => {
      expect(drawer.contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document.activeElement ?? drawer, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).toBeNull();
    });
  });

  it('closes via the explicit close button', async () => {
    pathnameMock.mockReturnValue('/');
    wrap(<MobileNavDrawer />);

    fireEvent.click(screen.getByTestId('mobile-nav-trigger'));
    await screen.findByTestId('mobile-nav-drawer');

    fireEvent.click(screen.getByTestId('mobile-nav-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).toBeNull();
    });
  });
});
