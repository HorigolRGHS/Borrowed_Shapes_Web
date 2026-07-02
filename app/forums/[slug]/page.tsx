"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useI18n } from "@/lib/i18/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  Eye,
  Pin,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Flag
} from "lucide-react";
import { getUserProfile } from "@/lib/api/api-client";
import CreateThreadModal from "@/components/forums/create-thread-modal";
import CommentSection from "@/components/forums/comment-section";
import ReportModal from "@/components/forums/report-modal";
import UserProfilePopup from "@/components/forums/user-profile-popup";
import { toast } from "react-toastify";

const formatViews = (
  views: number,
  locale: string,
  fullView: boolean = false
): string => {

  if (fullView) {
    return views.toLocaleString("vi-VN");
  }

  if (views < 1000) return String(views);

  const isVi = locale === "vi";

  if (views >= 1_000_000_000) {
    const value = views / 1_000_000_000;
    const formatted = value.toFixed(1).replace(/\.0$/, "");
    return `${formatted}${isVi ? " T" : " B"}`;
  }

  if (views >= 1_000_000) {
    const value = views / 1_000_000;
    const formatted = value.toFixed(1).replace(/\.0$/, "");
    return `${formatted}${isVi ? " Tr" : " M"}`;
  }

  if (views >= 1_000) {
    const value = views / 1_000;
    const formatted = value.toFixed(1).replace(/\.0$/, "");
    return `${formatted}${isVi ? " N" : " K"}`;
  }

  return String(views);
};

