import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { PricingFormDialog } from '../PricingFormDialog';
import type { Pricing } from '../schemas';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

const ROW: Pricing = {
  id: 7,
  model_id: 'llama3.1:8b',
  prompt_rate_per_mtok: 5,
  completion_rate_per_mtok: 15,
  typical_completion: 500,
  effective_from: '2026-01-01T00:00:00Z',
  active: true,
};

describe('PricingFormDialog', () => {
  it('shows the edit variant when editing a row', () => {
    wrap(<PricingFormDialog isOpen editing={ROW} onOpenChange={() => {}} onSubmit={() => {}} />);

    expect(screen.getByText('Edit pricing')).toBeInTheDocument();
    // model_id is locked when editing an existing row.
    expect(screen.getByTestId('pricing-model-id')).toBeDisabled();
  });

  it('frames the rates in USD', () => {
    wrap(<PricingFormDialog isOpen editing={ROW} onOpenChange={() => {}} onSubmit={() => {}} />);

    // Description no longer says "credits"; rates are dollars per 1M tokens.
    expect(screen.getByText(/USD per 1M tokens/i)).toBeInTheDocument();
    expect(screen.queryByText(/credits/i)).toBeNull();
    // The two rate inputs carry a leading "$" currency addon (FormMoney).
    expect(screen.getAllByText('$').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the edit variant while closing (no title/lock flash)', () => {
    // pricing/page.tsx nulls `editing` in the same update that closes the
    // dialog. Chakra keeps the content mounted through its exit animation, so
    // without holding, the title would flip to "New pricing" and the model_id
    // field would unlock mid-animation.
    const { rerender } = wrap(
      <PricingFormDialog isOpen editing={ROW} onOpenChange={() => {}} onSubmit={() => {}} />,
    );

    rerender(
      <ChakraProvider value={system}>
        <PricingFormDialog
          isOpen={false}
          editing={null}
          onOpenChange={() => {}}
          onSubmit={() => {}}
        />
      </ChakraProvider>,
    );

    expect(screen.getByText('Edit pricing')).toBeInTheDocument();
    expect(screen.queryByText('New pricing')).toBeNull();
    expect(screen.getByTestId('pricing-model-id')).toBeDisabled();
  });
});
