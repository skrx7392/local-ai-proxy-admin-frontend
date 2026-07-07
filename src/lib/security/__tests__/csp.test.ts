import { describe, expect, it } from 'vitest'

import { buildCsp, generateNonce } from '../csp'

function directive(csp: string, name: string): string {
  const found = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(name))
  return found ?? ''
}

describe('buildCsp', () => {
  const nonce = 'dGVzdC1ub25jZQ=='

  it('production script-src is nonce-based with no unsafe-inline or unsafe-eval', () => {
    const scriptSrc = directive(buildCsp(nonce, true), 'script-src')

    expect(scriptSrc).toContain(`'nonce-${nonce}'`)
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('development script-src keeps unsafe-eval (react refresh) alongside the nonce', () => {
    const scriptSrc = directive(buildCsp(nonce, false), 'script-src')

    expect(scriptSrc).toContain(`'nonce-${nonce}'`)
    expect(scriptSrc).toContain("'unsafe-eval'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('style-src keeps unsafe-inline for Chakra/emotion in both modes', () => {
    for (const isProd of [true, false]) {
      const styleSrc = directive(buildCsp(nonce, isProd), 'style-src')
      expect(styleSrc).toContain("'unsafe-inline'")
    }
  })

  it('preserves the full baseline directive set', () => {
    const csp = buildCsp(nonce, true)

    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
    expect(directive(csp, 'img-src')).toBe("img-src 'self' data: blob:")
    expect(directive(csp, 'font-src')).toBe("font-src 'self' data:")
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'")
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'form-action')).toBe("form-action 'self'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
  })
})

describe('generateNonce', () => {
  it('produces base64 of 16 random bytes', () => {
    const nonce = generateNonce()
    const decoded = Buffer.from(nonce, 'base64')

    expect(decoded.byteLength).toBe(16)
    // Round-trip proves it is valid base64, not a raw byte string.
    expect(decoded.toString('base64')).toBe(nonce)
  })

  it('is unique per call', () => {
    const seen = new Set(Array.from({ length: 32 }, () => generateNonce()))
    expect(seen.size).toBe(32)
  })
})
