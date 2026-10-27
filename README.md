# NetNest Design Fundamentals: client packages

Clients for the [NetNest Design Fundamentals API](https://api.netnestdesign.com/docs): company fundamentals and SEC
filing events, with the source filing on every number.

| Package | Install | For |
|---|---|---|
| [`netnest-fundamentals`](js) (npm) | `npm install netnest-fundamentals` | TypeScript and JavaScript, plus Vercel AI SDK tools (`netnest-fundamentals/ai-sdk`) |
| [`netnest-fundamentals`](python/netnest-fundamentals) (PyPI) | `pip install netnest-fundamentals` | Python |
| [`langchain-netnest`](python/langchain-netnest) (PyPI) | `pip install langchain-netnest` | LangChain tools |
| [`llama-index-tools-netnest`](python/llama-index-tools-netnest) (PyPI) | `pip install llama-index-tools-netnest` | LlamaIndex tools |

Try any of them with the shared key `demo` (500 calls a day). A free key: `POST https://api.netnestdesign.com/v1/signup`
with `{"email": "you@company.com"}`. MCP clients can also connect directly to `https://api.netnestdesign.com/mcp`.

Releases publish from `.github/workflows/release.yml` on a `v*` tag through trusted publishing; no publish token is
stored anywhere.

Data from SEC filings. Not investment advice. The client code is MIT licensed; use of the API is governed by its
[terms](https://api.netnestdesign.com/terms). NetNest Design LLC.
