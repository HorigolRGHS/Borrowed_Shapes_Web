"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Activity, Users, Download, RefreshCw, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api } from "@/lib/api/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/account/admin/dashboard/statistics?range=${range}`);
      setData(res.data || res);
    } catch (err: any) {
      setError(t("admin.dashboard.statistics.loadFailed") || "Failed to load statistics.");
    } finally {
      setLoading(false);
    }
  }, [range, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const C = {
    forum: "#fbbf24",
    sessions: "#22d3ee",
    users: "#818cf8",
    downloads: "#34d399",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border rounded-md shadow-md p-3 text-sm">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="capitalize">{p.name}:</span>
              <span className="font-mono font-medium">{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("admin.dashboard.statistics.title") || "Statistics Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("admin.dashboard.statistics.description") || "Overview of forum, gameplay, players, and downloads."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("admin.dashboard.statistics.range") || "Range"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("admin.dashboard.statistics.range7d") || "7 days"}</SelectItem>
              <SelectItem value="30d">{t("admin.dashboard.statistics.range30d") || "30 days"}</SelectItem>
              <SelectItem value="90d">{t("admin.dashboard.statistics.range90d") || "90 days"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} title={t("admin.dashboard.statistics.refresh") || "Refresh"}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.dashboard.statistics.totalForumThreads") || "Total Forum Threads"}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-amber-500">
                {fmt(data?.summary?.forum?.totalThreads || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.dashboard.statistics.totalGameSessions") || "Total Game Sessions"}
            </CardTitle>
            <Activity className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-cyan-500">
                {fmt(data?.summary?.gameplay?.totalGameSessions || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.dashboard.statistics.totalUsers") || "Total Users"}
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-indigo-500">
                {fmt(data?.summary?.players?.totalUsers || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("admin.dashboard.statistics.totalDownloads") || "Total Downloads"}
            </CardTitle>
            <Download className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-emerald-500">
                {fmt(data?.summary?.downloads?.totalDownloads || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forum Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("admin.dashboard.statistics.forumActivity") || "Forum Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading && !data ? (
              <Skeleton className="h-full w-full" />
            ) : data?.series?.forumActivity?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series.forumActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="value" name="Threads" fill={C.forum} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.dashboard.statistics.noData") || "No data available."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gameplay Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("admin.dashboard.statistics.gameplayActivity") || "Gameplay Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading && !data ? (
              <Skeleton className="h-full w-full" />
            ) : data?.series?.gameplayActivity?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series.gameplayActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGameplay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.sessions} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.sessions} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Runs" stroke={C.sessions} strokeWidth={2} fillOpacity={1} fill="url(#colorGameplay)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.dashboard.statistics.noData") || "No data available."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("admin.dashboard.statistics.userGrowth") || "User Growth"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading && !data ? (
              <Skeleton className="h-full w-full" />
            ) : data?.series?.userGrowth?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series.userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.users} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.users} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="New Users" stroke={C.users} strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.dashboard.statistics.noData") || "No data available."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("admin.dashboard.statistics.downloadTrend") || "Download Trend"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading && !data ? (
              <Skeleton className="h-full w-full" />
            ) : data?.series?.downloadTrend?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series.downloadTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.downloads} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.downloads} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Downloads" stroke={C.downloads} strokeWidth={2} fillOpacity={1} fill="url(#colorDownloads)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("admin.dashboard.statistics.noData") || "No data available."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
