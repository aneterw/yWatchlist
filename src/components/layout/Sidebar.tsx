import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, List, Pencil, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isI18nKey } from "@/lib/i18nUtils";
import type { WatchlistItem } from "@/types";

interface SidebarProps {
  watchlists: Record<string, WatchlistItem[]>;
  activeWatchlist: string | null;
  onSelectWatchlist: (name: string) => void;
  onAddWatchlist: (name: string) => void;
  onDeleteWatchlist: (name: string) => void;
  onRenameWatchlist: (oldName: string, newName: string) => void;
}

export function Sidebar({
  watchlists,
  activeWatchlist,
  onSelectWatchlist,
  onAddWatchlist,
  onDeleteWatchlist,
  onRenameWatchlist,
}: SidebarProps) {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const watchlistNames = Object.keys(watchlists);

  const handleAdd = () => {
    if (newWatchlistName.trim()) {
      onAddWatchlist(newWatchlistName.trim());
      setNewWatchlistName("");
      setShowAddDialog(false);
    }
  };

  const handleDelete = () => {
    if (activeWatchlist) {
      onDeleteWatchlist(activeWatchlist);
      setShowDeleteDialog(false);
    }
  };

  const startEditing = (name: string) => {
    setEditingName(name);
    setEditedName(name);
  };

  const saveEditing = () => {
    if (editingName && editedName.trim() && editedName.trim() !== editingName) {
      onRenameWatchlist(editingName, editedName.trim());
    }
    setEditingName(null);
    setEditedName("");
  };

  const cancelEditing = () => {
    setEditingName(null);
    setEditedName("");
  };

  return (
    <aside className="w-64 border-r-2 border-[var(--color-border)] bg-[var(--color-card)] flex flex-col h-full text-[var(--color-foreground)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-[var(--color-primary)]" />
          <h1 className="font-semibold text-lg text-[var(--color-foreground)]">{t("app.title")}</h1>
          <span className="text-xs text-[var(--color-foreground)] opacity-70">{t("app.version")}</span>
        </div>
        <p className="text-xs text-[var(--color-foreground)] opacity-70 mt-1">
          {t("app.subtitle")}
        </p>
      </div>

      {/* Watchlist Actions */}
      <div className="p-3 flex gap-2 border-b border-[var(--color-border)]">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[var(--color-foreground)]"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          {t("sidebar.addWatchlist")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--color-foreground)]"
          onClick={() => setShowDeleteDialog(true)}
          disabled={!activeWatchlist}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Watchlist List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-medium text-[var(--color-foreground)] uppercase tracking-wider px-2 py-2">
          {t("sidebar.watchlists")}
        </div>

        {watchlistNames.length === 0 ? (
          <div className="text-sm text-[var(--color-foreground)] px-2 py-4 text-center">
            {t("sidebar.empty")}
          </div>
        ) : (
          <div className="space-y-1">
            {watchlistNames.map((name) => {
              const isActive = name === activeWatchlist;
              const itemCount = watchlists[name]?.length || 0;
              const isEditing = editingName === name;
              const displayName = isI18nKey(name) ? t(name) : name;

              return (
                <div
                  key={name}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group",
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "hover:bg-[var(--color-accent)] text-[var(--color-foreground)]"
                  )}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditing();
                          if (e.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                        className="h-6 text-xs py-0 px-1"
                      />
                      <button
                        onClick={saveEditing}
                        className="p-1 hover:bg-white/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 hover:bg-white/20 rounded"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectWatchlist(name)}
                        className="truncate flex-1"
                      >
                        {displayName}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => startEditing(name)}
                          className="p-1 hover:bg-white/20 rounded"
                          title={t("sidebar.rename")}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            isActive
                              ? "bg-white/20"
                              : "bg-[var(--color-muted)] text-[var(--color-foreground)]"
                          )}
                        >
                          {itemCount}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Watchlist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("sidebar.addWatchlist")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t("sidebar.newWatchlistName")}
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="text-[var(--color-foreground)]">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={!newWatchlistName.trim()}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("sidebar.deleteWatchlist")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-foreground)]">
            {t("sidebar.confirmDelete", { name: activeWatchlist })}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="text-[var(--color-foreground)]"
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}