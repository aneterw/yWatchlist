import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Search, Trash2, X, BarChart3, Bell, BellOff, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatPrice, formatPercent, formatVolume } from "@/lib/utils";
import { isI18nKey } from "@/lib/i18nUtils";
import type { WatchlistItem, PriceData, AlertConfig } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface MainContentProps {
  watchlistName: string | null;
  items: WatchlistItem[];
  priceData: Record<string, PriceData>;
  lastUpdateTime: Date | null;
  onAddStock: () => void;
  onRemoveStock: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  onOpenChart: (ticker: string) => void;
  onOpenFundamental: (ticker: string) => void;
  alerts: Record<string, AlertConfig>;
  onUpdateAlert: (ticker: string, config: AlertConfig | null) => void;
  onReorderItems: (items: WatchlistItem[]) => void;
  triggeredAlerts?: Set<string>;
}

export function MainContent({
  watchlistName,
  items,
  priceData,
  lastUpdateTime,
  onAddStock,
  onRemoveStock,
  onSelectStock,
  onOpenChart,
  onOpenFundamental,
  alerts,
  onUpdateAlert,
  onReorderItems,
  triggeredAlerts = new Set(),
}: MainContentProps) {
  const { t } = useTranslation();
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);
  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);
  const [alertHigh, setAlertHigh] = useState("");
  const [alertLow, setAlertLow] = useState("");

  // Move item up/down in the list
  const moveItemUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0 || !onReorderItems) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onReorderItems(newItems);
  };

  const moveItemDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === items.length - 1 || !onReorderItems) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onReorderItems(newItems);
  };

  const openAlertModal = (ticker: string) => {
    const config = alerts[ticker];
    setAlertModalTicker(ticker);
    setAlertHigh(config?.high?.toString() || "");
    setAlertLow(config?.low?.toString() || "");
  };

  const saveAlert = () => {
    if (!alertModalTicker) return;
    const high = alertHigh ? parseFloat(alertHigh) : undefined;
    const low = alertLow ? parseFloat(alertLow) : undefined;
    if (high !== undefined && low !== undefined && high <= low) {
      alert("高價必須大於低價");
      return;
    }
    if (high === undefined && low === undefined) {
      onUpdateAlert(alertModalTicker, null);
    } else {
      onUpdateAlert(alertModalTicker, { high, low });
    }
    setAlertModalTicker(null);
  };

  const deleteAlert = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateAlert(ticker, null);
  };

  // Format last update time
  const formatLastUpdate = (date: Date | null): string => {
    if (!date) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;
  };

  if (!watchlistName) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-foreground)]">
        {t("sidebar.empty")}
      </div>
    );
  }

  const handleDeleteClick = (ticker: string) => {
    if (selectedForDelete === ticker) {
      // Second click - confirm delete
      onRemoveStock(ticker);
      setSelectedForDelete(null);
    } else {
      // First click - select for delete
      setSelectedForDelete(ticker);
    }
  };

  const handleDeleteCancel = () => {
    setSelectedForDelete(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Watchlist Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{isI18nKey(watchlistName) ? t(watchlistName) : watchlistName}</h2>
          <p className="text-sm text-[var(--color-foreground)]">
            {items.length} {t("sidebar.items")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-yellow-500 font-medium">{t("stock.priceDelay")}</span>
            <span className="text-xs text-[var(--color-foreground)] opacity-50">
              {t("stock.lastUpdate")}: {formatLastUpdate(lastUpdateTime)}
            </span>
          </div>
          <div className="flex gap-2">
          {selectedForDelete ? (
            <>
              <span className="text-sm text-[var(--color-foreground)] py-2">選擇了 1 項</span>
              <Button variant="destructive" size="sm" onClick={() => selectedForDelete && onRemoveStock(selectedForDelete)}>
                <Trash2 className="w-4 h-4 mr-1" />
                確認刪除
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteCancel} className="text-[var(--color-foreground)]">
                <X className="w-4 h-4 mr-1" />
                <span className="text-[var(--color-foreground)]">取消</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onAddStock} className="text-[var(--color-foreground)]">
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-[var(--color-foreground)]">{t("watchlist.addStock")}</span>
              </Button>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-foreground)]">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">{t("stock.noData")}</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={onAddStock}
            >
              {t("watchlist.addStock")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--color-foreground)] uppercase tracking-wider border-b border-[var(--color-border)]">
              <div className="w-28 shrink-0">{t("stock.label")}</div>
              <div className="w-16 shrink-0 text-right">{t("stock.ticker")}</div>
              <div className="w-24 shrink-0 text-right">{t("stock.price")}</div>
              <div className="w-20 shrink-0 text-right">{t("stock.change")}</div>
              <div className="w-20 shrink-0 text-right">{t("stock.pct")}</div>
              <div className="w-20 shrink-0 text-right">{t("stock.volume")}</div>
              <div className="flex-1"></div>
            </div>

            {/* Stock Cards */}
            {items.map((item, itemIndex) => {
              const price = priceData[item.ticker];
              const pctChange = price?.pct_change;
              const isUp = pctChange !== null && pctChange !== undefined && pctChange > 0;
              const isDown = pctChange !== null && pctChange !== undefined && pctChange < 0;
              const isSelectedForDelete = selectedForDelete === item.ticker;

              return (
                <Card
                  key={item.ticker}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 cursor-pointer transition-all",
                    "border border-[var(--color-border)] rounded-r-md",
                    isSelectedForDelete ? "border-red-500 bg-red-900/20" : "hover:border-[var(--color-primary)]",
                    isUp && "border-l-[6px] border-l-green-500",
                    isDown && "border-l-[6px] border-l-red-500",
                    !isUp && !isDown && "border-l-[6px] border-l-[var(--color-border)]"
                  )}
                  onDoubleClick={() => onOpenFundamental(item.ticker)}
                >
                  {/* Label & Name */}
                  <div className="w-28 shrink-0 flex flex-col min-w-0">
                    <span className="font-semibold text-[var(--color-foreground)] truncate">{item.label}</span>
                    <span className="text-xs text-[var(--color-foreground)] opacity-70 truncate">
                      {isI18nKey(item.name) ? t(item.name) : item.name}
                    </span>
                  </div>

                  {/* Ticker */}
                  <div className="w-16 shrink-0 text-right text-sm text-[var(--color-foreground)] font-mono truncate">
                    {item.ticker}
                  </div>

                  {/* Price */}
                  <div className="w-24 shrink-0 text-right font-mono text-base font-semibold text-[var(--color-foreground)]">
                    {price ? formatPrice(price.price) : "-"}
                  </div>

                  {/* Change */}
                  <div className={cn(
                    "w-20 shrink-0 text-right font-mono text-base font-bold",
                    isUp && "text-green-500",
                    isDown && "text-red-500",
                    !isUp && !isDown && "text-[var(--color-foreground)]"
                  )}>
                    {price ? (price.change !== null ? (price.change >= 0 ? "+" : "") + price.change.toFixed(2) : "-") : "-"}
                  </div>

                  {/* Percent */}
                  <div className={cn(
                    "w-20 shrink-0 text-right font-mono text-base font-bold",
                    isUp && "text-green-500",
                    isDown && "text-red-500",
                    !isUp && !isDown && "text-[var(--color-foreground)]"
                  )}>
                    {price ? formatPercent(pctChange) : "-"}
                  </div>

                  {/* Volume */}
                  <div className="w-20 shrink-0 text-right font-mono text-base text-[var(--color-foreground)] opacity-70">
                    {price ? formatVolume(price.volume) : "-"}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-1 flex items-center justify-end gap-1">
                    {/* Move Up/Down Buttons */}
                    <button
                      className="transition-colors cursor-pointer p-1 rounded text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500 disabled:hover:bg-transparent"
                      onClick={(e) => moveItemUp(itemIndex, e)}
                      disabled={itemIndex === 0}
                      title="往上移動"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      className="transition-colors cursor-pointer p-1 rounded text-gray-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500 disabled:hover:bg-transparent"
                      onClick={(e) => moveItemDown(itemIndex, e)}
                      disabled={itemIndex === items.length - 1}
                      title="往下移動"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Alert Button with status indicator */}
                    {(() => {
                      const hasAlert = alerts[item.ticker]?.high || alerts[item.ticker]?.low;
                      const highTriggered = triggeredAlerts.has(`${item.ticker}-high`);
                      const lowTriggered = triggeredAlerts.has(`${item.ticker}-low`);
                      // Bell is yellow when alert is configured, regardless of triggered state
                      const hasConfig = !!hasAlert;

                      return (
                        <div className="relative group">
                          <button
                            className={cn(
                              "transition-colors cursor-pointer p-1 rounded text-sm",
                              hasConfig
                                ? "text-yellow-400 hover:text-yellow-300"
                                : "text-gray-500 hover:text-yellow-400 opacity-50 hover:opacity-100"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              openAlertModal(item.ticker);
                            }}
                            title={t("alert.title")}
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                          {/* Tooltip with status */}
                          {hasAlert && (
                            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[var(--color-card)] border border-[var(--color-border)] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                              {alerts[item.ticker]?.high && (
                                <div className={highTriggered ? "text-green-400" : "text-[var(--color-foreground)]"}>
                                  高: ${alerts[item.ticker].high} {highTriggered && "✓"}
                                </div>
                              )}
                              {alerts[item.ticker]?.low && (
                                <div className={lowTriggered ? "text-green-400" : "text-[var(--color-foreground)]"}>
                                  低: ${alerts[item.ticker].low} {lowTriggered && "✓"}
                                </div>
                              )}
                              <button
                                onClick={(e) => deleteAlert(item.ticker, e)}
                                className="mt-1 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> 刪除
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <button
                      className={cn(
                        "transition-colors cursor-pointer p-1 rounded text-sm",
                        isSelectedForDelete
                          ? "text-red-400 bg-red-900/50"
                          : "text-red-600 hover:text-red-400 hover:bg-red-900/20 opacity-50 hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(item.ticker);
                      }}
                      title={isSelectedForDelete ? "再次點擊確認刪除" : "點擊選擇刪除"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Fundamental Analysis Button */}
                    <button
                      className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer p-1 rounded opacity-50 hover:opacity-100 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFundamental(item.ticker);
                      }}
                      title={t("fundamental.title")}
                    >
                      📈
                    </button>
                    {/* Chart Button */}
                    <button
                      className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer p-1 rounded opacity-50 hover:opacity-100 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChart(item.ticker);
                      }}
                      title={t("fundamental.view_chart")}
                    >
                      📊
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Settings Modal */}
      <Dialog open={!!alertModalTicker} onOpenChange={() => setAlertModalTicker(null)}>
        <DialogContent className="text-[var(--color-foreground)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              {t("alert.title")} - {alertModalTicker}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("alert.high")}</label>
              <Input
                type="number"
                step="0.01"
                placeholder="高於此價格通知"
                value={alertHigh}
                onChange={(e) => setAlertHigh(e.target.value)}
                className="text-[var(--color-foreground)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("alert.low")}</label>
              <Input
                type="number"
                step="0.01"
                placeholder="低於此價格通知"
                value={alertLow}
                onChange={(e) => setAlertLow(e.target.value)}
                className="text-[var(--color-foreground)]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAlertModalTicker(null)} className="text-[var(--color-foreground)]">
                {t("common.cancel")}
              </Button>
              <Button onClick={saveAlert}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}