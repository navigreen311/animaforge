export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public details?: unknown,
    public isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} '${id}' not found` : `${resource} not found`, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_REQUIRED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, 'Too many requests', 'RATE_LIMITED', { retryAfter });
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(402, 'Insufficient credits', 'INSUFFICIENT_CREDITS', { required, available });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(503, `Service ${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE');
  }
}

// Express error handler factory
export function createErrorHandler(serviceName: string) {
  return (err: Error, req: any, res: any, next: any) => {
    if (err instanceof AppError) {
      const log = err.statusCode >= 500 ? console.error : console.warn;
      log(`[${serviceName}] ${err.code}: ${err.message}`, err.details || '');
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    // Unexpected error
    console.error(`[${serviceName}] UNEXPECTED:`, err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  };
}
