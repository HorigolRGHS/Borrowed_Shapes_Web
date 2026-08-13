import type { WikiCategory } from "@/models/dtos/wiki-metadata.dto";

export const ADMIN_WIKI_CATEGORIES = [
  "Character",
  "Item",
  "Map",
  "Mechanic",
  "Other",
] as const satisfies readonly WikiCategory[];

export type AdminWikiListStatus = "all" | "published" | "draft";

export interface AdminWikiListQueryState {
  page: number;
  q: string;
  status: AdminWikiListStatus;
  category: WikiCategory | "";
}

export type AdminWikiListQueryChange = Partial<AdminWikiListQueryState>;

export type AdminWikiListSearchParams = Pick<URLSearchParams, "get">;

const DEFAULT_STATE: AdminWikiListQueryState = {
  page: 1,
  q: "",
  status: "all",
  category: "",
};

function isStatus(value: string | null): value is AdminWikiListStatus {
  return value === "all" || value === "published" || value === "draft";
}

function isCategory(value: string | null): value is WikiCategory {
  return (
    value !== null &&
    (ADMIN_WIKI_CATEGORIES as readonly string[]).includes(value)
  );
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function parseAdminWikiListQuery(
  searchParams: AdminWikiListSearchParams,
): AdminWikiListQueryState {
  const q = searchParams.get("q")?.trim() ?? "";
  const statusValue = searchParams.get("status");
  const categoryValue = searchParams.get("category");

  return {
    page: parsePage(searchParams.get("page")),
    q,
    status: isStatus(statusValue) ? statusValue : DEFAULT_STATE.status,
    category: isCategory(categoryValue) ? categoryValue : DEFAULT_STATE.category,
  };
}

export function buildAdminWikiListHref(
  basePath: string,
  state: AdminWikiListQueryState,
  change: AdminWikiListQueryChange = {},
): string {
  const filterChanged = ["q", "status", "category"].some((key) =>
    Object.prototype.hasOwnProperty.call(change, key),
  );
  const nextState: AdminWikiListQueryState = {
    ...state,
    ...change,
    page: Object.prototype.hasOwnProperty.call(change, "page")
      ? Math.max(1, change.page ?? 1)
      : filterChanged
        ? 1
        : state.page,
    q: (change.q ?? state.q).trim(),
  };
  const searchParams = new URLSearchParams();

  if (nextState.q) searchParams.set("q", nextState.q);
  if (nextState.status !== DEFAULT_STATE.status) {
    searchParams.set("status", nextState.status);
  }
  if (nextState.category) searchParams.set("category", nextState.category);
  if (nextState.page > 1) searchParams.set("page", String(nextState.page));

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}
