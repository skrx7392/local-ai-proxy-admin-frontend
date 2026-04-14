'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Field,
  HStack,
  Input,
  Link as ChakraLink,
  NativeSelect,
  Portal,
  Stack,
  Table,
  Text,
  Textarea,
  Toast,
  Toaster,
  chakra,
  createToaster,
} from '@chakra-ui/react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Inbox,
  Key,
  Plus,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Helper: Chakra v3 recipe variants defined outside the codegen (e.g. `tone`
// on Button/Badge, `interactive` on Card, `size="confirm"` on Dialog) aren't
// in the generated component prop types. `recipe(...)` casts at the boundary
// so JSX stays readable and the value still flows through to the recipe
// matcher at runtime.
function recipe<T extends Record<string, unknown>>(props: T): Record<string, unknown> {
  return props;
}

import {
  AvatarSkeleton,
  ChartSkeleton,
  DataTableSkeleton,
  DialogSkeleton,
  FormSkeleton,
  PageSkeleton,
  PillSkeleton,
  StatCardSkeleton,
  TextBlockSkeleton,
} from '@/components/loading';
import { ChartDemo } from '@/components/styleguide/ChartDemo';
import { IconGrid } from '@/components/styleguide/IconGrid';
import { MotionTile } from '@/components/styleguide/MotionTile';
import { Section } from '@/components/styleguide/Section';
import { SectionNav } from '@/components/styleguide/SectionNav';
import { SemanticSwatchPair, Swatch } from '@/components/styleguide/Swatch';
import { ThemeControls } from '@/components/styleguide/ThemeControls';
import { countUp } from '@/lib/utils/countUp';
import { accentSolid, canvasDark, canvasLight } from '@/theme';

// ---------------------------------------------------------------------------
// Static data — kept inline so the page is self-contained and snapshot-stable.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'controls', label: '1. Theme controls' },
  { id: 'colors', label: '2. Colors' },
  { id: 'gradients', label: '3. Gradients' },
  { id: 'typography', label: '4. Typography' },
  { id: 'spacing', label: '5. Spacing' },
  { id: 'radii', label: '6. Radii' },
  { id: 'glass', label: '7. Glass tiers' },
  { id: 'shadows', label: '8. Shadows' },
  { id: 'motion', label: '9. Motion' },
  { id: 'buttons', label: '10. Buttons' },
  { id: 'forms', label: '11. Form fields' },
  { id: 'badges', label: '12. Badges' },
  { id: 'cards', label: '13. Cards' },
  { id: 'dialogs', label: '14. Dialogs' },
  { id: 'toasts', label: '15. Toasts' },
  { id: 'charts', label: '16. Charts' },
  { id: 'empty', label: '17. Empty states' },
  { id: 'skeletons', label: '18. Skeletons' },
  { id: 'icons', label: '19. Iconography' },
  { id: 'copy', label: '20. Copy voice' },
];

// Eleven-step color scales, matching the raw palette in `src/theme/tokens.ts`.
// Duplicated here on purpose: the theme file exports Chakra token objects
// whose CSS-var round-trip isn't useful for a visual swatch list.
const PALETTES: { name: string; steps: { step: string; hex: string }[] }[] = [
  {
    name: 'slate',
    steps: [
      { step: '50', hex: '#f8fafc' },
      { step: '100', hex: '#f1f5f9' },
      { step: '200', hex: '#e2e8f0' },
      { step: '300', hex: '#cbd5e1' },
      { step: '400', hex: '#94a3b8' },
      { step: '500', hex: '#64748b' },
      { step: '600', hex: '#475569' },
      { step: '700', hex: '#334155' },
      { step: '800', hex: '#1e293b' },
      { step: '900', hex: '#0f172a' },
      { step: '950', hex: '#020617' },
    ],
  },
  {
    name: 'accent',
    steps: [
      { step: '50', hex: '#eef2ff' },
      { step: '100', hex: '#e0e7ff' },
      { step: '200', hex: '#c7d2fe' },
      { step: '300', hex: '#a5b4fc' },
      { step: '400', hex: '#818cf8' },
      { step: '500', hex: '#6366f1' },
      { step: '600', hex: '#4f46e5' },
      { step: '700', hex: '#4338ca' },
      { step: '800', hex: '#3730a3' },
      { step: '900', hex: '#312e81' },
      { step: '950', hex: '#1e1b4b' },
    ],
  },
  {
    name: 'success',
    steps: [
      { step: '50', hex: '#ecfdf5' },
      { step: '100', hex: '#d1fae5' },
      { step: '200', hex: '#a7f3d0' },
      { step: '300', hex: '#6ee7b7' },
      { step: '400', hex: '#34d399' },
      { step: '500', hex: '#3fa87a' },
      { step: '600', hex: '#2f8860' },
      { step: '700', hex: '#276b4c' },
      { step: '800', hex: '#22563e' },
      { step: '900', hex: '#1c4733' },
      { step: '950', hex: '#0d2a1e' },
    ],
  },
  {
    name: 'warn',
    steps: [
      { step: '50', hex: '#fffbeb' },
      { step: '100', hex: '#fef3c7' },
      { step: '200', hex: '#fde68a' },
      { step: '300', hex: '#fcd34d' },
      { step: '400', hex: '#fbbf24' },
      { step: '500', hex: '#e6a228' },
      { step: '600', hex: '#b77f1a' },
      { step: '700', hex: '#8f6214' },
      { step: '800', hex: '#6f4c10' },
      { step: '900', hex: '#533a0d' },
      { step: '950', hex: '#2f2007' },
    ],
  },
  {
    name: 'danger',
    steps: [
      { step: '50', hex: '#fdf2f3' },
      { step: '100', hex: '#fbe3e6' },
      { step: '200', hex: '#f5c1c9' },
      { step: '300', hex: '#ec98a4' },
      { step: '400', hex: '#e06b80' },
      { step: '500', hex: '#c55266' },
      { step: '600', hex: '#a53e52' },
      { step: '700', hex: '#85313f' },
      { step: '800', hex: '#682834' },
      { step: '900', hex: '#4c1e27' },
      { step: '950', hex: '#2b1116' },
    ],
  },
];

