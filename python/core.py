"""
yWatchlist Core Backend
CLI interface for Tauri integration
Commands: fetch-price, fetch-prices, search, load, save, chart, fundamental
"""

import sys
import json
import os
import re
import argparse
from typing import Any, Optional

try:
    import yfinance as yf
    import requests
except ImportError:
    print(json.dumps({"error": "yfinance or requests not installed"}))
    sys.exit(1)

# Yahoo Finance Search API
YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(SCRIPT_DIR, "watchlist_data.json")
TICKERS_FILE = os.path.join(SCRIPT_DIR, "top250_tickers.json")

# Common tickers fallback
COMMON_TICKERS = [
    ("AAPL", "Apple"), ("MSFT", "Microsoft"), ("GOOGL", "Alphabet"), ("AMZN", "Amazon"),
    ("NVDA", "NVIDIA"), ("META", "Meta"), ("TSLA", "Tesla"), ("JPM", "JPMorgan"),
    ("V", "Visa"), ("PG", "Procter & Gamble"), ("2330.TW", "台積電"), ("0700.HK", "騰訊"),
    ("601318.SS", "中國平安"), ("BTC-USD", "Bitcoin"), ("ETH-USD", "Ethereum"),
    ("GC=F", "Gold"), ("CL=F", "Crude Oil"), ("^GSPC", "S&P 500"), ("^IXIC", "NASDAQ"),
]

