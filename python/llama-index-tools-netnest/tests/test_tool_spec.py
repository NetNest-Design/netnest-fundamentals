import json
import os
import time

import httpx
import pytest
from llama_index.tools.netnest import NetNestToolSpec
from netnest_fundamentals import NetNestClient


def client(status=200, body=None, calls=None):
    def handler(request):
        if calls is not None:
            calls.append(str(request.url))
        return httpx.Response(status, json=body if body is not None else {"data": [1]})

    return NetNestClient("k", base_url="https://api.example.test", http_client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_tool_list_has_six_function_tools():
    tools = NetNestToolSpec(client=client()).to_tool_list()
    assert [t.metadata.name for t in tools] == ["search_company", "get_company", "get_fundamentals", "get_history", "get_events", "get_events_head"]
    assert all(len(t.metadata.description) > 20 for t in tools)


def test_call_returns_api_json():
    calls = []
    tools = {t.metadata.name: t for t in NetNestToolSpec(client=client(calls=calls)).to_tool_list()}
    out = tools["get_history"].call(ticker="NVDA", metric="revenue", period="annual", limit=2)
    assert json.loads(out.content) == {"data": [1]}
    assert calls == ["https://api.example.test/v1/history/NVDA/revenue?period=annual&limit=2"]


def test_refusal_is_returned_not_raised():
    time.sleep(1.1)  # the demo token allows 2 requests a second
    spec = NetNestToolSpec(client=client(404, {"error": {"code": "unknown_ticker", "message": "Ticker not found"}}))
    assert json.loads(spec.get_company("NOPE")) == {"error": {"code": "unknown_ticker", "message": "Ticker not found", "status": 404}}


@pytest.mark.skipif(os.environ.get("NETNEST_LIVE") != "1", reason="live test: set NETNEST_LIVE=1")
def test_live():
    spec = NetNestToolSpec(api_key=os.environ.get("NETNEST_API_KEY") or "demo")
    assert json.loads(spec.get_company("AAPL"))["company"]["cik"] == 320193
