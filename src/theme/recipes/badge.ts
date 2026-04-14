import { defineRecipe } from '@chakra-ui/react';

/**
 * Badge recipe per PLAN.md §10.10. 20px height, caption size, sm radius.
 * Tonal variants read from muted semantic tokens so light/dark map correctly.
 */
export const badgeRecipe = defineRecipe({
  className: 'chakra-badge',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    height: '20px',
    paddingInline: '2',
    borderRadius: 'sm',
    fontFamily: 'body',
    fontSize: 'xs',
    lineHeight: '1',
    fontWeight: 'medium',
    textTransform: 'none',
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      accent: {
        background: 'accent.muted',
        color: 'accent.emphasis',
      },
      success: {
        background: 'success.muted',
        color: 'fg.success',
      },
      warn: {
        background: 'warn.muted',
        color: 'fg.warn',
      },
      danger: {
        background: 'danger.muted',
        color: 'fg.danger',
      },
      neutral: {
        background: 'neutral.muted',
        color: 'fg.muted',
      },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
