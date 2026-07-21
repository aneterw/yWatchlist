/**
 * Console interceptor — mirrors console output into a ring buffer for the in-app DevDrawer.
 * Preserves native console behavior (so Tauri's stdout pipe / logger still gets the events).
 */

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface ConsoleEntry {
  /** Monotonic counter; use as React key. */
  id: number;
  /** ms since page load. */
  timestamp: number;
  level: LogLevel;
  /** Pre-formatted args joined via safeStringify. */
  message: string;
}

type Listener = (entries: ReadonlyArray<ConsoleEntry>) => void;

const MAX_ENTRIES = 500;
const SAFE_STRINGIFY_DEPTH = 4;

function safeStringify(value: unknown, depth: number = 0): string {
  if (depth >= SAFE_STRINGIFY_DEPTH) {
    return "…";
  }

  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const t = typeof value;
  if (t === "string") return value as string;
  if (t === "number" || t === "boolean" || t === "bigint") return String(value);
  if (t === "symbol") return (value as symbol).toString();
  if (t === "function") return `[Function ${(value as Function).name || "anonymous"}]`;

  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }

  if (Array.isArray(value)) {
    return (
      "[" +
      value
        .map((item) => safeStringify(item, depth + 1))
        .join(", ") +
      "]"
    );
  }

  try {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === "object" && v !== null) {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
        }
        if (typeof v === "bigint") return `${v.toString()}n`;
        return v;
      },
      2
    );
  } catch {
    return String(value);
  }
}

class ConsoleRing {
  private buffer: ConsoleEntry[] = [];
  private counter = 0;
  private listeners = new Set<Listener>();
  private native: Partial<Record<LogLevel, (...args: unknown[]) => void>> = {};

  install(): void {
    if (this.native.log) return; // idempotent

    const levels: LogLevel[] = ["log", "info", "warn", "error", "debug"];
    for (const level of levels) {
      this.native[level] = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        this.push(level, args);
        this.native[level]?.(...args);
      };
    }
  }

  push(level: LogLevel, args: unknown[]): void {
    this.counter += 1;
    const entry: ConsoleEntry = {
      id: this.counter,
      timestamp: performance.now(),
      level,
      message: args.map((a) => safeStringify(a)).join(" "),
    };

    this.buffer.push(entry);
    if (this.buffer.length > MAX_ENTRIES) {
      this.buffer.splice(0, this.buffer.length - MAX_ENTRIES);
    }
    this.notify();
  }

  snapshot(): ReadonlyArray<ConsoleEntry> {
    return this.buffer;
  }

  clear(): void {
    if (this.buffer.length === 0) return;
    this.buffer = [];
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const consoleRing = new ConsoleRing();
