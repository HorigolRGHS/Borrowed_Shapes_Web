import type { WikiMetadata } from "./wiki-metadata.dto";

export interface WikiAuthor {
  id: string;
  displayName: string;
}

export interface WikiPublicListItemRevision {
  id: string;
  summary: string | null;
  author: WikiAuthor | null;
  createdAt: string;
}

export interface WikiPublicListItem {
  id: string;
  slug: string;
  title: string;
  metadataJson?: WikiMetadata | null;
  isPublished: boolean;
  updatedAt: string;
  latestRevision: WikiPublicListItemRevision | null;
}

export interface WikiPublicListResponse {
  items: WikiPublicListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WikiListItemRevision {
  id: string;
  summary: string | null;
  summaryVi: string | null;
  author: WikiAuthor | null;
  createdAt: string;
}

export interface WikiListItem {
  id: string;
  slug: string;
  slugVi: string;
  title: string;
  titleVi: string;
  metadataJson?: WikiMetadata | null;
  isPublished: boolean;
  updatedAt: string;
  latestRevision: WikiListItemRevision | null;
  revisionCount?: number;
}

export interface WikiAdminStats {
  totalPages: number;
  published: number;
  drafts: number;
  totalRevisions: number;
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
  contentVi: string;
  summary: string | null;
  summaryVi: string | null;
  author: WikiAuthor | null;
  createdAt: string;
}

export interface WikiPublicDetailRevision {
  id: string;
  content: string;
  summary: string | null;
  author: WikiAuthor | null;
  createdAt: string;
}

export interface WikiPublicDetail {
  id: string;
  slug: string;
  title: string;
  metadataJson: WikiMetadata | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  latestRevision: WikiPublicDetailRevision;
  matchedSlugLocale: 'en' | 'vi';
}

export interface WikiDetail {
  id: string;
  slug: string;
  slugVi: string;
  title: string;
  titleVi: string;
  metadataJson: WikiMetadata | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  latestRevision: WikiDetailRevision;
  matchedSlugLocale: 'en' | 'vi';
}

export interface WikiHistoryItem {
  id: string;
  summary: string | null;
  summaryVi: string | null;
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
  slugVi: string;
  title: string;
  titleVi: string;
  content: string;
  contentVi: string;
  summary?: string;
  summaryVi?: string;
  metadataJson?: WikiMetadata | null;
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
