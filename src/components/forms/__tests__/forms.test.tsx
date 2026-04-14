import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FormField } from '../FormField';
import { FormMoney } from '../FormMoney';
import { FormSelect } from '../FormSelect';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('FormField', () => {
  function Harness({ errorMessage }: { errorMessage?: string }) {
    const { register } = useForm<{ email: string }>({
      defaultValues: { email: '' },
    });
    return (
      <FormField
        name="email"
        label="Email"
        register={register}
        placeholder="you@example.com"
        helperText="We only use it for sign-in."
        errorMessage={errorMessage}
        data-testid="email-input"
      />
    );
  }

  it('renders label, input, and helper text in the neutral state', () => {
    wrap(<Harness />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText('We only use it for sign-in.')).toBeInTheDocument();
  });

  it('hides helper text and shows error text when invalid', () => {
    wrap(<Harness errorMessage="Required" />);
    expect(screen.queryByText('We only use it for sign-in.')).toBeNull();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('writes user input into the form value', () => {
    wrap(<Harness />);
    const input = screen.getByTestId('email-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a@b.c' } });
    expect(input.value).toBe('a@b.c');
  });
});

describe('FormSelect', () => {
  function Harness({ onSubmit }: { onSubmit: (v: { role: string }) => void }) {
    const { control, handleSubmit } = useForm<{ role: string }>({
      defaultValues: { role: 'user' },
    });
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormSelect
          name="role"
          label="Role"
          control={control}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
          ]}
          data-testid="role-select"
        />
        <button type="submit">Save</button>
      </form>
    );
  }

  it('renders the default value and reflects selection changes', () => {
    const onSubmit = vi.fn();
    wrap(<Harness onSubmit={onSubmit} />);
    const select = screen.getByTestId('role-select') as HTMLSelectElement;
    expect(select.value).toBe('user');
    fireEvent.change(select, { target: { value: 'admin' } });
    expect(select.value).toBe('admin');
  });

  it('submits the selected value through react-hook-form', async () => {
    const onSubmit = vi.fn();
    wrap(<Harness onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('role-select'), {
      target: { value: 'admin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => {
      expect(onSubmit.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ role: 'admin' }),
      );
    });
  });
});

describe('FormMoney', () => {
  function Harness({
    storeUnit = 'cents' as 'cents' | 'dollars',
    defaultAmount = 0,
    onSubmit,
  }: {
    storeUnit?: 'cents' | 'dollars';
    defaultAmount?: number;
    onSubmit: (v: { amount: number | '' }) => void;
  }) {
    const { control, handleSubmit } = useForm<{ amount: number | '' }>({
      defaultValues: { amount: defaultAmount },
    });
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormMoney
          name="amount"
          label="Amount"
          control={control}
          storeUnit={storeUnit}
          data-testid="amount-input"
        />
        <button type="submit">Submit</button>
      </form>
    );
  }

  it('displays the stored cents value as a dollar string', () => {
    wrap(<Harness defaultAmount={1234} onSubmit={() => {}} />);
    const input = screen.getByTestId('amount-input') as HTMLInputElement;
    expect(input.value).toBe('12.34');
  });

  it('stores the integer cent count when the user types dollars', async () => {
    const onSubmit = vi.fn();
    wrap(<Harness onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('amount-input'), {
      target: { value: '25.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await vi.waitFor(() => {
      expect(onSubmit.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ amount: 2550 }),
      );
    });
  });

  it('rounds sub-penny inputs to the nearest cent (no float drift)', async () => {
    const onSubmit = vi.fn();
    wrap(<Harness onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('amount-input'), {
      target: { value: '0.1' }, // 0.1 * 100 would drift without rounding
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await vi.waitFor(() => {
      expect(onSubmit.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ amount: 10 }),
      );
    });
  });

  it('stores dollars directly when storeUnit="dollars"', async () => {
    const onSubmit = vi.fn();
    wrap(<Harness storeUnit="dollars" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('amount-input'), {
      target: { value: '42.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await vi.waitFor(() => {
      expect(onSubmit.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ amount: 42.5 }),
      );
    });
  });
});
