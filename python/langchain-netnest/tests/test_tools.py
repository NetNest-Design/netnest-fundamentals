import json
import os
import time

import httpx
import pytest
from langchain_netnest import NetNestToolkit
from netnest_fundamentals import NetNestClient


def client(status=200, body=None, calls=None):
    def handler(request):
        if calls is not None:
            calls.append(str(request.url))
        return httpx.Response(status, json=body if body is not None else {"data": [1]})

    return NetNestClient("k", base_url="https://api.example.test", http_client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_toolkit_has_six_named_tools_with_schemas():
    tools = NetNestToolkit(client=client()).get_tools()
    assert [t.name for t in tools] == [
        "netnest_search_company",
        "netnest_get_company",
        "netnest_get_fundamentals",
        "netnest_get_history",
        "netnest_get_events",
        "netnest_get_events_head",
    ]
    assert all(len(t.description) > 20 and t.args_schema is not None for t in tools)


def test_invoke_calls_the_api_and_returns_json():
    calls = []
    tools = {t.name: t for t in NetNestToolkit(client=client(calls=calls)).get_tools()}
    out = tools["netnest_get_fundamentals"].invoke({"ticker": "AAPL", "metrics": ["revenue"], "period": "ttm"})
    assert json.loads(out) == {"data": [1]}
    assert calls == ["https://api.example.test/v1/fundamentals/AAPL?metrics=revenue&period=ttm"]


def test_refusal_is_returned_not_raised():
    tools = {t.name: t for t in NetNestToolkit(client=client(404, {"error": {"code": "unknown_ticker", "message": "Ticker not found"}})).get_tools()}
    out = json.loads(tools["netnest_get_company"].invoke({"ticker": "NOPE"}))
    assert out == {"error": {"code": "unknown_ticker", "message": "Ticker not found", "status": 404}}


def live_json(call):
    """Calls a tool against production. The shared demo token allows 2 requests a second for every caller, so each
    call is paced and a rate limit refusal is retried. Fails with the body if it never answers."""
    for _ in range(4):
        time.sleep(1.5)
        out = json.loads(call())
        if out.get("error", {}).get("code") != "rate_limited":
            return out
    raise AssertionError(out)


@pytest.mark.skipif(os.environ.get("NETNEST_LIVE") != "1", reason="live test: set NETNEST_LIVE=1")
def test_live():
    tools = {t.name: t for t in NetNestToolkit(client=NetNestClient(os.environ.get("NETNEST_API_KEY") or "demo")).get_tools()}
    out = live_json(lambda: tools["netnest_get_company"].invoke({"ticker": "AAPL"}))
    assert out["company"]["cik"] == 320193, out
