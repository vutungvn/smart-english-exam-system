import { ErrorCode } from '../errors/error-codes.js';

export type ResponseMeta = Record<string, unknown>;

export interface SuccessEnvelope<T> {
  success: true;
  status: number;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  status: number;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class WithMeta<T> {
  constructor(
    readonly data: T,
    readonly meta: ResponseMeta,
  ) {}
}
