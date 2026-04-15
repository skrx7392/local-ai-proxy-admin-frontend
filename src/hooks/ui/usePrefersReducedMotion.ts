'use client';

import { useEffect, useState } from 'react';

// Tracks the `prefers-reduced-motion: reduce` media query as well as the
// styleguide override (`data-motion="off"` on <html>). Used by chart
// components to disable Recharts' entry animation — CSS handles the static
// tokens, but `isAnimationActive` on a Recharts <Line>/<Bar> is JS-only.
//
// Default is `false` (animations on) so SSR output matches the common case
// and the effect only bumps state if the user actually prefers reduction.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    const read = () => {
      const motionAttr =
        document.documentElement.getAttribute('data-motion') ?? '';
      setReduced(mql.matches || motionAttr === 'off');
    };
    read();

    mql.addEventListener('change', read);
    // Observe the <html data-motion> override so the styleguide toggle flips
    // recharts animations too, not just CSS-driven ones.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    return () => {
      mql.removeEventListener('change', read);
      observer.disconnect();
    };
  }, []);

  return reduced;
}
