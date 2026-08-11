import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ApiResponse } from "@/models/dtos/api-response.dto";
import { getBackendBaseUrl } from "@/lib/api/runtime-base-url";

interface RefreshData {
  accessToken?: string;
  refreshToken?: string;
}

function buildUploadHeaders(locale: string, accessToken?: string) {
  const headers: Record<string, string> = {
    "Accept-Language": locale,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function uploadToBackend(
  id: string,
  formData: FormData,
  locale: string,
  accessToken?: string,
) {
  return fetch(`${getBackendBaseUrl()}/wiki/${encodeURIComponent(id)}/upload`, {
    method: "POST",
    body: formData,
    headers: buildUploadHeaders(locale, accessToken),
  });
}

async function refreshFromCookies(req: NextRequest): Promise<RefreshData | null> {
  const refreshRes = await fetch(new URL("/api/auth/refresh", req.url), {
    method: "POST",
    headers: {
      Cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });
  if (!refreshRes.ok) return null;

  const payload = (await refreshRes.json().catch(() => null)) as {
    data?: RefreshData;
  } | null;
  return payload?.data?.accessToken ? payload.data : null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const formData = await req.formData();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";

    let refreshed: RefreshData | null = null;
    let upstream = await uploadToBackend(id, formData, locale, accessToken);

    if (upstream.status === 401) {
      refreshed = await refreshFromCookies(req);
      if (refreshed?.accessToken) {
        upstream = await uploadToBackend(id, formData, locale, refreshed.accessToken);
      }
    }

    const text = await upstream.text();
    const response = new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });

    if (refreshed?.accessToken) {
      response.cookies.set("accessToken", refreshed.accessToken, {
        path: "/",
        maxAge: 60 * 15,
        httpOnly: false,
        sameSite: "lax",
      });
      if (refreshed.refreshToken) {
        response.cookies.set("refreshToken", refreshed.refreshToken, {
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }

    return response;
  } catch (err) {
    const errorRes: ApiResponse<null> = {
      statusCode: 502,
      success: false,
      message: err instanceof Error ? err.message : "Upload upstream unavailable",
      data: null,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(errorRes, { status: 502 });
  }
}
