import { useState, useEffect, useMemo } from "react";

export interface TickerInfo {
  display: string; // "公司名稱 - 000001.SZ"
  symbol: string;  // "000001.SZ"
  name: string;    // "公司名稱"
  exchange?: string;
}

export interface OverrideItem {
  ticker: string;
  name: string;
}

const TICKER_CACHE_KEY = "ywatchlist_ticker_cache";
const OVERRIDE_STORAGE_KEY = "ywatchlist_index_overrides";

interface CachedTickers {
  tickers: TickerInfo[];
  loaded: boolean;
}

// Load tickers from public JSON file
async function loadTickerIndex(): Promise<TickerInfo[]> {
  try {
    const response = await fetch("/top250_tickers.json");
    if (!response.ok) {
      throw new Error("Failed to load ticker index");
    }
    const data = await response.json();

    if (data.tickers && Array.isArray(data.tickers)) {
      // Convert array format [display, symbol, name] to TickerInfo objects
      return data.tickers.map((item: [string, string, string]): TickerInfo => {
        const [display, symbol, name] = item;
        // Extract exchange from symbol
        let exchange: string | undefined;
        if (symbol.endsWith(".SS")) exchange = "上海";
        else if (symbol.endsWith(".SZ")) exchange = "深圳";
        else if (symbol.endsWith(".HK")) exchange = "港股";
        else if (symbol.endsWith(".TW")) exchange = "台股";

        return { display, symbol, name, exchange };
      });
    }
    return [];
  } catch (error) {
    console.error("Failed to load ticker index:", error);
    return [];
  }
}

// Load user overrides from localStorage
export function loadOverrides(): OverrideItem[] {
  try {
    const saved = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    console.error("Failed to load overrides");
  }
  return [];
}

// Save user overrides to localStorage
export function saveOverrides(overrides: OverrideItem[]): void {
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

// Convert overrides to TickerInfo format for searching
export function overridesToTickerInfo(overrides: OverrideItem[]): TickerInfo[] {
  return overrides.map(o => ({
    display: `${o.name} - ${o.ticker}`,
    symbol: o.ticker,
    name: o.name,
  }));
}

// Fuzzy search helper - matches query against text, returns score (higher = better match)
function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact match
  if (t === q) return 100;

  // Starts with query
  if (t.startsWith(q)) return 80;

  // Contains query as substring
  if (t.includes(q)) return 60;

  // Check if all query chars exist in order
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 40;

  return 0;
}

// Search tickers by query
export function searchLocalTickers(tickers: TickerInfo[], query: string, limit: number = 50): TickerInfo[] {
  if (!query || query.length < 1) return [];

  const q = query.trim().toLowerCase();

  // Score each ticker
  const scored = tickers.map(ticker => {
    let score = 0;

    // Symbol exact match gets highest priority
    if (ticker.symbol.toLowerCase() === q) {
      score = 200;
    } else if (ticker.symbol.toLowerCase().startsWith(q)) {
      score = 150;
    } else if (ticker.symbol.toLowerCase().includes(q)) {
      score = 100;
    }

    // Also consider name matches
    const nameScore = fuzzyMatch(q, ticker.name);
    if (nameScore > score) score = nameScore;

    // Consider display string
    const displayScore = fuzzyMatch(q, ticker.display) / 2;
    if (displayScore > score) score = displayScore;

    return { ticker, score };
  });

  // Filter out zero-score and sort by score descending
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.ticker);
}

// Hook to manage ticker index
export function useTickerIndex() {
  const [tickers, setTickers] = useState<TickerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Check session cache first
        const cached = sessionStorage.getItem(TICKER_CACHE_KEY);
        if (cached) {
          const data: CachedTickers = JSON.parse(cached);
          setTickers(data.tickers);
          setLoading(false);
          return;
        }

        // Load from file
        const loaded = await loadTickerIndex();
        setTickers(loaded);

        // Cache for session
        sessionStorage.setItem(TICKER_CACHE_KEY, JSON.stringify({ tickers: loaded, loaded: true }));
      } catch (error) {
        console.error("Failed to load ticker index:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { tickers, loading };
}

// Hook to search tickers with debounce
export function useTickerSearch(tickers: TickerInfo[], query: string, limit: number = 50) {
  return useMemo(() => {
    return searchLocalTickers(tickers, query, limit);
  }, [tickers, query, limit]);
}

// Search tickers with override priority: overrides first, then local tickers
// Returns array with source info: { ticker, name, source: 'override' | 'local' }
export interface SearchResultItem {
  ticker: TickerInfo;
  source: 'override' | 'local';
  // Merged name (override takes precedence if same ticker)
  displayName: string;
}

export function searchTickersWithOverrides(
  overrides: OverrideItem[],
  localTickers: TickerInfo[],
  query: string,
  limit: number = 30
): SearchResultItem[] {
  if (!query || query.length < 1) return [];

  const q = query.trim().toLowerCase();
  const overrideMap = new Map(overrides.map(o => [o.ticker.toUpperCase(), o.name]));

  // Helper to score a ticker
  const scoreTicker = (t: TickerInfo, isOverride: boolean): number => {
    const upper = t.symbol.toUpperCase();
    const name = isOverride ? overrideMap.get(upper) || t.name : t.name;
    const nameLower = name.toLowerCase();
    let score = isOverride ? 1000 : 0; // Override bonus

    // Symbol exact match
    if (upper === q) score += 500;
    else if (upper.startsWith(q)) score += 200;
    else if (upper.includes(q)) score += 100;

    // Name match
    if (nameLower === q) score += 300;
    else if (nameLower.startsWith(q)) score += 150;
    else if (nameLower.includes(q)) score += 50;

    return score;
  };

  // Collect all items with scores
  const allItems: Array<{ ticker: TickerInfo; source: 'override' | 'local'; score: number }> = [];

  // 1. Add overrides first (higher priority)
  for (const override of overrides) {
    const ticker: TickerInfo = {
      display: `${override.name} - ${override.ticker}`,
      symbol: override.ticker,
      name: override.name,
    };
    allItems.push({
      ticker,
      source: 'override',
      score: scoreTicker(ticker, true),
    });
  }

  // 2. Add local tickers (lower priority)
  for (const ticker of localTickers) {
    allItems.push({
      ticker,
      source: 'local',
      score: scoreTicker(ticker, false),
    });
  }

  // Filter, sort, dedup, and limit
  const seen = new Set<string>();
  const results: SearchResultItem[] = [];

  for (const item of allItems) {
    if (item.score <= 0) continue;
    const upper = item.ticker.symbol.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);

    results.push({
      ticker: item.ticker,
      source: item.source,
      displayName: overrideMap.get(upper) || item.ticker.name,
    });

    if (results.length >= limit) break;
  }

  return results;
}