export function buildWikiPaginationHref(
  basePath: string,
  page: number,
  extraParams?: Record<string, string>,
): string {
  const searchParams = new URLSearchParams();

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (key !== "page" && value !== "") searchParams.set(key, value);
    }
  }

  if (page > 1) searchParams.set("page", String(page));

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
