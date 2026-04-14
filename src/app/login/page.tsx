import { Suspense } from 'react';
import { Box } from '@chakra-ui/react';

import { LoginForm } from './LoginForm';

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
