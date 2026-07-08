'use client';

import { CloseButton, Drawer, IconButton, Portal } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { NavLinks } from './SideNav';

/**
 * Hamburger-triggered navigation drawer for viewports below the `lg`
 * breakpoint (1024px), where the desktop side rail is hidden.
 *
 * Chakra v3's Drawer (Ark UI dialog underneath) provides the focus trap,
 * `Escape`-to-close, and backdrop-click-to-close behavior — we only manage
 * the open state so navigating via a link can close the drawer.
 */
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => setOpen(details.open)}
      placement="start"
    >
      <Drawer.Trigger asChild>
        <IconButton
          aria-label="Open navigation"
          variant="ghost"
          size="sm"
          hideFrom="lg"
          data-testid="mobile-nav-trigger"
        >
          <Menu size={18} />
        </IconButton>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content maxW="72" data-testid="mobile-nav-drawer">
            <Drawer.Header>
              <Drawer.Title textStyle="body.sm" fontWeight="medium">
                local-ai admin
              </Drawer.Title>
            </Drawer.Header>
            <Drawer.Body as="nav" aria-label="Primary" paddingInline="3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </Drawer.Body>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" aria-label="Close navigation" data-testid="mobile-nav-close" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
