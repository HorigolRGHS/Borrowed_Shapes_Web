"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile } from "@/lib/api/api-client";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  Folder,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  HelpCircle,
  Upload,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const CategoryDescriptionEditor = dynamic(
  () =>
    import("@/components/categories/category-description-editor").then(
      (m) => m.CategoryDescriptionEditor
    ),
  { ssr: false }
);

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  isOfficial: boolean;
  threadCount: number;
}

const slugify = (text: string) => {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

export default function DashboardCategoriesPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: "",
    nameVi: "",
    slug: "",
    slugVi: "",
    description: "",
    descriptionVi: "",
    iconUrl: "",
    isOfficial: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cacheBust, setCacheBust] = useState(Date.now());
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const [slugsManuallyEdited, setSlugsManuallyEdited] = useState({
    slug: false,
    slugVi: false,
  });

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, order]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/category", {
        params: { order },
      });
      if (response.data?.success) {
        setCategories(response.data.data || []);
        setCacheBust(Date.now());
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error(t("forums.dashboard.toast_cat_failed") || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (val: string, lang: "en" | "vi") => {
    if (lang === "en") {
      setForm((prev) => {
        const nextSlug = slugsManuallyEdited.slug ? prev.slug : slugify(val);
        return { ...prev, name: val, slug: nextSlug };
      });
    } else {
      setForm((prev) => {
        const nextSlugVi = slugsManuallyEdited.slugVi ? prev.slugVi : slugify(val);
        return { ...prev, nameVi: val, slugVi: nextSlugVi };
      });
    }
  };

  const handleSlugChange = (val: string, lang: "en" | "vi") => {
    if (lang === "en") {
      setSlugsManuallyEdited((prev) => ({ ...prev, slug: true }));
      setForm((prev) => ({ ...prev, slug: val }));
    } else {
      setSlugsManuallyEdited((prev) => ({ ...prev, slugVi: true }));
      setForm((prev) => ({ ...prev, slugVi: val }));
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      nameVi: "",
      slug: "",
      slugVi: "",
      description: "",
      descriptionVi: "",
      iconUrl: "",
      isOfficial: false,
    });
    setSlugsManuallyEdited({ slug: false, slugVi: false });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("forums.image_too_large") || "Image size must be less than 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("forums.invalid_image_type") || "Only JPEG, PNG, and WebP are allowed");
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setForm((prev) => ({
      ...prev,
      iconUrl: "",
    }));
  };

  const handleCreate = async () => {
    setIsUploadingImage(true);
    try {
      const createResponse = await axios.post("/api/category/create", {
        name: form.name,
        nameVi: form.nameVi,
        slug: form.slug || undefined,
        slugVi: form.slugVi || undefined,
        description: form.description || undefined,
        descriptionVi: form.descriptionVi || undefined,
        iconUrl: null,
        isOfficial: form.isOfficial,
      });

      if (createResponse.data?.success) {
        const createdCat = createResponse.data.data;
        const categoryId = createdCat.id;
        let finalIconUrl = null;

        if (selectedFile) {
          const uploadResp = await axios.post("/api/category/upload", {
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type,
            categoryId: categoryId,
          });

          const uploadData = uploadResp.data?.data;
          if (uploadData) {
            const putRes = await fetch(uploadData.uploadUrl, {
              method: uploadData.method,
              headers: uploadData.headers,
              body: selectedFile,
            });

            if (!putRes.ok) {
              throw new Error("Category icon upload failed");
            }
            finalIconUrl = uploadData.publicUrl;

            await axios.patch(`/api/category/update/${categoryId}`, {
              iconUrl: finalIconUrl,
            });
          }
        }

        toast.success(t("forums.dashboard.toast_cat_created") || "Category created successfully");
        setCreateOpen(false);
        fetchCategories();
      } else {
        const errMsg = createResponse.data?.message;
        toast.error(errMsg ? t(errMsg) : t("forums.dashboard.toast_cat_failed"));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message;
      const displayMsg = msg ? (Array.isArray(msg) ? msg.map((m: string) => t(m)).join(", ") : t(msg)) : (error.message || t("forums.dashboard.toast_cat_failed"));
      toast.error(displayMsg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleOpenEdit = async (cat: Category) => {
    try {
      const res = await axios.get(`/api/category/id/${cat.id}`);
      const data = res.data?.data;

      if (data) {
        setForm({
          name: data.nameEn || "",
          nameVi: data.nameVi || "",
          slug: data.slugEn || "",
          slugVi: data.slugVi || "",
          description: data.descriptionEn || "",
          descriptionVi: data.descriptionVi || "",
          iconUrl: data.iconUrl || "",
          isOfficial: data.isOfficial || false,
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        setSlugsManuallyEdited({ slug: true, slugVi: true });
        setEditingCategory(cat);
        setEditOpen(true);
      } else {
        toast.error("Failed to load category details");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load category details");
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;
    setIsUploadingImage(true);
    try {
      let finalIconUrl = form.iconUrl;

      if (selectedFile) {
        const uploadResp = await axios.post("/api/category/upload", {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          categoryId: editingCategory.id,
        });

        const uploadData = uploadResp.data?.data;
        if (uploadData) {
          const putRes = await fetch(uploadData.uploadUrl, {
            method: uploadData.method,
            headers: uploadData.headers,
            body: selectedFile,
          });

          if (!putRes.ok) {
            throw new Error("Category icon upload failed");
          }
          finalIconUrl = uploadData.publicUrl;
        }
      }

      const response = await axios.patch(`/api/category/update/${editingCategory.id}`, {
        name: form.name,
        nameVi: form.nameVi,
        slug: form.slug || undefined,
        slugVi: form.slugVi || undefined,
        description: form.description || undefined,
        descriptionVi: form.descriptionVi || undefined,
        iconUrl: finalIconUrl || null,
        isOfficial: form.isOfficial,
      });

      if (response.data?.success) {
        toast.success(t("forums.dashboard.toast_cat_updated") || "Category updated successfully");
        setEditOpen(false);
        setEditingCategory(null);
        fetchCategories();
      } else {
        const errMsg = response.data?.message;
        toast.error(errMsg ? t(errMsg) : t("forums.dashboard.toast_cat_failed"));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message;
      const displayMsg = msg ? (Array.isArray(msg) ? msg.map((m: string) => t(m)).join(", ") : t(msg)) : (error.message || t("forums.dashboard.toast_cat_failed"));
      toast.error(displayMsg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleOpenDelete = (cat: Category) => {
    setDeletingCategory(cat);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      const response = await axios.delete(`/api/category/delete/${deletingCategory.id}`);
      if (response.data?.success) {
        toast.success(t("forums.dashboard.toast_cat_deleted") || "Category deleted successfully");
        setDeleteOpen(false);
        setDeletingCategory(null);
        fetchCategories();
      } else {
        const errMsg = response.data?.message;
        toast.error(errMsg ? t(errMsg) : t("forums.dashboard.toast_cat_failed"));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message;
      const displayMsg = msg ? (Array.isArray(msg) ? msg.map((m: string) => t(m)).join(", ") : t(msg)) : (error.message || t("forums.dashboard.toast_cat_failed"));
      toast.error(displayMsg);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!user) return null;

  return (
    <div className="w-full text-foreground flex flex-col">
      <main className="flex-1 px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight">
              {t("forums.dashboard.category_management") || "Category Management"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {t("forums.dashboard.category_subtitle") ||
                "Create, edit, expand descriptions, and delete categories"}
            </p>
            <div className="mt-2 h-0.5 w-12 rounded-[12px] bg-amber-500" />
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all shrink-0 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] self-start sm:self-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("forums.dashboard.create_category") || "Create Category"}
          </Button>
        </div>

        {/* Filter / Sort bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 border border-border rounded-2xl mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
            <Folder className="h-4 w-4" />
            <span>{categories.length} {t("forums.dashboard.categories") || "Categories"}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sorting Select */}
            <Select
              value={order}
              onValueChange={(val: any) => setOrder(val)}
            >
              <SelectTrigger className="w-[180px] bg-background border-border text-foreground">
                <SelectValue placeholder={t("forums.filter.sort") || "Sort By"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                    {t("forums.dashboard.sort_alpha_asc") || "Name (A - Z)"}
                  </span>
                </SelectItem>
                <SelectItem value="desc">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                    {t("forums.dashboard.sort_alpha_desc") || "Name (Z - A)"}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category Table */}
        {loading ? (
          <div className="rounded-[12px] border border-border bg-card p-12 text-center text-muted-foreground">
            {t("common.loading") || "Loading..."}
          </div>
        ) : (
          <div className="rounded-[12px] border border-border bg-card overflow-hidden shadow-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/20">
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {t("forums.dashboard.col_cat_name") || "Category Name"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {t("forums.dashboard.col_slug") || "Slug"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold w-[40%]">
                    {t("forums.dashboard.col_description") || "Description"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold text-center">
                    {t("forums.dashboard.col_official") || "Official"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold text-center">
                    {t("forums.dashboard.col_thread_count") || "Threads count"}
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold text-right">
                    {t("forums.dashboard.col_actions") || "Actions"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length > 0 ? (
                  categories.map((cat) => {
                    const isExpanded = !!expandedIds[cat.id];
                    return (
                      <TableRow
                        key={cat.id}
                        className="border-border hover:bg-muted/20 transition-colors"
                      >
                        {/* Name & Icon */}
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-3">
                            {cat.iconUrl ? (
                              <img
                                src={`${cat.iconUrl}?t=${cacheBust}`}
                                alt={cat.name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImageUrl(cat.iconUrl);
                                  setIsImageOpen(true);
                                }}
                                className="w-8 h-8 rounded object-contain bg-background/50 p-1 border border-border cursor-zoom-in hover:opacity-80 transition-opacity"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "";
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground border border-border">
                                <Folder className="h-4 w-4" />
                              </div>
                            )}
                            <span className="font-bold tracking-wide">{cat.name}</span>
                          </div>
                        </TableCell>

                        {/* Slug */}
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {cat.slug}
                        </TableCell>

                        {/* Description (collapsible/expandable on click) */}
                        <TableCell
                          onClick={() => toggleExpand(cat.id)}
                          className="cursor-pointer text-foreground/80 hover:text-foreground transition-colors select-none text-sm"
                        >
                          {cat.description ? (
                            <div className="space-y-1">
                              <div
                                className={isExpanded ? "" : "line-clamp-2"}
                                dangerouslySetInnerHTML={{ __html: cat.description }}
                              />
                              <span className="text-[11px] text-amber-500 font-semibold uppercase tracking-wider block">
                                {isExpanded
                                  ? (locale === "vi" ? "Thu gọn ▲" : "Collapse ▲")
                                  : (locale === "vi" ? "Xem thêm ▼" : "Read more ▼")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">N/A</span>
                          )}
                        </TableCell>

                        {/* Official Badge */}
                        <TableCell className="text-center">
                          {cat.isOfficial ? (
                            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Official
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-border text-muted-foreground bg-muted/40">
                              Community
                            </Badge>
                          )}
                        </TableCell>

                        {/* Threads Count */}
                        <TableCell className="text-center font-bold text-foreground/95">
                          {cat.threadCount}
                        </TableCell>

                        {/* Action buttons */}
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button
                              onClick={() => handleOpenEdit(cat)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                              title={t("forums.dashboard.action_edit") || "Edit"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleOpenDelete(cat)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                              title={t("forums.dashboard.action_delete") || "Delete"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      {t("forums.dashboard.no_threads_found") || "No categories found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 to-orange-400" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Plus className="h-5 w-5 text-amber-500" />
              {t("forums.dashboard.create_category") || "Create Category"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {locale === "vi"
                ? "Tạo một danh mục diễn đàn mới hỗ trợ hiển thị đa ngôn ngữ"
                : "Create a new forum category supporting bilingual layout"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Names (EN / VI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_name_en") || "Category Name (EN)"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value, "en")}
                  placeholder="e.g. Gameplay Guides"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_name_vi") || "Category Name (VI)"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.nameVi}
                  onChange={(e) => handleNameChange(e.target.value, "vi")}
                  placeholder="e.g. Hướng dẫn chơi game"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Slugs (EN / VI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_slug_en") || "Slug (EN)"}
                </Label>
                <Input
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value, "en")}
                  placeholder="gameplay-guides"
                  className="bg-background border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_slug_vi") || "Slug (VI)"}
                </Label>
                <Input
                  value={form.slugVi}
                  onChange={(e) => handleSlugChange(e.target.value, "vi")}
                  placeholder="huong-dan-choi-game"
                  className="bg-background border-border text-foreground font-mono text-xs"
                />
              </div>
            </div>

            {/* Icon Upload */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.label_icon_url") || "Icon (optional)"}
              </Label>
              <div className="mt-2 space-y-3">
                {/* Preview */}
                {(previewUrl || form.iconUrl) && (
                  <div
                    onClick={() => {
                      setZoomedImageUrl(previewUrl || form.iconUrl || null);
                      setIsImageOpen(true);
                    }}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center cursor-zoom-in hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={previewUrl || form.iconUrl || undefined}
                      alt="Icon Preview"
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  </div>
                )}

                {/* Upload Action Area */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="border-border hover:bg-muted text-foreground cursor-pointer flex items-center"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("forums.modal.uploading") || "Uploading..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t("forums.modal.choose_image") || "Choose Image"}
                      </>
                    )}
                  </Button>

                  {(form.iconUrl || selectedFile) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                      className="border-red-200 dark:border-red-900/30 hover:bg-red-500/10 text-red-500 cursor-pointer flex items-center"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("forums.modal.remove") || "Remove"}
                    </Button>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {t("forums.modal.image_requirements") || "PNG, JPG, WebP up to 5MB"}
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* English Description */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.label_desc_en") || "Description (EN)"}
              </Label>
              <div className="rounded-lg overflow-hidden border border-border bg-background">
                <CategoryDescriptionEditor
                  data={form.description}
                  onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
                />
              </div>
            </div>

            {/* Vietnamese Description */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.label_desc_vi") || "Description (VI)"}
              </Label>
              <div className="rounded-lg overflow-hidden border border-border bg-background">
                <CategoryDescriptionEditor
                  data={form.descriptionVi}
                  onChange={(html) => setForm((prev) => ({ ...prev, descriptionVi: html }))}
                />
              </div>
            </div>

            {/* Pinned / Official toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="create-official" className="text-foreground font-semibold text-sm cursor-pointer">
                  {t("forums.dashboard.label_is_official") || "Is Official"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {locale === "vi"
                    ? "Chỉ hiển thị bài viết được ghim và chính thức từ ban quản trị"
                    : "Official categories created by administrators"}
                </p>
              </div>
              <Switch
                id="create-official"
                checked={form.isOfficial}
                onCheckedChange={(val) => setForm((prev) => ({ ...prev, isOfficial: val }))}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 mt-2">
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("forums.dashboard.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.nameVi.trim() || isUploadingImage}
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer flex items-center"
            >
              {isUploadingImage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("forums.dashboard.create_category") || "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r from-amber-500 to-orange-400" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Edit className="h-5 w-5 text-amber-500" />
              {t("forums.dashboard.edit_category") || "Edit Category"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {locale === "vi"
                ? "Chỉnh sửa thông tin danh mục diễn đàn"
                : "Modify forum category information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Names (EN / VI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_name_en") || "Category Name (EN)"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value, "en")}
                  placeholder="e.g. Gameplay Guides"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_name_vi") || "Category Name (VI)"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.nameVi}
                  onChange={(e) => handleNameChange(e.target.value, "vi")}
                  placeholder="e.g. Hướng dẫn chơi game"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Slugs (EN / VI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_slug_en") || "Slug (EN)"}
                </Label>
                <Input
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value, "en")}
                  placeholder="gameplay-guides"
                  className="bg-background border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                  {t("forums.dashboard.label_slug_vi") || "Slug (VI)"}
                </Label>
                <Input
                  value={form.slugVi}
                  onChange={(e) => handleSlugChange(e.target.value, "vi")}
                  placeholder="huong-dan-choi-game"
                  className="bg-background border-border text-foreground font-mono text-xs"
                />
              </div>
            </div>

            {/* Icon Upload */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.label_icon_url") || "Icon (optional)"}
              </Label>
              <div className="mt-2 space-y-3">
                {/* Preview */}
                {(previewUrl || form.iconUrl) && (
                  <div
                    onClick={() => {
                      setZoomedImageUrl(previewUrl || form.iconUrl || null);
                      setIsImageOpen(true);
                    }}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center cursor-zoom-in hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={previewUrl || form.iconUrl || undefined}
                      alt="Icon Preview"
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  </div>
                )}

                {/* Upload Action Area */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="border-border hover:bg-muted text-foreground cursor-pointer flex items-center"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("forums.modal.uploading") || "Uploading..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t("forums.modal.choose_image") || "Choose Image"}
                      </>
                    )}
                  </Button>

                  {(form.iconUrl || selectedFile) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={isUploadingImage}
                      className="border-red-200 dark:border-red-900/30 hover:bg-red-500/10 text-red-500 cursor-pointer flex items-center"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("forums.modal.remove") || "Remove"}
                    </Button>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {t("forums.modal.image_requirements") || "PNG, JPG, WebP up to 5MB"}
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* English Description */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.label_desc_en") || "Description (EN)"}
              </Label>
              <div className="rounded-lg overflow-hidden border border-border bg-background">
                <CategoryDescriptionEditor
                  data={form.description}
                  onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
                />
              </div>
            </div>

            {/* Vietnamese Description */}
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-xs font-semibold uppercase tracking-wider">
                {t("forums.dashboard.label_desc_vi") || "Description (VI)"}
              </Label>
              <div className="rounded-lg overflow-hidden border border-border bg-background">
                <CategoryDescriptionEditor
                  data={form.descriptionVi}
                  onChange={(html) => setForm((prev) => ({ ...prev, descriptionVi: html }))}
                />
              </div>
            </div>

            {/* Official toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="edit-official" className="text-foreground font-semibold text-sm cursor-pointer">
                  {t("forums.dashboard.label_is_official") || "Is Official"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {locale === "vi"
                    ? "Danh mục chính thức từ ban quản trị"
                    : "Official categories created by administrators"}
                </p>
              </div>
              <Switch
                id="edit-official"
                checked={form.isOfficial}
                onCheckedChange={(val) => setForm((prev) => ({ ...prev, isOfficial: val }))}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 mt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEditOpen(false);
                setEditingCategory(null);
              }}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("forums.dashboard.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!form.name.trim() || !form.nameVi.trim() || isUploadingImage}
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer flex items-center"
            >
              {isUploadingImage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("forums.dashboard.save_changes") || "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500 font-bold">
              <AlertTriangle className="h-5 w-5" />
              {t("forums.dashboard.delete_category") || "Delete Category?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground leading-relaxed">
              {t("forums.dashboard.delete_category_desc") ||
                "Are you sure you want to delete this category? This will delete the category AND all threads belonging to it. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletingCategory && (
            <div className="bg-red-500/10 dark:bg-red-500/20 p-4 rounded-xl border border-red-500/20 text-xs space-y-1.5 my-2">
              <p className="text-red-600 dark:text-red-200 font-semibold mb-1">
                {locale === "vi"
                  ? `CẢNH BÁO: Hiện có ${deletingCategory.threadCount} chủ đề đang sử dụng danh mục này. Xóa danh mục sẽ xóa vĩnh viễn toàn bộ các chủ đề trên!`
                  : `WARNING: There are ${deletingCategory.threadCount} threads under this category. Deleting it will permanently remove all of these threads!`
                }
              </p>
              <p className="text-foreground/90 truncate">
                <span className="text-muted-foreground font-semibold">
                  {t("forums.dashboard.col_cat_name") || "Category Name"}:
                </span>{" "}
                {deletingCategory.name}
              </p>
              <p className="text-foreground/90">
                <span className="text-muted-foreground font-semibold">
                  {t("forums.dashboard.col_thread_count") || "Threads count"}:
                </span>{" "}
                {deletingCategory.threadCount}
              </p>
            </div>
          )}

          <AlertDialogFooter className="border-t border-border pt-4 mt-2">
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setDeletingCategory(null);
              }}
              className="border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              {t("forums.dashboard.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
            >
              {t("forums.dashboard.action_delete") || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Image Lightbox */}
      {mounted && isImageOpen && zoomedImageUrl && createPortal(
        <div
          onClick={() => {
            setIsImageOpen(false);
            setZoomedImageUrl(null);
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center cursor-zoom-out"
        >
          <img
            src={zoomedImageUrl}
            alt="Zoomed Icon"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-fade-in"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
