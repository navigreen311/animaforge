export class AnimaForgeError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string
  ) {
    super(message);
    this.name = 'AnimaForgeError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends AnimaForgeError {
  constructor(message = 'Invalid or missing API key', requestId?: string) {
    super(message, 401, 'authentication_error', requestId);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends AnimaForgeError {
  public readonly retryAfter?: number;

  constructor(
    message = 'Rate limit exceeded',
    retryAfter?: number,
    requestId?: string
  ) {
    super(message, 429, 'rate_limit_error', requestId);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientCreditsError extends AnimaForgeError {
  constructor(
    message = 'Insufficient credits to complete this request',
    requestId?: string
  ) {
    super(message, 402, 'insufficient_credits', requestId);
    this.name = 'InsufficientCreditsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AnimaForgeError {
  constructor(message = 'Resource not found', requestId?: string) {
    super(message, 404, 'not_found', requestId);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
