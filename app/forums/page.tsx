"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { useI18n } from "@/lib/i18/i18n-context";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

import { ForumList } from "@/components/forums/forum-list";
import ForumSidebar from "@/components/forums/forum-sidebar";
import ForumFilterBar from "@/components/forums/forum-filter-bar";
import ForumCategorySelector from "@/components/forums/forum-category-selector";
import ForumPagination from "@/components/forums/forum-pagination";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus } from "lucide-react";
import CreateThreadModal from "@/components/forums/create-thread-modal";
import { getUserProfile } from "@/lib/api/api-client";
import { toast } from "react-toastify";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// interface CreateForumForm {
//   title: string;
//   slug: string;
//   content: string;
//   categoryId: string;
//   imageUrl: string;
// }

interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isOfficial?: boolean;
}

export default function ForumsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      setPage(1);
    } else {
      setSelectedCategory(null);
    }
  }, [categoryParam]);

  const handleSelectCategory = (id: string | null) => {
    if (id) {
      router.push(`/forums?category=${id}`);
    } else {
      router.push("/forums");
    }
    setPage(1);
  };
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "score">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [month, setMonth] = useState<number>();
  const [year, setYear] = useState<number>();
  const [postType, setPostType] = useState<string>();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [user, setUser] = useState<any>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({
    searchQuery: "",
    sortBy: "createdAt" as "createdAt" | "updatedAt" | "score",
    order: "desc" as "asc" | "desc",
    month: undefined as number | undefined,
    year: undefined as number | undefined,
    postType: undefined as string | undefined,
  });

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [form, setForm] = useState<{
    title: string,
    slug: string,
    content: string,
    categoryId: string,
    postType: string,
    imageUrl: string | null,
  }>({
    title: "",
    slug: "",
    content: "",
    categoryId: "",
    postType: "GENERAL",
    imageUrl: null,
  });

  useEffect(() => {
    setUser(getUserProfile());
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchThreads();
    }
    // }, [selectedCategory, searchQuery, sortBy, order, month, year, page]);
  }, [selectedCategory, page]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/category");
      if (response.data?.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Fetch categories failed", error);
      setMessage(t("forums.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async () => {
    if (!selectedCategory) return;

    try {
      const params: any = {
        page,
        limit,
        categoryId: selectedCategory,
        sortBy,
        order,
      };
      if (searchQuery) params.q = searchQuery;
      if (year) params.year = year;
      if (month) params.month = month;
      if (postType) params.postType = postType;

      const response = await axios.get("/api/forums", { params });

      if (response.data?.success) {
        setThreads(response.data.data.items || []);
        setMeta(response.data.data.meta);
      }
    } catch (error) {
      console.error("Fetch threads failed", error);
      setMessage(t("forums.fetch_failed"));
    }
  };

  // const handleApplyFilters = () => {
  //   setPage(1);
  //   fetchThreads();
  // }

  const handleCreate = async (payload: typeof form, file: File | null) => {
    setMessage(null);

    try {
      // 1. Create the thread without image URL first
      const createPayload = {
        ...payload,
        imageUrl: null,
      };
      const response = await axios.post("/api/forums/create", createPayload);

      if (response.data?.success) {
        const createdThread = response.data.data;
        const threadId = createdThread.id;
        let finalImageUrl = null;

        // 2. If there is a file, upload it
        if (file) {
          // get upload url
          const uploadResp = await axios.post("/api/forums/upload", {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            threadId: threadId,
          });

          const uploadData = uploadResp.data?.data;
          if (uploadData) {
            // PUT file to R2
            const putRes = await fetch(uploadData.uploadUrl, {
              method: uploadData.method,
              headers: uploadData.headers,
              body: file,
            });

            if (!putRes.ok) {
              throw new Error("Thread image upload failed");
            }
            finalImageUrl = uploadData.publicUrl;

            // 3. Update the thread with the image URL
            await axios.patch(`/api/forums/update/${threadId}`, {
              imageUrl: finalImageUrl,
            });
          }
        }

        toast.success(t("forums.thread_created"));
        setMessage(t("forums.thread_created"));
        setShowCreate(false);
        const createdCategoryId = payload.categoryId;
        setForm({ title: "", slug: "", content: "", categoryId: "", postType: "GENERAL", imageUrl: null });
        if (!selectedCategory && createdCategoryId) {
          setSelectedCategory(createdCategoryId);
          setPage(1);
        } else {
          fetchThreads();
        }
      } else {
        const errMsg = response.data?.message || t("forums.create_failed");
        setMessage(errMsg);
        toast.error(errMsg);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || t("forums.create_failed");
      setMessage(errMsg);
      toast.error(errMsg);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </main>
    );
  }

  // Hiển thị danh sách categories nếu chưa chọn
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans transition-colors duration-300">
        <PublicHeader />
        <main className="max-w-7xl mx-auto py-20 px-5 flex-1 w-full">
          <div className="text-center mb-12">
            <p className="uppercase tracking-[0.5em] text-violet-500 dark:text-violet-400">
              {t("forums.community_hub") || "COMMUNITY HUB"}
            </p>
            <h1 className="text-7xl font-bold mt-5 text-foreground dark:text-white">
              {t("forums.title_community") || "Community"}
              <span className="text-violet-600 dark:text-violet-500">
                {" "}{t("forums.title_forum") || "Forum"}
              </span>
            </h1>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8">
              <ForumCategorySelector
                categories={categories}
                onSelect={(id) => {
                  handleSelectCategory(id);
                }}
              />
            </div>
            <div className="col-span-4">
              <ForumSidebar
                categories={categories}
                selectedCategory={null}
                user={user}
                onOpenCreate={() => setShowCreate(true)}
              />
            </div>
          </div>
        </main>
        <CreateThreadModal
          open={showCreate}
          categories={user?.role === "ADMIN" ? categories : categories.filter((c) => !c.isOfficial)}
          form={form}
          setForm={setForm}
          onClose={() => {
            setShowCreate(false)
          }}
          onSubmit={handleCreate}
        />
        <PublicFooter />
      </div>
    );
  }

  // Hiển thị threads của category đã chọn
  return (
    <div className="min-h-screen bg-background dark:bg-[#07070f] flex flex-col font-sans transition-colors duration-300">
      <PublicHeader />
      <main className="max-w-7xl mx-auto py-20 px-5 flex-1 w-full">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                {/* Breadcrumb Path */}
                <div className="flex items-center gap-2 px-15 text-sm text-slate-500 dark:text-slate-400">
                  <Link href="/forums" className="hover:text-violet-500 dark:hover:text-violet-400 transition-colors font-medium"
                    onClick={() => {
                      handleSelectCategory(null);
                      setThreads([]);
                    }}>
                    Forums
                  </Link>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[200px]">
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                </div>

              </div>
            </div>

            <ForumFilterBar
              search={searchQuery}
              setSearch={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              order={order}
              setOrder={setOrder}
              month={month}
              setMonth={setMonth}
              year={year}
              setYear={setYear}
              postType={postType}
              setPostType={setPostType}
              onApply={() => { setPage(1); fetchThreads(); }}
            />

            <div className="mt-8">
              <ForumList items={threads} />
            </div>

            <ForumPagination
              page={meta.page}
              totalPages={meta.pages}
              onChange={setPage}
            />

          </div>
          <div className="col-span-4">
            <ForumSidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(id) => {
                handleSelectCategory(id);
              }}
              user={user}
              onOpenCreate={() => setShowCreate(true)}
            />
          </div>
        </div>
      </main>
      <CreateThreadModal
        open={showCreate}
        categories={user?.role === "ADMIN" ? categories : categories.filter((c) => !c.isOfficial)}
        form={form}
        setForm={setForm}
        onClose={() => {
          setShowCreate(false)
        }}
        onSubmit={handleCreate}
      />
      <PublicFooter />
    </div>
  );
}