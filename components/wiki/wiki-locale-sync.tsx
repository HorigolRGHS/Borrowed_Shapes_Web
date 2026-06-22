"use client";

import { useEffect } from "react";

interface WikiSlugData {
  slug: string;
  slugVi: string;
  pathSuffix: string;
}

export function WikiLocaleSync({ slug, slugVi, pathSuffix }: WikiSlugData) {
  useEffect(() => {
    (window as any).__wikiSlugData = { slug, slugVi, pathSuffix };
    return () => {
      delete (window as any).__wikiSlugData;
    };
  }, [slug, slugVi, pathSuffix]);
  return null;
}
