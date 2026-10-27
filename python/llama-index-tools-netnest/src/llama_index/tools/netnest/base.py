"""Each tool returns the API's JSON as a string, with the source filing on every value. An API refusal comes back as
{"error": {...}} so the agent can read it."""

from __future__ import annotations

import json
from typing import Any, Callable, List, Optional

from llama_index.core.tools.tool_spec.base import BaseToolSpec
from netnest_fundamentals import NetNestClient, NetNestError


def _run(fn: Callable[[], Any]) -> str:
    try:
        return json.dumps(fn())
    except NetNestError as e:
        return json.dumps({"error": {"code": e.code, "message": e.message, "status": e.status}})


class NetNestToolSpec(BaseToolSpec):
    """Company fundamentals and SEC filing events from the NetNest Design Fundamentals API.

    api_key defaults to the NETNEST_API_KEY environment variable; "demo" tries it with a shared daily limit.
    """

    spec_functions = ["search_company", "get_company", "get_fundamentals", "get_history", "get_events", "get_events_head"]

    def __init__(self, api_key: Optional[str] = None, client: Optional[NetNestClient] = None) -> None:
        self.client = client or NetNestClient(api_key)

    def search_company(self, q: str, limit: Optional[int] = None) -> str:
        """Find a company by name or ticker. Returns ticker, name, CIK and exchange."""
        return _run(lambda: self.client.search(q, limit=limit))

    def get_company(self, ticker: str) -> str:
        """Company profile and its latest annual, quarterly and trailing twelve month key metrics from SEC filings, each with the filing it came from. ticker: for example AAPL or BRK.B."""
        return _run(lambda: self.client.company(ticker))

    def get_fundamentals(self, ticker: str, metrics: Optional[List[str]] = None, period: Optional[str] = None) -> str:
        """Latest values of chosen metrics (for example revenue, net_income, eps_diluted, free_cash_flow) for one period (annual, quarterly or ttm), with the source filing, filing date and accession number for every value."""
        return _run(lambda: self.client.fundamentals(ticker, metrics=metrics, period=period))

    def get_history(self, ticker: str, metric: str, period: Optional[str] = None, limit: Optional[int] = None) -> str:
        """One metric over time from SEC filings, newest first, up to 200 periods, each with its 10-K or 10-Q."""
        return _run(lambda: self.client.history(ticker, metric, period=period, limit=limit))

    def get_events(self, since: Optional[str] = None, tickers: Optional[List[str]] = None, types: Optional[List[str]] = None, limit: Optional[int] = None) -> str:
        """SEC filing events across companies, newest first: 8-K items by plain name, Form 4 insider transactions and Schedule 13D and 13G stakes. since: a cursor from an earlier answer, for only newer events."""
        return _run(lambda: self.client.events(since=since, tickers=tickers, types=types, limit=limit))

    def get_events_head(self, since: Optional[str] = None) -> str:
        """The newest SEC events cursor and how many events are newer than a given cursor."""
        return _run(lambda: self.client.events_head(since=since))
