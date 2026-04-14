import { defineTokens } from '@chakra-ui/react';

/**
 * Raw design tokens.
 *
 * Scales are 11-step (50..950). Perceptually even steps, one notch muted
 * from neon saturation so long admin sessions stay readable.
 *
 * Font families reference CSS variables produced by next/font in layout.tsx.
 */
export const tokens = defineTokens({
  colors: {
    slate: {
      50: { value: '#f8fafc' },
      100: { value: '#f1f5f9' },
      200: { value: '#e2e8f0' },
      300: { value: '#cbd5e1' },
      400: { value: '#94a3b8' },
      500: { value: '#64748b' },
      600: { value: '#475569' },
      700: { value: '#334155' },
      800: { value: '#1e293b' },
      900: { value: '#0f172a' },
      950: { value: '#020617' },
    },
    accent: {
      50: { value: '#eef2ff' },
      100: { value: '#e0e7ff' },
      200: { value: '#c7d2fe' },
      300: { value: '#a5b4fc' },
      400: { value: '#818cf8' },
      500: { value: '#6366f1' },
      600: { value: '#4f46e5' }, // midpoint per PLAN.md §2
      700: { value: '#4338ca' },
      800: { value: '#3730a3' },
      900: { value: '#312e81' },
      950: { value: '#1e1b4b' },
    },
    success: {
      50: { value: '#ecfdf5' },
      100: { value: '#d1fae5' },
      200: { value: '#a7f3d0' },
      300: { value: '#6ee7b7' },
      400: { value: '#34d399' },
      500: { value: '#3fa87a' }, // hsl(150, 45%, 45%)
      600: { value: '#2f8860' },
      700: { value: '#276b4c' },
      800: { value: '#22563e' },
      900: { value: '#1c4733' },
      950: { value: '#0d2a1e' },
    },
    warn: {
      50: { value: '#fffbeb' },
      100: { value: '#fef3c7' },
      200: { value: '#fde68a' },
      300: { value: '#fcd34d' },
      400: { value: '#fbbf24' },
      500: { value: '#e6a228' }, // hsl(40, 80%, 55%)
      600: { value: '#b77f1a' },
      700: { value: '#8f6214' },
      800: { value: '#6f4c10' },
      900: { value: '#533a0d' },
      950: { value: '#2f2007' },
    },
    danger: {
      50: { value: '#fdf2f3' },
      100: { value: '#fbe3e6' },
      200: { value: '#f5c1c9' },
      300: { value: '#ec98a4' },
      400: { value: '#e06b80' },
      500: { value: '#c55266' }, // hsl(355, 55%, 55%)
      600: { value: '#a53e52' },
      700: { value: '#85313f' },
      800: { value: '#682834' },
      900: { value: '#4c1e27' },
      950: { value: '#2b1116' },
    },
  },
  fonts: {
    body: { value: 'var(--font-inter), system-ui, -apple-system, Segoe UI, sans-serif' },
    heading: { value: 'var(--font-inter), system-ui, -apple-system, Segoe UI, sans-serif' },
    mono: { value: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace' },
  },
  fontSizes: {
    xs: { value: '12px' },
    sm: { value: '13px' },
    md: { value: '14px' },
    lg: { value: '16px' },
    xl: { value: '20px' },
    '2xl': { value: '24px' },
    '3xl': { value: '32px' },
  },
  lineHeights: {
    caption: { value: '16px' },
    bodySm: { value: '18px' },
    bodyMd: { value: '20px' },
    bodyLg: { value: '24px' },
    headingSm: { value: '24px' },
    headingMd: { value: '28px' },
    headingLg: { value: '32px' },
    display: { value: '40px' },
  },
  fontWeights: {
    regular: { value: '400' },
    medium: { value: '500' },
    semibold: { value: '600' },
    bold: { value: '700' },
  },
  letterSpacings: {
    tight: { value: '-0.01em' },
    normal: { value: '0' },
  },
  // 4px base spacing scale per PLAN.md §4
  spacing: {
    0: { value: '0' },
    0.5: { value: '2px' },
    1: { value: '4px' },
    1.5: { value: '6px' },
    2: { value: '8px' },
    3: { value: '12px' },
    4: { value: '16px' },
    5: { value: '20px' },
    6: { value: '24px' },
    8: { value: '32px' },
    10: { value: '40px' },
    12: { value: '48px' },
    16: { value: '64px' },
    20: { value: '80px' },
    24: { value: '96px' },
  },
  radii: {
    none: { value: '0' },
    sm: { value: '4px' },
    md: { value: '10px' },
    lg: { value: '14px' },
    xl: { value: '20px' },
    full: { value: '9999px' },
  },
  durations: {
    xs: { value: '80ms' },
    sm: { value: '140ms' },
    md: { value: '220ms' },
    lg: { value: '320ms' },
  },
  easings: {
    standard: { value: 'cubic-bezier(0.2, 0, 0, 1)' },
    emphasized: { value: 'cubic-bezier(0.3, 0, 0.1, 1)' },
    decelerate: { value: 'cubic-bezier(0, 0, 0.1, 1)' },
    accelerate: { value: 'cubic-bezier(0.3, 0, 1, 1)' },
  },
});

/**
 * Typography role → size/line/weight mapping per PLAN.md §3 table.
 * Consumed by textStyles in index.ts so components can use e.g. `textStyle="body.md"`.
 */
export const textStyles = {
  display: {
    value: {
      fontFamily: 'heading',
      fontSize: '3xl',
      lineHeight: 'display',
      fontWeight: 'bold',
      letterSpacing: 'tight',
    },
  },
  'heading.lg': {
    value: {
      fontFamily: 'heading',
      fontSize: '2xl',
      lineHeight: 'headingLg',
      fontWeight: 'semibold',
      letterSpacing: 'tight',
    },
  },
  'heading.md': {
    value: {
      fontFamily: 'heading',
      fontSize: 'xl',
      lineHeight: 'headingMd',
      fontWeight: 'semibold',
    },
  },
  'heading.sm': {
    value: {
      fontFamily: 'heading',
      fontSize: 'lg',
      lineHeight: 'headingSm',
      fontWeight: 'semibold',
    },
  },
  'body.lg': {
    value: {
      fontFamily: 'body',
      fontSize: 'lg',
      lineHeight: 'bodyLg',
      fontWeight: 'regular',
    },
  },
  'body.md': {
    value: {
      fontFamily: 'body',
      fontSize: 'md',
      lineHeight: 'bodyMd',
      fontWeight: 'regular',
    },
  },
  'body.sm': {
    value: {
      fontFamily: 'body',
      fontSize: 'sm',
      lineHeight: 'bodySm',
      fontWeight: 'regular',
    },
  },
  caption: {
    value: {
      fontFamily: 'body',
      fontSize: 'xs',
      lineHeight: 'caption',
      fontWeight: 'medium',
    },
  },
  'code.md': {
    value: {
      fontFamily: 'mono',
      fontSize: 'md',
      lineHeight: 'bodyMd',
      fontWeight: 'regular',
    },
  },
  'code.sm': {
    value: {
      fontFamily: 'mono',
      fontSize: 'sm',
      lineHeight: 'bodySm',
      fontWeight: 'regular',
    },
  },
};
