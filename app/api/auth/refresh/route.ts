import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/api-client";
import { ApiResponse } from "@/models/dtos/api-response.dto";
import { RefreshRequest, RefreshResponse } from "@/models/dtos/auth.dto";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (!refreshToken) throw new Error("No refresh token");

    // 1. Gọi sang Backend NestJS để đổi Token mới
    const res: ApiResponse<RefreshResponse> = await api.post("/auth/refresh", { refreshToken });

    if (!res || !res.success) {
      throw new Error(res?.message || "Refresh failed");
    }

    const data = res.data;
    const newToken = data?.accessToken ?? (data as any)?.token ?? null;
    const newRefreshToken = data?.refreshToken ?? null;

    if (!newToken) throw new Error("Missing new access token from server");

    // 2. CƠ CHẾ CHẠY AUTH/ME: Gọi lấy thông tin user mới nhất bằng token vừa đổi
    try {
      const meRes: ApiResponse<any> = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      if (meRes.success) {
        // Gộp thông tin user vào response trả về cho frontend
        (res.data as any).user = meRes.data;
      }
    } catch (meErr) {
      console.warn("[refreshRoute] Failed to fetch user profile during refresh", meErr);
    }

    // 3. Tạo NextResponse và cập nhật Cookie
    const response = NextResponse.json(res);

    response.cookies.set("accessToken", newToken, {
      path: "/",
      maxAge: 60 * 15, // 15 minutes
      httpOnly: false,
      sameSite: "lax",
    });

    if (newRefreshToken) {
      response.cookies.set("refreshToken", newRefreshToken, {
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: "lax",
      });
    }

    return response;

  } catch (err: any) {
    const errorRes: ApiResponse<null> = {
      statusCode: 401,
      success: false,
      message: err?.response?.data?.message ?? err?.message ?? "Session expired",
      data: null,
      path: "/api/auth/refresh",
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(errorRes, { status: 401 });
  }
}
