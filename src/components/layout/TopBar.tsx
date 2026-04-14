'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Flex, Spacer, Text } from '@chakra-ui/react';
import { signOut, useSession } from 'next-auth/react';

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
    const id = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
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
      paddingInline="6"
      paddingBlock="3"
      data-testid="topbar"
    >
      <Flex align="center" gap="4">
        <Text textStyle="body.sm" fontWeight="medium">
          local-ai admin
        </Text>
        <Spacer />
        <Text textStyle="body.sm" color="fg.muted" data-testid="topbar-user">
          {session.user.email}
        </Text>
        {remaining !== undefined && (
          <Text
            textStyle="body.xs"
            color={remaining < 300 ? 'red.500' : 'fg.muted'}
            data-testid="topbar-expires"
          >
            {formatCountdown(remaining)}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          data-testid="topbar-logout"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Log out
        </Button>
      </Flex>
    </Box>
  );
}
