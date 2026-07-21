import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MainContent } from "@/components/layout/MainContent";
import { SearchModal } from "@/components/search/SearchModal";
import { StockChart } from "@/components/stock/StockChart";
import { FundamentalAnalysis } from "@/components/fundamental";
import { DevDrawer } from "@/components/DevDrawer";
import { IndexMaintenance } from "@/components/maintenance/IndexMaintenance";
import { DEFAULT_WATCHLISTS, STORAGE_KEY, FONT_CSS_MAP } from "@/lib/constants";
import { fetchPrices, generateMockPriceData } from "@/lib/tauri";
import { usePriceAlerts, showPriceAlertNotification } from "@/hooks/usePriceAlerts";
import { useAdaptiveWindowSize } from "@/hooks/useAdaptiveWindowSize";
import type { WatchlistItem, PriceData, Theme, Language, ZoomLevel, AlertConfig } from "@/types";

// Map browser language codes to supported languages
function getDefaultLanguage(): Language {
  const browserLang = navigator.language || navigator.languages?.[0] || "en";
  const langCode = browserLang.toLowerCase();

  // Try exact match first
  const supportedLanguages: Language[] = ["zh-TW", "en", "zh-CN", "ja", "ko", "es"];
  if (supportedLanguages.includes(browserLang as Language)) {
    return browserLang as Language;
  }

  // Try prefix match (e.g., "zh" matches "zh-TW" or "zh-CN")
  if (langCode.startsWith("zh")) {
    return langCode.includes("tw") || langCode.includes("hk") ? "zh-TW" : "zh-CN";
  }
  if (langCode.startsWith("ja")) return "ja";
  if (langCode.startsWith("ko")) return "ko";
  if (langCode.startsWith("es")) return "es";
  if (langCode.startsWith("en")) return "en";

  // Default to English
  return "en";
}

interface StoredData {
  watchlists: Record<string, WatchlistItem[]>;
  activeWatchlist: string | null;
  language: Language;
  zoomLevel: ZoomLevel;
  fontFamily: string;
}

