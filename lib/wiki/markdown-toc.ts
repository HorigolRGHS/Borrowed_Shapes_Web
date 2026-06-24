import slugifyLib from 'slugify';

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
  const idCounts = new Map<string, number>();
  let inFence = false;

  for (const line of lines) {
    const fenceMatch = line.match(/^```/);
    if (fenceMatch) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;

    const level = m[1].length as 1 | 2 | 3;
    const text = m[2].trim();
    const baseId = slugifyLib(text, { lower: true, strict: true, trim: true }) || 'section';
    const count = (idCounts.get(baseId) ?? 0) + 1;
    idCounts.set(baseId, count);
    const id = count === 1 ? baseId : `${baseId}-${count}`;

    items.push({ level, text, id });
  }

  return items;
}
