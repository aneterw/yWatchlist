import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Search, X, AlertCircle, Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchTickers } from "@/lib/tauri";
import { useTickerIndex } from "@/hooks/useTickerIndex";

const OVERRIDE_STORAGE_KEY = "ywatchlist_index_overrides";

interface OverrideItem {
  ticker: string;
  name: string;
}

interface IndexMaintenanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IndexMaintenance({ open, onOpenChange }: IndexMaintenanceProps) {
  const { t } = useTranslation();
  const [overrides, setOverrides] = useState<OverrideItem[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const tickerInputRef = useRef<HTMLInputElement>(null);

  // Load local ticker index (top250_tickers.json)
  const { tickers: localTickers, loading: indexLoading } = useTickerIndex();

  // Load user overrides from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    if (saved) {
      try {
        setOverrides(JSON.parse(saved));
      } catch {
        setOverrides([]);
      }
    }
  }, []);

  // Save overrides whenever they change
  useEffect(() => {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTickerInput("");
      setNameInput("");
      setEditingTicker(null);
      setSearchError(false);
      setSearchSuccess(false);
      setShowConfirmDelete(null);
      setFilterText("");
      setTimeout(() => tickerInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Build merged list: localTickers + overrides (overrides take precedence)
  const mergedList = useMemo(() => {
    const overrideMap = new Map(overrides.map(o => [o.ticker.toUpperCase(), o]));
    const result: Array<{ ticker: string; name: string; isOverridden: boolean }> = [];

    // Add local tickers with override if exists
    for (const ticker of localTickers) {
      const upper = ticker.symbol.toUpperCase();
      const override = overrideMap.get(upper);
      result.push({
        ticker: ticker.symbol,
        name: override ? override.name : ticker.name,
        isOverridden: !!override,
      });
    }

    // Add new tickers from overrides that are not in localTickers
    for (const override of overrides) {
      const upper = override.ticker.toUpperCase();
      const existsInLocal = localTickers.some(t => t.symbol.toUpperCase() === upper);
      if (!existsInLocal) {
        result.push({
          ticker: override.ticker,
          name: override.name,
          isOverridden: true,
        });
      }
    }

    // Sort by ticker
    result.sort((a, b) => a.ticker.localeCompare(b.ticker));
    return result;
  }, [localTickers, overrides]);

  // Filter merged list based on filterText
  const filteredList = useMemo(() => {
    if (!filterText.trim()) return mergedList;
    const q = filterText.trim().toUpperCase();
    return mergedList.filter(item =>
      item.ticker.toUpperCase().includes(q) ||
      item.name.toUpperCase().includes(q)
    );
  }, [mergedList, filterText]);

  // Clear name when ticker is cleared, update filter
  useEffect(() => {
    if (!tickerInput.trim()) {
      setNameInput("");
      setSearchError(false);
      setSearchSuccess(false);
      setFilterText("");
    }
  }, [tickerInput]);

  // Search local index (top250_tickers.json + overrides)
  const handleSearchLocal = useCallback(() => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker || editingTicker) return;

    // Check if already in overrides first
    const existingOverride = overrides.find(o => o.ticker.toUpperCase() === ticker);
    if (existingOverride) {
      setNameInput(existingOverride.name);
      setSearchSuccess(true);
      setSearchError(false);
      setFilterText(ticker);
      return;
    }

    // Search local ticker index
    const localFound = localTickers.find(t => t.symbol.toUpperCase() === ticker);
    if (localFound) {
      setNameInput(localFound.name);
      setSearchSuccess(true);
      setSearchError(false);
      setFilterText(ticker);
    } else {
      // Not found in local
      setSearchError(true);
      setSearchSuccess(false);
      setNameInput("");
    }
  }, [tickerInput, editingTicker, overrides, localTickers]);

  // Search Yahoo API
  const handleSearchYahoo = useCallback(async () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker || editingTicker) return;

    setIsSearching(true);
    setSearchError(false);
    setSearchSuccess(false);
    try {
      const results = await searchTickers(ticker, 5);
      const found = results.find(r => r.symbol.toUpperCase() === ticker);

      if (found) {
        setNameInput(found.name);
        setSearchSuccess(true);
        setSearchError(false);
        setFilterText(ticker);
      } else {
        setSearchError(true);
        setSearchSuccess(false);
        setNameInput("");
      }
    } catch {
      setSearchError(true);
      setSearchSuccess(false);
      setNameInput("");
    } finally {
      setIsSearching(false);
    }
  }, [tickerInput, editingTicker]);

  // Handle Enter key - trigger local search
  const handleTickerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchLocal();
    }
  }, [handleSearchLocal]);

  // Handle search error - clear and refocus after delay
  useEffect(() => {
    if (searchError) {
      const timer = setTimeout(() => {
        setTickerInput("");
        setNameInput("");
        setSearchError(false);
        tickerInputRef.current?.focus();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [searchError]);

  const handleAddOrUpdate = useCallback(() => {
    const ticker = tickerInput.trim().toUpperCase();
    const name = nameInput.trim();

    if (!ticker || !name) return;

    if (editingTicker) {
      // Update existing override
      setOverrides(prev => prev.map(o => {
        if (o.ticker.toUpperCase() === editingTicker.toUpperCase()) {
          return { ticker, name };
        }
        return o;
      }));
      setTickerInput("");
      setNameInput("");
      setEditingTicker(null);
      setSearchSuccess(false);
      tickerInputRef.current?.focus();
    } else {
      // Add new override (or update if ticker already has override)
      const upper = ticker.toUpperCase();
      const existingIndex = overrides.findIndex(o => o.ticker.toUpperCase() === upper);

      if (existingIndex >= 0) {
        // Update existing override
        setOverrides(prev => prev.map((o, i) => i === existingIndex ? { ticker: upper, name } : o));
      } else {
        // Add new override
        setOverrides(prev => [...prev, { ticker: upper, name }]);
      }

      setTickerInput("");
      setNameInput("");
      setSearchSuccess(false);
      tickerInputRef.current?.focus();
    }
  }, [tickerInput, nameInput, editingTicker, overrides]);

  const handleEdit = useCallback((ticker: string) => {
    const item = mergedList.find(i => i.ticker === ticker);
    if (item) {
      setTickerInput(item.ticker);
      setNameInput(item.name);
      setEditingTicker(ticker);
      setSearchError(false);
      setSearchSuccess(false);
      tickerInputRef.current?.focus();
    }
  }, [mergedList]);

  const handleDelete = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase();
    // Remove from overrides
    setOverrides(prev => prev.filter(o => o.ticker.toUpperCase() !== upper));
    setShowConfirmDelete(null);
    tickerInputRef.current?.focus();
  }, []);

  const handleCancelEdit = useCallback(() => {
    setTickerInput("");
    setNameInput("");
    setEditingTicker(null);
    setSearchError(false);
    setSearchSuccess(false);
    tickerInputRef.current?.focus();
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOrUpdate();
    }
  }, [handleAddOrUpdate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("indexMaintenance.title")}</DialogTitle>
        </DialogHeader>

        {/* Search Result Message */}
        {searchError && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm text-[var(--color-foreground)]">{t("indexMaintenance.tickerNotFound")}</span>
          </div>
        )}

        {/* Input Section */}
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            {/* Ticker Input with Search Buttons */}
            <div className="flex-[2]">
              <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                {t("indexMaintenance.ticker")}
              </label>
              <div className="flex gap-1">
                <Input
                  ref={tickerInputRef}
                  value={tickerInput}
                  onChange={(e) => {
                    setTickerInput(e.target.value.toUpperCase());
                    setSearchError(false);
                    setSearchSuccess(false);
                  }}
                  onKeyDown={handleTickerKeyDown}
                  placeholder={t("indexMaintenance.tickerPlaceholder")}
                  disabled={!!editingTicker}
                  className={cn(
                    "font-mono flex-1",
                    editingTicker && "bg-[var(--color-muted)]",
                    "text-[var(--color-foreground)]"
                  )}
                />
                {/* Search Buttons - only show when not editing */}
                {!editingTicker && (
                  <div className="flex gap-1 mt-[22px]">
                    {/* Local Index Search */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSearchLocal}
                      disabled={!tickerInput.trim() || isSearching}
                      title={t("indexMaintenance.searchLocal")}
                      className="text-[var(--color-foreground)]"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    {/* Yahoo Search */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSearchYahoo}
                      disabled={!tickerInput.trim() || isSearching}
                      title={t("indexMaintenance.searchYahoo")}
                      className="text-[var(--color-foreground)]"
                    >
                      <span className="text-xs font-bold">Y</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div className="flex-[3]">
              <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                {t("indexMaintenance.name")}
              </label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t("indexMaintenance.namePlaceholder")}
                className={cn(
                  "font-mono",
                  "text-[var(--color-foreground)]",
                  editingTicker ? "bg-[var(--color-muted)]" : ""
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {editingTicker ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddOrUpdate}
                  disabled={!tickerInput.trim() || !nameInput.trim()}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t("common.save")}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleAddOrUpdate}
                disabled={!tickerInput.trim() || !nameInput.trim() || isSearching}
              >
                <Plus className="w-4 h-4 mr-1" />
                {searchSuccess || (tickerInput && nameInput) ? t("common.save") : t("indexMaintenance.add")}
              </Button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--color-border)]" />

        {/* List Section */}
        <div className="flex-1 overflow-y-auto">
          {indexLoading ? (
            <div className="text-center py-8 text-sm text-[var(--color-muted-foreground)]">
              {t("common.loading")}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--color-muted-foreground)]">
              {filterText ? t("indexMaintenance.noMatch", { query: filterText }) : t("indexMaintenance.empty")}
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {filteredList.map((item) => (
                <div
                  key={item.ticker}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--color-accent)] group"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-mono text-sm font-medium text-[var(--color-foreground)]">
                      {item.ticker}
                      {item.isOverridden && (
                        <span className="ml-2 text-xs text-yellow-500">*</span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] truncate text-[var(--color-foreground)]">
                      {item.name}
                    </span>
                  </div>

                  {/* Confirm Delete State */}
                  {showConfirmDelete === item.ticker ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.ticker)}
                      >
                        {t("common.confirm")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmDelete(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleEdit(item.ticker)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        <span className="text-xs text-[var(--color-foreground)]">{t("indexMaintenance.edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-500 hover:text-red-600"
                        onClick={() => setShowConfirmDelete(item.ticker)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="text-xs">{t("indexMaintenance.delete")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with count */}
        <div className="border-t border-[var(--color-border)] pt-2 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          {filterText ? (
            <span className="text-blue-400">
              🔍 {t("indexMaintenance.filtered", { shown: filteredList.length, total: mergedList.length })}
            </span>
          ) : (
            <span>{t("indexMaintenance.total", { count: mergedList.length })}</span>
          )}
          {overrides.length > 0 && (
            <span className="text-yellow-500">
              ({t("indexMaintenance.modified", { count: overrides.length })})
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}