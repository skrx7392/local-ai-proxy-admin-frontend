'use client';

import { ChakraProvider as BaseChakraProvider } from '@chakra-ui/react';
import type { ReactNode } from 'react';

import { system } from '@/theme';

export function ChakraProvider({ children }: { children: ReactNode }) {
  return <BaseChakraProvider value={system}>{children}</BaseChakraProvider>;
}
