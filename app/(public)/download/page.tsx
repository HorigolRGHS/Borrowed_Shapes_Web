"use client";

import { useState, useEffect } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { DownloadCard } from "@/components/download/download-card";
import { PlatformSelector } from "@/components/download/platform-selector";
import { OlderVersions } from "@/components/download/older-versions";
import { useI18n } from "@/lib/i18/i18n-context";
import { api } from "@/lib/api/api-client";

export default function DownloadPage() {
  const { t } = useI18n();
  const [versions, setVersions] = useState<any[]>([]);
  const [latestVersion, setLatestVersion] = useState<any | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("windows");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const data = await api.get("/downloads/versions");
      const items = data?.data?.items || [];
      
      setVersions(items);
      if (items.length > 0) {
        setLatestVersion(items.find((i: any) => i.isLatest) || items[0]);
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    }
  };

  const handleDownload = async (id: string, versionString: string) => {
    setLoadingId(id);
    if (id === latestVersion?.id) {
      setLoadingLatest(true);
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const downloadData = await api.post(`/downloads/versions/${id}/download`);

      if (!downloadData?.success || !downloadData?.data?.downloadUrl) {
        setErrorMsg(downloadData?.message || t("download.download_fail"));
        return;
      }

      setSuccessMsg(t("download.downloaded"));
      window.open(downloadData.data.downloadUrl, "_blank");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || t("download.download_fail"));
    } finally {
      setLoadingId(null);
      setLoadingLatest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans">
      <PublicHeader />

      <main className="flex-1 flex flex-col items-center pt-32 pb-16 px-4">
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-extrabold text-foreground dark:text-white mb-6">
            {t("download.title")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("download.description")}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-center">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="w-full max-w-2xl mx-auto mb-6 p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-center">
            {successMsg}
          </div>
        )}

        <PlatformSelector
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
        />

        <div className="w-full mt-8">
          <DownloadCard
            latestVersion={latestVersion}
            loading={loadingLatest}
            onDownload={() => latestVersion && handleDownload(latestVersion.id, latestVersion.fileVersion)}
            selectedPlatform={selectedPlatform}
          />
        </div>

        <OlderVersions
          versions={versions}
          onDownload={handleDownload}
          loadingId={loadingId}
        />
      </main>

      <PublicFooter />
    </div>
  );
}
