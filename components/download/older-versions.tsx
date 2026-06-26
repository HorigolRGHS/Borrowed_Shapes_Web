"use client";

import { useState } from "react";
import { DownloadCloud, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { Button } from "@/components/ui/button";

interface OlderVersionsProps {
  versions: any[];
  onDownload: (id: string, version: string) => void;
  loadingId: string | null;
}

export function OlderVersions({ versions, onDownload, loadingId }: OlderVersionsProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  if (!versions || versions.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 mb-24">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-card/50 hover:bg-card border border-border dark:border-white/10 rounded-2xl transition-colors text-left"
      >
        <span className="font-bold tracking-wider text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors">
          {t("download.other_versions") || "Other Versions"}
        </span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="mt-4 bg-card dark:bg-[#0a0a15] border border-border dark:border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs uppercase bg-muted dark:bg-white/5 text-muted-foreground dark:text-white/70">
                <tr>
                  <th className="px-6 py-4">{t("download.version")}</th>
                  <th className="px-6 py-4">{t("download.type")}</th>
                  <th className="px-6 py-4">{t("download.date")}</th>
                  <th className="px-6 py-4 text-right">{t("download.action")}</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className="border-b border-border dark:border-white/5 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground dark:text-white flex items-center gap-2">
                      {v.fileVersion}
                      {v.isActive ? (
                        <span className="bg-amber-500/20 text-amber-600 dark:text-amber-500 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                          ★ {t("download.recommended_version") || "Recommended"}
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full border border-border">
                          {t("download.inactive_version") || "Older / Inactive"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{v.mimeType === "application/octet-stream" ? "Binary / Executable" : "Archive"}</td>
                    <td className="px-6 py-4">{new Date(v.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-accent hover:bg-accent/80 text-accent-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
                        onClick={() => onDownload(v.id, v.fileVersion)}
                        disabled={loadingId !== null}
                      >
                        {loadingId === v.id ? (
                          <span className="animate-pulse">{t("download.downloading")}</span>
                        ) : (
                          <>
                            <DownloadCloud className="w-4 h-4 mr-2" />
                            {t("download.title")}
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
