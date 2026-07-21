import { useEffect } from "react";
import { getOptimalWindowSize, saveWindowSize, getScreenInfo } from "@/lib/screenSize";

/**
 * Hook to adjust window size based on screen resolution
 * Run once on app mount
 */
export function useAdaptiveWindowSize() {
  useEffect(() => {
    const adjustWindowSize = async () => {
      try {
        // Get current window from Tauri
        const { getCurrentWindow } = await import("@tauri-apps/api/window");

        // Wait for window to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        const window = getCurrentWindow();
        const size = getOptimalWindowSize();

        // Resize window to recommended size
        await window.setSize({
          type: "Physical",
          width: size.width,
          height: size.height,
        });

        // Center window after resize
        await window.center();

        // Log screen info for debugging
        const screenInfo = getScreenInfo();
        console.log(
          `[Screen] ${screenInfo.width}x${screenInfo.height} @ ${screenInfo.pixelRatio}x (${screenInfo.category})`
        );
        console.log(`[Window] Resized to ${size.width}x${size.height}`);

        // Save this size as user preference
        saveWindowSize(size.width, size.height);
      } catch (e) {
        // Not in Tauri environment or window API not available
        console.log("[Screen] Running in browser mode, no window resize");
      }
    };

    // Run after a short delay to ensure window is ready
    const timer = setTimeout(adjustWindowSize, 200);
    return () => clearTimeout(timer);
  }, []);
}

/**
 * Get current screen category for conditional rendering
 */
export function useScreenCategory() {
  const [category, setCategory] = useState<string>("medium");

  useEffect(() => {
    const info = getScreenInfo();
    setCategory(info.category);
  }, []);

  return category;
}

// Need to import useState
import { useState } from "react";