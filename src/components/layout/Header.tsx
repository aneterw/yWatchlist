import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Search, Sun, Moon, Monitor, RotateCcw, Type, Play, Pause, Settings2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, ZOOM_LEVELS, FONT_FAMILIES } from "@/lib/constants";
import type { Theme, Language, ZoomLevel } from "@/types";

interface HeaderProps {
  isLoading: boolean;
  isAutoRefresh: boolean;
  autoRefreshInterval: number;
  onToggleAutoRefresh: () => void;
  onAutoRefreshIntervalChange: (interval: number) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  zoomLevel: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  onRefresh: () => void;
  onRefreshCurrent: () => void;
  onOpenSearch: () => void;
  onOpenIndexMaintenance: () => void;
}

export function Header({
  isLoading,
  isAutoRefresh,
  autoRefreshInterval,
  onToggleAutoRefresh,
  onAutoRefreshIntervalChange,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  zoomLevel,
  onZoomChange,
  fontFamily,
  onFontFamilyChange,
  onRefresh,
  onRefreshCurrent,
  onOpenSearch,
  onOpenIndexMaintenance,
}: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [customFont, setCustomFont] = useState("");

  const handleLanguageChange = (lang: Language) => {
    i18n.changeLanguage(lang);
    onLanguageChange(lang);
    localStorage.setItem("ywatchlist_language", lang);
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <header className="h-14 border-b-2 border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between px-4 text-[var(--color-foreground)]">
      {/* Left: Auto Refresh Toggle + Refresh Buttons */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isAutoRefresh ? "default" : "outline"}
              size="sm"
              title={t("stock.autoRefreshToggle")}
              className={isAutoRefresh ? "bg-green-600 hover:bg-green-700 text-white" : "text-[var(--color-foreground)]"}
            >
              {isAutoRefresh ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="text-xs hidden sm:inline">{t("stock.autoRefreshOn")}</span>
                  <span className="text-xs ml-1">({autoRefreshInterval}m)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1 text-green-500" />
                  <span className="text-xs hidden sm:inline">{t("stock.autoRefreshOff")}</span>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-[var(--color-foreground)]">
            <DropdownMenuLabel>{t("stock.autoRefreshInterval")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            <DropdownMenuItem
              onClick={() => {
                onAutoRefreshIntervalChange(5);
                if (!isAutoRefresh) {
                  onToggleAutoRefresh();
                }
              }}
              className={autoRefreshInterval === 5 ? "bg-[var(--color-accent)]" : ""}
            >
              {t("stock.interval5min")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onAutoRefreshIntervalChange(10);
                if (!isAutoRefresh) {
                  onToggleAutoRefresh();
                }
              }}
              className={autoRefreshInterval === 10 ? "bg-[var(--color-accent)]" : ""}
            >
              {t("stock.interval10min")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onAutoRefreshIntervalChange(30);
                if (!isAutoRefresh) {
                  onToggleAutoRefresh();
                }
              }}
              className={autoRefreshInterval === 30 ? "bg-[var(--color-accent)]" : ""}
            >
              {t("stock.interval30min")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onAutoRefreshIntervalChange(60);
                if (!isAutoRefresh) {
                  onToggleAutoRefresh();
                }
              }}
              className={autoRefreshInterval === 60 ? "bg-[var(--color-accent)]" : ""}
            >
              {t("stock.interval60min")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            <DropdownMenuItem
              onClick={onToggleAutoRefresh}
              className={isAutoRefresh ? "text-red-500" : "text-green-500"}
            >
              {isAutoRefresh ? t("stock.autoRefreshPause") : t("stock.autoRefreshResume")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshCurrent}
          disabled={isLoading}
          title={t("stock.refreshCurrent")}
          className="text-[var(--color-foreground)]"
        >
          <RotateCcw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? t("stock.loading") : t("stock.refreshCurrent")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          title={t("stock.refreshAll")}
          className="text-[var(--color-foreground)]"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Center: Search Button */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpenSearch} className="text-[var(--color-foreground)]">
          <Search className="w-4 h-4 mr-2" />
          <span className="text-[var(--color-foreground)] opacity-70 text-xs">
            {t("search.placeholder")}
          </span>
          <kbd className="ml-4 text-xs bg-[var(--color-muted)] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-foreground)]">
            Ctrl+K
          </kbd>
        </Button>

        {/* Index Maintenance Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenIndexMaintenance}
          title={t("indexMaintenance.button")}
          className="text-[var(--color-foreground)]"
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Right: Settings */}
      <div className="flex items-center gap-2 text-[var(--color-foreground)]">
        {/* Zoom Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[var(--color-foreground)]">
              <span className="text-xs">{zoomLevel}%</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-[var(--color-foreground)]">
            <DropdownMenuLabel>{t("settings.zoom")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            {ZOOM_LEVELS.map((z) => (
              <DropdownMenuItem
                key={z}
                onClick={() => onZoomChange(z as ZoomLevel)}
                className={zoomLevel === z ? "bg-[var(--color-accent)] text-[var(--color-foreground)]" : "text-[var(--color-foreground)]"}
              >
                {z}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[var(--color-foreground)]">
              <Type className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto text-[var(--color-foreground)]">
            <DropdownMenuLabel>{t("settings.font")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            {FONT_FAMILIES.map((font) => (
              <DropdownMenuItem
                key={font.code}
                onClick={() => {
                  onFontFamilyChange(font.css);
                  localStorage.setItem("ywatchlist_font", font.css);
                }}
                className={fontFamily === font.css ? "bg-[var(--color-accent)]" : ""}
                style={{ fontFamily: font.css }}
              >
                {font.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            <div className="p-2">
              <DropdownMenuLabel className="text-xs">{t("settings.customFont")}</DropdownMenuLabel>
              <Input
                placeholder={t("settings.fontPlaceholder")}
                value={customFont}
                onChange={(e) => setCustomFont(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customFont.trim()) {
                    onFontFamilyChange(customFont.trim());
                    localStorage.setItem("ywatchlist_font", customFont.trim());
                    setCustomFont("");
                  }
                }}
                className="mt-2 mb-1 text-[var(--color-foreground)]"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[var(--color-foreground)]"
                onClick={() => {
                  if (customFont.trim()) {
                    onFontFamilyChange(customFont.trim());
                    localStorage.setItem("ywatchlist_font", customFont.trim());
                    setCustomFont("");
                  }
                }}
              >
                {t("common.save")}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[var(--color-foreground)]">
              <span className="mr-1">{LANGUAGES.find((l) => l.code === language)?.nativeName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-[var(--color-foreground)]">
            <DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as Language)}
                className={language === lang.code ? "bg-[var(--color-accent)]" : ""}
              >
                {lang.nativeName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-[var(--color-foreground)]">
              <ThemeIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-[var(--color-foreground)]">
            <DropdownMenuLabel>{t("settings.theme")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            <DropdownMenuItem onClick={() => onThemeChange("ocean")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeOcean")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("forest")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeForest")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("sunset")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeSunset")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("neon")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeNeon")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("elegant")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeElegant")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("frosted-purple")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeFrostedPurple")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("frosted-blue")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeFrostedBlue")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange("frosted-cyan")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeFrostedCyan")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--color-border)]" />
            <DropdownMenuItem onClick={() => onThemeChange("dark")} className="text-[var(--color-foreground)]">
              <Moon className="w-4 h-4 mr-2" />
              {t("settings.themeDark")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}