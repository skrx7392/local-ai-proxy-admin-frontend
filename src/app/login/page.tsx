import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Box } from '@chakra-ui/react';

import { LoginForm } from './LoginForm';

// Match the app-wide "<Page> · local-ai admin" tab-title convention (cf.
// styleguide's "Styleguide · local-ai admin") and keep the brand casing
// consistent with the wordmark shown on the card and in the top bar.
export const metadata: Metadata = {
  title: 'Sign in · local-ai admin',
};

export default function LoginPage() {
  return (
    <Box
      as="main"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      padding="8"
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </Box>
  );
}
