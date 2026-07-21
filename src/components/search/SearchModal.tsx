import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Command } from "cmdk";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { COMMON_TICKERS } from "@/lib/constants";
import { searchTickers } from "@/lib/tauri";
import {
  useTickerIndex,
  loadOverrides,
  searchTickersWithOverrides,
  type OverrideItem,
  type SearchResultItem
} from "@/hooks/useTickerIndex";
import { isI18nKey } from "@/lib/i18nUtils";
import type { WatchlistItem } from "@/types";
import { Search, Plus } from "lucide-react";

const OVERRIDE_STORAGE_KEY = "ywatchlist_index_overrides";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTicker: (ticker: WatchlistItem) => void;
}

interface YahooSearchResult {
  display: string;
  symbol: string;
  name: string;
  exchange?: string;
  quote_type?: string;
}

// Component to add Yahoo search result to overrides
interface AddToOverridesProps {
  ticker: string;
  name: string;
  onAdded: () => void;
}

function AddToOverridesButton({ ticker, name, onAdded }: AddToOverridesProps) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const overrides = loadOverrides();
      const upper = ticker.toUpperCase();
      const existingIndex = overrides.findIndex(o => o.ticker.toUpperCase() === upper);

      if (existingIndex >= 0) {
        overrides[existingIndex] = { ticker: upper, name };
      } else {
        overrides.push({ ticker: upper, name });
      }

      localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
      onAdded();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className="ml-2 p-1 rounded text-blue-500 hover:bg-blue-500/20 transition-colors shrink-0"
      title="添加到本地索引"
    >
      {loading ? (
        <span className="animate-spin w-4 h-4 block">⟳</span>
      ) : (
        <Plus className="w-4 h-4" />
      )}
    </button>
  );
}

