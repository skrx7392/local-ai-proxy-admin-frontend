import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { system } from '@/theme';

import { DetailErrorState } from '../DetailErrorState';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('<DetailErrorState />', () => {
  it('deduplicates 404 copy: heading and body are distinct even when the backend echoes the heading', () => {
    // Live 2026-07-08: backend 404 message was literally "User not found",
    // which the old inline version rendered as the body under an identical
    // heading.
    const { getAllByText, getByText } = wrap(
      <DetailErrorState
        resourceLabel="User"
        resourceId={999}
        error={new ApiError(404, 'not_found', 'User not found')}
        backHref="/users"
        backLabel="Back to users"
        data-testid="user-detail-error"
      />,
    );

    expect(getAllByText('User not found')).toHaveLength(1);
    getByText(
      'No user with ID 999 exists. It may have been deleted, or the link may be out of date.',
    );
  });

  it('renders the back affordance as a real link styled as a button', () => {
    const { getByTestId } = wrap(
      <DetailErrorState
        resourceLabel="User"
        resourceId={999}
        error={new ApiError(404, 'not_found', 'User not found')}
        backHref="/users"
        backLabel="Back to users"
        data-testid="user-detail-error"
      />,
    );

    const back = getByTestId('user-detail-error-back');
    expect(back.tagName).toBe('A');
    expect(back.getAttribute('href')).toBe('/users');
    expect(back.textContent).toContain('Back to users');
    // Chakra Button recipe applied (not bare anchor text).
    expect(back.className).not.toBe('');
  });

  it('shows the error detail for non-404 failures', () => {
    const { getByText } = wrap(
      <DetailErrorState
        resourceLabel="Key"
        resourceId={7}
        error={new ApiError(500, 'boom', 'database exploded')}
        backHref="/keys"
        backLabel="Back to keys"
      />,
    );

    getByText('Failed to load key');
    getByText('database exploded');
  });
});
