import { defineRecipe } from '@chakra-ui/react';

/**
 * Input recipe per PLAN.md §10.2.
 *
 * Default 36px height, glass.surface bg, border.glass border, accent focus ring.
 * Error variant: red border + pair with <Field.ErrorText>. Disabled: opacity 0.5.
 */
export const inputRecipe = defineRecipe({
  className: 'chakra-input',
  base: {
    appearance: 'none',
    display: 'block',
    width: '100%',
    height: '36px',
    paddingInline: '3',
    borderRadius: 'md',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border.glass',
    background: 'bg.glass.surface',
    color: 'fg.default',
    fontFamily: 'body',
    fontSize: 'md',
    lineHeight: '1',
    transitionProperty: 'border-color, box-shadow, background-color',
    transitionDuration: 'sm',
    transitionTimingFunction: 'standard',
    _placeholder: { color: 'fg.subtle' },
    _hover: { borderColor: 'border.focus' },
    _focusVisible: {
      outline: 'none',
      borderColor: 'border.focus',
      boxShadow: '0 0 0 2px var(--chakra-colors-border-focus)',
    },
    _disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    _invalid: {
      borderColor: 'border.danger',
      _focusVisible: {
        boxShadow: '0 0 0 2px var(--chakra-colors-border-danger)',
      },
    },
  },
  variants: {
    size: {
      sm: { height: '28px', fontSize: 'sm' },
      md: { height: '36px', fontSize: 'md' },
      lg: { height: '44px', fontSize: 'lg' },
    },
    variant: {
      outline: {},
      filled: {
        background: 'bg.glass.surface',
        borderColor: 'transparent',
      },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'outline',
  },
});
