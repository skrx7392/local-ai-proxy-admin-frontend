import type { NextConfig } from 'next'

// `output: 'standalone'` is required so the k8s Dockerfile (added in A4) can copy
// a self-contained server bundle instead of the whole node_modules tree.
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
}

export default nextConfig
