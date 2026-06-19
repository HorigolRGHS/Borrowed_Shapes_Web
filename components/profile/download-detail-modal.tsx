"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { Download, File, X, Info, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DownloadRecord {
  id: string;
  fileAssetId: string;
  fileName: string;
  version: string;
  fileSize: number;
  downloadSize: number;
  mimeType: string;
  downloadDate: string;
  uploadedAt?: string;
  isLatest?: boolean;
}

interface DownloadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: DownloadRecord | null;
  onRedownload: (fileAssetId: string) => void;
  isRedownloading: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function DownloadDetailModal({
  open,
  onOpenChange,
  record,
  onRedownload,
  isRedownloading,
}: DownloadDetailModalProps) {
  const { t } = useI18n();

  if (!record) return null;

  const handleRedownload = () => {
    onRedownload(record.fileAssetId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card dark:bg-[#0f0f1a] backdrop-blur-xl border-border dark:border-[#1e1e3a] text-foreground shadow-2xl p-0 overflow-hidden rounded-2xl w-full">
        {/* Header Background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
        
        <DialogHeader className="p-6 pb-0 relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {t("profile.download_history.detail.title") || "Download Details"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {t("profile.download_history.detail.description") || "Review file and download information"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pt-6 relative z-10 space-y-6">
          {/* Main Info Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
              <File className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground text-lg break-all line-clamp-2" title={record.fileName}>
                  {record.fileName}
                </h3>
                {record.isLatest && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-1.5 py-0">
                    {t("profile.download_history.status.latest") || "Latest"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="font-medium text-foreground/80">v{record.version}</span>
                <span className="text-border">•</span>
                <span>{formatBytes(record.fileSize)}</span>
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("profile.download_history.detail.date_time") || "Date & Time"}
              </label>
              <p className="text-sm font-medium text-foreground">
                {new Date(record.downloadDate).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("profile.download_history.detail.download_size") || "Download Size"}
              </label>
              <p className="text-sm font-medium text-foreground">
                {formatBytes(record.downloadSize)}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("profile.download_history.detail.mime_type") || "MIME Type"}
              </label>
              <p className="text-sm font-medium text-foreground break-all" title={record.mimeType}>
                {record.mimeType || "application/octet-stream"}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("profile.download_history.detail.status") || "Status"}
              </label>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-500">
                  {t("profile.download_history.status.completed") || "Completed"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("profile.download_history.actions.close") || "Close"}
          </Button>
          <Button 
            onClick={handleRedownload} 
            disabled={isRedownloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] border-0"
          >
            {isRedownloading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("profile.download_history.actions.redownload") || "Redownloading..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("profile.download_history.actions.download_again") || "Download Again"}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
