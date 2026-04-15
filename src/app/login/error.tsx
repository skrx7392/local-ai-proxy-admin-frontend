'use client';

import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import { useEffect } from 'react';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[login] route error', error);
  }, [error]);

  return (
    <Box
      as="main"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      padding="8"
    >
      <Box
        borderWidth="1px"
        borderColor="border.glass"
        borderRadius="lg"
        background="bg.glass.surface"
        padding="8"
        maxW="md"
        width="full"
        data-testid="login-error"
      >
        <Stack gap="3">
          <Heading textStyle="heading.sm">Login unavailable</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Something went wrong while loading sign-in. Please try again.
          </Text>
          {error.digest && (
            <Text color="fg.subtle" textStyle="body.sm" fontFamily="mono">
              ref: {error.digest}
            </Text>
          )}
          <Button onClick={reset} colorPalette="accent">
            Try again
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
