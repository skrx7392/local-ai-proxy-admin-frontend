import { defineSlotRecipe } from '@chakra-ui/react';

/**
 * Dialog slot recipe per PLAN.md §10.6.
 *
 * Slots: backdrop, positioner, content, header, body, footer, title, description, closeTrigger.
 * Enter: `slideIn` (320ms, emphasized). Exit: reverse `slideIn` 180ms accelerated.
 *
 * Backdrop is `rgba(15,23,42,0.55)` dark / `0.30` light with `blur(6px)`.
 */
export const dialogRecipe = defineSlotRecipe({
  className: 'chakra-dialog',
  slots: [
    'backdrop',
    'positioner',
    'content',
    'header',
    'body',
    'footer',
    'title',
    'description',
    'closeTrigger',
  ],
  base: {
    backdrop: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(6px)',
      zIndex: 'modal',
      _light: { background: 'rgba(15,23,42,0.30)' },
      _open: {
        animationName: 'fade',
        animationDuration: 'md',
        animationTimingFunction: 'standard',
        animationFillMode: 'both',
      },
      _closed: {
        animationName: 'fade',
        animationDirection: 'reverse',
        animationDuration: 'sm',
        animationTimingFunction: 'accelerate',
      },
    },
    positioner: {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4',
      zIndex: 'modal',
    },
    content: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '540px',
      borderRadius: 'xl',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.glass',
      background: 'bg.glass.elevated',
      boxShadow: 'e3',
      backdropFilter: 'blur(24px) saturate(1.2)',
      color: 'fg.default',
      '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))':
        {
          background: 'bg.glass.opaque',
        },
      _open: {
        animationName: 'slideIn',
        animationDuration: 'lg',
        animationTimingFunction: 'emphasized',
        animationFillMode: 'both',
      },
      _closed: {
        animationName: 'slideIn',
        animationDirection: 'reverse',
        animationDuration: '180ms',
        animationTimingFunction: 'accelerate',
      },
    },
    header: {
      padding: '6',
      paddingBottom: '3',
    },
    title: { textStyle: 'heading.md' },
    description: { textStyle: 'body.md', color: 'fg.muted' },
    body: { padding: '6', paddingTop: '2', paddingBottom: '4' },
    footer: {
      padding: '6',
      paddingTop: '2',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '2',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'border.subtle',
    },
    closeTrigger: {
      position: 'absolute',
      top: '3',
      insetInlineEnd: '3',
    },
  },
  variants: {
    size: {
      confirm: { content: { maxWidth: '540px' } },
      form: { content: { maxWidth: '720px' } },
      detail: { content: { maxWidth: '960px' } },
    },
  },
  defaultVariants: {
    size: 'confirm',
  },
});
