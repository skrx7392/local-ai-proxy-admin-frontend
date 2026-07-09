import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import PricingPage from '../pricing/page';

// useListSearchParams needs the app-router hooks; NextLink works in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/pricing',
  useSearchParams: () => new URLSearchParams(),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('/pricing — archive confirmation', () => {
  useMockBackend();

  it('names the model and archives only after explicit confirmation', async () => {
    const deleted: string[] = [];
    server.use(
      http.delete('*/api/admin/pricing/:id', ({ params }) => {
        deleted.push(params.id as string);
        return HttpResponse.json({ status: 'deleted' });
      }),
    );
    const { findByTestId, findByText, getByTestId, queryByTestId } = wrap(
      <PricingPage />,
    );
    await findByTestId('pricing-delete-201');

    fireEvent.click(getByTestId('pricing-delete-201'));
    await findByTestId('confirm-dialog');
    // The dialog must name the specific model being archived.
    await findByText(/"llama3\.1:8b" will fall back to the default rate/);
    // Opening the dialog must not fire the mutation.
    expect(deleted).toHaveLength(0);

    fireEvent.click(getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(deleted).toEqual(['201']));
    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
  });

  it('cancel closes the dialog without archiving', async () => {
    const deleted: string[] = [];
    server.use(
      http.delete('*/api/admin/pricing/:id', ({ params }) => {
        deleted.push(params.id as string);
        return HttpResponse.json({ status: 'deleted' });
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = wrap(<PricingPage />);
    await findByTestId('pricing-delete-201');

    fireEvent.click(getByTestId('pricing-delete-201'));
    await findByTestId('confirm-dialog');
    fireEvent.click(getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
    expect(deleted).toHaveLength(0);
  });
});

describe('/pricing — outlier rate confirmation', () => {
  useMockBackend();

  // The fixture catalog tops out at 1500/1M tokens, so 20000 is > 10x the max
  // existing rate and must trip the non-blocking warn-and-confirm flow.
  const OUTLIER_RATE = '20000';

  async function openFormAndSubmitOutlier(
    ui: ReturnType<typeof wrap>,
  ): Promise<void> {
    const { findByTestId, getByTestId } = ui;
    fireEvent.click(await findByTestId('pricing-create-button'));
    await findByTestId('pricing-form-dialog');

    fireEvent.change(getByTestId('pricing-model-id'), {
      target: { value: 'gemma4:e4b' },
    });
    fireEvent.change(getByTestId('pricing-prompt-rate'), {
      target: { value: OUTLIER_RATE },
    });
    fireEvent.change(getByTestId('pricing-completion-rate'), {
      target: { value: OUTLIER_RATE },
    });
    fireEvent.click(getByTestId('pricing-submit'));
  }

  it('warns on an order-of-magnitude rate and proceeds only on confirm', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('*/api/admin/pricing', async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json({ status: 'updated' });
      }),
    );

    const ui = wrap(<PricingPage />);
    await openFormAndSubmitOutlier(ui);

    // The warning dialog appears and the upsert has NOT fired yet.
    await ui.findByText(/an order of magnitude higher/i);
    expect(posted).toHaveLength(0);

    fireEvent.click(ui.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ model_id: 'gemma4:e4b' });
  });

  it('cancel aborts the submission without posting', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('*/api/admin/pricing', async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json({ status: 'updated' });
      }),
    );

    const ui = wrap(<PricingPage />);
    await openFormAndSubmitOutlier(ui);

    await ui.findByText(/an order of magnitude higher/i);
    fireEvent.click(ui.getByTestId('confirm-dialog-cancel'));

    await waitFor(() =>
      expect(ui.queryByText(/an order of magnitude higher/i)).toBeNull(),
    );
    expect(posted).toHaveLength(0);
  });

  it('does not warn on an in-range rate', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('*/api/admin/pricing', async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json({ status: 'updated' });
      }),
    );

    const ui = wrap(<PricingPage />);
    const { findByTestId, getByTestId } = ui;
    fireEvent.click(await findByTestId('pricing-create-button'));
    await findByTestId('pricing-form-dialog');
    fireEvent.change(getByTestId('pricing-model-id'), {
      target: { value: 'mistral:7b' },
    });
    fireEvent.change(getByTestId('pricing-prompt-rate'), {
      target: { value: '80' },
    });
    fireEvent.change(getByTestId('pricing-completion-rate'), {
      target: { value: '200' },
    });
    fireEvent.click(getByTestId('pricing-submit'));

    // No warning — the upsert fires straight away.
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(ui.queryByText(/an order of magnitude higher/i)).toBeNull();
  });
});

describe('/pricing — rates render in USD', () => {
  useMockBackend();

  it('formats prompt and completion rates as USD per 1M tokens', async () => {
    const { findByText, findAllByText } = wrap(<PricingPage />);

    // llama3.1:8b fixture: prompt 50, completion 150 credits/MTok, now shown
    // as dollars (1 credit = $1, matching the rest of the app).
    await findByText('$50.00');
    await findByText('$150.00');

    // Each rate cell is captioned "per 1M tokens" (no "credits" wording).
    const captions = await findAllByText('per 1M tokens');
    expect(captions.length).toBeGreaterThan(0);
  });
});

describe('/pricing — models serving without pricing', () => {
  useMockBackend();

  it('flags an unpriced serving model with its effective rate', async () => {
    const { findByTestId } = wrap(<PricingPage />);

    // gemma4:e2b is in usage/by-model but absent from the pricing catalog.
    const notice = await findByTestId('unpriced-models-notice');
    expect(notice).toBeTruthy();
    await findByTestId('unpriced-model-gemma4:e2b');

    // Effective rate = 21.73 / 869_200 * 1e6 = $25.00 / 1M tokens.
    const rate = await findByTestId('unpriced-effective-rate-gemma4:e2b');
    expect(rate.textContent).toBe('$25.00');
  });

  it('prefills the pricing form when adding a rate for a flagged model', async () => {
    const { findByTestId, getByTestId } = wrap(<PricingPage />);

    fireEvent.click(await findByTestId('unpriced-add-pricing-gemma4:e2b'));
    await findByTestId('pricing-form-dialog');

    const modelInput = getByTestId('pricing-model-id') as HTMLInputElement;
    expect(modelInput.value).toBe('gemma4:e2b');
  });
});
