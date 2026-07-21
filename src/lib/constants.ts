import { WatchlistItem } from "@/types";

// i18n key prefix for global indices
export const GLOBAL_INDICES_I18N = "indices" as const;

// Indices use ticker as identifier, name from i18n
export const GLOBAL_INDICES_TICKERS = [
  "^DJI",  // Dow Jones
  "^GSPC", // S&P 500
  "^IXIC", // NASDAQ
  "^SOX",  // Philadelphia Semiconductor
  "^TWII", // Taiwan Weighted
  "000001.SS", // SSE Composite
  "399001.SZ", // SZSE Component
  "^HSI",  // Hang Seng
  "^N225", // Nikkei 225
  "^KS11", // Korea KOSPI
  "^STI",  // Singapore STI
  "^GDAXI", // Germany DAX
  "^FCHI", // France CAC 40
  "^FTSE", // UK FTSE 100
] as const;

export const DEFAULT_WATCHLISTS: Record<string, WatchlistItem[]> = {
  "Global Indices": GLOBAL_INDICES_TICKERS.map((ticker) => ({
    label: ticker.replace("^", ""),
    ticker,
    name: `indices.${ticker}`,
  })),
  "Tech ETF": [
    { label: "QQQ", ticker: "QQQ", name: "indices.QQQ" },
    { label: "VGT", ticker: "VGT", name: "indices.VGT" },
  ],
};

export const COMMON_TICKERS: WatchlistItem[] = [
  // US Indices
  { label: "^DJI", ticker: "^DJI", name: "indices.^DJI" },
  { label: "^GSPC", ticker: "^GSPC", name: "indices.^GSPC" },
  { label: "^IXIC", ticker: "^IXIC", name: "indices.^IXIC" },
  { label: "^SOX", ticker: "^SOX", name: "indices.^SOX" },
  // Asia Indices
  { label: "^TWSE", ticker: "^TWSE", name: "indices.^TWSE" },
  { label: "000001.SS", ticker: "000001.SS", name: "indices.000001.SS" },
  { label: "399001.SZ", ticker: "399001.SZ", name: "indices.399001.SZ" },
  { label: "^HSI", ticker: "^HSI", name: "indices.^HSI" },
  { label: "^N225", ticker: "^N225", name: "indices.^N225" },
  { label: "^KS11", ticker: "^KS11", name: "indices.^KS11" },
  { label: "^STI", ticker: "^STI", name: "indices.^STI" },
  // Europe Indices
  { label: "^GDAXI", ticker: "^GDAXI", name: "indices.^GDAXI" },
  { label: "^FCHI", ticker: "^FCHI", name: "indices.^FCHI" },
  { label: "^FTSE", ticker: "^FTSE", name: "indices.^FTSE" },
  // Tech ETFs
  { label: "QQQ", ticker: "QQQ", name: "indices.QQQ" },
  { label: "VGT", ticker: "VGT", name: "indices.VGT" },
  // US Stocks - these keep static names
  { label: "AAPL", ticker: "AAPL", name: "Apple" },
  { label: "MSFT", ticker: "MSFT", name: "Microsoft" },
  { label: "GOOGL", ticker: "GOOGL", name: "Alphabet" },
  { label: "AMZN", ticker: "AMZN", name: "Amazon" },
  { label: "NVDA", ticker: "NVDA", name: "NVIDIA" },
  { label: "META", ticker: "META", name: "Meta" },
  { label: "TSLA", ticker: "TSLA", name: "Tesla" },
  { label: "JPM", ticker: "JPM", name: "JPMorgan" },
  { label: "V", ticker: "V", name: "Visa" },
  { label: "PG", ticker: "PG", name: "Procter & Gamble" },
  // Asian Stocks - these keep static names
  { label: "2330.TW", ticker: "2330.TW", name: "台積電 TSMC" },
  { label: "0700.HK", ticker: "0700.HK", name: "騰訊控股" },
  { label: "601318.SS", ticker: "601318.SS", name: "中國平安" },
  // Crypto & Commodities - keep static names
  { label: "BTC", ticker: "BTC-USD", name: "Bitcoin" },
  { label: "ETH", ticker: "ETH-USD", name: "Ethereum" },
  { label: "GC=F", ticker: "GC=F", name: "Gold Futures" },
  { label: "CL=F", ticker: "CL=F", name: "Crude Oil" },
];

export const LANGUAGES = [
  { code: "zh-TW", name: "繁體中文", nativeName: "繁體中文" },
  { code: "zh-CN", name: "简体中文", nativeName: "简体中文" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "日本語", nativeName: "日本語" },
  { code: "ko", name: "한국어", nativeName: "한국어" },
  { code: "es", name: "Español", nativeName: "Español" },
] as const;

export const STORAGE_KEY = "ywatchlist_data";

export const ZOOM_LEVELS = [75, 87.5, 100, 112.5, 125] as const;

export const FONT_FAMILIES = [
  { code: "system", name: "系統預設", css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { code: "noto", name: "思源黑體 (Noto)", css: "'Noto Sans TC', 'Noto Sans SC', sans-serif" },
  { code: "microsoft", name: "微軟正黑體", css: "'Microsoft JhengHei', 'Microsoft YaHei', 'PingFang SC', sans-serif" },
  { code: "arial", name: "Arial", css: "Arial, Helvetica, sans-serif" },
  { code: "segoe", name: "Segoe UI", css: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  { code: "cambria", name: "Cambria", css: "Cambria, 'Times New Roman', Cochin, serif" },
  { code: "verdana", name: "Verdana", css: "Verdana, Geneva, sans-serif" },
  { code: "tahoma", name: "Tahoma", css: "Tahoma, Verdana, sans-serif" },
  { code: "kai", name: "標楷體", css: "KaiTi, '標楷體', 'BiauKai', serif" },
  { code: "ming", name: "細明體", css: "'MingLiU', 'PMingLiU', '細明體', '細明體_MingLiU', serif" },
  { code: "song", name: "新細明體", css: "'SimSun', '宋体', serif" },
  { code: "courier", name: "Courier New", css: "'Courier New', Courier, monospace" },
  { code: "consolas", name: "Consolas", css: "Consolas, 'Courier New', monospace" },
] as const;