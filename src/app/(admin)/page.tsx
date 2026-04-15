'use client';

import { Box, Container, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import type { ComponentType } from 'react';
import { Coins, DollarSign, Key, Link as LinkIcon, Users } from 'lucide-react';

interface NavCard {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}

const CARDS: readonly NavCard[] = [
  {
    href: '/keys',
    label: 'Keys',
    description: 'Create, revoke, and audit Bearer tokens.',
    icon: Key,
  },
  {
    href: '/users',
    label: 'Users',
    description: 'Activate, deactivate, and review roles.',
    icon: Users,
  },
  {
    href: '/accounts',
    label: 'Accounts',
    description: 'Credit balances and account-scoped keys.',
    icon: Coins,
  },
  {
    href: '/pricing',
    label: 'Pricing',
    description: 'Per-model prompt and completion rates.',
    icon: DollarSign,
  },
  {
    href: '/registration-tokens',
    label: 'Registration tokens',
    description: 'Share onboarding links with credit grants.',
    icon: LinkIcon,
  },
];

export default function Page() {
  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <Heading textStyle="heading.md">Dashboard</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Jump to a resource. Analytics and health land in a later PR.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <NextLink
                key={card.href}
                href={card.href}
                data-testid={`dashboard-card-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ textDecoration: 'none' }}
              >
                <Box
                  borderWidth="1px"
                  borderColor="border.glass"
                  background="bg.glass.surface"
                  backdropFilter="blur(18px) saturate(1.2)"
                  borderRadius="lg"
                  padding="5"
                  transitionProperty="transform, border-color, background"
                  transitionDuration="sm"
                  transitionTimingFunction="standard"
                  _hover={{
                    transform: 'translateY(-1px)',
                    borderColor: 'border.subtle',
                    background: 'bg.glass.elevated',
                  }}
                >
                  <Stack gap="2">
                    <Box color="accent.fg">
                      <Icon size={20} />
                    </Box>
                    <Text textStyle="heading.sm">{card.label}</Text>
                    <Text textStyle="body.sm" color="fg.muted">
                      {card.description}
                    </Text>
                  </Stack>
                </Box>
              </NextLink>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
