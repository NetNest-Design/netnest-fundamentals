# netnest-fundamentals

Python client for the [NetNest Design Fundamentals API](https://api.netnestdesign.com/docs): company fundamentals and
SEC filing events, with the source filing on every number.

```bash
pip install netnest-fundamentals
```

```python
from netnest_fundamentals import NetNestClient

nn = NetNestClient("demo")  # or your key; defaults to NETNEST_API_KEY
for v in nn.fundamentals("MSFT", metrics=["revenue", "net_income"], period="quarterly")["data"]:
    print(v["metric"], v["value"], v["period_end"], v["form"], v["source_url"])
```

* Methods: `search`, `company`, `fundamentals`, `history`, `events`, `events_head`, and `NetNestClient.signup(email)`.
* 13 metrics, annual, quarterly and trailing twelve months; up to 200 periods of history.
* Every value carries its form, filing date, accession number, SEC link and XBRL concept. A missing value is `None` with
  a reason; nothing is estimated.
* Keys: `demo` is shared (500 calls a day). A free key (100 calls a day once your email is verified):
  `NetNestClient.signup("you@company.com")`. Plans and pay per call: https://api.netnestdesign.com/docs#plans
* Errors raise `NetNestError` (`status`, `code`, `message`, `request_id`); 402 raises `PaymentRequiredError`, 429
  raises `RateLimitError` (`retry_after`).

Data from SEC filings. Not investment advice. MIT licensed client; use of the API is governed by its
[terms](https://api.netnestdesign.com/terms). NetNest Design LLC.
