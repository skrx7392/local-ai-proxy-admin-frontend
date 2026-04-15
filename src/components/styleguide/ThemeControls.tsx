'use client';

import { Box, HStack, Stack, Text, chakra } from '@chakra-ui/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const BLUR_PRESETS = [
  { label: 'Blur 12', value: '12px' },
  { label: 'Blur 18', value: '18px' },
  { label: 'Blur 24', value: '24px' },
  { label: 'Blur 36', value: '36px' },
];

/**
 * Floating top-right control cluster.
 *
 *  - Mode toggle (dark ↔ light) via next-themes. `data-testid="theme-toggle"`.
 *  - Reduce-motion override: sets `data-motion="off"` on <html>, which the
 *    globalCss `[data-motion="off"]` rule treats the same as the
 *    `prefers-reduced-motion: reduce` media query.
 *  - Glass blur tuner: writes `--styleguide-blur` on <html> so any demo card
 *    can pick it up by feature-gating on `var(--styleguide-blur, <default>)`.
 *
 * These controls exist only on the styleguide page; they are not part of
 * the app surface.
 */
export function ThemeControls() {
  const { resolvedTheme, setTheme } = useTheme();
  // Lazy initializer reads `?motion=off` on first render so the value is
  // correct before any effect runs. SSR → `window` is undefined → default
  // false, then hydration corrects it on the client without an extra render.
  const [motionOff, setMotionOff] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('motion') === 'off';
  });
  const [blur, setBlur] = useState<string>('18px');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (motionOff) {
      document.documentElement.setAttribute('data-motion', 'off');
    } else {
      document.documentElement.removeAttribute('data-motion');
    }
  }, [motionOff]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--styleguide-blur', blur);
  }, [blur]);

  const nextMode = resolvedTheme === 'light' ? 'dark' : 'light';

  return (
    <Box
      data-testid="theme-controls"
      position="fixed"
      top="4"
      insetInlineEnd="4"
      zIndex={10}
      padding="3"
      borderRadius="lg"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border.glass"
      background="bg.glass.elevated"
      backdropFilter="blur(18px) saturate(1.2)"
      boxShadow="e2"
      minWidth="240px"
    >
      <Stack gap="3">
        <HStack justifyContent="space-between">
          <Text textStyle="caption" color="fg.muted">
            Mode
          </Text>
          <chakra.button
            type="button"
            data-testid="theme-toggle"
            data-mode={resolvedTheme ?? 'dark'}
            onClick={() => setTheme(nextMode)}
            display="inline-flex"
            alignItems="center"
            gap="2"
            paddingInline="3"
            height="28px"
            borderRadius="full"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.glass"
            background="bg.glass.subtle"
            color="fg.default"
            fontSize="sm"
            fontWeight="medium"
            cursor="pointer"
            _hover={{ background: 'bg.glass.surface' }}
          >
            {resolvedTheme === 'light' ? (
              <Sun size={14} aria-hidden="true" />
            ) : (
              <Moon size={14} aria-hidden="true" />
            )}
            <span>{resolvedTheme === 'light' ? 'Light' : 'Dark'}</span>
          </chakra.button>
        </HStack>

        <HStack justifyContent="space-between">
          <Text textStyle="caption" color="fg.muted">
            Reduce motion
          </Text>
          <chakra.button
            type="button"
            data-testid="motion-toggle"
            data-motion-off={motionOff ? 'true' : 'false'}
            aria-pressed={motionOff}
            onClick={() => setMotionOff((v) => !v)}
            paddingInline="3"
            height="28px"
            borderRadius="full"
            borderWidth="1px"
            borderStyle="solid"
            borderColor={motionOff ? 'border.focus' : 'border.glass'}
            background={motionOff ? 'accent.muted' : 'bg.glass.subtle'}
            color={motionOff ? 'accent.emphasis' : 'fg.default'}
            fontSize="sm"
            fontWeight="medium"
            cursor="pointer"
          >
            {motionOff ? 'On' : 'Off'}
          </chakra.button>
        </HStack>

        <HStack justifyContent="space-between" alignItems="center">
          <Text textStyle="caption" color="fg.muted">
            Glass blur
          </Text>
          <chakra.select
            data-testid="blur-select"
            aria-label="Glass blur"
            value={blur}
            onChange={(e) => setBlur(e.target.value)}
            paddingInline="2"
            height="28px"
            borderRadius="md"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.glass"
            background="bg.glass.subtle"
            color="fg.default"
            fontSize="sm"
          >
            {BLUR_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </chakra.select>
        </HStack>
      </Stack>
    </Box>
  );
}
