import { describe, expect, it } from 'vitest';

import { keyframes, system } from '@/theme';

/**
 * Regression guards for the dialog close "flash".
 *
 * Two invariants, both learned the hard way:
 *
 * 1. Enter and exit MUST use distinct keyframe names. CSS animation identity
 *    is the animation-name — a finished enter animation does not replay when
 *    only `animation-direction` flips to reverse, and Zag's presence machine
 *    (which Chakra dialogs use to stay mounted during exit) compares computed
 *    animation names between open/closed to decide whether an exit animation
 *    exists at all. Same name ⇒ exit never plays ⇒ the dialog/backdrop pops
 *    off in a single frame.
 *
 * 2. Chakra's default dialog recipe ships content animations in the
 *    `motionPreset` variant (default `scale`), and variant styles override
 *    recipe base styles. Unless the merged recipe pins motionPreset to
 *    `none`, the design system's base animations are dead code and the
 *    default scale/fade plays instead.
 *
 * These assert on the MERGED system recipe (defaultConfig + our theme), not
 * on our source object — the merge is where the override bug lived.
 */

type StyleMap = Record<string, unknown>;

interface MergedDialogRecipe {
  base?: Record<string, StyleMap>;
  defaultVariants?: Record<string, unknown>;
}

const dialog = system.getSlotRecipe('dialog') as unknown as MergedDialogRecipe;

function animNames(slot: string): { open: unknown; closed: unknown } {
  const styles = dialog.base?.[slot] as
    | { _open?: StyleMap; _closed?: StyleMap }
    | undefined;
  return {
    open: styles?._open?.['animationName'],
    closed: styles?._closed?.['animationName'],
  };
}

function collectValues(node: unknown, key: string, out: unknown[] = []): unknown[] {
  if (node === null || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === key) out.push(v);
    collectValues(v, key, out);
  }
  return out;
}

describe('dialog motion (merged system recipe)', () => {
  it('uses distinct enter/exit animation names for the backdrop', () => {
    const { open, closed } = animNames('backdrop');
    expect(open).toBeTruthy();
    expect(closed).toBeTruthy();
    expect(closed).not.toBe(open);
  });

  it('uses distinct enter/exit animation names for the content', () => {
    const { open, closed } = animNames('content');
    expect(open).toBeTruthy();
    expect(closed).toBeTruthy();
    expect(closed).not.toBe(open);
  });

  it('never uses animation-direction reverse (same-name exits never replay)', () => {
    expect(collectValues(dialog, 'animationDirection')).toEqual([]);
  });

  it('pins motionPreset to none so base animations are not overridden by the default scale variant', () => {
    expect(dialog.defaultVariants?.['motionPreset']).toBe('none');
  });

  it('defines exit keyframes that end hidden', () => {
    const kf = keyframes as unknown as Record<
      string,
      { from?: { opacity?: number }; to?: { opacity?: number } }
    >;
    expect(kf['slideOut']?.to?.opacity).toBe(0);
    expect(kf['fadeOut']?.to?.opacity).toBe(0);
  });

  it('references only keyframes that exist for base dialog animations', () => {
    const names = new Set(Object.keys(keyframes));
    for (const slot of ['backdrop', 'content']) {
      for (const phase of [animNames(slot).open, animNames(slot).closed]) {
        expect(names.has(String(phase))).toBe(true);
      }
    }
  });
});
