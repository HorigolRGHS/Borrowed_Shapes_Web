'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    h1: [...(defaultSchema.attributes?.h1 ?? []), 'id'],
    h2: [...(defaultSchema.attributes?.h2 ?? []), 'id'],
    h3: [...(defaultSchema.attributes?.h3 ?? []), 'id'],
    h4: [...(defaultSchema.attributes?.h4 ?? []), 'id'],
    h5: [...(defaultSchema.attributes?.h5 ?? []), 'id'],
    h6: [...(defaultSchema.attributes?.h6 ?? []), 'id'],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ['target', 'self', '_blank'],
      ['rel', 'noopener', 'noreferrer'],
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ['loading', 'lazy'],
      ['src', /^https?:\/\//i, /^\/uploads\//],
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
};

const components: Components = {
  a({ node, ...props }) {
    const href = props.href ?? '';
    const isExternal = /^https?:\/\//i.test(href);
    return (
      <a
        {...props}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      />
    );
  },
  img({ node, ...props }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...props}
        alt={props.alt ?? ''}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
        }}
      />
    );
  },
};

interface Props {
  markdown: string;
}

export function WikiContentRenderer({ markdown }: Props) {
  return (
    <article className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-img:rounded-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
