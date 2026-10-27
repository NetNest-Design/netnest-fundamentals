# langchain-netnest

LangChain tools for the [NetNest Design Fundamentals API](https://api.netnestdesign.com/docs): company fundamentals
and SEC filing events, with the source filing on every number.

```bash
pip install langchain-netnest
```

```python
from langchain_netnest import NetNestToolkit
from netnest_fundamentals import NetNestClient

tools = NetNestToolkit(client=NetNestClient("demo")).get_tools()  # or your key; defaults to NETNEST_API_KEY
# give tools to create_agent(model, tools) or any tool calling model
```

* Tools: `netnest_search_company`, `netnest_get_company`, `netnest_get_fundamentals`, `netnest_get_history`,
  `netnest_get_events`, `netnest_get_events_head`. Each returns the API's JSON as a string.
* An API refusal (unknown ticker, a limit) comes back as `{"error": {...}}` for the model to read, not an exception.
* Each tool is also importable on its own, for example `NetNestFundamentals(client=...)`.

Data from SEC filings. Not investment advice. MIT licensed; use of the API is governed by its
[terms](https://api.netnestdesign.com/terms). NetNest Design LLC.
