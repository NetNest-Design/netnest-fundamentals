"""Each tool returns the API's JSON as a string, with the source filing on every value. An API refusal (unknown ticker,
limit reached) comes back as {"error": {...}} so the model can read it, instead of raising."""

from __future__ import annotations

import json
from typing import Any, Callable, List, Literal, Optional, Type

from langchain_core.tools import BaseTool, BaseToolkit
from netnest_fundamentals import NetNestClient, NetNestError
from pydantic import BaseModel, ConfigDict, Field

Period = Literal["annual", "quarterly", "ttm"]


def _run(fn: Callable[[], Any]) -> str:
    try:
        return json.dumps(fn())
    except NetNestError as e:
        return json.dumps({"error": {"code": e.code, "message": e.message, "status": e.status}})


class _NetNestTool(BaseTool):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    client: NetNestClient = Field(default_factory=NetNestClient, exclude=True)


class _SearchInput(BaseModel):
    q: str = Field(description="Company name or ticker")
    limit: Optional[int] = Field(default=None, ge=1, le=25)


class NetNestSearchCompany(_NetNestTool):
    name: str = "netnest_search_company"
    description: str = "Find a company by name or ticker. Returns ticker, name, CIK and exchange."
    args_schema: Type[BaseModel] = _SearchInput

    def _run(self, q: str, limit: Optional[int] = None, **_: Any) -> str:
        return _run(lambda: self.client.search(q, limit=limit))


class _TickerInput(BaseModel):
    ticker: str = Field(description="Stock ticker, for example AAPL or BRK.B")


class NetNestCompany(_NetNestTool):
    name: str = "netnest_get_company"
    description: str = (
        "Company profile and its latest annual, quarterly and trailing twelve month key metrics from SEC filings, "
        "each with the filing it came from."
    )
    args_schema: Type[BaseModel] = _TickerInput

    def _run(self, ticker: str, **_: Any) -> str:
        return _run(lambda: self.client.company(ticker))


class _FundamentalsInput(BaseModel):
    ticker: str = Field(description="Stock ticker, for example AAPL")
    metrics: Optional[List[str]] = Field(default=None, description="For example revenue, net_income, eps_diluted, free_cash_flow")
    period: Optional[Period] = None


class NetNestFundamentals(_NetNestTool):
    name: str = "netnest_get_fundamentals"
    description: str = (
        "Latest values of chosen metrics (revenue, net income, EPS, cash flow and more) for one period type, with the "
        "source filing, filing date and accession number for every value."
    )
    args_schema: Type[BaseModel] = _FundamentalsInput

    def _run(self, ticker: str, metrics: Optional[List[str]] = None, period: Optional[str] = None, **_: Any) -> str:
        return _run(lambda: self.client.fundamentals(ticker, metrics=metrics, period=period))


class _HistoryInput(BaseModel):
    ticker: str = Field(description="Stock ticker, for example NVDA")
    metric: str = Field(description="One metric, for example revenue")
    period: Optional[Period] = None
    limit: Optional[int] = Field(default=None, ge=1, le=200)


class NetNestHistory(_NetNestTool):
    name: str = "netnest_get_history"
    description: str = "One metric over time from SEC filings, newest first, up to 200 periods, each with its 10-K or 10-Q."
    args_schema: Type[BaseModel] = _HistoryInput

    def _run(self, ticker: str, metric: str, period: Optional[str] = None, limit: Optional[int] = None, **_: Any) -> str:
        return _run(lambda: self.client.history(ticker, metric, period=period, limit=limit))


class _EventsInput(BaseModel):
    since: Optional[str] = Field(default=None, description="Cursor from an earlier answer: only newer events")
    tickers: Optional[List[str]] = None
    types: Optional[List[str]] = None
    limit: Optional[int] = Field(default=None, ge=1, le=100)


class NetNestEvents(_NetNestTool):
    name: str = "netnest_get_events"
    description: str = (
        "SEC filing events across companies, newest first: 8-K items by plain name, Form 4 insider transactions and "
        "Schedule 13D and 13G stakes."
    )
    args_schema: Type[BaseModel] = _EventsInput

    def _run(self, since: Optional[str] = None, tickers: Optional[List[str]] = None, types: Optional[List[str]] = None, limit: Optional[int] = None, **_: Any) -> str:
        return _run(lambda: self.client.events(since=since, tickers=tickers, types=types, limit=limit))


class _HeadInput(BaseModel):
    since: Optional[str] = None


class NetNestEventsHead(_NetNestTool):
    name: str = "netnest_get_events_head"
    description: str = "The newest SEC events cursor and how many events are newer than a given cursor."
    args_schema: Type[BaseModel] = _HeadInput

    def _run(self, since: Optional[str] = None, **_: Any) -> str:
        return _run(lambda: self.client.events_head(since=since))


class NetNestToolkit(BaseToolkit):
    """All six tools on one client. api_key defaults to the NETNEST_API_KEY environment variable; "demo" tries it."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    client: NetNestClient = Field(default_factory=NetNestClient)

    def get_tools(self) -> List[BaseTool]:
        return [cls(client=self.client) for cls in (NetNestSearchCompany, NetNestCompany, NetNestFundamentals, NetNestHistory, NetNestEvents, NetNestEventsHead)]
