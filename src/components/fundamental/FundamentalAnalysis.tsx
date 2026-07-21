import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3, TrendingUp, TrendingDown, Settings, ExternalLink, Newspaper,
  DollarSign, Activity, Percent, Users, Calendar, Wallet, BarChart2, Info, Globe,
  Target, PieChart, LineChart, ChartLine, Eye, Bookmark, Coins
} from "lucide-react";
import { cn } from "@/lib/utils";

const TrendingUpIcon = TrendingUp;
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFundamentalData, getStockNews, type NewsItem } from "@/lib/tauri";
import type { FundamentalData } from "@/types";
import { CookieSettings } from "./CookieSettings";

interface FundamentalAnalysisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
  name: string;
  onOpenChart?: () => void;
}

// All metric translations mapped by key
const METRIC_TRANSLATIONS: Record<string, string> = {
  // Valuation
  market_cap: "fundamental.market_cap",
  trailing_pe: "fundamental.trailing_pe",
  forward_pe: "fundamental.forward_pe",
  peg: "fundamental.peg",
  price_to_book: "fundamental.price_to_book",
  ev_ebitda: "fundamental.ev_ebitda",
  // Profitability
  eps: "fundamental.eps",
  roe: "fundamental.roe",
  roa: "fundamental.roa",
  roic: "fundamental.roic",
  op_margin: "fundamental.op_margin",
  profit_margin: "fundamental.profit_margin",
  // Yield & Risk
  dividend_yield: "fundamental.dividend_yield",
  beta: "fundamental.beta",
  fcf_yield: "fundamental.fcf_yield",
  quick_ratio: "fundamental.quick_ratio",
  short_pct: "fundamental.short_pct",
  // Analyst & Holdings
  target_mean: "fundamental.target_mean",
  target_median: "fundamental.target_median",
  analyst_count: "fundamental.analyst_count",
  rec_mean: "fundamental.rec_mean",
  insider_pct: "fundamental.insider_pct",
  inst_pct: "fundamental.inst_pct",
  // 52W Range
  "52w_high": "fundamental.52w_high",
  "52w_low": "fundamental.52w_low",
  range_position: "fundamental.range_position",
  // Cash Flow
  fcf: "fundamental.fcf",
  op_cashflow: "fundamental.op_cashflow",
  fcf_coverage: "fundamental.fcf_coverage",
  // Growth
  total_revenue: "fundamental.total_revenue",
  total_liabilities: "fundamental.total_liabilities",
  total_cash: "fundamental.total_cash",
  earnings_growth: "fundamental.earnings_growth",
  revenue_growth: "fundamental.revenue_growth",
};

// Metrics that are percentages stored as whole numbers (need to divide by 100 for display)
const PERCENTAGE_METRICS = new Set([
  "dividend_yield", "fcf_yield", "fcf_coverage",
  "roe", "roa", "roic", "op_margin", "profit_margin",
  "earnings_growth", "revenue_growth", "range_position",
]);

// Positive metric keys (color green if positive, red if negative)
const POSITIVE_KEYS = new Set([
  "roe", "roa", "roic", "op_margin", "profit_margin",
  "fcf_yield", "dividend_yield", "earnings_growth", "revenue_growth",
  "range_position",
]);

// Helper to format percentage values - only dividend_yield needs to divide by 100
function formatPercentage(value: string | null | undefined): string {
  if (!value || value === "N/A" || value === "None") return value || "N/A";
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  // If value includes %, return as is
  if (value.includes("%")) return value;
  // Otherwise format as percentage
  return numValue.toFixed(2) + "%";
}

// Special formatter for dividend_yield (stored as 49 instead of 0.49)
function formatDividendYield(value: string | null | undefined): string {
  if (!value || value === "N/A" || value === "None") return value || "N/A";
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  // Divide by 100 to convert 49 -> 0.49%
  return (numValue / 100).toFixed(2) + "%";
}

// Special formatter for fcf_coverage (direct display)
function formatFCFCoverage(value: string | null | undefined): string {
  if (!value || value === "N/A" || value === "None") return value || "N/A";
  return value;
}

