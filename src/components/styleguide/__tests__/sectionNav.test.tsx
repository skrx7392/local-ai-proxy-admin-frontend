import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Providers } from '@/components/providers';
import { SectionNav } from '@/components/styleguide/SectionNav';

type IOCb = (entries: IntersectionObserverEntry[]) => void;

describe('SectionNav', () => {
  let capturedCallback: IOCb | null = null;

  beforeEach(() => {
    capturedCallback = null;
    vi.stubGlobal(
      'IntersectionObserver',
      class MockIO {
        constructor(cb: IOCb) {
          capturedCallback = cb;
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('highlights the section that intersects highest in the viewport', () => {
    // Seed DOM with real section nodes for the observer to "find".
    const a = document.createElement('section');
    a.id = 'alpha';
    const b = document.createElement('section');
    b.id = 'beta';
    document.body.append(a, b);

    const { container } = render(
      <Providers>
        <SectionNav
          items={[
            { id: 'alpha', label: 'Alpha' },
            { id: 'beta', label: 'Beta' },
          ]}
        />
      </Providers>,
    );

    // Initial state: first item is active.
    const alphaLink = container.querySelector('[data-nav-item="alpha"]');
    const betaLink = container.querySelector('[data-nav-item="beta"]');
    expect(alphaLink?.getAttribute('data-active')).toBe('true');
    expect(betaLink?.getAttribute('data-active')).toBe('false');

    // Now simulate `beta` scrolling into view above `alpha`.
    expect(capturedCallback).not.toBeNull();
    act(() => {
      capturedCallback?.([
        {
          target: b,
          isIntersecting: true,
          boundingClientRect: { top: 100 } as DOMRectReadOnly,
          intersectionRatio: 0.8,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        } as IntersectionObserverEntry,
        {
          target: a,
          isIntersecting: true,
          boundingClientRect: { top: 400 } as DOMRectReadOnly,
          intersectionRatio: 0.2,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        } as IntersectionObserverEntry,
      ]);
    });

    expect(container.querySelector('[data-nav-item="beta"]')?.getAttribute('data-active')).toBe('true');
    expect(container.querySelector('[data-nav-item="alpha"]')?.getAttribute('data-active')).toBe('false');

    a.remove();
    b.remove();
  });
});
