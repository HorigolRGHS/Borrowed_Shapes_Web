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

export function extractToc(markdown: string): TocItem[] {
  if (!markdown) return [];
  
  // Remove fenced code blocks so code contents are excluded
  const clean = markdown.replace(/```[\s\S]*?```/g, '');
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();

  const addItem = (level: 1 | 2 | 3, rawText: string, existingId?: string) => {
    const text = rawText
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (!text) return;
    const id = existingId || slugger.slug(text);
    items.push({ level, text, id });
  };

  const lines = clean.split('\n');
  for (const line of lines) {
    const mdMatch = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (mdMatch) {
      const level = mdMatch[1].length as 1 | 2 | 3;
      addItem(level, mdMatch[2]);
      continue;
    }

    const htmlMatches = line.matchAll(/<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi);
    for (const htmlMatch of htmlMatches) {
      const level = parseInt(htmlMatch[1], 10) as 1 | 2 | 3;
      const attrs = htmlMatch[2] || '';
      const rawText = htmlMatch[3] || '';
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      addItem(level, rawText, idMatch ? idMatch[1] : undefined);
    }
  }

  return items;
}

