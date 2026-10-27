// Live smoke test against production with the public demo key (500 calls a day shared). Runs only with NETNEST_LIVE=1.
import { beforeEach, describe, expect, it } from 'vitest';
import { NetNestClient, RateLimitError } from '../src/index';

const live = process.env.NETNEST_LIVE === '1';
const c = new NetNestClient({ apiKey: process.env.NETNEST_API_KEY || 'demo' });
// The demo token allows 2 requests a second; pace the calls so the smoke never trips it.
const pause = () => new Promise((r) => setTimeout(r, 1500));
// Other callers share the demo token too, so a rate limit is retried after a pause.
async function retrying<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (e) {
      if (!(e instanceof RateLimitError) || attempt === 3) throw e;
      await pause();
    }
  }
}

describe.runIf(live)('production', () => {
  beforeEach(pause);
  it('search finds Apple', async () => {
    const r = await retrying(() => c.search('apple', { limit: 3 }));
    expect(r.results.some((x) => x.ticker === 'AAPL')).toBe(true);
  });
  it('company returns Apple with a sourced annual revenue', async () => {
    const r = await retrying(() => c.company('AAPL'));
    expect(r.company.cik).toBe(320193);
    const rev = r.latest.annual.find((m) => m.metric === 'revenue')!;
    expect(rev.value).toBeGreaterThan(0);
    expect(rev.accession_number).toMatch(/^\d{10}-\d{2}-\d{6}$/);
    expect(rev.source_url).toMatch(/^https:\/\/www\.sec\.gov\//);
  });
  it('fundamentals and history answer with source fields', async () => {
    const f = await retrying(() => c.fundamentals('MSFT', { metrics: ['revenue'], period: 'quarterly' }));
    expect(f.data[0].form).toMatch(/^10-[KQ]/);
    await pause();
    const h = await retrying(() => c.history('NVDA', 'revenue', { period: 'annual', limit: 2 }));
    expect(h.data).toHaveLength(2);
  });
  it('events head answers', async () => {
    const r = await retrying(() => c.eventsHead());
    expect(typeof r.count).toBe('number');
  });
});
