'use client';

import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';

/**
 * Global 404 for unmatched routes (UX P2 2026-07-08 — previously the default
 * unstyled Next.js 404: white page, no branding, no way back).
 *
 * Deliberately at the ROOT app level, not inside the `(admin)` route group:
 * unmatched URLs never enter a route group, and the admin shell (TopBar,
 * SideNav) must not leak to unauthenticated visitors. In practice the
 * middleware redirects anonymous requests to /login before this renders, but
 * the boundary itself carries no admin chrome as defense in depth — just the
 * app theme, branding, and a way back. "Back to dashboard" round-trips
 * through the middleware, so an unauthenticated visitor lands on /login.
 */
export default function NotFound() {
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
        padding="10"
        maxW="28rem"
        width="100%"
        data-testid="not-found"
      >
        <Stack gap="4">
          <Text textStyle="body.sm" color="fg.muted" fontWeight="medium">
            local-ai admin
          </Text>
          <Text
            fontFamily="mono"
            fontSize="3rem"
            lineHeight="1"
            fontWeight="semibold"
            color="fg.subtle"
            aria-hidden="true"
          >
            404
          </Text>
          <Heading textStyle="heading.md">Page not found</Heading>
          <Text color="fg.muted" textStyle="body.md">
            The page you&apos;re looking for doesn&apos;t exist or may have
            been moved.
          </Text>
          <Box>
            <Button asChild colorPalette="accent" data-testid="not-found-home">
              <NextLink href="/">Back to dashboard</NextLink>
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