// Category configs with colored icons
type CategoryConfig = {
  id: string;
  titleKey: keyof typeof import("@/i18n/zh-TW.json")["fundamental"];
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  metrics: string[];
};

const CATEGORIES: CategoryConfig[] = [
  {
    id: "valuation",
    titleKey: "fundamental.valuation",
    icon: Coins,
    iconColor: "text-blue-400",
    metrics: ["market_cap", "trailing_pe", "forward_pe", "peg", "price_to_book", "ev_ebitda"],
  },
  {
    id: "profitability",
    titleKey: "fundamental.profitability",
    icon: ChartLine,
    iconColor: "text-green-400",
    metrics: ["eps", "roe", "roa", "roic", "op_margin", "profit_margin"],
  },
  {
    id: "yield_risk",
    titleKey: "fundamental.yield_risk",
    icon: Percent,
    iconColor: "text-yellow-400",
    metrics: ["dividend_yield", "beta", "fcf_yield", "quick_ratio", "short_pct"],
  },
  {
    id: "analyst",
    titleKey: "fundamental.analyst",
    icon: Target,
    iconColor: "text-purple-400",
    metrics: ["target_mean", "target_median", "analyst_count", "rec_mean", "insider_pct", "inst_pct"],
  },
  {
    id: "range52w",
    titleKey: "fundamental.range52w",
    icon: LineChart,
    iconColor: "text-orange-400",
    metrics: ["52w_high", "52w_low", "range_position"],
  },
  {
    id: "cashflow",
    titleKey: "fundamental.cashflow",
    icon: PieChart,
    iconColor: "text-cyan-400",
    metrics: ["fcf", "op_cashflow", "fcf_coverage"],
  },
  {
    id: "growth",
    titleKey: "fundamental.growth",
    icon: TrendingUpIcon,
    iconColor: "text-emerald-400",
    metrics: ["total_revenue", "total_liabilities", "total_cash", "earnings_growth", "revenue_growth"],
  },
];

