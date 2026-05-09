import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { LoginRequest, LoginResponse } from "@/models/dtos/auth.dto";

export async function POST(request: NextRequest) {
  try {
    const payload: LoginRequest = await request.json();

    // 1. Tự động lấy Device Info từ User-Agent
    const userAgent = request.headers.get("user-agent") || "Web Browser";
    if (!payload.deviceInfo) {
      payload.deviceInfo = userAgent;
    }

    // 2. Mặc định platform là 'web'
    payload.platform = 'web';

    const res: ApiResponse<LoginResponse> = await api.post("/auth/login", payload);

    if (!res) throw new Error("Empty response from server");

    if (!res.success) {
      throw new Error(res.message || "Login failed");
    }

    const data = res.data;
    const token = data?.accessToken ?? null;
    const refreshToken = data?.refreshToken ?? null;

    if (!token) throw new Error("Missing access token");

    const response = NextResponse.json(res);

    response.cookies.set("accessToken", token, {
      path: "/",
      maxAge: 60 * 15, // 15 mins
      httpOnly: false,
      sameSite: "lax",
    });

    if (refreshToken) {
      response.cookies.set("refreshToken", refreshToken, {
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        httpOnly: true,
        sameSite: "lax",
      });
    }

    return response;

  } catch (err: any) {
    const errorRes: ApiResponse<null> = {
      statusCode: err?.response?.status || 400,
      success: false,
      message: err?.response?.data?.message ?? err?.message ?? "Login failed",
      data: null,
      path: "/api/auth/login",
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(errorRes, { status: errorRes.statusCode });
  }
}
