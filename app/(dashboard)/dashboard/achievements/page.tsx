  "use client";

  import { useI18n } from "@/lib/i18/i18n-context";
  import { getUserProfile, handleLogout } from "@/lib/api/api-client";
  import { useEffect, useState, useRef } from "react";
  import { useRouter } from "next/navigation";
  import axios from "axios";
  import { toast } from "react-toastify";
  import { RotateCcw, Plus, Search, Eye, Users, Pencil, Trash2, AlertTriangle } from "lucide-react";
  import { CKEditor } from '@ckeditor/ckeditor5-react';
  import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
  interface Achievement {
    id: string;
    name: string;
    description?: string;
    criteriaCode: string;
    badgeImageUrl: string;
    type: string;
    seasonMonth?: string;
    expiresAt?: string;
    earnedCount?: number;
  }
  interface AchievementUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  earnedAt?: string;
}
  export default function AchievementsPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("created");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewAchievement, setViewAchievement] = useState<Achievement | null>(null);
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
    const [deleteAchievement, setDeleteAchievement] = useState<Achievement | null>(null);
    const [achievementUsers, setAchievementUsers] = useState<AchievementUser[]>([]);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [formData, setFormData] = useState({
      name: "",
      description: "",
      criteriaCode: "",
      badgeImageUrl: "",
      type: "PERMANENT",
      seasonMonth: "",
      expiresAt: "",
    });
    const expiresRef = useRef<HTMLInputElement | null>(null);
    
    useEffect(() => {
      const profile = getUserProfile();
      if (!profile || profile.role !== "ADMIN") {
        router.push("/");
      } else {
        setUser(profile);
        fetchAchievements();
      }
    }, [router, typeFilter, sortBy]);

    const fetchAchievements = async () => {
  try {
    const response = await axios.get("/api/achievements/list");

    let data = [...response.data.data];

    // FILTER
    if (typeFilter !== "all") {
      data = data.filter(
        (item) => item.type.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    // SEARCH
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();

      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.criteriaCode.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    // SORT
    switch (sortBy) {
      case "name":
        data.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case "type":
        data.sort((a, b) => a.type.localeCompare(b.type));
        break;

      case "created":
      default:
        data.reverse();
        break;
    }

      setAchievements(data);
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        fetchAchievements();
        return;
      }
      try {
        const response = await axios.get(`/api/achievements/search?q=${encodeURIComponent(searchQuery)}`);
        setAchievements(response.data.data);
      } catch (error) {
        console.error("Failed to search achievements:", error);
      }
    };

    const handleCreate = async () => {
    try {
          const payload = {
      ...formData,
      seasonMonth:
        formData.type === "SEASONAL" && formData.seasonMonth
          ? formData.seasonMonth
          : null,
      expiresAt:
        formData.type === "SEASONAL" && formData.seasonMonth
          ? (() => {
              const [year, month] = formData.seasonMonth
                .split("-")
                .map(Number);

              const lastDay = new Date(year, month, 0);
              lastDay.setHours(23, 59, 59, 999);
              return lastDay.toISOString();
            })()
          : null,
          };
      const response = await axios.post("/api/achievements/create", payload);
      if (response.data?.success) {
        toast.success(t("achievements.create_success"));
      } else {
        const message = response.data?.message || t("achievements.create_failed");
        toast.error(t(message) || message);
        return;
      }
      setShowCreateModal(false);
      resetForm();
      fetchAchievements();
    } catch (error: any) {
      console.error("Failed to create achievement:", error);
      const message = error.response?.data?.message || t("achievements.create_failed");
      toast.error(t(message) || message);
    }
  };

    const handleEdit = async () => {
    if (!editingAchievement) return;

    try {
      const payload = {
      ...formData,
      seasonMonth:
        formData.type === "SEASONAL" && formData.seasonMonth
          ? formData.seasonMonth
          : null,

      expiresAt:
        formData.type === "SEASONAL" && formData.seasonMonth
          ? (() => {
              const [year, month] = formData.seasonMonth
                .split("-")
                .map(Number);
              const lastDay = new Date(year, month, 0);
              lastDay.setHours(23, 59, 59, 999);
              return lastDay.toISOString();
            })()
          : null,
    };

      const response = await axios.put(
        `/api/achievements/update/${editingAchievement.id}`,
        payload
      );

      if (response.data?.success) {
        toast.success(t("achievements.update_success"));
      } else {
        const message = response.data?.message || t("achievements.update_failed");
        toast.error(t(message) || message);
        return;
      }

      setEditingAchievement(null);
      resetForm();
      fetchAchievements();
    } catch (error: any) {
      console.error("Failed to update achievement:", error);
      const message = error.response?.data?.message || t("achievements.update_failed");
      toast.error(t(message) || message);
    }
  };

    const handleDelete = async (id: string) => {
      try {
        const response = await axios.delete(`/api/achievements/delete/${id}`);
        if (response.data?.success) {
          toast.success(t("achievements.delete_success"));
        } else {
          const message =
            response.data?.message || t("achievements.delete_failed");

          toast.error(t(message) || message);
          return;
        }
        fetchAchievements();
        setDeleteAchievement(null);
      } catch (error: any) {
        console.error("Failed to delete achievement:", error);
        const message =
          error.response?.data?.message || t("achievements.delete_failed");
        toast.error(t(message) || message);
      }
    };
    const handleViewUsers = async (achievement: Achievement) => {
    try {
      setSelectedAchievement(achievement);
      setShowUsersModal(true);
      setLoadingUsers(true);

      const response = await axios.get(
        `/api/achievements/${achievement.id}/users`
      );

      if (response.data?.success) {
        setAchievementUsers(response.data.data || []);
      } else {
        toast.error(
          t(response.data?.message || "achievements.users_loaded_failed")
        );
      }
    } catch (error: any) {
      console.error("Failed to fetch achievement users:", error);

      const message =
        error.response?.data?.message ||
        "achievements.users_loaded_failed";

      toast.error(t(message));
    } finally {
      setLoadingUsers(false);
    }
  };
    const resetForm = () => {
      setFormData({
        name: "",
        description: "",
        criteriaCode: "",
        badgeImageUrl: "",
        type: "PERMANENT",
        seasonMonth: "",
        expiresAt: "",
      });
    };

    const openEditModal = (achievement: Achievement) => {
      setEditingAchievement(achievement);
      setFormData({
        name: achievement.name,
        description: achievement.description || "",
        criteriaCode: achievement.criteriaCode,
        badgeImageUrl: achievement.badgeImageUrl,
        type: achievement.type,
        seasonMonth: achievement.seasonMonth
        ? achievement.seasonMonth.slice(0, 7) : "",
        expiresAt: formatDateTimeLocal(achievement.expiresAt),
      });
    };
    const getEndOfMonthDateTime = (yearMonth: string) => {
    if (!yearMonth) return "";
    const [year, month] = yearMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 0, 0);
    const offset = lastDay.getTimezoneOffset();
    const localDate = new Date(
      lastDay.getTime() - offset * 60000
    );

    return localDate.toISOString().slice(0, 16);
  };
    const formatSeasonMonth = (val?: string) => {
      if (!val) return "";
      // Accept YYYY-MM or YYYY-MM-DD / ISO string and format to 'Month YYYY'
      const monthOnlyMatch = /^\d{4}-\d{2}$/.test(val);
      const dateMatch = /^\d{4}-\d{2}-\d{2}/.test(val);
      if (monthOnlyMatch || dateMatch) {
        const [year, month] = val.split("-");
        const d = new Date(Number(year), Number(month) - 1, 1);
        if (!Number.isNaN(d.getTime())) {
          try {
            return d.toLocaleString(undefined, { month: "long", year: "numeric" });
          } catch {
            return val;
          }
        }
      }
      return val;
    };
    const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";

    try {
      const date = new Date(value);

      const offset = date.getTimezoneOffset();

      const localDate = new Date(
        date.getTime() - offset * 60000
      );

      return localDate.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };
    if (!user) return null;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto px-8 py-8">
            <div className="mb-8">
              <div className="mb-6 max-w-3xl">
                  <h2 className="text-4xl font-bold text-white sm:text-2xl">{t("achievements.management_title")}</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{t("achievements.management_subtitle")}</p>
                  <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                    <Search className="h-4 w-4 text-slate-500" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onKeyUp={handleSearch}
                    placeholder={t("achievements.search_placeholder")}
                    className="w-full rounded-[12px] border border-slate-800 bg-slate-950 px-11 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400"
                  />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(251,146,60,0.3)] transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  {t("achievements.create_achievement")}
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:w-[640px]">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="all">{t("achievements.all_types")}</option>
                  <option value="permanent">{t("achievements.permanent")}</option>
                  <option value="seasonal">{t("achievements.seasonal")}</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="created">{t("achievements.sort_by_created")}</option>
                  <option value="name">{t("achievements.sort_by_name")}</option>
                  <option value="most-earned">{t("achievements.sort_by_most_earned")}</option>
                  <option value="type">{t("achievements.sort_by_type")}</option>
                </select>
                <button
                  onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setSortBy("created");
                  fetchAchievements();
                }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-800 bg-slate-950 text-slate-100 transition hover:border-slate-600 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[12px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">{t("achievements.loading_achievements")}</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {achievements.length > 0 ? (
                  achievements.map((achievement) => (
                    <div key={achievement.id} className="group overflow-hidden rounded-[12px] border border-slate-700 bg-slate-950 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.5)] transition hover:-translate-y-1">
                      <div className="flex items-start gap-4">
                        <div className="relative h-20 w-20 overflow-hidden rounded-[12px] border border-slate-700 bg-slate-950">
                          <img
                            src={achievement.badgeImageUrl}
                            alt={achievement.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{achievement.name}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                            className={`rounded-[12px] border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md transition
                            ${
                              achievement.type === "PERMANENT"
                                ? "border-sky-500/70 text-sky-300 bg-sky-500/10"
                                : "border-amber-500/70 text-amber-300 bg-amber-500/10"
                            }`}
                          >
                            {achievement.type}
                          </span>
                           <span
                          className={`rounded-[12px] border px-3 py-1 text-[11px] uppercase tracking-[0.18em] backdrop-blur-md transition
                          ${
                            achievement.type === "PERMANENT"
                              ? "border-sky-500/60 bg-sky-500/5 text-sky-200"
                              : "border-amber-500/60 bg-amber-500/5 text-amber-200"
                          }`}
                        >
                          {achievement.type === "PERMANENT"
                            ? t("achievements.mastery")
                            : t("achievements.seasonal")}
                        </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {achievement.description
                              ? achievement.description.replace(/<[^>]*>/g, "")
                              : t("achievements.no_description")}
                          </p>
                          {achievement.type === 'SEASONAL' && achievement.seasonMonth && (
                            <p className="mt-3 text-sm text-amber-300">
                              {t('achievements.season_label')} {formatSeasonMonth(achievement.seasonMonth)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300 shadow-inner shadow-slate-950/20">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t('achievements.criteria_label')}</div>
                            <div className="mt-1 text-sm text-slate-100">#{achievement.criteriaCode}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t('achievements.players_earned_label')}</div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-100">
                              <Users className="h-4 w-4 text-cyan-400" />
                              <span>{achievement.earnedCount ?? 0} {t('achievements.players_earned_label')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-cyan-600 bg-cyan-600/10 px-15 py-2.5 text-sm font-semibold text-cyan-400 shadow-[0_8px_20px_rgba(14,116,144,0.14)] transition hover:border-cyan-500 hover:bg-cyan-600/20"
                          onClick={() => setViewAchievement(achievement)}
                        >
                          <Eye className="h-4 w-4 text-cyan-100" />
                          <span className="text-cyan-100">{t('achievements.view_button')}</span>
                        </button>
                        <button
                          onClick={() => handleViewUsers(achievement)}
                          className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-violet-700 bg-violet-700/10 px-15 py-2.5 text-sm font-semibold text-violet-400 shadow-[0_8px_20px_rgba(88,67,255,0.18)] transition hover:border-violet-600 hover:bg-violet-700/20"
                        >
                          <Users className="h-4 w-4 text-violet-100" />
                          <span className="text-violet-100">{t('achievements.users_button')}</span>
                        </button>
                        <button
                          onClick={() => openEditModal(achievement)}
                          className="inline-flex items-center justify-center rounded-[12px] border border-slate-600 bg-slate-950/10 px-3.5 py-2 text-slate-100 transition hover:border-slate-400 hover:bg-slate-950/20"
                        >
                          <Pencil className="h-4 w-4 text-slate-100" />
                        </button>
                        <button
                          onClick={() => setDeleteAchievement(achievement)}
                          className="inline-flex items-center justify-center rounded-[12px] border border-rose-700 bg-rose-700/10 px-3.5 py-2 text-rose-100 transition hover:border-rose-500 hover:bg-rose-700/20"
                        >
                          <Trash2 className="h-4 w-4 text-rose-100" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[12px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">{t('achievements.no_achievements')}</div>
                )}
              </div>
            )}
          </main>
        </div>
        {/* Create/Edit Modal */}
        {(showCreateModal || editingAchievement) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[12px] border border-slate-800 bg-slate-950 shadow-[0_40px_120px_rgba(15,23,42,0.65)] custom-scroll">
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-[12px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
              <div className="pt-10 px-8 pb-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{editingAchievement ? t('achievements.edit_achievement') : t('achievements.create_achievement')}</h2>
                    <p className="mt-2 text-sm text-slate-400">{t('achievements.create_edit_subtitle')}</p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    editingAchievement ? handleEdit() : handleCreate();
                  }}
                  className="space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.name_label')}</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-[12px] border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.criteria_code_label')}</label>
                      <input
                        type="text"
                        value={formData.criteriaCode}
                        onChange={(e) => setFormData({ ...formData, criteriaCode: e.target.value })}
                        className="w-full rounded-[12px] border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.description_label')}</label>
                    <CKEditor
                      editor={ClassicEditor as any}
                      data={formData.description}
                      onChange={(event: any, editor: any) => {
                        const data = editor.getData();
                        setFormData({ ...formData, description: data });
                      }}
                      config={{
                        toolbar: [
                          'heading',
                          '|',
                          'bold',
                          'italic',
                          'underline',
                          'strikethrough',
                          'link',
                          'blockQuote',
                          'insertTable',
                          'bulletedList',
                          'numberedList',
                          '|',
                          'outdent',
                          'indent',
                          '|',
                          'undo',
                          'redo',
                          'removeFormat'
                        ]
                      }}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.badge_url_label')}</label>
                      <input
                        type="url"
                        value={formData.badgeImageUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            badgeImageUrl: e.target.value,
                          })
                        }
                        className="w-full rounded-[12px] border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
                        required
                      />
                      {formData.badgeImageUrl && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm text-slate-400">
                          {t("achievements.preview")}
                        </p>
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[12px] border border-amber-500/30 bg-slate-900">
                          <img
                            key={formData.badgeImageUrl}
                            src={formData.badgeImageUrl}
                            alt="Badge Preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/96x96?text=No+Image";
                            }}
                          />
                        </div>
                      </div>
                    )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.type_label')}</label>
                      <select
                        value={formData.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          setFormData({
                            ...formData,
                            type,
                            seasonMonth: type === 'SEASONAL' ? formData.seasonMonth : '',
                            expiresAt: type === 'SEASONAL' ? formData.expiresAt : '',
                          });
                        }}
                        className="w-full rounded-[12px] border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400"
                      >
                        <option value="PERMANENT">{t('achievements.permanent')}</option>
                        <option value="SEASONAL">{t('achievements.seasonal')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className={formData.type === 'SEASONAL' ? 'relative' : 'hidden'}>
                      <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.season_month_label')}</label>
                      <input
                        type="month"
                        value={formData.seasonMonth}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            seasonMonth: value,
                            expiresAt: getEndOfMonthDateTime(value),
                          });
                        }}
                        className="w-full rounded-[12px] border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400 [color-scheme:dark]"
                      />
                      {formData.seasonMonth && (
                        <div className="mt-2 text-sm text-slate-100">{t('achievements.selected_label')} {formatSeasonMonth(formData.seasonMonth)}</div>
                      )}
                    </div>
                    {formData.type === 'SEASONAL' && (
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium text-slate-300">{t('achievements.expires_at_label')}</label>
                        <input
                          disabled
                          ref={expiresRef}
                          type="datetime-local"
                          value={formData.expiresAt}
                          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                          className="w-full rounded-[12px] border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-sm text-slate-100 outline-none focus:border-sky-400"
                        />
                      </div>
                    )}
                  </div>
                 <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAchievement(null);
                      resetForm();
                    }}
                    className="flex-1 inline-flex items-center justify-center rounded-[12px] border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    {t("achievements.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center rounded-[12px] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(251,146,60,0.3)] transition hover:opacity-90"
                  >
                    {editingAchievement
                      ? t("achievements.update_achievement")
                      : t("achievements.create_achievement")}
                  </button>
                </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {viewAchievement && (        
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[12px] border border-slate-800 bg-slate-950 shadow-[0_40px_120px_rgba(15,23,42,0.65)]">
            <button
              onClick={() => setViewAchievement(null)}
              className="absolute right-4 top-4 p-2 text-slate-300 hover:border-slate-500 hover:text-white"
            >
              ✕
            </button>
            {/* top accent */}
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-[12px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <div className="pt-10 px-8 pb-8">       
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  Achievement Detail
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  View achievement information
                </p>
              </div>
              {/* IMAGE + NAME */}
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-[12px] border border-slate-700 bg-slate-900">
                  <img
                    src={viewAchievement.badgeImageUrl}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">
                    {viewAchievement.name}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-[12px] border px-3 py-1 text-[11px] uppercase tracking-[0.18em]
                      ${viewAchievement.type === "PERMANENT"
                        ? "border-sky-500/70 text-sky-300 bg-sky-500/10"
                        : "border-amber-500/70 text-amber-300 bg-amber-500/10"
                      }`}>
                      {viewAchievement.type}
                    </span>
                    <span className={`rounded-[12px] border px-3 py-1 text-[11px] uppercase tracking-[0.18em]
                      ${viewAchievement.type === "PERMANENT"
                        ? "border-sky-500/50 text-sky-200 bg-sky-500/5"
                        : "border-amber-500/50 text-amber-200 bg-amber-500/5"
                      }`}>
                      {viewAchievement.type === "PERMANENT" ? "MASTER" : "SEASONAL"}
                    </span>
                  </div>
                </div>
              </div>
              {/* DESCRIPTION */}
              <div className="mt-6 text-sm text-slate-300 leading-6">
                {viewAchievement.description
                  ? viewAchievement.description.replace(/<[^>]*>/g, "")
                  : "No description"}
              </div>
              {/* CRITERIA + EARNED */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-[12px] border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-[11px] uppercase text-slate-500">
                    Criteria Code
                  </div>
                  <div className="mt-1 text-slate-100">
                    #{viewAchievement.criteriaCode}
                  </div>
                </div>
                <div className="rounded-[12px] border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-[11px] uppercase text-slate-500">
                    Total Earned
                  </div>
                  <div className="mt-1 text-slate-100">
                    {viewAchievement.earnedCount ?? 0}
                  </div>
                </div>
              </div>
              {/* SEASON (SPECIAL BOX) */}
              {viewAchievement.type === "SEASONAL" && viewAchievement.seasonMonth && (
                <div className="mt-6 rounded-[14px] border border-amber-500/40 bg-amber-500/5 p-4 backdrop-blur-md">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300">
                    Season
                  </div>
                  <div className="mt-1 text-amber-100 font-medium">
                    {formatSeasonMonth(viewAchievement.seasonMonth)}
                  </div>
                </div>
              )}
              <div className="mt-8 flex gap-3">
              {/* VIEW USERS */}
              <button
                onClick={() => handleViewUsers(viewAchievement)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-violet-700 bg-violet-700/10 px-6 py-2.5 text-sm font-semibold text-violet-300 transition hover:border-violet-500 hover:bg-violet-700/20"
              >
                <Users className="h-4 w-4 text-violet-200" />
                View Users
              </button>
              {/* EDIT */}
              <button
                onClick={() => {
                  setViewAchievement(null);
                  openEditModal(viewAchievement);
                  setShowCreateModal(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[12px] border border-slate-600 bg-slate-900/40 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DELETE MODAL */}
      {deleteAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[26px] border border-rose-500/30 bg-[#050816] shadow-[0_35px_120px_rgba(0,0,0,0.78)]">
            {/* TOP BORDER */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300" />
            <div className="px-8 py-7">
              {/* CONTENT */}
              <div className="flex items-start gap-5">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] border border-rose-500/20 bg-rose-500/10">
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-[20px] font-bold tracking-[-0.02em] text-white">
                    Delete Achievement
                  </h2>
                  <p className="mt-5 text-[16px] leading-7 text-slate-300">
                    Are you sure you want to delete this achievement?
                  </p>
                  <p className="mt-2 max-w-lg text-[15px] leading-7 text-slate-500">
                    This may remove achievement records from players.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteAchievement(null)}
                  className=" h-[56px] rounded-[16px] border border-slate-800 bg-transparent text-[17px] font-semibold text-slate-300 transition-all duration-200 hover:border-slate-600 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteAchievement.id)}
                  className="h-[56px] rounded-[16px] border border-rose-500/70 bg-rose-600/20 text-[17px] font-semibold text-rose-300 shadow-[0_14px_30px_rgba(190,24,93,0.18)] backdrop-blur-md transition-all duration-200 hover:border-rose-400 hover:bg-rose-500/25 hover:text-rose-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* USERS MODAL */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px] border border-slate-800 bg-slate-950 shadow-[0_40px_120px_rgba(15,23,42,0.65)] custom-scroll">
            
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

            <button
              onClick={() => {
                setShowUsersModal(false);
                setAchievementUsers([]);
                setSelectedAchievement(null);
              }}
              className="absolute right-4 top-4 text-slate-400 transition hover:text-white"
            >
              ✕
            </button>

            <div className="px-8 py-8">
              <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {t("achievements.users_with")}{" "}
                <span className="text-amber-300">
                  "{selectedAchievement?.name}"
                </span>
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {achievementUsers.length}{" "}
                {achievementUsers.length === 1
                  ? t("achievements.player_earned_single")
                  : t("achievements.players_earned_plural")}
              </p>
            </div>

              {loadingUsers ? (
                <div className="rounded-[16px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                  {t("achievements.loading_users")}
                </div>
              ) : achievementUsers.length > 0 ? (
                <div className="space-y-3">
                  {achievementUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 rounded-[16px] border border-slate-800 bg-slate-900/30 p-4 transition hover:border-slate-700"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                        <img
                          src={
                            user.avatarUrl ||
                            "https://placehold.co/100x100?text=User"
                          }
                          alt={user.displayName}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {user.displayName}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Profile ID: {user.id}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Earned Date
                        </div>

                        <div className="mt-1 text-xs text-slate-300">
                          {user.earnedAt
                            ? new Date(user.earnedAt).toLocaleString()
                            : "Unknown"}
                        </div>
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                  {t("achievements.no_users_found")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }
