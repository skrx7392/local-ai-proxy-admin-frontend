import { defineSemanticTokens } from '@chakra-ui/react';

/**
 * Semantic tokens per PLAN.md §2.3 and §6.
 *
 * Chakra v3 syntax: each value is an object with `_dark` / `_light` keys.
 * Glass tokens use rgba() literals; the canvas gradient is NOT set as a
 * semantic token (gradients can't round-trip cleanly through the token
 * pipeline) — it's injected directly in globalCss.ts via `bg.canvas`.
 */
export const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      // `bg.canvas` left as a solid fallback; the real gradient is painted
      // onto <body> in globalCss. Components that want to peek through to the
      // canvas just use `bg="transparent"`.
      canvas: {
        value: { _dark: '#1a1f3a', _light: '#ffffff' },
      },
      glass: {
        sidebar: {
          value: { _dark: 'rgba(255,255,255,0.06)', _light: 'rgba(255,255,255,0.50)' },
        },
        subtle: {
          value: { _dark: 'rgba(255,255,255,0.05)', _light: 'rgba(255,255,255,0.70)' },
        },
        surface: {
          value: { _dark: 'rgba(255,255,255,0.10)', _light: 'rgba(255,255,255,0.88)' },
        },
        elevated: {
          value: { _dark: 'rgba(255,255,255,0.18)', _light: 'rgba(255,255,255,0.95)' },
        },
        opaque: {
          value: { _dark: '#1a1f3a', _light: '#ffffff' },
        },
      },
    },
    fg: {
      default: {
        value: { _dark: 'rgba(255,255,255,0.94)', _light: 'rgba(15,23,42,0.92)' },
      },
      muted: {
        value: { _dark: 'rgba(255,255,255,0.68)', _light: 'rgba(15,23,42,0.65)' },
      },
      subtle: {
        value: { _dark: 'rgba(255,255,255,0.45)', _light: 'rgba(15,23,42,0.45)' },
      },
      onAccent: {
        value: { _dark: '#ffffff', _light: '#ffffff' },
      },
      danger: {
        value: { _dark: '{colors.danger.300}', _light: '{colors.danger.700}' },
      },
      success: {
        value: { _dark: '{colors.success.300}', _light: '{colors.success.700}' },
      },
      warn: {
        value: { _dark: '{colors.warn.300}', _light: '{colors.warn.700}' },
      },
    },
    border: {
      glass: {
        value: { _dark: 'rgba(255,255,255,0.18)', _light: 'rgba(15,23,42,0.08)' },
      },
      subtle: {
        value: { _dark: 'rgba(255,255,255,0.10)', _light: 'rgba(15,23,42,0.05)' },
      },
      focus: {
        value: { _dark: '{colors.accent.300}', _light: '{colors.accent.500}' },
      },
      danger: {
        value: { _dark: '{colors.danger.400}', _light: '{colors.danger.500}' },
      },
    },
    accent: {
      // `accent.solid` is a gradient; recipes apply it via `backgroundImage`.
      // Here we expose the fill color used as focus ring / text.
      fg: {
        value: { _dark: '{colors.accent.300}', _light: '{colors.accent.600}' },
      },
      muted: {
        value: { _dark: 'rgba(79,70,229,0.22)', _light: 'rgba(79,70,229,0.12)' },
      },
      emphasis: {
        value: { _dark: '#a5b4fc', _light: '#4338ca' },
      },
    },
    // Muted tonal scales reused by Badge, Alert, etc.
    success: {
      muted: {
        value: { _dark: 'rgba(52,211,153,0.18)', _light: 'rgba(52,211,153,0.14)' },
      },
      solid: {
        value: { _dark: '{colors.success.500}', _light: '{colors.success.600}' },
      },
    },
    warn: {
      muted: {
        value: { _dark: 'rgba(251,191,36,0.18)', _light: 'rgba(251,191,36,0.18)' },
      },
      solid: {
        value: { _dark: '{colors.warn.500}', _light: '{colors.warn.600}' },
      },
    },
    danger: {
      muted: {
        value: { _dark: 'rgba(224,107,128,0.20)', _light: 'rgba(197,82,102,0.14)' },
      },
      solid: {
        value: { _dark: '{colors.danger.500}', _light: '{colors.danger.600}' },
      },
    },
    neutral: {
      muted: {
        value: { _dark: 'rgba(255,255,255,0.08)', _light: 'rgba(15,23,42,0.06)' },
      },
    },
  },
  shadows: {
    e0: {
      value: {
        _dark:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(15,23,42,0.2)',
        _light: '0 1px 2px rgba(15,23,42,0.05)',
      },
    },
    e1: {
      value: {
        _dark:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(15,23,42,0.2), 0 4px 12px rgba(15,23,42,0.25)',
        _light: '0 4px 12px rgba(15,23,42,0.08)',
      },
    },
    e2: {
      value: {
        _dark:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(15,23,42,0.2), 0 8px 24px rgba(15,23,42,0.35)',
        _light: '0 8px 24px rgba(15,23,42,0.12)',
      },
    },
    e3: {
      value: {
        _dark:
          'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(15,23,42,0.2), 0 16px 48px rgba(15,23,42,0.45)',
        _light: '0 16px 48px rgba(15,23,42,0.18)',
      },
    },
  },
});