export function FundamentalAnalysis({
  open,
  onOpenChange,
  ticker,
  name,
  onOpenChart,
}: FundamentalAnalysisProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<FundamentalData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

  // Load fundamental data when dialog opens
  useEffect(() => {
    if (!open || !ticker) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getFundamentalData(ticker);
        setData(result);
      } catch (error) {
        console.error("[FundamentalAnalysis] Failed to load:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const result = await getStockNews(ticker);
        setNews(result);
      } catch (error) {
        console.error("[FundamentalAnalysis] Failed to load news:", error);
        setNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    loadData();
    loadNews();
  }, [open, ticker]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setData(null);
      setNews([]);
    }
  }, [open]);

  const getValueColor = (value: string | null | undefined, isPositiveKey?: boolean): string => {
    if (!value || value === "N/A" || value === "None") return "text-muted-foreground";

    // Check if it's a positive percentage (green)
    if (isPositiveKey) {
      const numValue = parseFloat(value.replace("%", ""));
      if (!isNaN(numValue)) {
        return numValue > 0 ? "text-green-500" : "text-red-500";
      }
    }

    // Price change coloring
    if (value.startsWith("+")) {
      return "text-green-500";
    } else if (value.startsWith("-")) {
      return "text-red-500";
    }

    return "text-foreground";
  };

  // Parse price change for display
  const priceChange = data?.price_change;
  const isPositive = priceChange?.startsWith("+");
  const isNegative = priceChange?.startsWith("-");

  const handleNewsClick = (url: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto p-4 pb-10">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span className="text-white">{data?.company_name || name} ({ticker})</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCookieSettingsOpen(true)}
                className="flex items-center gap-1 border-white/30 hover:bg-white/10"
                style={{ color: "#ffffff" }}
                title={t("fundamental.cookie_settings")}
              >
                <Settings className="w-4 h-4" style={{ color: "#ffffff" }} />
                <span className="hidden sm:inline" style={{ color: "#ffffff" }}>{t("fundamental.cookie_settings")}</span>
              </Button>
              {onOpenChart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenChart}
                  style={{ color: "#ffffff" }}
                  className="border-white/30 hover:bg-white/10"
                >
                  <ExternalLink className="w-4 h-4 mr-1" style={{ color: "#ffffff" }} />
                  <span style={{ color: "#ffffff" }}>{t("fundamental.view_chart")}</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : data?.error ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("fundamental.no_data")}: {data.error}
            </div>
          ) : data ? (
            <div className="space-y-4 pb-6">
              {/* Company Info Header */}
              <Card className="p-4 bg-card border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-xl font-bold text-foreground">{data.company_name}</div>
                    {data.sector && (
                      <div className="text-sm text-muted-foreground">
                        {data.sector}
                        {data.industry && ` / ${data.industry}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">{data.current_price || "-"}</div>
                    {priceChange && priceChange !== "None" && (
                      <div className={`flex items-center gap-1 justify-end ${getValueColor(priceChange)}`}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : isNegative ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : null}
                        <span className="font-semibold text-foreground">
                          {priceChange} ({data.price_pct || "-"})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Stock Info Card - 11 metrics */}
              <Card className="bg-card border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("fundamental.company_info")}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: "fundamental.prev_close", value: data.prev_close },
                    { label: "fundamental.today_high", value: data.today_high },
                    { label: "fundamental.today_low", value: data.today_low },
                    { label: "fundamental.volume", value: data.volume },
                    { label: "fundamental.market_cap", value: data.market_cap },
                    { label: "fundamental.trailing_pe", value: data.trailing_pe },
                    { label: "fundamental.dividend_yield", value: formatDividendYield(data.dividend_yield) },
                    { label: "fundamental.52w_high", value: data["52w_high"] },
                    { label: "fundamental.52w_low", value: data["52w_low"] },
                    { label: "fundamental.beta", value: data.beta },
                    { label: "fundamental.eps", value: data.eps },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">{t(item.label)}</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {item.value || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Metric Categories - 2 column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map((category) => (
                  <MetricCard
                    key={category.id}
                    title={t(category.titleKey)}
                    IconComponent={category.icon}
                    iconColor={category.iconColor}
                    metrics={category.metrics}
                    data={data}
                    getValueColor={getValueColor}
                    t={t}
                  />
                ))}
              </div>

              {/* News Section */}
              <Card className="bg-card border-border overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("fundamental.news")}
                  </h3>
                </div>
                <div className="p-3">
                  {newsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : news.length > 0 ? (
                    <div className="space-y-2">
                      {news.map((item, index) => (
                        <div
                          key={index}
                          className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">
                              [{item.publisher}] - {item.pub_date}
                            </span>
                          </div>
                          <a
                            href={item.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "text-left w-full hover:text-blue-400 transition-colors cursor-pointer block",
                              !item.link && "pointer-events-none opacity-50"
                            )}
                            onClick={(e) => {
                              if (!item.link) {
                                e.preventDefault();
                              }
                            }}
                          >
                            {item.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {t("fundamental.no_data")}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("fundamental.no_data")}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cookie Settings Modal */}
      <CookieSettings
        open={cookieSettingsOpen}
        onOpenChange={setCookieSettingsOpen}
      />
    </>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  iconColor: string;
  metrics: string[];
  data: FundamentalData;
  getValueColor: (value: string | null | undefined, isPositiveKey?: boolean) => string;
  t: (key: string) => string;
}

function MetricCard({ title, IconComponent, iconColor, metrics, data, getValueColor, t }: MetricCardProps) {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
        <IconComponent className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {metrics.map((key) => {
            const rawValue = data[key as keyof FundamentalData];
            const isPositive = POSITIVE_KEYS.has(key);
            const labelKey = METRIC_TRANSLATIONS[key] || key;
            // Format value - dividend_yield除100, fcf_coverage乘100
            let displayValue: string;
            if (key === "dividend_yield") {
              displayValue = formatDividendYield(rawValue);
            } else if (key === "fcf_coverage") {
              displayValue = formatFCFCoverage(rawValue);
            } else {
              displayValue = rawValue || "N/A";
            }
            return (
              <div key={key} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t(labelKey)}</span>
                <span className={`font-mono font-medium ${getValueColor(displayValue, isPositive)}`}>
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}