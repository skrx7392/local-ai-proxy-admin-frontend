import { defineGlobalStyles } from '@chakra-ui/react';

import { canvasDark, canvasLight } from './gradients';

/**
 * Global CSS injected via Chakra's `globalCss` option.
 *
 * Applies the canvas gradient to `<body>` with `background-attachment: fixed`,
 * enables tabular numerals + Inter cv11, normalizes scrollbars to glass tint,
 * and the `prefers-reduced-motion` overrides per PLAN.md §7 / §11.
 *
 * Chakra v3 quirks: nested selectors inside a `SystemStyleObject` must be
 * `&`-prefixed or be an `@`-rule. Vendor-prefixed CSS properties aren't in the
 * typed surface, so we drop them here and rely on emotion's auto-prefixer at
 * the recipe layer where needed.
 */
export const globalCss = defineGlobalStyles({
  ':root': {
    colorScheme: 'dark light',
  },
  html: {
    height: '100%',
    textRendering: 'optimizeLegibility',
  },
  body: {
    minHeight: '100%',
    margin: 0,
    fontFamily: 'body',
    color: 'fg.default',
    backgroundColor: 'bg.canvas',
    backgroundImage: canvasDark,
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
    fontFeatureSettings: "'tnum' 1, 'cv11' 1",
    _light: {
      backgroundImage: canvasLight,
    },
  },
  '*, &::before, &::after': {
    boxSizing: 'border-box',
  },
  // Webkit scrollbar — glass-tinted thumb, no track chrome. Chakra's `_scrollbar`
  // condition maps to `&::-webkit-scrollbar` at the CSS-gen layer.
  '&::-webkit-scrollbar': {
    width: '10px',
    height: '10px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255,255,255,0.18)',
    borderRadius: '9999px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    _light: {
      background: 'rgba(15,23,42,0.20)',
    },
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(255,255,255,0.28)',
    backgroundClip: 'padding-box',
    _light: {
      background: 'rgba(15,23,42,0.30)',
    },
  },
  // Glass fallback for browsers without backdrop-filter support.
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))':
    {
      '& [data-glass]': {
        background: 'var(--chakra-colors-bg-glass-opaque) !important',
        backdropFilter: 'none !important',
      },
    },
  // Respect user motion preferences — cap all transitions at 200ms opacity.
  '@media (prefers-reduced-motion: reduce)': {
    '& *, & *::before, & *::after': {
      animationName: 'none !important',
      animationDuration: '0ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '200ms !important',
      transitionProperty: 'opacity !important',
      scrollBehavior: 'auto !important',
    },
  },
  // Runtime force-disable: `data-motion="off"` on <html> halts every animation
  // and transition. Used by the styleguide's ThemeControls and the
  // `?motion=off` query parameter so Playwright can capture deterministic
  // screenshots without relying on browser emulation flags.
  'html[data-motion="off"] *, html[data-motion="off"] *::before, html[data-motion="off"] *::after':
    {
      animationName: 'none !important',
      animationDuration: '0ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0ms !important',
      transitionProperty: 'none !important',
      scrollBehavior: 'auto !important',
    },
});
