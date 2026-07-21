# yWatchlist — 智慧自選股管理器 <a id="ywatchlist--智慧自選股管理器"></a>

現代化跨平台桌面自選股管理工具，支援**股票、指數、ETF、外匯、加密貨幣**。採用 **Tauri 2.x + React 18 + TypeScript** 建構，內建專業 K 線圖、價格提醒、多語系及九種主題。

> ⚠️ **免責聲明：** Yahoo Finance 報價通常延遲 15 至 20 分鐘。資料僅供參考，不應作為任何投資決策之依據。

---

## 🌐 語言切換 / Language Switch

| [繁體中文](#ywatchlist--智慧自選股管理器) | [English](#ywatchlist--smart-watchlist-manager) |
|------------------------------------------|------------------------------------------------|

---

## 目錄

- [功能總覽](#功能總覽)
- [系統需求](#系統需求)
- [安裝步驟](#安裝步驟)
- [執行應用程式](#執行應用程式)
- [建置發布版本](#建置發布版本)
- [快速開始](#快速開始)
- [核心功能](#核心功能)
  - [自選股管理](#自選股管理)
  - [報價與自動更新](#報價與自動更新)
  - [專業 K 線圖](#專業-k-線圖)
  - [基本面分析](#基本面分析)
  - [價格提醒](#價格提醒)
  - [智慧搜尋](#智慧搜尋)
  - [代碼索引維護](#代碼索引維護)
- [主題系統](#主題系統)
- [多語系支援](#多語系支援)
- [個人化設定](#個人化設定)
- [資料儲存機制](#資料儲存機制)
- [技術架構](#技術架構)
- [常見問題](#常見問題)

---

## 功能總覽

| 功能 | 說明 |
|------|------|
| 📋 多清單管理 | 建立、重新命名、刪除、整理無限個自選股清單 |
| 💹 延遲報價 | Yahoo Finance 即時報價，支援自動/手動更新 |
| 🕯️ K 線圖 | 專業蠟燭圖，支援均線、KD、MACD 指標 |
| 📊 基本面分析 | 30+ 財務指標，涵蓋七大類別 |
| 🔔 價格提醒 | 高/低價提醒，觸發時發送 Windows 系統通知 |
| 🔍 智慧搜尋 | 離線本地索引 + Yahoo 線上搜尋雙重備援 |
| 🎨 九種主題 | Dark、Ocean、Forest、Sunset、Neon、Elegant、Frosted Purple/Blue/Cyan |
| 🌐 六種語言 | 繁體中文、簡體中文、English、日本語、한국어、Español |
| ⌨️ 快捷鍵 | `Ctrl+K` 立即開啟搜尋 |

---

## 系統需求

- **作業系統：** Windows 10 / 11（64 位元）
- **WebView2：** Windows 10/11 已內建；若無請從 [Microsoft 官方](https://developer.microsoft.com/zh-tw/microsoft-edge/webview2/) 下載安裝

---

## 🚀 下載安裝（推薦）

### 直接下載 Release

1. 前往 [Releases](https://github.com/aneterw/yWatchlist/releases/latest) 下載：
   - **`yWatchlist_1.0.0_x64-setup.exe`** - Windows 安裝程式
   - **`python-embed-full.zip`** - Python 運行時

2. 安裝 `yWatchlist_1.0.0_x64-setup.exe`
3. 解壓縮 `python-embed-full.zip` 到安裝目錄
4. 啟動 yWatchlist

---

## 🔧 從源碼建置

### 1. 安裝前端相依套件

```bash
npm install
```

### 2. 安裝 Python 後端相依套件

```bash
pip install -r python/requirements.txt
```

或單獨安裝：

```bash
pip install yfinance pandas numpy
```

Python 後端提供以下功能：
- **報價資料** — 透過 `yfinance` 取得延遲行情
- **K 線歷史資料** — 供圖表渲染使用
- **基本面分析資料** — 財務比率、獲利能力、現金流等
- **股票新聞** — 取得最新相關報導

若未安裝 Python，應用程式仍可使用**模擬報價資料**正常運作，方便探索介面與圖表功能。

### 3. 驗證安裝

首次啟動時，應用程式會自動檢查 Python 環境與後端腳本是否存在。若任一缺失，視窗頂部會出現黃色警告橫幅，並提供 Python 下載連結。

---

## 執行應用程式

### 開發模式 — Tauri 桌面應用程式（推薦）

```bash
npm run tauri dev
```

啟動原生桌面視窗，可完整使用 Python 後端取得真實資料。

### 開發模式 — 純網頁預覽

```bash
npm run dev
```

在瀏覽器中開啟 React 應用程式。適合前端除錯。注意：由於 Python 後端運行在 Tauri 內部，純網頁模式下報價會回退為模擬資料。

### 建置發布版本

```bash
npm run tauri build
```

產出的安裝檔位於 `src-tauri/target/release/`。

---

## 快速開始

```
1. 安裝相依套件：npm install && pip install -r python/requirements.txt
2. 啟動應用程式：npm run tauri dev
3. 左側邊欄預設顯示「Global Indices」全球指數清單
4. 點擊「Refresh Current」手動更新，或等待每 10 分鐘自動更新
5. 雙擊任一商品，開啟專業 K 線圖
6. 點擊 📈 圖示（或右鍵），開啟基本面分析面板
7. 使用 Ctrl+K 或搜尋按鈕，新增新股票至清單
8. 在上方工具列切換主題、語言與字型
```

### 預設觀察清單

應用程式啟動時自動建立兩組預設清單：

| 清單名稱 | 內容 |
|---------|------|
| **Global Indices** | 道瓊 (^DJI)、標普 500 (^GSPC)、納斯達克 (^IXIC)、費城半導體 (^SOX)、台灣加權 (^TWII)、上海證券綜合 (000001.SS)、深證成分 (399001.SZ)、恆生 (^HSI)、日經 225 (^N225)、韓國 KOSPI (^KS11)、新加坡 STI (^STI)、德國 DAX (^GDAXI)、法國 CAC 40 (^FCHI)、英國 FTSE 100 (^FTSE) |
| **Tech ETF** | QQQ（那斯達克 100）、VGT（科技 SPDR） |

---

## 核心功能

### 自選股管理

- **建立清單** — 點擊左側邊欄的 `+` 按鈕
- **重新命名** — 滑鼠懸停於清單名稱上，點擊鉛筆圖示
- **刪除清單** — 點擊垃圾桶圖示（會彈出確認對話框）
- **調整順序** — 每列右側有上移/下移箭頭按鈕
- **移除股票** — 第一次點擊選中，再次點擊確認刪除
- **新增股票** — 點擊「新增股票」按鈕、搜尋 Modal，或按 `Ctrl+K`

### 報價與自動更新

- 報價資料來源為 **Yahoo Finance**，經由 Python 後端取得
- 每筆報價包含：目前價格、漲跌點數、漲跌幅百分比、成交量
- 顏色提示：**綠色代表上漲**、**紅色代表下跌**、**灰色代表持平**
- **自動更新**預設開啟，間隔可調：
  - 每 5 分鐘
  - 每 10 分鐘（預設）
  - 每 30 分鐘
  - 每 60 分鐘
- 點擊上方時鐘按鈕可開關自動更新
- 手動更新選項：
  - **刷新目前清單** — 僅更新當前選取的清單
  - **刷新全部** — 更新所有清單中的所有股票

### 專業 K 線圖

支援兩種開啟方式：雙擊股票，或點擊 📊 圖示。

**時間週期：**

| 週期 | 資料範圍 |
|------|---------|
| 日線 | 2 年 |
| 週線 | 10 年 |
| 月線 | 30 年 |

**圖表類型：**

| 類型 | 說明 |
|------|------|
| 蠟燭圖 | 純蠟燭圖 + 成交量 |
| 均線圖 | 蠟燭圖 + 10 日均線 |
| KD 指標 | 蠟燭圖 + KDJ 副圖 |
| MACD | 蠟燭圖 + MACD 柱狀圖、訊號線、MACD 線 |

**操作方式：**
- 滑鼠滾輪縮放
- 拖曳平移
- 游標懸停顯示 OHLCV 與指標數值
- 自動適應視窗大小

### 基本面分析

右鍵點擊股票，或點擊 📈 圖示開啟分析面板。資料由 Yahoo Finance 透過 Python 後端取得。

**公司資訊卡片：**
- 公司名稱、所屬產業與細分領域
- 目前價格、昨收、今日高低點
- 成交量、市值、本益比、殖利率、52 週高低、Beta、EPS

**七大指標類別（30+ 項指標）：**

| 類別 | 指標 |
|------|------|
| **估值指標** | 市值、靜態本益比、動態本益比、PEG、股價淨值比、EV/EBITDA |
| **獲利指標** | EPS、ROE、ROA、ROIC、營業利潤率、利潤率 |
| **殖利率與風險** | 殖利率、β 值、FCF 殖利率、速動比率、放空比例 |
| **分析師與持股** | 目標均價、目標中位價、分析師人數、評級、內部人持股、機構持股 |
| **52 週區間** | 52 週最高、52 週最低、區間位置 |
| **現金流** | 自由現金流、營業現金流、FCF 股利覆蓋率 |
| **營收與成長** | 總營收、總負債、總現金、盈餘成長率、營收成長率 |

**股票新聞：** 最新新聞標題，含發布者、日期，可點擊連結跳轉原文。

**Cookie 同意設定：** 提供 Yahoo Finance Cookie 同意管理對話框。

### 價格提醒

為每支股票設定高價與低價門檻：

1. 點擊股票列上的鈴鐺圖示
2. 輸入**高價門檻**（價格高於此值時通知）或**低價門檻**（價格低於此值時通知）
3. 儲存 — 提醒設定會跨會話持久保存

**通知行為：**
- 觸發時發送 **Windows 系統通知**（12 秒自動消失）
- 已設定提醒的鈴鐺變為黃色
- 懸停鈴鐺可查看當前門檻，觸發時顯示 ✓ 勾號
- 刪除提醒：懸停鈴鐺後點擊垃圾桶圖示

### 智慧搜尋

按 `Ctrl+K` 或點擊搜尋按鈕開啟。

**搜尋來源（依優先級排列）：**

1. **用戶自訂覆寫** — 自定義代碼-名稱對（⭐ 標示）
2. **本地代碼索引** — 內建離線熱門代碼庫
3. **Yahoo Finance 搜尋** — 線上搜尋備援
4. **常用代碼** — 精選的美股、亞洲股、加密貨幣、原物料清單

**特色功能：**
- Yahoo 搜尋帶 400ms 防抖動
- 搜尋結果可一鍵加入本地覆寫索引
- 直接輸入代碼按 Enter 即可手動新增
- 加入覆寫索引後可離線搜尋
- 雙擊結果可立即加入目前清單

### 代碼索引維護

點擊上方工具列的 ⚙️ 圖示進入索引維護頁面。

- **搜尋** — 在本機索引或 Yahoo 中查找代碼
- **新增** — 將新的代碼-名稱對加入覆寫清單
- **編輯** — 修改既有條目
- **刪除** — 移除覆寫條目（內建本地代碼無法刪除）
- **篩選** — 依代碼或名稱過濾列表
- 覆寫條目在搜尋結果中優先於內建索引顯示

---

## 主題系統

九種主題，設定會自動保存：

| 主題 | 風格 |
|------|------|
| **Dark** | 經典深色 — 統一背景配白色文字 |
| **Ocean** | 深海藍配金色強調 |
| **Forest** | 森林綠配大地色調 |
| **Sunset** | 夕陽紫暖色調 |
| **Neon** | 霓虹風活潑對比 |
| **Elegant** | 黑金奢華配色 |
| **Frosted Purple** ❄️ | 深色底煙燻彩玻、漸層背景、12px 毛玻璃模糊 |
| **Frosted Blue** ❄️ | 深色底冰藍玻璃、清新通透、12px 毛玻璃模糊 |
| **Frosted Cyan** ❄️ | 深色底青綠玻璃、自然舒緩、12px 毛玻璃模糊 |

**霜彩玻璃主題特色：**
- 半透明玻璃面板效果
- 徑向漸層 + 細微噪聲紋理背景
- 12px 毛玻璃模糊（backdrop-filter）
- 柔和陰影與發光邊框

在上方工具列的顯示器圖示下拉選單中切換主題。

---

## 多語系支援

六種語言，啟動時自動偵測瀏覽器設定：

| 代碼 | 語言 |
|------|------|
| `zh-TW` | 繁體中文 |
| `zh-CN` | 简体中文 |
| `en` | English |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `es` | Español |

語言偏好會自動保存，下次啟動時恢復。偵測邏輯支援區域前綴匹配（例如 `zh-HK` → `zh-TW`，`zh-SG` → `zh-CN`）。

---

## 個人化設定

### 字型

支援 13 種預設字型，也可輸入 Windows 已安裝的任意字型名稱：

系統預設、思源黑體、微軟正黑體、Arial、Segoe UI、Cambria、Verdana、Tahoma、標楷體、細明體、新細明體、Courier New、Consolas

自訂字型會套用至根層級，跨會話保存。

### 縮放等級

五種預設縮放：**75%、87.5%、100%、112.5%、125%**

透過修改根層級 `font-size` 實現整體 UI 等比縮放。

---

## 資料儲存機制

所有使用者資料儲存於 **browser localStorage**：

| 儲存資料 | Key |
|---------|-----|
| 自選股清單 + 目前選取 | `ywatchlist_data` |
| 語言設定 | `ywatchlist_language` |
| 主題設定 | `ywatchlist_theme` |
| 字型設定 | `ywatchlist_font` |
| 縮放等級 | 包含於 `ywatchlist_data` |
| 自動更新狀態 | `ywatchlist_auto_refresh` |
| 自動更新間隔 | `ywatchlist_auto_refresh_interval` |
| 價格提醒 | `ywatchlist_alerts` |
| 代碼覆寫索引 | `ywatchlist_index_overrides` |

預設清單永不覆蓋 — 每次啟動時，使用者建立的清單會合併在預設清單之上。

---

## 技術架構

| 層面 | 技術 |
|------|------|
| **桌面框架** | Tauri 2.x |
| **前端** | React 18 + TypeScript + Vite 5 |
| **樣式** | Tailwind CSS 3 + CSS Variables |
| **圖表** | lightweight-charts 5.x |
| **UI 元件** | Radix UI + cmdk（命令面板）+ Lucide icons |
| **多語系** | i18next + react-i18next |
| **後端** | Python — yfinance, pandas, numpy |
| **通知** | @tauri-apps/plugin-notification |

**資料流向：**
```
React UI → Tauri Rust 後端 → Python 腳本（yfinance）→ JSON 回應 → React 狀態 → localStorage
```

---

## 常見問題

### Q：找不到代碼？

1. 嘗試直接輸入 Yahoo Finance 格式，如 `2330.TW`、`0700.HK`、`601318.SS`
2. 加密貨幣格式為 `BTC-USD`、`ETH-USD`
3. 使用搜尋功能 — 會以 Yahoo Finance 作為線上備援
4. 在索引維護中將代碼加入本地索引，未來即可離線搜尋

### Q：報價不更新或失敗？

- 確認網路連線正常
- Yahoo Finance 偶爾會限制流量，稍後再試
- 若 Python 後端不可用，應用程式會自動回退至模擬資料

### Q：K 線圖顯示空白？

- 部分加密貨幣與外匯的歷史資料較有限
- 建議先嘗試主要股票或指數

### Q：偵測不到 Python 後端？

- 視窗頂部會出現黃色警告橫幅
- 點擊下載連結取得 Python，然後重新安裝相依套件：`pip install -r python/requirements.txt`
- 即使沒有 Python，應用程式仍可正常使用模擬資料

### Q：如何重置所有資料？

清除瀏覽器 localStorage 中該應用程式的資料（所有自選股、設定與提醒將會遺失）：
- 開啟瀏覽器開發者工具 → Application → Local Storage → 清除所有 `ywatchlist_*` 開頭的 key

---

# yWatchlist — Smart Watchlist Manager <a id="ywatchlist--smart-watchlist-manager"></a>

A modern cross-platform desktop watchlist manager for **stocks, indices, ETFs, forex, and cryptocurrencies**. Built with **Tauri 2.x + React 18 + TypeScript**, featuring professional K-line charts, real-time price alerts, multi-language support, and nine customizable themes.

> ⚠️ **Disclaimer:** Yahoo Finance quotes are typically delayed by 15–20 minutes. Data is for reference only and should not be used as the basis for any investment decisions.

---

## Table of Contents

- [Features Overview](#features-overview)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Building for Distribution](#building-for-distribution)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
  - [Watchlist Management](#watchlist-management)
  - [Price Quotes & Auto Refresh](#price-quotes--auto-refresh)
  - [Professional K-Line Charts](#professional-k-line-charts)
  - [Fundamental Analysis](#fundamental-analysis)
  - [Price Alerts](#price-alerts)
  - [Smart Search](#smart-search)
  - [Ticker Index Maintenance](#ticker-index-maintenance)
- [Theming System](#theming-system)
- [Multi-Language Support](#multi-language-support)
- [Customization](#customization)
- [Data Persistence](#data-persistence)
- [Technical Architecture](#technical-architecture)
- [Troubleshooting](#troubleshooting)

---

## Features Overview

| Feature | Description |
|---------|-------------|
| 📋 Multi-watchlist | Create, rename, delete, and organize unlimited watchlists |
| 💹 Live Quotes | Delayed quotes from Yahoo Finance with auto/manual refresh |
| 🕯️ K-Line Charts | Professional candlestick charts with MA, KD, MACD indicators |
| 📊 Fundamental Analysis | 30+ financial metrics across 7 categories |
| 🔔 Price Alerts | High/low price alerts with system notifications |
| 🔍 Smart Search | Offline local index + Yahoo fallback search |
| 🎨 9 Themes | Dark, Ocean, Forest, Sunset, Neon, Elegant, Frosted Purple/Blue/Cyan |
| 🌐 6 Languages | zh-TW, zh-CN, en, ja, ko, es |
| ⌨️ Keyboard Shortcuts | `Ctrl+K` to open search instantly |

---

## System Requirements

- **OS:** Windows 10/11 (64-bit)
- **WebView2:** Pre-installed on Windows 10/11; otherwise install from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

---

## 🚀 Download & Install (Recommended)

### Download Release Directly

1. Go to [Releases](https://github.com/aneterw/yWatchlist/releases/latest) and download:
   - **`yWatchlist_1.0.0_x64-setup.exe`** - Windows Installer
   - **`python-embed-full.zip`** - Python Runtime

2. Install `yWatchlist_1.0.0_x64-setup.exe`
3. Extract `python-embed-full.zip` to the install directory
4. Launch yWatchlist

---

## 🔧 Build from Source

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Python Backend Dependencies

```bash
pip install -r python/requirements.txt
```

Or install individually:

```bash
pip install yfinance pandas numpy
```

The Python backend provides:
- **Price quotes** via `yfinance`
- **K-line historical data** for chart rendering
- **Fundamental analysis data** (financial ratios, earnings, cash flow)
- **Stock news** retrieval

If Python is not available, the app falls back to **mock price data** so you can still explore the UI and chart features.

### 3. Verify Setup

On first launch, the app checks whether Python and the backend script exist. If either is missing, a yellow warning banner appears at the top of the window with a download link.

---

## Running the App

### Development Mode — Full Tauri Desktop App (Recommended)

```bash
npm run tauri dev
```

This launches the native desktop window with access to the Python backend for real data.

### Development Mode — Web Preview Only

```bash
npm run dev
```

Opens the React app in a browser. Useful for frontend-only debugging. Note: real data fetching will fall back to mock data since the Python backend runs inside Tauri.

### Build Release

```bash
npm run tauri build
```

Produces an installer in `src-tauri/target/release/`.

---

## Getting Started

```
1. Install dependencies: npm install && pip install -r python/requirements.txt
2. Launch: npm run tauri dev
3. Browse the default "Global Indices" list on the left sidebar
4. Click "Refresh Current" or wait for automatic 10-minute updates
5. Double-click any item to view its K-line chart
6. Click the 📈 icon (or right-click) to open Fundamental Analysis
7. Use Ctrl+K or the Search button to add new stocks
8. Switch themes, languages, and fonts from the header bar
```

### Default Watchlists

The app ships with two pre-built lists:

| List Name | Contents |
|-----------|----------|
| **Global Indices** | Dow Jones (^DJI), S&P 500 (^GSPC), NASDAQ (^IXIC), Philadelphia Semiconductor (^SOX), Taiwan Weighted (^TWII), SSE Composite (000001.SS), SZSE Component (399001.SZ), Hang Seng (^HSI), Nikkei 225 (^N225), Korea KOSPI (^KS11), Singapore STI (^STI), Germany DAX (^GDAXI), France CAC 40 (^FCHI), UK FTSE 100 (^FTSE) |
| **Tech ETF** | QQQ (NASDAQ 100), VGT (Technology SPDR) |

---

## Core Features

### Watchlist Management

- **Create** a new watchlist via the `+` button in the sidebar
- **Rename** any watchlist by hovering and clicking the pencil icon
- **Delete** a watchlist with the trash button (confirmation dialog)
- **Reorder** stocks within a list using the up/down arrow buttons on each row
- **Remove** a stock: click once to select, click again to confirm deletion
- **Add stocks** via the "Add Stock" button, the search modal, or `Ctrl+K`

### Price Quotes & Auto Refresh

- Quotes are fetched from **Yahoo Finance** through the Python backend
- Prices include: current price, change, percent change, and volume
- Color coding: **green for up**, **red for down**, **gray for flat**
- **Auto-refresh** is enabled by default and configurable:
  - Every 5 minutes
  - Every 10 minutes (default)
  - Every 30 minutes
  - Every 60 minutes
- Toggle auto-refresh on/off with the clock button in the header
- Manual refresh options:
  - **Refresh Current** — update only the active watchlist
  - **Refresh All** — update every watchlist at once
- Last update timestamp is displayed per watchlist

### Professional K-Line Charts

Powered by **lightweight-charts 5.x**, double-click any stock or click the 📊 icon.

**Time Periods:**
| Period | Data Range |
|--------|-----------|
| Daily | 2 years |
| Weekly | 10 years |
| Monthly | 30 years |

**Chart Types:**
| Type | Description |
|------|-------------|
| Candle | Pure candlestick + volume |
| Candle MA | Candlestick + 10-period moving average |
| KD | Candlestick + KDJ oscillator pane |
| MACD | Candlestick + MACD histogram, signal line, and MACD line |

**Interactions:**
- Zoom with mouse wheel
- Pan by dragging
- Hover for OHLCV tooltip with indicator values
- Responsive resize

### Fundamental Analysis

Right-click a stock or click the 📈 icon to open the analysis panel. Data is fetched from Yahoo Finance via the Python backend.

**Company Info Card:**
- Company name, sector, industry
- Current price, previous close, today's high/low
- Volume, market cap, P/E ratio, dividend yield, 52-week high/low, beta, EPS

**7 Metric Categories (30+ indicators):**

| Category | Indicators |
|----------|-----------|
| **Valuation** | Market Cap, Trailing P/E, Forward P/E, PEG, Price-to-Book, EV/EBITDA |
| **Profitability** | EPS, ROE, ROA, ROIC, Operating Margin, Profit Margin |
| **Yield & Risk** | Dividend Yield, Beta, FCF Yield, Quick Ratio, Short % of Float |
| **Analyst & Holdings** | Target Mean Price, Target Median Price, Analyst Count, Recommendation, Insider Ownership, Institutional Ownership |
| **52-Week Range** | 52-Week High, 52-Week Low, Range Position |
| **Cash Flow** | Free Cash Flow, Operating Cash Flow, FCF Dividend Coverage |
| **Revenue & Growth** | Total Revenue, Total Liabilities, Total Cash, Earnings Growth, Revenue Growth |

**Stock News:** Latest headlines with publisher, date, and clickable links to original articles.

**Cookie Consent:** A cookie settings dialog is available for Yahoo Finance consent management.

### Price Alerts

Set high and low price thresholds per stock:

1. Click the bell icon on any stock row
2. Enter a **high price** (alert when price rises above) or **low price** (alert when price falls below)
3. Save — the alert persists across sessions

**Notification behavior:**
- Triggers a **Windows system notification** (12-second auto-dismiss)
- Bell icon turns yellow when an alert is configured
- Tooltip shows current thresholds and a ✓ checkmark when triggered
- Delete alerts by hovering the bell and clicking the trash icon

### Smart Search

Open with `Ctrl+K` or click the Search button.

**Search sources (in priority order):**
1. **User Overrides** — custom ticker-name mappings (⭐ marked)
2. **Local Ticker Index** — built-in offline index of popular tickers
3. **Yahoo Finance Search** — online fallback for broader discovery
4. **Common Tickers** — curated list of frequently watched US, Asian, crypto, and commodity symbols

**Features:**
- Debounced Yahoo search (400ms)
- Add Yahoo results to your local override index with one click
- Type a raw ticker symbol and press Enter to manually add it
- Results remain searchable offline after adding to overrides
- Double-click a result to instantly add it to the current watchlist

### Ticker Index Maintenance

Click the ⚙️ icon in the header to manage the local ticker index.

- **Search** tickers against the local index or Yahoo
- **Add** new ticker-name pairs to the override list
- **Edit** existing entries
- **Delete** overrides (local built-in tickers cannot be deleted)
- **Filter** the list by ticker or name
- Overrides take precedence over the built-in index in search results

---

## Theming System

Nine themes, all persisted in localStorage:

| Theme | Style |
|-------|-------|
| **Dark** | Classic dark — uniform background, white text |
| **Ocean** | Deep sea blue with gold accents |
| **Forest** | Forest green with earthy natural tones |
| **Sunset** | Sunset purple with warm colors |
| **Neon** | Neon style with vibrant contrast |
| **Elegant** | Black-and-gold luxury palette |
| **Frosted Purple** ❄️ | Dark base + smoky violet glass panels, gradient background, 12px blur |
| **Frosted Blue** ❄️ | Dark base + icy blue glass panels, gradient background, 12px blur |
| **Frosted Cyan** ❄️ | Dark base + teal glass panels, gradient background, 12px blur |

**Frosted Glass themes include:**
- Semi-transparent glass-effect panels
- Radial gradient + noise texture backgrounds
- 12px backdrop blur
- Soft shadows and glowing borders

Switch themes from the monitor icon dropdown in the header bar.

---

## Multi-Language Support

Six languages with automatic browser detection:

| Code | Language |
|------|----------|
| `zh-TW` | 繁體中文 |
| `zh-CN` | 简体中文 |
| `en` | English |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `es` | Español |

Language preference is saved and restored on next launch. Detection logic handles locale prefixes (e.g., `zh-HK` → `zh-TW`, `zh-SG` → `zh-CN`).

---

## Customization

### Fonts

Choose from 13 preset fonts or enter a custom Windows-installed font name:

System Default, Noto Sans TC/SC, Microsoft JhengHei, Arial, Segoe UI, Cambria, Verdana, Tahoma, KaiTi, MingLiU, PMingLiU, Courier New, Consolas

Custom fonts are applied at the root level and persist across sessions.

### Zoom Levels

Five preset zoom levels: **75%, 87.5%, 100%, 112.5%, 125%**

Applied to the root `font-size` for proportional scaling of all UI elements.

---

## Data Persistence

All user data is stored in **browser localStorage**:

| Stored Data | Key |
|------------|-----|
| Watchlists + active list | `ywatchlist_data` |
| Language | `ywatchlist_language` |
| Theme | `ywatchlist_theme` |
| Font family | `ywatchlist_font` |
| Zoom level | Included in `ywatchlist_data` |
| Auto-refresh state | `ywatchlist_auto_refresh` |
| Auto-refresh interval | `ywatchlist_auto_refresh_interval` |
| Price alerts | `ywatchlist_alerts` |
| Ticker overrides | `ywatchlist_index_overrides` |

Default watchlists are never overwritten — user-created lists merge on top of defaults on every launch.

---

## Technical Architecture

| Layer | Technology |
|-------|-----------|
| **Desktop Framework** | Tauri 2.x |
| **Frontend** | React 18 + TypeScript + Vite 5 |
| **Styling** | Tailwind CSS 3 + CSS Variables |
| **Charts** | lightweight-charts 5.x |
| **UI Components** | Radix UI + cmdk (command palette) + Lucide icons |
| **i18n** | i18next + react-i18next |
| **Backend** | Python — yfinance, pandas, numpy |
| **Notifications** | @tauri-apps/plugin-notification |

**Data flow:**
```
React UI → Tauri Rust backend → Python script (yfinance) → JSON response → React state → localStorage
```

---

## Troubleshooting

### Q: Can't find a ticker?

1. Try Yahoo Finance format directly: `2330.TW`, `0700.HK`, `601318.SS`
2. Crypto format: `BTC-USD`, `ETH-USD`
3. Use the search modal — it queries Yahoo Finance as a fallback
4. Add the ticker to your local index via Index Maintenance for future offline access

### Q: Prices not updating or failing?

- Check your internet connection
- Yahoo Finance occasionally rate-limits requests — wait a moment and retry
- The app falls back to mock data if the Python backend is unavailable

### Q: K-line chart appears empty?

- Some cryptocurrencies and forex pairs have limited historical data
- Try major stocks or indices first

### Q: Python backend not detected?

- A yellow warning banner appears at the top of the window
- Click the download link to get Python, then reinstall dependencies: `pip install -r python/requirements.txt`
- The app remains fully usable with mock data even without Python

### Q: How to reset all data?

Clear browser localStorage for this app (all watchlists, settings, and alerts will be lost):
- Open browser DevTools → Application → Local Storage → clear all `ywatchlist_*` keys
