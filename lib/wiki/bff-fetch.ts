// lib/wiki/bff-fetch.ts
import type { ApiResponse } from "@/models/dtos/api-response.dto";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface JsonOptions {
  params?: Record<string, unknown> | undefined;
  body?: unknown;
}

export class BffFetchError extends Error {
  readonly response: { status: number; data: ApiResponse<unknown> };
  constructor(status: number, data: ApiResponse<unknown>) {
    super(data?.message ?? `Request failed with status ${status}`);
    this.name = "BffFetchError";
    this.response = { status, data };
  }
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function buildServerInit(
  init: RequestInit,
): Promise<{ url: (path: string) => string; init: RequestInit }> {
  const { cookies, headers } = await import("next/headers");
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";

  const proto =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

  const merged: RequestInit = {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      "Accept-Language": locale,
    },
    cache: "no-store",
  };

  return { url: (p) => `${origin}${p}`, init: merged };
}

async function parseOrThrow<T>(res: Response): Promise<ApiResponse<T>> {
  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const fallback: ApiResponse<unknown> = {
      statusCode: res.status,
      success: false,
      message: body?.message ?? res.statusText ?? "Request failed",
      data: null,
      path: "",
      timestamp: new Date().toISOString(),
    };
    throw new BffFetchError(res.status, body ?? fallback);
  }
  if (!body) {
    throw new BffFetchError(res.status, {
      statusCode: res.status,
      success: false,
      message: "Empty response body",
      data: null,
      path: "",
      timestamp: new Date().toISOString(),
    });
  }
  return body;
}

export async function bffFetchJson<T>(
  method: Method,
  path: string,
  opts: JsonOptions = {},
): Promise<ApiResponse<T>> {
  const url = `${path}${buildQuery(opts.params)}`;
  const init: RequestInit = {
    method,
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  if (typeof window === "undefined") {
    const { url: makeUrl, init: serverInit } = await buildServerInit(init);
    const res = await fetch(makeUrl(url), serverInit);
    return parseOrThrow<T>(res);
  }

  const res = await fetch(url, { ...init, credentials: "include" });
  return parseOrThrow<T>(res);
}

export async function bffFetchForm<T>(
  path: string,
  formData: FormData,
): Promise<ApiResponse<T>> {
  const init: RequestInit = { method: "POST", body: formData };

  if (typeof window === "undefined") {
    const { url: makeUrl, init: serverInit } = await buildServerInit(init);
    const res = await fetch(makeUrl(path), serverInit);
    return parseOrThrow<T>(res);
  }

  const res = await fetch(path, { ...init, credentials: "include" });
  return parseOrThrow<T>(res);
}
