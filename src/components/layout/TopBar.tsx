'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Flex, Spacer, Text } from '@chakra-ui/react';
import { getSession, signOut, useSession } from 'next-auth/react';

import {
  SESSION_EXPIRY_WARNING_SECONDS,
  sessionExpiredLoginUrl,
} from '@/lib/auth/sessionExpiry';

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

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

export function TopBar() {
  const { data: session, status } = useSession();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  // Serializes expiry verification: one in-flight check at a time, and a
  // client-clock timestamp before which the ticking effect must not re-check
  // (backoff for clock skew / transient failures). Deliberately NOT a
  // permanent latch — a failed signOut must be retried, not swallowed.
  const expiryCheckInFlight = useRef(false);
  const nextExpiryCheckAt = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expiresAtSec =
    status === 'authenticated' && session?.expires
      ? Math.floor(new Date(session.expires).getTime() / 1000)
      : undefined;
  const remaining = expiresAtSec !== undefined ? expiresAtSec - now : undefined;
  const isExpired = remaining !== undefined && remaining <= 0;

  // Defined expiry behavior (UX P2 2026-07-08): when the countdown hits zero,
  // don't sit on a dead session waiting for the next API call to 401 — sign
  // out and land on /login with a "session expired" explanation.
  //
  // The countdown runs on the CLIENT clock, so it only decides when to ASK;
  // the server decides whether the session is actually gone. On a workstation
  // whose clock runs ahead, getSession() still returns a session (the jwt
  // callback hasn't nulled it), and we back off instead of bouncing a valid
  // user to /login.
  useEffect(() => {
    if (!isExpired || expiryCheckInFlight.current) return;
    if (now < nextExpiryCheckAt.current) return;
    expiryCheckInFlight.current = true;
    void (async () => {
      try {
        const fresh = await getSession();
        if (fresh) {
          // Client clock ahead of the server — session is still honored.
          // Re-verify every 30s until the server really invalidates it.
          nextExpiryCheckAt.current = Math.floor(Date.now() / 1000) + 30;
          return;
        }
        await signOut({
          callbackUrl: sessionExpiredLoginUrl(currentPath()),
          redirect: true,
        });
        // signOut resolved — navigation is imminent; don't fire again while
        // the browser unloads the page.
        nextExpiryCheckAt.current = Number.MAX_SAFE_INTEGER;
      } catch {
        // Transient failure (session fetch or signout round-trip) — retry on
        // a later tick instead of leaving the expired page stuck.
        nextExpiryCheckAt.current = Math.floor(Date.now() / 1000) + 5;
      } finally {
        expiryCheckInFlight.current = false;
      }
    })();
  }, [isExpired, now]);

  if (status !== 'authenticated' || !session?.user) return null;

  const showExpiryWarning =
    remaining !== undefined &&
    remaining > 0 &&
    remaining <= SESSION_EXPIRY_WARNING_SECONDS;

  return (
    <>
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
              color={
                remaining <= SESSION_EXPIRY_WARNING_SECONDS ? 'red.500' : 'fg.muted'
              }
              whiteSpace="nowrap"
              flexShrink="0"
              // The visible "Session" prefix is dropped on narrow viewports to
              // keep the one-line header; title + aria-label carry the full
              // explanation everywhere.
              title={
                isExpired
                  ? 'Session expired'
                  : `Session expires in ${formatCountdown(remaining)}`
              }
              aria-label={
                isExpired
                  ? 'Session expired'
                  : `Session expires in ${formatCountdown(remaining)}`
              }
              data-testid="topbar-expires"
            >
              <Box as="span" hideBelow="md">
                Session{' '}
              </Box>
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
      {/* Rendered OUTSIDE the header box so the one-line-header height
          guarantee (responsive e2e) is unaffected when the banner appears. */}
      {showExpiryWarning && (
        <Alert.Root
          status="warning"
          borderRadius="0"
          alignItems="center"
          data-testid="session-expiry-banner"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Session expiring soon</Alert.Title>
            <Alert.Description>
              You&apos;ll be signed out in {formatCountdown(remaining)}. Log in
              again to keep working — unsaved changes will be lost.
            </Alert.Description>
          </Alert.Content>
          <Button
            size="sm"
            variant="outline"
            colorPalette="orange"
            flexShrink="0"
            data-testid="session-expiry-relogin"
            onClick={() =>
              signOut({
                callbackUrl: `/login?callbackUrl=${encodeURIComponent(currentPath())}`,
              })
            }
          >
            Log in again
          </Button>
        </Alert.Root>
      )}
    </>
  );
}
