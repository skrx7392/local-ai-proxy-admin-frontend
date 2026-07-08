import { ChakraProvider, Box } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { system } from '@/theme';
import { semanticTokens } from '@/theme/semanticTokens';

type RGB = [number, number, number];

function srgbToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function over(fg: RGB, alpha: number, bg: RGB): RGB {
  return [
    alpha * fg[0] + (1 - alpha) * bg[0],
    alpha * fg[1] + (1 - alpha) * bg[1],
    alpha * fg[2] + (1 - alpha) * bg[2],
  ];
}

function parseRgba(value: string): { rgb: RGB; alpha: number } {
  const match = value.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/,
  );
  if (!match) throw new Error(`not an rgba() literal: ${value}`);
  return {
    rgb: [Number(match[1]), Number(match[2]), Number(match[3])],
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

describe('semantic token resolution', () => {
  it('resolves bg="bg.glass.surface" to a chakra-generated class with a css var', () => {
    const { container } = render(
      <ChakraProvider value={system}>
        <Box data-testid="surface" bg="bg.glass.surface" />
      </ChakraProvider>,
    );
    const el = container.querySelector<HTMLElement>('[data-testid="surface"]');
    expect(el).toBeTruthy();
    // Chakra v3 emits atomic classes; we just check at least one is present.
    // (Full CSS-var resolution is covered by Playwright in the styleguide route.)
    expect(el?.className.length ?? 0).toBeGreaterThan(0);
  });

  // WCAG 1.4.11 (non-text contrast): an unfocused input border must clear 3:1
  // against the frosted-glass card it sits on. The login card is centered, so
  // it sits at the canvas gradient's 50% midpoint. `bg.glass.surface` (rgba
  // white over the canvas) backs both the card and the input interior.
  const SURFACE_ALPHA = { light: 0.88, dark: 0.1 } as const;
  const CARD_CENTER_CANVAS = {
    // gradient 50% stops from gradients.ts
    light: [0xc7, 0xd2, 0xfe] as RGB,
    dark: [0x2c, 0x53, 0x64] as RGB,
  } as const;

  it.each(['light', 'dark'] as const)(
    'border.input clears 3:1 against the glass card in %s mode',
    (mode) => {
      const raw = semanticTokens.colors?.border?.input?.value as {
        _light: string;
        _dark: string;
      };
      const white: RGB = [255, 255, 255];
      const surfaceAlpha = SURFACE_ALPHA[mode];
      const canvas = CARD_CENTER_CANVAS[mode];

      const card = over(white, surfaceAlpha, canvas);
      const inputInterior = over(white, surfaceAlpha, card);

      const border = parseRgba(mode === 'light' ? raw._light : raw._dark);
      const borderOnCard = over(border.rgb, border.alpha, card);
      const borderOnInterior = over(border.rgb, border.alpha, inputInterior);

      // The governing edge per the acceptance criterion is border-vs-card.
      expect(contrast(borderOnCard, card)).toBeGreaterThanOrEqual(3);
      // The interior edge is checked too so the field reads on both sides.
      expect(contrast(borderOnInterior, inputInterior)).toBeGreaterThanOrEqual(3);
    },
  );

  it('tokens object includes the e0/e1/e2/e3 shadow tokens', () => {
    const shadows = system.tokens.getCategoryValues('shadows');
    expect(shadows).toBeDefined();
    expect('e0' in shadows).toBe(true);
    expect('e1' in shadows).toBe(true);
    expect('e2' in shadows).toBe(true);
    expect('e3' in shadows).toBe(true);
  });
});
