"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  Eye,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BADGE_BASE_CLASS = "rounded-[12px] uppercase tracking-[0.18em] text-[11px] font-semibold";

const TYPE_BADGE_STYLES: Record<string, string> = {
  GENERAL: `${BADGE_BASE_CLASS} border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300`,
  BUG_REPORT: `${BADGE_BASE_CLASS} border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300`,
  GUIDE: `${BADGE_BASE_CLASS} border-green-300 dark:border-green-800/50 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-300`,
  SUGGESTION: `${BADGE_BASE_CLASS} border-purple-300 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-300`,
  FAN_ART: `${BADGE_BASE_CLASS} border-pink-300 dark:border-pink-800/50 bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-300`,
  LOOKING_FOR_PARTY: `${BADGE_BASE_CLASS} border-blue-300 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300`,
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  OPEN: `${BADGE_BASE_CLASS} border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-300`,
  CLOSED: `${BADGE_BASE_CLASS} border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300`,
  ARCHIVED: `${BADGE_BASE_CLASS} border-slate-300 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400`,
};

interface ThreadDetail {
  id: string;
  title: string;
  slug: string;
  content: string;
  imageUrl: string | null;
  score: number;
  viewCount: number;
  commentCount: number;
  isPinned: boolean;
  postType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string; imgUrl: string | null } | null;
  category: { id: string; name: string; nameVi?: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  name_vi?: string;
}

