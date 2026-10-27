"""The NetNest Design Fundamentals API client. Responses are the API's JSON as dicts, source filing on every value."""

from __future__ import annotations

import json
import os
from typing import Any, Iterable, Optional, Union
from urllib.parse import quote

import httpx

from .errors import NetNestError, PaymentRequiredError, RateLimitError

__version__ = "0.1.0"
DEFAULT_BASE_URL = "https://api.netnestdesign.com"

Period = str  # "annual" | "quarterly" | "ttm"


def _seg(value: str) -> str:
    return quote(value, safe="")


def _csv(value: Union[None, str, Iterable[str]]) -> Optional[str]:
    if value is None or isinstance(value, str):
        return value
    return ",".join(value)


class NetNestClient:
    """api_key: a key from POST /v1/signup, or "demo" to try it. Defaults to the NETNEST_API_KEY environment variable.

    http_client: an httpx.Client to reuse (for example one that pays x402 per call); it is not closed by this client.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else os.environ.get("NETNEST_API_KEY") or None
        self.base_url = base_url.rstrip("/")
        self._owns_client = http_client is None
        self._http = http_client or httpx.Client(timeout=timeout)

    def __enter__(self) -> "NetNestClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        if self._owns_client:
            self._http.close()

    def search(self, q: str, *, limit: Optional[int] = None) -> dict[str, Any]:
        """Find a company by name or ticker. Free, no key needed."""
        return self._get("/v1/search", {"q": q, "limit": limit})

    def company(self, ticker: str) -> dict[str, Any]:
        """Profile and the latest annual, quarterly and trailing twelve month key metrics."""
        return self._get(f"/v1/company/{_seg(ticker)}")

    def fundamentals(self, ticker: str, *, metrics: Union[None, str, Iterable[str]] = None, period: Optional[Period] = None) -> dict[str, Any]:
        """Latest values of chosen metrics for one period type."""
        return self._get(f"/v1/fundamentals/{_seg(ticker)}", {"metrics": _csv(metrics), "period": period})

    def history(self, ticker: str, metric: str, *, period: Optional[Period] = None, limit: Optional[int] = None) -> dict[str, Any]:
        """One metric over time, newest first (limit 1 to 200, default 20)."""
        return self._get(f"/v1/history/{_seg(ticker)}/{_seg(metric)}", {"period": period, "limit": limit})

    def events(
        self,
        *,
        since: Optional[str] = None,
        before: Optional[str] = None,
        types: Union[None, str, Iterable[str]] = None,
        tickers: Union[None, str, Iterable[str]] = None,
        limit: Optional[int] = None,
    ) -> dict[str, Any]:
        """SEC filing events across companies, newest first: 8-K items, Form 4 insider transactions, 13D and 13G stakes."""
        return self._get("/v1/events", {"since": since, "before": before, "types": _csv(types), "tickers": _csv(tickers), "limit": limit})

    def events_head(self, *, since: Optional[str] = None) -> dict[str, Any]:
        """The newest events cursor and how many events are newer than since. Free."""
        return self._get("/v1/events/head", {"since": since})

    @classmethod
    def signup(cls, email: str, *, base_url: str = DEFAULT_BASE_URL, http_client: Optional[httpx.Client] = None) -> dict[str, Any]:
        """Create a free account. The key in the answer is shown once."""
        with cls(api_key="", base_url=base_url, http_client=http_client) as c:
            return c._request("POST", "/v1/signup", None, {"email": email}, auth=False)

    def _get(self, path: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        return self._request("GET", path, params)

    def _request(self, method: str, path: str, params: Optional[dict[str, Any]], body: Any = None, auth: bool = True) -> dict[str, Any]:
        headers = {"Accept": "application/json", "User-Agent": f"netnest-fundamentals-python/{__version__}"}
        if auth and self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        query = {k: v for k, v in (params or {}).items() if v is not None and v != ""}
        res = self._http.request(method, self.base_url + path, params=query, json=body, headers=headers)
        request_id = res.headers.get("x-request-id")
        try:
            data = res.json() if res.content else None
        except (json.JSONDecodeError, ValueError):
            data = None
        if res.is_success:
            if data is None:
                raise NetNestError(res.status_code, "invalid_response", "The response was not JSON", request_id)
            return data
        err = dict(data.get("error") or {}) if isinstance(data, dict) else {}
        code = err.pop("code", None)
        message = err.pop("message", None)
        code = code if isinstance(code, str) else f"http_{res.status_code}"
        message = message if isinstance(message, str) else f"HTTP {res.status_code}"
        if res.status_code == 402:
            raise PaymentRequiredError(code, message, request_id, err, res.headers.get("payment-required"))
        if res.status_code == 429:
            ra = res.headers.get("retry-after")
            raise RateLimitError(code, message, request_id, err, int(ra) if ra and ra.isdigit() else None)
        raise NetNestError(res.status_code, code, message, request_id, err)
