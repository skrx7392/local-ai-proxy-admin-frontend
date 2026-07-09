'use client';

import { useState } from 'react';

/**
 * Returns `value` while `active` is true, but keeps returning the **last value
 * seen while active** once `active` flips to false.
 *
 * Why this exists: Chakra dialogs are created with `unmountOnExit` (see
 * `@chakra-ui/react` dialog defaults), so a dialog stays mounted and keeps
 * re-rendering for the duration of its exit animation (~180ms per
 * `src/theme/recipes/dialog.ts`). Every admin page nulls a dialog's backing
 * data (`editing`, `deleteTarget`, `accountName`, `secret`, …) in the same
 * `onOpenChange(false)` update that closes it. Without holding, the closing
 * dialog would re-render its now-empty data mid-animation — a visible content
 * "flash" (title flipping to the create variant, body text blanking out).
 * Holding the last active value keeps the exiting dialog showing what it showed
 * while open.
 *
 * Implementation note: this uses the sanctioned "adjust state during render"
 * pattern (React docs) rather than an effect, matching the existing
 * closed→open reset pattern in these dialogs. It's safe for object/ReactNode
 * values too: once `held` is set to the current prop identity, `Object.is`
 * short-circuits further updates, so a parent that passes a stable node across
 * a dialog's internal re-renders won't loop.
 */
export function useHeldValue<T>(active: boolean, value: T): T {
  const [held, setHeld] = useState<T>(value);

  if (active && !Object.is(value, held)) {
    setHeld(value);
    return value;
  }

  return active ? value : held;
}
