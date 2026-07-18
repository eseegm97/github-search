import express from 'express';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_FAILURE'
  | 'DATABASE_FAILURE'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class RouteError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'RouteError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendData<T>(res: express.Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function normalizeError(error: unknown): RouteError {
  if (error instanceof RouteError) {
    return error;
  }

  if (error instanceof Error && /duplicate key/i.test(error.message)) {
    return new RouteError(409, 'CONFLICT', 'Resource already exists.', {
      reason: error.message,
    });
  }

  return new RouteError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
}

export function sendError(res: express.Response, error: unknown): void {
  const normalized = normalizeError(error);
  const payload: { code: ApiErrorCode; message: string; details?: unknown } = {
    code: normalized.code,
    message: normalized.message,
  };

  if (normalized.details !== undefined) {
    payload.details = normalized.details;
  }

  res.status(normalized.status).json({ error: payload });
}