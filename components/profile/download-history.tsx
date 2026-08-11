"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api } from "@/lib/api/api-client";
import { File, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadDetailModal } from "@/components/profile/download-detail-modal";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function DownloadHistory() {
  const { t } = useI18n();
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedRecord, setSelectedRecord] = useState<DownloadRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/downloads/history?page=${page}&limit=${limit}`);
      
      let data;
      if (response && response.items) {
        data = response;
      } else if (response && response.data && response.data.items) {
        data = response.data;
      } else if (response && response.data) {
        data = response.data;
      } else {
        data = { items: [] };
      }

      setRecords(data.items || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      console.error("Error fetching download history:", err);
      setError(err.message || t("profile.download_history.error") || "Failed to load download history.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, t]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRedownload = async (record: DownloadRecord) => {
    setRedownloadingId(record.id);
    try {
      const res = await api.post(`/downloads/versions/${record.fileAssetId}/download`);
      const data = res?.data || res;
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        // Refresh history after a short delay since backend needs time to record
        setTimeout(() => fetchHistory(), 1000);
      } else {
        throw new Error("Failed to get download URL");
      }
    } catch (err: any) {
      console.error("Redownload error:", err);
      // Fallback alert if needed
      alert(err.message || "Failed to download file");
    } finally {
      setRedownloadingId(null);
      setDetailsOpen(false); // Close modal if open
    }
  };

  const openDetails = (record: DownloadRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>{t("profile.download_history.loading") || "Loading download history..."}</p>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={() => fetchHistory()}>
          {t("profile.download_history.retry") || "Retry"}
        </Button>
      </div>
    );
  }

  if (!loading && records.length === 0) {
    return (
      <Card className="border-dashed bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <Download className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            {t("profile.download_history.empty_title") || "No downloads yet."}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {t("profile.download_history.empty_description") || "Head over to the download page to get the latest version of Borrowed Shapes."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table Header */}
      <div 
        className="hidden md:grid gap-4 px-6 py-3 bg-muted/50 rounded-t-xl border border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        style={{ gridTemplateColumns: "minmax(0, 2.5fr) minmax(100px, 1fr) minmax(140px, 1.5fr) 180px" }}
      >
        <div>{t("profile.download_history.columns.file_name") || "File Name"}</div>
        <div>{t("profile.download_history.columns.version") || "Version"}</div>
        <div>{t("profile.download_history.columns.download_date") || "Download Date"}</div>
        <div className="text-right">{t("profile.download_history.columns.actions") || "Actions"}</div>
      </div>

      {/* List Items */}
      <div className="space-y-3">
        {records.map((record) => (
          <div 
            key={record.id}
            className="group relative bg-card dark:bg-[#0f0f1a] rounded-xl border border-border dark:border-[#1e1e3a] p-4 md:px-6 md:py-4 transition-all hover:border-amber-500/30 hover:shadow-md overflow-hidden flex flex-col md:grid md:items-center gap-4"
            style={{ gridTemplateColumns: "minmax(0, 2.5fr) minmax(100px, 1fr) minmax(140px, 1.5fr) 180px" }}
          >
            {/* File Info */}
            <div className="flex items-center gap-4 min-w-0 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                <File className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 
                  className="font-semibold text-foreground truncate block min-w-0"
                  title={record.fileName}
                >
                  {record.fileName}
                </h4>
                <div className="md:hidden flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 text-[10px] px-1.5 py-0 h-4">
                    v{record.version}
                  </Badge>
                  {record.isLatest && (
                    <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-[10px] px-1.5 py-0 h-4">
                      {t("profile.download_history.status.latest") || "Latest"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Version (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">
                v{record.version}
              </Badge>
              {record.isLatest && (
                <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                  {t("profile.download_history.status.latest") || "Latest"}
                </Badge>
              )}
            </div>

            {/* Download Date */}
            <div className="text-sm text-muted-foreground flex items-center">
              <span className="md:hidden font-medium mr-2">{t("profile.download_history.columns.download_date") || "Date"}:</span>
              {new Date(record.downloadDate).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 md:pt-0 border-t md:border-0 border-border/50">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => openDetails(record)}
              >
                <Info className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{t("profile.download_history.actions.details") || "Details"}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
                onClick={() => handleRedownload(record)}
                disabled={redownloadingId === record.id}
              >
                {redownloadingId === record.id ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{t("profile.download_history.actions.redownload") || "Redownload"}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-4 border-t border-border mt-6">
          <p className="text-sm text-muted-foreground">
            {t("profile.download_history.pagination.showing")?.replace('{from}', String((page - 1) * limit + 1)).replace('{to}', String(Math.min(page * limit, pagination.total))).replace('{total}', String(pagination.total)) || 
             `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, pagination.total)} of ${pagination.total} records`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              {t("profile.download_history.actions.previous") || "Previous"}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "ghost"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages || loading}
            >
              {t("profile.download_history.actions.next") || "Next"}
            </Button>
          </div>
        </div>
      )}

      <DownloadDetailModal 
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        record={selectedRecord}
        onRedownload={handleRedownload}
        isRedownloading={selectedRecord ? redownloadingId === selectedRecord.id : false}
      />
    </div>
  );
}
