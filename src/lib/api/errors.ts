export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch|network/i.test(err.message);
}

// Human-readable one-liner for a failed query, safe to render directly.
// Zod errors are special-cased because their `message` is a raw JSON dump
// of issues — useful in the console, unreadable in an alert.
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message || error.code;
  if (
    error !== null &&
    typeof error === 'object' &&
    (error as { name?: unknown }).name === 'ZodError'
  ) {
    return 'The server returned data in an unexpected shape.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
}
