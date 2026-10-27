"""Every API error is {"error": {"code", "message", ...}} with an HTTP status and an X-Request-Id header."""

from __future__ import annotations

from typing import Any, Optional


class NetNestError(Exception):
    def __init__(self, status: int, code: str, message: str, request_id: Optional[str] = None, details: Optional[dict[str, Any]] = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.request_id = request_id
        self.details = details or {}

    def __repr__(self) -> str:
        return f"{type(self).__name__}(status={self.status}, code={self.code!r}, message={self.message!r})"


class PaymentRequiredError(NetNestError):
    """HTTP 402: the call needs an API key or an x402 payment. payment_required is the PAYMENT-REQUIRED header, when sent."""

    def __init__(self, code: str, message: str, request_id: Optional[str], details: dict[str, Any], payment_required: Optional[str]):
        super().__init__(402, code, message, request_id, details)
        self.payment_required = payment_required


class RateLimitError(NetNestError):
    """HTTP 429: a rate limit or quota. retry_after is in seconds, when the server says."""

    def __init__(self, code: str, message: str, request_id: Optional[str], details: dict[str, Any], retry_after: Optional[int]):
        super().__init__(429, code, message, request_id, details)
        self.retry_after = retry_after
