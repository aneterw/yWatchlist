# yWatchlist — Stock Watchlist Manager

Modern cross-platform stock/index/ETF/forex/cryptocurrency watchlist manager built with Tauri + React + TypeScript. Features include K-line charts, price alerts, multi-language support, and multiple themes. Please note that Yahoo Finance quotes are typically delayed by 15 to 20 minutes. Data is for reference only and should not be used as a basis for any investment decisions.

---

## 1. Installation & Startup

### Prerequisites

- **Node.js** 18 or higher
- **Python** 3.8 or higher (for backend data fetching)
- **Rust** toolchain (for Tauri build)

### 1.1 Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Python backend packages
pip install -r python/requirements.txt
```

Or install individually:

```bash
pip install yfinance requests
```

### 1.2 Run in Development Mode

```bash
# Start frontend dev server
npm run dev

# Or use Tauri dev mode (requires frontend build first)
npm run tauri dev
```

### 1.3 Build for Production

```bash
npm run tauri build
```

---

## 2. Feature Overview

### 2.1 Default Watchlists

Program automatically creates default watchlists on startup:

| Watchlist Name     | Contents                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global Indices** | Dow Jones, S&P 500, NASDAQ, Philadelphia Semiconductor, Taiwan Weighted, SSE Composite, SZSE Component, Hang Seng, Nikkei 225, Korea KOSPI, Singapore STI, Germany DAX, France CAC 40, UK FTSE 100 |
| **Tech ETF**       | QQQ (NASDAQ-100), VGT (Technology Select SPDR)                                                                                                                                                     |

### 2.2 Quotes

- Fetch delayed prices, change, % change, volume from Yahoo Finance API
- **Auto-update every 10 minutes** (toggleable)
- Manual refresh for current watchlist or all watchlists
- Color indicators: Up (red), Down (green), Unchanged (gray)

### 2.3 K-Line Charts (Double-click Asset)

- Professional candlestick charts (powered by lightweight-charts)
- Three periods: Daily (2 years), Weekly (10 years), Monthly (30 years)
- Supports zoom and pan

### 2.4 Fundamental Analysis (Right-click Menu)

Complete financial metrics analysis in three categories:

| Category               | Metrics                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Valuation**          | Market Cap, Trailing PE, Forward PE, PEG, Price/Book, EV/EBITDA               |
| **Profitability**      | EPS, ROE, ROA, ROIC, Operating Margin, Profit Margin                          |
| **Yield & Risk**       | Dividend Yield, Beta, FCF Yield, Quick Ratio, Short %                         |
| **Analyst & Holdings** | Target Mean/Median Price, Analyst Count, Rating, Insider %, Institutional %   |
| **52W Range**          | 52W High, 52W Low, Range Position                                             |
| **Cash Flow**          | Free Cash Flow, Operating Cash Flow, FCF Yield, FCF Dividend Coverage, ROIC   |
| **Revenue & Growth**   | Total Revenue, Total Liabilities, Total Cash, Earnings Growth, Revenue Growth |

### 2.5 Price Alerts

- Set high/low price threshold alerts
- Trigger Windows system notifications (auto-dismiss after 12 seconds)
- Manage alerts individually per stock

### 2.6 Search Function

- Search by ticker or company name
- Offline local search (built-in stock index)
- Double-click to add directly to watchlist

---

## 3. Theme System

### 10 Dark Themes

| Theme              | Style                                                 |
| ------------------ | ----------------------------------------------------- |
| **Dark**           | Classic dark, unified background with white text      |
| **Ocean**          | Deep sea blue, golden accents                         |
| **Forest**         | Forest green, natural earth tones                     |
| **Sunset**         | Sunset purple, warm tones                             |
| **Neon**           | Neon style, vibrant contrast                          |
| **Elegant**        | Elegant gold, black-gold palette                      |
| **Frosted Purple** | Frosted glass purple, dreamy gradients + glass effect |
| **Frosted Blue**   | Ice blue glass, fresh and transparent                 |
| **Frosted Cyan**   | Cyan glass, natural and soothing                      |

Frosted glass themes feature:

- Semi-transparent glass panel effects
- Background gradients with subtle textures
- 12px frosted blur
- Soft shadows and glowing borders

---

## 4. Multi-Language

Supports 6 languages, auto-detects browser settings:

- 繁體中文 (Traditional Chinese)
- 簡體中文 (Simplified Chinese)
- English
- 日本語 (Japanese)
- 한국어 (Korean)
- Español (Spanish)

---

## 5. Customization

### Font Settings

Supports all Windows installed fonts:

- System Default, Noto Sans, Microsoft JhengHei, Arial, Segoe UI, Cambria, Verdana, Tahoma, DFKai-SB, MingLiU, SimSun, Courier New, Consolas

### Zoom Levels

5 zoom options: 75%, 87.5%, 100%, 112.5%, 125%

### Data Storage

All settings auto-saved to browser localStorage:

- Watchlist contents
- Currently selected watchlist
- Language setting
- Theme setting
- Font and zoom
- Price alerts

---

## 6. Technical Architecture

| Layer             | Technology                         |
| ----------------- | ---------------------------------- |
| **Framework**     | Tauri 2.x (cross-platform desktop) |
| **Frontend**      | React 18 + TypeScript + Vite       |
| **Styling**       | Tailwind CSS + CSS Variables       |
| **Charts**        | lightweight-charts 5.x             |
| **UI Components** | Radix UI                           |
| **i18n**          | i18next + react-i18next            |
| **Backend**       | Python (yfinance + requests)       |

---

## 7. FAQ

### Q: Can't find a ticker?

1. Try entering the Yahoo Finance formatted ticker directly (e.g., `2330.TW`, `0700.HK`, `601318.SS`)
2. Crypto format: `BTC-USD`, `ETH-USD`

### Q: Update delayed or failing?

- Check network connection
- Yahoo Finance may have rate limits; try again later

### Q: Candlestick chart not displaying?

- Some cryptocurrencies or forex pairs have limited data; chart may appear blank

---

## 8. Quick Start

```
1. Install deps: npm install && pip install -r python/requirements.txt
2. Run dev: npm run tauri dev
3. Click "Global Indices" on the left to view global indices
4. Click "Refresh All" to get delayed quotes
5. Double-click any asset to open K-line chart
6. Right-click an asset → Fundamental Analysis
7. Switch themes and languages from the menu
```

---

*Enjoy!*