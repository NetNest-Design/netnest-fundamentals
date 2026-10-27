// Response shapes of the NetNest Design Fundamentals API (https://api.netnestdesign.com/docs). Every value carries its
// source filing; a missing value is null with a reason, never an estimate.

export type Period = 'annual' | 'quarterly' | 'ttm';

export type Metric =
  | 'revenue'
  | 'net_income'
  | 'eps_basic'
  | 'eps_diluted'
  | 'operating_income'
  | 'total_assets'
  | 'total_liabilities'
  | 'equity'
  | 'cash'
  | 'operating_cash_flow'
  | 'capex'
  | 'free_cash_flow'
  | 'shares_outstanding'
  | 'revenue_contract';

export interface DerivationInput {
  concept: string;
  period_start: string | null;
  period_end: string;
  value: number;
  accession_number: string;
  form: string;
  filed_date: string;
}

export interface MetricValue {
  metric: Metric | string;
  value: number | null;
  unit: string;
  period_type: Period;
  period_start: string | null;
  period_end: string | null;
  fiscal_year: number | null;
  fiscal_period: string | null;
  form: string | null;
  filed_date: string | null;
  accession_number: string | null;
  source_url: string | null;
  concept: string | null;
  derived: boolean;
  derivation?: { formula: string; inputs: DerivationInput[] };
  /** Why the value is null, when it is. */
  reason?: string;
  stale?: boolean;
  restated?: boolean;
  [extra: string]: unknown;
}

export interface FilingRef {
  accn: string;
  form: string;
  filed: string;
  reportDate: string;
}

export interface Company {
  ticker: string;
  cik: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: number | null;
  sic_description: string | null;
  fiscal_year_end: string | null;
  last_10k: FilingRef | null;
  last_10q: FilingRef | null;
  stale: boolean;
  sec_filings_url: string;
  [extra: string]: unknown;
}

export interface Meta {
  source?: string;
  data_as_of?: string;
  disclaimer: string;
  docs?: string;
  [extra: string]: unknown;
}

export interface SearchResult {
  ticker: string;
  name: string;
  cik: number;
  exchange: string | null;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
  meta: Meta;
}

export interface CompanyResponse {
  company: Company;
  latest: { annual: MetricValue[]; quarterly: MetricValue[]; ttm: MetricValue[] };
  meta: Meta;
}

export interface FundamentalsResponse {
  company: Company;
  period: Period;
  data: MetricValue[];
  meta: Meta;
}

export interface HistoryResponse {
  company: Company;
  metric: string;
  period: Period;
  count: number;
  total_available: number;
  data: MetricValue[];
  notes?: string[];
  reason?: string;
  meta: Meta;
}

export interface SecEvent {
  id: string;
  type: string;
  name: string;
  form: string;
  filed: string;
  accepted_at: string;
  observed_at: string;
  accession: string;
  url: string;
  cik: number;
  ticker: string | null;
  cursor: string;
  fields: Record<string, unknown>;
  [extra: string]: unknown;
}

export interface EventsResponse {
  events: SecEvent[];
  count: number;
  /** Cursor for the next (older) page. */
  next: string | null;
  /** Pass as `since` on the next poll. */
  continue: string | null;
  head: string | null;
  meta: Meta;
}

export interface EventsHeadResponse {
  head: string | null;
  count: number;
  meta: Meta;
}

export interface SignupResponse {
  api_key: string;
  note: string;
  account: { email: string; plan: Record<string, unknown>; email_verified: boolean; daily_limit_until_verified?: number };
  quickstart: string;
  meta: Meta;
}
