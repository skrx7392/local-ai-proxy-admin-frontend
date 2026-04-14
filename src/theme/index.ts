import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

import { keyframes } from './animations';
import { globalCss } from './globalCss';
import { badgeRecipe } from './recipes/badge';
import { buttonRecipe } from './recipes/button';
import { cardRecipe } from './recipes/card';
import { dialogRecipe } from './recipes/dialog';
import { inputRecipe } from './recipes/input';
import { tableRecipe } from './recipes/table';
import { semanticTokens } from './semanticTokens';
import { tokens, textStyles } from './tokens';

/**
 * Compose the design system.
 *
 * Chakra v3 `createSystem(...configs)` merges multiple SystemConfig objects,
 * so we pass the library `defaultConfig` first and layer our extensions on top.
 *
 * next-themes toggles a `class="dark"` / `class="light"` on <html>. Chakra v3's
 * built-in `_dark` / `_light` conditions key off that same class, so light/dark
 * token switching "just works" with no custom condition config.
 */
export const config = defineConfig({
  cssVarsPrefix: 'chakra',
  globalCss,
  theme: {
    tokens,
    semanticTokens,
    keyframes,
    textStyles,
    recipes: {
      button: buttonRecipe,
      input: inputRecipe,
      badge: badgeRecipe,
    },
    slotRecipes: {
      card: cardRecipe,
      dialog: dialogRecipe,
      table: tableRecipe,
    },
  },
});

export const system = createSystem(defaultConfig, config);

// Re-exports so downstream code has a single import surface.
export { keyframes, globalCss, semanticTokens, tokens, textStyles };
export * from './animations';
export * from './dataViz';
export { canvasDark, canvasLight, accentSolid } from './gradients';
