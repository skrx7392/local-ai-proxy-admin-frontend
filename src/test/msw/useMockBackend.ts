import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './server';

/**
 * Opt-in helper for Vitest suites that want the admin MSW handlers
 * active. Call at the top of a `describe` and every request made by
 * the code under test to `/api/admin/*` is intercepted. Unhandled
 * requests throw to keep tests honest — stub what you hit.
 *
 * Kept opt-in (rather than wiring into the global setup file) so
 * existing tests that do their own `vi.stubGlobal('fetch', ...)`
 * mocking don't see their stubs replaced by MSW's fetch patch.
 */
export function useMockBackend(): void {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });
}
