import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StyleguidePage from '@/app/(admin)/styleguide/page';
import { Providers } from '@/components/providers';

// jsdom has no IntersectionObserver; SectionNav handles that defensively
// but we stub here for completeness so nothing logs warnings.
class MockIO implements Partial<IntersectionObserver> {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
vi.stubGlobal('IntersectionObserver', MockIO);

// recharts pulls ResizeObserver; jsdom lacks it in some versions.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
);

const EXPECTED_SECTIONS = [
  'controls',
  'colors',
  'gradients',
  'typography',
  'spacing',
  'radii',
  'glass',
  'shadows',
  'motion',
  'buttons',
  'forms',
  'badges',
  'cards',
  'dialogs',
  'toasts',
  'charts',
  'empty',
  'skeletons',
  'icons',
  'copy',
];

describe('StyleguidePage', () => {
  it('renders every expected section with a matching data-section-id', () => {
    const { container } = render(
      <Providers>
        <StyleguidePage />
      </Providers>,
    );

    // The top nav lists every section; the real sections carry data-section-id.
    for (const id of EXPECTED_SECTIONS) {
      const section = container.querySelector(`[data-section-id="${id}"]`);
      expect(section, `missing section ${id}`).not.toBeNull();
    }
  });

  it('renders the page title', () => {
    render(
      <Providers>
        <StyleguidePage />
      </Providers>,
    );
    expect(screen.getByText('Living Style Guide')).toBeInTheDocument();
  });
});
