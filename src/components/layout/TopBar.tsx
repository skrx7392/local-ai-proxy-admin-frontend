'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Flex, Spacer, Text } from '@chakra-ui/react';
import { signOut, useSession } from 'next-auth/react';

import { HealthIndicator } from './HealthIndicator';
import { MobileNavDrawer } from './MobileNavDrawer';
import { NavSearch } from './NavSearch';

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'expired';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export function TopBar() {
  const { data: session, status } = useSession();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (status !== 'authenticated' || !session?.user) return null;

  const expiresAtSec = session.expires
    ? Math.floor(new Date(session.expires).getTime() / 1000)
    : undefined;
  const remaining = expiresAtSec ? expiresAtSec - now : undefined;

  return (
    <Box
      as="header"
      borderBottomWidth="1px"
      borderColor="border.muted"
      paddingInline={{ base: '3', md: '6' }}
      paddingBlock="3"
      data-testid="topbar"
    >
      {/*
       * Single-line header at every width: fixed-width items never shrink,
       * the email is the only flexible item and truncates with an ellipsis.
       */}
      <Flex align="center" gap={{ base: '2', md: '4' }} wrap="nowrap" minW="0">
        <MobileNavDrawer />
        <Text textStyle="body.sm" fontWeight="medium" whiteSpace="nowrap" flexShrink="0">
          local-ai admin
        </Text>
        <Spacer />
        {/* The go-to search is a power-user affordance; drop it on narrow
            viewports so the essentials (health, identity, logout) fit. */}
        <Box hideBelow="md">
          <NavSearch />
        </Box>
        <Box flexShrink="0">
          <HealthIndicator />
        </Box>
        <Text
          textStyle="body.sm"
          color="fg.muted"
          truncate
          minW="0"
          maxW={{ base: '110px', sm: '180px', md: '280px' }}
          data-testid="topbar-user"
        >
          {session.user.email}
        </Text>
        {remaining !== undefined && (
          <Text
            textStyle="body.xs"
            color={remaining < 300 ? 'red.500' : 'fg.muted'}
            whiteSpace="nowrap"
            flexShrink="0"
            data-testid="topbar-expires"
          >
            {formatCountdown(remaining)}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          flexShrink="0"
          data-testid="topbar-logout"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Log out
        </Button>
      </Flex>
    </Box>
  );
}
