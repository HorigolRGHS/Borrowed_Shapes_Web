import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { ApiResponse } from "@/models/dtos/api-response.dto";
import { getBackendBaseUrl } from "@/lib/api/runtime-base-url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";

    const headers: Record<string, string> = {
      "Accept-Language": locale,
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const upstream = await fetch(`${getBackendBaseUrl()}/forums/upload`, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload upstream unavailable";
    const payload: ApiResponse<null> = {
      statusCode: 502,
      success: false,
      message,
      data: null,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload, { status: 502 });
  }
}