function App() {
  const { t } = useTranslation();
  const { theme, setTheme, mounted } = useTheme();

  // Adaptive window size based on screen resolution
  useAdaptiveWindowSize();

  // State - detect browser language on first load
  const [watchlists, setWatchlists] = useState<Record<string, WatchlistItem[]>>(DEFAULT_WATCHLISTS);
  const [activeWatchlist, setActiveWatchlist] = useState<string | null>("Global Indices");
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [lastUpdateTimes, setLastUpdateTimes] = useState<Record<string, Date | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getDefaultLanguage());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(100);
  const [fontFamily, setFontFamily] = useState<string>("system");
  const [chartOpen, setChartOpen] = useState(false);
  const [chartTicker, setChartTicker] = useState<string>("");
  const [chartName, setChartName] = useState<string>("");
  const [fundamentalOpen, setFundamentalOpen] = useState(false);
  const [fundamentalTicker, setFundamentalTicker] = useState<string>("");
  const [fundamentalName, setFundamentalName] = useState<string>("");
  const [indexMaintenanceOpen, setIndexMaintenanceOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<"hidden" | "collapsed" | "expanded">("hidden");
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(() => {
    const saved = localStorage.getItem("ywatchlist_auto_refresh");
    return saved ? JSON.parse(saved) : true; // Default: enabled
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem("ywatchlist_auto_refresh_interval");
    return saved ? JSON.parse(saved) : 10; // Default: 10 minutes
  });
  const isDrawerOpen = drawerState !== "hidden";
  const drawerPadding = isDrawerOpen ? (drawerState === "collapsed" ? "pr-6" : "pr-[386px]") : "";
  const [alerts, setAlerts] = useState<Record<string, AlertConfig>>(() => {
    const saved = localStorage.getItem("ywatchlist_alerts");
    return saved ? JSON.parse(saved) : {};
  });
  const [pythonStatus, setPythonStatus] = useState<{ installed: boolean; scriptExists: boolean; message: string } | null>(null);

  // Check Python status on mount
  useEffect(() => {
    import("@tauri-apps/api/core").then(async ({ invoke }) => {
      try {
        const status = await invoke<{ python_installed: boolean; script_exists: boolean; python_message: string }>("check_python_status");
        setPythonStatus({
          installed: status.python_installed,
          scriptExists: status.script_exists,
          message: status.python_message,
        });
      } catch {
        setPythonStatus({ installed: false, scriptExists: false, message: "Unable to check Python status" });
      }
    });
  }, []);

  // Build ticker names map for notifications
  const tickerNames = Object.values(watchlists).flat().reduce((acc, item) => {
    acc[item.ticker] = item.name || item.label;
    return acc;
  }, {} as Record<string, string>);

  // Handle alert triggered
  const handleAlertTriggered = useCallback((ticker: string, type: "high" | "low", price: number) => {
    const config = alerts[ticker];
    const targetPrice = type === "high" ? config?.high : config?.low;
    if (targetPrice === undefined) return;

    const name = tickerNames[ticker] || ticker;
    showPriceAlertNotification(ticker, name, type, price, targetPrice);
  }, [alerts, tickerNames]);

  // Use price alerts hook
  const { notifiedRef } = usePriceAlerts({
    priceData,
    alerts,
    tickerNames,
    onAlertTriggered: handleAlertTriggered,
  });

  // Save alerts when they change
  useEffect(() => {
    localStorage.setItem("ywatchlist_alerts", JSON.stringify(alerts));
  }, [alerts]);

  // Theme initialization is handled by useTheme hook - no forced class needed

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: StoredData = JSON.parse(saved);
        // Always start with DEFAULT_WATCHLISTS as base, merge saved data
        let mergedWatchlists = { ...DEFAULT_WATCHLISTS };
        if (data.watchlists) {
          Object.keys(data.watchlists).forEach((key) => {
            // Keep user-created watchlists, skip default ones (they use i18n)
            if (!DEFAULT_WATCHLISTS[key]) {
              mergedWatchlists[key] = data.watchlists[key];
            }
          });
        }
        setWatchlists(mergedWatchlists);
        if (data.activeWatchlist && mergedWatchlists[data.activeWatchlist]) {
          setActiveWatchlist(data.activeWatchlist);
        }
        if (data.language) {
          setLanguage(data.language);
        }
        if (data.zoomLevel) {
          setZoomLevel(data.zoomLevel);
        }
        // Also load font from localStorage
        const savedFont = localStorage.getItem("ywatchlist_font");
        if (savedFont) {
          setFontFamily(savedFont);
        }
      } catch (e) {
        console.error("Failed to load saved data:", e);
      }
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    const data: StoredData = {
      watchlists,
      activeWatchlist,
      language,
      zoomLevel,
      fontFamily,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [watchlists, activeWatchlist, language, zoomLevel, fontFamily]);

  // Save auto refresh state
  useEffect(() => {
    localStorage.setItem("ywatchlist_auto_refresh", JSON.stringify(isAutoRefresh));
  }, [isAutoRefresh]);

  // Save auto refresh interval
  useEffect(() => {
    localStorage.setItem("ywatchlist_auto_refresh_interval", JSON.stringify(autoRefreshInterval));
  }, [autoRefreshInterval]);

  // Apply zoom level to root
  useEffect(() => {
    document.documentElement.style.fontSize = `${zoomLevel}%`;
  }, [zoomLevel]);

  // Apply font family to root (supports any Windows font name)
  useEffect(() => {
    const font = fontFamily.trim() || "system";
    if (font === "system") {
      document.documentElement.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    } else {
      // Try the font as-is first, fallback to system fonts
      document.documentElement.style.fontFamily = `'${font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    }
  }, [fontFamily]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Watchlist operations
  const handleSelectWatchlist = useCallback((name: string) => {
    setActiveWatchlist(name);
  }, []);

  const handleAddWatchlist = useCallback((name: string) => {
    setWatchlists((prev) => ({
      ...prev,
      [name]: [],
    }));
    setActiveWatchlist(name);
  }, []);

  const handleDeleteWatchlist = useCallback((name: string) => {
    setWatchlists((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (activeWatchlist === name) {
      const remaining = Object.keys(watchlists).filter((n) => n !== name);
      setActiveWatchlist(remaining[0] || null);
    }
  }, [activeWatchlist, watchlists]);

  const handleRenameWatchlist = useCallback((oldName: string, newName: string) => {
    setWatchlists((prev) => {
      if (!prev[oldName] || prev[newName]) return prev;
      const next = { ...prev };
      next[newName] = prev[oldName];
      delete next[oldName];
      return next;
    });
    if (activeWatchlist === oldName) {
      setActiveWatchlist(newName);
    }
  }, [activeWatchlist]);

  // Stock operations
  const handleAddStock = useCallback((ticker: WatchlistItem) => {
    if (!activeWatchlist) return;

    setWatchlists((prev) => {
      const items = prev[activeWatchlist] || [];
      // Check if already exists
      if (items.some((item) => item.ticker === ticker.ticker)) {
        return prev;
      }
      return {
        ...prev,
        [activeWatchlist]: [...items, ticker],
      };
    });
  }, [activeWatchlist]);

  const handleRemoveStock = useCallback((ticker: string) => {
    if (!activeWatchlist) return;

    setWatchlists((prev) => ({
      ...prev,
      [activeWatchlist]: (prev[activeWatchlist] || []).filter(
        (item) => item.ticker !== ticker
      ),
    }));
  }, [activeWatchlist]);

  // Refresh prices - uses real backend when available, falls back to mock
  const handleRefresh = useCallback(async (currentOnly: boolean = false) => {
    setIsLoading(true);
    try {
      let tickersToFetch: string[];
      const updatedWatchlists: string[] = [];

      if (currentOnly && activeWatchlist) {
        // Refresh only current watchlist
        const items = watchlists[activeWatchlist] || [];
        tickersToFetch = items.map(item => item.ticker);
        updatedWatchlists.push(activeWatchlist);
      } else {
        // Collect all tickers from all watchlists
        const allTickers = new Set<string>();
        Object.keys(watchlists).forEach(name => {
          if (watchlists[name]?.length > 0) {
            updatedWatchlists.push(name);
            watchlists[name].forEach((item) => allTickers.add(item.ticker));
          }
        });
        tickersToFetch = Array.from(allTickers);
      }

      if (tickersToFetch.length === 0) {
        setIsLoading(false);
        return;
      }

      // Try backend first, fallback to mock
      let priceResult: Record<string, PriceData> = {};
      try {
        const prices = await fetchPrices(tickersToFetch);
        prices.forEach((p) => {
          priceResult[p.ticker] = p;
        });
      } catch {
        // Backend not available, use mock data
        priceResult = generateMockPriceData(tickersToFetch);
      }

      // Merge with existing price data to preserve prices from other watchlists
      setPriceData(prev => ({ ...prev, ...priceResult }));
      const now = new Date();
      setLastUpdateTimes(prev => {
        const next = { ...prev };
        updatedWatchlists.forEach(name => {
          next[name] = now;
        });
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [watchlists, activeWatchlist]);

  // Auto refresh at configurable interval (only when enabled)
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      setIsLoading(true);
      // Collect all tickers from all watchlists
      const allTickers = new Set<string>();
      const updatedWatchlists: string[] = [];
      Object.keys(watchlists).forEach(name => {
        if (watchlists[name]?.length > 0) {
          updatedWatchlists.push(name);
          watchlists[name].forEach((item) => allTickers.add(item.ticker));
        }
      });
      const tickersToFetch = Array.from(allTickers);

      if (tickersToFetch.length === 0) {
        setIsLoading(false);
        return;
      }

      fetchPrices(tickersToFetch)
        .then((prices) => {
          const priceResult: Record<string, PriceData> = {};
          prices.forEach((p) => {
            priceResult[p.ticker] = p;
          });
          // Merge with existing price data to preserve prices from other watchlists
          setPriceData(prev => ({ ...prev, ...priceResult }));
        })
        .catch(() => {
          // Generate mock data and merge with existing prices
          const mockData = generateMockPriceData(tickersToFetch);
          setPriceData(prev => ({ ...prev, ...mockData }));
        })
        .finally(() => {
          setIsLoading(false);
          const now = new Date();
          setLastUpdateTimes(prev => {
            const next = { ...prev };
            updatedWatchlists.forEach(name => {
              next[name] = now;
            });
            return next;
          });
        });
    }, autoRefreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [watchlists, isAutoRefresh, autoRefreshInterval]);

  // Handle search selection
  const handleSelectTicker = useCallback((ticker: WatchlistItem) => {
    handleAddStock(ticker);
  }, [handleAddStock]);

  // Get current watchlist items
  const currentItems = activeWatchlist ? watchlists[activeWatchlist] || [] : [];

  // Handle chart open
  const handleOpenChart = useCallback((ticker: string) => {
    const item = currentItems.find((i) => i.ticker === ticker);
    setChartTicker(ticker);
    setChartName(item?.name || ticker);
    setChartOpen(true);
  }, [currentItems]);

  // Handle fundamental analysis open
  const handleOpenFundamental = useCallback((ticker: string) => {
    const item = currentItems.find((i) => i.ticker === ticker);
    setFundamentalTicker(ticker);
    setFundamentalName(item?.name || ticker);
    setFundamentalOpen(true);
  }, [currentItems]);

  // Handle stock selection (for details)
  const handleSelectStock = useCallback((ticker: string) => {
    console.log("Selected stock:", ticker);
  }, []);

  // Reorder items within the active watchlist
  const handleReorderItems = useCallback((newItems: WatchlistItem[]) => {
    if (!activeWatchlist) return;
    setWatchlists((prev) => ({
      ...prev,
      [activeWatchlist]: newItems,
    }));
  }, [activeWatchlist]);

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Python Status Warning Banner */}
      {pythonStatus && (!pythonStatus.installed || !pythonStatus.scriptExists) && (
        <div className="bg-yellow-900/80 border-b border-yellow-600 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-100 text-sm">
            <span className="text-lg">⚠️</span>
            <span>{pythonStatus.message}</span>
            {!pythonStatus.scriptExists && <span>（Python腳本未找到）</span>}
          </div>
          <a
            href="https://www.python.org/downloads/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yellow-600 hover:bg-yellow-500 text-yellow-900 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            下載 Python →
          </a>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        watchlists={watchlists}
        activeWatchlist={activeWatchlist}
        onSelectWatchlist={handleSelectWatchlist}
        onAddWatchlist={handleAddWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
        onRenameWatchlist={handleRenameWatchlist}
      />

      {/* Main Content */}
      <div className={"flex-1 flex flex-col overflow-hidden " + drawerPadding}>
        <Header
          isLoading={isLoading}
          isAutoRefresh={isAutoRefresh}
          autoRefreshInterval={autoRefreshInterval}
          onToggleAutoRefresh={() => setIsAutoRefresh(prev => !prev)}
          onAutoRefreshIntervalChange={setAutoRefreshInterval}
          theme={theme}
          onThemeChange={setTheme}
          language={language}
          onLanguageChange={setLanguage}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          onRefresh={() => handleRefresh(false)}
          onRefreshCurrent={() => handleRefresh(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenIndexMaintenance={() => setIndexMaintenanceOpen(true)}
        />
        <MainContent
          watchlistName={activeWatchlist}
          items={currentItems}
          priceData={priceData}
          lastUpdateTime={activeWatchlist ? lastUpdateTimes[activeWatchlist] : null}
          onAddStock={() => setSearchOpen(true)}
          onRemoveStock={handleRemoveStock}
          onSelectStock={handleSelectStock}
          onOpenChart={handleOpenChart}
          onOpenFundamental={handleOpenFundamental}
          alerts={alerts}
          triggeredAlerts={notifiedRef?.current || new Set()}
          onUpdateAlert={(ticker, config) => {
            if (config === null) {
              setAlerts(prev => {
                const next = { ...prev };
                delete next[ticker];
                return next;
              });
            } else {
              setAlerts(prev => ({ ...prev, [ticker]: config }));
            }
          }}
          onReorderItems={handleReorderItems}
        />
      </div>

      {/* Search Modal */}
      <SearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectTicker={handleSelectTicker}
      />

      {/* Chart Modal */}
      <StockChart
        open={chartOpen}
        onOpenChange={setChartOpen}
        ticker={chartTicker}
        name={chartName}
      />

      {/* Fundamental Analysis Modal */}
      <FundamentalAnalysis
        open={fundamentalOpen}
        onOpenChange={setFundamentalOpen}
        ticker={fundamentalTicker}
        name={fundamentalName}
        onOpenChart={() => {
          // Close fundamental and open chart
          setFundamentalOpen(false);
          setChartTicker(fundamentalTicker);
          setChartName(fundamentalName);
          setChartOpen(true);
        }}
      />

      {/* Index Maintenance Modal */}
      <IndexMaintenance
        open={indexMaintenanceOpen}
        onOpenChange={setIndexMaintenanceOpen}
      />
      </div>

      {/* Dev console drawer */}
      <DevDrawer state={drawerState} onStateChange={setDrawerState} />
    </div>
  );
}

export default App;