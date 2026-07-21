export interface WatchlistItem {
  label: string;
  ticker: string;
  name: string;
}

export interface Watchlist {
  name: string;
  items: WatchlistItem[];
}

export interface PriceData {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  pct_change: number | null;
  volume: number | null;
  market_cap: number | null;
}

export interface ChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AlertConfig {
  high?: number;
  low?: number;
  high_triggered?: boolean;
  low_triggered?: boolean;
}

export type Theme = "light" | "dark" | "ocean" | "forest" | "sunset" | "neon" | "elegant" | "frosted-purple" | "frosted-blue" | "frosted-cyan";
export type ZoomLevel = 75 | 87.5 | 100 | 112.5 | 125;
export type Language = "zh-TW" | "zh-CN" | "en" | "ja" | "ko" | "es";

export interface TickerSearchResult {
  display: string;
  symbol: string;
  name: string;
}

export interface AppState {
  watchlists: Record<string, WatchlistItem[]>;
  activeWatchlist: string | null;
  priceData: Record<string, PriceData>;
  theme: Theme;
  language: Language;
  alerts: Record<string, AlertConfig>;
}

export interface ChartPeriod {
  label: string;
  value: "1d" | "1wk" | "1mo";
}

export interface FundamentalData {
  // Company Info
  ticker: string;
  company_name: string;
  current_price: string | null;
  price_change: string | null;
  price_pct: string | null;
  sector: string | null;
  industry: string | null;
  // Stock Info Card
  prev_close: string | null;
  today_high: string | null;
  today_low: string | null;
  volume: string | null;
  // Valuation
  market_cap: string | null;
  trailing_pe: string | null;
  forward_pe: string | null;
  peg: string | null;
  price_to_book: string | null;
  ev_ebitda: string | null;
  // Profitability
  eps: string | null;
  roe: string | null;
  roa: string | null;
  roic: string | null;
  op_margin: string | null;
  profit_margin: string | null;
  // Yield & Risk
  dividend_yield: string | null;
  beta: string | null;
  fcf_yield: string | null;
  quick_ratio: string | null;
  short_pct: string | null;
  // Analyst & Holdings
  target_mean: string | null;
  target_median: string | null;
  analyst_count: string | null;
  rec_mean: string | null;
  insider_pct: string | null;
  inst_pct: string | null;
  // 52W Range
  "52w_high": string | null;
  "52w_low": string | null;
  range_position: string | null;
  // Cash Flow
  fcf: string | null;
  op_cashflow: string | null;
  fcf_coverage: string | null;
  // Growth
  total_revenue: string | null;
  total_liabilities: string | null;
  total_cash: string | null;
  earnings_growth: string | null;
  revenue_growth: string | null;
  // Error
  error?: string | null;
}

export interface FundamentalCategory {
  id: string;
  title: string;
  metrics: Array<{
    key: keyof FundamentalData;
    label: string;
  }>;
}

export const FUNDAMENTAL_CATEGORIES: FundamentalCategory[] = [
  {
    id: "valuation",
    title: "fundamenta.valuation",
    metrics: [
      { key: "market_cap", label: "fundamenta.market_cap" },
      { key: "trailing_pe", label: "fundamenta.trailing_pe" },
      { key: "forward_pe", label: "fundamenta.forward_pe" },
      { key: "peg", label: "fundamenta.peg" },
      { key: "price_to_book", label: "fundamenta.price_to_book" },
      { key: "ev_ebitda", label: "fundamenta.ev_ebitda" },
    ],
  },
  {
    id: "profitability",
    title: "fundamenta.profitability",
    metrics: [
      { key: "eps", label: "fundamenta.eps" },
      { key: "roe", label: "fundamenta.roe" },
      { key: "roa", label: "fundamenta.roa" },
      { key: "roic", label: "fundamenta.roic" },
      { key: "op_margin", label: "fundamenta.op_margin" },
      { key: "profit_margin", label: "fundamenta.profit_margin" },
    ],
  },
  {
    id: "yield_risk",
    title: "fundamenta.yield_risk",
    metrics: [
      { key: "dividend_yield", label: "fundamenta.dividend_yield" },
      { key: "beta", label: "fundamenta.beta" },
      { key: "fcf_yield", label: "fundamenta.fcf_yield" },
      { key: "quick_ratio", label: "fundamenta.quick_ratio" },
      { key: "short_pct", label: "fundamenta.short_pct" },
    ],
  },
  {
    id: "analyst",
    title: "fundamenta.analyst",
    metrics: [
      { key: "target_mean", label: "fundamenta.target_mean" },
      { key: "target_median", label: "fundamenta.target_median" },
      { key: "analyst_count", label: "fundamenta.analyst_count" },
      { key: "rec_mean", label: "fundamenta.rec_mean" },
      { key: "insider_pct", label: "fundamenta.insider_pct" },
      { key: "inst_pct", label: "fundamenta.inst_pct" },
    ],
  },
  {
    id: "range52w",
    title: "fundamenta.range52w",
    metrics: [
      { key: "52w_high", label: "fundamenta.52w_high" },
      { key: "52w_low", label: "fundamenta.52w_low" },
      { key: "range_position", label: "fundamenta.range_position" },
    ],
  },
  {
    id: "cashflow",
    title: "fundamenta.cashflow",
    metrics: [
      { key: "fcf", label: "fundamenta.fcf" },
      { key: "op_cashflow", label: "fundamenta.op_cashflow" },
      { key: "fcf_coverage", label: "fundamenta.fcf_coverage" },
    ],
  },
  {
    id: "growth",
    title: "fundamenta.growth",
    metrics: [
      { key: "total_revenue", label: "fundamenta.total_revenue" },
      { key: "total_liabilities", label: "fundamenta.total_liabilities" },
      { key: "total_cash", label: "fundamenta.total_cash" },
      { key: "earnings_growth", label: "fundamenta.earnings_growth" },
      { key: "revenue_growth", label: "fundamenta.revenue_growth" },
    ],
  },
];

export const CHART_PERIODS: ChartPeriod[] = [
  { label: "日線", value: "1d" },
  { label: "週線", value: "1wk" },
  { label: "月線", value: "1mo" },
];