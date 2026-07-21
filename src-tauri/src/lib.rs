use log::{error, info, warn, LevelFilter};
use serde::{Deserialize, Serialize};
use simplelog::{Config, WriteLogger};
use std::fs::{self, OpenOptions};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn get_log_path() -> PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        let app_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
        // App 安装目录下找 AppData（发行版），否则用 exe 同级的 AppData 目录
        let app_data_dir = app_dir.join("AppData").join("Local").join("yWatchlist");
        if app_data_dir.exists() || std::env::var("YDEBUG").is_ok() {
            return app_data_dir.join("ywatchlist.log");
        }
        // dev: 写项目根目录
        return exe_path
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .join("ywatchlist.log");
    }
    PathBuf::from("ywatchlist.log")
}

fn init_logging() {
    let log_path = get_log_path();
    // 确保目录存在
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path);

    match file {
        Ok(file) => {
            let _ = WriteLogger::init(LevelFilter::Info, Config::default(), file);
            info!("Log started: {:?}", log_path);
        }
        Err(e) => {
            eprintln!("[Log] Failed to open log file: {}", e);
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PriceData {
    pub ticker: String,
    pub name: String,
    pub price: Option<f64>,
    pub change: Option<f64>,
    pub pct_change: Option<f64>,
    pub volume: Option<i64>,
    pub market_cap: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WatchlistData {
    pub active_wl: Option<String>,
    pub watchlists: serde_json::Value,
    pub lang: Option<String>,
    pub theme: Option<String>,
    pub alerts: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SearchResult {
    pub display: String,
    pub symbol: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ChartData {
    pub date: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: i64,
}

fn get_python_interpreter() -> Option<std::path::PathBuf> {
    if let Ok(exe_path) = std::env::current_exe() {
        let app_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));

        // 優先用嵌入式 Python（相對 exe 目錄）
        let embedded_python = app_dir.join("python-embed-full").join("python.exe");
        if embedded_python.exists() {
            info!("Using embedded Python: {:?}", embedded_python);
            return Some(embedded_python);
        }

        // 沒有嵌入式就用系統 Python
        if let Ok(output) = Command::new("python")
            .creation_flags(CREATE_NO_WINDOW)
            .arg("--version")
            .output()
        {
            if output.status.success() {
                info!("Using system Python");
                return Some(std::path::PathBuf::from("python"));
            }
        }
    }
    None
}

fn python_script_path() -> std::path::PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        let app_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
        let runtime_path = app_dir.join("python").join("core.py");
        if runtime_path.exists() {
            return runtime_path;
        }
    }
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    Path::new(manifest_dir)
        .parent()
        .expect("CARGO_MANIFEST_DIR should have a parent")
        .join("python")
        .join("core.py")
}

fn run_python_command(args: &[&str]) -> String {
    let script = python_script_path();
    info!("Python script: {:?}", script);

    let python_path = match get_python_interpreter() {
        Some(p) => p,
        None => {
            error!("No Python interpreter found!");
            return String::new();
        }
    };
    info!("Python interpreter: {:?}", python_path);

    match Command::new(&python_path)
        .creation_flags(CREATE_NO_WINDOW)
        .arg(&script)
        .args(args)
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                String::from_utf8_lossy(&output.stdout).to_string()
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                warn!("Python error: {}", stderr);
                String::new()
            }
        }
        Err(e) => {
            error!("Python failed to run: {}", e);
            String::new()
        }
    }
}

#[tauri::command]
async fn fetch_prices(tickers: Vec<String>) -> Result<Vec<PriceData>, String> {
    if tickers.is_empty() {
        return Ok(vec![]);
    }

    let mut args: Vec<&str> = vec!["fetch-prices"];
    args.extend(tickers.iter().map(|s| s.as_str()));

    let output = run_python_command(&args);

    if output.is_empty() {
        return Ok(tickers
            .iter()
            .map(|ticker| PriceData {
                ticker: ticker.clone(),
                name: ticker.clone(),
                price: Some(100.0),
                change: Some(0.0),
                pct_change: Some(0.0),
                volume: Some(0),
                market_cap: Some(0),
            })
            .collect());
    }

    serde_json::from_str(&output).map_err(|e| format!("Failed to parse prices: {}", e))
}

