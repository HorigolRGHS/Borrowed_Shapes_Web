import { diffLines } from 'diff';

export interface DiffChunk {
  type: 'add' | 'remove' | 'equal';
  value: string;
  count: number;
}

const IMG_DATA_URL_RE = /!\[[^\]]*\]\(data:[^)]+\)/g;

function stripImageData(md: string): string {
  return md.replace(IMG_DATA_URL_RE, '![image](data-url-stripped)');
}

export function computeMarkdownDiff(prev: string, curr: string): DiffChunk[] {
  const parts = diffLines(stripImageData(prev), stripImageData(curr));
  return parts.map((p) => ({
    type: p.added ? 'add' : p.removed ? 'remove' : 'equal',
    value: p.value,
    count: p.count ?? p.value.split('\n').length,
  }));
}

// Collapse runs of >threshold equal lines into a single placeholder chunk for UI.
export function collapseEqualRuns(chunks: DiffChunk[], threshold = 10): DiffChunk[] {
  return chunks.map((c) => {
    if (c.type !== 'equal') return c;
    if (c.count <= threshold) return c;
    return { type: 'equal', value: `... ${c.count} unchanged lines ...\n`, count: 1 };
  });
}
