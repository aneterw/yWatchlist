import { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, X, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { consoleRing, type ConsoleEntry, type LogLevel } from "@/lib/consoleInterceptor";

type DrawerState = "hidden" | "collapsed" | "expanded";

const EXPANDED_WIDTH = 380;
const IDLE_COLLAPSE_MS = 30_000;

const LEVEL_COLORS: Record<LogLevel, { badge: string; text: string; bg: string }> = {
  log: { badge: "bg-gray-600", text: "text-gray-100", bg: "bg-gray-950" },
  info: { badge: "bg-blue-600", text: "text-blue-100", bg: "bg-blue-950/40" },
  warn: { badge: "bg-amber-600", text: "text-amber-100", bg: "bg-amber-950/50" },
  error: { badge: "bg-red-700", text: "text-red-100", bg: "bg-red-950/60" },
  debug: { badge: "bg-purple-700", text: "text-purple-100", bg: "bg-purple-950/40" },
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  if (m > 0) return `${m}:${String(s % 60).padStart(2, "0")}`;
  return `${s}.${String(ms % 1000).padStart(3, "0")}`;
}

interface EntryRowProps {
  entry: ConsoleEntry;
}

function EntryRow({ entry }: EntryRowProps) {
  const colors = LEVEL_COLORS[entry.level];
  return (
    <div className={cn("flex gap-2 px-2 py-0.5 rounded text-xs font-mono leading-5 hover:bg-white/5", colors.bg)}>
      <span className={cn("shrink-0 w-10 text-right opacity-50 select-none", colors.text)}>
        {formatTime(entry.timestamp)}
      </span>
      <span className={cn("shrink-0 w-5 h-4 rounded text-[10px] flex items-center justify-center font-bold", colors.badge, colors.text)}>
        {entry.level === "error" ? "✕" : entry.level[0].toUpperCase()}
      </span>
      <span className={cn("break-all whitespace-pre-wrap", colors.text)}>
        {entry.message}
      </span>
    </div>
  );
}

interface DevDrawerProps {
  state: DrawerState;
  onStateChange: (s: DrawerState) => void;
}

export function DevDrawer({ state, onStateChange }: DevDrawerProps) {
  const [entries, setEntries] = useState<ReadonlyArray<ConsoleEntry>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Install interceptor and subscribe on mount
  useEffect(() => {
    consoleRing.install();
    const unsub = consoleRing.subscribe((snapshot) => {
      setEntries(snapshot);
      if (snapshot.length > 0 && state !== "expanded") {
        setUnreadCount((n) => Math.min(n + 1, 99));
        if (state === "hidden") {
          onStateChange("collapsed");
        }
      }
      // reset idle timer on new entry
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        onStateChange("collapsed");
        setUnreadCount(0);
      }, IDLE_COLLAPSE_MS);
    });
    return () => {
      unsub();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when expanded
  useEffect(() => {
    if (state === "expanded") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, state]);

  const toggle = useCallback(() => {
    onStateChange(state === "expanded" ? "collapsed" : "expanded");
    setUnreadCount(0);
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, [state, onStateChange]);

  const collapse = useCallback(() => {
    onStateChange("collapsed");
    setUnreadCount(0);
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, [onStateChange]);

  const clear = useCallback(() => {
    consoleRing.clear();
    setUnreadCount(0);
  }, []);

  // Keyboard shortcut: Ctrl+`
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        onStateChange(state === "expanded" ? "collapsed" : (state === "collapsed" ? "expanded" : "expanded"));
        setUnreadCount(0);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onStateChange]);

  const isCollapsed = state === "collapsed";
  const isExpanded = state === "expanded";
  const isHidden = state === "hidden";

  if (isHidden) return null;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-[9999] flex flex-col h-full transition-all duration-200 ease-out",
        "bg-[#1a1a1a] border-l border-[#333] shadow-2xl",
        isCollapsed && "w-6",
        isExpanded && `w-[${EXPANDED_WIDTH}px]`
      )}
      style={{ width: isExpanded ? EXPANDED_WIDTH : isCollapsed ? 24 : 0 }}
    >
      {/* ── Collapsed strip ── */}
      {isCollapsed && (
        <button
          onClick={toggle}
          className="flex flex-col items-center justify-center h-full gap-2 text-[#555] hover:text-[#aaa] transition-colors cursor-pointer"
          title="DevDrawer (Ctrl+`)"
        >
          <Terminal className="w-3.5 h-3.5 shrink-0 -rotate-90" />
          {unreadCount > 0 && (
            <span className="text-[9px] font-mono bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-2 h-9 bg-[#222] border-b border-[#333] shrink-0">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#888]" />
              <span className="text-xs font-semibold text-[#888] tracking-wide uppercase select-none">
                Console
              </span>
              <span className="text-[10px] text-[#555] tabular-nums">{entries.length} logs</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={clear}
                className="p-1 rounded hover:bg-[#333] text-[#555] hover:text-[#aaa] transition-colors"
                title="Clear console"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={collapse}
                className="p-1 rounded hover:bg-[#333] text-[#555] hover:text-[#aaa] transition-colors"
                title="Collapse (Ctrl+`)"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onStateChange("hidden")}
                className="p-1 rounded hover:bg-[#333] text-[#555] hover:text-[#aaa] transition-colors"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 overscroll-contain">
            {entries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#555] text-xs select-none">
                No logs yet
              </div>
            ) : (
              entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </>
      )}
    </div>
  );
}