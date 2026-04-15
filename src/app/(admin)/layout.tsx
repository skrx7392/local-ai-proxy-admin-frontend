import { Suspense, type ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';

import { SideNav } from '@/components/layout/SideNav';
import { TopBar } from '@/components/layout/TopBar';

// Admin shell layout. Every gated route in the `(admin)` route group
// renders inside this wrapper — middleware has already enforced a session
// by the time this layout renders.
//
// The Suspense boundary wraps children so pages using `useSearchParams()`
// (via `useListSearchParams`) satisfy Next.js's prerender requirement
// without each page having to wrap itself.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <TopBar />
      <Flex flex="1" minH="0">
        <SideNav />
        <Box as="main" flex="1" minW="0">
          <Suspense fallback={null}>{children}</Suspense>
        </Box>
      </Flex>
    </Box>
  );
}