interface SemanticRow {
  name: string;
  darkValue: string;
  lightValue: string;
}
const SEMANTIC_TOKENS: SemanticRow[] = [
  { name: 'bg.canvas', darkValue: '#1a1f3a', lightValue: '#ffffff' },
  { name: 'bg.glass.sidebar', darkValue: 'rgba(255,255,255,0.06)', lightValue: 'rgba(255,255,255,0.50)' },
  { name: 'bg.glass.subtle', darkValue: 'rgba(255,255,255,0.05)', lightValue: 'rgba(255,255,255,0.70)' },
  { name: 'bg.glass.surface', darkValue: 'rgba(255,255,255,0.10)', lightValue: 'rgba(255,255,255,0.88)' },
  { name: 'bg.glass.elevated', darkValue: 'rgba(255,255,255,0.18)', lightValue: 'rgba(255,255,255,0.95)' },
  { name: 'fg.default', darkValue: 'rgba(255,255,255,0.94)', lightValue: 'rgba(15,23,42,0.92)' },
  { name: 'fg.muted', darkValue: 'rgba(255,255,255,0.68)', lightValue: 'rgba(15,23,42,0.65)' },
  { name: 'fg.subtle', darkValue: 'rgba(255,255,255,0.45)', lightValue: 'rgba(15,23,42,0.45)' },
  { name: 'accent.emphasis', darkValue: '#a5b4fc', lightValue: '#4338ca' },
  { name: 'border.glass', darkValue: 'rgba(255,255,255,0.18)', lightValue: 'rgba(15,23,42,0.08)' },
  { name: 'border.focus', darkValue: '#a5b4fc', lightValue: '#6366f1' },
];

interface TextStyleRow {
  name: string;
  spec: string;
  sample: string;
  family: 'body' | 'mono';
}
const TEXT_STYLES: TextStyleRow[] = [
  { name: 'display', spec: '32px · 40/1.25 · 700 · -0.01em', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'heading.lg', spec: '24px · 32 · 600 · -0.01em', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'heading.md', spec: '20px · 28 · 600', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'heading.sm', spec: '16px · 24 · 600', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'body.lg', spec: '16px · 24 · 400', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'body.md', spec: '14px · 20 · 400', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'body.sm', spec: '13px · 18 · 400', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'caption', spec: '12px · 16 · 500', sample: 'The quick brown fox jumps over the lazy dog', family: 'body' },
  { name: 'code.md', spec: '14px · 20 · 400 · mono', sample: 'const value = "hello, world";', family: 'mono' },
  { name: 'code.sm', spec: '13px · 18 · 400 · mono', sample: 'const value = "hello, world";', family: 'mono' },
];

const SPACING: { token: string; px: string }[] = [
  { token: '0.5', px: '2px' },
  { token: '1', px: '4px' },
  { token: '1.5', px: '6px' },
  { token: '2', px: '8px' },
  { token: '3', px: '12px' },
  { token: '4', px: '16px' },
  { token: '5', px: '20px' },
  { token: '6', px: '24px' },
  { token: '8', px: '32px' },
  { token: '10', px: '40px' },
  { token: '12', px: '48px' },
  { token: '16', px: '64px' },
  { token: '20', px: '80px' },
  { token: '24', px: '96px' },
];

const RADII = [
  { token: 'sm', px: '4px' },
  { token: 'md', px: '10px' },
  { token: 'lg', px: '14px' },
  { token: 'xl', px: '20px' },
  { token: 'full', px: '9999px' },
];

const GLASS_TIERS = [
  { token: 'bg.glass.subtle', label: 'subtle', spec: 'rgba(255,255,255,0.05) · blur 12' },
  { token: 'bg.glass.surface', label: 'surface', spec: 'rgba(255,255,255,0.10) · blur 18' },
  { token: 'bg.glass.elevated', label: 'elevated', spec: 'rgba(255,255,255,0.18) · blur 24' },
  { token: 'bg.glass.sidebar', label: 'sidebar', spec: 'rgba(255,255,255,0.06) · blur 18' },
];

const SHADOWS = [
  { token: 'e0', spec: 'inset highlight · 1px card' },
  { token: 'e1', spec: 'card resting · 4px 12px' },
  { token: 'e2', spec: 'elevated · 8px 24px' },
  { token: 'e3', spec: 'dialog · 16px 48px' },
];

