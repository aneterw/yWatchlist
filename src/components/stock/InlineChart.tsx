import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createChart, ColorType } from "lightweight-charts";
import { CandlestickSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData } from "lightweight-charts";
import { getChartData } from "@/lib/tauri";
import type { ChartData } from "@/types";

interface InlineChartProps {
  ticker: string;
  name: string;
  visible: boolean;
}

type Period = "1d" | "1wk" | "1mo";

const PERIODS: { value: Period; label: string }[] = [
  { value: "1d", label: "chart.day" },
  { value: "1wk", label: "chart.week" },
  { value: "1mo", label: "chart.month" },
];

export function InlineChart({ ticker, name, visible }: InlineChartProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [period, setPeriod] = useState<Period>("1d");
  const [loading, setLoading] = useState(false);

  // Destroy chart when hidden
  useEffect(() => {
    if (!visible && chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }
  }, [visible]);

  // Create chart when visible
  useEffect(() => {
    if (!visible || !containerRef.current || chartRef.current) return;

    const container = containerRef.current;
    // Always use dark theme for chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#e0e0e0",
      },
      grid: {
        vertLines: { color: "#2a2a2a" },
        horzLines: { color: "#2a2a2a" },
      },
      width: container.clientWidth,
      height: 400,
    });

    // v5 API
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

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    loadChartData(ticker, period, candleSeries, volumeSeries);
  }, [visible, ticker]);

  // Reload data when period changes
  useEffect(() => {
    if (!visible || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    loadChartData(ticker, period, candleSeriesRef.current, volumeSeriesRef.current);
  }, [period, visible, ticker]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function loadChartData(
    tk: string,
    per: Period,
    cs: ISeriesApi<"Candlestick">,
    vs: ISeriesApi<"Histogram">
  ) {
    setLoading(true);
    try {
      const data = await getChartData(tk, per);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const validData = data.filter((d: ChartData) =>
        d.open && d.high && d.low && d.close && d.volume !== undefined
      );
      if (validData.length === 0) {
        setLoading(false);
        return;
      }

      const candleData: CandlestickData[] = validData.map((d: ChartData) => ({
        time: d.date as CandlestickData["time"],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      const volumeData: HistogramData[] = validData.map((d: ChartData, i: number) => {
        const prevClose = i > 0 ? validData[i - 1].close : d.close;
        return {
          time: d.date as HistogramData["time"],
          value: d.volume,
          color: d.close >= prevClose ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
        };
      });

      cs.setData(candleData);
      vs.setData(volumeData);
    } catch (error) {
      console.error("[InlineChart] Failed to load chart data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{name} ({ticker})</h3>
        <div className="flex gap-1 bg-[var(--color-muted)] rounded p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                period === p.value
                  ? "bg-blue-500 text-white"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              }`}
            >
              {t(p.label)}
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {!loading && (
        <div ref={containerRef} style={{ width: "100%", height: "400px" }} />
      )}
    </div>
  );
}