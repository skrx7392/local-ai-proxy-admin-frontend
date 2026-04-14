'use client';

import { Box, HStack, Stack, Text, chakra } from '@chakra-ui/react';
import { useState } from 'react';
import type { ReactNode } from 'react';

export interface MotionTileProps {
  name: string;
  /** Free-form spec (e.g. "220ms · ease.decelerate"). */
  spec: string;
  /** Render prop receives the current replay key; use it to remount animated children. */
  children: (replayKey: number) => ReactNode;
}

/**
 * Replayable motion demo. The Replay button bumps an internal counter that's
 * passed to `children`; the caller is expected to use that counter as a React
 * `key` on the animated element so it remounts and the animation restarts.
 *
 * The tile itself never animates; only its child does. This keeps the frame
 * (borders, label, button) visually stable while the demo replays.
 */
export function MotionTile({ name, spec, children }: MotionTileProps) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <Stack
      gap="3"
      padding="4"
      borderRadius="lg"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border.glass"
      background="bg.glass.subtle"
      minH="140px"
      data-testid={`motion-tile-${name}`}
    >
      <HStack justifyContent="space-between" align="baseline">
        <Text textStyle="heading.sm">{name}</Text>
        <chakra.button
          type="button"
          data-testid={`replay-${name}`}
          onClick={() => setReplayKey((k) => k + 1)}
          height="24px"
          paddingInline="2"
          borderRadius="sm"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="border.glass"
          background="bg.glass.surface"
          color="fg.default"
          fontSize="xs"
          fontWeight="medium"
          cursor="pointer"
          _hover={{ background: 'bg.glass.elevated' }}
        >
          Replay
        </chakra.button>
      </HStack>
      <Text textStyle="code.sm" color="fg.subtle">
        {spec}
      </Text>
      <Box
        flex="1"
        minH="60px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {children(replayKey)}
      </Box>
    </Stack>
  );
}
