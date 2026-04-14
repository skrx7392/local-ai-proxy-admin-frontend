import { defineSlotRecipe } from '@chakra-ui/react';

/**
 * Card slot recipe per PLAN.md §10.4.
 *
 * Slots: root, header, body, footer.
 * Variants:
 *   - surface: default (glass.surface bg + e0 + lg radius)
 *   - subtle:  glass.subtle
 *   - elevated: glass.elevated + e2
 * Boolean variant:
 *   - interactive: add `lift` hover animation
 *
 * The `backdrop-filter` fallback is declared via `@supports` so browsers
 * without blur support still get a solid tint via `bg.glass.opaque`.
 */
export const cardRecipe = defineSlotRecipe({
  className: 'chakra-card',
  slots: ['root', 'header', 'body', 'footer'],
  base: {
    root: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.glass',
      color: 'fg.default',
      boxShadow: 'e0',
      backdropFilter: 'blur(18px) saturate(1.2)',
      // Fallback: if backdrop-filter is unsupported, use the opaque token.
      '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))':
        {
          background: 'bg.glass.opaque',
        },
      transition: 'transform 140ms cubic-bezier(0.2, 0, 0, 1), box-shadow 140ms cubic-bezier(0.2, 0, 0, 1)',
    },
    header: {
      padding: '4',
      paddingBottom: '2',
      textStyle: 'heading.sm',
    },
    body: {
      padding: '4',
      flex: '1',
    },
    footer: {
      padding: '4',
      paddingTop: '2',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'border.subtle',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '2',
    },
  },
  variants: {
    variant: {
      surface: {
        root: {
          background: 'bg.glass.surface',
        },
      },
      subtle: {
        root: {
          background: 'bg.glass.subtle',
          boxShadow: 'none',
        },
      },
      elevated: {
        root: {
          background: 'bg.glass.elevated',
          boxShadow: 'e2',
          backdropFilter: 'blur(24px) saturate(1.2)',
        },
      },
    },
    interactive: {
      true: {
        root: {
          cursor: 'pointer',
          _hover: {
            transform: 'translateY(-2px)',
            boxShadow: 'e1',
          },
          _focusVisible: {
            outline: 'none',
            borderColor: 'border.focus',
            boxShadow: '0 0 0 2px var(--chakra-colors-border-focus), var(--chakra-shadows-e1)',
          },
        },
      },
      false: {},
    },
    density: {
      default: {
        body: { padding: '4' },
        header: { padding: '4', paddingBottom: '2' },
        footer: { padding: '4', paddingTop: '2' },
      },
      comfortable: {
        body: { padding: '6' },
        header: { padding: '6', paddingBottom: '3' },
        footer: { padding: '6', paddingTop: '3' },
      },
    },
  },
  defaultVariants: {
    variant: 'surface',
    interactive: false,
    density: 'default',
  },
});
