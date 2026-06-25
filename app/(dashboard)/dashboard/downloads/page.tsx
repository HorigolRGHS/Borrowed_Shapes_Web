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
import { Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  isActive: boolean;
  filePath?: string;
  downloadCount?: number;
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
  const limit = 5;

  const [sortBy, setSortBy] = useState("uploadedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [activeConfirmOpen, setActiveConfirmOpen] = useState(false);
  const [targetActiveVersion, setTargetActiveVersion] = useState<VersionItem | null>(null);
  const [settingActive, setSettingActive] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/downloads/versions?page=${page}&limit=${limit}&sortBy=${sortBy}&sort=${sortOrder}`);
      
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
  }, [page, limit, sortBy, sortOrder, t]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleUploadSuccess = () => {
    setPage(1); // Reset to first page
    fetchVersions();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      if (sortOrder === "desc") {
        setSortOrder("asc");
      } else {
        // Reset to default list state on 3rd click
        setSortBy("uploadedAt");
        setSortOrder("desc");
      }
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const openDetails = (version: VersionItem) => {
    setSelectedVersion(version);
    setDetailsOpen(true);
  };

  const handleSetActive = async () => {
    if (!targetActiveVersion) return;
    setSettingActive(true);
    try {
      await api.patch(`/downloads/admin/versions/${targetActiveVersion.id}/active`);
      setActiveConfirmOpen(false);
      fetchVersions();
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("admin.download.active.error") || "Failed to set active version");
      setActiveConfirmOpen(false);
    } finally {
      setSettingActive(false);
    }
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
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('downloadCount')}>
                      <div className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {t("admin.download.versions.columns.downloads") || "Downloads"}
                        {sortBy === 'downloadCount' ? (sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />}
                      </div>
                    </TableHead>
                    <TableHead>{t("admin.download.versions.columns.mime_type") || "MIME Type"}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('uploadedAt')}>
                      <div className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {t("admin.download.versions.columns.uploaded_at") || "Uploaded At"}
                        {sortBy === 'uploadedAt' ? (sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />}
                      </div>
                    </TableHead>
                    <TableHead>{t("admin.download.versions.columns.status") || "Status"}</TableHead>
                    <TableHead className="text-right">{t("admin.download.versions.columns.actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                        {t("admin.download.versions.loading") || "Loading versions..."}
                      </TableCell>
                    </TableRow>
                  ) : versions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                        {t("admin.download.versions.empty") || "No game versions uploaded yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    versions.map((version) => (
                      <TableRow 
                        key={version.id}
                        className={version.isActive ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500" : ""}
                      >
                        <TableCell className="font-medium">{version.fileVersion}</TableCell>
                        <TableCell>{version.fileName}</TableCell>
                        <TableCell>{formatBytes(version.fileSize)}</TableCell>
                        <TableCell>{Intl.NumberFormat('en-US').format(version.downloadCount || 0)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{version.mimeType}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(version.uploadedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            {version.isActive ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                                {t("admin.download.active.badge") || "Active"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
                                {t("admin.download.active.inactive_badge") || "Inactive"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {version.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2 opacity-50 cursor-default hover:bg-transparent"
                              disabled
                            >
                              {t("admin.download.active.current") || "Current Version"}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2 border-amber-500/50 text-amber-600 dark:text-amber-500 hover:bg-amber-500/10"
                              onClick={() => {
                                setTargetActiveVersion(version);
                                setActiveConfirmOpen(true);
                              }}
                            >
                              {t("admin.download.active.set_active") || "Set Active"}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openDetails(version)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination UI */}
            {pagination && pagination.total >= 6 && (
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
                    {t("admin.download.versions.pagination.pageInfo", { page, totalPages: pagination.totalPages }) || `Page ${page} of ${pagination.totalPages}`}
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
                <div className="col-span-1 text-sm font-medium text-muted-foreground">{t("admin.download.versions.details.total_downloads") || "Total downloads"}</div>
                <div className="col-span-2 text-sm">{Intl.NumberFormat('en-US').format(selectedVersion.downloadCount || 0)}</div>
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

      {/* Set Active Confirm Modal */}
      <Dialog open={activeConfirmOpen} onOpenChange={setActiveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.download.active.title") || "Set Active Download Version"}</DialogTitle>
            <DialogDescription>
              {t("admin.download.active.description") || "This version will be shown on the public download page. Users will download this version until another one is selected."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="text-sm text-muted-foreground mb-4 space-y-2">
              <p>
                {t("admin.download.active.description") || "This version will become the recommended download on the public Download page. The previous active version will become inactive but will remain in the version list."}
              </p>
              <p className="font-medium text-foreground">
                {t("admin.download.active.warning") || "Use this when the newest upload has issues and you want users to download a stable older version."}
              </p>
            </div>
            
            <div className="space-y-3">
              {versions.find(v => v.isActive) && (
                <div className="bg-muted/50 p-3 rounded-md text-sm flex items-center justify-between border">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">
                      {t("admin.download.active.current_version") || "Current active version"}
                    </span>
                    <span className="font-medium">{versions.find(v => v.isActive)?.fileName}</span>
                  </div>
                  <Badge variant="secondary">{versions.find(v => v.isActive)?.fileVersion}</Badge>
                </div>
              )}

              {targetActiveVersion && (
                <div className="bg-amber-500/10 p-3 rounded-md text-sm flex items-center justify-between border border-amber-500/30">
                  <div>
                    <span className="text-xs text-amber-600 dark:text-amber-500 block mb-1 font-medium">
                      {t("admin.download.active.new_version") || "New active version"}
                    </span>
                    <span className="font-medium">{targetActiveVersion.fileName}</span>
                  </div>
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{targetActiveVersion.fileVersion}</Badge>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveConfirmOpen(false)} disabled={settingActive}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSetActive} disabled={settingActive}>
              {settingActive ? "..." : (t("admin.download.active.confirm") || "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
