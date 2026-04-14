import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      // options.ts fail-fasts at module load without these. Placeholders
      // only — unit tests never call the backend (authorize() is mocked
      // when exercised).
      AUTH_SECRET: 'test-placeholder-at-least-32-characters-long-ok',
      BACKEND_URL: 'http://test-placeholder:80',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
