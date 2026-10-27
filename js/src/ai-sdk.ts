// Vercel AI SDK tools for the NetNest Design Fundamentals API. Each tool answers with the API's JSON, source filing on
// every value. Needs the optional peer dependencies `ai` and `zod`.
import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { NetNestClient, type ClientOptions } from './client';
import { NetNestError } from './errors';

const METRICS = [
  'revenue',
  'net_income',
  'eps_basic',
  'eps_diluted',
  'operating_income',
  'total_assets',
  'total_liabilities',
  'equity',
  'cash',
  'operating_cash_flow',
  'capex',
  'free_cash_flow',
  'shares_outstanding',
  'revenue_contract',
] as const;
const period = z.enum(['annual', 'quarterly', 'ttm']);
const ticker = z.string().min(1).max(16).describe('Stock ticker, for example AAPL or BRK.B');

// A refusal the model can read and act on (a bad ticker, a limit), instead of an exception that ends the turn.
async function call<T>(fn: () => Promise<T>): Promise<T | { error: { code: string; message: string; status: number } }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof NetNestError) return { error: { code: e.code, message: e.message, status: e.status } };
    throw e;
  }
}

/** The six tools, keyed by name. Declared with the public `Tool` type so the published types depend on `ai` alone. */
export interface NetNestTools {
  searchCompany: Tool;
  getCompany: Tool;
  getFundamentals: Tool;
  getHistory: Tool;
  getEvents: Tool;
  getEventsHead: Tool;
}

/**
 * All six tools, ready for generateText or streamText:
 *   const tools = netnestTools({ apiKey: process.env.NETNEST_API_KEY });
 */
export function netnestTools(options: ClientOptions | NetNestClient = {}): NetNestTools {
  const client = options instanceof NetNestClient ? options : new NetNestClient(options);
  return {
    searchCompany: tool({
      description: 'Find a company by name or ticker. Returns ticker, name, CIK and exchange.',
      inputSchema: z.object({ q: z.string().min(1).max(64).describe('Company name or ticker'), limit: z.number().int().min(1).max(25).optional() }),
      execute: ({ q, limit }) => call(() => client.search(q, { limit })),
    }),
    getCompany: tool({
      description: 'Company profile and its latest annual, quarterly and trailing twelve month key metrics from SEC filings, each with the filing it came from.',
      inputSchema: z.object({ ticker }),
      execute: ({ ticker }) => call(() => client.company(ticker)),
    }),
    getFundamentals: tool({
      description: 'Latest values of chosen metrics (revenue, net income, EPS, cash flow and more) for one period type, with the source filing, filing date and accession number for every value.',
      inputSchema: z.object({ ticker, metrics: z.array(z.enum(METRICS)).optional(), period: period.optional() }),
      execute: ({ ticker, metrics, period }) => call(() => client.fundamentals(ticker, { metrics, period })),
    }),
    getHistory: tool({
      description: 'One metric over time from SEC filings, newest first, up to 200 periods, each with its 10-K or 10-Q.',
      inputSchema: z.object({ ticker, metric: z.enum(METRICS), period: period.optional(), limit: z.number().int().min(1).max(200).optional() }),
      execute: ({ ticker, metric, period, limit }) => call(() => client.history(ticker, metric, { period, limit })),
    }),
    getEvents: tool({
      description: 'SEC filing events across companies, newest first: 8-K items by plain name, Form 4 insider transactions and Schedule 13D and 13G stakes.',
      inputSchema: z.object({
        since: z.string().optional().describe('Cursor from an earlier answer: only newer events'),
        tickers: z.array(z.string()).max(50).optional(),
        types: z.array(z.string()).max(20).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      execute: (input) => call(() => client.events(input)),
    }),
    getEventsHead: tool({
      description: 'The newest SEC events cursor and how many events are newer than a given cursor.',
      inputSchema: z.object({ since: z.string().optional() }),
      execute: ({ since }) => call(() => client.eventsHead({ since })),
    }),
  };
}
