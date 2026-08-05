"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Eye,
  X,
  FileText,
  User,
  Shield,
  Loader2,
  Lock,
  Flag,
  UserX,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface ReportDetail {
  id: string;
  reportType: string;
  reason: string;
  status: string;
  createdAt: string;
  handledAt: string | null;
  reporter: { id: string; displayName: string; imgUrl: string | null };
  reportedUser: { id: string; displayName: string; imgUrl: string | null } | null;
  thread: { id: string; title: string; slug: string } | null;
  comment: { id: string; content: string; threadId: string | null; threadSlug: string | null } | null;
  media: { id: string; mediaUrl: string; mediaType: string; fileSize: number | null }[];
  response: {
    id: string;
    message: string;
    actionTaken: string;
    createdAt: string;
    admin: { id: string; displayName: string };
  } | null;
}

export default function AdminReportDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t, locale } = useI18n();

  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [adminMessage, setAdminMessage] = useState("");
  const [actionType, setActionType] = useState("WARNING");
  const [banDuration, setBanDuration] = useState("");
  const [isVisibleToReporter, setIsVisibleToReporter] = useState(true);
  const [zoomMedia, setZoomMedia] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [adminMessage]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/reports/${id}`);
      if (res.data?.success) {
        setDetail(res.data.data);
      } else {
        toast.error("Failed to load details");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message;
      const displayMsg = msg ? (Array.isArray(msg) ? msg.map((m: string) => t(m)).join(", ") : t(msg)) : err.message;
      toast.error(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const handleSubmit = async () => {
    if (!adminMessage.trim()) {
      toast.warning(t("reports.placeholder_reason"));
      return;
    }

    if (actionType === "BAN_CUSTOM" && !banDuration) {
      toast.warning(t("reports.dashboard.choose_custom_ban_date") || "Please choose custom ban date!");
      return;
    }

    if (actionType === "BAN_CUSTOM" && banDuration) {
      // Ensure the selected date is in the future
      const [year, month, day] = banDuration.split("-").map(Number);
      const banDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      if (banDate <= new Date()) {
        toast.error(t("admin.account.modal.ban_date_past") || "Ban expiration date must be in the future.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (actionType === "REJECT") {
        const res = await axios.post(`/api/reports/${id}/reject`, {
          message: adminMessage.trim(),
          isVisibleToReporter,
        });

        if (res.data?.success) {
          toast.success(t("reports.dashboard.success_action"));
          setAdminMessage("");
          fetchDetail();
        } else {
          const errMsg = res.data?.message;
          toast.error(errMsg ? t(errMsg) : t("reports.dashboard.error_action"));
        }
      } else {
        let customExpires: string | undefined = undefined;
        if (actionType === "BAN_CUSTOM" && banDuration) {
          const [year, month, day] = banDuration.split("-").map(Number);
          customExpires = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
        }

        const res = await axios.post(`/api/reports/${id}/resolve`, {
          actionTaken: actionType,
          message: adminMessage.trim(),
          banExpiresAt: customExpires,
          isVisibleToReporter,
        });

        if (res.data?.success) {
          toast.success(t("reports.dashboard.success_action"));
          setAdminMessage("");
          setBanDuration("");
          fetchDetail();
        } else {
          const errMsg = res.data?.message;
          toast.error(errMsg ? t(errMsg) : t("reports.dashboard.error_action"));
        }
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message;
      const displayMsg = msg ? (Array.isArray(msg) ? msg.map((m: string) => t(m)).join(", ") : t(msg)) : (err.message || t("reports.dashboard.error_action"));
      toast.error(displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const uppercase = status.toUpperCase();
    if (uppercase === "PENDING") {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 font-semibold px-2 py-0.5 rounded-full">
          {t("reports.status.PENDING")}
        </Badge>
      );
    }
    if (uppercase === "RESOLVED") {
      return (
        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 font-semibold px-2 py-0.5 rounded-full">
          {t("reports.status.RESOLVED")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 font-semibold px-2 py-0.5 rounded-full">
        {t("reports.status.REJECTED")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500">{t("reports.dashboard.loading_details") || "Loading report details..."}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold">{t("reports.dashboard.report_not_found") || "Report not found"}</h3>
        <Link href="/dashboard/reports" className="text-violet-500 hover:underline mt-2 inline-block">
          {t("reports.dashboard.back_to_list") || "Back to list"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 p-6 max-w-5xl mx-auto">
      {/* Back to list link */}
      <div>
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-500 transition-colors font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("reports.dashboard.back_to_reports") || "BACK TO REPORTS"}</span>
        </Link>
        <h1 className="text-2xl font-extrabold mt-2 flex items-center gap-2">
          <span>{t("reports.dashboard.report_details") || "Report Details"}</span>
          <span className="text-sm text-slate-400 font-normal">#{detail.id.substring(0, 8)}</span>
        </h1>
      </div>

      {/* Target Content Header Card */}
      {(detail.thread || detail.comment) && (
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f0f1a] shadow-sm space-y-3">
          <div className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-red-500" />
            <span>{t("reports.dashboard.reported_target") || "Reported Target Content"}</span>
          </div>

          {detail.thread && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-100/20 text-violet-500 border border-violet-500/10">
                  {t("reports.targets.thread")}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {detail.thread.title}
                </h3>
              </div>
              <Link href={`/forums/${detail.thread.slug}`} target="_blank">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-750 text-white cursor-pointer text-xs rounded-xl shadow-sm shrink-0">
                  {t("reports.dashboard.view_thread") || "View Thread"}
                </Button>
              </Link>
            </div>
          )}

          {detail.comment && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100/20 text-blue-500 border border-blue-500/10">
                  {t("reports.targets.comment")}
                </span>
                <div
                  className="text-slate-600 dark:text-slate-350 italic pl-3 border-l-2 border-slate-300 dark:border-slate-700 max-h-[100px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: detail.comment.content }}
                />
              </div>
              {detail.comment.threadSlug && (
                <Link href={`/forums/${detail.comment.threadSlug}#comment-${detail.comment.id}`} target="_blank">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-750 text-white cursor-pointer text-xs rounded-xl shadow-sm shrink-0">
                    {t("reports.dashboard.view_comment") || "View Comment"}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Left = details, reason, media. Right = status, action controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reason Section */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f0f1a] shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {t("reports.label_reason")}
            </h2>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: detail.reason }}
            />
          </div>

          {/* Evidence Media Section */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f0f1a] shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {t("reports.dashboard.evidence")}
            </h2>
            {detail.media && detail.media.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {detail.media.map((file) => (
                  <div
                    key={file.id}
                    className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center cursor-pointer group"
                    onClick={() => setZoomMedia(file.mediaUrl)}
                  >
                    {file.mediaType === "VIDEO" ? (
                      <video src={file.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      <img src={file.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs italic">
                {t("reports.dashboard.no_evidence") || "No evidence files uploaded."}
              </p>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f0f1a] shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {t("reports.dashboard.info_general") || "Information"}
            </h2>

            {/* Status */}
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {t("reports.label_status")}
              </span>
              {getStatusBadge(detail.status)}
            </div>

            {/* Type */}
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {t("reports.col_type")}
              </span>
              <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {t(`reports.types.${detail.reportType}`)}
              </Badge>
            </div>

            {/* Reporter */}
            <div className="flex gap-3 items-center pt-1">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-xs shadow-sm overflow-hidden flex-shrink-0">
                {detail.reporter.imgUrl ? (
                  <img src={detail.reporter.imgUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  detail.reporter.displayName.substring(0, 2).toUpperCase()
                )}
              </span>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  {t("reports.label_reporter")}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-xs">
                  {detail.reporter.displayName}
                </span>
              </div>
            </div>

            {/* Reported User */}
            {detail.reportedUser && (
              <div className="flex gap-3 items-center">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-xs shadow-sm overflow-hidden flex-shrink-0">
                  {detail.reportedUser.imgUrl ? (
                    <img src={detail.reportedUser.imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    detail.reportedUser.displayName.substring(0, 2).toUpperCase()
                  )}
                </span>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    {t("reports.label_reported")}
                  </span>
                  <span className="font-semibold text-red-500 text-xs">
                    {detail.reportedUser.displayName}
                  </span>
                </div>
              </div>
            )}

            {/* Date metadata */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{t("reports.label_created")}</span>
                <span className="font-medium text-slate-850 dark:text-slate-200">
                  {new Date(detail.createdAt).toLocaleDateString()}
                </span>
              </div>
              {detail.handledAt && (
                <div className="flex justify-between text-slate-500">
                  <span>{t("reports.label_resolved")}</span>
                  <span className="font-medium text-slate-850 dark:text-slate-200">
                    {new Date(detail.handledAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Admin Action Box */}
          {detail.status === "PENDING" ? (
            <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.01] dark:bg-[#1a0f0f]/40 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5 font-semibold">
                <Shield className="h-4 w-4" />
                <span>{t("reports.dashboard.resolve_title")}</span>
              </h2>

              {/* Action Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t("reports.dashboard.resolution_action") || "Resolution Action"}
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-xs bg-white dark:bg-[#07070f] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                  disabled={submitting}
                >
                  <option value="WARNING">{t("reports.actions.WARNING")}</option>
                  <option value="BAN_PERMANENT">{t("reports.actions.BAN_PERMANENT")}</option>
                  <option value="BAN_CUSTOM">{t("reports.actions.BAN_CUSTOM")}</option>
                  <option value="NO_ACTION">{t("reports.dashboard.no_action_opt") || "No Action"}</option>
                  <option value="REJECT">{t("reports.dashboard.reject_opt") || "Reject Report"}</option>
                </select>
              </div>

              {/* Custom ban duration - conditionally rendered */}
              {actionType === "BAN_CUSTOM" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-red-450" />
                    <span>{t("reports.dashboard.ban_duration")}</span>
                  </label>
                  <input
                    type="date"
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-xs bg-white dark:bg-[#07070f] focus:outline-none focus:border-red-500 transition-colors"
                    min={new Date().toISOString().split("T")[0]}
                    disabled={submitting}
                  />
                </div>
              )}

              {/* Message Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t("reports.label_admin_msg")} *
                </label>
                <textarea
                  ref={textareaRef}
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder={t("reports.dashboard.admin_msg_placeholder") || "Enter admin action explanation/message..."}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs bg-white dark:bg-[#07070f] text-slate-850 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-colors resize-none overflow-y-hidden min-h-[80px]"
                  disabled={submitting}
                />
              </div>

              {/* Visibility Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVisibleToReporter"
                  checked={isVisibleToReporter}
                  onChange={(e) => setIsVisibleToReporter(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 text-violet-600 focus:ring-violet-500 dark:bg-[#07070f] cursor-pointer"
                  disabled={submitting}
                />
                <label htmlFor="isVisibleToReporter" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  {t("reports.label_visibility")}
                </label>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl cursor-pointer shadow-md text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Shield className="h-3.5 w-3.5" />
                      <span>{t("reports.dashboard.submit_resolution") || "Submit Resolution"}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : detail.response ? (
            /* Resolution details box if already processed */
            <div className="p-6 rounded-2xl border border-violet-500/20 bg-violet-500/[0.01] dark:bg-violet-950/10 shadow-sm space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                <span>{t("reports.dashboard.resolution_result") || "Resolution Result"}</span>
              </h2>

              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  {t("reports.label_action")}
                </span>
                <Badge variant="outline" className="text-violet-500 border-violet-500/20 bg-violet-100/10">
                  {t(`reports.actions.${detail.response.actionTaken}`)}
                </Badge>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  {t("reports.label_admin_msg")}
                </span>
                <p className="text-slate-700 dark:text-slate-300 italic text-xs leading-relaxed">
                  &ldquo;{detail.response.message}&rdquo;
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px] text-slate-500 space-y-1">
                <div>{t("reports.dashboard.resolved_by") || "Resolved by"}: {detail.response.admin.displayName}</div>
                <div>{t("reports.dashboard.resolved_date") || "Resolved Date"}: {new Date(detail.response.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Evidence Fullscreen Zoom Modal */}
      {zoomMedia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
          <button
            onClick={() => setZoomMedia(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            {zoomMedia.match(/\.(mp4|webm|ogg|mov)/) || zoomMedia.includes("video") ? (
              <video src={zoomMedia} controls className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" autoPlay />
            ) : (
              <img src={zoomMedia} alt="Zoomed evidence" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
