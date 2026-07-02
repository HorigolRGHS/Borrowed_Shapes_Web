// app/api/wiki/_lib/forward.ts
import { NextRequest, NextResponse } from "next/server";
import axios, { type AxiosResponse, type AxiosRequestConfig } from "axios";
import apiClient, { getApiBaseUrl } from "@/lib/api/api-client";
import type { ApiResponse } from "@/models/dtos/api-response.dto";
import type { JsonValue, QueryParams } from "@/lib/wiki/http";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ForwardOptions {
  params?: QueryParams;
  body?: object;
}

interface RefreshData {
  accessToken?: string;
  refreshToken?: string;
}

// Server-side apiClient does NOT run the refresh interceptor (that path is
// client-only), so a stale accessToken cookie yields a dead 401 here. Mirror
// the upload route: on 401, hit /api/auth/refresh with the request cookies,
// retry once with the fresh token, and set the rotated cookies on the response.
async function refreshFromCookies(req: NextRequest): Promise<RefreshData | null> {
  const refreshRes = await fetch(new URL("/api/auth/refresh", req.url), {
    method: "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!refreshRes.ok) return null;

  const payload = (await refreshRes.json().catch(() => null)) as {
    data?: RefreshData;
  } | null;
  return payload?.data?.accessToken ? payload.data : null;
}

async function send(
  method: Method,
  backendPath: string,
  opts: ForwardOptions,
  config: AxiosRequestConfig,
): Promise<AxiosResponse<JsonValue>> {
  switch (method) {
    case "GET":
      return apiClient.get(backendPath, config);
    case "DELETE":
      return apiClient.delete(backendPath, config);
    case "POST":
      return apiClient.post(backendPath, opts.body ?? {}, config);
    case "PUT":
      return apiClient.put(backendPath, opts.body ?? {}, config);
    case "PATCH":
      return apiClient.patch(backendPath, opts.body ?? {}, config);
    default: {
      const _exhaustive: never = method;
      throw new Error(`Unsupported method: ${_exhaustive}`);
    }
  }
}

function applyRefreshedCookies(res: NextResponse, refreshed: RefreshData): void {
  if (!refreshed.accessToken) return;
  res.cookies.set("accessToken", refreshed.accessToken, {
    path: "/",
    maxAge: 60 * 15,
    httpOnly: false,
    sameSite: "lax",
  });
  if (refreshed.refreshToken) {
    res.cookies.set("refreshToken", refreshed.refreshToken, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
    });
  }
}

export async function forwardJson(
  req: NextRequest,
  method: Method,
  backendPath: string,
  opts: ForwardOptions = {},
): Promise<NextResponse> {
  const baseConfig: AxiosRequestConfig = { params: opts.params };

  let refreshed: RefreshData | null = null;
  try {
    let res: AxiosResponse<JsonValue>;
    try {
      res = await send(method, backendPath, opts, baseConfig);
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 401) throw err;
      refreshed = await refreshFromCookies(req);
      if (!refreshed?.accessToken) throw err;
      // Raw axios on retry: apiClient's server-side interceptor re-reads the
      // OLD accessToken cookie and overwrites Authorization, so the fresh token
      // would be lost. Hit the backend directly with the rotated token.
      const locale = req.cookies.get("NEXT_LOCALE")?.value ?? "en";
      res = await axios.request({
        ...baseConfig,
        method,
        url: `${getApiBaseUrl()}${backendPath}`,
        data: method === "GET" || method === "DELETE" ? undefined : opts.body ?? {},
        headers: {
          Authorization: `Bearer ${refreshed.accessToken}`,
          "Accept-Language": locale,
        },
      });
    }

    const out = NextResponse.json(res.data, { status: res.status });
    if (refreshed) applyRefreshedCookies(out, refreshed);
    return out;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json(err.response.data, {
        status: err.response.status,
      });
    }
    const errorRes: ApiResponse<null> = {
      statusCode: 502,
      success: false,
      message: err instanceof Error ? err.message : "Upstream unavailable",
      data: null,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(errorRes, { status: 502 });
  }
}
