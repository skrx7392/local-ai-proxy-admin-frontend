import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';

let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { LoginForm } from '../LoginForm';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('<LoginForm /> session-expired message', () => {
  it('explains the signout when arriving with ?expired=1', () => {
    search = 'expired=1&callbackUrl=%2Fkeys';
    const { getByTestId } = wrap(<LoginForm />);

    const alert = getByTestId('login-expired');
    expect(alert.textContent).toContain(
      'Your session has expired. Sign in again to continue.',
    );
  });

  it('shows no expiry message on a normal visit', () => {
    search = '';
    const { queryByTestId, getByTestId } = wrap(<LoginForm />);

    expect(queryByTestId('login-expired')).toBeNull();
    expect(getByTestId('login-card')).toBeInTheDocument();
  });
});
