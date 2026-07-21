import { useEffect, useCallback, useRef } from "react";
import type { PriceData, AlertConfig } from "@/types";

interface UsePriceAlertsProps {
  priceData: Record<string, PriceData>;
  alerts: Record<string, AlertConfig>;
  tickerNames: Record<string, string>;
  onAlertTriggered: (ticker: string, type: "high" | "low", price: number) => void;
}

// Play notification sound
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880; // A5 note
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.warn("[Sound] Failed to play notification sound:", e);
  }
}

export function usePriceAlerts({
  priceData,
  alerts,
  tickerNames,
  onAlertTriggered,
}: UsePriceAlertsProps) {
  const notifiedRef = useRef<Set<string>>(new Set());

  const checkAlerts = useCallback(() => {
    Object.entries(alerts).forEach(([ticker, config]) => {
      const price = priceData[ticker]?.price;
      if (!price || !config) return;

      // Check high alert
      if (config.high !== undefined) {
        const alertKeyHigh = `${ticker}-high`;
        if (price >= config.high && !notifiedRef.current.has(alertKeyHigh)) {
          notifiedRef.current.add(alertKeyHigh);
          playNotificationSound();
          onAlertTriggered(ticker, "high", price);
        }
      }

      // Check low alert
      if (config.low !== undefined) {
        const alertKeyLow = `${ticker}-low`;
        if (price <= config.low && !notifiedRef.current.has(alertKeyLow)) {
          notifiedRef.current.add(alertKeyLow);
          playNotificationSound();
          onAlertTriggered(ticker, "low", price);
        }
      }
    });
  }, [alerts, priceData, onAlertTriggered]);

  // Check alerts whenever price data changes
  useEffect(() => {
    checkAlerts();
  }, [checkAlerts]);

  // When alerts change, immediately check if any should trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAlerts();
    }, 1000);
    return () => clearTimeout(timer);
  }, [alerts, checkAlerts]);

  // Reset notification flag when alert config changes
  useEffect(() => {
    Object.keys(alerts).forEach(ticker => {
      const config = alerts[ticker];
      if (config.high !== undefined) {
        notifiedRef.current.delete(`${ticker}-high`);
      }
      if (config.low !== undefined) {
        notifiedRef.current.delete(`${ticker}-low`);
      }
    });
  }, [alerts]);

  // Check if alert has been triggered
  return { checkAlerts, notifiedRef };
}

// Show notification using Tauri native notification
export async function showPriceAlertNotification(
  ticker: string,
  name: string,
  type: "high" | "low",
  price: number,
  targetPrice: number
) {
  const direction = type === "high" ? "突破高點 ⬆️" : "跌破低點 ⬇️";
  const title = `📢 ${name} (${ticker})`;
  const subtitle = direction;
  const body = `現價: $${price.toFixed(2)} | 目標: $${targetPrice.toFixed(2)}`;

  try {
    // Try Tauri notification first
    const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");

    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification({
        title: `${title} - ${subtitle}`,
        body,
      });
      return;
    }
  } catch (e) {
    console.warn("[Notification] Tauri not available, trying browser notification:", e);
  }

  // Fallback to browser notification or alert
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`${title} - ${subtitle}`, { body, tag: `alert-${ticker}-${type}` });
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") {
          new Notification(`${title} - ${subtitle}`, { body, tag: `alert-${ticker}-${type}` });
        } else {
          alert(`${title} - ${subtitle}\n${body}`);
        }
      });
    } else {
      alert(`${title} - ${subtitle}\n${body}`);
    }
  } else {
    alert(`${title} - ${subtitle}\n${body}`);
  }
}