import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GlobalError from '../global-error';

describe('global-error.tsx', () => {
  it('renders fallback without Chakra and wires reset', () => {
    const reset = vi.fn();
    // global-error renders its own <html>/<body>; jsdom raises warnings but
    // still produces the tree. Query against the returned container.
    const { container } = render(
      <GlobalError error={new Error('root boom')} reset={reset} />,
    );
    const marker = container.querySelector('[data-testid="global-error"]');
    expect(marker).not.toBeNull();
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(reset).toHaveBeenCalledOnce();
  });
});
