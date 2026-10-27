import { NetNestError, PaymentRequiredError, RateLimitError } from './errors';
import type {
  CompanyResponse,
  EventsHeadResponse,
  EventsResponse,
  FundamentalsResponse,
  HistoryResponse,
  Metric,
  Period,
  SearchResponse,
  SignupResponse,
} from './types';

export const DEFAULT_BASE_URL = 'https://api.netnestdesign.com';
export const VERSION = '0.1.0';

export interface ClientOptions {
  /** An API key (POST /v1/signup), or "demo" to try it. Defaults to the NETNEST_API_KEY environment variable. */
  apiKey?: string;
  baseUrl?: string;
  /** A custom fetch, for example one wrapped by an x402 client so paid calls pay per call. */
  fetch?: typeof fetch;
  /** Per request timeout in milliseconds. Default 30000. */
  timeoutMs?: number;
}

export interface FundamentalsOptions {
  metrics?: Metric[] | string;
  period?: Period;
}

export interface HistoryOptions {
  period?: Period;
  /** 1 to 200. Default 20. */
  limit?: number;
}

export interface EventsOptions {
  since?: string;
  before?: string;
  types?: string[];
  tickers?: string[];
  /** 1 to 100. Default 100. */
  limit?: number;
}

type Query = Record<string, string | number | undefined>;

const envKey = (): string | undefined => {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return p?.env?.NETNEST_API_KEY || undefined;
};

export class NetNestClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? envKey();
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const f = options.fetch ?? globalThis.fetch;
    if (typeof f !== 'function') throw new Error('No fetch available: pass options.fetch');
    this.fetchImpl = f;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /** Find a company by name or ticker. Free, no key needed. */
  search(q: string, options: { limit?: number } = {}): Promise<SearchResponse> {
    return this.get('/v1/search', { q, limit: options.limit });
  }

  /** Profile and the latest annual, quarterly and trailing twelve month key metrics. */
  company(ticker: string): Promise<CompanyResponse> {
    return this.get(`/v1/company/${encodeURIComponent(ticker)}`);
  }

  /** Latest values of chosen metrics for one period type. */
  fundamentals(ticker: string, options: FundamentalsOptions = {}): Promise<FundamentalsResponse> {
    const metrics = Array.isArray(options.metrics) ? options.metrics.join(',') : options.metrics;
    return this.get(`/v1/fundamentals/${encodeURIComponent(ticker)}`, { metrics, period: options.period });
  }

  /** One metric over time, newest first. */
  history(ticker: string, metric: Metric | string, options: HistoryOptions = {}): Promise<HistoryResponse> {
    return this.get(`/v1/history/${encodeURIComponent(ticker)}/${encodeURIComponent(metric)}`, { period: options.period, limit: options.limit });
  }

  /** SEC filing events across companies, newest first: 8-K items, Form 4 insider transactions, 13D and 13G stakes. */
  events(options: EventsOptions = {}): Promise<EventsResponse> {
    return this.get('/v1/events', {
      since: options.since,
      before: options.before,
      types: options.types?.join(','),
      tickers: options.tickers?.join(','),
      limit: options.limit,
    });
  }

  /** The newest events cursor and how many events are newer than `since`. Free. */
  eventsHead(options: { since?: string } = {}): Promise<EventsHeadResponse> {
    return this.get('/v1/events/head', { since: options.since });
  }

  /** Create a free account. The key in the answer is shown once. */
  static async signup(email: string, options: Omit<ClientOptions, 'apiKey'> = {}): Promise<SignupResponse> {
    return new NetNestClient({ ...options, apiKey: undefined }).request('POST', '/v1/signup', {}, { email }, false);
  }

  private get<T>(path: string, query: Query = {}): Promise<T> {
    return this.request<T>('GET', path, query);
  }

  private async request<T>(method: string, path: string, query: Query, body?: unknown, auth = true): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': `netnest-fundamentals-js/${VERSION}` };
    if (auth && this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await this.fetchImpl(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const requestId = res.headers.get('x-request-id');
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (res.ok) {
      if (json === null) throw new NetNestError(res.status, 'invalid_response', 'The response was not JSON', requestId);
      return json as T;
    }
    const err = (json as { error?: Record<string, unknown> } | null)?.error ?? {};
    const { code: rawCode, message: rawMessage, ...details } = err;
    const code = typeof rawCode === 'string' ? rawCode : `http_${res.status}`;
    const message = typeof rawMessage === 'string' ? rawMessage : `HTTP ${res.status}`;
    if (res.status === 402) throw new PaymentRequiredError(code, message, requestId, details, res.headers.get('payment-required'));
    if (res.status === 429) {
      const ra = Number(res.headers.get('retry-after'));
      throw new RateLimitError(code, message, requestId, details, Number.isFinite(ra) && ra > 0 ? ra : null);
    }
    throw new NetNestError(res.status, code, message, requestId, details);
  }
}
