import { describe, expect, it } from 'vitest';
import { netnestTools } from '../src/ai-sdk';
import { NetNestClient } from '../src/index';

const opts = { toolCallId: 't1', messages: [] } as never;

describe('netnestTools', () => {
  it('exposes the six tools with descriptions and input schemas', () => {
    const tools = netnestTools({ apiKey: 'k', fetch: (async () => new Response('{}')) as never });
    expect(Object.keys(tools).sort()).toEqual(['getCompany', 'getEvents', 'getEventsHead', 'getFundamentals', 'getHistory', 'searchCompany']);
    for (const t of Object.values(tools)) {
      expect(t.description?.length).toBeGreaterThan(20);
      expect(t.inputSchema).toBeDefined();
    }
  });

  it('runs the client call and returns the API JSON', async () => {
    const urls: string[] = [];
    const fetch = (async (u: string) => (urls.push(u), new Response(JSON.stringify({ data: [1] }), { status: 200 }))) as never;
    const tools = netnestTools(new NetNestClient({ apiKey: 'k', fetch }));
    const out = await tools.getFundamentals.execute!({ ticker: 'AAPL', metrics: ['revenue'], period: 'ttm' }, opts);
    expect(out).toEqual({ data: [1] });
    expect(urls[0]).toContain('/v1/fundamentals/AAPL?metrics=revenue&period=ttm');
  });

  it('turns an API refusal into a readable result instead of throwing', async () => {
    const fetch = (async () => new Response(JSON.stringify({ error: { code: 'unknown_ticker', message: 'Ticker not found' } }), { status: 404 })) as never;
    const out = await netnestTools({ apiKey: 'k', fetch }).getCompany.execute!({ ticker: 'NOPE' }, opts);
    expect(out).toEqual({ error: { code: 'unknown_ticker', message: 'Ticker not found', status: 404 } });
  });
});
