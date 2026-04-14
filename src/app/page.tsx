'use client';

import { Box, Button, Card, Stack, Text } from '@chakra-ui/react';
import { useTheme } from 'next-themes';

/**
 * Smoke surface for A2. Proves Chakra v3 + theme + providers + next-themes
 * wire up end-to-end. A3 replaces this with the full `/styleguide` route.
 */
export default function Page() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'light' ? 'dark' : 'light';

  return (
    <Box as="main" minH="100vh" padding="8" display="flex" justifyContent="center">
      <Card.Root maxW="420px" width="100%">
        <Card.Body>
          <Stack gap="4">
            <Text textStyle="heading.sm">local-ai admin</Text>
            <Text textStyle="body.md">A2 theme live</Text>
            <Button
              data-testid="ping-button"
              onClick={() => setTheme(nextTheme)}
            >
              Ping
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
