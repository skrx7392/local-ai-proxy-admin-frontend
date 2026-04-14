import { defineRecipe } from '@chakra-ui/react';

import { accentSolid } from '../gradients';

/**
 * Button recipe per PLAN.md §10.1.
 *
 * Variants:   solid (accent gradient), subtle, ghost, outline
 * Tones:      accent (default), neutral, danger
 * Sizes:      xs 24 / sm 28 / md 36 / lg 44
 *
 * `press` animation on `:active`. Focus ring = 2px accent + 2px offset.
 */
export const buttonRecipe = defineRecipe({
  className: 'chakra-button',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderRadius: 'md',
    fontFamily: 'body',
    fontWeight: 'medium',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    cursor: 'pointer',
    transitionProperty: 'background-color, color, border-color, box-shadow, transform',
    transitionDuration: 'sm',
    transitionTimingFunction: 'standard',
    _active: {
      transform: 'scale(0.98)',
      transitionDuration: 'xs',
    },
    _focusVisible: {
      outline: 'none',
      boxShadow: '0 0 0 2px var(--chakra-colors-bg-canvas), 0 0 0 4px var(--chakra-colors-border-focus)',
    },
    _disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      _hover: { transform: 'none' },
      _active: { transform: 'none' },
    },
  },
  variants: {
    size: {
      xs: { height: '24px', paddingInline: '2', fontSize: 'xs', lineHeight: '1' },
      sm: { height: '28px', paddingInline: '3', fontSize: 'sm', lineHeight: '1' },
      md: { height: '36px', paddingInline: '4', fontSize: 'md', lineHeight: '1' },
      lg: { height: '44px', paddingInline: '5', fontSize: 'lg', lineHeight: '1' },
    },
    variant: {
      solid: {
        color: 'fg.onAccent',
        backgroundImage: accentSolid,
        boxShadow: 'e1',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'transparent',
        _hover: { filter: 'brightness(1.08)' },
      },
      subtle: {
        background: 'bg.glass.subtle',
        color: 'fg.default',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'border.glass',
        _hover: { background: 'bg.glass.surface' },
      },
      ghost: {
        background: 'transparent',
        color: 'fg.default',
        _hover: { background: 'bg.glass.subtle' },
      },
      outline: {
        background: 'transparent',
        color: 'fg.default',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'border.glass',
        _hover: { background: 'bg.glass.subtle' },
      },
    },
    tone: {
      accent: {},
      neutral: {},
      danger: {},
    },
  },
  compoundVariants: [
    // Subtle danger
    {
      variant: 'subtle',
      tone: 'danger',
      css: {
        background: 'danger.muted',
        color: 'fg.danger',
      },
    },
    // Ghost danger
    {
      variant: 'ghost',
      tone: 'danger',
      css: {
        color: 'fg.danger',
        _hover: { background: 'danger.muted' },
      },
    },
    // Outline danger
    {
      variant: 'outline',
      tone: 'danger',
      css: {
        color: 'fg.danger',
        borderColor: 'border.danger',
        _hover: { background: 'danger.muted' },
      },
    },
    // Solid danger — swap the gradient for a danger-tinted fill
    {
      variant: 'solid',
      tone: 'danger',
      css: {
        backgroundImage: 'linear-gradient(135deg, #c55266, #a53e52)',
      },
    },
    // Subtle neutral
    {
      variant: 'subtle',
      tone: 'neutral',
      css: {
        background: 'neutral.muted',
      },
    },
  ],
  defaultVariants: {
    size: 'md',
    variant: 'solid',
    tone: 'accent',
  },
});
