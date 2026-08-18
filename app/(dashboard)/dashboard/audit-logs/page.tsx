"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18/i18n-context";
import { api, getUserProfile } from "@/lib/api/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, FileText, ArrowLeft, ArrowRight } from "lucide-react";

interface AuditLogActor {
  id: string;
  email: string;
  displayName: string;
  imgUrl: string | null;
}

interface AuditLog {
  id: string;
  actor: AuditLogActor | null;
  actionType: string;
  entityName: string;
  entityId: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  ipAddress: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SystemAuditLogsPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionType, setActionType] = useState<string>("");
  const [entityName, setEntityName] = useState<string>("");
  const [entityId, setEntityId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async (pageToFetch: number = 1, silent: boolean = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      
      const query = new URLSearchParams();
      query.append("page", pageToFetch.toString());
      query.append("limit", limit.toString());
      
      if (actionType && actionType !== "ALL") query.append("actionType", actionType);
      if (entityName) query.append("entityName", entityName);
      if (entityId) query.append("entityId", entityId);
      if (search) query.append("search", search);
      
      if (from) {
        const fromDate = new Date(from);
        query.append("from", fromDate.toISOString());
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.append("to", toDate.toISOString());
      }

      const res = await api.get(`/account/admin/audit-logs?${query.toString()}`);
      setLogs(res.data.items);
      setPagination(res.data.pagination);
    } catch (err: any) {
      if (!silent) {
        setError(err?.response?.data?.message || t("admin.auditLogs.loadFailed") || "Failed to load audit logs.");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [actionType, entityName, entityId, search, from, to, limit, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const STATISTICS_REFRESH_INTERVAL_MS = 30_000;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLogs(pagination.page, true);
      }
    }, STATISTICS_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      fetchLogs(pagination.page, true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLogs(pagination.page, true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchLogs, pagination.page]);

  const handleResetFilters = () => {
    setActionType("");
    setEntityName("");
    setEntityId("");
    setSearch("");
    setFrom("");
    setTo("");
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "UPDATE": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "DELETE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "PROCESS_REPORT": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "BAN_USER": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "UNBAN_USER": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "REVOKE_SESSION": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "LOGIN": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300";
      case "LOGOUT": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const actionTypes = [
    "ALL", "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", 
    "REVOKE_SESSION", "BAN_USER", "UNBAN_USER", "PROCESS_REPORT"
  ];

  const renderPagination = () => {
    if (pagination.total === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t("admin.auditLogs.rowsPerPage") || "Rows per page"}:</span>
            <Select 
              value={limit.toString()} 
              onValueChange={(val) => { 
                setLimit(Number(val)); 
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            {t("admin.auditLogs.pageOf")
              ?.replace("{page}", pagination.page.toString())
              .replace("{totalPages}", pagination.totalPages.toString())
              || `Page ${pagination.page} of ${pagination.totalPages}`}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("admin.auditLogs.previous") || "Previous"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
          >
            {t("admin.auditLogs.next") || "Next"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("admin.auditLogs.title") || "System Audit Log"}</h2>
          <p className="text-muted-foreground mt-1">
            {t("admin.auditLogs.description") || "View system-wide activity and administrative actions."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("admin.auditLogs.filters") || "Filters"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="col-span-1 md:col-span-2">
              <Label className="text-xs mb-1 block">&nbsp;</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("admin.auditLogs.searchPlaceholder") || "Search actor, entity, or ID..."}
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">{t("admin.auditLogs.actionType") || "Action type"}</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.auditLogs.allActions") || "All actions"} />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === "ALL" 
                        ? (t("admin.auditLogs.allActions") || "All actions") 
                        : (t(`admin.auditLogs.actions.${type}`) || type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">{t("admin.auditLogs.entityName") || "Entity"}</Label>
              <Input
                placeholder="User, FileAsset..."
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">{t("admin.auditLogs.from") || "From"}</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">{t("admin.auditLogs.to") || "To"}</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleResetFilters} title={t("admin.auditLogs.reset") || "Reset"}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.auditLogs.timestamp") || "Time"}</TableHead>
                <TableHead>{t("admin.auditLogs.actor") || "Actor"}</TableHead>
                <TableHead>{t("admin.auditLogs.actionType") || "Action"}</TableHead>
                <TableHead>{t("admin.auditLogs.entityName") || "Entity"}</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {error || t("admin.auditLogs.noData") || "No audit logs found."}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{log.actor.displayName}</span>
                          <span className="text-xs text-muted-foreground">{log.actor.email}</span>
                        </div>
                      ) : (
                        <span className="font-medium text-sm text-muted-foreground italic">
                          {t("admin.auditLogs.systemActor") || "System"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        let displayType = log.actionType;
                        let color = getActionColor(log.actionType);
                        if (log.actionType === "PROCESS_REPORT" && log.newValue?.operation) {
                          const op = log.newValue.operation;
                          if (op === "CREATE") {
                            displayType = "CREATE_REPORT";
                            color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
                          } else if (op === "RESOLVE") {
                            displayType = "RESOLVE_REPORT";
                            color = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
                          } else if (op === "REJECT") {
                            displayType = "REJECT_REPORT";
                            color = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
                          }
                        }
                        return (
                          <Badge variant="secondary" className={color}>
                            {t(`admin.auditLogs.actions.${displayType}`) || displayType}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{log.entityName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{log.entityId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.ipAddress || "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {renderPagination()}

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("admin.auditLogs.details") || "Details"}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.auditLogs.actionType") || "Action"}</div>
                  <div className="font-semibold">
                    {(() => {
                      let displayType = selectedLog.actionType;
                      if (selectedLog.actionType === "PROCESS_REPORT" && selectedLog.newValue?.operation) {
                        const op = selectedLog.newValue.operation;
                        if (op === "CREATE") displayType = "CREATE_REPORT";
                        else if (op === "RESOLVE") displayType = "RESOLVE_REPORT";
                        else if (op === "REJECT") displayType = "REJECT_REPORT";
                      }
                      return t(`admin.auditLogs.actions.${displayType}`) || displayType;
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("admin.auditLogs.timestamp") || "Time"}</div>
                  <div className="font-semibold">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("admin.auditLogs.actor") || "Actor"}</div>
                  <div className="font-semibold">{selectedLog.actor ? selectedLog.actor.displayName : (t("admin.auditLogs.systemActor") || "System")}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("admin.auditLogs.entityName") || "Entity"}</div>
                  <div className="font-semibold">{selectedLog.entityName}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("admin.auditLogs.entityId") || "Entity ID"}</div>
                  <div className="font-mono text-sm break-all">{selectedLog.entityId}</div>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <div className="text-xs text-muted-foreground">IP</div>
                  <div className="font-semibold break-all">{selectedLog.ipAddress || "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedLog.oldValue && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t("admin.auditLogs.oldValue") || "Old value"}</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-red-200 dark:border-red-900/30">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newValue && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t("admin.auditLogs.newValue") || "New value"}</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap max-h-[400px] overflow-y-auto border border-green-200 dark:border-green-900/30">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}
                {!selectedLog.oldValue && !selectedLog.newValue && (
                  <div className="col-span-2 text-center text-muted-foreground py-8">
                    No data changes recorded.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
