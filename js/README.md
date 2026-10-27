# netnest-fundamentals

TypeScript client for the [NetNest Design Fundamentals API](https://api.netnestdesign.com/docs): company fundamentals
and SEC filing events, with the source filing on every number. No dependencies; Node 18 or later, browsers, edge.

```bash
npm install netnest-fundamentals
```

```ts
import { NetNestClient } from 'netnest-fundamentals';

const nn = new NetNestClient({ apiKey: 'demo' }); // or your key; defaults to NETNEST_API_KEY
const { data } = await nn.fundamentals('MSFT', { metrics: ['revenue', 'net_income'], period: 'quarterly' });
for (const v of data) console.log(v.metric, v.value, v.period_end, v.form, v.source_url);
```

## Vercel AI SDK

```ts
import { generateText } from 'ai';
import { netnestTools } from 'netnest-fundamentals/ai-sdk';

const { text } = await generateText({ model, tools: netnestTools({ apiKey: process.env.NETNEST_API_KEY }), prompt: "What was Apple's revenue last quarter?" });
```

Six tools: `searchCompany`, `getCompany`, `getFundamentals`, `getHistory`, `getEvents`, `getEventsHead`. Needs `ai`
and `zod` installed (tested with `ai` 7.0.155 and `zod` 4.6.7). An API refusal comes back as `{ error }` for the model to read.

## Notes

* Methods: `search`, `company`, `fundamentals`, `history`, `events`, `eventsHead`, and `NetNestClient.signup(email)`.
* Every value carries its form, filing date, accession number, SEC link and XBRL concept. A missing value is `null`
  with a reason; nothing is estimated.
* Keys: `demo` is shared (500 calls a day). A free key (100 calls a day once your email is verified) comes from
  `NetNestClient.signup('you@company.com')`. Plans and pay per call: https://api.netnestdesign.com/docs#plans
* Pay per call with x402 instead of a key: pass an x402 wrapped `fetch` as `options.fetch` and no key.
* Errors throw `NetNestError` (`status`, `code`, `requestId`); 402 throws `PaymentRequiredError`, 429 throws
  `RateLimitError` (`retryAfter`).

Data from SEC filings. Not investment advice. MIT licensed client; use of the API is governed by its
[terms](https://api.netnestdesign.com/terms). NetNest Design LLC.
