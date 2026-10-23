/**
 * Normalized API Error for CampusConnect Frontend
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static fromUnknown(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof Error) {
      return new ApiError(0, 'CLIENT_ERROR', err.message);
    }
    return new ApiError(0, 'UNKNOWN_ERROR', 'An unexpected error occurred. Please try again.');
  }
}
