"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18/i18n-context";

interface Category {
  id: string;
  name: string;
  threadCount?: number;
}

interface Props {
  categories: Category[];
  selectedCategory?: string | null;
  onSelectCategory?: (id: string) => void;
  user: any;
  onOpenCreate: () => void;
}

export default function ForumSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  user,
  onOpenCreate,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">

      {/* Join discussion */}
      {!user && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-6 shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{t("forums.join_discussion")}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t("forums.sign_in")}</p>
          <Link
            href="/auth/login">
            <button
              className="w-full rounded-2xl py-4 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold hover:opacity-90 shadow-md cursor-pointer">
              {t("forums.login")}
            </button>
          </Link>
        </div>
      )}

      {user && (
        <button onClick={onOpenCreate} className="w-full rounded-2xl py-6 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
          {t("forums.create_button") || "New Thread"}
        </button>
      )}

      {/* Categories */}
      {selectedCategory && onSelectCategory && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-6 shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
            {t("forums.quick_category")}
          </h2>

          <div className="space-y-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`
                w-full flex justify-between px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer
                ${selectedCategory === cat.id
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                <span>
                  {cat.name}
                </span>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {cat.threadCount ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-6 shadow-md">
        <h2 className="text-2xl font-bold mb-5 text-slate-900 dark:text-white">
          {t("forums.rules.community")}
        </h2>

        <ul className="space-y-4 text-slate-600 dark:text-slate-400">
          <li>
            {t("forums.rules.r1")}
          </li>
          <li>
            {t("forums.rules.r2")}
          </li>
          <li>
            {t("forums.rules.r3")}
          </li>
          <li>
            {t("forums.rules.r4")}
          </li>
          <li>
            {t("forums.rules.r5")}
          </li>
        </ul>
      </div>
    </div>
  );
}