import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TODO(future PR): custom rule "no-raw-fetch-in-hooks" — hooks must go
      // through `apiFetch` (src/lib/api/client.ts), never raw fetch().
      // Only the BFF proxy route (src/app/api/admin/[...path]/route.ts) may
      // call fetch() directly, since it runs on the Next server.
    },
  },
];

export default config;
