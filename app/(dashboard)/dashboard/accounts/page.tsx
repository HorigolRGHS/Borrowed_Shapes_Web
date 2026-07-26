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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, ShieldAlert, ShieldCheck, Trash2, Edit, FileText, ArrowLeft, RefreshCw, AlertCircle, Eye, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "react-toastify";

// CKEditor imports
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  BlockQuote,
  List,
  Indent,
  RemoveFormat,
  Undo,
  type EditorConfig,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const CKEDITOR_CONFIG: EditorConfig = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Link,
    BlockQuote,
    List,
    Indent,
    RemoveFormat,
    Undo,
  ],
  toolbar: [
    "heading",
    "|",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "link",
    "blockQuote",
    "bulletedList",
    "numberedList",
    "|",
    "outdent",
    "indent",
    "|",
    "undo",
    "redo",
    "removeFormat",
  ],
};

// Interfaces
interface GameProfile {
  id: string;
  totalPlayTime: number;
  totalSessions: number;
  totalWins: number;
  totalLosses: number;
  totalAbandoned: number;
  equippedAchievementId?: string | null;
  equippedAchievement?: {
    id: string;
    name: string;
    badgeImageUrl: string | null;
    type: string;
  } | null;
}

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  imgUrl: string | null;
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  banExpiresAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  gameProfile?: GameProfile | null;
  onlineStatus?: {
    isOnline: boolean;
    lastOnline: string | null;
    onlinePlatforms: string[];
    isWebOnline: boolean;
    isGameOnline: boolean;
  };
}

interface UserSessionItem {
  id: string;
  userId: string;
  sessionId: string;
  platform: string;
  loginTime: string | Date;
  logoutTime: string | Date | null;
  deviceInfo: string | null;
  ipAddress: string | null;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'LOGGED_OUT' | string;
  isActive: boolean;
  isCurrent?: boolean;
  lastActive?: string | null;
}

interface AuditLogItem {
  id: string;
  userId: string | null;
  actionType: string;
  entityName: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  ipAddress: string | null;
}

