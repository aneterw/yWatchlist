import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, Time } from "lightweight-charts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getChartData } from "@/lib/tauri";
import type { ChartData } from "@/types";

interface StockChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
  name: string;
}

type Period = "1d" | "1wk" | "1mo";
type ChartType = "candle" | "candle_ma" | "kd" | "macd";

const PERIODS: { value: Period; label: string }[] = [
  { value: "1d", label: "chart.day" },
  { value: "1wk", label: "chart.week" },
  { value: "1mo", label: "chart.month" },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candle", label: "chart.candle" },
  { value: "candle_ma", label: "chart.candle_ma" },
  { value: "kd", label: "chart.kd" },
  { value: "macd", label: "chart.macd" },
];

// Calculate SMA
function calculateSMA(data: ChartData[], period: number): LineData<Time>[] {
  const result: LineData<Time>[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].date as Time, value: sum / period });
  }
  return result;
}

// Calculate KD - returns data aligned with original data array
function calculateKD(data: ChartData[], period: number = 9): { k: LineData<Time>[]; d: LineData<Time>[] } {
  const k: LineData<Time>[] = [];
  const d: LineData<Time>[] = [];
  const rsv: number[] = [];

  // Calculate RSV for all valid positions
  for (let i = period - 1; i < data.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      if (data[idx].high > highest) highest = data[idx].high;
      if (data[idx].low < lowest) lowest = data[idx].low;
    }
    const range = highest - lowest;
    rsv.push(range > 0 ? ((data[i].close - lowest) / range) * 100 : 50);
  }

  let prevK = 50, prevD = 50;
  // Output data aligned with original array
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // Initial period-1 entries: use neutral values
      k.push({ time: data[i].date as Time, value: 50 });
      d.push({ time: data[i].date as Time, value: 50 });
    } else {
      const rsvIdx = i - (period - 1);
      const currK = (2 / 3) * prevK + (1 / 3) * rsv[rsvIdx];
      const currD = (2 / 3) * prevD + (1 / 3) * currK;
      k.push({ time: data[i].date as Time, value: currK });
      d.push({ time: data[i].date as Time, value: currD });
      prevK = currK;
      prevD = currD;
    }
  }
  return { k, d };
}

// Calculate MACD - returns data aligned with original data array
function calculateMACD(data: ChartData[]): { macd: LineData<Time>[]; signal: LineData<Time>[]; histogram: HistogramData<Time>[] } {
  const prices = data.map(d => d.close);

  function calcEMA(prices: number[], period: number): number[] {
    const result: number[] = [];
    const mult = 2 / (period + 1);
    // Simple moving average for initial EMA value
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(ema);
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * mult + ema;
      result.push(ema);
    }
    return result;
  }

  const emaFast = calcEMA(prices, 12);
  const emaSlow = calcEMA(prices, 26);
  const macdLine: number[] = [];

  // MACD starts where both EMAs exist (index 25)
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }

  const signalLine = calcEMA(macdLine, 9);

  const macd: LineData<Time>[] = [];
  const sig: LineData<Time>[] = [];
  const histogram: HistogramData<Time>[] = [];

  const offset = 25; // MACD starts at data index 25
  const mult = 2 / (10); // Signal EMA multiplier = 2/10 = 0.2

  // Track last EMA value for continuation
  let lastSignalEMA = signalLine.length > 0 ? signalLine[signalLine.length - 1] : 0;

  for (let i = 0; i < data.length; i++) {
    if (i < offset) {
      // Initial entries: use zero/neutral values
      macd.push({ time: data[i].date as Time, value: 0 });
      sig.push({ time: data[i].date as Time, value: 0 });
      histogram.push({ time: data[i].date as Time, value: 0, color: "rgba(128, 128, 128, 0.3)" });
    } else {
      const macdIdx = i - offset;
      const m = macdLine[macdIdx] ?? 0;

      // Get signal: use pre-computed or continue EMA calculation
      let s: number;
      if (macdIdx < signalLine.length) {
        s = signalLine[macdIdx];
        lastSignalEMA = s; // Update for continuation
      } else {
        // Continue EMA calculation beyond pre-computed range
        lastSignalEMA = (m - lastSignalEMA) * mult + lastSignalEMA;
        s = lastSignalEMA;
      }

      macd.push({ time: data[i].date as Time, value: m });
      sig.push({ time: data[i].date as Time, value: s });
      histogram.push({
        time: data[i].date as Time,
        value: m - s,
        color: m >= s ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)",
      });
    }
  }
  return { macd, signal: sig, histogram };
}

