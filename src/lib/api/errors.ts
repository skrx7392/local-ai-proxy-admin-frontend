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
