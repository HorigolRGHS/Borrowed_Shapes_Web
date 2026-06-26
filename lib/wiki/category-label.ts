import type { WikiCategory } from "@/models/dtos/wiki-metadata.dto";

export function categoryLabelKey(category: WikiCategory): string {
  return `wiki.metadata.category.${category}`;
}
