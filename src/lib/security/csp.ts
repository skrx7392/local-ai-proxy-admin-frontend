// Per-request Content-Security-Policy with a script nonce (middleware.ts
// generates the nonce and sets the header on both request and response —
// Next.js reads it from the request to nonce its own inline hydration
// scripts).
//
// Scope decision: style-src keeps 'unsafe-inline' because Chakra/emotion
// inject runtime <style> tags; script-src is the XSS-relevant directive and
// is fully nonce-based in production. 'unsafe-eval' remains dev-only
// (react-refresh).
export function buildCsp(nonce: string, isProd: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

// 128 bits of randomness, base64-encoded. Uses Web Crypto so it runs in the
// edge middleware runtime.
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}
