"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api } from "@/lib/api/api-client";
import { UploadDialog } from "@/components/admin/upload-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VersionItem {
  id: string;
  fileName: string;
  fileVersion: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  updatedAt: string;
  isLatest: boolean;
  filePath?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function DownloadManagementPage() {
  const { t } = useI18n();
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/downloads/versions?page=${page}&limit=${limit}`);
      
      // Handle the case where api-client automatically unwraps or not
      let data;
      if (response && response.items) {
         data = response;
      } else if (response && response.data && response.data.items) {
         data = response.data;
      } else if (response && response.data) {
         data = response.data; // fallback
      } else {
         data = { items: [] };
      }

      setVersions(data.items || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      console.error("Error fetching versions:", err);
      setError(err.message || t("admin.download.versions.error") || "Failed to load game versions.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, t]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleUploadSuccess = () => {
    setPage(1); // Reset to first page
    fetchVersions();
  };

  const openDetails = (version: VersionItem) => {
    setSelectedVersion(version);
    setDetailsOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin.download.title") || "Download Management"}
          </h2>
          <p className="text-muted-foreground">
            {t("admin.download.subtitle") || "Manage game files and upload new versions."}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => fetchVersions()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <UploadDialog onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      <div className="pt-4">
        <Card>
          {error && (
            <div className="p-4 border-b">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          
          <CardContent className="p-0">
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{t("admin.download.versions.columns.version") || "Version"}</TableHead>
                    <TableHead>{t("admin.download.versions.columns.file_name") || "File Name"}</TableHead>
                    <TableHead>{t("admin.download.versions.columns.file_size") || "File Size"}</TableHead>
                    <TableHead>{t("admin.download.versions.columns.mime_type") || "MIME Type"}</TableHead>
                    <TableHead>{t("admin.download.versions.columns.uploaded_at") || "Uploaded At"}</TableHead>
                    <TableHead>{t("admin.download.versions.columns.status") || "Status"}</TableHead>
                    <TableHead className="text-right">{t("admin.download.versions.columns.actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                        {t("admin.download.versions.loading") || "Loading versions..."}
                      </TableCell>
                    </TableRow>
                  ) : versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                        {t("admin.download.versions.empty") || "No game versions uploaded yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell className="font-medium">{version.fileVersion}</TableCell>
                        <TableCell>{version.fileName}</TableCell>
                        <TableCell>{formatBytes(version.fileSize)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{version.mimeType}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(version.uploadedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {version.isLatest ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">{t("admin.download.versions.status.latest") || "Latest"}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("admin.download.versions.status.older") || "Older"}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetails(version)} className="gap-2">
                            <Info className="h-4 w-4" />
                            <span className="hidden sm:inline">{t("admin.download.versions.actions.details") || "Details"}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination UI */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {t("admin.download.versions.total") || "Total versions"}: {pagination.total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    {t("admin.download.versions.actions.previous") || "Previous"}
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages || loading}
                  >
                    {t("admin.download.versions.actions.next") || "Next"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("admin.download.versions.details.title") || "Version Details"}</DialogTitle>
          </DialogHeader>
          
          {selectedVersion && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.id") || "ID"}</div>
                <div className="col-span-2 text-sm font-mono break-all">{selectedVersion.id}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.file_name") || "File Name"}</div>
                <div className="col-span-2 text-sm">{selectedVersion.fileName}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.version") || "Version"}</div>
                <div className="col-span-2 text-sm font-medium">{selectedVersion.fileVersion}</div>
              </div>
              
              {selectedVersion.filePath && (
                <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                  <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.file_path") || "File Path"}</div>
                  <div className="col-span-2 text-sm font-mono break-all text-xs">{selectedVersion.filePath}</div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.file_size") || "File Size"}</div>
                <div className="col-span-2 text-sm">{formatBytes(selectedVersion.fileSize)}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.mime_type") || "MIME Type"}</div>
                <div className="col-span-2 text-sm">{selectedVersion.mimeType}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.uploaded_at") || "Uploaded At"}</div>
                <div className="col-span-2 text-sm">
                  {new Date(selectedVersion.uploadedAt).toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-b pb-2 border-border/50">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.updated_at") || "Updated At"}</div>
                <div className="col-span-2 text-sm">
                  {new Date(selectedVersion.updatedAt).toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.latest_status") || "Latest Status"}</div>
                <div className="col-span-2 text-sm">
                  {selectedVersion.isLatest ? (
                    <Badge className="bg-green-500 hover:bg-green-600">{t("admin.download.versions.status.latest") || "Latest"}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("admin.download.versions.status.older") || "Older"}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              {t("admin.download.versions.details.close") || "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
