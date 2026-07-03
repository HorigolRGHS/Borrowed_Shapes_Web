"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CornerDownRight,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Send,
  AlertTriangle,
  Flag
} from "lucide-react";
import ReportModal from "./report-modal";
import UserProfilePopup from "./user-profile-popup";

const CommentCKEditor = dynamic(
  () => import("./comment-ckeditor").then((mod) => mod.CommentCKEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60px] animate-pulse bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
    )
  }
);

interface Author {
  id: string;
  displayName: string;
  imgUrl: string | null;
  badgeImageUrl: string | null;
}

interface Comment {
  id: string;
  content: string;
  score: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  parentContent: string | null;
  author: Author | null;
  repliesCount: number;
  hasReplies: boolean;
  userVote: number | null;
}

interface CommentSectionProps {
  threadId: string;
  user: any;
  locale: string;
  t: (key: string, vars?: any) => string;
}

const timeAgo = (dateStr: string, locale: string, t: any) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 30) return t("comments.just_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("comments.minutes_ago", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("comments.hours_ago", { hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("comments.days_ago", { days });

  return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US");
};

export default function CommentSection({ threadId, user, locale, t }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");

  const limit = 20;

  useEffect(() => {
    fetchTopLevelComments(1, true);
  }, [threadId]);

  const fetchTopLevelComments = async (pageNum: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      const response = await axios.get("/api/comments", {
        params: { threadId, page: pageNum, limit },
      });

      if (response.data?.success) {
        const fetched = response.data.data || [];
        setComments((prev) => (reset ? fetched : [...prev, ...fetched]));
        setHasMore(fetched.length === limit);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || newComment === "<p></p>") return;

    if (!user) {
      toast.warning(t("comments.login_to_comment"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post("/api/comments", {
        threadId,
        content: newComment.trim(),
      });

      if (response.data?.success) {
        setNewComment("");
        setComments((prev) => [response.data.data, ...prev]);
        toast.success(t("comments.toast.comment_success"));
      } else {
        toast.error(response.data?.message || t("comments.toast.comment_failed"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || t("comments.toast.comment_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadMore = () => {
    fetchTopLevelComments(page + 1);
  };

  const handleCommentStateUpdate = (commentId: string, updatedFields: Partial<Comment>) => {
    const updateRecursive = (list: Comment[]): Comment[] => {
      return list.map((c) => {
        if (c.id === commentId) {
          return { ...c, ...updatedFields };
        }
        return c;
      });
    };
    setComments((prev) => updateRecursive(prev));
  };

  return (
    <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800/80">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-violet-500" />
        <span>{t("comments.title")}</span>
      </h3>

      {/* Comment Form */}
      {user ? (
        <div className="flex gap-3 items-start">
          <div className="flex-grow min-w-0">
            <CommentCKEditor
              value={newComment}
              onChange={setNewComment}
              onSend={() => handleCreateComment()}
              placeholder={t("comments.write_placeholder")}
              disabled={submitting}
            />
          </div>
          <button
            onClick={() => handleCreateComment()}
            disabled={submitting || !newComment.trim() || newComment === "<p></p>"}
            className="p-3.5 rounded-2xl bg-violet-600 hover:bg-violet-750 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-semibold transition-all shadow-md shadow-violet-500/10 cursor-pointer flex items-center justify-center h-[52px] w-[52px] flex-shrink-0"
            title={t("comments.save")}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <span>
            {t("comments.login_required_prefix")}
            <Link href="/auth/login" className="text-violet-500 hover:underline font-medium mx-1">
              {t("comments.login_link_text")}
            </Link>
            {t("comments.login_required_suffix")}
          </span>
        </div>
      )}

      {/* Top level list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">
          {t("comments.no_comments")}
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              threadId={threadId}
              depth={0}
              user={user}
              locale={locale}
              t={t}
              onCommentUpdate={handleCommentStateUpdate}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-950/30 rounded-xl transition-all cursor-pointer"
              >
                {t("comments.read_more_comments")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentNodeProps {
  comment: Comment;
  threadId: string;
  depth: number;
  user: any;
  locale: string;
  t: (key: string, vars?: any) => string;
  onCommentUpdate: (id: string, fields: Partial<Comment>) => void;
}

function CommentNode({
  comment,
  threadId,
  depth,
  user,
  locale,
  t,
  onCommentUpdate,
}: CommentNodeProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesHasMore, setRepliesHasMore] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<"user" | "comment">("comment");
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);

  const handleReportClick = () => {
    if (!user) {
      toast.warning(t("comments.login_to_vote"));
      return;
    }
    setReportTargetType("comment");
    setIsReportOpen(true);
  };

  const handleAvatarClick = () => {
    if (!comment.author) return;
    setSelectedProfileUser(comment.author);
    setIsProfilePopupOpen(true);
  };

  const limit = 20;
  const isAuthor = user && comment.author && String(user.id) === String(comment.author.id);
  const isAdmin = user && user.role === "ADMIN";

  const fetchReplies = async (pageNum: number, reset = false) => {
    try {
      setRepliesLoading(true);
      const response = await axios.get("/api/comments", {
        params: { threadId, parentId: comment.id, page: pageNum, limit },
      });

      if (response.data?.success) {
        const fetched = response.data.data || [];
        setReplies((prev) => (reset ? fetched : [...prev, ...fetched]));
        setRepliesHasMore(fetched.length === limit);
        setRepliesPage(pageNum);
        setShowReplies(true);
      }
    } catch (error) {
      console.error("Failed to load replies", error);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (showReplies) {
      setShowReplies(false);
    } else {
      if (replies.length === 0) {
        fetchReplies(1, true);
      } else {
        setShowReplies(true);
      }
    }
  };

  const handleVote = async (value: 1 | -1) => {
    if (!user) {
      toast.warning(t("comments.login_to_vote"));
      return;
    }

    try {
      const response = await axios.post(`/api/comments/${comment.id}/vote`, { value });
      if (response.data?.success) {
        onCommentUpdate(comment.id, {
          score: response.data.data?.score,
          userVote: response.data.data?.userVote,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("comments.toast.vote_failed"));
    }
  };

  const handleEditSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editContent.trim() || editContent === "<p></p>") return;

    setEditSubmitting(true);
    try {
      const response = await axios.patch(`/api/comments/${comment.id}`, {
        content: editContent.trim(),
      });

      if (response.data?.success) {
        onCommentUpdate(comment.id, {
          content: editContent.trim(),
          updatedAt: new Date().toISOString(),
        });
        setIsEditing(false);
        toast.success(t("comments.toast.edit_success"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("comments.toast.edit_failed"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const executeDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      const response = await axios.delete(`/api/comments/${comment.id}`);
      if (response.data?.success) {
        onCommentUpdate(comment.id, {
          isDeleted: true,
          content: "[Deleted]",
          author: null,
        });
        toast.success(t("comments.toast.delete_success"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("comments.toast.delete_failed"));
    }
  };

  const handleReplySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyContent.trim() || replyContent === "<p></p>") return;

    setReplySubmitting(true);
    try {
      const response = await axios.post("/api/comments", {
        threadId,
        parentId: comment.id,
        content: replyContent.trim(),
      });

      if (response.data?.success) {
        setReplyContent("");
        setIsReplying(false);
        setReplies((prev) => [response.data.data, ...prev]);
        onCommentUpdate(comment.id, {
          repliesCount: comment.repliesCount + 1,
          hasReplies: true,
        });
        setShowReplies(true);
        toast.success(t("comments.toast.reply_success"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("comments.toast.reply_failed"));
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleReplyChildUpdate = (childId: string, updatedFields: Partial<Comment>) => {
    setReplies((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, ...updatedFields } : c))
    );
  };

  const useIndent = depth < 2;

  return (
    <div className="relative group">
      <div
        className={`flex gap-3 relative p-4 rounded-2xl transition-all duration-200 bg-slate-50/40 dark:bg-[#0c0c16]/50 border border-slate-100 dark:border-slate-800/40 ${useIndent ? "" : "mt-2"
          }`}
      >
        {/* Parent Content Tooltip/Quote for no indent (depth >= 4) */}
        {!useIndent && comment.parentContent && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#07070f] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 max-w-[200px] truncate" title={comment.parentContent}>
            <span className="font-semibold">{t("comments.replying_to")}</span>
            <span className="italic">&ldquo;{comment.parentContent.replace(/<[^>]*>/g, "").substring(0, 20)}&rdquo;</span>
          </div>
        )}

        {/* User Avatar */}
        <div
          onClick={handleAvatarClick}
          className="relative flex h-9 w-9 items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className={`absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-violet-500 to-indigo-500 text-white font-bold text-[10px] shadow-sm overflow-hidden z-0 flex items-center justify-center ${comment.author?.badgeImageUrl ? "rounded-md" : "rounded-full"}`}>
            {comment.author?.imgUrl ? (
              <img src={comment.author?.imgUrl} alt={comment.author?.displayName} className="w-full h-full object-cover" />
            ) : (
              comment.author?.displayName?.substring(0, 2).toUpperCase() || "US"
            )}
          </div>
          {comment.author?.badgeImageUrl && (
            <img
              src={comment.author.badgeImageUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 w-full h-full object-contain drop-shadow-sm"
            />
          )}
        </div>

        {/* Comment Contents */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {comment.author ? comment.author.displayName : t("comments.user_deleted_placeholder")}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-600">•</span>
            <span>{timeAgo(comment.createdAt, locale, t)}</span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">({t("comments.edited")})</span>
            )}
          </div>

          {/* Edit / Main Text content */}
          {isEditing ? (
            <div className="space-y-2 pt-1 flex gap-3 items-start">
              <div className="flex-grow min-w-0">
                <CommentCKEditor
                  value={editContent}
                  onChange={setEditContent}
                  onSend={() => handleEditSave()}
                  disabled={editSubmitting}
                />
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditSave()}
                  disabled={editSubmitting || !editContent.trim() || editContent === "<p></p>"}
                  className="p-3 rounded-xl bg-violet-600 hover:bg-violet-750 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white transition-all shadow-md cursor-pointer flex items-center justify-center h-[42px] w-[42px]"
                  title={t("comments.save")}
                >
                  {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="p-3 rounded-xl border border-slate-250 dark:border-slate-855 text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center h-[42px] w-[42px]"
                  title={t("comments.cancel")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">
              {comment.isDeleted ? (
                <span className="italic text-slate-400 dark:text-slate-600">
                  {t("comments.comment_deleted_placeholder")}
                </span>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1" dangerouslySetInnerHTML={{ __html: comment.content }} />
              )}
            </div>
          )}

          {/* Action Row */}
          {!isEditing && (
            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="flex items-center gap-4">
                {/* Votes - styled like thread vote indicators */}
                {!comment.isDeleted && (
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                    <button
                      onClick={() => handleVote(1)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${comment.userVote === 1
                        ? "text-green-500 bg-green-100 dark:bg-green-950/30"
                        : "text-slate-500 hover:text-green-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      title={t("forums.upvote") || "Upvote"}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <span
                      className={`px-1.5 font-bold text-xs min-w-[16px] text-center ${comment.score > 0
                        ? "text-green-500"
                        : comment.score < 0
                          ? "text-red-500"
                          : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      {comment.score}
                    </span>
                    <button
                      onClick={() => handleVote(-1)}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${comment.userVote === -1
                        ? "text-red-500 bg-red-100 dark:bg-red-950/25"
                        : "text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      title={t("forums.downvote") || "Downvote"}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Reply trigger */}
                {user && !comment.isDeleted && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className={`text-slate-500 hover:text-violet-500 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${isReplying ? "text-violet-500" : ""
                      }`}
                  >
                    <CornerDownRight className="h-4 w-4" />
                    <span>{t("comments.reply")}</span>
                  </button>
                )}

                {/* Spacer to push edit/delete/report actions to the right */}
                <div className="flex-grow" />

                {/* Action buttons (Report, Edit, Delete) - positioned on the right */}
                {!comment.isDeleted && (
                  <div className="flex items-center gap-2">
                    {/* Report option: Show only if not logged in OR logged in as someone else */}
                    {(!user || !isAuthor) && (
                      <button
                        onClick={handleReportClick}
                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors border border-transparent hover:border-red-100/20 dark:hover:border-red-900/40 cursor-pointer"
                        title={t("reports.report_button")}
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isAuthor && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setIsReplying(false);
                        }}
                        className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-xl transition-colors border border-transparent hover:border-violet-100 dark:hover:border-violet-900/40 cursor-pointer"
                        title={t("comments.edit")}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(isAuthor || isAdmin) && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/40 cursor-pointer"
                        title={t("comments.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* View replies indicator (below Reply button, left-aligned) */}
              {comment.repliesCount > 0 && (
                <div className="flex items-center pt-1 pl-1">
                  <button
                    onClick={handleToggleReplies}
                    className="text-violet-600 dark:text-violet-400 hover:underline font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    {showReplies
                      ? (comment.repliesCount === 1 ? t("comments.hide_reply") : t("comments.hide_replies"))
                      : (comment.repliesCount === 1 ? t("comments.view_reply") : t("comments.view_replies", { count: comment.repliesCount }))}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply input block */}
      {isReplying && (
        <div className={`mt-3 flex gap-3 items-start ${useIndent ? "pl-12" : ""}`}>
          <div className="relative flex h-8 w-8 items-center justify-center flex-shrink-0">
            <div className={`absolute left-1/2 top-1/2 w-[72%] h-[72%] -translate-x-1/2 -translate-y-1/2 bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-[9px] shadow-sm overflow-hidden z-0 flex items-center justify-center ${user.equippedAchievement?.badgeImageUrl ? "rounded-md" : "rounded-full"}`}>
              {user.imgUrl ? (
                <img src={user.imgUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                user.displayName?.substring(0, 2).toUpperCase() || "US"
              )}
            </div>
            {user.equippedAchievement?.badgeImageUrl && (
              <img
                src={user.equippedAchievement.badgeImageUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 w-full h-full object-contain drop-shadow-sm"
              />
            )}
          </div>
          <div className="flex-grow min-w-0">
            <CommentCKEditor
              value={replyContent}
              onChange={setReplyContent}
              onSend={() => handleReplySubmit()}
              placeholder={t("comments.write_reply_placeholder")}
              disabled={replySubmitting}
            />
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => handleReplySubmit()}
              disabled={replySubmitting || !replyContent.trim() || replyContent === "<p></p>"}
              className="p-3 rounded-xl bg-violet-600 hover:bg-violet-750 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white transition-all shadow-md cursor-pointer flex items-center justify-center h-[42px] w-[42px]"
              title={t("comments.reply")}
            >
              {replySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsReplying(false)}
              className="p-3 rounded-xl border border-slate-250 dark:border-slate-855 text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center h-[42px] w-[42px]"
              title={t("comments.cancel")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Render children comments list if showReplies with animation */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${showReplies ? "max-h-[5000px] opacity-100 mt-3" : "max-h-0 opacity-0 pointer-events-none"
          }`}
      >
        <div
          className={`space-y-3 relative ${useIndent ? "pl-6 sm:pl-8 border-l border-slate-100 dark:border-slate-800/80 ml-4 sm:ml-5" : ""
            }`}
        >
          {repliesLoading && replies.length === 0 && (
            <div className="flex py-2 pl-4">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            </div>
          )}

          {replies.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              threadId={threadId}
              depth={depth + 1}
              user={user}
              locale={locale}
              t={t}
              onCommentUpdate={handleReplyChildUpdate}
            />
          ))}

          {repliesLoading && replies.length > 0 && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            </div>
          )}

          {repliesHasMore && !repliesLoading && (
            <div className="flex pl-4 pt-1">
              <button
                onClick={() => fetchReplies(repliesPage + 1)}
                className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <CornerDownRight className="h-3 w-3" />
                <span>{t("comments.read_more_replies")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-6 shadow-2xl z-10 animate-fade-in"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100/20 dark:bg-red-900/20 border border-red-505/30 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <div>
                <h2
                  className="text-slate-900 dark:text-white mb-1 font-bold text-lg"
                >
                  {t("comments.delete_confirm")}
                </h2>
              </div>
              <div className="flex gap-3 w-full pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-slate-550 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm cursor-pointer font-semibold"
                >
                  {t("comments.cancel")}
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all text-sm cursor-pointer font-semibold shadow-md"
                >
                  {t("comments.delete")}
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
          targetType="comment"
          reportedUserId={comment.author?.id || ""}
          reportedUserDisplayName={comment.author?.displayName || ""}
          reportedUserImgUrl={comment.author?.imgUrl}
          commentId={comment.id}
          commentContent={comment.content}
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
    </div>
  );
}
