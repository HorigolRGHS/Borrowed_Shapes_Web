import apiClient from "@/lib/api/api-client";
import type { ApiResponse } from "@/models/dtos/api-response.dto";

export interface RelatedPageEntry {
  slug: string;
  title?: string;
  title_vi?: string;
  exists: boolean;
}

export async function fetchRelatedTitles(
  slugs: string[],
): Promise<Map<string, RelatedPageEntry>> {
  const cleaned = Array.from(
    new Set(slugs.map((s) => s.trim()).filter((s) => s.length > 0)),
  ).slice(0, 30);

  if (cleaned.length === 0) return new Map();

  const { data } = await apiClient.get<ApiResponse<RelatedPageEntry[]>>(
    "/wiki/related",
    { params: { slugs: cleaned.join(",") } },
  );

  const out = new Map<string, RelatedPageEntry>();
  for (const entry of data.data ?? []) {
    out.set(entry.slug, entry);
  }
  return out;
}
