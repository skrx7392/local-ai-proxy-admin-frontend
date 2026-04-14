import '@testing-library/jest-dom/vitest';

// jsdom lacks `matchMedia`; next-themes calls it at render time. A noop
// implementation is enough for components that only consume the resolved
// theme class.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// recharts' `ResponsiveContainer` observes its parent via ResizeObserver;
// jsdom doesn't provide one. Stub with a no-op so renders don't throw.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
