import json
import os
import time

import httpx
import pytest

from netnest_fundamentals import NetNestClient, NetNestError, PaymentRequiredError, RateLimitError


def make(status=200, body=None, headers=None, calls=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(request)
        content = body if isinstance(body, (bytes, str)) else json.dumps(body if body is not None else {"ok": True})
        return httpx.Response(status, content=content, headers={"content-type": "application/json", **(headers or {})})

    return httpx.Client(transport=httpx.MockTransport(handler))


def test_builds_each_request_with_the_key_and_only_given_fields():
    calls = []
    c = NetNestClient("nnf_test", base_url="https://api.example.test/", http_client=make(calls=calls))
    c.search("apple", limit=3)
    c.company("BRK.B")
    c.fundamentals("MSFT", metrics=["revenue", "net_income"], period="quarterly")
    c.history("NVDA", "revenue", period="annual", limit=5)
    c.events(tickers=["AAPL", "MSFT"], types=["8k_item_5_02"], limit=10)
    c.events_head(since="abcdefgh")
    assert [str(r.url) for r in calls] == [
        "https://api.example.test/v1/search?q=apple&limit=3",
        "https://api.example.test/v1/company/BRK.B",
        "https://api.example.test/v1/fundamentals/MSFT?metrics=revenue%2Cnet_income&period=quarterly",
        "https://api.example.test/v1/history/NVDA/revenue?period=annual&limit=5",
        "https://api.example.test/v1/events?types=8k_item_5_02&tickers=AAPL%2CMSFT&limit=10",
        "https://api.example.test/v1/events/head?since=abcdefgh",
    ]
    assert calls[0].headers["authorization"] == "Bearer nnf_test"
    assert calls[0].headers["user-agent"].startswith("netnest-fundamentals-python/")


def test_no_key_sends_no_authorization(monkeypatch):
    monkeypatch.delenv("NETNEST_API_KEY", raising=False)
    calls = []
    NetNestClient(http_client=make(calls=calls)).search("apple")
    assert "authorization" not in calls[0].headers


def test_error_envelope_maps_to_netnesterror():
    c = NetNestClient("k", http_client=make(422, {"error": {"code": "no_data", "message": "No XBRL data", "ticker": "ZZZ"}}, {"x-request-id": "req_1"}))
    with pytest.raises(NetNestError) as e:
        c.company("ZZZ")
    assert (e.value.status, e.value.code, e.value.message, e.value.request_id, e.value.details) == (422, "no_data", "No XBRL data", "req_1", {"ticker": "ZZZ"})


def test_402_is_payment_required_with_header():
    c = NetNestClient("", http_client=make(402, {"error": {"code": "payment_required", "message": "Pay"}}, {"payment-required": "eyJ4"}))
    with pytest.raises(PaymentRequiredError) as e:
        c.company("AAPL")
    assert e.value.payment_required == "eyJ4"


def test_429_is_rate_limit_with_retry_after():
    c = NetNestClient("k", http_client=make(429, {"error": {"code": "rate_limited", "message": "Slow"}}, {"retry-after": "60"}))
    with pytest.raises(RateLimitError) as e:
        c.search("a")
    assert e.value.retry_after == 60


def test_non_json_error_is_still_netnesterror():
    c = NetNestClient("k", http_client=make(503, "<html>busy</html>"))
    with pytest.raises(NetNestError) as e:
        c.search("a")
    assert (e.value.status, e.value.code) == (503, "http_503")


def test_signup_posts_email_without_key():
    calls = []
    out = NetNestClient.signup("you@example.test", http_client=make(201, {"api_key": "nnf_new"}, calls=calls))
    assert out["api_key"] == "nnf_new"
    assert calls[0].method == "POST" and json.loads(calls[0].content) == {"email": "you@example.test"}
    assert "authorization" not in calls[0].headers


@pytest.mark.skipif(os.environ.get("NETNEST_LIVE") != "1", reason="live test: set NETNEST_LIVE=1")
def test_live_production():
    with NetNestClient(os.environ.get("NETNEST_API_KEY") or "demo") as c:
        # The demo token allows 2 requests a second; pace the calls so the smoke never trips it.
        time.sleep(1.1)
        assert any(r["ticker"] == "AAPL" for r in c.search("apple", limit=3)["results"])
        time.sleep(1.1)
        rev = next(m for m in c.company("AAPL")["latest"]["annual"] if m["metric"] == "revenue")
        assert rev["value"] > 0 and rev["source_url"].startswith("https://www.sec.gov/")
        time.sleep(1.1)
        assert len(c.history("NVDA", "revenue", period="annual", limit=2)["data"]) == 2
