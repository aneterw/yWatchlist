import { useEffect, useState } from "react";
import type { Theme } from "@/types";

const VALID_THEMES: Theme[] = ["dark", "ocean", "forest", "sunset", "neon", "elegant", "frosted-purple", "frosted-blue", "frosted-cyan"];
const DEFAULT_THEME: Theme = "frosted-purple";

export function useTheme() {
  // Default to frosted-purple theme
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("ywatchlist_theme") as Theme | null;
    // Use stored theme if valid, otherwise use default (frosted-purple)
    if (stored && VALID_THEMES.includes(stored)) {
      setThemeState(stored);
    } else {
      setThemeState(DEFAULT_THEME);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.className = "";
    root.className = theme;
    localStorage.setItem("ywatchlist_theme", theme);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return { theme, setTheme, mounted };
}