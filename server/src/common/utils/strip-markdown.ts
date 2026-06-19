// Best-effort markdown -> plaintext for list previews. Not a full parser.
export function stripMarkdown(input: string): string {
  if (!input) return '';
  let s = input;
  s = s.replace(/```[\s\S]*?```/g, ' ');          // fenced code blocks
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');     // images
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');   // links -> text
  s = s.replace(/`([^`]*)`/g, '$1');               // inline code
  s = s.replace(/^\s{0,3}(#{1,6}|>)\s*/gm, '');    // headings / blockquotes
  s = s.replace(/^\s*([-+*]|\d+\.)\s+/gm, '');     // list markers
  s = s.replace(/[*_~]+/g, '');                    // emphasis markers
  s = s.replace(/\s+/g, ' ').trim();               // collapse whitespace
  return s;
}

export function previewText(input: string, max = 100): string {
  const stripped = stripMarkdown(input);
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max) + '…';
}
