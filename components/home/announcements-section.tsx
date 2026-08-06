"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  Newspaper,
  Wrench,
  Calendar,
  Bell,
  RefreshCw,
  Clock,
  ArrowRight,
  Pin,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Announcement {
  id: string;
  slug: string;
  slugVi: string;
  title: string;
  titleVi: string;
  summary?: string;
  summaryVi?: string;
  content: string;
  contentVi: string;
  type: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string } | null;
}

const TYPE_TABS = [
  { key: "all", i18nKey: "home.announcements_section.tab_all" },
  { key: "NEWS", i18nKey: "home.announcements_section.tab_news" },
  { key: "EVENT", i18nKey: "home.announcements_section.tab_events" },
  { key: "UPDATE", i18nKey: "home.announcements_section.tab_updates" },
  { key: "PATCH_NOTE", i18nKey: "home.announcements_section.tab_patch_notes" },
  { key: "MAINTENANCE", i18nKey: "home.announcements_section.tab_maintenance" },
];

const TYPE_CONFIG: Record<string, {
  gradient: string;
  badgeBg: string;
  badgeText: string;
  icon: typeof Newspaper;
}> = {
  NEWS: {
    gradient: "from-violet-900/80 via-purple-900/60 to-indigo-900/40",
    badgeBg: "bg-emerald-500/20 border-emerald-500/50",
    badgeText: "text-emerald-400",
    icon: Newspaper,
  },
  PATCH_NOTE: {
    gradient: "from-teal-900/80 via-cyan-900/60 to-emerald-900/40",
    badgeBg: "bg-purple-500/20 border-purple-500/50",
    badgeText: "text-purple-400",
    icon: Wrench,
  },
  EVENT: {
    gradient: "from-orange-900/80 via-amber-900/60 to-yellow-900/40",
    badgeBg: "bg-rose-500/20 border-rose-500/50",
    badgeText: "text-rose-400",
    icon: Calendar,
  },
  UPDATE: {
    gradient: "from-blue-900/80 via-sky-900/60 to-cyan-900/40",
    badgeBg: "bg-sky-500/20 border-sky-500/50",
    badgeText: "text-sky-400",
    icon: RefreshCw,
  },
  MAINTENANCE: {
    gradient: "from-red-900/80 via-rose-900/60 to-pink-900/40",
    badgeBg: "bg-amber-500/20 border-amber-500/50",
    badgeText: "text-amber-400",
    icon: Bell,
  },
};

function getTypeConfig(type: string) {
  return (
    TYPE_CONFIG[type] || {
      gradient: "from-slate-900/80 via-slate-800/60 to-slate-700/40",
      badgeBg: "bg-gray-500/20 border-gray-500/50",
      badgeText: "text-gray-400",
      icon: Newspaper,
    }
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return "";
  }
}

function getTypeLabel(type: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    NEWS: t("announcements.filter_type_news"),
    PATCH_NOTE: t("announcements.filter_type_patch_note"),
    EVENT: t("announcements.filter_type_event"),
    UPDATE: t("announcements.filter_type_update"),
    MAINTENANCE: t("announcements.filter_type_maintenance"),
  };
  return map[type] || type;
}

