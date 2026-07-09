import { defineSlotRecipe } from '@chakra-ui/react';

/**
 * Dialog slot recipe per PLAN.md §10.6.
 *
 * Slots: backdrop, positioner, content, header, body, footer, title, description, closeTrigger.
 * Enter: `slideIn` (320ms, emphasized). Exit: `slideOut` (180ms, accelerated).
 *
 * Motion rules this recipe depends on:
 * - Enter and exit MUST use distinct keyframe names. A finished enter
 *   animation never replays with `animation-direction: reverse` (animation
 *   identity is the name), and Zag's presence machine compares computed
 *   animation names between open/closed to decide whether an exit animation
 *   exists — same name means the dialog/backdrop unmounts in a single frame.
 * - `motionPreset` is pinned to `none` in defaultVariants: Chakra's default
 *   recipe ships content animations in that variant (default `scale`), and
 *   variant styles override base styles, which would silently replace the
 *   animations below.
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
        animationName: 'fadeOut',
        animationDuration: 'sm',
        animationTimingFunction: 'accelerate',
        animationFillMode: 'both',
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
        animationName: 'slideOut',
        animationDuration: '180ms',
        animationTimingFunction: 'accelerate',
        animationFillMode: 'both',
      },
    },
    header: {
      // Chakra's default dialog header is `display: flex` with no direction,
      // which lays the title and description out side by side (the
      // description floating to the right of the title). Stack them so the
      // description sits beneath the title in every dialog at once.
      display: 'flex',
      flexDirection: 'column',
      gap: '1',
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
    // Declared so defaultVariants can pin it; `none` merges with Chakra's
    // default motionPreset variant of the same name (also empty).
    motionPreset: {
      none: {},
    },
  },
  defaultVariants: {
    size: 'confirm',
    motionPreset: 'none',
  },
});
