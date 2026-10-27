import { describe, expect, it } from 'vitest';
import { NetNestClient, NetNestError, PaymentRequiredError, RateLimitError } from '../src/index';

type Call = { url: string; init: RequestInit };
function mock(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

describe('NetNestClient', () => {
  it('builds each request with the bearer key, the path and only the given query fields', async () => {
    const m = mock(200, { ok: true });
    const c = new NetNestClient({ apiKey: 'nnf_test', fetch: m.fetch, baseUrl: 'https://api.example.test/' });
    await c.search('apple', { limit: 3 });
    await c.company('BRK.B');
    await c.fundamentals('MSFT', { metrics: ['revenue', 'net_income'], period: 'quarterly' });
    await c.history('NVDA', 'revenue', { period: 'annual', limit: 5 });
    await c.events({ tickers: ['AAPL', 'MSFT'], types: ['8k_item_5_02'], limit: 10 });
    await c.eventsHead({ since: 'abcdefgh' });
    expect(m.calls.map((x) => x.url)).toEqual([
      'https://api.example.test/v1/search?q=apple&limit=3',
      'https://api.example.test/v1/company/BRK.B',
      'https://api.example.test/v1/fundamentals/MSFT?metrics=revenue%2Cnet_income&period=quarterly',
      'https://api.example.test/v1/history/NVDA/revenue?period=annual&limit=5',
      'https://api.example.test/v1/events?types=8k_item_5_02&tickers=AAPL%2CMSFT&limit=10',
      'https://api.example.test/v1/events/head?since=abcdefgh',
    ]);
    const h = m.calls[0].init.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer nnf_test');
    expect(h['User-Agent']).toMatch(/^netnest-fundamentals-js\//);
  });

  it('sends no Authorization header without a key, so x402 or the free routes apply', async () => {
    const m = mock(200, { ok: true });
    await new NetNestClient({ apiKey: '', fetch: m.fetch }).search('apple');
    expect((m.calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('maps the error envelope to NetNestError with status, code, request id and extra fields', async () => {
    const m = mock(422, { error: { code: 'no_data', message: 'No XBRL data', ticker: 'ZZZ', cik: 1 } }, { 'x-request-id': 'req_1' });
    const e = await new NetNestClient({ apiKey: 'k', fetch: m.fetch }).company('ZZZ').catch((x) => x);
    expect(e).toBeInstanceOf(NetNestError);
    expect([e.status, e.code, e.message, e.requestId]).toEqual([422, 'no_data', 'No XBRL data', 'req_1']);
    expect(e.details).toEqual({ ticker: 'ZZZ', cik: 1 });
  });

  it('a 402 is a PaymentRequiredError carrying the PAYMENT-REQUIRED header', async () => {
    const m = mock(402, { error: { code: 'payment_required', message: 'Pay or use a key' } }, { 'payment-required': 'eyJ4NDAy' });
    const e = await new NetNestClient({ apiKey: '', fetch: m.fetch }).company('AAPL').catch((x) => x);
    expect(e).toBeInstanceOf(PaymentRequiredError);
    expect([e.status, e.paymentRequired]).toEqual([402, 'eyJ4NDAy']);
  });

  it('a 429 is a RateLimitError with Retry-After in seconds', async () => {
    const m = mock(429, { error: { code: 'rate_limited', message: 'Slow down' } }, { 'retry-after': '60' });
    const e = await new NetNestClient({ apiKey: 'k', fetch: m.fetch }).search('a').catch((x) => x);
    expect(e).toBeInstanceOf(RateLimitError);
    expect(e.retryAfter).toBe(60);
  });

  it('a non JSON error still becomes a NetNestError', async () => {
    const m = mock(503, '<html>busy</html>');
    const e = await new NetNestClient({ apiKey: 'k', fetch: m.fetch }).search('a').catch((x) => x);
    expect([e.status, e.code]).toEqual([503, 'http_503']);
  });

  it('signup posts the email without any key', async () => {
    const m = mock(201, { api_key: 'nnf_new' });
    const r = await NetNestClient.signup('you@example.test', { fetch: m.fetch });
    expect(r.api_key).toBe('nnf_new');
    expect(m.calls[0].init.method).toBe('POST');
    expect(m.calls[0].init.body).toBe(JSON.stringify({ email: 'you@example.test' }));
    expect((m.calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
