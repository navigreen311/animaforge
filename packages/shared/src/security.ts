import crypto from 'crypto';

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS protocol
    .replace(/on\w+=/gi, '') // Strip event handlers
    .trim();
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') result[key] = sanitizeInput(value);
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) result[key] = sanitizeObject(value);
    else result[key] = value;
  }
  return result;
}

// CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, storedToken: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
}

// Password strength
export function checkPasswordStrength(password: string): { score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;
  if (password.length >= 8) score++; else feedback.push('At least 8 characters');
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; else feedback.push('Mix uppercase and lowercase');
  if (/\d/.test(password)) score++; else feedback.push('Include a number');
  if (/[^a-zA-Z0-9]/.test(password)) score++; else feedback.push('Include a special character');
  return { score, feedback };
}

// Hash sensitive data
export function hashSensitive(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Redact sensitive fields from logs
export function redactSensitive(obj: Record<string, any>): Record<string, any> {
  const SENSITIVE = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie', 'creditCard', 'ssn'];
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Request ID
export function generateRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}
