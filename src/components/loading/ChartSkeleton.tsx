'use client';

import { Box } from '@chakra-ui/react';

import { SkeletonCard } from './SkeletonCard';

export interface ChartSkeletonProps {
  height?: number;
  animate?: boolean;
}

/**
 * Card + dimmed SVG gridlines + a shimmering SVG path as placeholder curve.
 * Dimensions match the real chart so swap-in is layout-stable.
 */
export function ChartSkeleton({ height = 240, animate = true }: ChartSkeletonProps) {
  const gridColor = 'rgba(255,255,255,0.08)';

  return (
    <SkeletonCard padding="4">
      <Box position="relative" height={`${height}px`} width="100%" aria-hidden="true">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 400 ${height}`}
          preserveAspectRatio="none"
          role="presentation"
          data-shimmer={animate ? 'true' : 'false'}
        >
          <defs>
            <linearGradient id="chart-shimmer-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.28)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pct) => (
            <line
              key={pct}
              x1={0}
              x2={400}
              y1={height * pct}
              y2={height * pct}
              stroke={gridColor}
              strokeDasharray="2 4"
            />
          ))}
          {/* Placeholder curve */}
          <path
            d={`M 0 ${height * 0.7} C 100 ${height * 0.4}, 200 ${height * 0.8}, 400 ${
              height * 0.3
            }`}
            fill="none"
            stroke="url(#chart-shimmer-grad)"
            strokeWidth={2}
            style={
              animate
                ? {
                    animation: 'shimmer 1400ms linear infinite',
                  }
                : undefined
            }
          />
        </svg>
      </Box>
    </SkeletonCard>
  );
}
