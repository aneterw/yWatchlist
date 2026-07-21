import type { PriceData, FundamentalData } from "@/types";

// Realistic mock prices for common indices
const MOCK_PRICES: Record<string, { price: number; change: number }> = {
  "^GSPC": { price: 5427.64, change: 15.29 },
  "^IXIC": { price: 17689.36, change: 52.76 },
  "^DJI": { price: 39127.80, change: -45.23 },
  "^FTSE": { price: 8228.50, change: 12.35 },
  "^GDAXI": { price: 18492.35, change: 25.67 },
  "^N225": { price: 39500.50, change: -120.35 },
  "000001.SS": { price: 2974.12, change: 8.45 },
  "^HSI": { price: 17201.27, change: -89.50 },
  "^KS11": { price: 2850.36, change: 15.23 },
  "^AXJO": { price: 7912.45, change: 22.18 },
  "QQQ": { price: 458.32, change: 2.15 },
  "VGT": { price: 521.45, change: 3.28 },
  "AAPL": { price: 178.50, change: 1.25 },
  "MSFT": { price: 378.25, change: 2.50 },
  "GOOGL": { price: 141.80, change: 0.95 },
  "AMZN": { price: 178.25, change: 1.80 },
  "NVDA": { price: 875.35, change: 12.50 },
  "META": { price: 505.75, change: 5.25 },
  "TSLA": { price: 245.30, change: -3.20 },
  "JPM": { price: 198.45, change: 1.15 },
  "V": { price: 275.60, change: 0.85 },
  "PG": { price: 162.30, change: 0.45 },
  "2330.TW": { price: 875.00, change: 15.50 },
  "0700.HK": { price: 298.00, change: -2.50 },
  "BTC-USD": { price: 62500.00, change: 850.00 },
  "ETH-USD": { price: 3420.00, change: 45.00 },
  "GC=F": { price: 2015.30, change: 5.80 },
  "CL=F": { price: 78.45, change: -0.35 },
};

export function generateMockPriceData(tickers: string[]): Record<string, PriceData> {
  const result: Record<string, PriceData> = {};

  tickers.forEach((ticker) => {
    const mockData = MOCK_PRICES[ticker];
    const isIndex = ticker.startsWith("^") || ticker.includes(".SS") || ticker.includes(".HK");

    if (mockData) {
      result[ticker] = {
        ticker,
        name: ticker,
        price: mockData.price,
        change: mockData.change,
        pct_change: (mockData.change / mockData.price) * 100,
        volume: isIndex ? Math.floor(Math.random() * 5000000000) : Math.floor(Math.random() * 50000000),
        market_cap: isIndex ? null : Math.floor(mockData.price * Math.random() * 1000000000),
      };
    } else {
      // Generate random but realistic price
      const basePrice = Math.random() * 500 + 10;
      const change = (Math.random() - 0.5) * 10;
      result[ticker] = {
        ticker,
        name: ticker,
        price: Math.round(basePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        pct_change: Math.round((change / basePrice) * 10000) / 100,
        volume: Math.floor(Math.random() * 50000000),
        market_cap: Math.floor(basePrice * Math.random() * 500000000),
      };
    }
  });

  return result;
}

// Fetch prices from backend (Tauri), fallback to mock
export async function fetchPrices(tickers: string[]): Promise<PriceData[]> {
  if (tickers.length === 0) return [];

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<PriceData[]>("fetch_prices", { tickers });
    if (result && result.length > 0) {
      return result;
    }
  } catch (error) {
    console.log("Backend not available, using mock data");
  }

  // Fallback to mock data
  const mockData = generateMockPriceData(tickers);
  return Object.values(mockData);
}

// Search tickers
export async function searchTickers(query: string, limit: number = 20) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<{ display: string; symbol: string; name: string }[]>("search_tickers", { query, limit });
    return result;
  } catch {
    // Fallback to local search
    const { COMMON_TICKERS } = await import("@/lib/constants");
    const q = query.toLowerCase();
    return COMMON_TICKERS
      .filter((t) => t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      .slice(0, limit)
      .map((t) => ({ display: `${t.ticker} - ${t.name}`, symbol: t.ticker, name: t.name }));
  }
}

// Load watchlist data
export async function loadWatchlistData() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("load_watchlist_data");
  } catch {
    return null;
  }
}

// Save watchlist data
export async function saveWatchlistData(data: unknown): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("save_watchlist_data", { data: JSON.stringify(data) });
  } catch {
    return false;
  }
}

// Get chart data
export async function getChartData(ticker: string, period: string = "1d"): Promise<unknown[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<unknown[]>("get_chart_data", { ticker, period });
    if (!Array.isArray(result)) {
      console.warn("[getChartData] unexpected non-array result for", ticker);
      return [];
    }
    return result;
  } catch (error) {
    console.error("[getChartData] failed for", ticker, "period:", period, error);
    return [];
  }
}

// Get fundamental data
export async function getFundamentalData(ticker: string): Promise<FundamentalData | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<FundamentalData>("get_fundamental", { ticker });
    if (!result || result.error) {
      console.warn("[getFundamentalData] error for", ticker, result?.error);
      return null;
    }
    return result;
  } catch (error) {
    console.error("[getFundamentalData] failed for", ticker, error);
    return null;
  }
}

// News item interface
export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  pub_date: string;
}

// Get news for a ticker
export async function getStockNews(ticker: string): Promise<NewsItem[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<NewsItem[]>("get_news", { ticker });
    if (!Array.isArray(result)) {
      console.warn("[getStockNews] unexpected result for", ticker);
      return [];
    }
    return result;
  } catch (error) {
    console.error("[getStockNews] failed for", ticker, error);
    return [];
  }
}