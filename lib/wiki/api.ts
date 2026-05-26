// lib/wiki/api.ts
import { bffFetchJson, bffFetchForm } from "@/lib/wiki/bff-fetch";
import type {
  WikiListResponse,
  WikiDetail,
  WikiHistoryResponse,
  WikiDetailRevision,
  WikiRevisionDiffResponse,
  WikiCreateRequest,
  WikiUpdateRequest,
  WikiRollbackRequest,
  WikiUploadResponse,
} from "@/models/dtos/wiki.dto";

export interface WikiListQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: "createdAt" | "title";
  order?: "asc" | "desc";
}

export async function fetchWikiList(
  query: WikiListQuery,
): Promise<WikiListResponse> {
  const res = await bffFetchJson<WikiListResponse>("GET", "/api/wiki", {
    params: query as Record<string, unknown>,
  });
  return res.data;
}

export async function fetchAdminWikiList(
  query: WikiListQuery,
): Promise<WikiListResponse> {
  const res = await bffFetchJson<WikiListResponse>("GET", "/api/wiki/admin", {
    params: query as Record<string, unknown>,
  });
  return res.data;
}

export async function fetchWikiBySlug(slug: string): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>(
    "GET",
    `/api/wiki/slug/${encodeURIComponent(slug)}`,
  );
  return res.data;
}

export async function fetchAdminWikiById(id: string): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>(
    "GET",
    `/api/wiki/admin/${encodeURIComponent(id)}`,
  );
  return res.data;
}

export async function searchWiki(
  q: string,
  page = 1,
  limit = 20,
): Promise<WikiListResponse> {
  const res = await bffFetchJson<WikiListResponse>("GET", "/api/wiki/search", {
    params: { q, page, limit },
  });
  return res.data;
}

export async function fetchWikiHistory(
  id: string,
  page = 1,
  limit = 20,
): Promise<WikiHistoryResponse> {
  const res = await bffFetchJson<WikiHistoryResponse>(
    "GET",
    `/api/wiki/${encodeURIComponent(id)}/history`,
    { params: { page, limit } },
  );
  return res.data;
}

export async function fetchWikiRevision(
  id: string,
  revisionId: string,
): Promise<WikiDetailRevision> {
  const res = await bffFetchJson<WikiDetailRevision>(
    "GET",
    `/api/wiki/${encodeURIComponent(id)}/history/${encodeURIComponent(revisionId)}`,
  );
  return res.data;
}

export async function fetchWikiRevisionDiff(
  id: string,
  revisionId: string,
): Promise<WikiRevisionDiffResponse> {
  const res = await bffFetchJson<WikiRevisionDiffResponse>(
    "GET",
    `/api/wiki/${encodeURIComponent(id)}/history/${encodeURIComponent(revisionId)}/diff`,
  );
  return res.data;
}

export async function createWiki(req: WikiCreateRequest): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>("POST", "/api/wiki", { body: req });
  return res.data;
}

export async function updateWiki(
  id: string,
  req: WikiUpdateRequest,
): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>(
    "PUT",
    `/api/wiki/${encodeURIComponent(id)}`,
    { body: req },
  );
  return res.data;
}

export async function deleteWiki(id: string): Promise<void> {
  await bffFetchJson<null>("DELETE", `/api/wiki/${encodeURIComponent(id)}`);
}

export async function rollbackWiki(
  id: string,
  req: WikiRollbackRequest,
): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>(
    "POST",
    `/api/wiki/${encodeURIComponent(id)}/rollback`,
    { body: req },
  );
  return res.data;
}

export async function publishWiki(id: string): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>(
    "POST",
    `/api/wiki/${encodeURIComponent(id)}/publish`,
  );
  return res.data;
}

export async function unpublishWiki(id: string): Promise<WikiDetail> {
  const res = await bffFetchJson<WikiDetail>(
    "POST",
    `/api/wiki/${encodeURIComponent(id)}/unpublish`,
  );
  return res.data;
}

export async function uploadWikiImage(file: File): Promise<WikiUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await bffFetchForm<WikiUploadResponse>("/api/wiki/upload", form);
  return res.data;
}
