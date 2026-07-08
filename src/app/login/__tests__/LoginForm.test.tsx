import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';

let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { signIn } from 'next-auth/react';

import { LoginForm } from '../LoginForm';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

beforeEach(() => {
  search = '';
  vi.mocked(signIn).mockReset();
});

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

describe('<LoginForm /> branding', () => {
  it('renders the "local-ai admin" wordmark on the card', () => {
    const { getByTestId } = wrap(<LoginForm />);
    expect(getByTestId('login-brand').textContent).toContain('local-ai admin');
  });
});

describe('<LoginForm /> show/hide password toggle', () => {
  it('starts masked and toggles the input type and accessible label', () => {
    const { getByTestId } = wrap(<LoginForm />);
    const input = getByTestId('login-password') as HTMLInputElement;
    const toggle = getByTestId('login-password-toggle');

    expect(input.type).toBe('password');
    expect(toggle).toHaveAttribute('aria-label', 'Show password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(input.type).toBe('text');
    expect(toggle).toHaveAttribute('aria-label', 'Hide password');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(input.type).toBe('password');
    expect(toggle).toHaveAttribute('aria-label', 'Show password');
  });

  it('keeps focus on the password field after toggling', () => {
    const { getByTestId } = wrap(<LoginForm />);
    const input = getByTestId('login-password') as HTMLInputElement;
    const toggle = getByTestId('login-password-toggle');

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.click(toggle);
    expect(document.activeElement).toBe(input);
  });
});

describe('<LoginForm /> credential error', () => {
  it('renders an inline error when signIn reports invalid credentials', async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: 'CredentialsSignin',
      status: 401,
      ok: false,
      code: undefined,
      url: null,
    } as Awaited<ReturnType<typeof signIn>>);

    const { getByTestId, queryByTestId } = wrap(<LoginForm />);

    expect(queryByTestId('login-error')).toBeNull();

    fireEvent.change(getByTestId('login-email'), {
      target: { value: 'admin@kinvee.in' },
    });
    fireEvent.change(getByTestId('login-password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(getByTestId('login-submit'));

    await waitFor(() => {
      const error = getByTestId('login-error');
      expect(error).toHaveAttribute('role', 'alert');
      expect(error.textContent).toContain('Invalid email or password.');
    });
    expect(vi.mocked(signIn)).toHaveBeenCalledWith('credentials', {
      email: 'admin@kinvee.in',
      password: 'wrong-password',
      redirect: false,
    });
  });

  it('does not render an error when signIn succeeds', async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: undefined,
      status: 200,
      ok: true,
      code: undefined,
      url: '/',
    } as Awaited<ReturnType<typeof signIn>>);

    const { getByTestId, queryByTestId } = wrap(<LoginForm />);

    fireEvent.change(getByTestId('login-email'), {
      target: { value: 'admin@kinvee.in' },
    });
    fireEvent.change(getByTestId('login-password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(getByTestId('login-submit'));

    await waitFor(() => expect(vi.mocked(signIn)).toHaveBeenCalled());
    expect(queryByTestId('login-error')).toBeNull();
  });
});