export default function ForumDetailPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams() as { slug?: string };
  const slug = params.slug ?? "";
  const isFetchingRef = useRef(false);

  const [thread, setThread] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isViewFull, setIsViewFull] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<"user" | "thread">("thread");
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);

  const handleReportClick = () => {
    if (!user) {
      toast.warning(t("comments.login_to_vote"));
      return;
    }
    setReportTargetType("thread");
    setIsReportOpen(true);
  };

  const handleAvatarClick = () => {
    if (!thread?.author) return;
    setSelectedProfileUser(thread.author);
    setIsProfilePopupOpen(true);
  };
  const [form, setForm] = useState<{
    id?: string;
    title: string;
    slug: string;
    content: string;
    categoryId: string;
    postType: string;
    imageUrl: string | null;
  }>({
    id: undefined,
    title: "",
    slug: "",
    content: "",
    categoryId: "",
    postType: "GENERAL",
    imageUrl: null,
  });

  useEffect(() => {
    const profile = getUserProfile();
    setUser(profile);
    fetchCategories(profile);
  }, []);

  const fetchCategories = async (currentUser?: any) => {
    try {
      const userProfile = currentUser || getUserProfile();
      const isAdmin = userProfile?.role === "ADMIN";
      const url = isAdmin ? "/api/category" : "/api/category/unofficial";
      const response = await axios.get(url);
      if (response.data?.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Fetch categories failed", error);
    }
  };

  useEffect(() => {
    if (!slug || isFetchingRef.current) return;
    isFetchingRef.current = true;
    fetchThread().finally(() => {
      isFetchingRef.current = false;
    })
  }, [slug]);

  const fetchThread = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.get(`/api/forums/slug/${encodeURIComponent(slug)}`);
      if (response.data?.success) {
        setThread(response.data.data);
        setForm({
          id: response.data.data.id,
          title: response.data.data.title ?? "",
          slug: response.data.data.slug ?? "",
          content: response.data.data.content ?? "",
          categoryId: response.data.data.category?.id ?? response.data.data.categoryId ?? "",
          postType: response.data.data.postType ?? "GENERAL",
          imageUrl: response.data.data.imageUrl ?? null,
        });
      } else {
        setMessage(response.data?.message || t("forums.thread_not_found"));
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || error.message || t("forums.thread_not_found"));
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (value: 1 | -1) => {
    if (!thread) return;

    try {
      const response = await axios.post(`/api/forums/${thread.id}/vote`, { value });
      if (response.data?.success) {
        setThread((current: any) => ({
          ...current,
          score: response.data.data?.score ?? current.score,
          userVote: response.data.data?.userVote !== undefined ? response.data.data.userVote : current.userVote,
        }));
        toast.success(t("forums.vote_success"));
      } else {
        const errMsg = response.data?.message || t("forums.vote_failed");
        setMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || t("forums.vote_failed");
      setMessage(errMsg);
      toast.error(errMsg);
    }
  };

  const handleUpdate = async (formPayload: any, file: File | null) => {
    if (!thread) return;

    try {
      let finalImageUrl = formPayload.imageUrl;

      if (file) {
        const uploadResp = await axios.post("/api/forums/upload", {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          threadId: thread.id,
        });

        const uploadData = uploadResp.data?.data;
        if (uploadData) {
          const putRes = await fetch(uploadData.uploadUrl, {
            method: uploadData.method,
            headers: uploadData.headers,
            body: file,
          });

          if (!putRes.ok) {
            throw new Error("Thread image upload failed");
          }
          finalImageUrl = uploadData.publicUrl;
        }
      }

      const payload = {
        title: formPayload.title,
        slug: formPayload.slug || undefined,
        content: formPayload.content,
        categoryId: formPayload.categoryId,
        postType: formPayload.postType,
        imageUrl: finalImageUrl || null,
      };
      const response = await axios.patch(`/api/forums/update/${thread.id}`, payload);

      if (response.data?.success) {
        toast.success(t("forums.thread_updated"));
        setMessage(t("forums.thread_updated"));
        setIsEditing(false);
        fetchThread();
      } else {
        const errMsg = response.data?.message || t("forums.update_failed");
        setMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || t("forums.update_failed");
      setMessage(errMsg);
      toast.error(errMsg);
    }
  };

  const handleDelete = async () => {
    if (!thread) return;

    try {
      const response = await axios.delete(`/api/forums/delete/${thread.id}`);
      if (response.data?.success) {
        toast.success(t("forums.delete_success"));
        setShowDeleteConfirm(false);
        const categoryId = thread.category?.id;
        if (categoryId) {
          router.push(`/forums?category=${categoryId}`);
        } else {
          router.push("/forums");
        }
      } else {
        const errMsg = response.data?.message || t("forums.delete_failed");
        setMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || t("forums.delete_failed");
      setMessage(errMsg);
      toast.error(errMsg);
    }
  };

  const handleViewFull = async () => {
    setIsViewFull(!isViewFull)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans transition-colors duration-300">
        <PublicHeader />
        <main className="max-w-7xl mx-auto py-20 px-5 flex-1 w-full flex items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans transition-colors duration-300">
        <PublicHeader />
        <main className="max-w-7xl mx-auto py-20 px-5 flex-1 w-full flex items-center justify-center">
          <div className="text-red-500 font-medium text-center">{message || t("forums.thread_not_found")}</div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const isAuthor = user && (String(user.id) === String(thread.author?.id) || user.role === 'ADMIN');

  console.log("check thread: ", thread);
  return (
    <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans transition-colors duration-300">
      <PublicHeader />
      <main className="max-w-6xl mx-auto py-20 px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/forums" className="hover:text-violet-500 dark:hover:text-violet-400 transition-colors font-medium">
            Forums
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          {thread.category ? (
            <Link href={`/forums?category=${thread.category.id}`} className="hover:text-violet-500 dark:hover:text-violet-400 transition-colors font-medium">
              {thread.category.name}
            </Link>
          ) : (
            <span>N/A</span>
          )}
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[200px]" title={thread.title}>
            {thread.title}
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-8 shadow-md mb-8">
          {message && (
            <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-700 dark:text-slate-300">
              {message}
            </div>
          )}

          <section className="space-y-6">
            {/* Badges / View count Row */}
            <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80 text-xs">
              {thread.isPinned && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-750 dark:text-violet-300 font-semibold border border-violet-250 dark:border-violet-850">
                  <Pin className="h-3 w-3 fill-violet-750 text-violet-750 rotate-45" />
                  {t("forums.pinned") || "PINNED"}
                </span>
              )}
              {thread.status && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-250 dark:border-amber-850 font-semibold">
                  {thread.status.toUpperCase()}
                </span>
              )}
              {thread.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-250 dark:border-blue-850 font-semibold">
                  {thread.category.name.toUpperCase()}
                </span>
              )}
              {thread.postType && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-semibold">
                  {t(`forums.post_type.${thread.postType.toLowerCase()}`) || thread.postType.replace(/_/g, " ").toUpperCase()}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1.5 text-slate-500 dark:text-slate-400 cursor-pointer"
                onClick={() => handleViewFull()}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>
                  {formatViews(thread.viewCount ?? 0, locale, isViewFull)} {" "} {t("forums.views") || "views"}
                </span>
              </span>
            </div>

            {/* Thread Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
              {thread.title}
            </h1>

            {/* Content and Author Row */}
            <div className="flex gap-4 items-start">
              {/* Left Side: Avatar */}
              <div
                onClick={handleAvatarClick}
                className="relative flex h-12 w-12 items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className={`absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-violet-600 to-blue-500 text-white font-bold text-sm shadow-md overflow-hidden z-0 flex items-center justify-center ${thread.author?.badgeImageUrl ? "rounded-md" : "rounded-full"}`}>
                  {thread.author?.imgUrl ? (
                    <img src={thread.author?.imgUrl} alt={thread.author?.displayName} className="w-full h-full object-cover" />
                  ) : (
                    thread.author?.displayName?.substring(0, 2).toUpperCase() || "US"
                  )}
                </div>
                {thread.author?.badgeImageUrl && (
                  <img
                    src={thread.author.badgeImageUrl}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10 w-full h-full object-contain drop-shadow-sm"
                  />
                )}
              </div>

              {/* Right Side: Author info, content, bottom action row */}
              <div className="flex-1 min-w-0">
                {/* Author Meta */}
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-white text-sm">
                    {thread.author?.displayName ?? "Unknown"}
                  </span>
                  <span className="flex items-center gap-1 ml-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(thread.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Main Content & Image */}
                <div className="flex flex-col md:flex-row gap-6 items-start justify-between mb-4">
                  {/* Content on the left */}
                  <div className="flex-1 min-w-0 prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: thread.content }} />

                  {/* Thread Image on the right (if any) */}
                  {thread.imageUrl && (
                    <div
                      onClick={() => setIsImageOpen(true)}
                      className="relative inline-block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 max-w-sm max-h-64 shadow-sm bg-slate-50 dark:bg-slate-900/40 cursor-zoom-in hover:opacity-95 transition-opacity duration-200 shrink-0 md:max-w-[280px]"
                    >
                      <img src={thread.imageUrl} alt={thread.title} className="max-w-full max-h-64 object-contain" />
                    </div>
                  )}
                </div>

                {/* Bottom Action Row: Vote indicators, Edit/Delete buttons */}
                <div className="flex justify-between items-center pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                  {/* Vote Actions & Comment Count */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                      <button
                        onClick={() => handleVote(1)}
                        className={`p-2 rounded-full transition-colors cursor-pointer ${thread.userVote === 1
                          ? "text-green-500 bg-green-100 dark:bg-green-950/30"
                          : "text-slate-500 hover:text-green-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        title={t("forums.upvote") || "Upvote"}
                      >
                        <ThumbsUp className="h-5 w-5" />
                      </button>

                      <span className={`px-2 font-bold text-sm min-w-[20px] text-center ${(thread.score ?? 0) > 0 ? "text-green-500" : (thread.score ?? 0) < 0 ? "text-red-500" : "text-slate-600 dark:text-slate-400"
                        }`}>
                        {thread.score ?? 0}
                      </span>

                      <button
                        onClick={() => handleVote(-1)}
                        className={`p-2 rounded-full transition-colors cursor-pointer ${thread.userVote === -1
                          ? "text-red-500 bg-red-100 dark:bg-red-950/20"
                          : "text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        title={t("forums.downvote") || "Downvote"}
                      >
                        <ThumbsDown className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Comment Count Badge */}
                    <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-2xl border border-slate-250/80 dark:border-slate-800/60 shadow-sm text-xs font-semibold">
                      <MessageSquare className="h-4 w-4 text-violet-500" />
                      <span>
                        {thread.commentCount ?? 0} {t("forums.comments_unit") || "comments"}
                      </span>
                    </div>
                  </div>

                  {/* Edit / Delete / Report actions */}
                  <div className="flex items-center gap-2">
                    {/* Report Option: Show to everyone except the author (and admins, who already have edit/delete) */}
                    {(!user || (user.id !== thread.author?.id && user.role !== 'ADMIN')) && (
                      <button
                        onClick={handleReportClick}
                        className="p-2.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-xl transition-colors border border-transparent hover:border-red-100/20 dark:hover:border-red-900/40 cursor-pointer"
                        title={t("reports.report_button")}
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    )}
                    {isAuthor && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2.5 text-slate-500 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-xl transition-colors border border-transparent hover:border-violet-100 dark:hover:border-violet-900/40 cursor-pointer"
                          title={t("forums.edit_button") || "Edit"}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/40 cursor-pointer"
                          title={t("forums.delete_button") || "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Comments Section */}
        <CommentSection
          threadId={thread.id}
          user={user}
          locale={locale}
          t={t}
        />
      </main>

      {/* Edit Thread Modal */}
      {isEditing && (
        <CreateThreadModal
          open={isEditing}
          categories={categories}
          form={form}
          setForm={setForm}
          onClose={() => setIsEditing(false)}
          onSubmit={handleUpdate}
          title={t("forums.edit_thread_title") || "Edit Thread"}
          subtitle={t("forums.edit_thread_subtitle") || "Update your thread's details."}
          submitText={t("forums.save_button") || "Save"}
        />
      )}

      {/* Full Image Lightbox */}
      {isImageOpen && thread.imageUrl && (
        <div
          onClick={() => setIsImageOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center cursor-zoom-out"
        >
          <img
            src={thread.imageUrl}
            alt={thread.title}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-fade-in"
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-6 shadow-2xl z-10"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100/20 dark:bg-red-900/20 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <div>
                <h2
                  className="text-slate-900 dark:text-white mb-1 font-bold text-lg"
                >
                  {t("forums.delete_confirm_title") || "Delete Thread?"}
                </h2>
                <p
                  className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed"
                >
                  {t("forums.delete_confirm_desc") || "This action cannot be undone. The thread and all its replies will be permanently removed."}
                </p>
              </div>
              <div className="flex gap-3 w-full pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm cursor-pointer font-semibold"
                >
                  {t("forums.modal.cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all text-sm cursor-pointer font-semibold shadow-md"
                >
                  {t("forums.delete_button") || "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReportOpen && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          targetType="thread"
          reportedUserId={thread.author?.id || ""}
          reportedUserDisplayName={thread.author?.displayName || ""}
          reportedUserImgUrl={thread.author?.imgUrl}
          threadId={thread.id}
          threadTitle={thread.title}
        />
      )}

      {selectedProfileUser && (
        <UserProfilePopup
          isOpen={isProfilePopupOpen}
          onClose={() => {
            setIsProfilePopupOpen(false);
            setSelectedProfileUser(null);
          }}
          targetUser={selectedProfileUser}
          currentUser={user}
          locale={locale}
          t={t}
        />
      )}

      <PublicFooter />
    </div>
  );
}