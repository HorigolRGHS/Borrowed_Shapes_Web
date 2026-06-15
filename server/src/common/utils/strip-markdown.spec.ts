import { stripMarkdown, previewText } from './strip-markdown';

describe('stripMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('removes heading markers', () => {
    expect(stripMarkdown('# Title\n## Sub')).toBe('Title Sub');
  });

  it('keeps link text, drops url', () => {
    expect(stripMarkdown('see [docs](https://x.com)')).toBe('see docs');
  });

  it('drops images entirely', () => {
    expect(stripMarkdown('a ![alt](data:image/png;base64,AAAA) b')).toBe('a b');
  });

  it('removes emphasis and inline code markers', () => {
    expect(stripMarkdown('**bold** _it_ `code`')).toBe('bold it code');
  });

  it('removes fenced code blocks', () => {
    expect(stripMarkdown('before\n```\nx=1\n```\nafter')).toBe('before after');
  });

  it('strips list markers', () => {
    expect(stripMarkdown('- one\n- two\n1. three')).toBe('one two three');
  });

  it('collapses whitespace', () => {
    expect(stripMarkdown('a\n\n\n   b')).toBe('a b');
  });
});

describe('previewText', () => {
  it('returns short stripped text unchanged', () => {
    expect(previewText('# Hi there', 100)).toBe('Hi there');
  });

  it('truncates at the limit and appends ellipsis', () => {
    const out = previewText('a'.repeat(150), 100);
    expect(out.length).toBe(101); // 100 chars + ellipsis
    expect(out.endsWith('…')).toBe(true);
    expect(out.slice(0, 100)).toBe('a'.repeat(100));
  });

  it('does not append ellipsis at exactly the limit', () => {
    const out = previewText('a'.repeat(100), 100);
    expect(out).toBe('a'.repeat(100));
    expect(out.endsWith('…')).toBe(false);
  });

  it('strips markdown before measuring length', () => {
    expect(previewText('**hello**', 100)).toBe('hello');
  });

  it('defaults max to 100', () => {
    expect(previewText('a'.repeat(120)).length).toBe(101);
  });
});
