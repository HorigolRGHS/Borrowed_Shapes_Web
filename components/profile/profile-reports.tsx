"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useI18n } from "@/lib/i18/i18n-context";
import { FileText, Eye, Info, X, Calendar, User, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ReportItem {
  id: string;
  reportType: string;
  reason: string;
  status: string;
  createdAt: string;
  reportedUser: { id: string; displayName: string } | null;
  thread: { id: string; title: string; slug: string } | null;
  comment: { id: string; content: string } | null;
}

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
  comment: { id: string; content: string } | null;
  media: { id: string; mediaUrl: string; mediaType: string; fileSize: number | null }[];
  response: {
    id: string;
    message: string;
    actionTaken: string;
    createdAt: string;
    admin: { id: string; displayName: string };
  } | null;
}

export function ProfileReports() {
  const { t, locale } = useI18n();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [zoomMedia, setZoomMedia] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/api/reports/my-reports");
      if (response.data?.success) {
        setReports(response.data.data || []);
      } else {
        throw new Error(response.data?.message || "Failed to load reports");
      }
    } catch (err: any) {
      console.error("Error fetching my reports:", err);
      setError(err.message || t("reports.failed_submit"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setSelectedReportId(id);
    try {
      const res = await axios.get(`/api/reports/${id}`);
      if (res.data?.success) {
        setDetail(res.data.data);
      } else {
        toast.error("Failed to load details");
      }
    } catch (err: any) {
      console.error("Detail error:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getTargetLabel = (report: ReportItem) => {
    if (report.comment) return `${t("reports.targets.comment")} (#${report.comment.id.substring(0, 8)})`;
    if (report.thread) return `${t("reports.targets.thread")}: ${report.thread.title}`;
    if (report.reportedUser) return `${t("reports.targets.user")}: ${report.reportedUser.displayName}`;
    return "N/A";
  };

  const getStatusBadge = (status: string) => {
    const uppercase = status.toUpperCase();
    if (uppercase === "PENDING") {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">
          {t("reports.status.PENDING")}
        </Badge>
      );
    }
    if (uppercase === "RESOLVED") {
      return (
        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
          {t("reports.status.RESOLVED")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10">
        {t("reports.status.REJECTED")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>{locale === "vi" ? "Đang tải danh sách báo cáo..." : "Loading reports..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={() => fetchReports()}>
          {locale === "vi" ? "Thử lại" : "Retry"}
        </Button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="border-dashed bg-muted/10 border-slate-200 dark:border-slate-800">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t("reports.no_reports")}
          </h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-200">
      {/* Desktop Table Header */}
      <div
        className="hidden md:grid gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl border border-slate-200 dark:border-slate-800/40 text-xs font-semibold text-slate-500 uppercase tracking-wider"
        style={{ gridTemplateColumns: "minmax(0, 2.5fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(140px, 1.2fr) 100px" }}
      >
        <div>{t("reports.col_target")}</div>
        <div>{t("reports.col_type")}</div>
        <div>{t("reports.col_status")}</div>
        <div>{t("reports.col_date")}</div>
        <div className="text-right">{locale === "vi" ? "Hành động" : "Actions"}</div>
      </div>

      {/* List Items */}
      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="group relative bg-card dark:bg-[#0f0f1a] rounded-xl border border-slate-200 dark:border-slate-800/80 p-4 md:px-6 md:py-4 transition-all hover:border-violet-500/30 hover:shadow-md overflow-hidden flex flex-col md:grid md:items-center gap-4"
            style={{ gridTemplateColumns: "minmax(0, 2.5fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(140px, 1.2fr) 100px" }}
          >
            {/* Target Info */}
            <div className="flex items-center gap-4 min-w-0 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-foreground truncate block min-w-0" title={getTargetLabel(report)}>
                  {getTargetLabel(report)}
                </h4>
                <div className="md:hidden flex flex-wrap items-center gap-2 mt-1">
                  {getStatusBadge(report.status)}
                  <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-850">
                    {t(`reports.types.${report.reportType}`)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Type */}
            <div className="hidden md:flex">
              <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-850">
                {t(`reports.types.${report.reportType}`)}
              </Badge>
            </div>

            {/* Status */}
            <div className="hidden md:flex">
              {getStatusBadge(report.status)}
            </div>

            {/* Created Date */}
            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
              <span className="md:hidden font-medium mr-2">{t("reports.col_date")}:</span>
              {new Date(report.createdAt).toLocaleDateString()}
            </div>

            {/* Action button */}
            <div className="flex items-center justify-end gap-2 pt-2 md:pt-0 border-t md:border-0 border-slate-150 dark:border-slate-800/80">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-foreground cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
                onClick={() => fetchDetail(report.id)}
              >
                <Info className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{locale === "vi" ? "Chi tiết" : "Details"}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Detail Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSelectedReportId(null)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-500" />
                <span>{t("reports.details_title")}</span>
              </h2>
              <button
                onClick={() => setSelectedReportId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-muted-foreground">{locale === "vi" ? "Đang tải..." : "Loading..."}</p>
                </div>
              ) : detail ? (
                <>
                  {/* Status & Metadata grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        {t("reports.label_status")}
                      </span>
                      {getStatusBadge(detail.status)}
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        {t("reports.col_type")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {t(`reports.types.${detail.reportType}`)}
                      </Badge>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        {t("reports.label_reporter")}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {detail.reporter.displayName}
                      </span>
                    </div>
                    {detail.reportedUser && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                          {t("reports.label_reported")}
                        </span>
                        <span className="font-semibold text-red-500">
                          {detail.reportedUser.displayName}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        {t("reports.label_created")}
                      </span>
                      <span className="text-slate-600 dark:text-slate-350 font-medium flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(detail.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Reported content reference if applicable */}
                  {(detail.thread || detail.comment) && (
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#07070f] space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        {locale === "vi" ? "Nội dung bị tố cáo" : "Reported Content"}
                      </span>
                      {detail.thread && (
                        <div className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
                          <span className="text-xs text-violet-500 font-bold px-2 py-0.5 rounded bg-violet-100/20 border border-violet-500/10">
                            {t("reports.targets.thread")}
                          </span>
                          <span className="truncate">{detail.thread.title}</span>
                        </div>
                      )}
                      {detail.comment && (
                        <div className="space-y-1">
                          <span className="text-xs text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-100/20 border border-blue-500/10 inline-block mb-1">
                            {t("reports.targets.comment")}
                          </span>
                          <div
                            className="text-slate-600 dark:text-slate-350 italic pl-3 border-l-2 border-slate-300 dark:border-slate-700 max-h-[100px] overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: detail.comment.content }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reason description */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      {t("reports.label_reason")}
                    </span>
                    <div
                      className="p-4 rounded-xl bg-white dark:bg-[#07070f] border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none max-h-[150px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: detail.reason }}
                    />
                  </div>

                  {/* Evidence Media list */}
                  {detail.media && detail.media.length > 0 && (
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        {locale === "vi" ? "Tệp bằng chứng đính kèm" : "Attached Evidence Files"}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {detail.media.map((file) => (
                          <div
                            key={file.id}
                            className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center cursor-pointer group"
                            onClick={() => setZoomMedia(file.mediaUrl)}
                          >
                            {file.mediaType === "VIDEO" ? (
                              <video src={file.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                              <img src={file.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Resolution Response */}
                  {detail.response && (
                    <div className="p-4 rounded-xl bg-violet-50/20 dark:bg-violet-950/10 border border-violet-250/25 dark:border-violet-850/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-violet-500">
                          {t("reports.label_admin_msg")}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-violet-500 border-violet-500/20 bg-violet-100/10 px-1.5 h-4">
                          {t(`reports.actions.${detail.response.actionTaken}`)}
                        </Badge>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        &ldquo;{detail.response.message}&rdquo;
                      </p>
                      <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                        <span>{t("reports.label_resolver")}: {detail.response.admin.displayName}</span>
                        <span>{new Date(detail.response.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#07070f] border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-xl cursor-pointer"
                onClick={() => setSelectedReportId(null)}
              >
                {locale === "vi" ? "Đóng" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
