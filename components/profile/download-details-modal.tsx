"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadCloud, FileText, Info, Clock, HardDrive } from "lucide-react";

interface DownloadDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  onRedownload: (id: string, version: string) => void;
  loadingId: string | null;
}

export function DownloadDetailsModal({
  isOpen,
  onOpenChange,
  record,
  onRedownload,
  loadingId,
}: DownloadDetailsModalProps) {
  const { t } = useI18n();

  if (!record) return null;

  const getFileSizeInMB = (bytes: number) => {
    if (!bytes) return "Unknown";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card dark:bg-[#0a0a15] border-border dark:border-white/10 text-foreground dark:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Info className="w-5 h-5 text-primary" />
            {t("profile.details")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("profile.file_information")}
            </h4>
            <div className="bg-muted dark:bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/70">
                  <FileText className="w-4 h-4" />
                  {t("profile.file_name")}
                </span>
                <span className="font-medium text-sm text-foreground dark:text-white max-w-[200px] truncate" title={record.version?.fileName}>
                  {record.version?.fileName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/70">
                  <span className="font-mono font-bold bg-background dark:bg-white/10 px-1.5 rounded text-[10px]">v</span>
                  {t("download.version")}
                </span>
                <span className="font-medium text-sm text-primary">
                  {record.version?.fileVersion}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/70">
                  <HardDrive className="w-4 h-4" />
                  {t("profile.file_size")}
                </span>
                <span className="font-medium text-sm text-foreground dark:text-white">
                  {getFileSizeInMB(record.version?.fileSize)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("profile.download_information")}
            </h4>
            <div className="bg-muted dark:bg-white/5 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/70">
                  <Clock className="w-4 h-4" />
                  {t("profile.download_date")}
                </span>
                <span className="font-medium text-sm text-foreground dark:text-white">
                  {new Date(record.downloadedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground dark:text-white/70">
                  <DownloadCloud className="w-4 h-4" />
                  {t("profile.downloaded_size")}
                </span>
                <span className="font-medium text-sm text-foreground dark:text-white">
                  {getFileSizeInMB(record.downloadedSize)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-accent dark:hover:bg-white/10">
            {t("profile.close")}
          </Button>
          <Button
            onClick={() => onRedownload(record.version?.id, record.version?.fileVersion)}
            disabled={loadingId === record.version?.id}
            className="bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            {loadingId === record.version?.id ? (
              <span className="animate-pulse">{t("download.downloading")}</span>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4 mr-2" />
                {t("profile.download_again")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
