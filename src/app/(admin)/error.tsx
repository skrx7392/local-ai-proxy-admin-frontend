'use client';

import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Link as ChakraLink,
  Stack,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] route error', error);
  }, [error]);

  return (
    <Container maxW="3xl" paddingBlock="16" paddingInline="6">
      <Box
        borderWidth="1px"
        borderColor="border.glass"
        borderRadius="lg"
        background="bg.glass.surface"
        padding="10"
        data-testid="admin-error"
      >
        <Stack gap="4">
          <Heading textStyle="heading.md">Something went wrong</Heading>
          <Text color="fg.muted" textStyle="body.md">
            The page couldn’t load. You can try again, or head back to the
            dashboard.
          </Text>
          {error.digest && (
            <Text color="fg.subtle" textStyle="body.sm" fontFamily="mono">
              ref: {error.digest}
            </Text>
          )}
          <HStack gap="3">
            <Button onClick={reset} colorPalette="accent">
              Try again
            </Button>
            <ChakraLink asChild>
              <NextLink href="/">Back to dashboard</NextLink>
            </ChakraLink>
          </HStack>
        </Stack>
      </Box>
    </Container>
  );
}
