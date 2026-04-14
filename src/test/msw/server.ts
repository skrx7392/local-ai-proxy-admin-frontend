import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Node-mode MSW server for Vitest. Tests that need custom responses
 * call `server.use(...handler)` in a `beforeEach` — the afterEach hook
 * in the shared setup file resets everything between tests.
 */
export const server = setupServer(...handlers);
