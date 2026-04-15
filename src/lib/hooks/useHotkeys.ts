'use client';

import { useEffect, useRef } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => void;

export interface HotkeyBinding {
  /**
   * Either a single key (e.g. `/`) or a two-key chord expressed as
   * `leader key` (e.g. `g u`). Keys are matched against
   * `KeyboardEvent.key` (case-sensitive for printable keys; callers should
   * spell them as produced without Shift).
   */
  combo: string;
  handler: HotkeyHandler;
}

const CHORD_TIMEOUT_MS = 1000;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

/**
 * Register a set of keyboard shortcuts for the document.
 *
 * - Single-key bindings (`/`, `?`) fire on a single keydown.
 * - Chord bindings (`g u`) require pressing the leader, then the second key
 *   within `CHORD_TIMEOUT_MS`. Pressing any other key or pausing cancels
 *   the chord.
 * - All bindings are suppressed while focus is in an editable target, or
 *   while Ctrl / Meta / Alt modifiers are held.
 */
export function useHotkeys(bindings: readonly HotkeyBinding[]): void {
  // Keep bindings in a ref so the listener effect doesn't re-subscribe on
  // every render; only the binding *identities* matter for teardown.
  const bindingsRef = useRef(bindings);
  useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    let pendingLeader: string | null = null;
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;

    function clearLeader() {
      pendingLeader = null;
      if (leaderTimer != null) {
        clearTimeout(leaderTimer);
        leaderTimer = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (hasModifier(e)) return;

      const current = bindingsRef.current;

      if (pendingLeader) {
        const combo = `${pendingLeader} ${e.key}`;
        const match = current.find((b) => b.combo === combo);
        clearLeader();
        if (match) {
          e.preventDefault();
          match.handler(e);
        }
        return;
      }

      // Single-key match.
      const single = current.find((b) => b.combo === e.key);
      if (single) {
        e.preventDefault();
        single.handler(e);
        return;
      }

      // Start a chord if this key is a leader for any binding.
      const leaderMatch = current.find((b) => {
        const parts = b.combo.split(' ');
        return parts.length === 2 && parts[0] === e.key;
      });
      if (leaderMatch) {
        pendingLeader = e.key;
        leaderTimer = setTimeout(clearLeader, CHORD_TIMEOUT_MS);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearLeader();
    };
  }, []);
}
