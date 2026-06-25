import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18/i18n-context";

const POST_TYPES = [
  "GENERAL",
  "BUG_REPORT",
  "GUIDE",
  "SUGGESTION",
  "FAN_ART",
  "LOOKING_FOR_PARTY",
] as const;

export default function ForumFilterBar({
  search, setSearch,
  sortBy, setSortBy,
  order, setOrder,
  month, setMonth,
  year, setYear,
  postType, setPostType,
  onApply,
}: any) {
  const { t } = useI18n();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="bg-white dark:bg-[#0b0b17] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-md">

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("forums.search_placeholder") || "Search threads..."}
          className="bg-slate-50 dark:bg-transparent border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
        />
        <Button onClick={onApply} className="shadow-sm cursor-pointer">{t("forums.search_button") || "Search"}</Button>
      </div>

      {/* Sort */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <span className="text-slate-500 dark:text-slate-400 mr-5 font-medium">
            {t("forums.filter.sort") || "SORT"}:
          </span>

          <Button className="mr-2 shadow-sm cursor-pointer"
            variant={sortBy === "createdAt" ? "default" : "outline"}
            onClick={() => setSortBy("createdAt")}
          >
            {t("forums.filter.created") || "Created date"}
          </Button>

          <Button className="mr-2 shadow-sm cursor-pointer"
            variant={sortBy === "updatedAt" ? "default" : "outline"}
            onClick={() => setSortBy("updatedAt")}
          >
            {t("forums.filter.updated") || "Updated date"}
          </Button>

          <Button className="shadow-sm cursor-pointer"
            variant={sortBy === "score" ? "default" : "outline"}
            onClick={() => setSortBy("score")}
          >
            {t("forums.filter.score") || "Score"}
          </Button>

          <span className="ml-5 text-slate-500 dark:text-slate-400 mr-5 font-medium">
            {t("forums.filter.order") || "ORDER"}:
          </span>

          <Button className="shadow-sm cursor-pointer"
            onClick={() =>
              setOrder(
                order === "asc"
                  ? "desc"
                  : "asc"
              )
            }
          >
            {
              order === "asc"
                ? (t("forums.filter.ascending") || "Ascending")
                : (t("forums.filter.descending") || "Descending")
            }
          </Button>
        </div>

        <div>
          <select className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg px-3 py-2 mr-5 focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-sm cursor-pointer" value={year || "all"} onChange={(e) => {
            const val = e.target.value;
            setYear(val === "all" ? undefined : Number(val));
            if (val === "all") setMonth(undefined);
          }}>
            <option value="all">{t("forums.filter.all_years") || "All Years"}</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg px-3 py-2 mr-5 focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-sm cursor-pointer" value={month || "all"} disabled={!year} onChange={(e) => {
            const val = e.target.value;
            setMonth(val === "all" ? undefined : Number(val));
          }}>
            <option value="all">{t("forums.filter.all_months") || "All Months"}</option>
            {months.map((m, i) => <option key={i + 1} value={i + 1}>{t(`forums.months.${m.toLowerCase()}`) || m}</option>)}
          </select>

          <select className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-sm cursor-pointer" value={postType || "all"} onChange={(e) => {
            const val = e.target.value;
            setPostType(val === "all" ? undefined : val);
          }}>
            <option value="all">{t("forums.filter.all_types") || "All Types"}</option>
            {POST_TYPES.map(type => (
              <option key={type} value={type}>
                {t(`forums.post_type.${type.toLowerCase()}`) || type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}