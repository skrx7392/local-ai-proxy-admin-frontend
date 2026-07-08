import { describe, expect, it } from 'vitest';

import { tableRecipe } from '../recipes/table';

// Row hover styling used to be unconditional, which made every table row
// look clickable — including tables with no detail page (the /users UX bug,
// Notion 3974e303). The affordance is now gated on [data-interactive],
// which DataTable only stamps on rows given a `rowHref`.
type RowStyles = {
  cursor?: unknown;
  _hover?: Record<string, unknown>;
  '&[data-interactive]'?: {
    cursor?: unknown;
    _hover?: Record<string, unknown>;
    _focusVisible?: Record<string, unknown>;
  };
};

describe('table recipe — row hover affordance', () => {
  const row = (tableRecipe.base?.row ?? {}) as RowStyles;

  it('does not hover-highlight or pointer non-interactive rows', () => {
    expect(row._hover).toBeUndefined();
    expect(row.cursor).toBeUndefined();
  });

  it('reserves hover, pointer, and focus ring for interactive rows', () => {
    const interactive = row['&[data-interactive]'];
    expect(interactive).toBeDefined();
    expect(interactive?.cursor).toBe('pointer');
    expect(interactive?._hover).toMatchObject({
      background: 'bg.glass.subtle',
    });
    // Focusable rows (tabIndex=0) need a visible focus indicator.
    expect(interactive?._focusVisible).toBeDefined();
  });
});
