export function getWikiListParams(searchParams: URLSearchParams) {
  return {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  };
}