export function AnnouncementsSection() {
  const { t, locale } = useI18n();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get("/api/announcements/list", {
        params: {
          limit: 20,
          sortBy: "publishedAt",
          order: "desc",
        },
      });
      if (response.data?.success) {
        setAnnouncements(response.data.data?.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAnnouncement = async (slug: string) => {
    const existing = announcements.find((a) => a.slug === slug || a.slugVi === slug);
    if (existing) {
      setSelectedAnnouncement(existing);
    }
    try {
      const response = await axios.get(`/api/announcements/detail/${slug}`);
      if (response.data?.success) {
        setSelectedAnnouncement(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch announcement detail:", error);
    }
  };

  const closeAnnouncement = () => {
    setSelectedAnnouncement(null);
  };

  const getTitle = (a: Announcement) =>
    locale === "vi" ? a.titleVi || a.title : a.title;
  const getSummary = (a: Announcement) =>
    locale === "vi" ? a.summaryVi || a.summary : a.summary;
  const getSlug = (a: Announcement) =>
    locale === "vi" ? a.slugVi || a.slug : a.slug;
  const getContent = (a: Announcement) =>
    locale === "vi" ? a.contentVi || a.content : a.content;

  // Find featured pinned announcement overall (newest updated pinned announcement)
  const pinnedAnnouncement = announcements
    .filter((a) => a.isPinned)
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.publishedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.publishedAt || b.createdAt).getTime();
      return timeB - timeA;
    })[0];

  // Filter by active tab
  const filteredAnnouncements = announcements.filter((a) => {
    if (activeTab === "all") return true;
    return a.type === activeTab;
  });

  // Grid items: show matching announcements in the active tab (excluding the featured pinned banner)
  const gridItems = filteredAnnouncements.slice(0, 6);

  // For the modal layout:
  const modalLatestItems = selectedAnnouncement
    ? announcements.filter((a) => a.slug !== selectedAnnouncement.slug).slice(0, 4)
    : [];

  const modalCurrentIndex = selectedAnnouncement
    ? announcements.findIndex((a) => a.slug === selectedAnnouncement.slug)
    : -1;

  const modalPrevAnnouncement = modalCurrentIndex > 0 ? announcements[modalCurrentIndex - 1] : null;
  const modalNextAnnouncement = modalCurrentIndex >= 0 && modalCurrentIndex < announcements.length - 1 ? announcements[modalCurrentIndex + 1] : null;

  if (loading) {
    return (
      <section className="py-20 bg-background dark:bg-[#07070f] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section
      id="announcements-section"
      className="py-20 bg-background dark:bg-[#07070f] transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <span className="text-sm font-bold tracking-widest text-amber-500 uppercase flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t("home.announcements_section.label")}
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground dark:text-white mt-2">
            {t("home.announcements_section.title")}
          </h2>
          <p className="text-muted-foreground dark:text-gray-400 mt-3 text-lg max-w-2xl">
            {t("home.announcements_section.subtitle")}
          </p>
          <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>

        {/* Featured pinned announcement banner at the top */}
        {pinnedAnnouncement && (
          <Link
            href={`/announcements/${getSlug(pinnedAnnouncement)}`}
            onClick={(e) => {
              e.preventDefault();
              openAnnouncement(getSlug(pinnedAnnouncement));
            }}
            className="block mb-10 group cursor-pointer"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border dark:border-amber-500/20 bg-card dark:bg-[#0f0f1a] p-6 sm:p-8 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)]">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${getTypeConfig(pinnedAnnouncement.type).badgeBg} ${getTypeConfig(pinnedAnnouncement.type).badgeText}`}
                    >
                      {getTypeLabel(pinnedAnnouncement.type, t)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                      <Pin className="w-3 h-3" />
                      {t("home.announcements_section.pinned")}
                    </span>
                  </div>

                  <h3 
                    className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white mb-3 group-hover:text-amber-500 transition-colors line-clamp-2"
                    title={getTitle(pinnedAnnouncement)}
                  >
                    {getTitle(pinnedAnnouncement)}
                  </h3>

                  {getSummary(pinnedAnnouncement) && (
                    <p className="text-muted-foreground dark:text-gray-400 text-base leading-relaxed mb-4 line-clamp-2">
                      {getSummary(pinnedAnnouncement)}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {pinnedAnnouncement.author?.displayName?.charAt(0) || "D"}
                      </div>
                      <span className="text-sm text-muted-foreground dark:text-gray-400">
                        {pinnedAnnouncement.author?.displayName || "DevTeam_BS"}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(pinnedAnnouncement.publishedAt)}
                    </span>
                    <span className="text-sm font-bold text-amber-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                      {t("home.announcements_section.read_more")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* Decorative icon */}
                <div className="hidden lg:flex items-center justify-center w-32 h-32 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5 border border-amber-500/10">
                  {(() => {
                    const IconComp = getTypeConfig(pinnedAnnouncement.type).icon;
                    return (
                      <IconComp className="w-16 h-16 text-amber-500/30" />
                    );
                  })()}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab.key
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                : "bg-card/50 dark:bg-white/5 text-muted-foreground dark:text-gray-400 hover:bg-card dark:hover:bg-white/10 border border-border dark:border-white/10"
                }`}
            >
              {t(tab.i18nKey)}
            </button>
          ))}
        </div>

        {/* Announcement cards grid */}
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground dark:text-gray-500">
            {t("home.announcements_section.no_announcements")}
          </div>
        ) : gridItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridItems.map((a) => {
              const config = getTypeConfig(a.type);
              const IconComp = config.icon;

              return (
                <Link
                  key={a.slug}
                  href={`/announcements/${getSlug(a)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openAnnouncement(getSlug(a));
                  }}
                  className="group block h-full cursor-pointer"
                >
                  <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-border dark:border-white/10 bg-card dark:bg-[#0f0f1a] transition-all duration-300 hover:border-amber-500/30 hover:shadow-xl hover:-translate-y-1">
                    {/* Gradient header area */}
                    <div
                      className={`relative h-32 bg-gradient-to-br ${config.gradient} flex items-center justify-center overflow-hidden`}
                    >
                      {a.isPinned && (
                        <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-amber-500/30">
                          <Pin className="w-2.5 h-2.5" />
                          {t("home.announcements_section.pinned")}
                        </span>
                      )}
                      <IconComp className="w-12 h-12 text-white/20" />
                    </div>

                    {/* Card body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${config.badgeBg} ${config.badgeText} uppercase tracking-widest`}
                          >
                            {getTypeLabel(a.type, t)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(a.publishedAt)}
                          </span>
                        </div>

                        <h3 
                          className="font-bold text-foreground dark:text-white mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors leading-snug"
                          title={getTitle(a)}
                        >
                          {getTitle(a)}
                        </h3>

                        {getSummary(a) && (
                          <p className="text-sm text-muted-foreground dark:text-gray-400 line-clamp-2 mb-4">
                            {getSummary(a)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border dark:border-white/5 mt-4">
                        <span className="text-xs text-muted-foreground dark:text-gray-500">
                          {a.author?.displayName || "DevTeam_BS"}
                        </span>
                        <span className="text-xs font-bold text-amber-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                          {t("home.announcements_section.read")}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Detail Pop-up Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300 cursor-pointer"
            onClick={closeAnnouncement}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl bg-transparent shadow-2xl p-0 animate-in fade-in zoom-in-95 duration-200 z-10">
            {/* Close Button */}
            <button
              onClick={closeAnnouncement}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/80 dark:bg-[#07070f]/80 hover:bg-card dark:hover:bg-white/10 text-foreground/80 dark:text-white hover:text-foreground backdrop-blur-md border border-border/40 dark:border-white/10 shadow-md transition-all z-50 cursor-pointer"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable Content Container */}
            <div className="w-full max-h-[90vh] overflow-y-auto rounded-2xl p-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 p-4 sm:p-6 bg-background dark:bg-[#07070f] rounded-2xl border border-border dark:border-amber-500/20 text-left">
              {/* Main content */}
              <article className="lg:col-span-2">
                {/* Header gradient area */}
                <div className={`relative rounded-t-2xl overflow-hidden bg-gradient-to-br ${getTypeConfig(selectedAnnouncement.type).gradient} p-8 mb-0 border border-border dark:border-white/10 border-b-0`}>
                  <div className="absolute top-6 right-6">
                    {(() => {
                      const IconComp = getTypeConfig(selectedAnnouncement.type).icon;
                      return <IconComp className="w-20 h-20 text-white/10" />;
                    })()}
                  </div>
                  <span
                    className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${getTypeConfig(selectedAnnouncement.type).badgeBg} ${getTypeConfig(selectedAnnouncement.type).badgeText}`}
                  >
                    {getTypeLabel(selectedAnnouncement.type, t)}
                  </span>
                </div>

                {/* Content area */}
                <div className="rounded-b-2xl border border-border dark:border-white/10 border-t-0 bg-card dark:bg-[#0f0f1a] p-6 sm:p-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white mb-4 leading-tight break-words whitespace-pre-wrap">
                    {getTitle(selectedAnnouncement)}
                  </h1>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold text-white">
                        {selectedAnnouncement.author?.displayName?.charAt(0) || "D"}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground dark:text-white block">
                          {selectedAnnouncement.author?.displayName || "DevTeam_BS"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground dark:text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(selectedAnnouncement.publishedAt)}
                        </span>
                      </div>
                    </div>
                    {selectedAnnouncement.isPinned && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 ml-auto">
                        <Pin className="w-3.5 h-3.5" />
                        {t("home.announcements_section.pinned")}
                      </span>
                    )}
                  </div>

                  {/* Summary blockquote */}
                  {getSummary(selectedAnnouncement) && (
                    <blockquote className="border-l-4 border-amber-500/50 bg-muted/40 dark:bg-[#16162a] px-5 py-4 rounded-r-lg mb-8 text-muted-foreground dark:text-gray-300 italic text-base leading-relaxed">
                      {getSummary(selectedAnnouncement)}
                    </blockquote>
                  )}

                  {/* Separator */}
                  <div className="w-full h-px bg-border dark:bg-white/10 mb-8" />

                  {/* Content body */}
                  <div
                    className="prose prose-lg dark:prose-invert max-w-none
                      prose-headings:text-foreground dark:prose-headings:text-white
                      prose-p:text-muted-foreground dark:prose-p:text-gray-300
                      prose-strong:text-foreground dark:prose-strong:text-white
                      prose-a:text-amber-500 hover:prose-a:text-amber-400
                      prose-li:text-muted-foreground dark:prose-li:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: getContent(selectedAnnouncement) }}
                  />

                  {/* Bottom separator dot */}
                  <div className="flex justify-center my-10">
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                  </div>

                  {/* Bottom navigation */}
                  <div className="border-t border-border dark:border-white/10 pt-6">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={closeAnnouncement}
                        className="text-sm text-muted-foreground dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {t("home.announcements_section.back_to_announcements")}
                      </button>

                      <div className="flex items-center gap-3">
                        {modalPrevAnnouncement ? (
                          <button
                            onClick={() => openAnnouncement(getSlug(modalPrevAnnouncement))}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white border border-border dark:border-white/10 hover:border-amber-500/30 transition-all cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            {t("home.announcements_section.prev")}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-muted-foreground/50 dark:text-gray-600 border border-border/50 dark:border-white/5 cursor-not-allowed">
                            <ChevronLeft className="w-4 h-4" />
                            {t("home.announcements_section.prev")}
                          </span>
                        )}
                        {modalNextAnnouncement ? (
                          <button
                            onClick={() => openAnnouncement(getSlug(modalNextAnnouncement))}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-foreground dark:text-white bg-card/50 dark:bg-white/5 border border-border dark:border-white/10 hover:border-amber-500/30 transition-all cursor-pointer"
                          >
                            {t("home.announcements_section.next")}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-muted-foreground/50 dark:text-gray-600 border border-border/50 dark:border-white/5 cursor-not-allowed">
                            {t("home.announcements_section.next")}
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="sticky top-6">
                  <h3 className="text-sm font-bold tracking-widest text-muted-foreground dark:text-gray-400 uppercase mb-6">
                    {t("home.announcements_section.latest")}
                  </h3>

                  <div className="space-y-5">
                    {modalLatestItems.map((sidebarAnn) => {
                      const sidebarConfig = getTypeConfig(sidebarAnn.type);
                      return (
                        <button
                          key={sidebarAnn.slug}
                          onClick={() => openAnnouncement(getSlug(sidebarAnn))}
                          className="block text-left w-full group cursor-pointer"
                        >
                          <div className="space-y-1.5">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${sidebarConfig.badgeBg} ${sidebarConfig.badgeText} uppercase tracking-widest`}
                            >
                              {getTypeLabel(sidebarAnn.type, t)}
                            </span>
                            <h4 
                              className="text-sm font-semibold text-foreground dark:text-white group-hover:text-amber-500 transition-colors leading-snug line-clamp-2"
                              title={getTitle(sidebarAnn)}
                            >
                              {getTitle(sidebarAnn)}
                            </h4>
                            <span className="text-xs text-muted-foreground dark:text-gray-500">
                              {formatDate(sidebarAnn.publishedAt)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    )}


    </section>
  );
}
