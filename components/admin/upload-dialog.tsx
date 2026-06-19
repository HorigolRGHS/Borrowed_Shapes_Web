"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api } from "@/lib/api/api-client";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function getUploadMimeType(file: File): string {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".zip")) {
    return "application/zip";
  }
  if (fileName.endsWith(".exe") || fileName.endsWith(".msi")) {
    return "application/x-msdownload";
  }
  return "application/octet-stream";
}

export function UploadDialog({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState("1.0.0");

  const resetForm = () => {
    setSelectedFile(null);
    setVersion("1.0.0");
    setError(null);
    setSuccess(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && loading) return; // Prevent closing while uploading
    setOpen(newOpen);
    if (newOpen) {
      resetForm();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(t("admin.download.upload_dialog.errors.invalid_file") || "Please select a file");
      return;
    }
    const trimmedVersion = version.trim();
    if (!trimmedVersion) {
      setError(t("admin.download.upload_dialog.errors.invalid_version") || "Version is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Get Upload URL
      const uploadMimeType = getUploadMimeType(selectedFile);
      
      const uploadUrlData = await api.post("/downloads/admin/upload-url", {
        fileName: selectedFile.name,
        fileVersion: trimmedVersion,
        fileSize: selectedFile.size,
        mimeType: uploadMimeType,
      });

      if (!uploadUrlData?.success) {
        throw new Error(uploadUrlData?.message || "Failed to get upload URL");
      }

      const { uploadUrl, key, method, headers } = uploadUrlData.data;

      // 2. Upload file directly to R2 (bypassing api-client to prevent sending Authorization token)
      const putRes = await fetch(uploadUrl, {
        method: method || "PUT",
        headers: headers || {
          "Content-Type": uploadMimeType,
        },
        body: selectedFile,
        credentials: "omit",
      });

      if (!putRes.ok) {
        const errorText = await putRes.text().catch(() => "");
        throw new Error(`R2 upload failed: ${putRes.status} ${errorText}`);
      }

      // 3. Confirm upload
      const confirmData = await api.post("/downloads/admin/confirm-upload", {
        fileName: selectedFile.name,
        fileVersion: trimmedVersion,
        filePath: key,
        fileSize: selectedFile.size,
        mimeType: uploadMimeType,
      });

      if (!confirmData?.success) {
        throw new Error(confirmData?.message || "Failed to confirm upload");
      }

      setSuccess(t("admin.download.upload_dialog.success") || "Upload successful!");
      
      // Keep success message visible briefly before closing
      setTimeout(() => {
        setOpen(false);
        if (onUploadSuccess) onUploadSuccess();
      }, 2000);

    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.data?.code || responseData?.error?.code || responseData?.message?.code;
      const detailsVersion = responseData?.data?.details?.fileVersion || responseData?.message?.details?.fileVersion;

      if (code === "FILE_VERSION_EXISTS") {
        const v = detailsVersion || trimmedVersion;
        const msg = t("admin.download.upload_dialog.errors.version_exists") as string || "Version {version} already exists. Please use another version.";
        setError(msg.replace("{version}", v));
      } else if (err.message && err.message.includes("unique")) {
        const msg = t("admin.download.upload_dialog.errors.version_exists") as string || "Version {version} already exists. Please use another version.";
        setError(msg.replace("{version}", trimmedVersion));
      } else {
        setError(
          responseData?.message?.message || 
          responseData?.message || 
          err.message || 
          (t("admin.download.upload_dialog.errors.generic") as string) || 
          "Upload failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UploadCloud className="w-4 h-4" />
          {t("admin.download.upload") || "Upload"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("admin.download.upload_dialog.title") || "Upload Game File"}</DialogTitle>
          <DialogDescription>
            {t("admin.download.upload_dialog.description") || "Upload a new version of the game to R2 storage."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500 text-green-500 bg-green-500/10">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="file">{t("admin.download.upload_dialog.file") || "Game File"}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
                disabled={loading}
              />
            </div>
            {selectedFile && (
              <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1">
                <span className="flex items-center gap-1">
                  <FileIcon className="w-3 h-3" />
                  {selectedFile.name}
                </span>
                <span>
                  {t("admin.download.upload_dialog.file_size") || "File Size"}: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="text-[10px] italic mt-1">
                  {t("admin.download.upload_dialog.test_file_note") || "Test files such as .txt will be uploaded as application/octet-stream."}
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="version">{t("admin.download.upload_dialog.version") || "Version"}</Label>
            <Input
              id="version"
              placeholder="1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("admin.download.upload_dialog.cancel") || "Cancel"}
          </Button>
          <Button onClick={handleUpload} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {t("admin.download.upload_dialog.uploading") || "Uploading..."}
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                {t("admin.download.upload_dialog.submit") || "Upload"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
