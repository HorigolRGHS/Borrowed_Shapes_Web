import apiClient from '@/lib/api/api-client';
import type { ApiResponse } from '@/models/dtos/api-response.dto';
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
} from '@/models/dtos/wiki.dto';

export interface WikiListQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: 'createdAt' | 'title';
  order?: 'asc' | 'desc';
}

export async function fetchWikiList(query: WikiListQuery): Promise<WikiListResponse> {
  const { data } = await apiClient.get<ApiResponse<WikiListResponse>>('/wiki', { params: query });
  return data.data;
}

export async function fetchAdminWikiList(query: WikiListQuery): Promise<WikiListResponse> {
  const { data } = await apiClient.get<ApiResponse<WikiListResponse>>('/wiki/admin', { params: query });
  return data.data;
}

export async function fetchWikiBySlug(slug: string): Promise<WikiDetail> {
  const { data } = await apiClient.get<ApiResponse<WikiDetail>>(`/wiki/slug/${encodeURIComponent(slug)}`);
  return data.data;
}

export async function fetchAdminWikiById(id: string): Promise<WikiDetail> {
  const { data } = await apiClient.get<ApiResponse<WikiDetail>>(`/wiki/admin/${id}`);
  return data.data;
}

export async function searchWiki(q: string, page = 1, limit = 20): Promise<WikiListResponse> {
  const { data } = await apiClient.get<ApiResponse<WikiListResponse>>('/wiki/search', { params: { q, page, limit } });
  return data.data;
}

export async function fetchWikiHistory(id: string, page = 1, limit = 20): Promise<WikiHistoryResponse> {
  const { data } = await apiClient.get<ApiResponse<WikiHistoryResponse>>(`/wiki/${id}/history`, { params: { page, limit } });
  return data.data;
}

export async function fetchWikiRevision(id: string, revisionId: string): Promise<WikiDetailRevision> {
  const { data } = await apiClient.get<ApiResponse<WikiDetailRevision>>(`/wiki/${id}/history/${revisionId}`);
  return data.data;
}

export async function fetchWikiRevisionDiff(id: string, revisionId: string): Promise<WikiRevisionDiffResponse> {
  const { data } = await apiClient.get<ApiResponse<WikiRevisionDiffResponse>>(`/wiki/${id}/history/${revisionId}/diff`);
  return data.data;
}

export async function createWiki(req: WikiCreateRequest): Promise<WikiDetail> {
  const { data } = await apiClient.post<ApiResponse<WikiDetail>>('/wiki', req);
  return data.data;
}

export async function updateWiki(id: string, req: WikiUpdateRequest): Promise<WikiDetail> {
  const { data } = await apiClient.put<ApiResponse<WikiDetail>>(`/wiki/${id}`, req);
  return data.data;
}

export async function deleteWiki(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/wiki/${id}`);
}

export async function rollbackWiki(id: string, req: WikiRollbackRequest): Promise<WikiDetail> {
  const { data } = await apiClient.post<ApiResponse<WikiDetail>>(`/wiki/${id}/rollback`, req);
  return data.data;
}

export async function publishWiki(id: string): Promise<WikiDetail> {
  const { data } = await apiClient.post<ApiResponse<WikiDetail>>(`/wiki/${id}/publish`);
  return data.data;
}

export async function unpublishWiki(id: string): Promise<WikiDetail> {
  const { data } = await apiClient.post<ApiResponse<WikiDetail>>(`/wiki/${id}/unpublish`);
  return data.data;
}

export async function uploadWikiImage(file: File): Promise<WikiUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiResponse<WikiUploadResponse>>('/wiki/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