// ---------------------------------------------------------------------------
// Single toaster instance — Chakra v3 pattern: `createToaster` at module scope,
// `<Toaster />` rendered once inside the React tree.
// ---------------------------------------------------------------------------
const toaster = createToaster({
  placement: 'top-end',
  max: 5,
  duration: 5000,
});

// Count-up demo value pinned at module scope so animation uses a stable target.
const COUNT_UP_TARGET = 184_203;

export default function StyleguidePage() {
  // `?motion=off` → set data-motion="off" on <html> before first paint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('motion') === 'off') {
      document.documentElement.setAttribute('data-motion', 'off');
    }
  }, []);

  return (
    <Box minH="100vh" position="relative">
      <ThemeControls />
      <Toaster toaster={toaster}>
        {(t) => (
          <Toast.Root
            data-testid={`toast-${t.type ?? 'info'}`}
            css={{ animationName: 'pop', animationDuration: '180ms' }}
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.glass"
            background="bg.glass.elevated"
            backdropFilter="blur(18px) saturate(1.2)"
            borderRadius="md"
            padding="3"
            minW="320px"
            boxShadow="e2"
          >
            <Toast.Title>{t.title}</Toast.Title>
            {t.description ? (
              <Toast.Description color="fg.muted">{t.description}</Toast.Description>
            ) : null}
          </Toast.Root>
        )}
      </Toaster>

      <HStack
        align="flex-start"
        gap="6"
        paddingInline={{ base: '4', md: '8' }}
        paddingBlock="8"
        maxW="1400px"
        margin="0 auto"
      >
        <Box display={{ base: 'none', md: 'block' }}>
          <SectionNav items={SECTIONS} />
        </Box>

        <Stack flex="1" minW="0" gap="0">
          <Stack gap="1" marginBottom="6">
            <Text textStyle="display">Living Style Guide</Text>
            <Text textStyle="body.lg" color="fg.muted">
              Every token, recipe, and motion primitive rendered live. This
              page is the source of truth for the admin design system.
            </Text>
          </Stack>

          {/* 1. Theme controls */}
          <Section
            id="controls"
            title="1. Theme controls"
            subtitle="Tune the render without editing code. These controls live in the top-right."
            spec="Mode toggle · reduce-motion · glass blur (--styleguide-blur)"
          >
            <Text textStyle="body.md" color="fg.muted">
              Use the floating panel in the upper-right to switch modes, force
              reduced motion, or change the live glass blur. Every demo below
              re-renders against the current state.
            </Text>
          </Section>

          {/* 2. Colors */}
          <Section
            id="colors"
            title="2. Colors"
            subtitle="Raw palettes and semantic tokens."
          >
            <Stack gap="6">
              {PALETTES.map((palette) => (
                <Stack key={palette.name} gap="2">
                  <Text textStyle="heading.sm" textTransform="capitalize">
                    {palette.name}
                  </Text>
                  <HStack gap="3" wrap="wrap">
                    {palette.steps.map((s) => (
                      <Swatch key={s.step} label={s.step} value={s.hex} />
                    ))}
                  </HStack>
                </Stack>
              ))}

              <Stack gap="2">
                <Text textStyle="heading.sm">Semantic tokens</Text>
                <Text textStyle="body.sm" color="fg.muted">
                  Each chip shows dark (left) and light (right) value.
                </Text>
                <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap="4">
                  {SEMANTIC_TOKENS.map((t) => (
                    <SemanticSwatchPair
                      key={t.name}
                      name={t.name}
                      darkValue={t.darkValue}
                      lightValue={t.lightValue}
                    />
                  ))}
                </Box>
              </Stack>
            </Stack>
          </Section>

          {/* 3. Gradients */}
          <Section id="gradients" title="3. Gradients" subtitle="Canvas + accent.">
            <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap="4">
              <Stack gap="2">
                <Text textStyle="heading.sm">canvasDark</Text>
                <Box height="180px" borderRadius="lg" style={{ background: canvasDark }} />
                <Text textStyle="code.sm" color="fg.subtle">
                  {canvasDark}
                </Text>
              </Stack>
              <Stack gap="2">
                <Text textStyle="heading.sm">canvasLight</Text>
                <Box height="180px" borderRadius="lg" style={{ background: canvasLight }} />
                <Text textStyle="code.sm" color="fg.subtle">
                  {canvasLight}
                </Text>
              </Stack>
              <Stack gap="2">
                <Text textStyle="heading.sm">accentSolid</Text>
                <Box height="180px" borderRadius="lg" style={{ background: accentSolid }} />
                <Text textStyle="code.sm" color="fg.subtle">
                  {accentSolid}
                </Text>
              </Stack>
            </Box>
          </Section>

          {/* 4. Typography */}
          <Section id="typography" title="4. Typography" subtitle="Every textStyle.">
            <Stack gap="4">
              {TEXT_STYLES.map((t) => (
                <Stack
                  key={t.name}
                  gap="1"
                  paddingBlock="3"
                  borderBottom="1px solid"
                  borderColor="border.subtle"
                >
                  <HStack justify="space-between" align="baseline">
                    <Text textStyle="code.sm" color="accent.emphasis">
                      {t.name}
                    </Text>
                    <Text textStyle="code.sm" color="fg.subtle">
                      {t.spec}
                    </Text>
                  </HStack>
                  <Text textStyle={t.name as never} data-textstyle={t.name}>
                    {t.sample}
                  </Text>
                </Stack>
              ))}
              <Stack gap="2">
                <Text textStyle="heading.sm">Tabular numerals</Text>
                <Text
                  textStyle="body.lg"
                  fontVariantNumeric="tabular-nums"
                  color="fg.default"
                >
                  184,203 &nbsp;|&nbsp; 1,284 &nbsp;|&nbsp; $3,428.12 &nbsp;|&nbsp; 482ms
                </Text>
              </Stack>
            </Stack>
          </Section>

          {/* 5. Spacing */}
          <Section id="spacing" title="5. Spacing" subtitle="4px base scale.">
            <Stack gap="2">
              {SPACING.map((s) => (
                <HStack key={s.token} gap="4" align="center">
                  <Text textStyle="code.sm" color="fg.muted" minW="48px">
                    {s.token}
                  </Text>
                  <Box height="12px" width={s.px} background="accent.emphasis" borderRadius="sm" />
                  <Text textStyle="code.sm" color="fg.subtle">
                    {s.px}
                  </Text>
                </HStack>
              ))}
            </Stack>
          </Section>

          {/* 6. Radii */}
          <Section id="radii" title="6. Radii">
            <HStack gap="6" wrap="wrap">
              {RADII.map((r) => (
                <Stack key={r.token} gap="2" align="center">
                  <Box
                    width="80px"
                    height="80px"
                    background="bg.glass.surface"
                    borderWidth="1px"
                    borderStyle="solid"
                    borderColor="border.glass"
                    borderRadius={r.token}
                  />
                  <Text textStyle="code.sm" color="fg.muted">
                    {r.token}
                  </Text>
                  <Text textStyle="code.sm" color="fg.subtle">
                    {r.px}
                  </Text>
                </Stack>
              ))}
            </HStack>
          </Section>

          {/* 7. Glass tiers */}
          <Section
            id="glass"
            title="7. Glass tiers"
            subtitle="All four tiers with visible backdrop — see blur/opacity difference."
          >
            <Box position="relative">
              {/* Backdrop text that the cards sit on top of */}
              <Box
                position="absolute"
                inset="0"
                zIndex="0"
                padding="6"
                opacity="0.9"
                pointerEvents="none"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text textStyle="display" color="accent.emphasis" style={{ mixBlendMode: 'screen' }}>
                  BACKDROP · BACKDROP · BACKDROP
                </Text>
              </Box>
              <Stack gap="3" position="relative" zIndex="1">
                {GLASS_TIERS.map((tier) => (
                  <Box
                    key={tier.token}
                    padding="4"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderStyle="solid"
                    borderColor="border.glass"
                    background={tier.token}
                    backdropFilter="var(--styleguide-blur, blur(18px)) saturate(1.2)"
                  >
                    <Text textStyle="heading.sm">{tier.label}</Text>
                    <Text textStyle="code.sm" color="fg.subtle">
                      {tier.spec}
                    </Text>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Section>

          {/* 8. Shadows */}
          <Section id="shadows" title="8. Shadows / Elevation">
            <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap="4">
              {SHADOWS.map((s) => (
                <Stack
                  key={s.token}
                  padding="4"
                  borderRadius="lg"
                  background="bg.glass.surface"
                  borderWidth="1px"
                  borderStyle="solid"
                  borderColor="border.glass"
                  boxShadow={s.token}
                  minH="120px"
                  justify="space-between"
                >
                  <Text textStyle="heading.sm">{s.token}</Text>
                  <Text textStyle="code.sm" color="fg.subtle">
                    {s.spec}
                  </Text>
                </Stack>
              ))}
            </Box>
          </Section>

          {/* 9. Motion */}
          <MotionSection />

          {/* 10. Buttons */}
          <Section
            id="buttons"
            title="10. Buttons"
            subtitle="4 variants × 3 tones × 4 sizes + states."
          >
            <Stack gap="4">
              {(['solid', 'subtle', 'ghost', 'outline'] as const).map((variant) => (
                <Stack key={variant} gap="2">
                  <Text textStyle="caption" color="fg.subtle" textTransform="uppercase">
                    {variant}
                  </Text>
                  {(['accent', 'neutral', 'danger'] as const).map((tone) => (
                    <HStack key={tone} gap="3" wrap="wrap">
                      <Text textStyle="code.sm" color="fg.muted" minW="64px">
                        {tone}
                      </Text>
                      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
                        <Button
                          key={size}
                          variant={variant}
                          // `tone` is a compound variant — pass through as data-tone
                          // in addition to the prop so Chakra's recipe matches.
                          {...recipe({ tone })}
                          size={size}
                        >
                          {size}
                        </Button>
                      ))}
                    </HStack>
                  ))}
                </Stack>
              ))}

              <HStack gap="4" wrap="wrap" paddingTop="2">
                <Button disabled>:disabled</Button>
                <Button autoFocus data-testid="focused-button">
                  :focus (autoFocus)
                </Button>
                <Button>
                  <Plus size={14} aria-hidden="true" />
                  With icon
                </Button>
              </HStack>
            </Stack>
          </Section>

          {/* 11. Form fields */}
          <Section id="forms" title="11. Form fields">
            <Stack gap="4">
              <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="4">
                <Field.Root>
                  <Field.Label>Input · default</Field.Label>
                  <Input placeholder="e.g. admin-api-key-prod" />
                  <Field.HelperText>Lowercase letters, numbers, hyphens only.</Field.HelperText>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Input · focus</Field.Label>
                  <Input autoFocus placeholder="Autofocused" />
                </Field.Root>
                <Field.Root invalid>
                  <Field.Label>Input · error</Field.Label>
                  <Input defaultValue="bad value" />
                  <Field.ErrorText>Must be 3–32 characters.</Field.ErrorText>
                </Field.Root>
                <Field.Root disabled>
                  <Field.Label>Input · disabled</Field.Label>
                  <Input disabled defaultValue="—" />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Select</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>Textarea</Field.Label>
                  <Textarea rows={4} placeholder="Multi-line free text…" />
                  <Field.HelperText>Up to 500 characters.</Field.HelperText>
                </Field.Root>
              </Box>

              <Stack gap="2" maxW="540px">
                <Text textStyle="heading.sm">Composed form</Text>
                <Field.Root>
                  <Field.Label>Key label</Field.Label>
                  <Input placeholder="e.g. staging-read-only" />
                  <Field.HelperText>Shown in the key list — pick something descriptive.</Field.HelperText>
                </Field.Root>
                <Field.Root invalid>
                  <Field.Label>Rate limit (req/min)</Field.Label>
                  <Input type="number" defaultValue="999999" />
                  <Field.ErrorText>Must be ≤ 10000.</Field.ErrorText>
                </Field.Root>
              </Stack>
            </Stack>
          </Section>

          {/* 12. Badges */}
          <Section id="badges" title="12. Badges">
            <Stack gap="3">
              <HStack gap="3" wrap="wrap">
                <Badge {...recipe({ tone: 'accent' })}>accent</Badge>
                <Badge {...recipe({ tone: 'success' })}>success</Badge>
                <Badge {...recipe({ tone: 'warn' })}>warn</Badge>
                <Badge {...recipe({ tone: 'danger' })}>danger</Badge>
                <Badge {...recipe({ tone: 'neutral' })}>neutral</Badge>
              </HStack>
              <HStack gap="3" wrap="wrap">
                <Badge {...recipe({ tone: 'success' })}>active</Badge>
                <Badge {...recipe({ tone: 'danger' })}>revoked</Badge>
                <Badge {...recipe({ tone: 'warn' })}>pending</Badge>
                <Badge {...recipe({ tone: 'accent' })}>admin</Badge>
                <Badge {...recipe({ tone: 'neutral' })}>user</Badge>
              </HStack>
            </Stack>
          </Section>

          {/* 13. Cards */}
          <Section id="cards" title="13. Cards">
            <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap="4">
              {(['surface', 'subtle', 'elevated'] as const).map((variant) => (
                <Card.Root key={variant} variant={variant as never}>
                  <Card.Header>
                    <Text textStyle="heading.sm">variant={variant}</Text>
                  </Card.Header>
                  <Card.Body>
                    <Text textStyle="body.md" color="fg.muted">
                      Header + body + footer composition. Glass surface with e0/e2
                      shadows and border.glass outline.
                    </Text>
                  </Card.Body>
                  <Card.Footer>
                    <Button size="sm" variant="ghost">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </Card.Footer>
                </Card.Root>
              ))}
              <Card.Root {...recipe({ interactive: true })}>
                <Card.Body>
                  <Text textStyle="heading.sm">interactive=true</Text>
                  <Text textStyle="body.sm" color="fg.muted" marginTop="1">
                    Hover to see the `lift` animation.
                  </Text>
                </Card.Body>
              </Card.Root>
            </Box>
          </Section>

          {/* 14. Dialogs */}
          <DialogsSection />

          {/* 15. Toasts */}
          <Section id="toasts" title="15. Toasts" subtitle="Click to fire. Uses `pop` animation.">
            <HStack gap="3" wrap="wrap">
              <Button
                data-testid="toast-success"
                onClick={() =>
                  toaster.create({
                    type: 'success',
                    title: 'Key created',
                    description: 'New key: staging-read-only',
                  })
                }
              >
                Success
              </Button>
              <Button
                {...recipe({ tone: 'neutral', variant: 'subtle' })}
                data-testid="toast-info"
                onClick={() =>
                  toaster.create({
                    type: 'info',
                    title: 'Export queued',
                    description: 'You will get an email when it is ready.',
                  })
                }
              >
                Info
              </Button>
              <Button
                {...recipe({ variant: 'subtle' })}
                data-testid="toast-warn"
                onClick={() =>
                  toaster.create({
                    type: 'warning',
                    title: 'Rate limit at 80%',
                    description: '240 of 300 req/min used.',
                  })
                }
              >
                Warn
              </Button>
              <Button
                {...recipe({ tone: 'danger' })}
                data-testid="toast-danger"
                onClick={() =>
                  toaster.create({
                    type: 'error',
                    title: 'Failed to save',
                    description: 'Upstream returned 500.',
                  })
                }
              >
                Danger
              </Button>
              <Button
                {...recipe({ tone: 'danger', variant: 'outline' })}
                data-testid="toast-danger-request-id"
                onClick={() =>
                  toaster.create({
                    type: 'error',
                    title: 'Failed to save',
                    description: 'Upstream returned 500. Request ID: req_0f92a34b',
                  })
                }
              >
                Danger + request-id
              </Button>
            </HStack>
          </Section>

          {/* 16. Charts */}
          <Section id="charts" title="16. Charts" subtitle="recharts + dataViz palette + rechartsTheme.">
            <ChartDemo />
          </Section>

          {/* 17. Empty states */}
          <Section id="empty" title="17. Empty states">
            <Box maxW="480px">
              <Card.Root>
                <Card.Body>
                  <Stack align="center" gap="3" padding="4">
                    <Box
                      width="48px"
                      height="48px"
                      borderRadius="full"
                      background="bg.glass.surface"
                      borderWidth="1px"
                      borderStyle="solid"
                      borderColor="border.glass"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Inbox size={24} aria-hidden="true" />
                    </Box>
                    <Text textStyle="heading.sm">No keys yet</Text>
                    <Text textStyle="body.sm" color="fg.muted" textAlign="center">
                      Create a key to start routing requests through the proxy.
                    </Text>
                    <Button>
                      <Plus size={14} aria-hidden="true" />
                      Create key
                    </Button>
                  </Stack>
                </Card.Body>
              </Card.Root>
            </Box>
          </Section>

          {/* 18. Skeletons */}
          <SkeletonsSection />

          {/* 19. Iconography */}
          <Section id="icons" title="19. Iconography" subtitle="lucide-react.">
            <IconGrid />
          </Section>

          {/* 20. Copy voice */}
          <Section
            id="copy"
            title="20. Copy voice"
            subtitle="Concrete examples of the rules in PLAN.md §3.13."
          >
            <CopyVoiceSection />
          </Section>
        </Stack>
      </HStack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Motion section — extracted so the countUp effect isn't duplicated with the
// other 19 sections.
// ---------------------------------------------------------------------------

function MotionSection() {
  return (
    <Section id="motion" title="9. Motion" subtitle="Click Replay to re-trigger.">
      <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap="4">
        <MotionTile name="fade" spec="220ms · standard">
          {(k) => (
            <Box
              key={k}
              width="60px"
              height="60px"
              borderRadius="md"
              background="accent.emphasis"
              style={{ animation: 'fade 220ms cubic-bezier(0.2, 0, 0, 1) both' }}
            />
          )}
        </MotionTile>
        <MotionTile name="rise" spec="220ms · decelerate">
          {(k) => (
            <Box
              key={k}
              width="60px"
              height="60px"
              borderRadius="md"
              background="accent.emphasis"
              style={{ animation: 'rise 220ms cubic-bezier(0, 0, 0.1, 1) both' }}
            />
          )}
        </MotionTile>
        <MotionTile name="pop" spec="180ms · emphasized">
          {(k) => (
            <Box
              key={k}
              width="60px"
              height="60px"
              borderRadius="md"
              background="accent.emphasis"
              style={{ animation: 'pop 180ms cubic-bezier(0.3, 0, 0.1, 1) both' }}
            />
          )}
        </MotionTile>
        <MotionTile name="slideIn" spec="320ms · emphasized">
          {(k) => (
            <Box
              key={k}
              width="60px"
              height="60px"
              borderRadius="md"
              background="accent.emphasis"
              style={{ animation: 'slideIn 320ms cubic-bezier(0.3, 0, 0.1, 1) both' }}
            />
          )}
        </MotionTile>
        <MotionTile name="shimmer" spec="1400ms · linear · infinite">
          {() => (
            <Box
              width="80%"
              height="12px"
              borderRadius="sm"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.05) 100%)',
                backgroundSize: '800px 100%',
                animation: 'shimmer 1400ms linear infinite',
              }}
            />
          )}
        </MotionTile>
        <MotionTile name="pulse" spec="2000ms · ease-in-out · infinite">
          {() => (
            <Box
              width="16px"
              height="16px"
              borderRadius="full"
              background="success.solid"
              style={{ animation: 'pulse 2000ms ease-in-out infinite' }}
            />
          )}
        </MotionTile>
        <MotionTile name="countUp" spec="600ms · decelerate">
          {(k) => <CountUpDemo key={k} />}
        </MotionTile>
        <MotionTile name="press" spec="80ms · standard">
          {() => (
            <Button
              {...recipe({ variant: 'subtle' })}
              onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'scale(0.96)';
              }}
              onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = '';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = '';
              }}
            >
              Press me
            </Button>
          )}
        </MotionTile>
        <MotionTile name="lift" spec="140ms · standard">
          {() => (
            <Box
              padding="4"
              borderRadius="md"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="border.glass"
              background="bg.glass.surface"
              transition="transform 140ms cubic-bezier(0.2, 0, 0, 1)"
              _hover={{ transform: 'translateY(-2px)' }}
              cursor="pointer"
            >
              <Text textStyle="body.sm">Hover to lift</Text>
            </Box>
          )}
        </MotionTile>
      </Box>
    </Section>
  );
}