#[tauri::command]
async fn search_tickers(query: String, limit: Option<usize>) -> Result<Vec<SearchResult>, String> {
    let limit_str = limit.unwrap_or(20).to_string();
    let output = run_python_command(&["search", &query, &limit_str]);

    if output.is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str(&output).map_err(|e| format!("Failed to parse search results: {}", e))
}

#[tauri::command]
async fn load_watchlist_data() -> Result<WatchlistData, String> {
    let output = run_python_command(&["load"]);

    if output.is_empty() {
        return Ok(WatchlistData {
            active_wl: Some("默認".to_string()),
            watchlists: serde_json::json!({"默認": []}),
            lang: Some("zh-TW".to_string()),
            theme: Some("dark".to_string()),
            alerts: serde_json::json!({}),
        });
    }

    serde_json::from_str(&output).map_err(|e| format!("Failed to parse data: {}", e))
}

#[tauri::command]
async fn save_watchlist_data(data: String) -> Result<bool, String> {
    let output = run_python_command(&["save", &data]);

    if output.is_empty() {
        return Ok(false);
    }

    let result: serde_json::Value =
        serde_json::from_str(&output).map_err(|e| format!("Failed to parse result: {}", e))?;
    Ok(result.get("success").and_then(|v| v.as_bool()).unwrap_or(false))
}

#[tauri::command]
async fn get_chart_data(ticker: String, period: Option<String>) -> Result<Vec<ChartData>, String> {
    let period_str = period.unwrap_or_else(|| "1d".to_string());
    let output = run_python_command(&["chart", &ticker, &period_str]);

    if output.is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str(&output).map_err(|e| format!("Failed to parse chart data: {}", e))
}

#[tauri::command]
async fn get_fundamental(ticker: String) -> Result<serde_json::Value, String> {
    let output = run_python_command(&["fundamental-full", &ticker]);

    if output.is_empty() {
        return Err("Failed to get fundamental data".to_string());
    }

    serde_json::from_str(&output).map_err(|e| format!("Failed to parse fundamental data: {}", e))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NewsItem {
    pub title: String,
    pub link: String,
    pub publisher: String,
    pub pub_date: String,
}

#[tauri::command]
async fn get_news(ticker: String) -> Result<Vec<NewsItem>, String> {
    let output = run_python_command(&["news", &ticker]);

    if output.is_empty() {
        return Ok(vec![]);
    }

    serde_json::from_str(&output).map_err(|e| format!("Failed to parse news data: {}", e))
}

#[tauri::command]
fn check_python_status() -> serde_json::Value {
    let python_interp = get_python_interpreter();
    let script_ok = python_script_path().exists();

    serde_json::json!({
        "python_installed": python_interp.is_some(),
        "python_message": if python_interp.is_some() {
            "Python is available".to_string()
        } else {
            "Python not found".to_string()
        },
        "script_exists": script_ok,
        "download_url": "https://www.python.org/downloads/"
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化文件日誌（這行必須在第一個 log::* 之前）
    init_logging();

    info!("===========================================");
    info!("yWatchlist v{} starting...", env!("CARGO_PKG_VERSION"));

    // 檢查 Python 環境
    match get_python_interpreter() {
        Some(_) => info!("Python: OK"),
        None => warn!("Python: NOT FOUND"),
    }

    if !python_script_path().exists() {
        warn!("core.py not found!");
    }
    info!("===========================================");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            fetch_prices,
            search_tickers,
            load_watchlist_data,
            save_watchlist_data,
            get_chart_data,
            get_fundamental,
            get_news,
            check_python_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}