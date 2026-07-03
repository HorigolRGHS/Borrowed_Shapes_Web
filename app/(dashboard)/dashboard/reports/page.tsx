"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReportItem {
  id: string;
  reportType: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string };
  reportedUser: { id: string; displayName: string } | null;
  thread: { id: string; title: string; slug: string } | null;
  comment: { id: string; content: string } | null;
}

interface Stats {
  total: number;
  pending: number;
  resolved: number;
  rejected: number;
}

export default function AdminReportsPage() {
  const { t, locale } = useI18n();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/reports/admin/stats");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load admin stats", err);
    }
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/reports/admin/list", {
        params: {
          status: statusFilter,
          sort: sortOrder,
          page,
          limit: 20,
        },
      });
      if (res.data?.success) {
        setReports(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalCount(res.data.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortOrder, page]);

  useEffect(() => {
    fetchStats();
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
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

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100 p-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("reports.dashboard.title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-450 text-sm mt-1">
          {t("reports.dashboard.desc") || "Review and handle community violation reports."}
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stats */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f0f1a] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t("reports.dashboard.stat_total")}
            </span>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold mt-2">{stats.total}</div>
        </div>

        {/* Pending Stats */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] dark:bg-[#1a120f] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              {t("reports.dashboard.stat_pending")}
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-amber-500 mt-2">{stats.pending}</div>
        </div>

        {/* Resolved Stats */}
        <div className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-green-500/[0.02] dark:bg-[#0f1a14] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">
              {t("reports.dashboard.stat_resolved")}
            </span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-extrabold text-green-500 mt-2">{stats.resolved}</div>
        </div>

        {/* Rejected Stats */}
        <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.02] dark:bg-[#1a0f0f] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              {t("reports.dashboard.stat_rejected")}
            </span>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-3xl font-extrabold text-red-500 mt-2">{stats.rejected}</div>
        </div>
      </div>

      {/* Control Actions Row (Filter / Sort) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1.5">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "RESOLVED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange(status)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${statusFilter === status
                  ? "border-amber-500 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 bg-white dark:bg-[#07070f]"
                }`}
            >
              {status === "ALL" ? (t("reports.dashboard.all") || "All") : t(`reports.status.${status}`)}
            </button>
          ))}
        </div>

        {/* Sort Trigger */}
        <button
          onClick={toggleSort}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 bg-white dark:bg-[#07070f] transition-all cursor-pointer text-slate-600 dark:text-slate-350"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>{t("reports.dashboard.sort_by")}: {sortOrder === "desc" ? t("reports.dashboard.newest") : t("reports.dashboard.oldest")}</span>
        </button>
      </div>

      {/* Reports Table Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f0f1a] overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500">{t("reports.dashboard.loading") || "Loading reports..."}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold">{t("reports.dashboard.no_reports")}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="px-6 py-4">{t("reports.col_target")}</th>
                  <th className="px-6 py-4">{t("reports.col_type")}</th>
                  <th className="px-6 py-4">{t("reports.col_status")}</th>
                  <th className="px-6 py-4">{t("reports.label_reporter") || "Reporter"}</th>
                  <th className="px-6 py-4">{t("reports.col_date")}</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-[#07070f] transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white max-w-[240px] truncate" title={getTargetLabel(report)}>
                      {getTargetLabel(report)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">
                        {t(`reports.types.${report.reportType}`)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{report.reporter.displayName}</td>
                    <td className="px-6 py-4 text-slate-550 dark:text-slate-400">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/reports/${report.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-violet-500 hover:text-violet-600 hover:bg-violet-55/20 cursor-pointer text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>{t("reports.dashboard.view_btn") || "View"}</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-6">
          <p className="text-xs text-slate-500">
            {t("reports.dashboard.showing_reports")
              ? t("reports.dashboard.showing_reports")
                  .replace("{range}", `${(page - 1) * 20 + 1}–${Math.min(page * 20, totalCount)}`)
                  .replace("{total}", String(totalCount))
              : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, totalCount)} of ${totalCount} reports`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>{t("reports.dashboard.prev_btn") || "Previous"}</span>
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 p-0 cursor-pointer"
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="cursor-pointer"
            >
              <span>{t("reports.dashboard.next_btn") || "Next"}</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