export default function DashboardForumDetailPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams() as { id?: string };
  const threadId = params.id ?? "";

  const [user, setUser] = useState<any>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form inputs (only Category, Post Type, Status, Pinned are editable)
  const [editForm, setEditForm] = useState({
    categoryId: "",
    postType: "GENERAL",
    status: "OPEN",
    isPinned: false,
  });

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
      fetchThreadDetail();
      fetchCategories();
    }
  }, [router, threadId]);

  const fetchThreadDetail = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/forums/id/${threadId}`);
      if (response.data?.success) {
        const data = response.data.data;
        setThread(data);
        setEditForm({
          categoryId: data.category?.id || "",
          postType: data.postType || "GENERAL",
          status: data.status || "OPEN",
          isPinned: data.isPinned || false,
        });
      } else {
        toast.error(t("forums.thread_not_found"));
      }
    } catch (error) {
      console.error("Failed to fetch thread detail:", error);
      toast.error(t("forums.thread_not_found"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/category");
      if (response.data?.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleUpdateMetadata = async () => {
    setSaving(true);
    try {
      const payload = {
        categoryId: editForm.categoryId || undefined,
        postType: editForm.postType,
        status: editForm.status,
        isPinned: editForm.isPinned,
      };

      const response = await axios.patch(`/api/forums/update/${threadId}`, payload);
      if (response.data?.success) {
        toast.success(t("forums.thread_updated"));
        setEditModalOpen(false);
        fetchThreadDetail();
      } else {
        toast.error(t("forums.update_failed"));
      }
    } catch (error) {
      console.error("Failed to update thread metadata:", error);
      toast.error(t("forums.update_failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteThread = async () => {
    setDeleting(true);
    try {
      const response = await axios.delete(`/api/forums/delete/${threadId}`);
      if (response.data?.success) {
        toast.success(t("forums.delete_success"));
        setDeleteConfirmOpen(false);
        router.push("/dashboard/forums");
      } else {
        toast.error(t("forums.delete_failed"));
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error(t("forums.delete_failed"));
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{locale === "vi" ? "Đang tải dữ liệu..." : "Loading..."}</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-sm font-semibold">{t("forums.thread_not_found")}</div>
        <Button variant="outline" className="border-border" onClick={() => router.push("/dashboard/forums")}>
          {t("forums.dashboard.back_to_threads") || "Back to Threads"}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-foreground flex flex-col">
      <main className="flex-1 px-8 py-8">
        {/* Back Navigation */}
        <button
          onClick={() => router.push("/dashboard/forums")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("forums.dashboard.back_to_threads") || "Back to Threads"}
        </button>

        {/* Title Area */}
        <div className="mb-6 max-w-3xl">
          <h2 className="text-3xl font-bold text-foreground leading-tight">
            {t("forums.detail_title") || "Discussion Thread"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("forums.dashboard.subtitle") || "View, pin, edit, and delete forum threads"}
          </p>
          <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
        </div>

        {/* Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Main Content Block */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              {/* Header Title and Badges */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-foreground font-bold text-2xl tracking-wide">
                  {thread.title}
                </h3>
                <div className="flex gap-2 shrink-0">
                  {thread.isPinned && (
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      {t("forums.pinned") || "PINNED"}
                    </Badge>
                  )}
                  <Badge variant="outline" className={STATUS_BADGE_STYLES[thread.status] || BADGE_BASE_CLASS}>
                    {thread.status}
                  </Badge>
                </div>
              </div>

              {/* Info Stats Bar */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6 border-b border-border pb-4">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {thread.viewCount} {t("forums.views") || "views"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  {thread.commentCount} {t("forums.dashboard.comments_count") || "Comments"}
                </span>
                <span className="flex items-center gap-1.5">
                  <ChevronRight className="h-4 w-4" />
                  {t("forums.score") || "Score"}: {thread.score}
                </span>
              </div>

              {/* Banner Image */}
              {thread.imageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-border max-h-96 flex items-center justify-center bg-muted/40">
                  <img
                    src={thread.imageUrl}
                    alt={thread.title}
                    className="max-h-96 object-contain w-full"
                  />
                </div>
              )}

              {/* Content Body */}
              <div
                className="prose dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-inter"
                dangerouslySetInnerHTML={{ __html: thread.content }}
              />
            </div>
          </div>

          {/* Right Sidebar Block */}
          <div className="lg:col-span-1 space-y-6">
            {/* Thread Info Sidebar */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <h3 className="text-foreground font-bold mb-4 border-b border-border pb-2 text-sm tracking-wider font-rajdhani uppercase">
                {t("forums.dashboard.thread_information") || "Thread Information"}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                    {t("forums.dashboard.author") || "Author"}
                  </p>
                  <p className="text-foreground text-sm font-semibold">
                    {thread.author?.displayName || t("forums.unknown_author") || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                    {t("forums.dashboard.category") || "Category"}
                  </p>
                  <p className="text-foreground/90 text-sm font-medium">
                    {thread.category ? (locale === "vi" && thread.category.nameVi ? thread.category.nameVi : thread.category.name) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                    {t("forums.dashboard.post_type") || "Post Type"}
                  </p>
                  <Badge variant="outline" className={TYPE_BADGE_STYLES[thread.postType] || BADGE_BASE_CLASS}>
                    {t(`forums.post_type.${thread.postType.toLowerCase()}`) || thread.postType}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                    {t("forums.dashboard.status") || "Status"}
                  </p>
                  <Badge variant="outline" className={STATUS_BADGE_STYLES[thread.status] || BADGE_BASE_CLASS}>
                    {thread.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                    {t("forums.dashboard.created_at") || "Created At"}
                  </p>
                  <p className="text-foreground/90 text-sm">
                    {new Date(thread.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                    {t("forums.dashboard.updated_at") || "Updated At"}
                  </p>
                  <p className="text-foreground/90 text-sm">
                    {new Date(thread.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={() => setEditModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-all font-bold cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                {t("forums.dashboard.action_edit") || "Edit Thread"}
              </Button>
              <Button
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-all font-bold cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                {t("forums.dashboard.action_delete") || "Delete Thread"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Thread Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border text-foreground">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 to-orange-400" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Edit className="h-5 w-5 text-amber-500" />
              {t("forums.dashboard.edit_forum_thread") || "Edit Forum Thread"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("forums.edit_thread_subtitle") || "Change metadata tags for this forum thread."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.category") || "Category"}
              </Label>
              <Select
                value={editForm.categoryId}
                onValueChange={(val) => setEditForm((prev) => ({ ...prev, categoryId: val }))}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder={t("forums.modal.select_category") || "Select Category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {locale === "vi" && cat.name_vi ? cat.name_vi : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Post Type & Status Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.post_type") || "Post Type"}
                </Label>
                <Select
                  value={editForm.postType}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, postType: val }))}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">{t("forums.post_type.general") || "General"}</SelectItem>
                    <SelectItem value="BUG_REPORT">{t("forums.post_type.bug_report") || "Bug Report"}</SelectItem>
                    <SelectItem value="GUIDE">{t("forums.post_type.guide") || "Guide"}</SelectItem>
                    <SelectItem value="SUGGESTION">{t("forums.post_type.suggestion") || "Suggestion"}</SelectItem>
                    <SelectItem value="FAN_ART">{t("forums.post_type.fan_art") || "Fan Art"}</SelectItem>
                    <SelectItem value="LOOKING_FOR_PARTY">{t("forums.post_type.looking_for_party") || "Looking For Party"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.status") || "Status"}
                </Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                    <SelectItem value="CLOSED">CLOSED</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pinned Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="pin-switch" className="text-foreground font-semibold text-sm cursor-pointer">
                  {t("forums.dashboard.pinned_status") || "Pinned"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("forums.pinned") || "PINNED"}
                </p>
              </div>
              <Switch
                id="pin-switch"
                checked={editForm.isPinned}
                onCheckedChange={(val) => setEditForm((prev) => ({ ...prev, isPinned: val }))}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 mt-2">
            <Button
              variant="ghost"
              onClick={() => setEditModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              {t("forums.dashboard.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleUpdateMetadata}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              {saving ? (t("forums.dashboard.saving") || "Saving...") : (t("forums.dashboard.save_changes") || "Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500 font-bold">
              <AlertTriangle className="h-5 w-5" />
              {t("forums.delete_confirm_title") || "Delete Thread?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground leading-relaxed">
              {t("forums.delete_confirm_desc") ||
                "This action cannot be undone. The thread and all its replies will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-red-500/10 dark:bg-red-500/20 p-4 rounded-xl border border-red-500/20 text-xs space-y-1 my-2">
            <p className="text-red-600 dark:text-red-200 font-semibold mb-2">{t("forums.dashboard.delete_confirm_desc") || "Are you sure you want to delete this forum thread? This action cannot be undone."}</p>
            <p className="text-foreground/90 truncate">
              <span className="text-muted-foreground font-semibold">{t("forums.dashboard.col_title") || "Title"}:</span> {thread.title}
            </p>
            <p className="text-foreground/90">
              <span className="text-muted-foreground font-semibold">{t("forums.dashboard.author") || "Author"}:</span> {thread.author?.displayName || "Unknown"}
            </p>
          </div>

          <AlertDialogFooter className="border-t border-border pt-4 mt-2">
            <AlertDialogCancel
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              {t("forums.dashboard.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteThread}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
            >
              {deleting ? (t("common.deleting") || "Deleting...") : (t("forums.dashboard.action_delete") || "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
