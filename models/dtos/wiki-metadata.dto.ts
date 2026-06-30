import * as z from "zod";

export const WIKI_CATEGORIES = [
  "Character",
  "Item",
  "Map",
  "Mechanic",
  "Boss",
  "Other",
] as const;

export const wikiCategorySchema = z.enum(WIKI_CATEGORIES);
export type WikiCategory = z.infer<typeof wikiCategorySchema>;

export const wikiStatsSchema = z.record(
  z.string().trim().min(1).max(40),
  z.number().finite(),
);
export type WikiStats = z.infer<typeof wikiStatsSchema>;

const wikiImageProxyPath = /^\/api\/wiki\/image\/wiki\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.(?:jpg|png|webp|gif)$/;

const optionalUrl = z
  .url()
  .or(z.string().regex(wikiImageProxyPath))
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalShortText = z
  .string()
  .trim()
  .max(120)
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const tagArray = z.array(z.string().trim().min(1).max(40)).max(20);

export const wikiMetadataSchema = z
  .object({
    category: wikiCategorySchema.optional(),
    tags: tagArray,
    tags_vi: tagArray,
    infoboxImage: optionalUrl,
    stats: wikiStatsSchema,
    location: optionalShortText,
    location_vi: optionalShortText,
    relatedPages: z.array(z.string().trim().min(1).max(120)).max(30),
  })
  .strict();

export type WikiMetadata = z.infer<typeof wikiMetadataSchema>;
export type CompactWikiMetadata = Partial<WikiMetadata>;

export const emptyWikiMetadata: WikiMetadata = {
  tags: [],
  tags_vi: [],
  stats: {},
  relatedPages: [],
};

export function normalizeWikiFormMetadata(
  metadata: Partial<WikiMetadata> | null | undefined,
): WikiMetadata {
  return {
    ...metadata,
    tags: metadata?.tags ?? [],
    tags_vi: metadata?.tags_vi ?? [],
    stats: metadata?.stats ?? {},
    relatedPages: metadata?.relatedPages ?? [],
  };
}

export function isWikiMetadataEmpty(m: WikiMetadata): boolean {
  return (
    !m.category &&
    !m.infoboxImage &&
    m.tags.length === 0 &&
    m.tags_vi.length === 0 &&
    Object.keys(m.stats).length === 0 &&
    !m.location &&
    !m.location_vi &&
    m.relatedPages.length === 0
  );
}

/**
 * Drops fields that should not be persisted to JSONB:
 * - empty arrays (tags, tags_vi, relatedPages)
 * - empty stats object
 * - undefined optional scalars (category, infoboxImage, location, location_vi)
 *
 * Returns null if the result has no remaining keys, so the column stores
 * `null` instead of `{}` when the wiki has no metadata.
 */
export function compactMetadata(
  meta: Partial<WikiMetadata> | null | undefined,
): CompactWikiMetadata | null {
  if (!meta) return null;
  const out: CompactWikiMetadata = {};
  if (meta.category) out.category = meta.category;
  if (meta.tags && meta.tags.length > 0) out.tags = meta.tags;
  if (meta.tags_vi && meta.tags_vi.length > 0) out.tags_vi = meta.tags_vi;
  if (meta.infoboxImage) out.infoboxImage = meta.infoboxImage;
  if (meta.stats && Object.keys(meta.stats).length > 0) out.stats = meta.stats;
  if (meta.location) out.location = meta.location;
  if (meta.location_vi) out.location_vi = meta.location_vi;
  if (meta.relatedPages && meta.relatedPages.length > 0) {
    out.relatedPages = meta.relatedPages;
  }
  return Object.keys(out).length === 0 ? null : out;
}
