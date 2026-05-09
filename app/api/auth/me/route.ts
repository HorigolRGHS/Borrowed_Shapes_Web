import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { UserMeResponse } from "@/models/dtos/auth.dto";

export async function GET(request: NextRequest) {
  try {
    const include = request.nextUrl.searchParams.get("include") || "";

    const res: ApiResponse<UserMeResponse> = await api.get("/auth/me", {
      params: { include }
    });

    if (!res || !res.success) throw new Error(res?.message || "Failed to fetch user profile");

    return NextResponse.json(res);

  } catch (err: any) {
    const errorRes: ApiResponse<null> = {
      statusCode: 401,
      success: false,
      message: err?.response?.data?.message ?? err?.message ?? "Unauthorized",
      data: null,
      path: "/api/auth/me",
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(errorRes, { status: 401 });
  }
}
