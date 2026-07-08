import { ChakraProvider } from '@chakra-ui/react';
import { act, render, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ChartFrame,
  ModelBreakdownChart,
  TimeseriesChart,
  type ChartSize,
} from '@/components/charts';
import { system } from '@/theme';

import type { ModelUsage, TimeseriesBucket } from '@/features/usage/schemas';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

// ---------------------------------------------------------------------------
// Controllable ResizeObserver double. The global stub in test/setup.ts is a
// no-op (charts stay unmeasured, matching jsdom's zero-size layout); these
// tests need to drive measurements explicitly to exercise the gating logic.
// ---------------------------------------------------------------------------

type ROCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver,
) => void;

class ControlledResizeObserver {
  static instances: ControlledResizeObserver[] = [];

  readonly callback: ROCallback;
  readonly targets = new Set<Element>();

  constructor(callback: ROCallback) {
    this.callback = callback;
    ControlledResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }
}

function makeEntry(target: Element, width: number, height: number) {
  return {
    target,
    contentRect: {
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    },
  } as unknown as ResizeObserverEntry;
}

/** Fire a resize report into every observed element. */
function reportSize(width: number, height: number): void {
  act(() => {
    for (const instance of ControlledResizeObserver.instances) {
      for (const target of instance.targets) {
        instance.callback(
          [makeEntry(target, width, height)],
          instance as unknown as ResizeObserver,
        );
      }
    }
  });
}

/** Wait for ChartFrame's settle frame (rAF or its setTimeout fallback). */
async function flushSettleFrame(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

beforeEach(() => {
  ControlledResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', ControlledResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const buckets: TimeseriesBucket[] = Array.from({ length: 8 }, (_, i) => ({
  bucket: new Date(Date.UTC(2026, 3, 14, i, 0, 0)).toISOString(),
  requests: 100 + i * 50,
  prompt_tokens: i * 1000,
  completion_tokens: i * 2000,
  total_tokens: i * 3000,
  credits: i * 0.5,
  errors: i,
}));

const models: ModelUsage[] = [
  { model: 'a', requests: 5, total_tokens: 100, credits: 0.1, avg_duration_ms: 4 },
  { model: 'b', requests: 9, total_tokens: 900, credits: 0.9, avg_duration_ms: 6 },
];

