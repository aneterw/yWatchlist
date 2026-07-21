import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Cookie, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COOKIE_STORAGE_KEY = "ywatchlist_yahoo_cookies";

interface YahooCookies {
  a3: string;
  guc: string;
}

interface CookieSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CookieSettings({ open, onOpenChange }: CookieSettingsProps) {
  const { t } = useTranslation();
  const [cookies, setCookies] = useState<YahooCookies>({ a3: "", guc: "" });
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [isSaved, setIsSaved] = useState(false);

  // Load saved cookies on mount
  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCookies({ a3: parsed.a3 || "", guc: parsed.guc || "" });
        setIsSaved(true);
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(cookies));
    setIsSaved(true);
    // Show brief confirmation
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTest = async () => {
    setTestStatus("testing");
    // Simulate test - in real implementation, this would test against Yahoo
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // For now, just check if cookies are non-empty
    if (cookies.a3.length > 0 && cookies.guc.length > 0) {
      setTestStatus("success");
    } else {
      setTestStatus("failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-[var(--color-foreground)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--color-foreground)]">
            <Cookie className="w-5 h-5 text-yellow-400" />
            {t("fundamental.cookie_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div className="text-sm text-[var(--color-foreground)] opacity-80 space-y-2">
            <p>{t("fundamental.cookie_desc")}</p>
            <div className="bg-muted/50 p-3 rounded-md space-y-1 text-xs text-[var(--color-foreground)] opacity-70">
              <p>{t("fundamental.cookie_step1")}</p>
              <p>{t("fundamental.cookie_step2")}</p>
              <p>{t("fundamental.cookie_step3")}</p>
              <p>{t("fundamental.cookie_step4")}</p>
            </div>
          </div>

          {/* Cookie Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1 text-[var(--color-foreground)]">
                {t("fundamental.a3_cookie")}
              </label>
              <Input
                type="text"
                value={cookies.a3}
                onChange={(e) => setCookies({ ...cookies, a3: e.target.value })}
                placeholder="A3=xxxxxxxxxxxxxx"
                className="font-mono text-sm text-[var(--color-foreground)] bg-[var(--color-input)] border-[var(--color-border)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1 text-[var(--color-foreground)]">
                {t("fundamental.guc_cookie")}
              </label>
              <Input
                type="text"
                value={cookies.guc}
                onChange={(e) => setCookies({ ...cookies, guc: e.target.value })}
                placeholder="GUC=xxxxxxxxxxxxxx"
                className="font-mono text-sm text-[var(--color-foreground)] bg-[var(--color-input)] border-[var(--color-border)]"
              />
            </div>
          </div>

          {/* Test Result */}
          {testStatus === "success" && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle className="w-4 h-4" />
              {t("fundamental.test_success")}
            </div>
          )}
          {testStatus === "failed" && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <XCircle className="w-4 h-4" />
              {t("fundamental.test_failed")}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testStatus === "testing"}
              className="flex-1 text-[var(--color-foreground)]"
            >
              {testStatus === "testing" ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                t("fundamental.test_connection")
              )}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
            >
              {isSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  ✓
                </>
              ) : (
                t("fundamental.save_apply")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get stored cookies
export function getYahooCookies(): YahooCookies | null {
  const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// Helper function to clear cookies
export function clearYahooCookies(): void {
  localStorage.removeItem(COOKIE_STORAGE_KEY);
}