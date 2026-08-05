// Must stay byte-identical to the ids rehype-slug injects into the rendered
// HTML, otherwise the TOC anchors point at nothing. rehype-slug uses
// github-slugger, which keeps diacritics ("Tổng quan" -> "tổng-quan");
// slugify would strip them ("tong-quan") and break every non-ASCII heading.
import GithubSlugger from 'github-slugger';

export interface TocItem {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}

// Match ATX-style headings only at the start of a line, ignoring fenced code blocks.
// Strategy: split into lines, track whether we're inside a ``` block, parse otherwise.
export function extractToc(markdown: string): TocItem[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  let inFence = false;

  const addItem = (level: 1 | 2 | 3, rawText: string) => {
    const text = rawText.replace(/<[^>]*>/g, '').trim();
    if (!text) return;
    // slugger dedupes repeats itself (foo, foo-1, ...) exactly like rehype-slug.
    items.push({ level, text, id: slugger.slug(text) });
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```/);
    if (fenceMatch) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const mdMatch = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (mdMatch) {
      const level = mdMatch[1].length as 1 | 2 | 3;
      addItem(level, mdMatch[2]);
      continue;
    }

    const htmlMatches = line.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi);
    for (const htmlMatch of htmlMatches) {
      const level = parseInt(htmlMatch[1], 10) as 1 | 2 | 3;
      addItem(level, htmlMatch[2]);
    }
  }

  return items;
}