function CountUpDemo() {
  // Parent remounts this via `key` on replay, so each mount starts at 0
  // and the countUp RAF emits frames into state. The effect only subscribes
  // (external system) — never pushes initial values — which is the shape
  // react-hooks/set-state-in-effect wants.
  const [value, setValue] = useState(0);

  useEffect(() => {
    const cancel = countUp({ from: 0, to: COUNT_UP_TARGET, durationMs: 600 })((n) => {
      setValue(n);
    });
    return cancel;
  }, []);

  return (
    <Text textStyle="display" fontVariantNumeric="tabular-nums" color="accent.emphasis">
      {Math.round(value).toLocaleString('en-US')}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Dialogs section — three sizes, each with its own controlled state so
// closing one doesn't ripple through the others.
// ---------------------------------------------------------------------------

function DialogsSection() {
  const sizes = ['confirm', 'form', 'detail'] as const;
  return (
    <Section
      id="dialogs"
      title="14. Dialogs"
      subtitle="Three sizes, slide-in from 24px below."
    >
      <Stack gap="3">
        <HStack gap="3" wrap="wrap">
          {sizes.map((size) => (
            <DialogDemo key={size} size={size} />
          ))}
        </HStack>
        <Text textStyle="caption" color="fg.subtle">
          Confirm dialog includes a destructive action. Form dialog renders a
          stubbed label+input composition. Detail dialog shows a read-only row
          group.
        </Text>
      </Stack>
    </Section>
  );
}

function DialogDemo({ size }: { size: 'confirm' | 'form' | 'detail' }) {
  const [open, setOpen] = useState(false);

  const labels: Record<typeof size, string> = {
    confirm: 'Show confirm (540)',
    form: 'Show form (720)',
    detail: 'Show detail (960)',
  };

  return (
    <>
      <Button
        {...recipe({ variant: 'subtle' })}
        data-testid={`open-dialog-${size}`}
        onClick={() => setOpen(true)}
      >
        {labels[size]}
      </Button>
      <Dialog.Root
        size={size as never}
        open={open}
        onOpenChange={(d: { open: boolean }) => setOpen(d.open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>
                  {size === 'confirm'
                    ? 'Revoke key?'
                    : size === 'form'
                      ? 'Edit key'
                      : 'Key details'}
                </Dialog.Title>
                <Dialog.Description>
                  {size === 'confirm'
                    ? 'This cannot be undone. Requests using this key will start returning 401.'
                    : size === 'form'
                      ? 'Rename or adjust the rate limit.'
                      : 'Read-only view of the selected key.'}
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                {size === 'form' ? (
                  <Stack gap="3">
                    <Field.Root>
                      <Field.Label>Label</Field.Label>
                      <Input defaultValue="staging-read-only" />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Rate limit</Field.Label>
                      <Input type="number" defaultValue="300" />
                    </Field.Root>
                  </Stack>
                ) : size === 'detail' ? (
                  <Stack gap="2">
                    <HStack gap="4">
                      <Text textStyle="caption" color="fg.muted" minW="120px">
                        Key
                      </Text>
                      <Text textStyle="code.sm">sk_live_************************ac4</Text>
                    </HStack>
                    <HStack gap="4">
                      <Text textStyle="caption" color="fg.muted" minW="120px">
                        Created
                      </Text>
                      <Text textStyle="body.sm">Apr 2, 2026 · 14:22 UTC</Text>
                    </HStack>
                    <HStack gap="4">
                      <Text textStyle="caption" color="fg.muted" minW="120px">
                        Last used
                      </Text>
                      <Text textStyle="body.sm">Apr 14, 2026 · 09:04 UTC</Text>
                    </HStack>
                  </Stack>
                ) : (
                  <Text textStyle="body.md">
                    Revoking <Text as="span" fontFamily="mono">staging-read-only</Text> will
                    immediately invalidate any request using it.
                  </Text>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  {...(size === 'confirm' ? ({ tone: 'danger' } as unknown as Record<string,unknown>) : {})}
                  onClick={() => setOpen(false)}
                >
                  {size === 'confirm' ? 'Revoke' : size === 'form' ? 'Save' : 'Done'}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}

// ---------------------------------------------------------------------------
// Skeletons section
// ---------------------------------------------------------------------------

function SkeletonsSection() {
  const [animate, setAnimate] = useState(true);

  return (
    <Section
      id="skeletons"
      title="18. Skeletons"
      subtitle="Every skeleton component live. Toggle disables shimmer globally."
    >
      <Stack gap="4">
        <HStack gap="3">
          <chakra.button
            type="button"
            data-testid="skeleton-animate-toggle"
            aria-pressed={animate}
            onClick={() => setAnimate((v) => !v)}
            height="28px"
            paddingInline="3"
            borderRadius="md"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.glass"
            background={animate ? 'accent.muted' : 'bg.glass.subtle'}
            color={animate ? 'accent.emphasis' : 'fg.default'}
            fontSize="sm"
            fontWeight="medium"
            cursor="pointer"
          >
            Animate shimmer: {animate ? 'On' : 'Off'}
          </chakra.button>
        </HStack>

        <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="4">
          <Stack gap="2">
            <Text textStyle="caption" color="fg.subtle">StatCardSkeleton</Text>
            <StatCardSkeleton animate={animate} />
          </Stack>
          <Stack gap="2">
            <Text textStyle="caption" color="fg.subtle">ChartSkeleton</Text>
            <ChartSkeleton animate={animate} height={180} />
          </Stack>
          <Stack gap="2" gridColumn={{ base: 'auto', md: 'span 2' }}>
            <Text textStyle="caption" color="fg.subtle">DataTableSkeleton</Text>
            <DataTableSkeleton animate={animate} rows={4} columns={4} />
          </Stack>
          <Stack gap="2">
            <Text textStyle="caption" color="fg.subtle">FormSkeleton</Text>
            <FormSkeleton animate={animate} fields={3} />
          </Stack>
          <Stack gap="2">
            <Text textStyle="caption" color="fg.subtle">DialogSkeleton</Text>
            <DialogSkeleton animate={animate} />
          </Stack>
          <Stack gap="2">
            <Text textStyle="caption" color="fg.subtle">TextBlockSkeleton</Text>
            <TextBlockSkeleton animate={animate} lines={4} />
          </Stack>
          <Stack gap="2">
            <Text textStyle="caption" color="fg.subtle">Avatar + Pill</Text>
            <HStack gap="3">
              <AvatarSkeleton animate={animate} />
              <AvatarSkeleton animate={animate} size={48} />
              <PillSkeleton animate={animate} />
              <PillSkeleton animate={animate} width={96} />
            </HStack>
          </Stack>
          <Stack gap="2" gridColumn={{ base: 'auto', md: 'span 2' }}>
            <Text textStyle="caption" color="fg.subtle">PageSkeleton</Text>
            <Box
              borderRadius="lg"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="border.subtle"
              overflow="hidden"
            >
              <PageSkeleton animate={animate}>
                <DataTableSkeleton animate={animate} rows={3} columns={4} />
              </PageSkeleton>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Copy voice section — concrete examples of the copy rules in PLAN.md §3.13.
// ---------------------------------------------------------------------------

function CopyVoiceSection() {
  const [hoverTime, setHoverTime] = useState(false);
  const absolute = 'Apr 14, 2026 · 09:04:12 UTC';
  const relative = '5 minutes ago';
  const features = useMemo(
    () => [
      { feature: 'Analytics', enabled: true },
      { feature: 'Bootstrap', enabled: true },
      { feature: 'Webhooks', enabled: false },
      { feature: 'SSO', enabled: false },
    ],
    [],
  );

  return (
    <Stack gap="5">
      <Stack gap="2">
        <Text textStyle="heading.sm">Empty state copy</Text>
        <Card.Root>
          <Card.Body>
            <HStack gap="3">
              <Inbox size={20} aria-hidden="true" />
              <Stack gap="0.5">
                <Text textStyle="body.md">No keys yet</Text>
                <Text textStyle="body.sm" color="fg.muted">
                  Create a key to start routing requests through the proxy.
                </Text>
              </Stack>
            </HStack>
          </Card.Body>
        </Card.Root>
      </Stack>

      <Stack gap="2">
        <Text textStyle="heading.sm">Destructive confirm</Text>
        <Card.Root>
          <Card.Body>
            <Stack gap="2">
              <HStack gap="2">
                <AlertTriangle size={16} aria-hidden="true" color="#c55266" />
                <Text textStyle="body.md">Revoke key <Text as="span" fontFamily="mono">staging-read-only</Text>?</Text>
              </HStack>
              <Text textStyle="body.sm" color="fg.muted">
                This cannot be undone. Requests using this key will start returning 401 immediately.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>

      <Stack gap="2">
        <Text textStyle="heading.sm">Error + request-id</Text>
        <Card.Root>
          <Card.Body>
            <Stack gap="1">
              <HStack gap="2">
                <XCircle size={16} aria-hidden="true" color="#c55266" />
                <Text textStyle="body.md">Failed to save key</Text>
              </HStack>
              <Text textStyle="body.sm" color="fg.muted">
                Upstream returned 500. Retry, or share this with support:{' '}
                <ChakraLink
                  textStyle="code.sm"
                  color="accent.emphasis"
                  onClick={(e: React.MouseEvent) => e.preventDefault()}
                >
                  req_0f92a34b
                </ChakraLink>
                .
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>

      <Stack gap="2">
        <Text textStyle="heading.sm">Timestamps</Text>
        <Text textStyle="body.sm" color="fg.muted">
          Hover to reveal the absolute value; relative is the default.
        </Text>
        <Card.Root>
          <Card.Body>
            <HStack gap="2">
              <Info size={16} aria-hidden="true" />
              <Text
                textStyle="body.md"
                data-testid="copy-timestamp"
                onMouseEnter={() => setHoverTime(true)}
                onMouseLeave={() => setHoverTime(false)}
                cursor="help"
                borderBottom="1px dotted"
                borderColor="border.glass"
              >
                Last used {hoverTime ? absolute : relative}
              </Text>
            </HStack>
          </Card.Body>
        </Card.Root>
      </Stack>

      <Stack gap="2">
        <Text textStyle="heading.sm">Boolean as ✓ / —</Text>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Feature</Table.ColumnHeader>
              <Table.ColumnHeader>Enabled</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {features.map((f) => (
              <Table.Row key={f.feature}>
                <Table.Cell>
                  <HStack gap="2">
                    <Key size={14} aria-hidden="true" />
                    <Text>{f.feature}</Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  {f.enabled ? (
                    <HStack gap="1" color="fg.success">
                      <CheckCircle size={14} aria-hidden="true" />
                      <Text as="span">Yes</Text>
                    </HStack>
                  ) : (
                    <Text color="fg.subtle">—</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Stack>
    </Stack>
  );
}
