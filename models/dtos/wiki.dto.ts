export interface WikiAuthor {
  id: string;
  displayName: string;
}

export interface WikiListItemRevision {
  id: string;
  summary: string | null;
  summary_vi: string | null;
  author: WikiAuthor | null;
  createdAt: string;
}

export interface WikiListItem {
  id: string;
  slug: string;
  slug_vi: string;
  title: string;
  title_vi: string;
  isPublished: boolean;
  updatedAt: string;
  latestRevision: WikiListItemRevision | null;
}

export interface WikiListResponse {
  items: WikiListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WikiDetailRevision {
  id: string;
  content: string;
  content_vi: string;
  summary: string | null;
  summary_vi: string | null;
  author: WikiAuthor | null;
  createdAt: string;
}

export interface WikiDetail {
  id: string;
  slug: string;
  slug_vi: string;
  title: string;
  title_vi: string;
  metadataJson: any | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  latestRevision: WikiDetailRevision;
  matchedSlugLocale: 'en' | 'vi';
}

export interface WikiHistoryItem {
  id: string;
  summary: string | null;
  summary_vi: string | null;
  author: WikiAuthor | null;
  createdAt: string;
  isLatest: boolean;
}

export interface WikiHistoryResponse {
  items: WikiHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WikiDiffChunk {
  type: 'add' | 'remove' | 'equal';
  value: string;
  count: number;
}

export interface WikiRevisionDiffResponse {
  current: WikiDetailRevision;
  previous: WikiDetailRevision | null;
  isFirst: boolean;
  diff: { en: WikiDiffChunk[]; vi: WikiDiffChunk[] } | null;
}

export interface WikiCreateRequest {
  slug: string;
  slug_vi: string;
  title: string;
  title_vi: string;
  content: string;
  content_vi: string;
  summary?: string;
  summary_vi?: string;
  metadataJson?: any;
  isPublished?: boolean;
}

export interface WikiUpdateRequest extends WikiCreateRequest {
  expectedLatestRevisionId: string;
  forceOverwrite?: boolean;
}

export interface WikiRollbackRequest {
  targetRevisionId: string;
  expectedLatestRevisionId: string;
}

export interface WikiUploadResponse {
  url: string;
  assetId: string;
  mimeType: string;
  size: number;
}
