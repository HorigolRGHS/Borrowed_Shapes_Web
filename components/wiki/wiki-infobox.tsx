import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  emptyWikiMetadata,
  wikiMetadataSchema,
  type WikiCategory,
  type WikiMetadata,
} from "@/models/dtos/wiki-metadata.dto";
import type { RelatedPageEntry } from "@/lib/wiki/related-api";

interface InfoboxI18n {
  infoboxLabel: string;
  categoryLabel: string;
  categoryName: (c: WikiCategory) => string;
  statsLabel: string;
  locationLabel: string;
  relatedLabel: string;
  tagsLabel: string;
}

interface InfoboxEditSlots {
  image?: ReactNode;
  category?: ReactNode;
  stats?: ReactNode;
  location?: ReactNode;
  tags?: ReactNode;
  related?: ReactNode;
}

interface Props {
  metadata: unknown;
  title: string;
  locale: "en" | "vi";
  relatedTitles?: Map<string, RelatedPageEntry>;
  i18n: InfoboxI18n;
  mode?: "view" | "edit";
  editSlots?: InfoboxEditSlots;
}

function isEmpty(m: WikiMetadata): boolean {
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

function pickTags(m: WikiMetadata, locale: "en" | "vi"): string[] {
  if (locale === "vi" && m.tags_vi.length > 0) return m.tags_vi;
  return m.tags;
}

function pickLocation(m: WikiMetadata, locale: "en" | "vi"): string | undefined {
  if (locale === "vi" && m.location_vi) return m.location_vi;
  return m.location;
}

export function WikiInfobox({
  metadata,
  title,
  locale,
  relatedTitles,
  i18n,
  mode = "view",
  editSlots,
}: Props) {
  // Persisted rows are produced by compactMetadata, so they may omit empty
  // collection fields. Fill them in with empty defaults before parsing so a
  // sparse but valid row (e.g., {category: "Boss"}) doesn't fail validation.
  const merged = {
    ...emptyWikiMetadata,
    ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
  };
  const parsed = wikiMetadataSchema.safeParse(merged);
  if (!parsed.success) return null;
  const m = parsed.data;

  if (mode === "edit" && editSlots) {
    return (
      <WikiInfoboxEdit i18n={i18n} editSlots={editSlots} />
    );
  }

  if (isEmpty(m)) return null;

  const tags = pickTags(m, locale);
  const location = pickLocation(m, locale);
  const statEntries = Object.entries(m.stats);
  const related = m.relatedPages;
  const hasKVTable = !!m.category || statEntries.length > 0 || !!location;

  return (
    <aside aria-label={i18n.infoboxLabel}>
      <Card>
        <CardContent className="space-y-3 pt-4">
          {m.infoboxImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.infoboxImage}
              alt={`${title} infobox`}
              className="aspect-square w-full rounded-md bg-muted object-contain"
              loading="lazy"
              decoding="async"
            />
          )}

          {hasKVTable && (
            <>
              {m.infoboxImage && <Separator />}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {m.category && (
                  <>
                    <dt className="text-muted-foreground">
                      {i18n.categoryLabel}
                    </dt>
                    <dd>{i18n.categoryName(m.category)}</dd>
                  </>
                )}
                {statEntries.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">
                      {i18n.statsLabel}
                    </dt>
                    <dd>
                      <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5">
                        {statEntries.map(([k, v]) => (
                          <span key={k} className="contents">
                            <dt>{k}</dt>
                            <dd className="text-right tabular-nums">{v}</dd>
                          </span>
                        ))}
                      </dl>
                    </dd>
                  </>
                )}
                {location && (
                  <>
                    <dt className="text-muted-foreground">
                      {i18n.locationLabel}
                    </dt>
                    <dd>{location}</dd>
                  </>
                )}
              </dl>
            </>
          )}

          {related.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {i18n.relatedLabel}
                </p>
                <ul className="space-y-1 text-sm">
                  {related.map((slug) => {
                    const entry = relatedTitles?.get(slug);
                    if (entry?.exists) {
                      const lbl =
                        locale === "vi"
                          ? entry.title_vi || entry.title || slug
                          : entry.title || slug;
                      return (
                        <li key={slug}>
                          <Link
                            href={`/wiki/${encodeURIComponent(slug)}`}
                            className="underline hover:no-underline"
                          >
                            {lbl}
                          </Link>
                        </li>
                      );
                    }
                    return (
                      <li
                        key={slug}
                        className="text-muted-foreground line-through"
                      >
                        {slug}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}

          {tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {i18n.tagsLabel}
                </p>
                <ul role="list" className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant="secondary">{tag}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

function WikiInfoboxEdit({
  i18n,
  editSlots,
}: {
  i18n: InfoboxI18n;
  editSlots: InfoboxEditSlots;
}) {
  return (
    <aside aria-label={i18n.infoboxLabel}>
      <Card>
        <CardContent className="space-y-4 pt-4">
          {editSlots.image && <div>{editSlots.image}</div>}
          {editSlots.category && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {i18n.categoryLabel}
              </p>
              {editSlots.category}
            </div>
          )}
          {editSlots.stats && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{i18n.statsLabel}</p>
              {editSlots.stats}
            </div>
          )}
          {editSlots.location && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {i18n.locationLabel}
              </p>
              {editSlots.location}
            </div>
          )}
          {editSlots.tags && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{i18n.tagsLabel}</p>
              {editSlots.tags}
            </div>
          )}
          {editSlots.related && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {i18n.relatedLabel}
              </p>
              {editSlots.related}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