let mountCount = 0;
function MountProbe({ width, height }: ChartSize) {
  useEffect(() => {
    mountCount += 1;
  }, []);
  return (
    <div data-testid="probe" data-width={width} data-height={height}>
      chart
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChartFrame gating
// ---------------------------------------------------------------------------

describe('ChartFrame', () => {
  beforeEach(() => {
    mountCount = 0;
  });

  it('reserves the chart slot but does not mount children before a non-zero measurement', async () => {
    const { getByTestId, queryByTestId } = wrap(
      <ChartFrame height={260} minHeight={200} ariaLabel="Test chart" testId="frame">
        {(size) => <MountProbe {...size} />}
      </ChartFrame>,
    );

    const frame = getByTestId('frame');
    // Layout space is reserved up front so the chart popping in later cannot
    // shift the page (the first-interaction-miss symptom).
    expect(frame).toHaveStyle({ height: '260px', 'min-height': '200px' });

    await flushSettleFrame();
    expect(queryByTestId('probe')).toBeNull();
    expect(mountCount).toBe(0);
  });

  it('mounts children with the measured size after the container reports non-zero', async () => {
    const { getByTestId } = wrap(
      <ChartFrame height={260} ariaLabel="Test chart" testId="frame">
        {(size) => <MountProbe {...size} />}
      </ChartFrame>,
    );

    reportSize(800, 260);
    await waitFor(() => expect(getByTestId('probe')).toBeInTheDocument());
    expect(getByTestId('probe')).toHaveAttribute('data-width', '800');
    expect(getByTestId('probe')).toHaveAttribute('data-height', '260');
  });

  it('ignores zero-size reports (mid-transition layouts never mount a broken chart)', async () => {
    const { queryByTestId } = wrap(
      <ChartFrame height={260} ariaLabel="Test chart" testId="frame">
        {(size) => <MountProbe {...size} />}
      </ChartFrame>,
    );

    reportSize(0, 0);
    await flushSettleFrame();
    expect(queryByTestId('probe')).toBeNull();
  });

  it('remounts children when the container collapses and re-expands, restarting the enter animation', async () => {
    const { getByTestId, queryByTestId } = wrap(
      <ChartFrame height={260} ariaLabel="Test chart" testId="frame">
        {(size) => <MountProbe {...size} />}
      </ChartFrame>,
    );

    reportSize(800, 260);
    await waitFor(() => expect(getByTestId('probe')).toBeInTheDocument());
    expect(mountCount).toBe(1);

    // Container collapses (hidden tab / route transition): unmount the chart.
    reportSize(0, 0);
    await waitFor(() => expect(queryByTestId('probe')).toBeNull());

    // Container comes back: the chart must mount FRESH so recharts runs its
    // enter animation against real geometry instead of resuming stale state.
    reportSize(800, 260);
    await waitFor(() => expect(getByTestId('probe')).toBeInTheDocument());
    expect(mountCount).toBe(2);
  });

  it('updates the size (without remounting) on subsequent resizes', async () => {
    const { getByTestId } = wrap(
      <ChartFrame height={260} ariaLabel="Test chart" testId="frame">
        {(size) => <MountProbe {...size} />}
      </ChartFrame>,
    );

    reportSize(800, 260);
    await waitFor(() => expect(getByTestId('probe')).toBeInTheDocument());

    reportSize(500, 260);
    await waitFor(() =>
      expect(getByTestId('probe')).toHaveAttribute('data-width', '500'),
    );
    expect(mountCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Chart integration through the frame — the actual SVG geometry must exist
// once measured. Regression for: charts rendering axes-only / bars flat at
// y=0 on first paint after client-side navigation.
// ---------------------------------------------------------------------------

describe('TimeseriesChart via ChartFrame', () => {
  it('renders the line path with real geometry once the container is measured', async () => {
    const { getByTestId } = wrap(
      <TimeseriesChart buckets={buckets} interval="hour" series={['requests']} />,
    );

    const figure = getByTestId('timeseries-chart');
    expect(figure.querySelector('svg')).toBeNull();

    reportSize(800, 280);
    await waitFor(() => {
      const path = figure.querySelector('path.recharts-line-curve');
      expect(path).not.toBeNull();
      const d = path?.getAttribute('d') ?? '';
      // A real polyline: at least as many segments as data points minus one.
      expect((d.match(/[LC]/g) ?? []).length).toBeGreaterThanOrEqual(
        buckets.length - 1,
      );
      // The line must be DRAWN, not just present: recharts' enter animation
      // reveals lines via stroke-dasharray and, when it froze at t=0, left a
      // complete path with `stroke-dasharray: 0px, <total>px` (invisible).
      // Enter animations are disabled, so no dasharray may be present.
      expect(path?.getAttribute('stroke-dasharray')).toBeNull();
    });
  });

  it('joins on the unique ISO bucket key: a 25-bucket window with duplicate wall-clock labels keeps every point', async () => {
    // Gap-filled 24h windows return 25 hourly buckets — the first and last
    // share a wall-clock label. The axis must join on the raw bucket key and
    // only FORMAT labels for display.
    const start = Date.UTC(2026, 6, 7, 18, 0, 0);
    const dayWrap: TimeseriesBucket[] = Array.from({ length: 25 }, (_, i) => ({
      bucket: new Date(start + i * 3_600_000).toISOString(),
      requests: 10 + i,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      credits: 0,
      errors: 0,
    }));

    const { getByTestId } = wrap(
      <TimeseriesChart buckets={dayWrap} interval="hour" series={['requests']} />,
    );
    reportSize(1000, 280);

    await waitFor(() => {
      const figure = getByTestId('timeseries-chart');
      const path = figure.querySelector('path.recharts-line-curve');
      expect(path).not.toBeNull();
      const d = path?.getAttribute('d') ?? '';
      // All 25 points survive: 24 line segments. (Tick LABEL formatting is
      // covered by the timeseriesChartData unit tests and the Playwright
      // spec — jsdom culls axis ticks because it cannot measure text.)
      expect((d.match(/[LC]/g) ?? []).length).toBeGreaterThanOrEqual(24);
    });
  });
});

describe('ModelBreakdownChart via ChartFrame', () => {
  it('renders one bar per model once the container is measured', async () => {
    const { getByTestId } = wrap(<ModelBreakdownChart data={models} />);

    const figure = getByTestId('model-breakdown-chart');
    expect(figure.querySelector('svg')).toBeNull();

    reportSize(800, 280);
    await waitFor(() => {
      const bars = figure.querySelectorAll('.recharts-bar-rectangle');
      expect(bars.length).toBe(models.length);
    });
  });
});
