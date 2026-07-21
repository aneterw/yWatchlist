/**
 * Screen size calculator for adaptive window dimensions
 * Based on user's screen resolution and DPI scaling
 */

export interface ScreenInfo {
  width: number;
  height: number;
  pixelRatio: number;
  effectiveWidth: number;
  effectiveHeight: number;
  category: "small" | "medium" | "large" | "ultrawide" | "4k";
}

// Get screen info
export function getScreenInfo(): ScreenInfo {
  const width = window.screen.width;
  const height = window.screen.height;
  const pixelRatio = window.devicePixelRatio || 1;
  const effectiveWidth = Math.round(width * pixelRatio);
  const effectiveHeight = Math.round(height * pixelRatio);

  let category: ScreenInfo["category"] = "medium";

  // Categorize screen
  const aspectRatio = width / height;
  if (width >= 3440 && aspectRatio > 1.5) {
    category = "ultrawide";
  } else if (width >= 3840 || height >= 2160) {
    category = "4k";
  } else if (width >= 1920) {
    category = "large";
  } else if (width < 1600) {
    category = "small";
  }

  return {
    width,
    height,
    pixelRatio,
    effectiveWidth,
    effectiveHeight,
    category,
  };
}

// Calculate recommended window size based on screen
export function getRecommendedWindowSize(screenInfo?: ScreenInfo): { width: number; height: number } {
  const info = screenInfo || getScreenInfo();
  const { category } = info;

  // Base sizes for different categories (already accounting for effective pixels)
  const sizes = {
    small: { width: 1100, height: 700 },
    medium: { width: 1280, height: 800 },
    large: { width: 1440, height: 900 },
    ultrawide: { width: 1600, height: 900 },
    "4k": { width: 1600, height: 950 },
  };

  // Apply DPI scaling factor
  const scaleFactor = Math.min(1.5, Math.max(0.8, 1 / (info.pixelRatio || 1)));

  const baseSize = sizes[category];
  return {
    width: Math.round(baseSize.width * scaleFactor),
    height: Math.round(baseSize.height * scaleFactor),
  };
}

// Get minimum window size for current screen
export function getMinWindowSize(screenInfo?: ScreenInfo): { minWidth: number; minHeight: number } {
  const info = screenInfo || getScreenInfo();

  // Minimum sizes scale with screen category
  const mins = {
    small: { minWidth: 800, minHeight: 500 },
    medium: { minWidth: 900, minHeight: 600 },
    large: { minWidth: 1000, minHeight: 650 },
    ultrawide: { minWidth: 1100, minHeight: 650 },
    "4k": { minWidth: 1200, minHeight: 700 },
  };

  return mins[info.category];
}

// Store user preference
const SIZE_PREF_KEY = "ywatchlist_window_size";

export function saveWindowSize(width: number, height: number): void {
  localStorage.setItem(SIZE_PREF_KEY, JSON.stringify({ width, height }));
}

export function getSavedWindowSize(): { width: number; height: number } | null {
  const saved = localStorage.getItem(SIZE_PREF_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

// Main function: get window size with user preference priority
export function getOptimalWindowSize(): { width: number; height: number } {
  // First check saved preference
  const saved = getSavedWindowSize();
  if (saved) {
    return saved;
  }

  // Then calculate based on screen
  return getRecommendedWindowSize();
}