// lib/wiki/related-api.ts
import { bffFetchJson } from "@/lib/wiki/bff-fetch";

export interface RelatedPageEntry {
  slug: string;
  title?: string;
  titleVi?: string;
  exists: boolean;
}

export async function fetchRelatedTitles(
  slugs: string[],
): Promise<Map<string, RelatedPageEntry>> {
  const cleaned = Array.from(
    new Set(slugs.map((s) => s.trim()).filter((s) => s.length > 0)),
  ).slice(0, 30);

  if (cleaned.length === 0) return new Map();

  const res = await bffFetchJson<RelatedPageEntry[]>("GET", "/api/wiki/related", {
    params: { slugs: cleaned.join(",") },
  });

  const out = new Map<string, RelatedPageEntry>();
  for (const entry of res.data ?? []) {
    out.set(entry.slug, entry);
  }
  return out;
}
