import { describe, expect, it } from 'vitest';

import { tokens } from '@/theme/tokens';
import { canvasDark, canvasLight, accentSolid } from '@/theme/gradients';
import { system } from '@/theme';

describe('design tokens', () => {
  it('exposes the accent midpoint at accent.600', () => {
    expect(tokens.colors?.accent?.['600']).toEqual({ value: '#4f46e5' });
  });

  it('defines the xl radius at 20px', () => {
    expect(tokens.radii?.xl).toEqual({ value: '20px' });
  });

  it('defines duration.md at 220ms', () => {
    expect(tokens.durations?.md).toEqual({ value: '220ms' });
  });

  it('exports the dark and light canvas gradients verbatim', () => {
    expect(canvasDark).toBe(
      'linear-gradient(135deg, #0f2027 0%, #2c5364 50%, #4568dc 100%)',
    );
    expect(canvasLight).toBe(
      'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 50%, #e9d5ff 100%)',
    );
    expect(accentSolid).toBe('linear-gradient(135deg, #4f46e5, #7c3aed)');
  });

  it('builds a Chakra system with the card slot recipe registered', () => {
    expect(system).toBeTruthy();
    expect(system.hasRecipe('button')).toBe(true);
    expect(system.isSlotRecipe('card')).toBe(true);
    expect(system.isSlotRecipe('dialog')).toBe(true);
    expect(system.isSlotRecipe('table')).toBe(true);
  });
});