def load_tickers() -> list[tuple]:
    """Load ticker list from file or use fallback."""
    if os.path.exists(TICKERS_FILE):
        try:
            with open(TICKERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            tickers = data.get("tickers", [])
            # Convert [display, symbol, name] to [(symbol, name)]
            return [(t[1], t[2]) for t in tickers]
        except Exception as e:
            print(f"Error loading tickers: {e}", file=sys.stderr)
    return COMMON_TICKERS

def fetch_price(ticker: str) -> dict:
    """Fetch price data for a single ticker."""
    try:
        t = yf.Ticker(ticker)
        info = t.info
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev = info.get("previousClose") or info.get("regularMarketPreviousClose")
        change = pct = None
        if price is not None and prev is not None and prev != 0:
            change = price - prev
            pct = (change / prev) * 100
        return {
            "ticker": ticker,
            "name": info.get("shortName") or info.get("longName") or ticker,
            "price": price,
            "change": change,
            "pct_change": pct,
            "volume": info.get("volume") or info.get("regularMarketVolume"),
            "market_cap": info.get("marketCap"),
        }
    except Exception as e:
        return {"ticker": ticker, "name": ticker, "price": None, "change": None,
                "pct_change": None, "volume": None, "market_cap": None, "error": str(e)}

def fetch_prices(tickers: list[str]) -> list[dict]:
    """Fetch prices for multiple tickers."""
    return [fetch_price(t) for t in tickers]

def search_yahoo_api(query: str, limit: int = 20) -> list[dict]:
    """Search tickers using Yahoo Finance API."""
    try:
        params = {
            "q": query,
            "quotes_count": limit,
            "news_count": 0,
            "enableFuzzyQuery": "false",
            "quotesQueryId": "tss_match_phrase_query",
        }
        headers = {"User-Agent": USER_AGENT}
        resp = requests.get(YAHOO_SEARCH_URL, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for quote in data.get("quotes", []):
            symbol = quote.get("symbol", "")
            name = quote.get("longname") or quote.get("shortname") or quote.get("symbol", "")
            exchange = quote.get("exchange", "")
            quote_type = quote.get("quoteType", "")

            # Build display name
            if quote_type in ("EQUITY", "ETF", "MUTUALFUND"):
                display = f"{name} - {symbol}"
            else:
                display = f"{symbol} - {name}"

            results.append({
                "display": display,
                "symbol": symbol,
                "name": name,
                "exchange": exchange,
                "quote_type": quote_type,
            })
        return results
    except Exception as e:
        print(f"Yahoo API search failed: {e}", file=sys.stderr)
        return []


def search_tickers(query: str, limit: int = 20) -> list[dict]:
    """Search tickers by name or symbol using Yahoo Finance API."""
    if not query:
        return []

    # First try Yahoo Finance API
    results = search_yahoo_api(query, limit)
    if results:
        return results[:limit]

    # Fallback to local search
    q = query.upper()
    tickers = load_tickers()
    results = []

    # Exact match first
    for sym, name in tickers:
        if sym.upper() == q or name.upper() == q:
            results.append({"display": f"{sym} - {name}", "symbol": sym, "name": name})

    if len(results) >= limit:
        return results[:limit]

    # Prefix match
    for sym, name in tickers:
        if sym.upper().startswith(q) and not any(r["symbol"] == sym for r in results):
            results.append({"display": f"{sym} - {name}", "symbol": sym, "name": name})

    if len(results) >= limit:
        return results[:limit]

    # Contains match
    for sym, name in tickers:
        if q in name.upper() and not any(r["symbol"] == sym for r in results):
            results.append({"display": f"{sym} - {name}", "symbol": sym, "name": name})

    return results[:limit]

def load_data() -> dict:
    """Load watchlist data from JSON file."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading data: {e}", file=sys.stderr)
    return get_default_data()

def get_default_data() -> dict:
    """Return default watchlist data."""
    return {
        "active_wl": "全球主要指數",
        "watchlists": {
            "全球主要指數": [
                ["SPX", "^GSPC", "S&P 500"], ["NASDAQ", "^IXIC", "NASDAQ Composite"],
                ["DOW", "^DJI", "Dow Jones"], ["FTSE100", "^FTSE", "UK FTSE 100"],
                ["DAX", "^GDAXI", "Germany DAX"], ["日經225", "^N225", "Nikkei 225"],
                ["上證綜指", "000001.SS", "SSE Composite"], ["恒生指數", "^HSI", "Hang Seng"],
                ["KOSPI", "^KS11", "Korea KOSPI"], ["ASX200", "^AXJO", "Australia ASX 200"],
            ],
            "科技股 ETF": [
                ["QQQ", "QQQ", "Invesco QQQ Trust"], ["VGT", "VGT", "Vanguard Info Tech"],
            ],
        },
        "lang": "zh-TW",
        "theme": "frosted-purple",
        "alerts": {},
    }

def save_data(data: dict) -> bool:
    """Save watchlist data to JSON file."""
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving data: {e}", file=sys.stderr)
        return False

def get_chart_data(ticker: str, period: str = "1d") -> list[dict]:
    """Get K-line chart data."""
    import pandas as pd
    import numpy as np

    interval_map = {"1d": ("1d", "2y"), "1wk": ("1wk", "10y"), "1mo": ("1mo", "30y")}
    interval, years = interval_map.get(period, ("1d", "2y"))

    try:
        raw = yf.Ticker(ticker).history(period=years, interval=interval)
        if raw is None or raw.empty:
            return []

        raw = raw.tail(200)
        result = []

        for date, row in raw.iterrows():
            o = float(row["Open"])
            h = float(row["High"])
            l = float(row["Low"])
            c = float(row["Close"])
            v = int(row["Volume"])

            # Skip rows with NaN/Inf/zero values — lightweight-charts won't render them
            if not np.isfinite(o) or not np.isfinite(h) or not np.isfinite(l) or not np.isfinite(c):
                continue
            if h <= 0 or l <= 0 or o <= 0 or c <= 0:
                continue
            if v < 0:
                v = 0

            result.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(o, 4),
                "high": round(h, 4),
                "low": round(l, 4),
                "close": round(c, 4),
                "volume": v,
            })
        return result
    except Exception as e:
        return [{"error": str(e)}]

def get_fundamental(ticker: str) -> dict:
    """Get fundamental analysis data."""
    try:
        t = yf.Ticker(ticker)
        info = t.info

        return {
            "ticker": ticker,
            "company_name": info.get("longName") or info.get("shortName") or ticker,
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "eps": info.get("trailingEps"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "profit_margin": info.get("profitMargins"),
            "operating_margin": info.get("operatingMargins"),
            "dividend_yield": info.get("dividendYield"),
            "beta": info.get("beta"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "analyst_target": info.get("targetMeanPrice"),
            "analyst_count": info.get("numberOfAnalystOpinions"),
            "recommendation": info.get("recommendationKey"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
            "error": None,
        }
    except Exception as e:
        return {"ticker": ticker, "error": str(e)}


def get_fundamental_full(ticker: str) -> dict:
    """
    Get comprehensive fundamental analysis data with all categories.
    Used for the full fundamental analysis view.
    """
    import pandas as pd
    import math

    def safe_val(val, fmt="number", default=None):
        """Safely format a value with null/undefined/NaN handling."""
        if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
            return default
        if fmt == "percent":
            return f"{val * 100:.2f}%" if val is not None else default
        elif fmt == "money":
            if val is None:
                return default
            if abs(val) >= 1e12:
                return f"${val/1e12:.2f}T"
            elif abs(val) >= 1e9:
                return f"${val/1e9:.2f}B"
            elif abs(val) >= 1e6:
                return f"${val/1e6:.2f}M"
            else:
                return f"${val:,.0f}"
        elif fmt == "price":
            return f"${val:.2f}" if val is not None else default
        elif fmt == "ratio":
            return f"{val:.2f}" if val is not None else default
        elif fmt == "number":
            if val is None:
                return default
            if abs(val) >= 1e9:
                return f"{val/1e9:.2f}B"
            elif abs(val) >= 1e6:
                return f"{val/1e6:.2f}M"
            elif abs(val) >= 1e3:
                return f"{val/1e3:.1f}K"
            else:
                return f"{val:,.0f}"
        return val

    try:
        t = yf.Ticker(ticker)
        info = t.info

        # Get current price info
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
        price_change = None
        price_pct = None
        if current_price and prev_close and prev_close != 0:
            price_change = current_price - prev_close
            price_pct = (price_change / prev_close) * 100

        # Calculate advanced metrics
        roic = None
        fcf_yield = None
        fcf_coverage = None
        op_cashflow = None
        total_liabilities = None
        range_position = None

        # Extra stock info
        today_high = info.get("fiftyDayHigh") or info.get("dayHigh")
        today_low = info.get("fiftyDayLow") or info.get("dayLow")

        try:
            financials = t.financials
            balancesheet = t.balance_sheet
            cashflow = t.cashflow

            market_cap = info.get("marketCap", 0) or 0

            # Free Cash Flow
            fcf = None
            for key in ["Free Cash Flow", "Operating Cash Flow"]:
                if key in cashflow.index:
                    fcf = cashflow.loc[key].iloc[0]
                    break

            # Dividend payout
            dividend_payout = 0
            for key in ["Cash Dividends Paid", "Dividend Payout"]:
                if key in cashflow.index:
                    val = cashflow.loc[key].iloc[0]
                    if val is not None:
                        dividend_payout = abs(val)
                    break

            # EBIT and taxes for ROIC
            ebit = None
            for key in ["EBIT", "Operating Income"]:
                if key in financials.index:
                    ebit = financials.loc[key].iloc[0]
                    break

            tax_provision = 0
            pretax_income = 0
            for key in ["Tax Provision", "Income Tax Expense"]:
                if key in financials.index:
                    tax_provision = abs(financials.loc[key].iloc[0])
                    break
            for key in ["Pretax Income"]:
                if key in financials.index:
                    pretax_income = financials.loc[key].iloc[0]
                    break

            effective_tax_rate = (tax_provision / pretax_income) if pretax_income > 0 else 0
            nopat = (ebit or 0) * (1 - effective_tax_rate)

            # Total equity
            total_equity = 0
            for key in ["Stockholders Equity", "Total Equity Gross"]:
                if key in balancesheet.index:
                    total_equity = balancesheet.loc[key].iloc[0] or 0
                    break

            # Debt
            short_debt = 0
            long_debt = 0
            for key in ["Current Debt", "Short Long Term Debt"]:
                if key in balancesheet.index:
                    short_debt = balancesheet.loc[key].iloc[0] or 0
                    break
            for key in ["Long Term Debt"]:
                if key in balancesheet.index:
                    long_debt = balancesheet.loc[key].iloc[0] or 0
                    break
            total_debt = short_debt + long_debt

            # Cash
            cash_and_equiv = 0
            st_investments = 0
            for key in ["Cash And Cash Equivalents"]:
                if key in balancesheet.index:
                    cash_and_equiv = balancesheet.loc[key].iloc[0] or 0
                    break
            for key in ["Other Short Term Investments", "Short Term Investments"]:
                if key in balancesheet.index:
                    st_investments = balancesheet.loc[key].iloc[0] or 0
                    break
            cash_pool = cash_and_equiv + st_investments

            invested_capital = total_equity + total_debt - cash_pool
            roic = (nopat / invested_capital * 100) if invested_capital > 0 else None

            # FCF Yield
            fcf_yield = (fcf / market_cap * 100) if market_cap > 0 else None

            # FCF Dividend Coverage
            fcf_coverage = (fcf / dividend_payout) if dividend_payout > 0 else None

            # Operating Cash Flow
            for key in ["Operating Cash Flow"]:
                if key in cashflow.index:
                    op_cashflow = cashflow.loc[key].iloc[0]
                    break

            # Total Liabilities
            for key in ["Total Liabilities Net Minority Interest"]:
                if key in balancesheet.index:
                    total_liabilities = balancesheet.loc[key].iloc[0]
                    break

        except Exception:
            pass

        # 52W Range Position
        w52_high = info.get("fiftyTwoWeekHigh")
        w52_low = info.get("fiftyTwoWeekLow")
        if current_price and w52_high and w52_low and w52_high > w52_low:
            range_position = ((current_price - w52_low) / (w52_high - w52_low)) * 100

        result = {
            # Company Info
            "ticker": ticker,
            "company_name": info.get("longName") or info.get("shortName") or ticker,
            "current_price": safe_val(current_price, "price"),
            "price_change": f"{price_change:+.2f}" if price_change is not None else None,
            "price_pct": f"{price_pct:+.2f}%" if price_pct is not None else None,
            "sector": info.get("sector"),
            "industry": info.get("industry"),

            # Stock Info Card (11 metrics)
            "prev_close": safe_val(prev_close, "price"),
            "today_high": safe_val(today_high, "price"),
            "today_low": safe_val(today_low, "price"),
            "volume": safe_val(info.get("volume"), "number"),

            # Valuation Metrics
            "market_cap": safe_val(info.get("marketCap"), "money"),
            "trailing_pe": safe_val(info.get("trailingPE"), "ratio"),
            "forward_pe": safe_val(info.get("forwardPE"), "ratio"),
            "peg": safe_val(info.get("pegRatio"), "ratio"),
            "price_to_book": safe_val(info.get("priceToBook"), "ratio"),
            "ev_ebitda": safe_val(info.get("enterpriseToEbitda"), "ratio"),

            # Profitability Metrics
            "eps": safe_val(info.get("trailingEps"), "price"),
            "roe": safe_val(info.get("returnOnEquity"), "percent"),
            "roa": safe_val(info.get("returnOnAssets"), "percent"),
            "roic": f"{roic:.2f}%" if roic is not None else None,
            "op_margin": safe_val(info.get("operatingMargins"), "percent"),
            "profit_margin": safe_val(info.get("profitMargins"), "percent"),

            # Yield & Risk
            "dividend_yield": safe_val(info.get("dividendYield"), "percent"),
            "beta": safe_val(info.get("beta"), "ratio"),
            "fcf_yield": f"{fcf_yield:.2f}%" if fcf_yield is not None else None,
            "quick_ratio": safe_val(info.get("quickRatio"), "ratio"),
            "short_pct": safe_val(info.get("shortPercentOfFloat"), "percent"),

            # Analyst & Holdings
            "target_mean": safe_val(info.get("targetMeanPrice"), "price"),
            "target_median": safe_val(info.get("targetMedianPrice"), "price"),
            "analyst_count": str(info.get("numberOfAnalystOpinions")) if info.get("numberOfAnalystOpinions") else None,
            "rec_mean": safe_val(info.get("recommendationMean"), "ratio"),
            "insider_pct": safe_val(info.get("heldPercentInsiders"), "percent"),
            "inst_pct": safe_val(info.get("heldPercentInstitutions"), "percent"),

            # 52W Range
            "52w_high": safe_val(w52_high, "price"),
            "52w_low": safe_val(w52_low, "price"),
            "range_position": f"{range_position:.2f}%" if range_position is not None else None,

            # Cash Flow
            "fcf": safe_val(info.get("freeCashflow"), "money"),
            "op_cashflow": safe_val(op_cashflow, "money"),
            "fcf_coverage": f"{fcf_coverage:.2f}" if fcf_coverage is not None else None,

            # Growth
            "total_revenue": safe_val(info.get("totalRevenue"), "money"),
            "total_liabilities": safe_val(total_liabilities, "money"),
            "total_cash": safe_val(info.get("totalCash"), "money"),
            "earnings_growth": safe_val(info.get("earningsGrowth"), "percent"),
            "revenue_growth": safe_val(info.get("revenueGrowth"), "percent"),

            "error": None,
        }

        return result

    except Exception as e:
        return {"ticker": ticker, "company_name": ticker, "error": str(e)}


def get_news(ticker: str) -> list[dict]:
    """
    Get related news for a ticker.
    """
    try:
        t = yf.Ticker(ticker)
        news_list = t.news or []

        if not news_list:
            return []

        results = []
        for news in news_list[:10]:  # Limit to 10 items
            content = news.get("content", {})
            title = content.get("title", "")
            link_dict = content.get("clickThroughUrl", {})
            link = link_dict.get("url", "") if isinstance(link_dict, dict) else ""
            provider_dict = content.get("provider", {})
            publisher = provider_dict.get("displayName", "未知來源") if isinstance(provider_dict, dict) else "未知來源"
            pub_date = content.get("pubDate", "")
            # Format time
            if "T" in pub_date:
                pub_date = pub_date.replace("T", " ").replace("Z", " UTC")
                # Take only first 19 chars (YYYY-MM-DD HH:MM:SS)
                pub_date = pub_date[:19]

            results.append({
                "title": title or "（無標題）",
                "link": link or "",
                "publisher": publisher,
                "pub_date": pub_date or "未知時間"
            })

        return results

    except Exception as e:
        return [{"error": str(e)}]

def main():
    parser = argparse.ArgumentParser(description="yWatchlist Backend")
    parser.add_argument("command", choices=["fetch-price", "fetch-prices", "search",
                                              "load", "save", "chart", "fundamental", "fundamental-full", "news"])
    parser.add_argument("args", nargs="*", help="Command arguments")
    args = parser.parse_args()

    result = None

    if args.command == "fetch-price":
        ticker = args.args[0] if args.args else ""
        result = fetch_price(ticker)

    elif args.command == "fetch-prices":
        tickers = args.args if args.args else []
        result = fetch_prices(tickers)

    elif args.command == "search":
        query = args.args[0] if args.args else ""
        limit = int(args.args[1]) if len(args.args) > 1 else 20
        result = search_tickers(query, limit)

    elif args.command == "load":
        result = load_data()

    elif args.command == "save":
        if args.args:
            data = json.loads(args.args[0])
            success = save_data(data)
            result = {"success": success}
        else:
            result = {"error": "No data provided"}

    elif args.command == "chart":
        ticker = args.args[0] if args.args else ""
        period = args.args[1] if len(args.args) > 1 else "1d"
        result = get_chart_data(ticker, period)

    elif args.command == "fundamental":
        ticker = args.args[0] if args.args else ""
        result = get_fundamental(ticker)

    elif args.command == "fundamental-full":
        ticker = args.args[0] if args.args else ""
        result = get_fundamental_full(ticker)

    elif args.command == "news":
        ticker = args.args[0] if args.args else ""
        result = get_news(ticker)

    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()