// Every API error is {"error": {"code", "message", ...}} with an HTTP status and an X-Request-Id header.

export class NetNestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, requestId: string | null, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'NetNestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

/** HTTP 402: the call needs an API key or an x402 payment. `paymentRequired` is the PAYMENT-REQUIRED header, when sent. */
export class PaymentRequiredError extends NetNestError {
  readonly paymentRequired: string | null;

  constructor(code: string, message: string, requestId: string | null, details: Record<string, unknown>, paymentRequired: string | null) {
    super(402, code, message, requestId, details);
    this.name = 'PaymentRequiredError';
    this.paymentRequired = paymentRequired;
  }
}

/** HTTP 429: a rate limit or quota. `retryAfter` is in seconds, when the server says. */
export class RateLimitError extends NetNestError {
  readonly retryAfter: number | null;

  constructor(code: string, message: string, requestId: string | null, details: Record<string, unknown>, retryAfter: number | null) {
    super(429, code, message, requestId, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
