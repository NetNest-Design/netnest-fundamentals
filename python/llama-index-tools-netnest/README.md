# llama-index-tools-netnest

LlamaIndex tools for the [NetNest Design Fundamentals API](https://api.netnestdesign.com/docs): company fundamentals
and SEC filing events, with the source filing on every number.

```bash
pip install llama-index-tools-netnest
```

```python
from llama_index.tools.netnest import NetNestToolSpec

tools = NetNestToolSpec(api_key="demo").to_tool_list()  # or your key; defaults to NETNEST_API_KEY
# give tools to FunctionAgent(tools=tools, llm=...)
```

* Tools: `search_company`, `get_company`, `get_fundamentals`, `get_history`, `get_events`, `get_events_head`. Each
  returns the API's JSON as a string.
* An API refusal (unknown ticker, a limit) comes back as `{"error": {...}}` for the agent to read, not an exception.

Data from SEC filings. Not investment advice. MIT licensed; use of the API is governed by its
[terms](https://api.netnestdesign.com/terms). NetNest Design LLC.
