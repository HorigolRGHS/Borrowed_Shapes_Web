"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { WikiInfobox } from "@/components/wiki/wiki-infobox";
import { EditableImageField } from "./editable-image-field";
import { EditableCategoryField } from "./editable-category-field";
import { EditableStatsField } from "./editable-stats-field";
import { EditableLocationField } from "./editable-location-field";
import { EditableTagsField } from "./editable-tags-field";
import { EditableRelatedField } from "./editable-related-field";
import { emptyWikiMetadata } from "@/models/dtos/wiki-metadata.dto";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";
import type { WikiCategory } from "@/models/dtos/wiki-metadata.dto";
import enDict from "@/locales/en.json";
import viDict from "@/locales/vi.json";

interface Props {
  locale: "en" | "vi";
  excludeSlug?: string;
  wikiId: string;
}

export function EditableInfobox({ locale, excludeSlug, wikiId }: Props) {
  const form = useFormContext<WikiFormValue>();
  const metadata =
    useWatch({ control: form.control, name: "metadata" }) ?? emptyWikiMetadata;
  const title =
    useWatch({
      control: form.control,
      name: locale === "vi" ? "titleVi" : "title",
    }) ?? "";

  const dict = locale === "vi" ? viDict : enDict;
  const i18n = {
    infoboxLabel: dict.wiki.metadata.infobox_label,
    categoryLabel: dict.wiki.metadata.category_label,
    categoryName: (c: WikiCategory) =>
      dict.wiki.metadata.category[
        c as keyof typeof dict.wiki.metadata.category
      ],
    statsLabel: dict.wiki.metadata.stats,
    locationLabel: dict.wiki.metadata.location,
    relatedLabel: dict.wiki.metadata.related_pages,
    tagsLabel: dict.wiki.metadata.tags,
  };

  return (
    <WikiInfobox
      metadata={metadata}
      title={title || dict.wiki.edit.untitled_placeholder}
      locale={locale}
      i18n={i18n}
      mode="edit"
      editSlots={{
        image: <EditableImageField wikiId={wikiId} />,
        category: <EditableCategoryField />,
        stats: <EditableStatsField locale={locale} />,
        location: (
          <EditableLocationField
            locale={locale}
            placeholder={dict.wiki.metadata.location}
          />
        ),
        tags: <EditableTagsField locale={locale} />,
        related: (
          <EditableRelatedField excludeSlug={excludeSlug} locale={locale} />
        ),
      }}
    />
  );
}