// Helpers
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function AccountManagementPage() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sort, setSort] = useState("desc");

  // Details View
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [viewingDetail, setViewingDetail] = useState(false);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [unbanModalOpen, setUnbanModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({ displayName: "", imgUrl: "" });
  const [roleForm, setRoleForm] = useState({ role: "" });
  const [banForm, setBanForm] = useState({ reason: "", banExpiresAt: "" });
  const [banReasonError, setBanReasonError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<UserSessionItem | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [sessionsChecked, setSessionsChecked] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Map<string, any>>(new Map());
  const [presenceLoading, setPresenceLoading] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    setCurrentUser(profile);
  }, []);

  // API Call: Fetch list
  const fetchUsers = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    if (!isBackground) setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sort,
      });
      if (search) params.append("search", search);

      const res = await api.get(`/account/admin/users?${params.toString()}`);
      const data = res.data || res;
      setUsers(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || data.items?.length || 0);
    } catch (err: any) {
      if (!isBackground) setError(err.message || t("admin.account.messages.generic_error"));
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [page, searchTrigger, roleFilter, statusFilter, sortBy, sort]);

  const fetchPresenceData = useCallback(async () => {
    setPresenceLoading(true);
    try {
      const res = await api.get('/presence');
      const data = res.data || res || [];
      const map = new Map();
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          map.set(p.userId, p);
        });
      }
      setPresenceMap(map);
    } catch (err) {
      console.error("Failed to fetch presence data", err);
    } finally {
      setPresenceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers().then(() => fetchPresenceData());
  }, [fetchUsers, fetchPresenceData]);



  // API Call: Fetch details
  const fetchUserSessions = useCallback(async (id: string, isBackground = false) => {
    if (!isBackground) {
      setSessionsLoading(true);
      setSessionsChecked(false);
    }
    console.log("[RevokeSession] fetching sessions", id);
    try {
      const res = await api.get(`/sessions/admin/users/${id}`);
      const data = res.data || res || [];
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("[RevokeSession] failed to fetch sessions", err);
      if (!isBackground) setSessions([]);
    } finally {
      if (!isBackground) {
        setSessionsLoading(false);
        setSessionsChecked(true);
      }
    }
  }, []);

  const fetchUserDetails = useCallback(async (id: string, isBackground = false) => {
    try {
      const res = await api.get(`/account/admin/users/${id}`);
      setSelectedUser(res.data || res);
      fetchUserSessions(id, isBackground);
    } catch (err: any) {
      console.error(err);
    }
  }, [fetchUserSessions]);

  useEffect(() => {
    if (viewingDetail && selectedUser?.id) {
      console.log("[RevokeSession] mounted/render", { userId: selectedUser.id, user: selectedUser });
      fetchUserSessions(selectedUser.id);
    } else {
      setSessions([]);
      setSessionsChecked(false);
    }
  }, [viewingDetail, selectedUser?.id, fetchUserSessions]);

  // Polling presence and lists
  useEffect(() => {
    const handleFocus = () => {
      fetchPresenceData();
      fetchUsers(true);
      if (viewingDetail && selectedUser?.id) {
        fetchUserDetails(selectedUser.id, true);
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchPresenceData();
        fetchUsers(true);
        if (viewingDetail && selectedUser?.id) {
          fetchUserDetails(selectedUser.id, true);
        }
      }
    }, 15000); // 15s heartbeat check

    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPresenceData, fetchUsers, fetchUserDetails, viewingDetail, selectedUser?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTrigger(prev => prev + 1);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("createdAt");
    setSort("desc");
    setPage(1);
    setSearchTrigger(prev => prev + 1);
  };

  const toggleSort = (field: string) => {
    setPage(1);
    if (sortBy === field) {
      setSort(sort === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSort(field === "createdAt" ? "desc" : "asc");
    }
  };

  const openEditModal = () => {
    if (selectedUser) {
      setEditForm({
        displayName: selectedUser.displayName,
        imgUrl: selectedUser.imgUrl || "",
      });
      setEditModalOpen(true);
    }
  };

  const submitEdit = async () => {
    try {
      const payload: any = {
        displayName: editForm.displayName,
      };
      
      if (editForm.imgUrl !== (selectedUser?.imgUrl || "")) {
        payload.imgUrl = editForm.imgUrl || null;
      }

      await api.patch(`/account/admin/users/${selectedUser?.id}/profile`, payload);
      setEditModalOpen(false);
      fetchUserDetails(selectedUser!.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || t("admin.account.messages.generic_error"));
    }
  };

  const openRoleModal = () => {
    if (selectedUser) {
      setRoleForm({ role: selectedUser.role });
      setRoleModalOpen(true);
    }
  };

  const submitRole = async () => {
    try {
      if (roleForm.role === selectedUser?.role) {
        setRoleModalOpen(false);
        return;
      }
      await api.patch(`/account/admin/users/${selectedUser?.id}/role`, { role: roleForm.role });
      setRoleModalOpen(false);
      fetchUserDetails(selectedUser!.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || t("admin.account.messages.generic_error"));
    }
  };

  const submitBan = async () => {
    setBanReasonError("");
    const plainReason = stripHtml(banForm.reason);
    if (plainReason.length === 0) {
      setBanReasonError(t("admin.account.modal.ban_reason_plain_required") || "Ban reason is required.");
      return;
    }
    if (plainReason.length > 500) {
      setBanReasonError(t("admin.account.modal.ban_reason_plain_too_long") || "Ban reason must be at most 500 characters.");
      return;
    }

    try {
      let expires = null;
      if (banForm.banExpiresAt) {
        expires = new Date(banForm.banExpiresAt).toISOString();
      }
      await api.patch(`/account/admin/users/${selectedUser?.id}/ban`, {
        reason: stripHtml(banForm.reason), // Ensure we only store plain text to prevent XSS
        banExpiresAt: expires,
      });
      setBanModalOpen(false);
      fetchUserDetails(selectedUser!.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || t("admin.account.messages.generic_error"));
    }
  };

  const submitUnban = async () => {
    try {
      await api.patch(`/account/admin/users/${selectedUser?.id}/unban`);
      setUnbanModalOpen(false);
      fetchUserDetails(selectedUser!.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || t("admin.account.messages.generic_error"));
    }
  };

  const submitDelete = async () => {
    try {
      await api.delete(`/account/admin/users/${selectedUser?.id}`);
      setDeleteModalOpen(false);
      setViewingDetail(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || t("admin.account.messages.generic_error"));
    }
  };

  const submitRestore = async () => {
    try {
      await api.patch(`/account/admin/users/${selectedUser?.id}/restore`);
      setRestoreModalOpen(false);
      fetchUserDetails(selectedUser!.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || t("admin.account.messages.generic_error"));
    }
  };

  const submitRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setRevokeLoading(true);
    try {
      await api.delete(`/sessions/${sessionToRevoke.id}`);
      toast.success(t("admin.accounts.detail.sessions.revokeSuccess") || "Session revoked successfully.");
      setRevokeModalOpen(false);
      if (selectedUser) fetchUserSessions(selectedUser.id);
    } catch (err: any) {
      toast.error(t("admin.accounts.detail.sessions.revokeFailed") || "Failed to revoke session.");
    } finally {
      setRevokeLoading(false);
    }
  };

  const openAuditLogs = async () => {
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const res = await api.get(`/account/admin/users/${selectedUser?.id}/audit-logs?limit=50`);
      const data = res.data || res;
      setAuditLogs(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const renderStatus = (u: UserItem) => {
    if (u.deletedAt) return <Badge variant="secondary" className="bg-slate-500 hover:bg-slate-600 text-white">{t("admin.account.filters.deleted") || "Deleted"}</Badge>;
    if (u.isBanned) return <Badge variant="destructive" className="bg-red-500">{t("admin.account.filters.banned") || "Banned"}</Badge>;
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">{t("admin.account.filters.active") || "Active"}</Badge>;
  };

  const getPresencePlatformLabel = (status: any) => {
    const hasWeb = status.onlinePlatforms?.includes('web');
    const hasGame = status.onlinePlatforms?.includes('game');
    if (hasWeb && hasGame) return t("admin.accounts.onlineStatus.webAndGame") || "Web + Game";
    if (hasWeb) return t("admin.accounts.onlineStatus.web") || "Web";
    if (hasGame) return t("admin.accounts.onlineStatus.game") || "Game";
    return "";
  };

  const renderOnlineStatus = (u: UserItem) => {
    if (presenceLoading && presenceMap.size === 0) {
      return (
        <Badge variant="outline" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-muted-foreground bg-transparent border-muted-foreground/30">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          <span>{t("admin.accounts.onlineStatus.checking") || "Checking..."}</span>
        </Badge>
      );
    }
    const status = presenceMap.get(u.id);
    const isOnline = status?.isOnline === true || (Array.isArray(status?.onlinePlatforms) && status.onlinePlatforms.length > 0);

    if (!isOnline) {
      return (
        <Badge variant="outline" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-muted-foreground bg-transparent border-muted-foreground/30">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          <span>{t("admin.accounts.onlineStatus.offline") || "Offline"}</span>
        </Badge>
      );
    }
    
    const platformLabel = getPresencePlatformLabel(status);
    const label = t("admin.accounts.onlineStatus.online") || "Online";
    const fullLabel = platformLabel ? `${label} · ${platformLabel}` : label;

    return (
      <Badge variant="outline" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span>{fullLabel}</span>
      </Badge>
    );
  };

  const renderRoleBadge = (role: string) => {
    if (role === 'ADMIN') return <Badge variant="outline" className="text-amber-500 border-amber-500">{role}</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">{role}</Badge>;
  };

  if (viewingDetail && selectedUser) {
    const isSelf = currentUser?.userId === selectedUser.id;
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE' || s.isActive);
    const hasActiveSession = activeSessions.length > 0;
    const mostRecentSession = hasActiveSession ? [...activeSessions].sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime())[0] : null;

    return (
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setViewingDetail(false)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("admin.account.actions.back") || "Back"}
          </Button>
          <h1 className="text-3xl font-bold">{t("admin.account.detail.title") || "Account Detail"}</h1>
          <p className="text-muted-foreground mt-1">{(t("admin.account.detail.subtitle") || "Managing user: {name}").replace("{name}", selectedUser.displayName)}</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column (Information) */}
          <div className="xl:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.account.detail.account_information") || "Account Information"}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2 text-sm pt-0">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.user_id") || "User ID"}:</span>
                  <span className="font-mono text-foreground break-all text-right max-w-[60%]">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.email") || "Email"}:</span>
                  <span className="text-foreground break-all text-right">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.display_name") || "Display Name"}:</span>
                  <span className="text-foreground font-medium break-all text-right">{selectedUser.displayName}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.role") || "Role"}:</span>
                  <span>{renderRoleBadge(selectedUser.role)}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.status") || "Status"}:</span>
                  <span>{renderStatus(selectedUser)}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2 items-center">
                  <span className="text-muted-foreground">{t("admin.accounts.online.title") || "Online Status"}:</span>
                  <div className="flex flex-col items-end gap-1">
                    {renderOnlineStatus(selectedUser)}
                    {(!presenceMap.has(selectedUser.id)) && selectedUser.onlineStatus?.lastOnline && (
                      <span className="text-xs text-muted-foreground">
                        {(t("admin.accounts.onlineStatus.lastOnline") || "Last: {time}").replace("{time}", new Date(selectedUser.onlineStatus.lastOnline).toLocaleString())}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.created_at") || "Created At"}:</span>
                  <span className="text-foreground">{new Date(selectedUser.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{t("admin.account.detail.updated_at") || "Updated At"}:</span>
                  <span className="text-foreground">{new Date(selectedUser.updatedAt).toLocaleString()}</span>
                </div>
                {selectedUser.deletedAt && (
                  <div className="flex justify-between pb-2">
                    <span className="text-muted-foreground">{t("admin.account.detail.deleted_at") || "Deleted At"}:</span>
                    <span className="text-red-500">{new Date(selectedUser.deletedAt).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedUser.isBanned && (
              <Card className="border-red-500/50 bg-red-500/5">
                <CardHeader>
                  <CardTitle className="text-red-500 flex items-center">
                    <ShieldAlert className="mr-2 h-5 w-5"/> 
                    {t("admin.account.detail.ban_details") || "Ban Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-2 text-sm pt-0">
                  <div className="flex justify-between border-b border-red-500/20 pb-2">
                    <span className="text-muted-foreground">{t("admin.account.detail.banned_at") || "Banned At"}:</span>
                    <span className="text-foreground">{selectedUser.bannedAt ? new Date(selectedUser.bannedAt).toLocaleString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-red-500/20 pb-2">
                    <span className="text-muted-foreground">{t("admin.account.detail.expiration_date") || "Expiration Date"}:</span>
                    <span className="text-foreground">{selectedUser.banExpiresAt ? new Date(selectedUser.banExpiresAt).toLocaleString() : t("admin.account.detail.permanent") || "Permanent"}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-1">{t("admin.account.detail.ban_reason") || "Ban Reason"}:</span>
                    <p className="bg-background/50 border border-red-500/20 p-3 rounded-md italic text-foreground break-words">{selectedUser.banReason || t("admin.account.detail.no_reason") || "No reason provided"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            
          </div>

          {/* Right Column (Actions) */}
          <aside className="xl:col-span-4 space-y-6">
            <div className="xl:sticky xl:top-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("admin.account.detail.profile_summary") || "Profile Summary"}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-4 border-background shadow-md">
                    {selectedUser.imgUrl ? (
                      <img src={selectedUser.imgUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold">{selectedUser.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <h3 className="font-bold text-xl truncate px-2">{selectedUser.displayName}</h3>
                    <p className="text-muted-foreground text-sm truncate px-2">{selectedUser.email}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex space-x-2">
                      {renderStatus(selectedUser)}
                      {renderRoleBadge(selectedUser.role)}
                    </div>
                    {renderOnlineStatus(selectedUser)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("admin.account.detail.action_panel") || "Actions"}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={openEditModal}
                    disabled={!!selectedUser.deletedAt}
                  >
                    <Edit className="mr-2 h-4 w-4"/> {t("admin.account.actions.edit_account")}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={openRoleModal}
                    disabled={!!selectedUser.deletedAt || isSelf}
                    title={isSelf ? t("admin.account.role.selfDemoteBlocked") || "Cannot change your own role" : undefined}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4"/> {t("admin.account.role.changeRole") || "Change Role"}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={openAuditLogs}
                  >
                    <FileText className="mr-2 h-4 w-4"/> {t("admin.account.actions.view_audit_log")}
                  </Button>

                  {selectedUser.isBanned && !selectedUser.deletedAt ? (
                    <Button 
                      variant="secondary" 
                      className="w-full justify-start" 
                      onClick={() => setUnbanModalOpen(true)}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4"/> {t("admin.account.actions.unban_account")}
                    </Button>
                  ) : !selectedUser.deletedAt ? (
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start" 
                      onClick={() => setBanModalOpen(true)}
                      disabled={isSelf || selectedUser.role === 'ADMIN'}
                      title={isSelf ? "Cannot ban yourself" : selectedUser.role === 'ADMIN' ? "Cannot ban an ADMIN" : undefined}
                    >
                      <ShieldAlert className="mr-2 h-4 w-4"/> {t("admin.account.actions.ban_account")}
                    </Button>
                  ) : null}

                  {!selectedUser.deletedAt && (
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start" 
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={isSelf || selectedUser.role === 'ADMIN'}
                      title={isSelf ? "Cannot delete yourself" : selectedUser.role === 'ADMIN' ? "Cannot delete an ADMIN" : undefined}
                    >
                      <Trash2 className="mr-2 h-4 w-4"/> {t("admin.account.actions.delete_account")}
                    </Button>
                  )}


                  {selectedUser.deletedAt && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-600" 
                      onClick={() => setRestoreModalOpen(true)}
                      disabled={isSelf || selectedUser.role === 'ADMIN'}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4"/> {t("admin.account.actions.restore_account") || "Restore Account"}
                    </Button>
                  )}

                  {!selectedUser.deletedAt && (
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start relative pr-32" 
                      onClick={() => {
                        setSessionToRevoke(mostRecentSession);
                        setRevokeModalOpen(true);
                      }}
                      disabled={!hasActiveSession || !sessionsChecked || sessionsLoading}
                    >
                      <ShieldAlert className="mr-2 h-4 w-4"/> 
                      {!sessionsChecked || sessionsLoading ? (
                        t("admin.accounts.detail.sessions.checking") || "Checking session..."
                      ) : !hasActiveSession ? (
                        t("admin.accounts.detail.sessions.noActiveSession") || "No active session"
                      ) : (
                        <>
                          <span className="truncate">{t("admin.accounts.detail.sessions.revoke") || "Revoke Session"}</span>
                          <Badge variant="outline" className="absolute right-2 border-white/30 text-white bg-white/10 font-normal">
                            {activeSessions.length === 1 
                              ? (t("admin.accounts.detail.sessions.activeSession")?.replace("{count}", "1") || "1 active session") 
                              : (t("admin.accounts.detail.sessions.activeSessions")?.replace("{count}", activeSessions.length.toString()) || `${activeSessions.length} active sessions`)
                            }
                          </Badge>
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>

        {/* Revoke Session Modal */}
        <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-500">{t("admin.accounts.detail.sessions.revokeDialogTitle") || "Revoke session?"}</DialogTitle>
              <DialogDescription>
                {activeSessions.length > 1
                  ? (t("admin.accounts.detail.sessions.revokeMultipleDialogDescription") || "This user has {count} active sessions. This action will revoke the most recent active session.").replace("{count}", activeSessions.length.toString())
                  : (t("admin.accounts.detail.sessions.revokeDialogDescription") || "This will log this user out of the selected active session.")
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setRevokeModalOpen(false)} disabled={revokeLoading}>
                {t("admin.account.actions.cancel") || "Cancel"}
              </Button>
              <Button variant="destructive" onClick={submitRevokeSession} disabled={revokeLoading}>
                {revokeLoading ? "..." : (t("admin.accounts.detail.sessions.revokeConfirm") || "Revoke session")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.account.modal.edit_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("admin.account.modal.display_name")}</Label>
                <Input value={editForm.displayName} onChange={e => setEditForm({...editForm, displayName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.account.modal.avatar_url")}</Label>
                <Input value={editForm.imgUrl} onChange={e => setEditForm({...editForm, imgUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>{t("admin.account.actions.cancel")}</Button>
              <Button onClick={submitEdit}>{t("admin.account.actions.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Modal */}
        <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.account.role.changeRole") || "Change Role"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("admin.account.role.currentRole") || "Current Role"}</Label>
                <Input value={selectedUser?.role || ""} disabled className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.account.role.newRole") || "New Role"}</Label>
                <Select value={roleForm.role} onValueChange={(val) => setRoleForm({ role: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">{t("admin.account.role.user") || "User"}</SelectItem>
                    <SelectItem value="ADMIN">{t("admin.account.role.admin") || "Admin"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {roleForm.role !== selectedUser?.role && roleForm.role === 'ADMIN' && (
                <Alert className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">
                  <AlertCircle className="h-4 w-4 !text-yellow-500" />
                  <AlertDescription>
                    {t("admin.account.role.promoteConfirmDescription") || "This account will gain access to all administrative functions. Are you sure you want to proceed?"}
                  </AlertDescription>
                </Alert>
              )}
              {roleForm.role !== selectedUser?.role && roleForm.role === 'USER' && (
                <Alert className="bg-destructive/10 text-destructive border-destructive/50">
                  <AlertCircle className="h-4 w-4 !text-destructive" />
                  <AlertDescription>
                    {t("admin.account.role.demoteConfirmDescription") || "This account will lose access to all administrative functions. Are you sure you want to proceed?"}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleModalOpen(false)}>{t("admin.account.role.cancel") || "Cancel"}</Button>
              <Button onClick={submitRole} disabled={roleForm.role === selectedUser?.role}>
                {t("admin.account.role.save") || "Save Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ban Modal with CKEditor */}
        <Dialog open={banModalOpen} onOpenChange={(open) => {
          if (!open) setBanModalOpen(false);
          else {
            setBanForm({ reason: "", banExpiresAt: "" });
            setBanReasonError("");
            setBanModalOpen(true);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-red-500">{t("admin.account.modal.ban_title")}</DialogTitle>
              <DialogDescription>
                {(t("admin.account.modal.ban_description") || "Are you sure you want to ban {name}?").replace("{name}", selectedUser.displayName)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("admin.account.modal.ban_reason")} <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("admin.account.modal.ban_reason_editor_hint") || "Describe why this account is being banned."}
                </p>
                
                  <CKEditor
                    editor={ClassicEditor}
                    data={banForm.reason}
                    config={CKEDITOR_CONFIG}
                    onChange={(_evt, editor) => {
                      setBanForm({...banForm, reason: editor.getData()});
                      setBanReasonError("");
                    }}
                  />
                
                {banReasonError && (
                  <p className="text-xs text-red-500 mt-1">{banReasonError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("admin.account.modal.ban_expiration")}</Label>
                <Input type="datetime-local" value={banForm.banExpiresAt} onChange={e => setBanForm({...banForm, banExpiresAt: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanModalOpen(false)}>{t("admin.account.actions.cancel")}</Button>
              <Button variant="destructive" onClick={submitBan}>{t("admin.account.actions.confirm_ban")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unban Modal */}
        <Dialog open={unbanModalOpen} onOpenChange={setUnbanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.account.modal.unban_title")}</DialogTitle>
              <DialogDescription>
                {t("admin.account.modal.unban_description")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setUnbanModalOpen(false)}>{t("admin.account.actions.cancel")}</Button>
              <Button onClick={submitUnban}>{t("admin.account.actions.confirm_unban")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-500">{t("admin.account.modal.delete_title")}</DialogTitle>
              <DialogDescription>
                {t("admin.account.modal.delete_warning")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>{t("admin.account.actions.cancel")}</Button>
              <Button variant="destructive" onClick={submitDelete}>{t("admin.account.actions.confirm_delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Modal */}
        <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-green-500">{t("admin.account.modal.restore_title") || "Restore Account"}</DialogTitle>
              <DialogDescription>
                {t("admin.account.modal.restore_description") || "This account will be restored and can access the system again unless it is still banned."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>{t("admin.account.actions.cancel") || "Cancel"}</Button>
              <Button onClick={submitRestore}>{t("admin.account.actions.confirm_restore") || "Confirm Restore"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit Log Modal */}
        <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto custom-scroll">
            <DialogHeader>
              <DialogTitle>{(t("admin.account.modal.audit_title") || "Audit logs").replace("{name}", selectedUser.displayName)}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {auditLoading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : auditLogs.length === 0 ? <div className="py-8 text-center text-muted-foreground">{t("admin.account.empty.no_audit_logs")}</div> : (
                <div className="space-y-4">
                  {auditLogs.map(log => (
                    <div key={log.id} className="border border-border p-4 rounded-md text-sm space-y-2 bg-card">
                      <div className="flex justify-between font-semibold">
                        <span className="text-primary">{log.actionType}</span>
                        <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-muted-foreground text-xs font-mono break-all">By User ID: {log.userId || 'System'} | IP: {log.ipAddress || 'Unknown'}</div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded">
                          <div className="font-medium text-red-500 mb-1">Old Value</div>
                          <pre className="text-xs whitespace-pre-wrap break-all text-foreground">{JSON.stringify(log.oldValue, null, 2)}</pre>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 p-2 rounded">
                          <div className="font-medium text-green-500 mb-1">New Value</div>
                          <pre className="text-xs whitespace-pre-wrap break-all text-foreground">{JSON.stringify(log.newValue, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    );
  }

  // List View
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("admin.account.title") || "Account Management"}</h1>
        <p className="text-muted-foreground mt-2">{t("admin.account.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t("admin.account.search_placeholder") || "Search..."} 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.account.filters.all") || "All Roles"}</SelectItem>
                  <SelectItem value="USER">{t("admin.account.filters.user") || "User"}</SelectItem>
                  <SelectItem value="ADMIN">{t("admin.account.filters.admin") || "Admin"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("admin.account.filters.all") || "All Status"}</SelectItem>
                  <SelectItem value="ACTIVE">{t("admin.account.filters.active") || "Active"}</SelectItem>
                  <SelectItem value="BANNED">{t("admin.account.filters.banned") || "Banned"}</SelectItem>
                  <SelectItem value="DELETED">{t("admin.account.filters.deleted") || "Deleted"}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Search</Button>
              <Button type="button" variant="outline" onClick={clearFilters}>{t("admin.account.filters.clear") || "Clear"}</Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("admin.account.columns.user") || "User"}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('role')}>
                    <div className="flex items-center gap-1 hover:text-foreground">
                      {t("admin.account.columns.role") || "Role"}
                      {sortBy === 'role' ? (sort === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <div className="flex items-center gap-1 hover:text-foreground">
                      {t("admin.account.columns.status") || "Status"}
                      {sortBy === 'status' ? (sort === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('onlineStatus')}>
                    <div className="flex items-center gap-1 hover:text-foreground">
                      {t("admin.accounts.onlineStatus.column") || "Online Status"}
                      {sortBy === 'onlineStatus' ? (sort === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                    <div className="flex items-center gap-1 hover:text-foreground">
                      {t("admin.account.columns.created_at") || "Created At"}
                      {sortBy === 'createdAt' ? (sort === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />) : <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">{t("admin.account.columns.actions") || "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t("admin.account.empty.no_users") || "No users found"}</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedUser(u); setViewingDetail(true); }}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                            {u.imgUrl ? <img src={u.imgUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold">{u.displayName.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0 max-w-[200px] sm:max-w-xs md:max-w-sm">
                            <div className="font-medium truncate">{u.displayName}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{renderRoleBadge(u.role)}</TableCell>
                      <TableCell>{renderStatus(u)}</TableCell>
                      <TableCell>{renderOnlineStatus(u)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setViewingDetail(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t mt-4">
              <span className="text-sm text-muted-foreground">
                {t("admin.account.total") || "Total accounts"}: {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  {t("admin.account.pagination.previous") || "Previous"}
                </Button>
                <span className="text-sm font-medium px-2">
                  {t("admin.account.pagination.pageInfo", { page, totalPages }) || `Page ${page} of ${totalPages}`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  {t("admin.account.pagination.next") || "Next"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
