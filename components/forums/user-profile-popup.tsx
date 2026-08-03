"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  X,
  Flag,
  Calendar,
  ShieldAlert,
  Shield,
  UploadCloud,
  Loader2,
  FileVideo,
  ChevronDown,
  ChevronUp,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";

const CommentCKEditor = dynamic(
  () => import("./comment-ckeditor").then((mod) => mod.CommentCKEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60px] animate-pulse bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
    ),
  }
);

interface UserProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    displayName: string;
    imgUrl: string | null;
    badgeImageUrl: string | null;
    role?: string;
    createdAt?: string | Date;
  };
  currentUser: any;
  locale: string;
  t: (key: string) => string;
}

export default function UserProfilePopup({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  locale,
  t,
}: UserProfilePopupProps) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState("SPAM");
  const [reason, setReason] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [zoomMedia, setZoomMedia] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowReportForm(false);
      setReason("");
      setSelectedFiles([]);
    }
  }, [isOpen]);

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

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast.warning(t("comments.login_to_vote") || "Please login to report");
      return;
    }

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
          targetType: "user",
          targetId: targetUser.id,
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
        reportedUserId: targetUser.id,
        reportType,
        reason: reason.trim(),
        media: uploadedMedia,
      });

      if (response.data?.success) {
        toast.success(t("reports.success_submit"));
        setReason("");
        selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
        setSelectedFiles([]);
        setShowReportForm(false);
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

  const joinDateStr = (() => {
    if (!targetUser.createdAt) return null;
    try {
      const date = new Date(targetUser.createdAt);
      return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  })();

  const roleText = (() => {
    if (!targetUser.role) return t("reports.role_member") || "Member";
    const r = targetUser.role.toUpperCase();
    if (r === "ADMIN") return t("reports.role_admin") || "Administrator";
    if (r === "MODERATOR") return t("reports.role_mod") || "Moderator";
    return t("reports.role_member") || "Member";
  })();

  const isAdminOrMod = targetUser.role === "ADMIN" || targetUser.role === "MODERATOR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Popup Container */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 transform scale-100">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-violet-600 via-indigo-500 to-teal-500 w-full flex-shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer z-20"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* User Information Card */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            {/* Avatar with Badge */}
            <div className="relative flex h-20 w-20 items-center justify-center flex-shrink-0">
              <div
                className={`absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-extrabold text-2xl shadow-lg overflow-hidden z-0 flex items-center justify-center ${targetUser.badgeImageUrl ? "rounded-xl" : "rounded-full"
                  }`}
              >
                {targetUser.imgUrl ? (
                  <img src={targetUser.imgUrl} alt={targetUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  targetUser.displayName.substring(0, 2).toUpperCase()
                )}
              </div>
              {targetUser.badgeImageUrl && (
                <img
                  src={targetUser.badgeImageUrl}
                  alt="Equipped badge frame"
                  className="pointer-events-none absolute inset-0 z-10 w-full h-full object-contain drop-shadow-md animate-pulse-slow"
                />
              )}
            </div>

            {/* Display Name & Role Pill */}
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>{targetUser.displayName}</span>
                {isAdminOrMod && (
                  <ShieldCheckIcon className="h-4.5 w-4.5 text-violet-500" title={roleText} />
                )}
              </h3>
              <div className="flex justify-center">
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${targetUser.role === "ADMIN"
                      ? "bg-violet-100/40 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-500/20"
                      : targetUser.role === "MODERATOR"
                        ? "bg-teal-100/40 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border-teal-500/20"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50"
                    }`}
                >
                  {roleText}
                </span>
              </div>
            </div>

            {/* Join Date */}
            {joinDateStr && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {t("reports.joined_at") ? `${t("reports.joined_at")} ${joinDateStr}` : `Joined ${joinDateStr}`}
                </span>
              </p>
            )}

            {/* Report Trigger Button */}
            {currentUser && String(currentUser.id) !== String(targetUser.id) && (
              <div className="pt-2 w-full">
                <button
                  type="button"
                  onClick={() => setShowReportForm(!showReportForm)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 border flex items-center justify-center gap-2 cursor-pointer ${showReportForm
                      ? "border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      : "bg-red-50/50 dark:bg-red-950/10 border-red-500/20 hover:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-100/30 dark:hover:bg-red-950/20"
                    }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>
                    {showReportForm
                      ? t("reports.cancel_report") || "Cancel Report"
                      : t("reports.report_user_btn") || "Report this user"}
                  </span>
                  {showReportForm ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Report Form */}
          {showReportForm && (
            <form onSubmit={handleReportSubmit} className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-red-500">
                <ShieldAlert className="h-4.5 w-4.5" />
                <span>{t("reports.report_form_title") || "Report Form"}</span>
              </h4>

              {/* Report Type selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  {t("reports.label_target_type") || "Violation Type"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["SPAM", "HARASSMENT", "HATE_SPEECH", "NSFW", "MISINFORMATION", "OTHER"].map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${reportType === type
                          ? "border-red-500 bg-red-50/20 dark:bg-red-950/10 text-red-650 dark:text-red-400 font-semibold"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 bg-white dark:bg-[#07070f]"
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
                      <span className="text-[11px]">{t(`reports.types.${type}`) || type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reason Editor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  {t("reports.label_reason") || "Explanation Reason"}
                </label>
                <CommentCKEditor
                  value={reason}
                  onChange={setReason}
                  onSend={() => { }}
                  placeholder={t("reports.placeholder_reason") || "Enter reason details..."}
                  disabled={submitting}
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center justify-between">
                  <span>{t("reports.label_media") || "Evidence Media"}</span>
                  <span className="text-[9px] text-slate-400 font-medium">
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
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/30 dark:bg-[#07070f] transition-colors animate-fade-in"
                  >
                    <UploadCloud className="h-7 w-7 mx-auto text-slate-400 mb-1" />
                    <p className="text-[10px] text-slate-500 font-medium">
                      {t("reports.upload_hint") || "Click to upload evidence files"}
                    </p>
                  </div>
                ) : (
                  /* Selected files preview with thumbnails and a '+' add more button */
                  <div className="grid grid-cols-3 gap-2.5 pt-2 animate-fade-in">
                    {selectedFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850 bg-slate-900 flex items-center justify-center cursor-pointer group"
                        onClick={() => setZoomMedia(item.preview)}
                      >
                        {item.file.type.startsWith("video/") ? (
                          <>
                            <video src={item.preview} className="w-full h-full object-cover pointer-events-none" muted />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <FileVideo className="h-5 w-5 text-white" />
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
                          className="absolute top-1 right-1 p-0.5 bg-black/75 hover:bg-red-600 text-white rounded-full transition-colors z-10 cursor-pointer shadow-md"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <div className="absolute bottom-0.5 left-1 right-1 truncate text-[8px] bg-black/50 text-white px-0.5 rounded text-center pointer-events-none">
                          {item.file.name}
                        </div>
                      </div>
                    ))}

                    {/* Add more files card item in the grid */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative aspect-video rounded-lg border-2 border-dashed border-slate-350 dark:border-slate-800 hover:border-violet-505 dark:hover:border-violet-500 text-slate-400 hover:text-violet-500 transition-colors flex flex-col items-center justify-center cursor-pointer bg-slate-50/20 dark:bg-[#07070f] shadow-sm"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-bold mt-0.5">
                        {t("reports.btn_add_file") || "Add file"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold cursor-pointer"
                >
                  {t("reports.btn_cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white transition-colors text-xs font-semibold cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{t("reports.submitting") || "Submitting..."}</span>
                    </>
                  ) : (
                    <>
                      <Flag className="h-3.5 w-3.5" />
                      <span>{t("reports.btn_submit") || "Submit"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
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

function ShieldCheckIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <span className={className} title={title}>
      <Shield className="h-full w-full fill-violet-500/10" />
    </span>
  );
}
