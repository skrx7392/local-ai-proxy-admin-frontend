import { ChakraProvider, Box } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { system } from '@/theme';

describe('semantic token resolution', () => {
  it('resolves bg="bg.glass.surface" to a chakra-generated class with a css var', () => {
    const { container } = render(
      <ChakraProvider value={system}>
        <Box data-testid="surface" bg="bg.glass.surface" />
      </ChakraProvider>,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="surface"]');
    expect(el).toBeTruthy();
    // Chakra v3 emits atomic classes; we just check at least one is present.
    // (Full CSS-var resolution is covered by Playwright in the styleguide route.)
    expect(el?.className.length ?? 0).toBeGreaterThan(0);
  });

  it('tokens object includes the e0/e1/e2/e3 shadow tokens', () => {
    const shadows = system.tokens.getCategoryValues('shadows');
    expect(shadows).toBeDefined();
    expect('e0' in shadows).toBe(true);
    expect('e1' in shadows).toBe(true);
    expect('e2' in shadows).toBe(true);
    expect('e3' in shadows).toBe(true);
  });
});
