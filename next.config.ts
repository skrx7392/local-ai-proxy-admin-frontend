import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

// The Content-Security-Policy header is NOT set here: it needs a
// per-request script nonce, so src/middleware.ts builds it via
// src/lib/security/csp.ts. Everything below is request-independent and
// stays static.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
