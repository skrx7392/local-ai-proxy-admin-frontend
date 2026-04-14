import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

import { TopBar } from '@/components/layout/TopBar';

// Admin shell layout. Every gated route in the `(admin)` route group
// renders inside this wrapper — middleware has already enforced a session
// by the time this layout renders. PR C will expand this with a side nav.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <TopBar />
      <Box as="main" flex="1">
        {children}
      </Box>
    </Box>
  );
}
