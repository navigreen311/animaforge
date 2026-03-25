import type { Response } from "express";

interface SuccessPayload<T> {
  success: true;
  data: T;
}

interface ErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function success<T>(res: Response, data: T, statusCode = 200): void {
  const body: SuccessPayload<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function error(
  res: Response,
  code: string,
  message: string,
  statusCode = 500
): void {
  const body: ErrorPayload = {
    success: false,
    error: { code, message },
  };
  res.status(statusCode).json(body);
}
