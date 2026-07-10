"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  X,
  Loader2,
  AlertTriangle,
  UploadCloud,
  FileImage,
  FileVideo,
  ChevronDown,
  ChevronUp,
  Plus
} from "lucide-react";

const CommentCKEditor = dynamic(
  () => import("./comment-ckeditor").then((mod) => mod.CommentCKEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[120px] animate-pulse bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
    )
  }
);

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "user" | "thread" | "comment";
  reportedUserId: string;
  reportedUserDisplayName: string;
  reportedUserImgUrl?: string | null;
  threadId?: string;
  threadTitle?: string;
  commentId?: string;
  commentContent?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  reportedUserId,
  reportedUserDisplayName,
  reportedUserImgUrl,
  threadId,
  threadTitle,
  commentId,
  commentContent,
}: ReportModalProps) {
  const { t, locale } = useI18n();

  const [reportType, setReportType] = useState("SPAM");
  const [reason, setReason] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [zoomMedia, setZoomMedia] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      const currentTotalSize = selectedFiles.reduce((acc, item) => acc + item.file.size, 0);
      const newFilesSize = filesArray.reduce((acc, f) => acc + f.size, 0);
      const totalCombinedSize = currentTotalSize + newFilesSize;

      if (totalCombinedSize > 20 * 1024 * 1024) {
        toast.warning(t("reports.size_limit_exceeded") || "Total size of all attached files must not exceed 20MB!");
        return;
      }

      const newItems = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setSelectedFiles((prev) => [...prev, ...newItems]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const item = prev[index];
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim() || reason === "<p></p>") {
      toast.warning(t("reports.placeholder_reason"));
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      const uploadedMedia: { mediaUrl: string; mediaType: string; fileSize: number }[] = [];

      for (const item of selectedFiles) {
        const file = item.file;
        const mimeType = file.type;
        const mediaType = mimeType.startsWith("video/") ? "VIDEO" : "IMAGE";

        const uploadResp = await axios.post("/api/reports/upload", {
          fileName: file.name,
          fileSize: file.size,
          mimeType: mimeType,
          targetType: targetType,
          targetId: commentId || threadId || reportedUserId,
        });

        const uploadData = uploadResp.data?.data;
        if (!uploadData) {
          throw new Error("Failed to get presigned upload URL");
        }

        const putRes = await fetch(uploadData.uploadUrl, {
          method: uploadData.method,
          headers: uploadData.headers,
          body: file,
        });

        if (!putRes.ok) {
          throw new Error(`Failed to upload file ${file.name}`);
        }

        uploadedMedia.push({
          mediaUrl: uploadData.publicUrl,
          mediaType: mediaType,
          fileSize: file.size,
        });
      }

      const response = await axios.post("/api/reports", {
        reportedUserId,
        threadId: targetType === "thread" ? threadId : undefined,
        commentId: targetType === "comment" ? commentId : undefined,
        reportType,
        reason: reason.trim(),
        media: uploadedMedia,
      });

      if (response.data?.success) {
        toast.success(t("reports.success_submit"));
        setReason("");
        selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
        setSelectedFiles([]);
        onClose();
      } else {
        const errMsg = response.data?.message;
        toast.error(errMsg ? t(errMsg) : t("reports.failed_submit"));
      }
    } catch (error: any) {
      console.error("Report error:", error);
      const msg = error.response?.data?.message;
      let displayMsg = t("reports.failed_submit");
      if (msg) {
        displayMsg = Array.isArray(msg) ? msg.map((m: string) => t(m)).join(", ") : t(msg);
      } else if (error.message) {
        displayMsg = error.message;
      }
      toast.error(displayMsg);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const cleanCommentText = commentContent ? commentContent.replace(/<[^>]*>/g, "") : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b0b17] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>{t("reports.modal_title")}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200">
          {/* Target Metadata Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("reports.label_target")}:
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100/30 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-500/10">
                {t(`reports.targets.${targetType}`)}
              </span>
            </div>

            {/* Reported User Profile summary */}
            <div className="flex items-center gap-3 py-1">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-xs shadow-sm overflow-hidden flex-shrink-0">
                {reportedUserImgUrl ? (
                  <img src={reportedUserImgUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  reportedUserDisplayName.substring(0, 2).toUpperCase()
                )}
              </span>
              <div className="text-sm font-semibold">
                {reportedUserDisplayName}
              </div>
            </div>

            {/* Content Preview */}
            {targetType === "thread" && threadTitle && (
              <div className="text-sm border-l-2 border-violet-500 pl-3 py-1 italic font-medium text-slate-600 dark:text-slate-300">
                &ldquo;{threadTitle}&rdquo;
              </div>
            )}

            {targetType === "comment" && cleanCommentText && (
              <div className="text-sm border-l-2 border-violet-500 pl-3">
                <button
                  type="button"
                  onClick={() => setCommentExpanded(!commentExpanded)}
                  className="flex items-center gap-1 text-[11px] text-violet-500 hover:underline font-semibold focus:outline-none mb-1 cursor-pointer"
                >
                  <span>{t("reports.comment_content_title") || "Comment Content"}</span>
                  {commentExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <div
                  className={`text-slate-600 dark:text-slate-350 italic overflow-hidden transition-all duration-300 ${commentExpanded ? "max-h-[200px] overflow-y-auto" : "max-h-6 truncate"
                    }`}
                  dangerouslySetInnerHTML={{ __html: commentContent || "" }}
                />
              </div>
            )}
          </div>

          {/* Report Type selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("reports.label_target_type")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["SPAM", "HARASSMENT", "HATE_SPEECH", "NSFW", "MISINFORMATION", "OTHER"].map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportType === type
                      ? "border-red-500 bg-red-50/20 dark:bg-red-950/10 text-red-600 dark:text-red-400 font-semibold"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#07070f]"
                    }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type}
                    checked={reportType === type}
                    onChange={(e) => setReportType(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-xs">{t(`reports.types.${type}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason Editor */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("reports.label_reason")}
            </label>
            <CommentCKEditor
              value={reason}
              onChange={setReason}
              onSend={() => { }}
              placeholder={t("reports.placeholder_reason")}
              disabled={submitting}
            />
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{t("reports.label_media")}</span>
              <span className="text-[10px] text-slate-500 font-medium">
                {t("reports.max_total_size") || "Max 20MB total"}
              </span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              multiple
              className="hidden"
            />

            {/* Drag drop upload box - hidden if files selected */}
            {selectedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/30 dark:bg-[#07070f] transition-colors animate-fade-in"
              >
                <UploadCloud className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  {t("reports.upload_hint") || "Click to upload evidence files"}
                </p>
              </div>
            ) : (
              /* Selected files preview with thumbnails and a '+' add more button */
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2 animate-fade-in">
                {selectedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center cursor-pointer group"
                    onClick={() => setZoomMedia(item.preview)}
                  >
                    {item.file.type.startsWith("video/") ? (
                      <>
                        <video src={item.preview} className="w-full h-full object-cover pointer-events-none" muted />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <FileVideo className="h-6 w-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    )}

                    {/* Delete button overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/75 hover:bg-red-600 text-white rounded-full transition-colors z-10 cursor-pointer shadow-md"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-1 left-1.5 right-1.5 truncate text-[9px] bg-black/50 text-white px-1 rounded text-center pointer-events-none">
                      {item.file.name}
                    </div>
                  </div>
                ))}

                {/* Add more files card item in the grid */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video rounded-xl border-2 border-dashed border-slate-355 dark:border-slate-800 hover:border-violet-505 dark:hover:border-violet-500 text-slate-400 hover:text-violet-500 transition-colors flex flex-col items-center justify-center cursor-pointer bg-slate-50/20 dark:bg-[#07070f] shadow-sm"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-[10px] font-bold mt-1">
                    {t("reports.btn_add_file") || "Add file"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-semibold cursor-pointer"
            >
              {t("reports.btn_cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white transition-colors text-sm font-semibold cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("reports.submitting")}</span>
                </>
              ) : (
                <span>{t("reports.btn_submit")}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Fullscreen zoom modal */}
      {zoomMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4">
          <button
            type="button"
            onClick={() => setZoomMedia(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            {selectedFiles.find((f) => f.preview === zoomMedia)?.file.type.startsWith("video/") ? (
              <video src={zoomMedia} controls className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" autoPlay />
            ) : (
              <img src={zoomMedia} alt="Zoomed evidence preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