export function StockChart({ open, onOpenChange, ticker, name }: StockChartProps) {
  const { t } = useTranslation();
  const mainChartRef = useRef<HTMLDivElement>(null);
  const mainChartApi = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const kSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const dSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [period, setPeriod] = useState<Period>("1d");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<ChartData[]>([]);
  const [tooltip, setTooltip] = useState<{ date: string; open: number; high: number; low: number; close: number; volume: number; k?: number; d?: number; macd?: number; signal?: number; histogram?: number; ma10?: number } | null>(null);
  const [dataVersion, setDataVersion] = useState(0); // Version counter to track data changes

  // Ref to track last visible OHLC (survives cursor leaving chart)
  const lastHoveredRef = useRef<{ date: string; open: number; high: number; low: number; close: number; volume: number; k?: number; d?: number; macd?: number; signal?: number; histogram?: number; ma10?: number } | null>(null);

  // Ref for chartType to avoid stale closure in crosshair callbacks
  const chartTypeRef = useRef<ChartType>(chartType);
  useEffect(() => { chartTypeRef.current = chartType; }, [chartType]);

  // Ref to track latest rawData for crosshair callback (avoid closure stale data)
  const rawDataRef = useRef<ChartData[]>([]);
  // Track latest data version to avoid stale effects
  const dataVersionRef = useRef(0);
  useEffect(() => {
    rawDataRef.current = rawData;
    dataVersionRef.current = dataVersion;
    // Also update tooltip with latest data when rawData changes
    if (rawData.length > 0) {
      const last = rawData[rawData.length - 1];
      const newTooltip = {
        date: last.date,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
      };
      lastHoveredRef.current = newTooltip;
      setTooltip(newTooltip);
    }
  }, [rawData, dataVersion]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      if (mainChartApi.current) { mainChartApi.current.remove(); mainChartApi.current = null; }
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRef.current = null;
      kSeriesRef.current = null;
      dSeriesRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
      histSeriesRef.current = null;
      setLoading(false);
      setRawData([]);
      setTooltip(null);
      setDataVersion(0);
    }
  }, [open]);

  // Init main chart when dialog opens or ticker changes
  useEffect(() => {
    if (!open) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mainChartApi.current) {
        // Chart exists, but maybe ticker changed - reload data
        loadChartData(ticker, period);
      } else {
        initMainChart();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [open, ticker]);

  function resetMainPaneMargins() {
    // 恢复默认 margins（panes API 不需要额外设置）
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.priceScale().applyOptions({
        scaleMargins: { top: 0.65, bottom: 0 }
      });
    }
  }

  // Unified effect: handle all data rendering (main + indicator)
  // Uses dataVersion as stable trigger (not array reference)
  useEffect(() => {
    if (!open || !mainChartApi.current || rawData.length === 0) return;
    if (dataVersionRef.current !== dataVersion) return; // Extra safety

    console.log("[Chart] Rendering with data version:", dataVersion);

    // Render main chart
    renderMainChart(rawData);

    // Render indicator if needed
    const needsIndicator = chartType === "kd" || chartType === "macd";
    if (needsIndicator) {
      renderIndicatorSeries();
    } else {
      // Hide indicator series if exists
      if (kSeriesRef.current) { kSeriesRef.current.applyOptions({ visible: false }); }
      if (dSeriesRef.current) { dSeriesRef.current.applyOptions({ visible: false }); }
      if (macdSeriesRef.current) { macdSeriesRef.current.applyOptions({ visible: false }); }
      if (signalSeriesRef.current) { signalSeriesRef.current.applyOptions({ visible: false }); }
      if (histSeriesRef.current) { histSeriesRef.current.applyOptions({ visible: false }); }
      // Reset main pane to full height
      resetMainPaneMargins();
    }
  }, [open, dataVersion]); // Only use open and dataVersion as triggers

  function initMainChart() {
    if (!mainChartRef.current) { console.log("[Chart] No mainChartRef"); return; }
    if (mainChartApi.current) { console.log("[Chart] Main chart already exists"); return; }

    console.log("[Chart] Initializing main chart");
    // Always use dark theme for chart regardless of app theme
    const isDark = true;
    const chart = createChart(mainChartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#e0e0e0",
      },
      grid: {
        vertLines: { color: "#2a2a2a" },
        horzLines: { color: "#2a2a2a" },
      },
      width: mainChartRef.current.clientWidth,
      height: mainChartRef.current.clientHeight || 400,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#888", labelBackgroundColor: "#444" },
        horzLine: { color: "#888", labelBackgroundColor: "#444" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.65, bottom: 0 } });

    // Crosshair move for tooltip - use ref to avoid stale data
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        // Don't hide tooltip - keep showing last known data
        return;
      }
      const timeStr = String(param.time);
      // Use ref to get latest data, not closure-captured stale data
      const candleData = rawDataRef.current.find(d => d.date === timeStr);
      if (candleData) {
        let tooltipData: { date: string; open: number; high: number; low: number; close: number; volume: number; k?: number; d?: number; macd?: number; signal?: number; histogram?: number; ma10?: number } = {
          date: candleData.date,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: candleData.volume,
        };

        // Calculate MA10 if needed (candle_ma mode)
        if (chartTypeRef.current === "candle_ma") {
          const ma10Data = calculateSMA(rawDataRef.current, 10);
          const ma10Point = ma10Data.find(x => x.time === timeStr);
          tooltipData.ma10 = ma10Point?.value;
        }

        // Calculate KD if needed
        if (chartTypeRef.current === "kd") {
          const { k, d } = calculateKD(rawDataRef.current);
          const kData = k.find(x => x.time === timeStr);
          const dData = d.find(x => x.time === timeStr);
          tooltipData.k = kData?.value;
          tooltipData.d = dData?.value;
        }

        // Calculate MACD if needed
        if (chartTypeRef.current === "macd") {
          const { macd, signal, histogram } = calculateMACD(rawDataRef.current);
          const macdData = macd.find(x => x.time === timeStr);
          const signalData = signal.find(x => x.time === timeStr);
          const histData = histogram.find(x => x.time === timeStr);
          tooltipData.macd = macdData?.value;
          tooltipData.signal = signalData?.value;
          tooltipData.histogram = histData?.value;
        }

        lastHoveredRef.current = tooltipData;
        setTooltip(tooltipData);
      }
    });

    mainChartApi.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    console.log("[Chart] Main chart created, loading data");
    loadChartData(ticker, period);
  }

  // No sync needed - we use single chart with multiple panes (shared time scale)
  const syncCharts = useCallback(() => {
    // No-op: when using panes API, time scale is shared automatically
  }, []);

  useEffect(() => {
    if (!mainChartApi.current) return;
    // No subscriptions needed - time scale is shared via panes
    return () => {};
  }, [syncCharts]);

  function renderIndicatorSeries() {
    if (!mainChartApi.current || rawData.length === 0) return;
    const chart = mainChartApi.current;

    // Remove old series
    if (kSeriesRef.current) { chart.removeSeries(kSeriesRef.current); kSeriesRef.current = null; }
    if (dSeriesRef.current) { chart.removeSeries(dSeriesRef.current); dSeriesRef.current = null; }
    if (macdSeriesRef.current) { chart.removeSeries(macdSeriesRef.current); macdSeriesRef.current = null; }
    if (signalSeriesRef.current) { chart.removeSeries(signalSeriesRef.current); signalSeriesRef.current = null; }
    if (histSeriesRef.current) { chart.removeSeries(histSeriesRef.current); histSeriesRef.current = null; }

    // 使用 panes API: pane 1 占 20% 高度
    const INDICATOR_PANE_INDEX = 1;
    const INDICATOR_HEIGHT_RATIO = 0.20;

    if (chartType === "kd") {
      kSeriesRef.current = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
      }, INDICATOR_PANE_INDEX, { heightRatio: INDICATOR_HEIGHT_RATIO });
      kSeriesRef.current.setData(calculateKD(rawData).k);
      dSeriesRef.current = chart.addSeries(LineSeries, {
        color: "#f97316",
        lineWidth: 2,
        priceLineVisible: false,
      }, INDICATOR_PANE_INDEX);
      dSeriesRef.current.setData(calculateKD(rawData).d);
    } else if (chartType === "macd") {
      const { macd, signal, histogram } = calculateMACD(rawData);
      histSeriesRef.current = chart.addSeries(HistogramSeries, {
        priceLineVisible: false,
      }, INDICATOR_PANE_INDEX, { heightRatio: INDICATOR_HEIGHT_RATIO });
      histSeriesRef.current.setData(histogram);
      macdSeriesRef.current = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: false,
      }, INDICATOR_PANE_INDEX);
      macdSeriesRef.current.setData(macd);
      signalSeriesRef.current = chart.addSeries(LineSeries, {
        color: "#f97316",
        lineWidth: 2,
        priceLineVisible: false,
      }, INDICATOR_PANE_INDEX);
      signalSeriesRef.current.setData(signal);
    }
  }

  async function loadChartData(tk: string, per: Period) {
    setLoading(true);
    console.log("[Chart] loadChartData called:", tk, per);
    try {
      const data = await getChartData(tk, per);
      console.log("[Chart] Got data:", data?.length ?? 0, "records");
      if (!data || data.length === 0) { setLoading(false); return; }
      const validData = data.filter(d => d.open && d.high && d.low && d.close && d.volume !== undefined);
      console.log("[Chart] Valid data:", validData.length, "records");
      if (validData.length === 0) { setLoading(false); return; }

      // Update data with version bump - this triggers all dependent effects
      setRawData(validData);
      setDataVersion(v => v + 1);
      // Note: tooltip is set in useEffect when rawData changes
    } catch (error) {
      console.error("[StockChart] Failed:", error);
    } finally {
      setLoading(false);
    }
  }

  function renderMainChart(data: ChartData[]) {
    console.log("[Chart] renderMainChart, series:", !!candleSeriesRef.current, !!volumeSeriesRef.current);
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !mainChartApi.current) {
      console.log("[Chart] Missing series refs");
      return;
    }

    const candleData: CandlestickData<Time>[] = data.map(d => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData: HistogramData<Time>[] = data.map((d, i) => ({
      time: d.date as Time,
      value: d.volume,
      color: i > 0 && d.close >= data[i - 1].close ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
    }));

    console.log("[Chart] Setting data, candles:", candleData.length, "vol:", volumeData.length);
    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (chartType === "candle_ma") {
      if (maSeriesRef.current) {
        maSeriesRef.current.setData(calculateSMA(data, 10));
        maSeriesRef.current.applyOptions({ visible: true });
      } else {
        maSeriesRef.current = mainChartApi.current.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          priceLineVisible: false,
        });
        maSeriesRef.current.setData(calculateSMA(data, 10));
      }
    } else if (maSeriesRef.current) {
      maSeriesRef.current.applyOptions({ visible: false });
    }

    mainChartApi.current.timeScale().fitContent();
  }

  // Period change - triggers loadChartData which bumps dataVersion
  useEffect(() => {
    if (!mainChartApi.current || !open) return;
    loadChartData(ticker, period);
  }, [period, open, ticker]);

  // Chart type change - bump version to trigger unified render effect
  useEffect(() => {
    if (!open || rawData.length === 0) return;
    // Bump dataVersion to trigger the unified render effect
    setDataVersion(v => v + 1);
  }, [chartType, open]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (mainChartApi.current && mainChartRef.current) {
        mainChartApi.current.applyOptions({
          width: mainChartRef.current.clientWidth,
          height: mainChartRef.current.clientHeight || 400,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[98vh] overflow-hidden flex flex-col p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between flex-wrap gap-2 text-[#e0e0e0]">
            <span className="text-[#e0e0e0]">{name} ({ticker})</span>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex gap-1 bg-[var(--color-muted)] rounded p-1">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      chartType === ct.value
                        ? "bg-blue-500 text-white"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <Button
                    key={p.value}
                    variant={period === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriod(p.value)}
                  >
                    {t(p.label)}
                  </Button>
                ))}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Chart Container */}
        <div className="flex-1 flex flex-col min-h-0 p-1">
          {/* OHLC - Shows current or last visible candle */}
          {tooltip && (
            <div className="bg-card border rounded px-3 py-2 mb-2 flex gap-4 text-xs font-mono flex-wrap shrink-0">
              <span className="text-muted-foreground">{tooltip.date}</span>
              <span className="text-green-600">{t("chart.ohlc_open")} {tooltip.open.toFixed(2)}</span>
              <span className="text-red-600">{t("chart.ohlc_high")} {tooltip.high.toFixed(2)}</span>
              <span className="text-blue-600">{t("chart.ohlc_low")} {tooltip.low.toFixed(2)}</span>
              <span className="font-semibold text-yellow-400">{t("chart.ohlc_close")} {tooltip.close.toFixed(2)}</span>
              <span className="text-muted-foreground">{t("chart.volume")} {tooltip.volume.toLocaleString()}</span>
              {chartType === "candle_ma" && tooltip.ma10 !== undefined && (
                <span className="text-amber-400">{t("chart.ma10")} {tooltip.ma10.toFixed(2)}</span>
              )}
              {chartType === "kd" && tooltip.k !== undefined && tooltip.d !== undefined && (
                <>
                  <span className="text-blue-400">{t("chart.k_value")} {tooltip.k.toFixed(1)}</span>
                  <span className="text-orange-400">{t("chart.d_value")} {tooltip.d.toFixed(1)}</span>
                </>
              )}
              {chartType === "macd" && tooltip.macd !== undefined && tooltip.signal !== undefined && (
                <>
                  <span className="text-blue-400">{t("chart.macd")} {tooltip.macd.toFixed(2)}</span>
                  <span className="text-orange-400">{t("chart.signal")} {tooltip.signal.toFixed(2)}</span>
                  {tooltip.histogram !== undefined && (
                    <span className={tooltip.histogram >= 0 ? "text-green-400" : "text-red-400"}>
                      {t("chart.histogram")} {tooltip.histogram.toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Main Chart */}
          <div className="relative" style={{ height: "70vh", minHeight: "500px" }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            <div ref={mainChartRef} style={{ width: "100%", height: "100%" }} />
          </div>

          {/* Indicator pane is now embedded in main chart via panes API */}

          {/* Legend */}
          <div className="flex gap-4 text-xs text-muted-foreground justify-center flex-wrap py-1 shrink-0 mt-auto">
            {(chartType === "candle" || chartType === "candle_ma") && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-green-500"></span>
                {t("chart.volume")}
              </span>
            )}
            {chartType === "candle_ma" && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-500"></span>
                MA10
              </span>
            )}
            {chartType === "kd" && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-blue-500"></span>
                  {t("chart.k_value")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-orange-500"></span>
                  {t("chart.d_value")}
                </span>
              </>
            )}
            {chartType === "macd" && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-blue-500"></span>
                  {t("chart.macd")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-orange-500"></span>
                  {t("chart.signal")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500/50"></span>
                  {t("chart.histogram")}
                </span>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}