export function SearchModal({ open, onOpenChange, onSelectTicker }: SearchModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [yahooResults, setYahooResults] = useState<YahooSearchResult[]>([]);
  const [loadingYahoo, setLoadingYahoo] = useState(false);

  // Load ticker index
  const { tickers: localTickers, loading: indexLoading } = useTickerIndex();

  // Load overrides from localStorage - updates when localStorage changes
  const [overrides, setOverrides] = useState<OverrideItem[]>([]);

  // Force re-render trigger for overrides
  const [overridesVersion, setOverridesVersion] = useState(0);

  useEffect(() => {
    const loadOverrides = () => {
      const saved = localStorage.getItem(OVERRIDE_STORAGE_KEY);
      if (saved) {
        try {
          setOverrides(JSON.parse(saved));
        } catch {
          setOverrides([]);
        }
      }
    };
    loadOverrides();
    // Listen for storage events (when other tabs/windows update localStorage)
    window.addEventListener('storage', loadOverrides);
    return () => window.removeEventListener('storage', loadOverrides);
  }, [open, overridesVersion]); // Re-load when version changes

  // Use new priority search: overrides first, then local tickers
  const localResults = useMemo((): SearchResultItem[] => {
    return searchTickersWithOverrides(overrides, localTickers, search, 30);
  }, [overrides, localTickers, search]);

  // Debounced Yahoo API search (secondary)
  useEffect(() => {
    if (!search || search.length < 1) {
      setYahooResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingYahoo(true);
      try {
        const results = await searchTickers(search, 15);
        setYahooResults(results.map((r: { display: string; symbol: string; name: string }) => ({
          display: r.display,
          symbol: r.symbol,
          name: r.name,
        })));
      } catch (error) {
        console.error("Yahoo search failed:", error);
        setYahooResults([]);
      } finally {
        setLoadingYahoo(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Trigger to refresh overrides
  const refreshOverrides = useCallback(() => {
    setOverridesVersion(v => v + 1);
  }, []);

  // Search common tickers
  const commonResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return COMMON_TICKERS.filter((ticker) => {
      const nameMatches = isI18nKey(ticker.name)
        ? t(ticker.name).toLowerCase().includes(q)
        : ticker.name.toLowerCase().includes(q);
      return (
        ticker.ticker.toLowerCase().includes(q) ||
        nameMatches ||
        ticker.label.toLowerCase().includes(q)
      );
    }).slice(0, 10);
  }, [search, t]);

  // Check if search query looks like a valid ticker
  const isValidTickerFormat = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return false;
    const tickerPattern = /^[\^]?[A-Z0-9]{1,6}(\.[A-Z]{2})?$/;
    return tickerPattern.test(q);
  }, [search]);

  // Build Yahoo results with add button support (filter out items already in overrides)
  const yahooWithAddSupport = useMemo(() => {
    const overrideTickers = new Set(overrides.map(o => o.ticker.toUpperCase()));
    return yahooResults.filter(r => !overrideTickers.has(r.symbol.toUpperCase()));
  }, [yahooResults, overrides]);

  // Combined results with source tracking for UI
  const allResults = useMemo(() => {
    const results: Array<{
      label: string;
      ticker: string;
      name: string;
      source: 'override' | 'local' | 'yahoo' | 'common';
    }> = [];

    // 1. Overrides first
    for (const item of localResults) {
      results.push({
        label: item.ticker.symbol,
        ticker: item.ticker.symbol,
        name: item.displayName,
        source: item.source,
      });
      if (results.length >= 30) break;
    }

    // 2. Yahoo results (that are not already in overrides)
    for (const r of yahooWithAddSupport) {
      results.push({
        label: r.symbol,
        ticker: r.symbol,
        name: r.name,
        source: 'yahoo',
      });
      if (results.length >= 30) break;
    }

    // 3. Common results
    for (const ticker of commonResults) {
      const upper = ticker.ticker.toUpperCase();
      // Skip if already in results
      if (results.some(r => r.ticker.toUpperCase() === upper)) continue;
      results.push({
        label: ticker.label,
        ticker: ticker.ticker,
        name: isI18nKey(ticker.name) ? t(ticker.name) : ticker.name,
        source: 'common',
      });
      if (results.length >= 30) break;
    }

    return results;
  }, [localResults, yahooWithAddSupport, commonResults, t]);

  // Check if exact ticker already in results
  const tickerExistsInResults = useMemo(() => {
    if (!search.trim()) return false;
    const q = search.trim().toUpperCase();
    return allResults.some(t => t.ticker.toUpperCase() === q);
  }, [search, allResults]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setYahooResults([]);
    }
  }, [open]);

  const handleSelect = useCallback((ticker: WatchlistItem) => {
    onSelectTicker(ticker);
    // Keep modal open for adding more stocks
    setSearch("");
  }, [onSelectTicker]);

  // Focus input after selection
  useEffect(() => {
    if (open) {
      // Auto-focus the input after selection
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[cmdk-input]');
        if (input) input.focus();
      }, 50);
    }
  }, [search, open]);

  const handleManualAdd = useCallback(() => {
    if (!search.trim()) return;
    const tickerSymbol = search.trim().toUpperCase();
    const newTicker: WatchlistItem = {
      label: tickerSymbol,
      ticker: tickerSymbol,
      name: tickerSymbol,
    };
    handleSelect(newTicker);
  }, [search, handleSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim() && isValidTickerFormat && !tickerExistsInResults) {
      e.preventDefault();
      handleManualAdd();
    }
  }, [search, isValidTickerFormat, tickerExistsInResults, handleManualAdd]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-3 max-w-md w-[95vw] border border-[var(--color-border)] bg-[var(--color-popover)] shadow-xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--color-muted-foreground)] [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {/* Search Input - with border */}
          <div className="flex items-center border border-[var(--color-border)] rounded-md px-3 bg-[var(--color-card)]">
            <Search className="w-4 h-4 mr-2 text-[var(--color-muted-foreground)] shrink-0" />
            <Command.Input
              placeholder={t("search.placeholder")}
              value={search}
              onValueChange={setSearch}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
              autoFocus
            />
            {(indexLoading || loadingYahoo) && search && (
              <span className="text-xs text-[var(--color-muted-foreground)] animate-pulse ml-2">
                {loadingYahoo ? "..." : "..."}
              </span>
            )}
          </div>

          {/* Results List - taller and narrower */}
          <Command.List className="max-h-[400px] min-h-[200px] overflow-y-auto p-2 mt-2 border border-[var(--color-border)] rounded-md bg-[var(--color-card)]">
            {!search && (
              <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                <p>輸入股票代碼或名稱搜尋</p>
                <p className="text-xs mt-1">例如: AAPL, 000001.SZ, 騰訊</p>
              </div>
            )}

            {search && allResults.length === 0 && !loadingYahoo && (
              <div className="py-4 px-2">
                <p className="text-sm text-center text-[var(--color-muted-foreground)] mb-3">
                  找不到 "{search}"
                </p>
                {isValidTickerFormat ? (
                  <button
                    onClick={handleManualAdd}
                    className="w-full py-3 px-4 border border-[var(--color-border)] rounded-md text-sm transition-colors flex items-center justify-center gap-2 hover:bg-[var(--color-accent)]"
                  >
                    <span className="font-mono font-medium">{search.toUpperCase()}</span>
                    <span className="text-[var(--color-muted-foreground)]">直接新增</span>
                  </button>
                ) : (
                  <p className="text-xs text-center text-[var(--color-muted-foreground)]">
                    請輸入有效的股票代碼 (例如: AAPL, 000001.SZ)
                  </p>
                )}
              </div>
            )}

            {allResults.length > 0 && (
              <Command.Group heading={`本地索引 + Yahoo (${allResults.length})`}>
                {allResults.map((ticker) => (
                  <Command.Item
                    key={ticker.ticker}
                    value={ticker.ticker}
                    onSelect={() => handleSelect({ label: ticker.label, ticker: ticker.ticker, name: ticker.name })}
                    className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer border border-transparent hover:border-[var(--color-border)] data-[selected=true]:border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Source indicator */}
                        <span className="text-[10px] px-1 rounded" title={
                          ticker.source === 'override' ? '用戶自定義' :
                          ticker.source === 'yahoo' ? 'Yahoo 搜索' :
                          ticker.source === 'common' ? '常用股票' : '本地索引'
                        }>
                          {ticker.source === 'override' && '⭐'}
                          {ticker.source === 'yahoo' && <span className="text-blue-500 font-bold">Y</span>}
                          {ticker.source === 'local' && ''}
                          {ticker.source === 'common' && ''}
                        </span>
                        <span className="font-medium text-[var(--color-foreground)]">
                          {isI18nKey(ticker.name) ? t(ticker.name) : ticker.name}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {ticker.label}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {/* Add button for Yahoo results */}
                      {ticker.source === 'yahoo' && (
                        <AddToOverridesButton
                          ticker={ticker.ticker}
                          name={ticker.name}
                          onAdded={refreshOverrides}
                        />
                      )}
                      <span className="text-xs text-[var(--color-muted-foreground)] font-mono ml-2 shrink-0">
                        {ticker.ticker}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {search && allResults.length > 0 && isValidTickerFormat && !tickerExistsInResults && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  onClick={handleManualAdd}
                  className="w-full py-2 px-3 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] rounded-md transition-colors text-center border border-[var(--color-border)]"
                >
                  新增: <span className="font-mono font-medium">{search.toUpperCase()}</span>
                </button>
              </div>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}