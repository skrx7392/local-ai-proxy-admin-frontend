import NextLink from 'next/link';
import { Box, Card, Link, Stack, Text } from '@chakra-ui/react';

/**
 * Root landing. A3 keeps this deliberately tiny: a single centered card
 * that links off to `/styleguide`. The theme toggle and all the demos live
 * on the styleguide page itself. PR B replaces this with the authenticated
 * admin shell (or redirects to `/login`).
 */
export default function Page() {
  return (
    <Box
      as="main"
      minH="100vh"
      padding="8"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Card.Root maxW="420px" width="100%" data-testid="root-card">
        <Card.Body>
          <Stack gap="3">
            <Text textStyle="heading.sm">local-ai admin</Text>
            <Text textStyle="body.md" color="fg.muted">
              Scaffolding in progress. See{' '}
              <Link
                asChild
                color="accent.fg"
                textDecoration="underline"
                textUnderlineOffset="2px"
              >
                <NextLink href="/styleguide" data-testid="styleguide-link">
                  /styleguide
                </NextLink>
              </Link>{' '}
              for the design system.
            </Text>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
