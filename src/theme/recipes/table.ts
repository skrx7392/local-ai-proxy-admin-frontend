import { defineSlotRecipe } from '@chakra-ui/react';

/**
 * Table slot recipe per PLAN.md §10.3.
 *
 * Slots: root, header, body, row, columnHeader, cell, footer, caption.
 * Density toggles cell padding (dense 8/12, default 12/16, comfortable 16/20).
 */
export const tableRecipe = defineSlotRecipe({
  className: 'chakra-table',
  slots: ['root', 'header', 'body', 'row', 'columnHeader', 'cell', 'footer', 'caption'],
  base: {
    root: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: 0,
      background: 'bg.glass.surface',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.glass',
      backdropFilter: 'blur(18px) saturate(1.2)',
      overflow: 'hidden',
      fontFamily: 'body',
      fontSize: 'sm',
      color: 'fg.default',
    },
    header: {
      background: 'bg.glass.elevated',
      position: 'sticky',
      top: 0,
      zIndex: 1,
    },
    columnHeader: {
      textAlign: 'start',
      textStyle: 'caption',
      color: 'fg.muted',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
    },
    row: {
      transitionProperty: 'background-color',
      transitionDuration: 'sm',
      transitionTimingFunction: 'standard',
      _hover: {
        background: 'bg.glass.subtle',
      },
    },
    cell: {
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
      fontVariantNumeric: 'tabular-nums',
    },
    caption: {
      textStyle: 'caption',
      color: 'fg.subtle',
      padding: '3',
    },
    footer: {
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'border.subtle',
    },
  },
  variants: {
    density: {
      dense: {
        cell: { paddingBlock: '2', paddingInline: '3' },
        columnHeader: { paddingBlock: '2', paddingInline: '3' },
      },
      default: {
        cell: { paddingBlock: '3', paddingInline: '4' },
        columnHeader: { paddingBlock: '3', paddingInline: '4' },
      },
      comfortable: {
        cell: { paddingBlock: '4', paddingInline: '5' },
        columnHeader: { paddingBlock: '4', paddingInline: '5' },
      },
    },
  },
  defaultVariants: {
    density: 'default',
  },
});
