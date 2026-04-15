'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS } from '@/lib/nav/navItems';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname() ?? '/';

  return (
    <Box
      as="nav"
      aria-label="Primary"
      width="56"
      flexShrink="0"
      borderRightWidth="1px"
      borderColor="border.muted"
      paddingBlock="6"
      paddingInline="3"
      data-testid="sidenav"
    >
      <Stack gap="1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <NextLink
              key={item.href}
              href={item.href}
              data-testid={`sidenav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              aria-current={active ? 'page' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <HStack
                gap="3"
                paddingInline="3"
                paddingBlock="2"
                borderRadius="md"
                background={active ? 'bg.glass.subtle' : undefined}
                color={active ? 'fg.default' : 'fg.muted'}
                _hover={{
                  background: active ? 'bg.glass.subtle' : 'bg.muted',
                  color: 'fg.default',
                }}
                transitionProperty="background-color, color"
                transitionDuration="sm"
                transitionTimingFunction="standard"
              >
                <Icon size={16} />
                <Text textStyle="body.sm" fontWeight={active ? 'medium' : 'normal'}>
                  {item.label}
                </Text>
              </HStack>
            </NextLink>
          );
        })}
      </Stack>
    </Box>
  );
}
