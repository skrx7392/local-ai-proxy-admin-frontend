import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SideNav } from '../SideNav';
import { system } from '@/theme';

// next/navigation's usePathname is a server-client hybrid that needs to
// be mocked for unit tests.
const pathnameMock = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('SideNav', () => {
  it('renders a link to every admin resource', () => {
    pathnameMock.mockReturnValue('/');
    wrap(<SideNav />);
    expect(screen.getByTestId('sidenav-link-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-keys')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-users')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-accounts')).toBeInTheDocument();
    expect(screen.getByTestId('sidenav-link-pricing')).toBeInTheDocument();
    expect(
      screen.getByTestId('sidenav-link-registration-tokens'),
    ).toBeInTheDocument();
  });

  it('marks the current route with aria-current="page"', () => {
    pathnameMock.mockReturnValue('/keys');
    wrap(<SideNav />);
    expect(screen.getByTestId('sidenav-link-keys')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByTestId('sidenav-link-users')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('treats nested routes under a section as active (e.g. /keys/123)', () => {
    pathnameMock.mockReturnValue('/keys/42');
    wrap(<SideNav />);
    expect(screen.getByTestId('sidenav-link-keys')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not treat every route as an active dashboard', () => {
    pathnameMock.mockReturnValue('/keys');
    wrap(<SideNav />);
    expect(screen.getByTestId('sidenav-link-dashboard')).not.toHaveAttribute(
      'aria-current',
    );
  });
});
