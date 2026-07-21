import { useTranslation } from "react-i18next";
import type { WatchlistItem } from "@/types";

/**
 * Check if a name is an i18n key (starts with "indices.")
 */
export function isI18nKey(name: string): boolean {
  return name.startsWith("indices.");
}

/**
 * Get localized name from a WatchlistItem
 * If name is an i18n key (starts with "indices."), translate it
 * Otherwise return the name as-is
 */
export function useLocalizedName(item: WatchlistItem): string {
  const { t } = useTranslation();

  if (isI18nKey(item.name)) {
    return t(item.name);
  }
  return item.name;
}

/**
 * Get localized name from a WatchlistItem (non-hook version)
 * Requires i18n instance passed in
 */
export function getLocalizedName(item: WatchlistItem, t: (key: string) => string): string {
  if (isI18nKey(item.name)) {
    return t(item.name);
  }
  return item.name;
}

/**
 * Format ticker label for display (remove ^ prefix)
 */
export function formatTickerLabel(ticker: string): string {
  return ticker.replace("^", "");
}

/**
 * i18n keys for watchlist names
 */
export const WATCHLIST_I18N = {
  globalIndices: "Global Indices",
  techEtf: "Tech ETF",
} as const;