"use client";

import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { Button } from "@/components/ui/button";

interface DownloadCardProps {
  latestVersion: any | null;
  loading: boolean;
  onDownload: () => void;
  selectedPlatform: string;
}

export function DownloadCard({ latestVersion, loading, onDownload, selectedPlatform }: DownloadCardProps) {
  const { t } = useI18n();

  const isWindows = selectedPlatform === "windows";

  const getFileSizeInMB = (bytes: number) => {
    if (!bytes) return "Unknown size";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="relative group w-full max-w-xl mx-auto">
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative bg-card/90 dark:bg-[#0a0a15]/90 backdrop-blur-xl border border-border dark:border-white/10 rounded-[2rem] p-8 md:p-12 flex flex-col items-center text-center shadow-2xl">
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-6 transition-transform">
          <Download className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground dark:text-white mb-2 tracking-tight">
          Borrowed Shapes
        </h2>
        
        {latestVersion ? (
          <div className="flex items-center gap-3 text-muted-foreground mb-8">
            <span className="font-mono bg-accent dark:bg-white/5 px-2 py-1 rounded-md text-sm">v{latestVersion.fileVersion}</span>
            <span>•</span>
            <span className="text-sm">{getFileSizeInMB(latestVersion.fileSize)}</span>
          </div>
        ) : (
          <div className="text-muted-foreground mb-8">
            {t("download.no_versions")}
          </div>
        )}

        <Button
          onClick={onDownload}
          disabled={loading || !latestVersion || !isWindows}
          className="w-full h-16 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all rounded-xl relative overflow-hidden"
        >
          {loading ? (
            <span className="animate-pulse">{t("download.downloading")}</span>
          ) : !isWindows ? (
            t("download.coming_soon")
          ) : (
            t("download.download_for_windows")
          )}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          {t("download.free_to_play")}
        </p>
      </div>
    </div>
  );
}
